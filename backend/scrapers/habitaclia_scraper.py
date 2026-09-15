import httpx
from bs4 import BeautifulSoup
import re
from typing import List, Dict, Any

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "es-ES,es;q=0.9",
}

def clean_num(text: str):
    if not text:
        return None
    clean = text.replace('.', '').replace(',', '.')
    m = re.search(r'(\d+(?:\.\d+)?)', clean)
    return float(m.group(1)) if m else None

def scrape_albacete_habitaclia(max_price: int = 170000) -> List[Dict[str, Any]]:
    """
    Rastrea viviendas en Albacete capital en habitaclia.com
    """
    flats = []
    url = f"https://www.habitaclia.com/comprar-vivienda-en-albacete/buscador.htm?filtro_precio_max={max_price}"
    
    try:
        with httpx.Client(headers=HEADERS, follow_redirects=True, timeout=12.0) as client:
            r = client.get(url)
            if r.status_code != 200:
                return []
            soup = BeautifulSoup(r.text, "html.parser")
    except Exception as e:
        print(f"Error scraping habitaclia: {e}")
        return []

    articles = soup.select("article")
    for art in articles:
        title_a = art.select_one('a[href*=".htm"]')
        if not title_a:
            continue
            
        title = title_a.text.strip() or art.get("aria-label", "Piso en Albacete")
        href = title_a.get("href", "")
        if not href:
            continue
        full_url = "https://www.habitaclia.com" + href if href.startswith("/") else href
        
        all_text = art.get_text(" | ", strip=True)
        m_price = re.search(r'(\d{2,3}(?:\.\d{3})*)\s*€', all_text)
        if not m_price:
            continue
        price = clean_num(m_price.group(1))
        if not price or price > max_price + 5000:
            continue

        # Extraer m2
        m_m2 = re.search(r'(\d+)\s*m²', all_text)
        area_m2 = float(m_m2.group(1)) if m_m2 else 80.0

        # Extraer habitaciones
        m_hab = re.search(r'(\d+)\s*hab', all_text)
        rooms = int(m_hab.group(1)) if m_hab else 2

        # Extraer baños
        m_bath = re.search(r'(\d+)\s*baño', all_text)
        bathrooms = int(m_bath.group(1)) if m_bath else 1

        # Planta
        m_floor = re.search(r'(\d+)º', all_text)
        floor = int(m_floor.group(1)) if m_floor else 1
        if "bajo" in all_text.lower():
            floor = 0

        # Ascensor
        full_lower = all_text.lower()
        if "sin ascensor" in full_lower:
            has_elevator = False
        elif "con ascensor" in full_lower or "ascensor" in full_lower:
            has_elevator = True
        else:
            has_elevator = True

        # Garaje
        has_garage = "garaje" in full_lower or "parking" in full_lower

        # Fotos
        photos = []
        for img in art.select("img"):
            src = img.get("src") or img.get("data-src") or ""
            if src and src.startswith("http") and "fotocasa" in src and "rule=original" in src:
                if src not in photos:
                    photos.append(src)
            elif src and src.startswith("http") and not any(x in src.lower() for x in ["logo", "icon", "client"]):
                if src not in photos:
                    photos.append(src)

        if not photos:
            photos = ["https://static.fotocasa.es/images/ads/0758ac7c-4493-4b8c-aa4c-578c11201016?rule=original"]

        # Barrio / Ubicación
        neighborhood = "Albacete Capital"
        known = [
            "san pablo", "el pilar", "ensanche", "franciscanos", "feria", "centro",
            "parque sur", "hospital", "industria", "estación", "fatima", "imaginalia",
            "medicina", "villacerrada", "carretas", "pedanías"
        ]
        for k in known:
            if k in full_lower:
                neighborhood = k.title()
                break

        flats.append({
            "title": title,
            "url": full_url,
            "source": "habitaclia",
            "price": price,
            "neighborhood": neighborhood,
            "rooms": rooms,
            "bathrooms": bathrooms,
            "area_m2": area_m2,
            "floor": floor,
            "has_elevator": has_elevator,
            "has_garage": has_garage,
            "has_balcony": "balcón" in full_lower or "balcon" in full_lower,
            "has_terrace": "terraza" in full_lower,
            "has_ac": "aire acondicionado" in full_lower,
            "is_exterior": "interior" not in full_lower,
            "condition": "para_entrar_a_vivir" if "reformado" in full_lower else "buen_estado",
            "photos": photos[:6],
            "description": title
        })

    return flats
