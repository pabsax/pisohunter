import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from database import init_db, get_db, save_property, get_all_properties, delete_property
from models import Property
from scrapers.pisos_scraper import scrape_albacete_pisos
from scrapers.fotocasa_scraper import scrape_albacete_fotocasa

def sync_properties():
    print("Iniciando rastreo multi-portal (Fotocasa + Pisos.com) en Albacete...")
    init_db()
    
    # 1. Obtener de fotocasa (3 páginas)
    flats_foto = scrape_albacete_fotocasa(max_price=170000, pages=3)
    print(f"Fotocasa: {len(flats_foto)} encontrados con fotos HD.")

    # 2. Obtener de pisos.com (3 páginas)
    flats_pisos = scrape_albacete_pisos(max_price=170000, pages=3)
    print(f"Pisos.com: {len(flats_pisos)} encontrados.")
    
    real_flats = flats_foto + flats_pisos
    print(f"Total inmuebles recopilados de ambos portales: {len(real_flats)}")

    if not real_flats:
        print("No se pudieron extraer pisos de la web.")
        return

    # Limpiar pisos de prueba antiguos si los hubiera
    current = get_all_properties()
    removed = 0
    for p in current:
        if p.source == 'manual' and any('unsplash.com' in photo for photo in p.photos):
            delete_property(p.id)
            removed += 1
    if removed > 0:
        print(f"Limpiados {removed} pisos de prueba con datos ficticios.")

    # Guardar pisos reales (save_property gestiona deduplicación por URL y scoring anti-fraude)
    added = 0
    for f in real_flats:
        prop = Property(
            title=f["title"],
            url=f["url"],
            source=f.get("source", "portal"),
            price=f["price"],
            original_price=f["price"],
            price_history=[{"date": "2026-09-15", "price": f["price"]}],
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
        save_property(prop)
        added += 1
        
    print(f"✅ ¡{added} inmuebles procesados, puntuados con filtros anti-fraude y guardados en SQLite!")

if __name__ == "__main__":
    sync_properties()
