import os
import json
import ssl
import urllib.request
import urllib.error
from pathlib import Path
from typing import Dict, Any, Optional

ENV_LOCAL_PATH = Path(__file__).parent.parent / ".env.local"

def get_ssl_context():
    try:
        import certifi
        return ssl.create_default_context(cafile=certifi.where())
    except Exception:
        pass
    try:
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        return ctx
    except Exception:
        return None

def get_blob_token() -> Optional[str]:
    token = os.environ.get("BLOB_READ_WRITE_TOKEN")
    if token:
        return token
    if ENV_LOCAL_PATH.exists():
        try:
            with open(ENV_LOCAL_PATH, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line.startswith("BLOB_READ_WRITE_TOKEN="):
                        val = line.split("=", 1)[1].strip()
                        val = val.strip('"\'')
                        return val
        except Exception:
            pass
    return None

def get_blob_download_url(pathname: str = "user_state.json") -> Optional[str]:
    token = get_blob_token()
    if not token:
        return None
    try:
        parts = token.split("_")
        if len(parts) >= 4:
            store_id = parts[3].lower()
            return f"https://{store_id}.private.blob.vercel-storage.com/{pathname}?cache=0"
    except Exception:
        pass
    return None

LOCAL_FALLBACK_FILE = Path(__file__).parent / "user_state.json"

def load_cloud_user_state() -> Dict[str, Dict[str, Any]]:
    """
    Carga el estado del usuario (favoritos y notas) desde Vercel Blob Storage.
    Si no hay token o no hay conexión, recurre al archivo local de respaldo.
    Retorna un diccionario: { property_id: { "is_favorite": bool, "user_notes": str, "updated_at": str } }
    """
    token = get_blob_token()
    download_url = get_blob_download_url("user_state.json")
    if token and download_url:
        req = urllib.request.Request(
            download_url,
            headers={
                "Authorization": f"Bearer {token}",
                "Cache-Control": "no-cache"
            },
            method="GET"
        )
        ctx = get_ssl_context()
        try:
            with urllib.request.urlopen(req, context=ctx, timeout=5) as resp:
                if resp.status == 200:
                    data = json.loads(resp.read().decode("utf-8"))
                    # Sincronizar copia local de respaldo
                    try:
                        with open(LOCAL_FALLBACK_FILE, "w", encoding="utf-8") as f:
                            json.dump(data, f, ensure_ascii=False, indent=2)
                    except Exception:
                        pass
                    return data
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return {}
            print(f"[CloudSync] HTTP error loading from Vercel Blob: {e.code} {e.reason}")
        except Exception as e:
            print(f"[CloudSync] Notice: could not reach Vercel Blob directly ({e}), using local cache.")

    # Fallback local
    if LOCAL_FALLBACK_FILE.exists():
        try:
            with open(LOCAL_FALLBACK_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"[CloudSync] Error loading local fallback: {e}")
    return {}

def save_cloud_user_state(state: Dict[str, Dict[str, Any]]) -> bool:
    """
    Guarda el diccionario de estado en Vercel Blob Storage y en el archivo local de respaldo.
    """
    # Guardar copia local de respaldo siempre
    try:
        with open(LOCAL_FALLBACK_FILE, "w", encoding="utf-8") as f:
            json.dump(state, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"[CloudSync] Error saving local backup: {e}")

    token = get_blob_token()
    if not token:
        return True

    url = "https://blob.vercel-storage.com/user_state.json"
    body_bytes = json.dumps(state, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body_bytes,
        headers={
            "Authorization": f"Bearer {token}",
            "x-api-version": "7",
            "x-vercel-blob-access": "private",
            "x-add-random-suffix": "false",
            "x-allow-overwrite": "true",
            "Content-Type": "application/json"
        },
        method="PUT"
    )
    ctx = get_ssl_context()
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=6) as resp:
            return resp.status in (200, 201)
    except Exception as e:
        print(f"[CloudSync] Notice: upload to Vercel Blob failed ({e}), local backup preserved.")
        return False

def update_cloud_property_state(
    property_id: str,
    is_favorite: Optional[bool] = None,
    user_notes: Optional[str] = None
) -> Dict[str, Any]:
    """
    Actualiza de forma atómica el estado de una propiedad específica y lo persiste en la nube.
    """
    import datetime
    state = load_cloud_user_state()
    prop_data = state.get(property_id, {})

    if is_favorite is not None:
        prop_data["is_favorite"] = bool(is_favorite)
    if user_notes is not None:
        prop_data["user_notes"] = user_notes
    prop_data["updated_at"] = datetime.datetime.now().isoformat()

    state[property_id] = prop_data
    save_cloud_user_state(state)
    return prop_data
