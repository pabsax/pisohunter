from curl_cffi import requests
from bs4 import BeautifulSoup
import json
import re
from typing import List, Dict, Any

HEADERS = {
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "es-ES,es;q=0.9",
}

def clean_num(text: str):
    if not text:
        return None
    clean = str(text).replace('.', '').replace(',', '.')
    m = re.search(r'(\d+(?:\.\d+)?)', clean)
    return float(m.group(1)) if m else None

def scrape_albacete_fotocasa(max_price: int = 170000, pages: int = 3) -> List[Dict[str, Any]]:
    """
    Rastrea viviendas reales en Albacete capital en fotocasa.es extrayendo el estado JSON (__initial_props__)
    usando curl_cffi con impersonación de Chrome.
    """
    flats = []
    seen_urls = set()

    for page_num in range(1, pages + 1):
        if page_num == 1:
            url = f"https://www.fotocasa.es/es/comprar/viviendas/albacete-capital/todas-las-zonas/l?maxPrice={max_price}"
        else:
            url = f"https://www.fotocasa.es/es/comprar/viviendas/albacete-capital/todas-las-zonas/l/{page_num}?maxPrice={max_price}"

        try:
            r = requests.get(url, impersonate="chrome124", headers=HEADERS, timeout=12.0)
            if r.status_code != 200:
                continue
            soup = BeautifulSoup(r.text, "html.parser")
        except Exception as e:
            print(f"Error fetching fotocasa pág {page_num}: {e}")
            continue

        script = soup.find("script", id="__initial_props__")
        if not script or not script.string:
            continue

        try:
            data = json.loads(script.string)
            real_estates = data.get("initialSearch", {}).get("result", {}).get("realEstates", [])
        except Exception as e:
            print(f"Error parsing fotocasa JSON pág {page_num}: {e}")
            continue

        for re_item in real_estates:
            prop_id = re_item.get("id")
            if not prop_id:
                continue

            raw_price = re_item.get("price") or re_item.get("rawPrice")
            price = clean_num(raw_price)
            if not price or price > max_price + 5000:
                continue

            # URL
            detail_dict = re_item.get("detail", {}) or {}
            detail_path = detail_dict.get("es-ES") or detail_dict.get("es") or f"/es/comprar/vivienda/albacete/{prop_id}/d"
            full_url = f"https://www.fotocasa.es{detail_path}" if detail_path.startswith("/") else detail_path

            if full_url in seen_urls:
                continue
            seen_urls.add(full_url)

            # Dirección / Barrio
            addr = re_item.get("address", {}) or {}
            district = addr.get("district") or ""
            neighborhood = addr.get("neighborhood") or district or "Albacete Capital"

            # Título
            raw_desc = re_item.get("description") or ""
            title = raw_desc[:80].strip()
            if not title:
                title = f"Piso en {neighborhood}"
            else:
                first_sentence = title.split(".")[0].strip()
                title = first_sentence if len(first_sentence) > 10 else f"Piso en {neighborhood}"

            # Características
            features = re_item.get("features", []) or []
            feat_map = {}
            for f in features:
                k = f.get("key")
                v = f.get("value")
                if k:
                    feat_map[k] = v

            rooms = int(feat_map.get("rooms", 2))
            bathrooms = int(feat_map.get("bathrooms", 1))
            area_m2 = float(feat_map.get("surface", 80.0))
            floor = feat_map.get("floor")

            # Ascensor
            other_features = str(re_item.get("otherFeaturesCount", "")) + " " + str(re_item.get("description", ""))
            has_elevator = "sin ascensor" not in other_features.lower()

            # Garaje
            has_garage = "parking" in feat_map or "garage" in feat_map or "garaje" in other_features.lower()

            # Balcón / Terraza
            has_balcony = "balcony" in feat_map or "balcón" in other_features.lower()
            has_terrace = "terrace" in feat_map or "terraza" in other_features.lower()

            # Fotos
            photos = []
            multimedia = re_item.get("multimedia", []) or []
            for m in multimedia:
                src = m.get("src") or m.get("url")
                if src and src.startswith("http") and "fotocasa" in src:
                    if src not in photos:
                        photos.append(src)
                if len(photos) >= 8:
                    break

            if not photos:
                photos = ["https://static.fotocasa.es/images/ads/05ae2392-38aa-4735-8529-b57ca95b598e?rule=original"]

            flats.append({
                "title": title[:100],
                "url": full_url,
                "source": "fotocasa",
                "price": price,
                "neighborhood": neighborhood,
                "rooms": rooms,
                "bathrooms": bathrooms,
                "area_m2": area_m2,
                "floor": floor,
                "has_elevator": has_elevator,
                "has_garage": has_garage,
                "has_balcony": has_balcony,
                "has_terrace": has_terrace,
                "has_ac": "air_conditioning" in feat_map,
                "is_exterior": True,
                "condition": "buen_estado",
                "photos": photos,
                "description": re_item.get("description") or title
            })

    return flats
