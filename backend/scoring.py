import re
import sys
from pathlib import Path
from typing import Tuple, List

sys.path.insert(0, str(Path(__file__).parent))

from models import Property, ScoreBreakdown, UserCriteria


# Precios medios de referencia en Albacete (€/m²) por barrio
ALBACETE_NEIGHBORHOOD_BENCHMARKS = {
    "centro": 2250.0,
    "altozano": 2250.0,
    "villacerrada": 2150.0,
    "parque sur": 2100.0,
    "hospital": 2050.0,
    "estacion": 2150.0,
    "imaginalia": 2050.0,
    "llanos del aguila": 2000.0,
    "feria": 1950.0,
    "ensanche": 1850.0,
    "franciscanos": 1750.0,
    "el pilar": 1750.0,
    "industria": 1750.0,
    "fatima": 1700.0,
    "san pedro": 1650.0,
    "medicina": 1700.0,
    "campollano": 1400.0,
    "chinchilla": 1100.0,
    "aguas nuevas": 1050.0,
}
ALBACETE_DEFAULT_BENCHMARK = 1850.0

def normalize_text(text: str) -> str:
    if not text:
        return ""
    text = text.lower()
    replacements = (
        ("á", "a"), ("é", "e"), ("í", "i"), ("ó", "o"), ("ú", "u"),
        ("ü", "u"), ("ñ", "n"), ("-", " "), ("/", " "), (".", "")
    )
    for a, b in replacements:
        text = text.replace(a, b)
    return text.strip()

def check_disqualifying_factors(prop: Property, criteria: UserCriteria) -> Tuple[bool, str]:
    # 1. Comprobación de precio sospechoso / anormalmente bajo (< 45.000 €)
    if prop.price and prop.price < 45000:
        return True, f"Precio anormalmente bajo ({int(prop.price):,} € < 45.000 €). Descartado por alta sospecha de okupación, ruina estructural o cargas judiciales."

    searchable_text = normalize_text(f"{prop.title} {prop.neighborhood} {prop.address or ''} {prop.description or ''}")

    # 2. Inmuebles Ocupados / Okupas / Sin posesión
    squat_keywords = [
        "okupa", "ocupas", "okupado", "inmueble ocupado", "vivienda ocupada",
        "sin posesion", "sin posesión", "no se puede visitar", "no visitable",
        "adjudicacion bancaria sin posesion", "ocupado ilegalmente", "procedimiento judicial",
        "adjudicatario", "cesion de remate", "cesión de remate", "sin acceso"
    ]
    for kw in squat_keywords:
        if kw in searchable_text:
            return True, f"Inmueble con okupas o sin posesión detectado ('{kw}'). Imposible de hipotecar ni habitar."

    # 3. Nuda Propiedad / Usufructo / Solo Inversores
    bare_ownership_keywords = [
        "nuda propiedad", "usufructo", "usufructuaria", "usufructuario",
        "renta vitalicia", "solo inversores", "inversionistas", "no se puede habitar",
        "inversion con inquilino"
    ]
    for kw in bare_ownership_keywords:
        if kw in searchable_text:
            return True, f"Nuda propiedad o usufructo ('{kw}'). No permite entrar a vivir."

    # 4. Inmueble Alquilado con Inquilino Dentro
    rented_keywords = [
        "inmueble alquilado", "piso alquilado", "vivienda alquilada",
        "con inquilino", "con contrato de alquiler", "arrendado actualmente",
        "rentabilidad asegurada", "contrato de alquiler en vigor", "pago asegurado"
    ]
    for kw in rented_keywords:
        if kw in searchable_text:
            return True, f"Piso alquilado con inquilino ('{kw}'). No disponible para residencia propia."

    # 5. Barrios vetados (Las 600, El Congo, Churruca, etc.)
    for banned in criteria.blacklisted_neighborhoods:
        banned_norm = normalize_text(banned)
        if re.search(r'\b' + re.escape(banned_norm) + r'\b', searchable_text) or banned_norm in searchable_text:
            return True, f"Zona excluida por usuario: detectado '{banned}'"

    return False, ""

def check_commercial_ground_floor(prop: Property) -> Tuple[bool, str]:
    text = normalize_text(f"{prop.title} {prop.description or ''}")
    commercial_kws = [
        "local comercial", "bajo comercial", "local adaptado", "local reformado",
        "cambio de uso", "entresuelo comercial", "antiguo local", "local en planta baja",
        "local transformado"
    ]
    for kw in commercial_kws:
        if kw in text:
            return True, f"Posible local comercial adaptado ('{kw}')"
    if prop.floor == 0 and ("local" in text or "escaparate" in text or "persiana metalica" in text):
        return True, "Planta baja con características de local comercial"
    return False, ""

def evaluate_property(prop: Property, criteria: UserCriteria = None) -> ScoreBreakdown:
    if criteria is None:
        criteria = UserCriteria()
        
    pros: List[str] = []
    cons: List[str] = []
    
    # 1. Comprobación de Factores Descalificantes (Okupas, Nuda Propiedad, Alquilados, <45k, Zonas Vetadas)
    is_disqualified, dq_reason = check_disqualifying_factors(prop, criteria)
    if is_disqualified:
        cons.append(f"⛔ {dq_reason}")
        return ScoreBreakdown(
            total_score=0.0,
            price_score=0.0,
            elevator_score=0.0,
            rooms_score=0.0,
            garage_score=0.0,
            neighborhood_score=0.0,
            condition_score=0.0,
            extras_score=0.0,
            pros=[],
            cons=cons,
            is_blacklisted=True,
            blacklist_reason=dq_reason
        )
        
    # 2. Puntuación de Precio y Valor (€/m²) - Max 30 pts
    price_score = 0.0
    if prop.price > criteria.max_budget:
        cons.append(f"Supera el tope de {int(criteria.max_budget):,} € (Precio: {int(prop.price):,} €)")
        # Penalización severa por encima de 170k
        diff_pct = (prop.price - criteria.max_budget) / criteria.max_budget
        price_score = max(0.0, 15.0 - (diff_pct * 50))
    else:
        # Puntos por margen dentro del presupuesto (de 10 a 20 pts)
        savings_margin = (criteria.max_budget - prop.price) / criteria.max_budget
        budget_points = 12.0 + (savings_margin * 10.0)  # Hasta 22 pts si cuesta menos
        
        # Puntos por ratio €/m² comparado con Albacete (hasta 8 pts)
        norm_neigh = normalize_text(prop.neighborhood)
        benchmark = ALBACETE_DEFAULT_BENCHMARK
        for k, v in ALBACETE_NEIGHBORHOOD_BENCHMARKS.items():
            if k in norm_neigh:
                benchmark = v
                break
                
        price_m2 = prop.price / max(1.0, prop.area_m2)
        m2_ratio = price_m2 / benchmark
        
        if m2_ratio < 0.85:
            m2_points = 8.0
            pros.append(f"Excelente precio/m² ({int(price_m2)} €/m², inferior a la media de la zona: {int(benchmark)} €/m²)")
        elif m2_ratio <= 1.05:
            m2_points = 6.0
            pros.append(f"Precio/m² acorde a mercado ({int(price_m2)} €/m²)")
        else:
            m2_points = 2.0
            cons.append(f"Precio/m² algo elevado para la zona ({int(price_m2)} €/m² vs {int(benchmark)} €/m²)")
            
        price_score = min(30.0, budget_points + m2_points)
        if savings_margin >= 0.15:
            pros.append(f"Buen margen sobre tu presupuesto máx: {int(criteria.max_budget - prop.price):,} € por debajo de 170k")
            
    # 3. Puntuación de Ascensor (Casi imprescindible) - Max 25 pts
    elevator_score = 0.0
    if prop.has_elevator:
        elevator_score = 25.0
        pros.append("Dispone de ascensor (Criterio prioritario cumplido)")
    else:
        if prop.floor == 0:
            elevator_score = 12.0
            cons.append("Sin ascensor, aunque es planta baja")
        elif prop.floor == 1:
            elevator_score = 5.0
            cons.append("⚠️ Sin ascensor (Planta 1ª)")
        else:
            elevator_score = 0.0
            floor_txt = f"Planta {prop.floor}ª" if prop.floor else "Planta alta"
            cons.append(f"❌ Sin ascensor ({floor_txt}) - Penalización severa")
            
    # 4. Puntuación de Habitaciones (1 aceptable, >=2 deseable) - Max 20 pts
    rooms_score = 0.0
    if prop.rooms >= 3:
        rooms_score = 20.0
        pros.append(f"{prop.rooms} habitaciones (Ideal para 2 personas + despacho o invitados)")
    elif prop.rooms == 2:
        rooms_score = 18.0
        pros.append("2 habitaciones (Tamaño perfecto para 2 personas)")
    elif prop.rooms == 1:
        rooms_score = 9.0
        cons.append("1 sola habitación (Aceptable pero justo para 2 personas)")
    else:
        rooms_score = 5.0
        
    # 5. Garaje (Deseable) - Max 12 pts
    garage_score = 0.0
    if prop.has_garage:
        garage_score = 12.0
        pros.append("Incluye plaza de garaje (Muy valorado en Albacete)")
    else:
        cons.append("Sin plaza de garaje")
        
    # 6. Estado de la vivienda (Prefiere entrar a vivir, contempla reforma) - Max 10 pts
    condition_score = 0.0
    norm_cond = prop.condition.lower()
    if norm_cond in ["para_entrar_a_vivir", "nuevo", "reformado", "buen_estado"]:
        condition_score = 10.0
        pros.append("Listo para entrar a vivir / Buen estado general")
    elif norm_cond in ["a_reformar", "para_reformar"]:
        # Estimación de reforma básica en Albacete: ~350 €/m²
        est_reform = prop.area_m2 * 350.0
        total_with_reform = prop.price + est_reform
        if total_with_reform <= criteria.max_budget:
            condition_score = 6.0
            pros.append(f"A reformar, pero cabe en tu presupuesto (Est. reforma básica: ~{int(est_reform):,} €)")
        else:
            condition_score = 2.0
            cons.append(f"A reformar y excede los 170k con obra estimada ({int(total_with_reform):,} €)")
    else:
        condition_score = 7.0
        
    # 7. Ubicación y Barrio (Jerarquía estricta según distancia a Albacete Capital)
    # Tier 1: Albacete Capital (Máxima prioridad, +15 pts, 0 penalización)
    # Tier 2: Aguas Nuevas y alrededores inmediatos (-18 pts)
    # Tier 3: Pueblos lejanos y pedanías (>10-15 km como Salobral, Tinajeros, Chinchilla...) (-45 pts)
    neighborhood_score = 0.0
    norm_n = normalize_text(f"{prop.neighborhood} {prop.address or ''} {prop.title} {prop.description or ''}")
    
    tier3_distant_keywords = [
        "salobral", "tinajeros", "santa ana", "los anguijes", "argamason", 
        "campillo de las doblas", "chinchilla", "gineta", "pozohondo", "balazote",
        "pedanias y barrios rurales", "pedanias", "extrarradio", "barrios rurales"
    ]
    tier2_near_keywords = ["aguas nuevas", "campollano"]
    
    if any(k in norm_n for k in tier3_distant_keywords):
        # Tier 3: Lejos de Albacete -> Penalización muy severa
        neighborhood_score = -45.0
        cons.append(f"📍 Zona muy alejada de la capital ({prop.neighborhood}) - Penalización fuerte de distancia")
    elif any(k in norm_n for k in tier2_near_keywords):
        # Tier 2: Aguas Nuevas o entorno próximo (~7-8 km) -> Penalización moderada
        neighborhood_score = -18.0
        cons.append(f"📍 Suburbio fuera de la capital ({prop.neighborhood}) - Penalización moderada")
    else:
        # Tier 1: Albacete Capital
        neighborhood_score = 15.0
        pros.append(f"Ubicado en Albacete capital ({prop.neighborhood})")
        
    # 8. Extras y Calidades - Max 5 pts

    extras_score = 0.0
    if prop.is_exterior:
        extras_score += 2.0
        pros.append("Vivienda exterior con luz natural")
    else:
        cons.append("Piso interior a patio")
        
    if prop.has_terrace or prop.has_balcony:
        extras_score += 1.5
        pros.append("Dispone de terraza o balcón")
        
    if prop.heating_type in ["gas_natural", "central"]:
        extras_score += 1.0
        pros.append(f"Calefacción {prop.heating_type.replace('_', ' ').capitalize()}")
        
    if prop.has_ac:
        extras_score += 0.5
        pros.append("Aire acondicionado instalado")
        
    extras_score = min(5.0, extras_score)
    
    # 9. Detección y penalización de Bajos / Locales comerciales adaptados (-35 pts)
    is_commercial, comm_reason = check_commercial_ground_floor(prop)
    commercial_penalty = 0.0
    if is_commercial:
        commercial_penalty = 35.0
        cons.append(f"⚠️ {comm_reason}: comprobar cédula de habitabilidad obligatoria en Albacete y menor tasación bancaria")

    # Puntuación final redondeada a 1 decimal (0 a 100)
    raw_score = price_score + elevator_score + rooms_score + garage_score + condition_score + neighborhood_score + extras_score
    total_score = round(max(0.0, raw_score - commercial_penalty), 1)
                        
    return ScoreBreakdown(
        total_score=total_score,
        price_score=round(price_score, 1),
        elevator_score=round(elevator_score, 1),
        rooms_score=round(rooms_score, 1),
        garage_score=round(garage_score, 1),
        neighborhood_score=round(neighborhood_score, 1),
        condition_score=round(condition_score, 1),
        extras_score=round(extras_score, 1),
        pros=pros,
        cons=cons,
        is_blacklisted=False,
        blacklist_reason=None
    )
