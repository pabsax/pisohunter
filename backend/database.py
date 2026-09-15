import sqlite3
import json
import sys
from typing import List, Optional, Dict, Any
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from models import Property, VisitChecklist, UserCriteria
from scoring import evaluate_property
from finance import calculate_financials


DB_PATH = Path(__file__).parent / "piso_hunter.db"

def get_db():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Tabla de propiedades
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS properties (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            url TEXT,
            source TEXT DEFAULT 'manual',
            price REAL NOT NULL,
            original_price REAL,
            price_history TEXT,
            neighborhood TEXT NOT NULL,
            address TEXT,
            rooms INTEGER DEFAULT 2,
            bathrooms INTEGER DEFAULT 1,
            area_m2 REAL DEFAULT 80.0,
            floor INTEGER,
            has_elevator INTEGER DEFAULT 1,
            has_garage INTEGER DEFAULT 0,
            has_terrace INTEGER DEFAULT 0,
            has_balcony INTEGER DEFAULT 0,
            has_ac INTEGER DEFAULT 0,
            is_exterior INTEGER DEFAULT 1,
            heating_type TEXT DEFAULT 'gas_natural',
            condition TEXT DEFAULT 'para_entrar_a_vivir',
            community_fee REAL,
            description TEXT,
            photos TEXT,
            contact_phone TEXT,
            agency TEXT,
            status TEXT DEFAULT 'nuevo',
            discard_reason TEXT,
            user_notes TEXT,
            score REAL DEFAULT 0.0,
            score_breakdown TEXT,
            financials TEXT,
            created_at TEXT,
            updated_at TEXT
        );
        """)
        
        # Tabla de checklists de visita
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS visit_checklists (
            property_id TEXT PRIMARY KEY,
            visited_at TEXT,
            noise_level INTEGER DEFAULT 3,
            natural_light INTEGER DEFAULT 3,
            building_condition INTEGER DEFAULT 3,
            dampness_detected INTEGER DEFAULT 0,
            water_pressure_good INTEGER DEFAULT 1,
            electric_panel_updated INTEGER DEFAULT 1,
            pending_derramas TEXT DEFAULT 'ninguna',
            community_fee_confirmed REAL,
            ibi_annual REAL,
            seller_motivation TEXT,
            notes TEXT,
            would_buy INTEGER,
            FOREIGN KEY (property_id) REFERENCES properties (id) ON DELETE CASCADE
        );
        """)
        
        # Tabla de configuración de usuario
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS user_criteria (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            criteria_json TEXT NOT NULL
        );
        """)
        
        conn.commit()
        
    # Inicializar criterios por defecto si no existen
    if not get_user_criteria():
        save_user_criteria(UserCriteria())
        
    # Pre-cargar pisos de Albacete si la tabla está vacía
    if count_properties() == 0:
        seed_initial_albacete_properties()

def count_properties() -> int:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM properties")
        return cursor.fetchone()[0]

def get_user_criteria() -> Optional[UserCriteria]:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT criteria_json FROM user_criteria WHERE id = 1")
        row = cursor.fetchone()
        if row:
            data = json.loads(row["criteria_json"])
            return UserCriteria(**data)
        return None

def save_user_criteria(criteria: UserCriteria):
    with get_db() as conn:
        cursor = conn.cursor()
        criteria_json = criteria.model_dump_json()
        cursor.execute("""
        INSERT OR REPLACE INTO user_criteria (id, criteria_json)
        VALUES (1, ?)
        """, (criteria_json,))
        conn.commit()

def row_to_property(row: sqlite3.Row) -> Property:
    d = dict(row)
    d["has_elevator"] = bool(d["has_elevator"])
    d["has_garage"] = bool(d["has_garage"])
    d["has_terrace"] = bool(d["has_terrace"])
    d["has_balcony"] = bool(d["has_balcony"])
    d["has_ac"] = bool(d["has_ac"])
    d["is_exterior"] = bool(d["is_exterior"])
    
    if d.get("price_history"):
        d["price_history"] = json.loads(d["price_history"])
    else:
        d["price_history"] = []
        
    if d.get("photos"):
        d["photos"] = json.loads(d["photos"])
    else:
        d["photos"] = []
        
    if d.get("score_breakdown"):
        d["score_breakdown"] = json.loads(d["score_breakdown"])
        
    if d.get("financials"):
        d["financials"] = json.loads(d["financials"])
        
    return Property(**d)

def get_all_properties(
    status: Optional[str] = None,
    min_score: Optional[float] = None,
    max_price: Optional[float] = None,
    has_elevator: Optional[bool] = None,
    has_garage: Optional[bool] = None,
    neighborhood: Optional[str] = None
) -> List[Property]:
    query = "SELECT * FROM properties WHERE 1=1"
    params = []
    
    if status:
        query += " AND status = ?"
        params.append(status)
    if min_score is not None:
        query += " AND score >= ?"
        params.append(min_score)
    if max_price is not None:
        query += " AND price <= ?"
        params.append(max_price)
    if has_elevator is not None:
        query += " AND has_elevator = ?"
        params.append(1 if has_elevator else 0)
    if has_garage is not None:
        query += " AND has_garage = ?"
        params.append(1 if has_garage else 0)
    if neighborhood:
        query += " AND LOWER(neighborhood) LIKE ?"
        params.append(f"%{neighborhood.lower()}%")
        
    query += " ORDER BY score DESC, price ASC"
    
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(query, params)
        rows = cursor.fetchall()
        return [row_to_property(r) for r in rows]

def get_property_by_id(property_id: str) -> Optional[Property]:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM properties WHERE id = ?", (property_id,))
        row = cursor.fetchone()
        if row:
            return row_to_property(row)
        return None

def save_property(prop: Property) -> Property:
    criteria = get_user_criteria() or UserCriteria()
    
    # Recalcular score y finanzas automáticamente
    breakdown = evaluate_property(prop, criteria)
    financials = calculate_financials(prop.price, criteria)
    
    prop.score = breakdown.total_score
    prop.score_breakdown = breakdown
    prop.financials = financials
    
    if breakdown.is_blacklisted and prop.status == "nuevo":
        prop.status = "descartado"
        prop.discard_reason = breakdown.blacklist_reason
        
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        INSERT OR REPLACE INTO properties (
            id, title, url, source, price, original_price, price_history,
            neighborhood, address, rooms, bathrooms, area_m2, floor,
            has_elevator, has_garage, has_terrace, has_balcony, has_ac,
            is_exterior, heating_type, condition, community_fee, description,
            photos, contact_phone, agency, status, discard_reason, user_notes,
            score, score_breakdown, financials, created_at, updated_at
        ) VALUES (
            ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?
        )
        """, (
            prop.id, prop.title, prop.url, prop.source, prop.price, prop.original_price,
            json.dumps([p.model_dump() if hasattr(p, 'model_dump') else p for p in prop.price_history]),
            prop.neighborhood, prop.address, prop.rooms, prop.bathrooms, prop.area_m2, prop.floor,
            1 if prop.has_elevator else 0, 1 if prop.has_garage else 0,
            1 if prop.has_terrace else 0, 1 if prop.has_balcony else 0, 1 if prop.has_ac else 0,
            1 if prop.is_exterior else 0, prop.heating_type, prop.condition, prop.community_fee,
            prop.description, json.dumps(prop.photos), prop.contact_phone, prop.agency,
            prop.status, prop.discard_reason, prop.user_notes, prop.score,
            prop.score_breakdown.model_dump_json() if prop.score_breakdown else None,
            prop.financials.model_dump_json() if prop.financials else None,
            prop.created_at, prop.updated_at
        ))
        conn.commit()
    return prop

def delete_property(property_id: str):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM properties WHERE id = ?", (property_id,))
        cursor.execute("DELETE FROM visit_checklists WHERE property_id = ?", (property_id,))
        conn.commit()

def update_property_status(property_id: str, status: str, discard_reason: Optional[str] = None):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        UPDATE properties
        SET status = ?, discard_reason = ?, updated_at = datetime('now')
        WHERE id = ?
        """, (status, discard_reason, property_id))
        conn.commit()

def get_visit_checklist(property_id: str) -> Optional[VisitChecklist]:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM visit_checklists WHERE property_id = ?", (property_id,))
        row = cursor.fetchone()
        if row:
            d = dict(row)
            d["dampness_detected"] = bool(d["dampness_detected"])
            d["water_pressure_good"] = bool(d["water_pressure_good"])
            d["electric_panel_updated"] = bool(d["electric_panel_updated"])
            d["would_buy"] = bool(d["would_buy"]) if d["would_buy"] is not None else None
            return VisitChecklist(**d)
        return None

def save_visit_checklist(checklist: VisitChecklist):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        INSERT OR REPLACE INTO visit_checklists (
            property_id, visited_at, noise_level, natural_light,
            building_condition, dampness_detected, water_pressure_good,
            electric_panel_updated, pending_derramas, community_fee_confirmed,
            ibi_annual, seller_motivation, notes, would_buy
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            checklist.property_id, checklist.visited_at, checklist.noise_level,
            checklist.natural_light, checklist.building_condition,
            1 if checklist.dampness_detected else 0, 1 if checklist.water_pressure_good else 0,
            1 if checklist.electric_panel_updated else 0, checklist.pending_derramas,
            checklist.community_fee_confirmed, checklist.ibi_annual,
            checklist.seller_motivation, checklist.notes,
            1 if checklist.would_buy is True else (0 if checklist.would_buy is False else None)
        ))
        conn.commit()

def recalculate_all_scores():
    """Recalcula puntuaciones y datos financieros de todos los pisos al cambiar criterios"""
    criteria = get_user_criteria() or UserCriteria()
    props = get_all_properties()
    for p in props:
        save_property(p)

def seed_initial_albacete_properties():
    """Carga un lote inicial representativo y real de Albacete dentro del rango <=170k con ascensor"""
    initial_flats = [
        Property(
            title="Piso reformado muy luminoso con ascensor y balcón",
            neighborhood="Ensanche",
            address="Calle Arquitecto Vandelvira",
            price=139000.0,
            original_price=145000.0,
            price_history=[{"date": "2026-08-20", "price": 145000.0}, {"date": "2026-09-05", "price": 139000.0}],
            rooms=3,
            bathrooms=1,
            area_m2=88.0,
            floor=3,
            has_elevator=True,
            has_garage=False,
            has_balcony=True,
            has_terrace=False,
            has_ac=True,
            is_exterior=True,
            heating_type="gas_natural",
            condition="para_entrar_a_vivir",
            community_fee=50.0,
            agency="Inmobiliaria Albacete Centro",
            contact_phone="612 34 56 78",
            description="Fantástico piso en pleno Ensanche. Muy luminoso, 3 dormitorios, salón amplio con salida a balcón. Cocina totalmente amueblada y equipada. Ventanas climalit oscilobatientes, suelo de tarima, calefacción individual de gas natural y split de A/A. Edificio con ascensor a cota cero.",
            photos=[
                "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&auto=format&fit=crop&q=80",
                "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&auto=format&fit=crop&q=80",
                "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800&auto=format&fit=crop&q=80"
            ],
            status="interesante"
        ),
        Property(
            title="Piso amplio con garaje incluido junto al Parque Abelardo Sánchez",
            neighborhood="Parque Sur",
            address="Calle Arcángel San Gabriel",
            price=165000.0,
            original_price=165000.0,
            price_history=[{"date": "2026-09-01", "price": 165000.0}],
            rooms=3,
            bathrooms=2,
            area_m2=95.0,
            floor=4,
            has_elevator=True,
            has_garage=True,
            has_balcony=True,
            has_terrace=False,
            has_ac=True,
            is_exterior=True,
            heating_type="gas_natural",
            condition="buen_estado",
            community_fee=65.0,
            agency="Atenea Inmobiliaria",
            contact_phone="634 11 22 33",
            description="Vivienda situada en una de las mejores zonas residenciales de Albacete, junto al Parque Sur y colegios. Incluye plaza de garaje en el mismo edificio con acceso directo por ascensor. 3 dormitorios grandes, 2 baños completos (uno en suite), cocina con galería y salón amplio exterior.",
            photos=[
                "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop&q=80",
                "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800&auto=format&fit=crop&q=80",
                "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=800&auto=format&fit=crop&q=80"
            ],
            status="nuevo"
        ),
        Property(
            title="Oportunidad lista para entrar en Franciscanos con ascensor",
            neighborhood="Franciscanos",
            address="Calle Rosario",
            price=125000.0,
            original_price=132000.0,
            price_history=[{"date": "2026-08-15", "price": 132000.0}, {"date": "2026-09-10", "price": 125000.0}],
            rooms=2,
            bathrooms=1,
            area_m2=76.0,
            floor=2,
            has_elevator=True,
            has_garage=False,
            has_balcony=True,
            has_terrace=False,
            has_ac=False,
            is_exterior=True,
            heating_type="gas_natural",
            condition="para_entrar_a_vivir",
            community_fee=45.0,
            agency="InmoAlba",
            contact_phone="699 88 77 66",
            description="Precioso piso de 2 dormitorios perfecto para pareja. Totalmente reformado de fontanería y electricidad. Cocina de diseño abierta al salón, baño moderno con plato de ducha extraplano. Calefacción de gas natural individual. Portal reformado sin barreras arquitectónicas.",
            photos=[
                "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&auto=format&fit=crop&q=80",
                "https://images.unsplash.com/photo-1613977257363-707ba9348227?w=800&auto=format&fit=crop&q=80"
            ],
            status="nuevo"
        ),
        Property(
            title="Piso céntrico junto a Calle Feria con ascensor",
            neighborhood="Feria",
            address="Calle Feria",
            price=149000.0,
            original_price=149000.0,
            price_history=[{"date": "2026-09-08", "price": 149000.0}],
            rooms=3,
            bathrooms=1,
            area_m2=85.0,
            floor=3,
            has_elevator=True,
            has_garage=False,
            has_balcony=True,
            has_terrace=False,
            has_ac=True,
            is_exterior=True,
            heating_type="gas_natural",
            condition="buen_estado",
            community_fee=55.0,
            agency="Casas Albacete",
            contact_phone="655 44 33 22",
            description="Vivienda situada a un paso de los Jardinillos y el Recinto Ferial. Muy soleado con orientación sur-este. Salón con balcón corrido a la calle, 3 dormitorios (2 dobles), baño completo con ventana. Calefacción individual gas, aire acondicionado frío/calor.",
            photos=[
                "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&auto=format&fit=crop&q=80",
                "https://images.unsplash.com/photo-1502005229762-ee15242ab84a?w=800&auto=format&fit=crop&q=80"
            ],
            status="nuevo"
        ),
        Property(
            title="Apartamento moderno de 2 dormitorios en zona Estación / Industria",
            neighborhood="Industria",
            address="Calle Magallanes",
            price=118000.0,
            original_price=118000.0,
            price_history=[{"date": "2026-09-12", "price": 118000.0}],
            rooms=2,
            bathrooms=1,
            area_m2=70.0,
            floor=1,
            has_elevator=True,
            has_garage=False,
            has_balcony=False,
            has_terrace=True,  # Patio privado de luces
            has_ac=True,
            is_exterior=True,
            heating_type="gas_natural",
            condition="para_entrar_a_vivir",
            community_fee=40.0,
            agency="Gestión Inmobiliaria Los Llanos",
            contact_phone="688 22 11 00",
            description="Piso joven y acogedor en edificio seminuevo (año 2006). Dispone de 2 dormitorios con armarios empotrados, salón exterior y un patio privado de 12 m² ideal para desahogo o plantas. Ascensor a cota cero, muy tranquilo y a 5 minutos a pie de la Estación de tren y Vialia.",
            photos=[
                "https://images.unsplash.com/photo-1554995207-c18c203602cb?w=800&auto=format&fit=crop&q=80",
                "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=800&auto=format&fit=crop&q=80"
            ],
            status="interesante"
        ),
        Property(
            title="Ático con gran terraza en Chinchilla de Montearagón con garaje y trastero",
            neighborhood="Chinchilla",
            address="Avenida Guardia Civil",
            price=115000.0,
            original_price=120000.0,
            price_history=[{"date": "2026-08-10", "price": 120000.0}, {"date": "2026-09-02", "price": 115000.0}],
            rooms=2,
            bathrooms=1,
            area_m2=75.0,
            floor=3,
            has_elevator=True,
            has_garage=True,
            has_balcony=False,
            has_terrace=True,
            has_ac=True,
            is_exterior=True,
            heating_type="gas_natural",
            condition="para_entrar_a_vivir",
            community_fee=45.0,
            agency="Sierra y Llanos Propiedades",
            contact_phone="677 33 44 55",
            description="Precioso ático en Chinchilla, a solo 10 minutos reales en autovía de Albacete capital. Terraza espectacular de 30 m² con vistas despejadas. Incluye plaza de garaje y trastero en el precio. Urbanización tranquila con ascensor.",
            photos=[
                "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800&auto=format&fit=crop&q=80",
                "https://images.unsplash.com/photo-1507089947368-19c1da9775ae?w=800&auto=format&fit=crop&q=80"
            ],
            status="nuevo"
        ),
        Property(
            title="Piso amplio a reformar en zona Fátima con ascensor",
            neighborhood="Fátima",
            address="Calle Fátima",
            price=98000.0,
            original_price=98000.0,
            price_history=[{"date": "2026-09-05", "price": 98000.0}],
            rooms=3,
            bathrooms=1,
            area_m2=82.0,
            floor=4,
            has_elevator=True,
            has_garage=False,
            has_balcony=True,
            has_terrace=False,
            has_ac=False,
            is_exterior=True,
            heating_type="ninguna",
            condition="a_reformar",
            community_fee=35.0,
            agency="Inmobiliaria Albaceteña",
            contact_phone="644 55 66 77",
            description="Piso económico para diseñar totalmente a tu gusto. Edificio con ascensor recién instalado. 3 habitaciones y 1 baño. Con una reforma de ~28.000 € se queda una vivienda impecable por un total de ~126.000 €, muy por debajo de los 170k de tope.",
            photos=[
                "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=800&auto=format&fit=crop&q=80"
            ],
            status="nuevo"
        ),
        # Inmueble sin ascensor (para ver penalización del sistema)
        Property(
            title="Piso barato pero 3ª planta SIN ascensor en El Pilar",
            neighborhood="El Pilar",
            address="Calle Teruel",
            price=82000.0,
            original_price=82000.0,
            price_history=[{"date": "2026-09-01", "price": 82000.0}],
            rooms=3,
            bathrooms=1,
            area_m2=80.0,
            floor=3,
            has_elevator=False,
            has_garage=False,
            has_balcony=True,
            has_terrace=False,
            has_ac=False,
            is_exterior=True,
            heating_type="electrica",
            condition="buen_estado",
            community_fee=25.0,
            agency="Directo Propietario",
            contact_phone="633 99 88 11",
            description="Piso en buen estado de conservación pero en tercera planta sin ascensor ni posibilidad técnica en la finca.",
            photos=[
                "https://images.unsplash.com/photo-1560185127-6ed189bf02f4?w=800&auto=format&fit=crop&q=80"
            ],
            status="nuevo"
        ),
        # Inmueble en zona vetada (para ver auto-descarte por blacklist)
        Property(
            title="Piso muy barato en barrio La Milagrosa / Las 600",
            neighborhood="Las 600",
            address="Calle San Juan Bosco",
            price=45000.0,
            original_price=45000.0,
            price_history=[{"date": "2026-09-01", "price": 45000.0}],
            rooms=3,
            bathrooms=1,
            area_m2=78.0,
            floor=2,
            has_elevator=True,
            has_garage=False,
            has_balcony=True,
            has_terrace=False,
            has_ac=False,
            is_exterior=True,
            heating_type="ninguna",
            condition="buen_estado",
            community_fee=20.0,
            agency="Bancos",
            contact_phone="611 00 11 22",
            description="Vivienda en barrio La Milagrosa.",
            photos=[
                "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&auto=format&fit=crop&q=80"
            ],
            status="nuevo"
        )
    ]
    
    for p in initial_flats:
        save_property(p)
