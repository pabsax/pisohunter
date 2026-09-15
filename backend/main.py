import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from fastapi import FastAPI, HTTPException, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from typing import List, Optional, Dict, Any
import random
from datetime import datetime

from models import Property, VisitChecklist, UserCriteria, FinancialBreakdown

from database import (
    init_db, get_all_properties, get_property_by_id, save_property,
    delete_property, update_property_status, get_visit_checklist,
    save_visit_checklist, get_user_criteria, save_user_criteria,
    recalculate_all_scores
)
from scoring import evaluate_property
from finance import calculate_financials, calculate_purchasing_power
from scrapers.universal_parser import fetch_and_parse_url, parse_html_content
from scrapers.pisos_scraper import scrape_albacete_pisos
from scrapers.fotocasa_scraper import scrape_albacete_fotocasa

from contextlib import asynccontextmanager


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(
    title="PisoHunter Albacete API",
    description="Motor de búsqueda, puntuación y análisis de compra de pisos en Albacete",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



@app.get("/api/health")
def health_check():
    return {"status": "ok", "app": "PisoHunter Albacete", "timestamp": datetime.now().isoformat()}

# --- PROPIEDADES ---

@app.get("/api/properties", response_model=List[Property])
def list_properties(
    status: Optional[str] = Query(None, description="Filtrar por estado del pipeline"),
    min_score: Optional[float] = Query(None, description="Puntuación mínima (0-100)"),
    max_price: Optional[float] = Query(None, description="Precio máximo"),
    has_elevator: Optional[bool] = Query(None, description="Tiene ascensor"),
    has_garage: Optional[bool] = Query(None, description="Tiene garaje"),
    neighborhood: Optional[str] = Query(None, description="Barrio")
):
    return get_all_properties(
        status=status,
        min_score=min_score,
        max_price=max_price,
        has_elevator=has_elevator,
        has_garage=has_garage,
        neighborhood=neighborhood
    )

@app.get("/api/properties/{property_id}", response_model=Property)
def get_property(property_id: str):
    prop = get_property_by_id(property_id)
    if not prop:
        raise HTTPException(status_code=404, detail="Inmueble no encontrado")
    return prop

@app.post("/api/properties", response_model=Property)
def create_or_update_property(prop: Property):
    saved = save_property(prop)
    return saved

@app.patch("/api/properties/{property_id}/status")
def change_status(
    property_id: str,
    status: str = Query(..., description="Nuevo estado"),
    discard_reason: Optional[str] = Query(None, description="Motivo si se descarta")
):
    prop = get_property_by_id(property_id)
    if not prop:
        raise HTTPException(status_code=404, detail="Inmueble no encontrado")
    update_property_status(property_id, status, discard_reason)
    return {"message": "Estado actualizado", "id": property_id, "new_status": status}

@app.delete("/api/properties/{property_id}")
def remove_property(property_id: str):
    prop = get_property_by_id(property_id)
    if not prop:
        raise HTTPException(status_code=404, detail="Inmueble no encontrado")
    delete_property(property_id)
    return {"message": "Propiedad eliminada", "id": property_id}

# --- INGESTA Y SCRAPING ---

class QuickImportRequest(dict):
    pass

@app.post("/api/properties/quick-import", response_model=Property)
def quick_import(data: Dict[str, Any]):
    prop = Property(
        title=data.get("title", "Piso importado"),
        url=data.get("url"),
        source=data.get("source", "bookmarklet"),
        price=float(data.get("price", 130000)),
        original_price=float(data.get("price", 130000)),
        price_history=[{"date": datetime.now().strftime("%Y-%m-%d"), "price": float(data.get("price", 130000))}],
        neighborhood=data.get("neighborhood", "Albacete"),
        address=data.get("address"),
        rooms=int(data.get("rooms", 2)),
        bathrooms=int(data.get("bathrooms", 1)),
        area_m2=float(data.get("area_m2", 80)),
        floor=data.get("floor"),
        has_elevator=bool(data.get("has_elevator", True)),
        has_garage=bool(data.get("has_garage", False)),
        has_terrace=bool(data.get("has_terrace", False)),
        has_balcony=bool(data.get("has_balcony", False)),
        has_ac=bool(data.get("has_ac", False)),
        is_exterior=bool(data.get("is_exterior", True)),
        heating_type=data.get("heating_type", "gas_natural"),
        condition=data.get("condition", "buen_estado"),
        community_fee=data.get("community_fee"),
        description=data.get("description"),
        photos=data.get("photos", []),
        contact_phone=data.get("contact_phone"),
        agency=data.get("agency")
    )
    return save_property(prop)

@app.post("/api/properties/bulk-import")
def bulk_import(items: List[Dict[str, Any]]):
    added = 0
    for data in items:
        if not data.get("url") and not data.get("title"):
            continue
        try:
            price = float(data.get("price", 130000))
        except (ValueError, TypeError):
            price = 130000.0

        prop = Property(
            title=data.get("title", "Piso en Albacete"),
            url=data.get("url"),
            source=data.get("source", "idealista"),
            price=price,
            original_price=price,
            price_history=[{"date": datetime.now().strftime("%Y-%m-%d"), "price": price}],
            neighborhood=data.get("neighborhood", "Albacete Capital"),
            address=data.get("address"),
            rooms=int(data.get("rooms", 2)),
            bathrooms=int(data.get("bathrooms", 1)),
            area_m2=float(data.get("area_m2", 80)),
            floor=data.get("floor"),
            has_elevator=bool(data.get("has_elevator", True)),
            has_garage=bool(data.get("has_garage", False)),
            has_terrace=bool(data.get("has_terrace", False)),
            has_balcony=bool(data.get("has_balcony", False)),
            has_ac=bool(data.get("has_ac", False)),
            is_exterior=bool(data.get("is_exterior", True)),
            heating_type=data.get("heating_type", "gas_natural"),
            condition=data.get("condition", "buen_estado"),
            community_fee=data.get("community_fee"),
            description=data.get("description"),
            photos=data.get("photos", []),
            contact_phone=data.get("contact_phone"),
            agency=data.get("agency")
        )
        save_property(prop)
        added += 1

    return {
        "status": "ok",
        "message": f"¡{added} inmuebles importados y evaluados con éxito!",
        "count": added
    }

class ParseUrlRequest(dict):
    pass

@app.post("/api/properties/parse-url")
async def parse_url_endpoint(payload: Dict[str, str]):
    url = payload.get("url", "").strip()
    if not url:
        raise HTTPException(status_code=400, detail="URL requerida")
    try:
        parsed_data = await fetch_and_parse_url(url)
        return parsed_data
    except Exception as e:
        # Fallback guiado si el portal bloquea peticiones automáticas
        return {
            "title": "Piso en Albacete",
            "url": url,
            "price": 135000,
            "rooms": 2,
            "bathrooms": 1,
            "area_m2": 80,
            "has_elevator": True,
            "has_garage": False,
            "neighborhood": "Ensanche",
            "warning": f"El portal protegió la conexión ({str(e)}). Puedes ajustar los datos antes de guardar."
        }

@app.post("/api/scraper/run-batch")
def run_batch_scrape():
    """Rastrea la web en directo en busca de oportunidades reales en Albacete (Fotocasa + Pisos.com)"""
    criteria = get_user_criteria() or UserCriteria()
    max_p = int(criteria.max_budget)
    
    # 1. Scrape Fotocasa (2 páginas)
    try:
        flats_foto = scrape_albacete_fotocasa(max_price=max_p, pages=2)
    except Exception as e:
        print(f"Error scraping Fotocasa: {e}")
        flats_foto = []

    # 2. Scrape Pisos.com (2 páginas)
    try:
        flats_pisos = scrape_albacete_pisos(max_price=max_p, pages=2)
    except Exception as e:
        print(f"Error scraping Pisos.com: {e}")
        flats_pisos = []

    all_flats = flats_foto + flats_pisos
    existing = {p.url: p for p in get_all_properties() if p.url}
    new_count = 0
    latest_saved = None

    for f in all_flats:
        if f["url"] not in existing:
            prop = Property(
                title=f["title"],
                url=f["url"],
                source=f.get("source", "portal"),
                price=f["price"],
                original_price=f["price"],
                price_history=[{"date": datetime.now().strftime("%Y-%m-%d"), "price": f["price"]}],
                neighborhood=f["neighborhood"],
                rooms=f["rooms"],
                bathrooms=f["bathrooms"],
                area_m2=f["area_m2"],
                floor=f["floor"],
                has_elevator=f["has_elevator"],
                has_garage=f["has_garage"],
                has_balcony=f["has_balcony"],
                has_terrace=f["has_terrace"],
                has_ac=f["has_ac"],
                is_exterior=f["is_exterior"],
                condition=f["condition"],
                photos=f["photos"],
                description=f["description"],
                status="nuevo"
            )
            saved = save_property(prop)
            latest_saved = saved
            new_count += 1

    return {
        "message": f"Rastreo completado: {len(all_flats)} analizados de Fotocasa y Pisos.com. {new_count} novedades añadidas.",
        "added_property": latest_saved,
        "new_count": new_count,
        "total_analyzed": len(all_flats)
    }


# --- CHECKLIST DE VISITAS ---

@app.get("/api/properties/{property_id}/checklist", response_model=Optional[VisitChecklist])
def get_checklist(property_id: str):
    chk = get_visit_checklist(property_id)
    if not chk:
        return VisitChecklist(property_id=property_id)
    return chk

@app.post("/api/properties/{property_id}/checklist", response_model=VisitChecklist)
def save_checklist(property_id: str, checklist: VisitChecklist):
    checklist.property_id = property_id
    if not checklist.visited_at:
        checklist.visited_at = datetime.now().strftime("%Y-%m-%d %H:%M")
    save_visit_checklist(checklist)
    
    # Si se rellena checklist, actualizar estado del piso a "visitado" si estaba en "visita_agendada"
    prop = get_property_by_id(property_id)
    if prop and prop.status in ["nuevo", "interesante", "contactado", "visita_agendada"]:
        update_property_status(property_id, "visitado")
        
    return checklist

# --- CRITERIOS Y FINANZAS ---

@app.get("/api/criteria", response_model=UserCriteria)
def read_criteria():
    criteria = get_user_criteria()
    return criteria or UserCriteria()

@app.post("/api/criteria", response_model=UserCriteria)
def update_criteria(criteria: UserCriteria, background_tasks: BackgroundTasks):
    save_user_criteria(criteria)
    # Recalcular puntuaciones de todos los pisos con los nuevos criterios
    background_tasks.add_task(recalculate_all_scores)
    return criteria

@app.get("/api/finance/simulate", response_model=FinancialBreakdown)
def simulate_finance(
    price: float = Query(140000.0, description="Precio del piso a simular"),
    itp: Optional[float] = Query(None, description="Tipo de ITP (%)"),
    savings: Optional[float] = Query(None, description="Ahorros disponibles (€)")
):
    criteria = get_user_criteria() or UserCriteria()
    if itp is not None:
        criteria.clm_itp_percent = itp
    if savings is not None:
        criteria.savings_available = savings
    return calculate_financials(price, criteria)

@app.get("/api/finance/purchasing-power")
def get_purchasing_power(
    salary: float = Query(1400.0, description="Sueldo neto mensual"),
    second_salary: float = Query(0.0, description="Sueldo segundo titular"),
    savings_to_disburse: float = Query(60000.0, description="Efectivo a desembolsar"),
    savings_total: float = Query(65000.0, description="Ahorros totales"),
    dti_limit_percent: float = Query(35.0, description="Límite DTI banco (%)"),
    interest_rate_percent: float = Query(2.75, description="Tipo de interés (%)"),
    mortgage_term_years: int = Query(30, description="Plazo hipoteca en años"),
    itp_percent: float = Query(9.0, description="ITP Castilla-La Mancha (%)"),
    expected_discount_percent: float = Query(5.0, description="Margen de negociación (%)")
):
    return calculate_purchasing_power(
        salary=salary,
        second_salary=second_salary,
        savings_to_disburse=savings_to_disburse,
        savings_total=savings_total,
        dti_limit_percent=dti_limit_percent,
        interest_rate_percent=interest_rate_percent,
        mortgage_term_years=mortgage_term_years,
        itp_percent=itp_percent,
        expected_discount_percent=expected_discount_percent
    )

# --- SERVIR FRONTEND SPA Y PWA ---
frontend_dist = Path(__file__).parent.parent / "frontend" / "dist"
if frontend_dist.exists():
    app.mount("/assets", StaticFiles(directory=str(frontend_dist / "assets")), name="assets")

    @app.get("/{full_path:path}")
    def serve_frontend_spa(full_path: str):
        file_path = frontend_dist / full_path
        if file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(frontend_dist / "index.html")

