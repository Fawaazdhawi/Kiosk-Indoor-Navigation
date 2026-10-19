from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from fastapi.middleware.cors import CORSMiddleware
import threading
import socket
import os
import re
os.environ.pop("SSL_CERT_FILE", None)
import json
from dotenv import load_dotenv
try:
    from google import genai
except (ImportError, AttributeError):
    genai = None

from app.core.database import db, listen_to_firestore, SessionLocal, init_db
from app.core import state as waypoint_graph
from app.services.nlp_service import cari_target_ruangan, latih_ulang_nlp
from app.services.a_star_service import cari_rute_grid, get_room_display_name
from loguru import logger

load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
gemini_client = None
if GEMINI_API_KEY and genai is not None:
    try:
        gemini_client = genai.Client(api_key=GEMINI_API_KEY)
    except Exception:
        gemini_client = None

# Lock global untuk mencegah race condition.
sync_lock = threading.Lock()

def muat_data_dari_postgres():
    """Mengambil seluruh data tenant, fasilitas, dan kiosk dari PostgreSQL lalu menyinkronkan matriks A*."""
    if SessionLocal is None:
        logger.warning("[POSTGRES] SessionLocal belum siap.")
        return False
    
    try:
        init_db()
    except Exception as e:
        logger.warning(f"[POSTGRES] Peringatan saat inisialisasi schema: {e}")
    
    db_session = SessionLocal()
    try:
        from app.models.mall import Tenant, Facility, Kiosk
        raw_items = []
        
        # 1. Tenants (Toko)
        tenants = db_session.query(Tenant).filter(Tenant.is_active == True).all()
        for t in tenants:
            raw_items.append({
                "id_dokumen": t.id,
                "name": t.name,
                "name_en": t.name_en or t.name,
                "type": "room",
                "category": t.category,
                "grid_x": t.grid_x,
                "grid_y": t.grid_y,
                "grid_width": t.grid_width,
                "grid_height": t.grid_height,
                "endpoints": t.endpoints or ["bottom"],
                "floor": t.floor,
                "building": t.building or "Mall Utama",
                "keywords": t.keywords or [],
                "is_connector": False,
                "target_building": "",
                "shape_type": getattr(t, "shape_type", "rect") or "rect",
                "points": getattr(t, "points", None)
            })
            
        # 2. Facilities (Toilet, Musholla, Lift, Eskalator)
        facilities = db_session.query(Facility).all()
        for f in facilities:
            raw_items.append({
                "id_dokumen": f.id,
                "name": f.name,
                "name_en": f.name_en or f.name,
                "type": "room",
                "facility_type": f.facility_type or "",
                "grid_x": f.grid_x,
                "grid_y": f.grid_y,
                "grid_width": f.grid_width,
                "grid_height": f.grid_height,
                "endpoints": f.endpoints or ["bottom"],
                "floor": f.floor,
                "building": f.building or "Mall Utama",
                "keywords": f.keywords or [],
                "is_connector": f.is_connector,
                "connector_group": f.connector_group or "",
                "target_building": f.target_building or "",
                "shape_type": getattr(f, "shape_type", "rect") or "rect",
                "points": getattr(f, "points", None)
            })

        # 3. Kiosks
        kiosks = db_session.query(Kiosk).all()
        for k in kiosks:
            raw_items.append({
                "id_dokumen": k.id,
                "name": k.name,
                "name_en": k.name,
                "type": "kiosk",
                "grid_x": k.grid_x,
                "grid_y": k.grid_y,
                "grid_width": k.grid_width,
                "grid_height": k.grid_height,
                "endpoints": k.endpoints or ["bottom"],
                "floor": k.floor,
                "building": k.building or "Mall Utama",
                "keywords": [k.name, "kiosk"],
                "is_connector": False,
                "target_building": "",
                "shape_type": getattr(k, "shape_type", "rect") or "rect",
                "points": getattr(k, "points", None)
            })
            
        if raw_items:
            sinkronisasi_peta(raw_items)
            logger.info(f"[POSTGRES] Berhasil memuat {len(raw_items)} node Mall ke matriks A* & NLP!")
            return True
        else:
            logger.info("[POSTGRES] Data tabel masih kosong. Jalankan 'python seed_mall.py' untuk mengisi data.")
            return False
    except Exception as e:
        logger.warning(f"[POSTGRES] Menunggu PostgreSQL aktif / konfigurasi database ({e})")
        return False
    finally:
        db_session.close()

def is_point_in_polygon(x, y, poly):
    """Ray casting algorithm untuk mendeteksi apakah titik berada di dalam poligon."""
    n = len(poly)
    inside = False
    p1x, p1y = poly[0]
    for i in range(n + 1):
        p2x, p2y = poly[i % n]
        if y > min(p1y, p2y):
            if y <= max(p1y, p2y):
                if x <= max(p1x, p2x):
                    if p1y != p2y:
                        xinters = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                    if p1x == p2x or x <= xinters:
                        inside = not inside
        p1x, p1y = p2x, p2y
    return inside

def sinkronisasi_peta(data):
    """Mengupdate koordinat dan melatih ulang NLP saat database berubah."""
    with sync_lock:
        logger.info("[SINKRONISASI] Pembaruan denah diproses...")
        
        data_nlp_baru = {}
        
        temp_ruangan = {}
        temp_grid = {}
        for item in data:
            room_id = item.get("id_dokumen") 
            room_name = item.get("name", "Tanpa Nama")
            
            if room_id and "grid_x" in item and "grid_y" in item:
                gx = item["grid_x"]
                gy = item["grid_y"]
                gw = item.get("grid_width", 1)
                gh = item.get("grid_height", 1)
                
                endpoints = item.get("endpoints", ["bottom"])
                
                is_kiosk = item.get("type", "room") == "kiosk"
                door_coords = []
                for ep in endpoints:
                    if ep == "top":
                        cy = max(0, gy - 1) if is_kiosk else gy
                        door_coords.append((gx + gw//2, cy))
                    elif ep == "bottom":
                        cy = min(waypoint_graph.GRID_HEIGHT - 1, gy + gh) if is_kiosk else gy + gh - 1
                        door_coords.append((gx + gw//2, cy))
                    elif ep == "left":
                        cx = max(0, gx - 1) if is_kiosk else gx
                        door_coords.append((cx, gy + gh//2))
                    elif ep == "right":
                        cx = min(waypoint_graph.GRID_WIDTH - 1, gx + gw) if is_kiosk else gx + gw - 1
                        door_coords.append((cx, gy + gh//2))
                
                floor = item.get("floor", "Ground Floor")
                building = item.get("building", "Mall Utama")
                raw_points = item.get("points")
                shape_type = item.get("shape_type", "rect")
                
                temp_ruangan[room_id] = {
                    "x": gx,
                    "y": gy,
                    "w": gw,
                    "h": gh,
                    "door_coords": door_coords,
                    "endpoints": item.get("endpoints", ["bottom"]),
                    "name": room_name,
                    "name_en": item.get("name_en", ""),
                    "floor": floor,
                    "building": building,
                    "type": item.get("type", "room"),
                    "facility_type": item.get("facility_type", "") or "",
                    "keywords": item.get("keywords", []),
                    "is_connector": item.get("is_connector", False),
                    "connector_group": item.get("connector_group", "") or "",
                    "target_building": item.get("target_building", "") or "",
                    "shape_type": shape_type,
                    "points": raw_points
                }
                
                grid_key = f"{building}_{floor}"
                if grid_key not in temp_grid:
                    temp_grid[grid_key] = [[0 for _ in range(waypoint_graph.GRID_WIDTH)] for _ in range(waypoint_graph.GRID_HEIGHT)]
                grid = temp_grid[grid_key]
                
                if raw_points and len(raw_points) >= 6:
                    poly = []
                    for i in range(0, len(raw_points), 2):
                        poly.append((gx + raw_points[i] / 25.0, gy + raw_points[i+1] / 25.0))
                    for dy in range(gh):
                        for dx in range(gw):
                            ny = gy + dy
                            nx = gx + dx
                            if 0 <= ny < waypoint_graph.GRID_HEIGHT and 0 <= nx < waypoint_graph.GRID_WIDTH:
                                if is_point_in_polygon(nx + 0.5, ny + 0.5, poly):
                                    grid[ny][nx] = 1
                else:
                    for dy in range(gh):
                        for dx in range(gw):
                            ny = gy + dy
                            nx = gx + dx
                            if 0 <= ny < waypoint_graph.GRID_HEIGHT and 0 <= nx < waypoint_graph.GRID_WIDTH:
                                grid[ny][nx] = 1
                
                kata_kunci = item.get("keywords", [])
                if room_name not in kata_kunci:
                    kata_kunci.append(room_name)
                
                data_nlp_baru[room_id] = kata_kunci

        # Tambahkan nama ruangan induk ke node submap untuk pencocokan NLP yang lebih baik.
        for room_id, room in temp_ruangan.items():
            if room["floor"].startswith("submap_"):
                parent_id = room["floor"].replace("submap_", "")
                parent_room = temp_ruangan.get(parent_id)
                if parent_room:
                    parent_name = parent_room["name"]
                    kunci = data_nlp_baru.get(room_id, [])
                    kunci.append(f"{room['name']} {parent_name}")

        waypoint_graph.RUANGAN_GRID.clear()
        waypoint_graph.RUANGAN_GRID.update(temp_ruangan)
        waypoint_graph.GRID_MAP.clear()
        waypoint_graph.GRID_MAP.update(temp_grid)

        latih_ulang_nlp(data_nlp_baru)
        logger.info("[SINKRONISASI] Matriks A* dan Model NLP siap digunakan!")

# Jalankan pemuatan data dari PostgreSQL di thread terpisah saat startup
threading.Thread(target=muat_data_dari_postgres, daemon=True).start()

# Fallback listener firestore jika masih ada
threading.Thread(target=listen_to_firestore, args=(sinkronisasi_peta,), daemon=True).start()

app = FastAPI(title="Indoor Navigator Mall API (PostgreSQL + Ollama Qwen)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class RequestRute(BaseModel):
    start_node_id: str
    teks_pencarian: str
    language: str = "id"
    current_floor: str = None

class RequestTranslate(BaseModel):
    names: list[str]

@app.post("/api/translate")
def translate_names(request: RequestTranslate):
    translations = {}
    names_to_translate = []
    
    for name in request.names:
        if not name:
            continue
        if "lift" in name.lower():
            translations[name] = {
                "id": name,
                "en": name
            }
        else:
            names_to_translate.append(name)
            
    if names_to_translate and GEMINI_API_KEY:
        try:
            prompt = f"""
You are an expert translator for a smart hospital guide application. 
Your task is to process a list of hospital room names provided by the user. The names might be in Indonesian or English.
For each name, determine its correct Indonesian version and English version (medical/hospital terminology).
Return the result as a raw JSON object (without markdown blocks like ```json) where keys are the original input names, and values are objects with "id" (the Indonesian name) and "en" (the English name).

Example output format:
{{
  "Ruang IGD": {{"id": "Ruang IGD", "en": "Emergency Room"}},
  "Emergency Room": {{"id": "Ruang IGD", "en": "Emergency Room"}},
  "ICU": {{"id": "Ruang ICU", "en": "ICU"}}
}}

Names to translate:
{json.dumps(names_to_translate)}
"""
            response = gemini_client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt
            )
            result_text = response.text.strip()
            if result_text.startswith("```json"):
                result_text = result_text.replace("```json", "").replace("```", "").strip()
            elif result_text.startswith("```"):
                result_text = result_text.replace("```", "").strip()
            
            translated_dict = json.loads(result_text)
            
            for name in names_to_translate:
                if name in translated_dict and isinstance(translated_dict[name], dict) and "id" in translated_dict[name] and "en" in translated_dict[name]:
                    translations[name] = translated_dict[name]
                else:
                    en_name = translated_dict.get(name, name) if not isinstance(translated_dict.get(name), dict) else name
                    translations[name] = {
                        "id": name,
                        "en": en_name
                    }
        except Exception as e:
            logger.error(f"Gemini translation failed: {e}")
            for name in names_to_translate:
                translations[name] = {
                    "id": name,
                    "en": name
                }
    else:
        for name in names_to_translate:
            translations[name] = {
                "id": name,
                "en": name
            }

    return {
        "status": "success",
        "translations": translations
    }

@app.post("/api/generate_keywords")
def generate_keywords(request: RequestTranslate):
    generated_keywords = {}
    names_to_process = []
    
    for name in request.names:
        if not name:
            continue
        if "lift" in name.lower() or "tangga" in name.lower():
            generated_keywords[name] = [name]
        else:
            names_to_process.append(name)
            
    if names_to_process and GEMINI_API_KEY:
        try:
            prompt = f"""
You are an expert medical linguist for a smart hospital guide application.
Your task is to generate 20-30 relevant keywords for each Indonesian hospital room name provided.
These keywords must include related symptoms, layperson terms, slang, medical specialties, and common typos.
CRITICAL: The keywords MUST be generated in BOTH Indonesian and English within the same array.
Return the result as a raw JSON object (without markdown blocks like ```json) where keys are the original Indonesian names, and values are arrays of strings (the keywords).

Names to process:
{json.dumps(names_to_process)}
"""
            response = gemini_client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt
            )
            result_text = response.text.strip()
            
            start_idx = result_text.find('{')
            end_idx = result_text.rfind('}')
            if start_idx != -1 and end_idx != -1:
                result_text = result_text[start_idx:end_idx+1]
            
            keyword_dict = json.loads(result_text)
            
            for name in names_to_process:
                kw_list = keyword_dict.get(name, [name])
                if not isinstance(kw_list, list):
                    kw_list = [str(kw_list)]
                if name not in kw_list:
                    kw_list.append(name)
                generated_keywords[name] = kw_list
        except Exception as e:
            logger.error(f"Gemini keyword generation failed: {e}")
            for name in names_to_process:
                generated_keywords[name] = [name]
    else:
        for name in names_to_process:
            generated_keywords[name] = [name]

    return {
        "status": "success",
        "keywords": generated_keywords
    }

@app.get("/")
def home():
    return {
        "message": "Server Smart Hospital Backend Aktif!",
        "status": "Bridge Active & Listening to Firestore"
    }

@app.get("/api/ip")
def get_server_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('10.255.255.255', 1))
        ip = s.getsockname()[0]
        s.close()
        return {"ip": ip}
    except Exception:
        return {"ip": "127.0.0.1"}

@app.post("/api/route")
def dapatkan_rute(request: RequestRute):
    query_asli = request.teks_pencarian.strip()
    logger.info(f"API Route: {request.start_node_id} -> '{query_asli}'")

    # 1. Coba pencarian langsung terlebih dahulu (instan & akurat)
    hasil_nlp = cari_target_ruangan(query_asli, request.start_node_id, request.language, request.current_floor)

    # 2. Jika belum cocok atau query berupa kalimat panjang, panggil Qwen untuk mengekstrak intent
    if (hasil_nlp.get("status") == "error" or hasil_nlp.get("confidence_score", 0) < 0.5) and len(query_asli.split()) > 2:
        try:
            import ollama
            ollama_client = ollama.Client(host=os.getenv("OLLAMA_BASE_URL", "http://localhost:11434"))
            model_name = os.getenv("OLLAMA_MODEL", "qwen2.5:7b")
            
            prompt_qwen = f"""Anda adalah AI Pemandu Mall. Pengunjung mencari: "{query_asli}".
Ekstrak nama toko, brand, fasilitas, atau gedung yang dimaksud (maksimal 3 kata).
Balas HANYA teks nama toko/fasilitas/gedungnya saja (contoh: "Starbucks" atau "XXI" atau "Toilet" atau "Galaxy Mall 2"):"""

            res = ollama_client.chat(
                model=model_name,
                messages=[{"role": "user", "content": prompt_qwen}],
                options={"temperature": 0.1}
            )
            extracted = res["message"]["content"].strip().strip('"').strip("'")
            if extracted and len(extracted) < 40 and extracted.lower() != query_asli.lower():
                logger.info(f"[QWEN 2.5] Ekstraksi intent AI: '{query_asli}' -> '{extracted}'")
                hasil_ai = cari_target_ruangan(extracted, request.start_node_id, request.language, request.current_floor)
                if hasil_ai.get("status") != "error":
                    hasil_nlp = hasil_ai
        except Exception as e:
            logger.warning(f"[QWEN] Fallback ke NLP standar ({e})")

    if hasil_nlp["status"] == "error":
        raise HTTPException(status_code=400, detail=hasil_nlp["pesan"])
        
    target_id = hasil_nlp["target_id"]
    match_type = hasil_nlp.get("match_type")
    if match_type == "building_entrance":
        nama_ruangan = hasil_nlp.get("matched_building")
        nama_ruangan_en = hasil_nlp.get("matched_building")
    else:
        nama_ruangan = get_room_display_name(waypoint_graph.RUANGAN_GRID.get(target_id, {}), "id")
        nama_ruangan_en = get_room_display_name(waypoint_graph.RUANGAN_GRID.get(target_id, {}), "en")

    target_name_override = nama_ruangan if request.language == "id" else nama_ruangan_en
    hasil_rute = cari_rute_grid(request.start_node_id, target_id, request.language, target_name_override=target_name_override)
    if hasil_rute["status"] == "error":
         raise HTTPException(status_code=400, detail=hasil_rute["pesan"])

    return {
        "status": "success",
        "pesan": "Rute grid berhasil ditemukan",
        "data_target": {
            "id_ruangan": target_id,
            "nama_ruangan": nama_ruangan,
            "nama_ruangan_en": nama_ruangan_en,
            "confidence_nlp": hasil_nlp["confidence_score"]
        },
        "jalur_koordinat": hasil_rute["jalur_grid"],
        "langkah_navigasi": hasil_rute["teks_navigasi"]
    }

# =============================================================
# ENDPOINTS POSTGRESQL & OLLAMA QWEN (MALL INDOOR NAVIGATOR)
# =============================================================

@app.get("/api/map-data")
def get_map_data():
    """Mengambil seluruh data denah (Lantai, Toko/Tenants, Fasilitas, Kiosks) dari PostgreSQL."""
    if SessionLocal is None:
        raise HTTPException(status_code=500, detail="Database PostgreSQL belum terhubung.")
    db_session = SessionLocal()
    try:
        from app.models.mall import Floor, Tenant, Facility, Kiosk
        floors = db_session.query(Floor).order_by(Floor.building, Floor.floor_level).all()
        tenants = db_session.query(Tenant).filter(Tenant.is_active == True).all()
        facilities = db_session.query(Facility).all()
        kiosks = db_session.query(Kiosk).order_by(Kiosk.floor, Kiosk.id).all()
        # Sort kiosks so that Ground Floor kiosks (e.g. KIOSK_LOBBY_GF) appear first
        kiosks = sorted(kiosks, key=lambda k: (0 if "ground" in (k.floor or "").lower() else 1, k.floor or "", k.id))

        rooms_list = []
        for t in tenants:
            rooms_list.append({
                "id": t.id,
                "name": t.name,
                "name_en": t.name_en or t.name,
                "type": "room",
                "category": t.category,
                "sub_category": t.sub_category,
                "unit_number": t.unit_number,
                "floor": t.floor,
                "building": t.building or "Mall Utama",
                "grid_x": t.grid_x,
                "grid_y": t.grid_y,
                "grid_width": t.grid_width,
                "grid_height": t.grid_height,
                "endpoints": t.endpoints or ["bottom"],
                "keywords": t.keywords or [],
                "description": t.description,
                "shape_type": getattr(t, "shape_type", "rect") or "rect",
                "points": getattr(t, "points", None)
            })
        for f in facilities:
            rooms_list.append({
                "id": f.id,
                "name": f.name,
                "name_en": f.name_en or f.name,
                "type": "room",
                "facility_type": f.facility_type,
                "floor": f.floor,
                "building": f.building or "Mall Utama",
                "grid_x": f.grid_x,
                "grid_y": f.grid_y,
                "grid_width": f.grid_width,
                "grid_height": f.grid_height,
                "endpoints": f.endpoints or ["bottom"],
                "keywords": f.keywords or [],
                "is_connector": f.is_connector,
                "connector_group": f.connector_group,
                "shape_type": getattr(f, "shape_type", "rect") or "rect",
                "points": getattr(f, "points", None)
            })

        kiosks_list = []
        for k in kiosks:
            kiosks_list.append({
                "id": k.id,
                "name": k.name,
                "floor": k.floor,
                "building": k.building or "Mall Utama",
                "grid_x": k.grid_x,
                "grid_y": k.grid_y,
                "grid_width": k.grid_width,
                "grid_height": k.grid_height,
                "endpoints": k.endpoints or ["bottom"],
                "is_locked": k.is_locked,
                "shape_type": getattr(k, "shape_type", "rect") or "rect",
                "points": getattr(k, "points", None)
            })

        floors_list = [{
            "id": fl.id,
            "name": fl.name,
            "building": fl.building,
            "floor_level": fl.floor_level,
            "grid_width": fl.grid_width,
            "grid_height": fl.grid_height
        } for fl in floors]

        return JSONResponse(
            content={
                "status": "success",
                "source": "postgresql",
                "floors": floors_list,
                "rooms": rooms_list,
                "kiosks": kiosks_list
            },
            headers={"Cache-Control": "no-cache, no-store, must-revalidate"}
        )
    except Exception as e:
        logger.error(f"Error fetching map data: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db_session.close()

@app.post("/api/seed")
def seed_database():
    """Trigger inisialisasi tabel dan seed data mall ke PostgreSQL."""
    from seed_mall import seed_mall_data
    sukses = seed_mall_data()
    if sukses:
        muat_data_dari_postgres()
        return {"status": "success", "message": "Database PostgreSQL berhasil di-seed dan denah disinkronkan!"}
    raise HTTPException(status_code=500, detail="Gagal melakukan seeding. Pastikan PostgreSQL aktif dan kredensial di .env benar.")

class ElementItem(BaseModel):
    id: str
    type: str = "room"
    name: str = "Tanpa Nama"
    name_en: Optional[str] = None
    category: Optional[str] = None
    sub_category: Optional[str] = None
    unit_number: Optional[str] = None
    facility_type: Optional[str] = None
    floor: str = "Ground Floor"
    building: str = "Mall Utama"
    grid_x: int = 0
    grid_y: int = 0
    grid_width: int = 1
    grid_height: int = 1
    endpoints: Optional[List[str]] = ["bottom"]
    keywords: Optional[List[str]] = None
    is_connector: Optional[bool] = False
    connector_group: Optional[str] = None
    target_building: Optional[str] = None
    description: Optional[str] = None
    shape_type: Optional[str] = "rect"
    points: Optional[List[float]] = None

class FloorItem(BaseModel):
    name: str
    building: Optional[str] = "Mall Utama"
    floor_level: Optional[int] = 1

class RequestSaveMap(BaseModel):
    elements: List[ElementItem]
    deleted_ids: Optional[List[str]] = []
    floors: Optional[List[FloorItem]] = []

@app.post("/api/map-data/save")
def save_map_data(request: RequestSaveMap):
    """Menyimpan pembaruan denah dari editor admin ke PostgreSQL dan menyinkronkan memori A* & NLP."""
    if SessionLocal is None:
        raise HTTPException(status_code=500, detail="Database PostgreSQL belum terhubung.")
    
    db_session = SessionLocal()
    try:
        from app.models.mall import Floor, Tenant, Facility, Kiosk
        
        # 1. Hapus elemen yang diminta untuk didelete
        if request.deleted_ids:
            db_session.query(Tenant).filter(Tenant.id.in_(request.deleted_ids)).delete(synchronize_session=False)
            db_session.query(Facility).filter(Facility.id.in_(request.deleted_ids)).delete(synchronize_session=False)
            db_session.query(Kiosk).filter(Kiosk.id.in_(request.deleted_ids)).delete(synchronize_session=False)

        # 2. Update atau tambah elemen
        for el in request.elements:
            el_name = (el.name or "").strip() or "Tanpa Nama"
            el_floor = (el.floor or "").strip() or "Ground Floor"
            el_building = (el.building or "").strip() or "Galaxy Mall 1"
            el_grid_x = int(el.grid_x or 0)
            el_grid_y = int(el.grid_y or 0)
            el_grid_w = max(1, int(el.grid_width or 1))
            el_grid_h = max(1, int(el.grid_height or 1))
            shape_type = getattr(el, "shape_type", "rect") or "rect"
            points = getattr(el, "points", None)
            endpoints = el.endpoints or ["bottom"]

            if el.type == "kiosk":
                db_session.query(Tenant).filter(Tenant.id == el.id).delete(synchronize_session=False)
                db_session.query(Facility).filter(Facility.id == el.id).delete(synchronize_session=False)
                existing_kiosk = db_session.query(Kiosk).filter(Kiosk.id == el.id).first()
                if existing_kiosk:
                    existing_kiosk.name = el_name
                    existing_kiosk.building = el_building
                    existing_kiosk.floor = el_floor
                    existing_kiosk.grid_x = el_grid_x
                    existing_kiosk.grid_y = el_grid_y
                    existing_kiosk.grid_width = el_grid_w
                    existing_kiosk.grid_height = el_grid_h
                    existing_kiosk.endpoints = endpoints
                    existing_kiosk.shape_type = shape_type
                    existing_kiosk.points = points
                else:
                    new_kiosk = Kiosk(
                        id=el.id,
                        name=el_name,
                        building=el_building,
                        floor=el_floor,
                        grid_x=el_grid_x,
                        grid_y=el_grid_y,
                        grid_width=el_grid_w,
                        grid_height=el_grid_h,
                        endpoints=endpoints,
                        shape_type=shape_type,
                        points=points
                    )
                    db_session.add(new_kiosk)
            else:
                db_session.query(Kiosk).filter(Kiosk.id == el.id).delete(synchronize_session=False)
                existing_fac = db_session.query(Facility).filter(Facility.id == el.id).first()
                existing_tenant = db_session.query(Tenant).filter(Tenant.id == el.id).first()

                name_lower = el_name.lower()
                is_facility = bool(
                    existing_fac or
                    el.facility_type or
                    el.is_connector or
                    any(k in name_lower for k in ["toilet", "musholla", "lift", "eskalator", "atm", "cs", "customer service", "informasi"])
                )

                if is_facility:
                    if existing_fac:
                        existing_fac.name = el_name
                        existing_fac.name_en = el.name_en or el_name
                        existing_fac.building = el_building
                        existing_fac.floor = el_floor
                        existing_fac.grid_x = el_grid_x
                        existing_fac.grid_y = el_grid_y
                        existing_fac.grid_width = el_grid_w
                        existing_fac.grid_height = el_grid_h
                        existing_fac.endpoints = endpoints
                        existing_fac.shape_type = shape_type
                        existing_fac.points = points
                        existing_fac.is_connector = el.is_connector or False
                        existing_fac.connector_group = el.connector_group
                        existing_fac.target_building = el.target_building
                        if el.keywords is not None:
                            existing_fac.keywords = el.keywords
                    else:
                        if existing_tenant:
                            db_session.delete(existing_tenant)
                        fac_type = el.facility_type or "general"
                        if "toilet" in name_lower: fac_type = "toilet"
                        elif "musholla" in name_lower: fac_type = "musholla"
                        elif "lift" in name_lower: fac_type = "elevator"
                        elif "eskalator" in name_lower: fac_type = "escalator"
                        elif "atm" in name_lower: fac_type = "atm"
                        elif "cs" in name_lower or "customer service" in name_lower or "informasi" in name_lower: fac_type = "customer_service"

                        new_fac = Facility(
                            id=el.id,
                            name=el_name,
                            name_en=el.name_en or el_name,
                            facility_type=fac_type,
                            building=el_building,
                            floor=el_floor,
                            grid_x=el_grid_x,
                            grid_y=el_grid_y,
                            grid_width=el_grid_w,
                            grid_height=el_grid_h,
                            endpoints=endpoints,
                            shape_type=shape_type,
                            points=points,
                            is_connector=el.is_connector or False,
                            connector_group=el.connector_group,
                            target_building=el.target_building,
                            keywords=el.keywords if el.keywords is not None else [name_lower]
                        )
                        db_session.add(new_fac)
                else:
                    if existing_tenant:
                        existing_tenant.name = el_name
                        existing_tenant.name_en = el.name_en or el_name
                        existing_tenant.building = el_building
                        existing_tenant.floor = el_floor
                        existing_tenant.grid_x = el_grid_x
                        existing_tenant.grid_y = el_grid_y
                        existing_tenant.grid_width = el_grid_w
                        existing_tenant.grid_height = el_grid_h
                        existing_tenant.endpoints = endpoints
                        existing_tenant.shape_type = shape_type
                        existing_tenant.points = points
                        if el.category: existing_tenant.category = el.category
                        if el.sub_category: existing_tenant.sub_category = el.sub_category
                        if el.unit_number: existing_tenant.unit_number = el.unit_number
                        if el.description: existing_tenant.description = el.description
                        if el.keywords is not None: existing_tenant.keywords = el.keywords
                    else:
                        new_tenant = Tenant(
                            id=el.id,
                            name=el_name,
                            name_en=el.name_en or el_name,
                            category=el.category or "Retail",
                            sub_category=el.sub_category or "Store",
                            unit_number=el.unit_number,
                            building=el_building,
                            floor=el_floor,
                            grid_x=el_grid_x,
                            grid_y=el_grid_y,
                            grid_width=el_grid_w,
                            grid_height=el_grid_h,
                            endpoints=endpoints,
                            shape_type=shape_type,
                            points=points,
                            description=el.description or f"Toko {el_name}",
                            keywords=el.keywords if el.keywords is not None else [name_lower, "toko", "belanja"]
                        )
                        db_session.add(new_tenant)

        # 3. Sinkronkan lantai jika ada
        if request.floors:
            for fl in request.floors:
                target_bld = (fl.building or "").strip() or "Galaxy Mall 1"
                fl_name = (fl.name or "").strip()
                if not fl_name:
                    continue
                existing_floor = db_session.query(Floor).filter(
                    Floor.name == fl_name,
                    Floor.building == target_bld
                ).first()

                if existing_floor:
                    if fl.floor_level is not None:
                        existing_floor.floor_level = fl.floor_level
                else:
                    clean_bld = re.sub(r'[^A-Za-z0-9]', '_', target_bld).upper()[:15]
                    clean_fl = re.sub(r'[^A-Za-z0-9]', '_', fl_name).upper()[:15]
                    base_id = f"FL_{clean_bld}_{clean_fl}"[:40]
                    
                    candidate_id = base_id
                    counter = 1
                    while db_session.query(Floor).filter(Floor.id == candidate_id).first():
                        candidate_id = f"{base_id[:32]}_{counter}"
                        counter += 1

                    db_session.add(Floor(
                        id=candidate_id,
                        name=fl_name,
                        building=target_bld,
                        floor_level=fl.floor_level or 1,
                        grid_width=80,
                        grid_height=80
                    ))

        db_session.commit()
        
        # 4. Sinkronkan memori rute A* dan NLP
        muat_data_dari_postgres()
        
        logger.info("[MAP-SAVE] Perubahan denah berhasil disimpan ke PostgreSQL dan disinkronkan!")
        return {"status": "success", "message": "Peta denah berhasil disimpan ke database!"}
    except Exception as e:
        db_session.rollback()
        logger.error(f"[MAP-SAVE] Gagal menyimpan perubahan denah: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db_session.close()

class RequestChatNav(BaseModel):
    prompt: str
    start_kiosk_id: str = "KIOSK_LOBBY_GF"
    language: str = "id"
    current_floor: str = "Ground Floor"

@app.post("/api/chat-nav")
def chat_navigation(request: RequestChatNav):
    """
    Integrasi AI Lokal Ollama (Model Qwen) untuk memproses permintaan percakapan pengunjung mall.
    Mengekstrak maksud pengguna, mencocokkan toko di database, lalu menghitung rute A*.
    """
    prompt = request.prompt.strip()
    logger.info(f"[OLLAMA QWEN] Memproses prompt pengunjung: '{prompt}'")
    
    extracted_target = None
    ai_response_message = ""

    # 1. Coba hubungi Ollama lokal jika sedang berjalan
    try:
        import ollama
        ollama_client = ollama.Client(host=os.getenv("OLLAMA_BASE_URL", "http://localhost:11434"))
        model_name = os.getenv("OLLAMA_MODEL", "qwen2.5:7b")

        system_prompt = """Anda adalah asisten cerdas pemandu pengunjung di Pusat Perbelanjaan (Mall).
Tugas Anda: mengekstrak toko, brand, produk, atau fasilitas umum yang dicari pengunjung dari pertanyaan mereka.
Format jawaban Anda WAJIB HANYA berupa JSON raw valid (tanpa markdown blok ```json):
{
  "target_keyword": "nama toko atau kata kunci pencarian",
  "category": "F&B / Fashion / Gadget / Entertainment / Facility",
  "message": "jawaban ramah singkat 1-2 kalimat untuk pengunjung dalam bahasa Indonesia"
}"""

        response = ollama_client.chat(
            model=model_name,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ]
        )
        content = response["message"]["content"].strip()
        if content.startswith("```json"):
            content = content.replace("```json", "").replace("```", "").strip()
        elif content.startswith("```"):
            content = content.replace("```", "").strip()
            
        data = json.loads(content)
        extracted_target = data.get("target_keyword", prompt)
        ai_response_message = data.get("message", f"Mengarahkan Anda ke {extracted_target}")
    except Exception as e:
        logger.warning(f"[OLLAMA] Ollama tidak merespons ({e}), fallback ke NLP lokal...")
        extracted_target = prompt
        ai_response_message = f"Mencari rute menuju '{prompt}'"

    # 2. Jalankan pencarian target ruangan & kalkulasi rute A*
    hasil_nlp = cari_target_ruangan(extracted_target or prompt, request.start_kiosk_id, request.language, request.current_floor)
    if hasil_nlp.get("status") == "error":
        return {
            "status": "not_found",
            "message": f"Maaf, toko atau fasilitas terkait '{prompt}' tidak ditemukan di mall ini.",
            "ai_text": ai_response_message
        }

    target_id = hasil_nlp["target_id"]
    nama_ruangan = get_room_display_name(waypoint_graph.RUANGAN_GRID.get(target_id, {}), request.language)
    nama_ruangan_en = get_room_display_name(waypoint_graph.RUANGAN_GRID.get(target_id, {}), "en")
    
    hasil_rute = cari_rute_grid(request.start_kiosk_id, target_id, request.language, target_name_override=nama_ruangan)

    return {
        "status": "success",
        "ai_text": ai_response_message,
        "data_target": {
            "id_ruangan": target_id,
            "nama_ruangan": nama_ruangan,
            "nama_ruangan_en": nama_ruangan_en,
            "confidence_nlp": hasil_nlp.get("confidence_score", 1.0)
        },
        "jalur_koordinat": hasil_rute.get("jalur_grid", []),
        "langkah_navigasi": hasil_rute.get("teks_navigasi", [])
    }

