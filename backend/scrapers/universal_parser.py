import re
from typing import Dict, Any, Optional
import httpx
from bs4 import BeautifulSoup

DEFAULT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
}

def extract_number(text: str) -> Optional[float]:
    if not text:
        return None
    cleaned = text.replace(".", "").replace(",", ".")
    match = re.search(r'(\d+(?:\.\d+)?)', cleaned)
    if match:
        try:
            return float(match.group(1))
        except ValueError:
            return None
    return None

def parse_html_content(html: str, url: str = "") -> Dict[str, Any]:
    soup = BeautifulSoup(html, "html.parser")
    title = ""
    price = 0.0
    rooms = 2
    bathrooms = 1
    area_m2 = 80.0
    floor = None
    has_elevator = True
    has_garage = False
    has_terrace = False
    has_balcony = False
    is_exterior = True
    neighborhood = "Albacete"
    photos = []
    description = ""
    
    # Intentar título
    h1 = soup.find("h1")
    if h1:
        title = h1.get_text(strip=True)
    elif soup.title:
        title = soup.title.get_text(strip=True)
    else:
        title = "Piso en Albacete"
        
    full_text = soup.get_text(" ", strip=True).lower()
    
    # Intentar precio
    price_elem = soup.select_one(".price, .info-data-price, .re-DetailHeader-price, [data-testid='price']")
    if price_elem:
        p_val = extract_number(price_elem.get_text())
        if p_val and p_val > 5000:
            price = p_val
    if not price:
        price_matches = re.findall(r'(\d{2,3}(?:\.\d{3})*)\s*€', full_text)
        if price_matches:
            candidates = [extract_number(m) for m in price_matches if extract_number(m)]
            valid = [c for c in candidates if 30000 <= c <= 500000]
            if valid:
                price = valid[0]
                
    # Habitaciones
    m_rooms = re.search(r'(\d+)\s*(?:hab|dorm|habitaci)', full_text)
    if m_rooms:
        rooms = int(m_rooms.group(1))
        
    # Baños
    m_baths = re.search(r'(\d+)\s*(?:baño|aseo)', full_text)
    if m_baths:
        bathrooms = int(m_baths.group(1))
        
    # Metros cuadrados
    m_area = re.search(r'(\d+)\s*(?:m²|m2|metros)', full_text)
    if m_area:
        area_m2 = float(m_area.group(1))
        
    # Ascensor
    if "sin ascensor" in full_text:
        has_elevator = False
    elif "con ascensor" in full_text or "ascensor" in full_text:
        has_elevator = True
        
    # Garaje
    if "garaje" in full_text or "parking" in full_text or "cochera" in full_text:
        has_garage = True
        
    # Terraza / Balcón
    if "terraza" in full_text:
        has_terrace = True
    if "balcon" in full_text or "balcón" in full_text:
        has_balcony = True
        
    # Planta
    m_floor = re.search(r'(?:planta|piso)\s*(\d+)', full_text)
    if m_floor:
        floor = int(m_floor.group(1))
    elif "bajo" in full_text or "planta baja" in full_text:
        floor = 0
        
    # Barrio
    known_neighborhoods = [
        "centro", "ensanche", "franciscanos", "feria", "parque sur",
        "hospital", "industria", "estacion", "el pilar", "fatima",
        "imaginalia", "medicina", "villacerrada", "llanos del aguila",
        "chinchilla", "aguas nuevas"
    ]
    for kn in known_neighborhoods:
        if kn in full_text:
            neighborhood = kn.capitalize()
            break
            
    # Fotos
    for img in soup.find_all("img"):
        src = img.get("src") or img.get("data-src") or img.get("data-lazy")
        if src and ("http" in src) and not any(ign in src.lower() for ign in ["logo", "icon", "advert", "avatar"]):
            if src not in photos:
                photos.append(src)
        if len(photos) >= 6:
            break
            
    # Fallback photo if none found
    if not photos:
        photos = ["https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&auto=format&fit=crop&q=80"]
        
    desc_elem = soup.select_one(".comment, .description, .re-DetailDescription, .property-description")
    if desc_elem:
        description = desc_elem.get_text("\n", strip=True)
    else:
        description = title
        
    return {
        "title": title[:120],
        "price": price or 135000.0,
        "rooms": rooms,
        "bathrooms": bathrooms,
        "area_m2": area_m2,
        "floor": floor,
        "has_elevator": has_elevator,
        "has_garage": has_garage,
        "has_terrace": has_terrace,
        "has_balcony": has_balcony,
        "is_exterior": is_exterior,
        "neighborhood": neighborhood,
        "photos": photos,
        "description": description[:1000],
        "url": url
    }

async def fetch_and_parse_url(url: str) -> Dict[str, Any]:
    async with httpx.AsyncClient(headers=DEFAULT_HEADERS, timeout=12.0, follow_redirects=True) as client:
        resp = await client.get(url)
        if resp.status_code == 200:
            return parse_html_content(resp.text, url=url)
        else:
            raise ValueError(f"El portal respondió con código HTTP {resp.status_code}")
