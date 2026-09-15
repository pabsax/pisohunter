from curl_cffi import requests
from bs4 import BeautifulSoup
import re
from typing import List, Dict, Any

HEADERS = {
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "es-ES,es;q=0.9",
}

def clean_num(text: str):
    if not text:
        return None
    clean = text.replace('.', '').replace(',', '.')
    m = re.search(r'(\d+(?:\.\d+)?)', clean)
    return float(m.group(1)) if m else None

def scrape_albacete_pisos(max_price: int = 170000, pages: int = 3) -> List[Dict[str, Any]]:
    """
    Rastrea pisos reales en Albacete capital en pisos.com con ascensor hasta el precio máximo
    usando curl_cffi con impersonación de Chrome.
    """
    flats = []
    seen_urls = set()

    for page in range(1, pages + 1):
        if page == 1:
            url = f"https://www.pisos.com/venta/pisos-albacete_capital/con-ascensor/hasta-{max_price}/"
        else:
            url = f"https://www.pisos.com/venta/pisos-albacete_capital/con-ascensor/hasta-{max_price}/{page}/"

        try:
            r = requests.get(url, impersonate="chrome124", headers=HEADERS, timeout=12.0)
            if r.status_code != 200:
                continue
            soup = BeautifulSoup(r.text, "html.parser")
        except Exception as e:
            print(f"Error scraping pisos.com pág {page}: {e}")
            continue

        items = soup.select(".ad-preview")
        for item in items:
            a_title = item.select_one("a.ad-preview__title")
            if not a_title:
                continue

            href = a_title.get("href", "")
            if not href:
                continue
            full_url = "https://www.pisos.com" + href
            if full_url in seen_urls:
                continue
            seen_urls.add(full_url)

            title = a_title.text.strip()
            price_tag = item.select_one(".ad-preview__price")
            price = clean_num(price_tag.text) if price_tag else 0
            if not price or price > max_price + 5000:
                continue

            subtitle_tag = item.select_one(".ad-preview__subtitle")
            raw_neigh = subtitle_tag.text.strip() if subtitle_tag else "Albacete"
            clean_neigh = raw_neigh.replace("(Albacete Capital)", "").replace("(Albacete)", "").strip()

            desc_tag = item.select_one(".ad-preview__description")
            desc = desc_tag.text.strip() if desc_tag else title

            chars = [c.text.strip() for c in item.select(".ad-preview__char")]
            rooms = 2
            bathrooms = 1
            area_m2 = 80.0
            floor = None

            for c in chars:
                c_low = c.lower()
                if "hab" in c_low:
                    num = clean_num(c)
                    if num:
                        rooms = int(num)
                elif "baño" in c_low or "aseo" in c_low:
                    num = clean_num(c)
                    if num:
                        bathrooms = int(num)
                elif "m²" in c_low or "m2" in c_low:
                    num = clean_num(c)
                    if num:
                        area_m2 = float(num)
                elif "planta" in c_low:
                    if "bajo" in c_low:
                        floor = 0
                    else:
                        num = clean_num(c)
                        if num:
                            floor = int(num)

            # Analizar ascensor en la descripción
            full_text = f"{title} {desc}".lower()
            if "sin ascensor" in full_text:
                has_elevator = False
            else:
                has_elevator = True

            has_garage = any(k in full_text for k in ["garaje", "parking", "cochera"])
            has_balcony = "balcón" in full_text or "balcon" in full_text
            has_terrace = "terraza" in full_text
            has_ac = any(k in full_text for k in ["aire acondicionado", "a/a", "bomba"])
            is_exterior = "interior" not in full_text

            # Estado
            if any(k in full_text for k in ["reformar", "a reformar"]):
                condition = "a_reformar"
            elif any(k in full_text for k in ["reformado", "entrar a vivir", "seminuevo", "a estrenar"]):
                condition = "para_entrar_a_vivir"
            else:
                condition = "buen_estado"

            # Fotos
            photos = []
            for img in item.select("img"):
                src = img.get("src") or img.get("data-src") or ""
                if src and src.startswith("http") and not any(x in src.lower() for x in ["logo", "icon", "avatar", "publi"]):
                    # Obtener versión grande
                    hd = src.replace("/m-wp/", "/mm-wp/").replace("/s-wp/", "/mm-wp/")
                    if hd not in photos:
                        photos.append(hd)

            if not photos:
                photos = ["https://fotos.imghs.net/mm-wp/1060/3230323630373330/34d51fcd-d2d2-4d52-82e8-b4faa13631f4.jpg"]

            flats.append({
                "title": title,
                "url": full_url,
                "source": "pisos.com",
                "price": price,
                "neighborhood": clean_neigh or "Albacete",
                "rooms": rooms,
                "bathrooms": bathrooms,
                "area_m2": area_m2,
                "floor": floor,
                "has_elevator": has_elevator,
                "has_garage": has_garage,
                "has_balcony": has_balcony,
                "has_terrace": has_terrace,
                "has_ac": has_ac,
                "is_exterior": is_exterior,
                "condition": condition,
                "photos": photos,
                "description": desc,
            })

    return flats
