import os
import re
import numpy as np
from sentence_transformers import SentenceTransformer, util
from rapidfuzz import process, fuzz
try:
    from google import genai
except (ImportError, AttributeError):
    genai = None

try:
    from firebase_admin import firestore
except ImportError:
    firestore = None

from app.core.database import db

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
gemini_client = None
if GEMINI_API_KEY and genai is not None:
    try:
        gemini_client = genai.Client(api_key=GEMINI_API_KEY)
    except Exception:
        gemini_client = None

model = None

def get_model():
    global model
    if model is None:
        print("Memuat mesin NLP (Sentence Transformers)...")
        model = SentenceTransformer('paraphrase-multilingual-mpnet-base-v2', device='cpu')
    return model

DATABASE_RUANGAN = {}
daftar_nama_ruangan = []
embeddings_ruangan = None

NLP_CACHE = {}


def bersihkan_teks(teks_kotor):
    teks = teks_kotor.lower()
        
    teks = re.sub(r'[^\w\s]', '', teks)
    
    stopwords = [
        "mau", "ke", "di", "mana", "tolong", "antar", "cari", "ruang", "tempat", "saya", "ingin", "tanya", "mas", "mbak", "kasih", "tau", "arah", "jalan", "buat", "ambil",
        "tunjukkan", "bantuin", "dong", "aku", "nyari", "gimana", "caranya", "menuju", "cara", "pergi", "bisa", "tolongin", "dong", "pak", "bu", "sus", "suster", "dokter", "letak", "letaknya", "ada",
        "want", "to", "go", "where", "please", "take", "me", "find", "room", "place", "i", "ask", "show", "way", "direction", "get", "looking", "for", "how", "can", "is", "the", "a", "an"
    ]
    kata_akhir = [kata for kata in teks.split() if kata not in stopwords]
    
    return " ".join(kata_akhir)

def latih_ulang_nlp(data_kamus_baru):
    global DATABASE_RUANGAN, daftar_nama_ruangan, embeddings_ruangan
    
    if not data_kamus_baru:
        print("[NLP] Peringatan: Database kosong, tidak ada yang dilatih.")
        return

    korpus_dokumen = []
    for sinonim in data_kamus_baru.values():
        teks_gabungan = " ".join(sinonim)
        korpus_dokumen.append(bersihkan_teks(teks_gabungan))

    new_embeddings = get_model().encode(korpus_dokumen, convert_to_tensor=True)
    
    DATABASE_RUANGAN = data_kamus_baru
    daftar_nama_ruangan = list(DATABASE_RUANGAN.keys())
    embeddings_ruangan = new_embeddings
    
    NLP_CACHE.clear()

    print(f"[NLP] Model berhasil dilatih ulang! ({len(daftar_nama_ruangan)} Ruangan Aktif)")

def cari_target_ruangan(input_pengunjung, start_node_id=None, language="id", current_floor=None):
    if embeddings_ruangan is None or not daftar_nama_ruangan:
        pesan = "Sistem sedang memuat data peta, mohon tunggu." if language == "id" else "System is loading map data, please wait."
        return {"status": "error", "pesan": pesan}

    from app.core import state as waypoint_graph

    input_raw = (input_pengunjung or "").strip()
    input_lower = input_raw.lower()

    # 0. DIRECT ROOM ID MATCH (Kritikal: user mengklik ruangan di denah / dropdown mengirim room.id)
    if input_raw in waypoint_graph.RUANGAN_GRID:
        return {
            "status": "success",
            "target_id": input_raw,
            "confidence_score": 1.0,
            "match_type": "exact_id"
        }
    for r_id in waypoint_graph.RUANGAN_GRID:
        if r_id.lower() == input_lower:
            return {
                "status": "success",
                "target_id": r_id,
                "confidence_score": 1.0,
                "match_type": "exact_id"
            }

    # 0b. EXACT ROOM NAME MATCH (Nama toko/ruangan persis sama baik id maupun en)
    for r_id, room in waypoint_graph.RUANGAN_GRID.items():
        name_id = room.get("name", "").strip().lower()
        name_en = room.get("name_en", "").strip().lower()
        unit_no = room.get("unit_number", "").strip().lower()
        if input_lower and (input_lower == name_id or (name_en and input_lower == name_en) or (unit_no and input_lower == unit_no)):
            return {
                "status": "success",
                "target_id": r_id,
                "confidence_score": 1.0,
                "match_type": "exact_name"
            }

    input_bersih = bersihkan_teks(input_pengunjung)
    
    if not input_bersih:
         pesan = "Mohon masukkan tujuan yang lebih spesifik." if language == "id" else "Please enter a more specific destination."
         return {"status": "error", "pesan": pesan}

    # Heuristic: Deteksi jika user hanya ingin pergi ke suatu lantai.
    teks_cek = input_bersih.replace("naik", "").replace("turun", "").strip()
    
    semua_lantai = set()
    semua_gedung = set()
    for room in waypoint_graph.RUANGAN_GRID.values():
        fl = room.get("floor", "Lantai 1")
        bld = room.get("building", "Gedung A")
        if not fl.startswith("submap_"):
            semua_lantai.add(fl)
        semua_gedung.add(bld)
    
    target_floor_match = None
    for fl in semua_lantai:
        if teks_cek.lower() == fl.lower():
            target_floor_match = fl
            break
    
    if target_floor_match:
        for r_id, room in waypoint_graph.RUANGAN_GRID.items():
            if room.get("floor", "Lantai 1") == target_floor_match:
                nama = room.get("name", "").lower()
                is_vertical = ("lift" in nama or "tangga" in nama) and "darurat" not in nama
                if is_vertical:
                    return {
                        "status": "success",
                        "target_id": r_id,
                        "confidence_score": 1.0
                    }

    # Building heuristic: HANYA jika pengguna secara eksplisit menanyakan gedung/mall
    target_building_match = None
    is_building_query = False

    # 1. Exact building name match (misal user mengetik "Galaxy Mall 3", "Mall Utama")
    for bld in semua_gedung:
        if input_lower == bld.lower() or teks_cek.lower() == bld.lower():
            target_building_match = bld
            is_building_query = True
            break

    # 2. Pola eksplisit gedung/mall (misal: "ke GM 3", "gedung 2", "mall 1", "pergi ke galaxy mall 3")
    if not is_building_query:
        bld_regex = re.match(r'^(?:ke|arah|pergi ke|menuju)?\s*(?:galaxy\s*mall|gedung\s*gm|gedung|mall|gm)\s*([123a-z])\s*$', input_lower)
        if bld_regex:
            bld_num = bld_regex.group(1).lower()
            for bld in semua_gedung:
                b_num = re.search(r'\d+', bld)
                if b_num and b_num.group() == bld_num:
                    target_building_match = bld
                    is_building_query = True
                    break

    if is_building_query and target_building_match:
        from app.services.a_star_service import get_pintu_gedung
        start_room = waypoint_graph.RUANGAN_GRID.get(start_node_id, {})
        start_bld = start_room.get("building")

        # Prioritaskan pintu / jembatan masuk di gedung tujuan dari gedung awal
        pintu_gedung = get_pintu_gedung(target_building_match, start_bld) if start_bld else get_pintu_gedung(target_building_match)
        if pintu_gedung:
            for r_id, room in waypoint_graph.RUANGAN_GRID.items():
                if room == pintu_gedung:
                    return {
                        "status": "success",
                        "target_id": r_id,
                        "confidence_score": 1.0,
                        "match_type": "building_entrance",
                        "matched_building": target_building_match
                    }
        for r_id, room in waypoint_graph.RUANGAN_GRID.items():
            if room.get("building", "Gedung A") == target_building_match and room.get("is_connector"):
                return {
                    "status": "success",
                    "target_id": r_id,
                    "confidence_score": 1.0,
                    "match_type": "building_entrance",
                    "matched_building": target_building_match
                }
        for r_id, room in waypoint_graph.RUANGAN_GRID.items():
            if room.get("building", "Gedung A") == target_building_match:
                return {
                    "status": "success",
                    "target_id": r_id,
                    "confidence_score": 1.0,
                    "match_type": "building_entrance",
                    "matched_building": target_building_match
                }


    # Heuristic: Deteksi jika user ingin pulang/keluar
    if "pulang" in input_bersih or "keluar" in input_bersih or "exit" in input_bersih:
        entrance_nodes = []
        for r_id, room in waypoint_graph.RUANGAN_GRID.items():
            nama = room.get("name", "").lower()
            tipe = room.get("type", "room")
            
            is_entrance = (tipe == "kiosk" and "pintu" in nama) or "pintu keluar" in nama or "pintu masuk" in nama or "exit" in nama or "entrance" in nama or "lobi" in nama or "lobby" in nama
            
            if is_entrance:
                entrance_nodes.append(r_id)
        
        if entrance_nodes:
            terbaik_id = entrance_nodes[0]
            if start_node_id and start_node_id in waypoint_graph.RUANGAN_GRID:
                start_room = waypoint_graph.RUANGAN_GRID[start_node_id]
                sx = start_room.get("x", 0)
                sy = start_room.get("y", 0)
                sf = start_room.get("floor", "Lantai 1")
                
                min_jarak = float('inf')
                for pk_id in entrance_nodes:
                    pk_room = waypoint_graph.RUANGAN_GRID[pk_id]
                    penalty = 0 if pk_room.get("floor", "Lantai 1") == sf else 10000
                    jarak = abs(sx - pk_room.get("x", 0)) + abs(sy - pk_room.get("y", 0)) + penalty
                    if jarak < min_jarak:
                        min_jarak = jarak
                        terbaik_id = pk_id
            
            return {
                "status": "success",
                "target_id": terbaik_id,
                "confidence_score": 1.0
            }

    # Pemeriksaan kecocokan persis & irisan kata.
    perfect_matches = []
    keyword_perfect_matches = []
    substring_matches = []
    intersection_matches = []
    
    input_lower = input_pengunjung.lower().strip()
    input_words = set(input_bersih.split())
    
    kumpulan_kata_kunci = []
    mapping_kunci_ke_id = {}

    for r_id, room in waypoint_graph.RUANGAN_GRID.items():
        room_name_lower = room.get("name", "").lower().strip()
        room_keywords = [k.lower().strip() for k in room.get("keywords", [])]
        
        if input_lower == room_name_lower or input_pengunjung == r_id:
            perfect_matches.append(r_id)
            
        clean_room_name = bersihkan_teks(room_name_lower)
        clean_keywords = [bersihkan_teks(k) for k in room_keywords]
        
        semua_teks_bersih = [clean_room_name] + clean_keywords
        room_words = set()
        for teks_bersih in semua_teks_bersih:
            if teks_bersih:
                kumpulan_kata_kunci.append(teks_bersih)
                if teks_bersih not in mapping_kunci_ke_id:
                    mapping_kunci_ke_id[teks_bersih] = []
                mapping_kunci_ke_id[teks_bersih].append(r_id)
                room_words.update(teks_bersih.split())
                
                # Kecocokan kata kunci persis.
                if input_bersih == teks_bersih:
                    if r_id not in perfect_matches and r_id not in keyword_perfect_matches:
                        keyword_perfect_matches.append(r_id)
                elif input_bersih and input_bersih in teks_bersih:
                    if r_id not in perfect_matches and r_id not in keyword_perfect_matches and r_id not in substring_matches:
                        substring_matches.append(r_id)
        
        GENERIC_WORDS = {"lapar", "laper", "makan", "makanan", "kuliner", "mau", "ingin", "cari", "tempat", "ke", "di", "beli", "toko", "resto", "restoran"}
        irisan = input_words.intersection(room_words)
        irisan_valid = [w for w in irisan if len(w) >= 3]
        if irisan_valid:
            score = sum(1 if w in GENERIC_WORDS else 5 for w in irisan_valid)
            if r_id not in perfect_matches and r_id not in substring_matches:
                intersection_matches.append((score, r_id))

    if perfect_matches:
        exact_matches = perfect_matches
    elif keyword_perfect_matches:
        exact_matches = keyword_perfect_matches
    elif substring_matches:
        exact_matches = substring_matches
    elif intersection_matches:
        # Urutkan berdasarkan bobot kata kunci tertinggi (kata spesifik > generik)
        intersection_matches.sort(key=lambda x: x[0], reverse=True)
        top_score = intersection_matches[0][0]
        # Hanya pertahankan kandidat dengan skor kata kunci tertinggi
        exact_matches = [x[1] for x in intersection_matches if x[0] >= top_score]
    else:
        exact_matches = []

    # 1. Pemetaan Kebutuhan / Intent Pengunjung Mall (misal: lapar, haus, baju, nonton, buku, dll)
    if not exact_matches and input_bersih:
        INTENT_MAPPINGS = {
            "food": {
                "keywords": ["lapar", "laper", "makan", "makanan", "kuliner", "resto", "restoran", "food", "foodcourt", "food court", "kenyang", "lunch", "dinner", "sarapan", "jajan", "tempat makan", "cari makan", "mie", "nasi", "udon", "sushi"],
                "categories": ["restaurant", "dining"],
                "fallback_keywords": ["udon", "sushi", "marugame", "sushitei", "restoran", "makanan", "kuliner", "makan", "lapar"]
            },
            "beverage": {
                "keywords": ["haus", "minum", "minuman", "kopi", "ngopi", "cafe", "kafe", "boba", "teh", "jus", "coffee", "tea"],
                "categories": ["beverage", "cafe", "coffee"],
                "fallback_keywords": ["starbucks", "chatime", "chagee", "koi", "kopi", "teh", "boba", "minum", "minuman", "haus"]
            },
            "books": {
                "keywords": ["buku", "novel", "komik", "alat tulis", "pensil", "pulpen", "baca", "atk", "majalah", "stationery", "buku pelajaran"],
                "categories": ["books & stationery", "stationery", "books"],
                "fallback_keywords": ["gramedia", "buku"]
            },
            "fashion": {
                "keywords": ["baju", "celana", "pakaian", "fashion", "kaos", "dress", "jaket", "hoodie", "jeans", "busana", "sepatu", "tas"],
                "categories": ["fashion", "apparel", "clothing"],
                "fallback_keywords": ["uniqlo", "zara", "h&m", "hnm"]
            },
            "gadget": {
                "keywords": ["hp", "handphone", "gadget", "laptop", "iphone", "apple", "macbook", "charger", "elektronik", "ipad", "airpods"],
                "categories": ["gadget", "electronics"],
                "fallback_keywords": ["ibox", "apple"]
            },
            "beauty": {
                "keywords": ["makeup", "skincare", "parfum", "lipstik", "bedak", "kosmetik", "kecantikan", "perawatan"],
                "categories": ["beauty & health", "beauty", "cosmetics"],
                "fallback_keywords": ["sephora"]
            },
            "cinema": {
                "keywords": ["nonton", "bioskop", "cinema", "film", "movie", "popcorn", "tiket nonton"],
                "categories": ["entertainment"],
                "fallback_keywords": ["xxi", "cinema"]
            },
            "arcade": {
                "keywords": ["main", "game", "timezone", "arcade", "anak-anak", "boneka", "mesin capit"],
                "categories": ["entertainment"],
                "fallback_keywords": ["funworld", "timezone"]
            },
            "toilet": {
                "keywords": ["toilet", "wc", "restroom", "pipis", "kencing", "kamar kecil", "buang air", "kebelet"],
                "categories": ["facility"],
                "fallback_keywords": ["toilet", "restroom", "wc"]
            },
            "musholla": {
                "keywords": ["sholat", "solat", "musholla", "mushola", "masjid", "ibadah", "wudhu", "sembahyang"],
                "categories": ["facility"],
                "fallback_keywords": ["musholla", "mushola"]
            },
            "atm": {
                "keywords": ["atm", "uang", "ambil uang", "tarik tunai", "duit", "bank"],
                "categories": ["facility"],
                "fallback_keywords": ["atm"]
            }
        }

        matched_intent = None
        matched_intent_key = None
        for intent_key, intent_data in INTENT_MAPPINGS.items():
            if any(k in input_bersih.split() or k == input_bersih for k in intent_data["keywords"]):
                matched_intent = intent_data
                matched_intent_key = intent_key
                break

        if matched_intent:
            intent_candidates = []
            for r_id, room in waypoint_graph.RUANGAN_GRID.items():
                r_cat = (room.get("category") or "").lower()
                r_name = (room.get("name") or "").lower()
                r_kws = " ".join(room.get("keywords") or []).lower()
                
                if matched_intent_key == "food":
                    # Hindari kedai minuman/kopi jika pengunjung lapar / cari makanan
                    if any(bw in r_name for bw in ["starbucks", "chatime", "chagee", "koi"]):
                        continue

                # Cek kategori atau kata kunci yang cocok
                cat_match = any(c in r_cat for c in matched_intent["categories"])
                kw_match = any(fk in r_name or fk in r_kws for fk in matched_intent["fallback_keywords"])
                
                if cat_match or kw_match:
                    intent_candidates.append(r_id)

            if intent_candidates:
                exact_matches = intent_candidates

    # 2. Koreksi Typo Cerdas (Hanya jika panjang kata mirip, cegah 'lapar' mencocokkan 'buku pelajaran')
    if not exact_matches and input_bersih:
        candidates = [k for k in kumpulan_kata_kunci if abs(len(k) - len(input_bersih)) <= 2 and len(k) >= 3]
        if candidates:
            typo_matches = process.extract(input_bersih, candidates, scorer=fuzz.ratio, limit=1, score_cutoff=82)
            if typo_matches:
                exact_matches = mapping_kunci_ke_id.get(typo_matches[0][0], [])

    if exact_matches:
        if len(exact_matches) == 1:
            return {"status": "success", "target_id": exact_matches[0], "confidence_score": 1.0}
        else:
            from app.core import state as waypoint_graph
            if start_node_id:
                start_room = waypoint_graph.RUANGAN_GRID.get(start_node_id)
                if start_room:
                    start_floor = start_room.get("floor", "Lantai 1")
                    start_bld = start_room.get("building")
                    start_x = start_room.get("x", 0)
                    start_y = start_room.get("y", 0)
                    terbaik_jarak = float('inf')
                    terbaik_id = exact_matches[0]
                    for m_id in exact_matches:
                        m_room = waypoint_graph.RUANGAN_GRID.get(m_id)
                        if not m_room: continue
                        
                        target_floor = current_floor if current_floor else start_floor
                        floor_penalty = 0 if m_room.get("floor", "Lantai 1") == target_floor else 10000
                        bld_penalty = 0 if m_room.get("building") == start_bld else 50000
                        
                        jarak = abs(start_x - m_room.get("x", 0)) + abs(start_y - m_room.get("y", 0)) + floor_penalty + bld_penalty
                        if jarak < terbaik_jarak:
                            terbaik_jarak = jarak
                            terbaik_id = m_id
                    return {"status": "success", "target_id": terbaik_id, "confidence_score": 1.0}
            
            if current_floor:
                for m_id in exact_matches:
                    m_room = waypoint_graph.RUANGAN_GRID.get(m_id)
                    if m_room and m_room.get("floor") == current_floor:
                        return {"status": "success", "target_id": m_id, "confidence_score": 1.0}

            return {"status": "success", "target_id": exact_matches[0], "confidence_score": 1.0}

    if not input_bersih:
         pesan = "Mohon masukkan tujuan yang lebih spesifik." if language == "id" else "Please enter a more specific destination."
         return {"status": "error", "pesan": pesan}

    # Heuristic: Deteksi jika user hanya ingin pergi ke suatu lantai (misal: "turun lantai 1", "lantai 2", dsb).
    teks_cek = input_bersih.replace("naik", "").replace("turun", "").strip()
    match_lantai = re.fullmatch(r'lantai\s+(\w+)', teks_cek)
    if match_lantai:
        target_floor = f"Lantai {match_lantai.group(1)}"
        from app.core import state as waypoint_graph
        for r_id, room in waypoint_graph.RUANGAN_GRID.items():
            if room.get("floor", "Lantai 1").lower() == target_floor.lower():
                nama = room.get("name", "").lower()
                is_vertical = ("lift" in nama or "tangga" in nama) and "darurat" not in nama
                if is_vertical:
                    return {
                        "status": "success",
                        "target_id": r_id,
                        "confidence_score": 1.0
                    }

    match_gedung = re.fullmatch(r'(gedung|building)\s+(\w+)', teks_cek)
    if match_gedung:
        target_bld_prefix = match_gedung.group(1)
        target_bld_suffix = match_gedung.group(2)
        
        # Pemetaan fonetik untuk huruf-huruf Indonesia yang sering salah didengar oleh sistem STT (Speech-to-Text)
        phonetic_map = {
            "a": "a", "be": "b", "ce": "c", "de": "d", "e": "e", "ef": "f",
            "ge": "g", "ha": "h", "i": "i", "je": "j", "ka": "k", "el": "l",
            "em": "m", "en": "n", "o": "o", "pe": "p", "ki": "q", "er": "r",
            "es": "s", "te": "t", "u": "u", "ve": "v", "we": "w", "eks": "x",
            "ye": "y", "zet": "z"
        }
        
        if target_bld_suffix.lower() in phonetic_map:
            target_bld_suffix = phonetic_map[target_bld_suffix.lower()]
            
        target_building = f"{target_bld_prefix} {target_bld_suffix}"
        
        from app.core import state as waypoint_graph
        semua_gedung = {room.get("building", "Gedung A") for room in waypoint_graph.RUANGAN_GRID.values()}
        
        matched_bld = None
        for b in semua_gedung:
            if b.lower() == target_building.lower():
                matched_bld = b
                break
                
        if matched_bld:
            from app.services.a_star_service import get_pintu_gedung
            start_room = waypoint_graph.RUANGAN_GRID.get(start_node_id, {})
            start_bld = start_room.get("building")
            pintu_gedung = get_pintu_gedung(matched_bld, start_bld) if start_bld else get_pintu_gedung(matched_bld)
            if pintu_gedung:
                for r_id, room in waypoint_graph.RUANGAN_GRID.items():
                    if room == pintu_gedung:
                        return {
                            "status": "success",
                            "target_id": r_id,
                            "confidence_score": 1.0,
                            "match_type": "building_entrance",
                            "matched_building": matched_bld
                        }
            for r_id, room in waypoint_graph.RUANGAN_GRID.items():
                if room.get("building", "Gedung A") == matched_bld:
                    return {
                        "status": "success",
                        "target_id": r_id,
                        "confidence_score": 1.0,
                        "match_type": "building_entrance",
                        "matched_building": matched_bld
                    }

    # Heuristic: Deteksi jika user ingin pulang/keluar
    if "pulang" in input_bersih or "keluar" in input_bersih or "exit" in input_bersih:
        from app.core import state as waypoint_graph
        entrance_nodes = []
        for r_id, room in waypoint_graph.RUANGAN_GRID.items():
            nama = room.get("name", "").lower()
            tipe = room.get("type", "room")
            
            is_entrance = (tipe == "kiosk" and "pintu" in nama) or "pintu keluar" in nama or "pintu masuk" in nama or "exit" in nama or "entrance" in nama or "lobi" in nama or "lobby" in nama or "pusat informasi" in nama
            
            if is_entrance:
                entrance_nodes.append(r_id)
        
        if entrance_nodes:
            terbaik_id = entrance_nodes[0]
            if start_node_id and start_node_id in waypoint_graph.RUANGAN_GRID:
                start_room = waypoint_graph.RUANGAN_GRID[start_node_id]
                sx = start_room.get("x", 0)
                sy = start_room.get("y", 0)
                sf = start_room.get("floor", "Lantai 1")
                
                min_jarak = float('inf')
                for pk_id in entrance_nodes:
                    pk_room = waypoint_graph.RUANGAN_GRID[pk_id]
                    penalty = 0 if pk_room.get("floor", "Lantai 1") == sf else 10000
                    jarak = abs(sx - pk_room.get("x", 0)) + abs(sy - pk_room.get("y", 0)) + penalty
                    if jarak < min_jarak:
                        min_jarak = jarak
                        terbaik_id = pk_id
            
            return {
                "status": "success",
                "target_id": terbaik_id,
                "confidence_score": 1.0
            }

    if input_bersih in NLP_CACHE:
        input_embedding = NLP_CACHE[input_bersih]
    else:
        input_embedding = get_model().encode(input_bersih, convert_to_tensor=True)
        NLP_CACHE[input_bersih] = input_embedding
    skor_kemiripan = util.cos_sim(input_embedding, embeddings_ruangan)[0].cpu().numpy()
    
    # Penalti tangga darurat jika user tidak secara spesifik mengetik "tangga".
    if "tangga" not in input_bersih:
        for i, r_id in enumerate(daftar_nama_ruangan):
            nama_keywords = " ".join(DATABASE_RUANGAN.get(r_id, [])).lower()
            if "tangga" in nama_keywords:
                skor_kemiripan[i] -= 0.50
    
    max_score = np.max(skor_kemiripan)
    terbaik_id = None
    
    if max_score >= 0.45:
        kandidat_indeks = np.where(skor_kemiripan >= max_score - 0.01)[0]
        
        if len(kandidat_indeks) == 1:
            terbaik_id = daftar_nama_ruangan[kandidat_indeks[0]]
        else:
            from app.core import state as waypoint_graph
            if start_node_id:
                start_room = waypoint_graph.RUANGAN_GRID.get(start_node_id)
                if start_room:
                    start_floor = start_room.get("floor", "Lantai 1")
                    start_x = start_room.get("x", 0)
                    start_y = start_room.get("y", 0)
                    
                    terbaik_jarak = float('inf')
                    
                    for idx in kandidat_indeks:
                        kandidat_id = daftar_nama_ruangan[idx]
                        kandidat_room = waypoint_graph.RUANGAN_GRID.get(kandidat_id)
                        if not kandidat_room: continue
                        
                        k_floor = kandidat_room.get("floor", "Lantai 1")
                        k_x = kandidat_room.get("x", 0)
                        k_y = kandidat_room.get("y", 0)
                        
                        target_floor = current_floor if current_floor else start_floor
                        floor_penalty = 0 if k_floor == target_floor else 10000 
                        
                        jarak_manhattan = abs(start_x - k_x) + abs(start_y - k_y)
                        total_jarak = jarak_manhattan + floor_penalty
                        
                        if total_jarak < terbaik_jarak:
                            terbaik_jarak = total_jarak
                            terbaik_id = kandidat_id
                
            if not terbaik_id:
                if current_floor:
                    for idx in kandidat_indeks:
                        kandidat_id = daftar_nama_ruangan[idx]
                        kandidat_room = waypoint_graph.RUANGAN_GRID.get(kandidat_id)
                        if kandidat_room and kandidat_room.get("floor") == current_floor:
                            terbaik_id = kandidat_id
                            break
                            
                if not terbaik_id:
                    terbaik_id = daftar_nama_ruangan[kandidat_indeks[0]]
    if terbaik_id:
        return {
            "status": "success",
            "target_id": terbaik_id,
            "confidence_score": float(max_score)
        }
    else:
        # Cadangan Gemini jika skor lokal terlalu rendah.
        if GEMINI_API_KEY:
            try:
                print(f"[NLP] Lokal gagal (max_score: {max_score:.2f}). Memanggil Gemini untuk pencarian: '{input_pengunjung}'...")
                
                room_list_str = ""
                for r_id in daftar_nama_ruangan:
                    nama_ruangan = ", ".join(DATABASE_RUANGAN.get(r_id, []))
                    room_list_str += f"- ID: {r_id}, Deskripsi/Keywords: {nama_ruangan}\n"
                
                prompt = f"""
                Kamu adalah asisten navigasi rumah sakit. Pengguna mencari: "{input_pengunjung}"
                
                Berikut adalah daftar ruangan yang tersedia:
                {room_list_str}
                
                Berdasarkan pencarian pengguna, tentukan SATU ID ruangan yang paling tepat. 
                Hanya kembalikan ID ruangan tersebut, tanpa teks tambahan apapun. Jika benar-benar tidak ada yang cocok, kembalikan kata "NOT_FOUND".
                """
                
                response = gemini_client.models.generate_content(
                    model='gemini-2.5-flash',
                    contents=prompt
                )
                gemini_answer = response.text.strip()
                
                if gemini_answer != "NOT_FOUND" and gemini_answer in DATABASE_RUANGAN:
                    print(f"[NLP] Gemini berhasil mencocokkan! Memasukkan '{input_pengunjung}' ke keywords ruangan {gemini_answer}")
                    try:
                        db.collection('Rooms').document(gemini_answer).update({"keywords": firestore.ArrayUnion([input_pengunjung])})
                    except Exception as e:
                        print(f"[NLP] Gagal mengupdate keywords di Firestore: {e}")
                        
                    return {
                        "status": "success",
                        "target_id": gemini_answer,
                        "confidence_score": 0.99
                    }
            except Exception as e:
                print(f"[NLP] Gemini Fallback Error: {e}")

        pesan = "Maaf, tujuan tidak dikenali. Silakan coba kata kunci lain." if language == "id" else "Sorry, destination not recognized. Please try another keyword."
        return {
            "status": "error",
            "pesan": pesan
        }