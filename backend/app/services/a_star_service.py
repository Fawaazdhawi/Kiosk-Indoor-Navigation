import heapq
from app.core.state import get_grid_map, GRID_WIDTH, GRID_HEIGHT, RUANGAN_GRID, hitung_manhattan

def _a_star_single_floor(start_node, target_node):
    floor = start_node.get("floor", "Lantai 1")
    building = start_node.get("building", "Gedung Utama")
    grid = get_grid_map(floor, building)
    
    def get_valid_coords(node):
        coords = set()
        is_kiosk = node.get("type") == "kiosk"
        is_entrance = "pintu" in node.get("name", "").lower()
        
        if is_kiosk and not is_entrance:
            if "door_coords" in node and node["door_coords"]:
                for c in node["door_coords"]:
                    coords.add(c)
            else:
                for dy in range(node.get("h", 1)):
                    for dx in range(node.get("w", 1)):
                        coords.add((node["x"] + dx, node["y"] + dy))
        else:
            if "door_coords" in node and node["door_coords"]:
                for c in node["door_coords"]:
                    coords.add(c)
            else:
                for dy in range(node.get("h", 1)):
                    for dx in range(node.get("w", 1)):
                        coords.add((node["x"] + dx, node["y"] + dy))
        return coords

    target_coords = get_valid_coords(target_node)
    
    expanded_target_coords = set(target_coords)
    for tx, ty in target_coords:
        for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (1, 1), (-1, 1), (1, -1)]:
            nx, ny = tx + dx, ty + dy
            if 0 <= nx < GRID_WIDTH and 0 <= ny < GRID_HEIGHT:
                if grid[ny][nx] == 0:
                    expanded_target_coords.add((nx, ny))
    target_coords = expanded_target_coords
    
    open_set = []
    came_from = {}
    g_score = {}
    f_score = {}
    
    # O(1) Heuristic bounding box setup
    min_tx = min(tx for tx, ty in target_coords)
    max_tx = max(tx for tx, ty in target_coords)
    min_ty = min(ty for tx, ty in target_coords)
    max_ty = max(ty for tx, ty in target_coords)
    
    start_coords = get_valid_coords(start_node)
    
    expanded_start_coords = set(start_coords)
    for sx, sy in start_coords:
        for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (1, 1), (-1, 1), (1, -1)]:
            nx, ny = sx + dx, sy + dy
            if 0 <= nx < GRID_WIDTH and 0 <= ny < GRID_HEIGHT:
                if grid[ny][nx] == 0:
                    expanded_start_coords.add((nx, ny))
    start_coords = expanded_start_coords

    for sx, sy in start_coords:
        g_score[(sx, sy)] = 0
        h_dx = max(min_tx - sx, 0, sx - max_tx)
        h_dy = max(min_ty - sy, 0, sy - max_ty)
        min_h = h_dx + h_dy
        f_score[(sx, sy)] = min_h
        heapq.heappush(open_set, (min_h, (sx, sy)))
            
    while open_set:
        current_f, current = heapq.heappop(open_set)
        
        if current in target_coords:
            jalur = []
            curr = current
            while curr in came_from:
                jalur.append({"x": curr[0], "y": curr[1], "floor": floor, "building": building})
                curr = came_from[curr]
            jalur.append({"x": curr[0], "y": curr[1], "floor": floor, "building": building})
            jalur.reverse()
            
            compressed_jalur = []
            if len(jalur) > 0:
                compressed_jalur.append(jalur[0])
                for i in range(1, len(jalur) - 1):
                    prev_p = compressed_jalur[-1]
                    curr_p = jalur[i]
                    next_p = jalur[i+1]
                    dx1 = curr_p["x"] - prev_p["x"]
                    dy1 = curr_p["y"] - prev_p["y"]
                    dx2 = next_p["x"] - curr_p["x"]
                    dy2 = next_p["y"] - curr_p["y"]
                    if dx1 * dy2 != dx2 * dy1:
                        compressed_jalur.append(curr_p)
                if len(jalur) > 1:
                    compressed_jalur.append(jalur[-1])
            return compressed_jalur
            
            
        cx, cy = current
        tetangga_list = [(cx, cy-1), (cx, cy+1), (cx-1, cy), (cx+1, cy)]
        
        for nx, ny in tetangga_list:
            if 0 <= nx < GRID_WIDTH and 0 <= ny < GRID_HEIGHT:
                if grid[ny][nx] == 0 or (nx, ny) in target_coords:
                    turn_penalty = 0
                    if current in came_from:
                        prev = came_from[current]
                        if (current[0] - prev[0]) != (nx - current[0]) or (current[1] - prev[1]) != (ny - current[1]):
                            turn_penalty = 0.5
                            
                    wall_penalty = 0
                    for wx, wy in [(nx-1, ny), (nx+1, ny), (nx, ny-1), (nx, ny+1), (nx-1, ny-1), (nx+1, ny+1), (nx-1, ny+1), (nx+1, ny-1)]:
                        if 0 <= wx < GRID_WIDTH and 0 <= wy < GRID_HEIGHT:
                            if grid[wy][wx] == 1 and (wx, wy) not in target_coords:
                                wall_penalty += 0.1
                                
                    tentative_g = g_score[current] + 1 + turn_penalty + wall_penalty
                    
                    if (nx, ny) not in g_score or tentative_g < g_score[(nx, ny)]:
                        came_from[(nx, ny)] = current
                        g_score[(nx, ny)] = tentative_g
                        h_dx = max(min_tx - nx, 0, nx - max_tx)
                        h_dy = max(min_ty - ny, 0, ny - max_ty)
                        min_h = h_dx + h_dy
                        f_score[(nx, ny)] = tentative_g + min_h
                        heapq.heappush(open_set, (f_score[(nx, ny)], (nx, ny)))
                        
    return None

def cari_pasangan_lift_terbaik(start_node, target_node, curr_floor, target_floor, building="Gedung A"):
    from app.core.state import hitung_manhattan
    
    def is_vertical_transport_node(r):
        nama = r.get("name", "").lower()
        tipe = r.get("type", "").lower()
        fac_type = str(r.get("facility_type", "")).lower()
        is_lift = ("lift" in nama or "elevator" in nama or tipe in ("lift", "elevator") or fac_type == "elevator")
        is_stairs = ("tangga" in nama or "stairs" in nama or tipe in ("stairs", "tangga") or fac_type == "stairs")
        is_escalator = ("eskalator" in nama or "escalator" in nama or tipe in ("eskalator", "escalator") or fac_type == "escalator")
        is_emergency = ("darurat" in nama or "emergency" in nama)
        return (is_lift or is_stairs or is_escalator) and not is_emergency

    # Gabungkan Lift, Eskalator, dan Tangga (kecuali darurat) menjadi satu prioritas
    transports_start = [r for r in RUANGAN_GRID.values() if r.get("floor") == curr_floor and r.get("building", "Gedung A") == building and is_vertical_transport_node(r)]
    transports_target = [r for r in RUANGAN_GRID.values() if r.get("floor") == target_floor and r.get("building", "Gedung A") == building and is_vertical_transport_node(r)]
    
    if not transports_start or not transports_target:
        return None, None
        
    best_pair = None
    min_dist = float('inf')
    
    for l1 in transports_start:
        l1_name = l1.get("name", "").lower()
        is_l1_esc = "eskalator" in l1_name or "escalator" in l1_name or l1.get("facility_type") == "escalator"
        is_l1_lift = "lift" in l1_name or "elevator" in l1_name or l1.get("facility_type") == "elevator"
        is_l1_stair = "tangga" in l1_name or "stairs" in l1_name or l1.get("facility_type") == "stairs"

        # Matching candidate in target floor (prefer same type of vertical transport)
        same_type_targets = [
            l for l in transports_target
            if (is_l1_esc and ("eskalator" in l.get("name", "").lower() or "escalator" in l.get("name", "").lower() or l.get("facility_type") == "escalator"))
            or (is_l1_lift and ("lift" in l.get("name", "").lower() or "elevator" in l.get("name", "").lower() or l.get("facility_type") == "elevator"))
            or (is_l1_stair and ("tangga" in l.get("name", "").lower() or "stairs" in l.get("name", "").lower() or l.get("facility_type") == "stairs"))
        ]
        target_pool = same_type_targets if same_type_targets else transports_target
        l2 = min(target_pool, key=lambda l: hitung_manhattan(l1["x"], l1["y"], l["x"], l["y"]))
        
        dist1 = hitung_manhattan(start_node["x"], start_node["y"], l1["x"], l1["y"])
        dist2 = hitung_manhattan(l2["x"], l2["y"], target_node["x"], target_node["y"])
        
        if dist1 + dist2 < min_dist:
            min_dist = dist1 + dist2
            best_pair = (l1, l2)
            
    return best_pair

def get_pintu_masuk(floor_name):
    for r_id, room in RUANGAN_GRID.items():
        if room.get("floor") == floor_name:
            nama = room.get("name", "").lower()
            if "pintu masuk" in nama or "entrance" in nama:
                return room
    return None

def _is_vertical_transport(room):
    if not room: return False
    nama = room.get("name", "").lower()
    tipe = str(room.get("type", "")).lower()
    fac_type = str(room.get("facility_type", "")).lower()
    return any(k in nama for k in ["lift", "elevator", "tangga", "stairs", "eskalator", "escalator"]) or \
           tipe in ["lift", "elevator", "stairs", "tangga", "escalator", "eskalator"] or \
           fac_type in ["elevator", "escalator"]

def _is_service_node(room):
    if not room: return False
    nama = room.get("name", "").lower()
    fac_type = str(room.get("facility_type", "")).lower()
    return any(k in nama for k in ["toilet", "wc", "musholla", "prayer", "atm", "cs", "customer service", "informasi"]) or \
           fac_type in ["toilet", "musholla", "atm", "customer_service"]

def get_pintu_gedung(building_name, target_building=None):
    bld_rooms = [
        r for r in RUANGAN_GRID.values()
        if r.get("building", "Gedung A") == building_name and not _is_vertical_transport(r) and not _is_service_node(r)
    ]

    target_bld_lower = (target_building or "").strip().lower()

    if target_building:
        # Tier 1: Connector explicitly targeting target_building
        for room in bld_rooms:
            tb = (room.get("target_building") or "").strip().lower()
            if room.get("is_connector") and tb == target_bld_lower:
                return room

        # Tier 2: Check matching connector_group with any connector in target_building
        target_connectors = [
            r for r in RUANGAN_GRID.values()
            if r.get("building", "Gedung A") == target_building and not _is_vertical_transport(r) and not _is_service_node(r)
        ]
        target_groups = {
            r.get("connector_group") for r in target_connectors
            if r.get("connector_group")
        }
        for room in bld_rooms:
            cg = room.get("connector_group")
            if cg and cg in target_groups:
                return room

        # Tier 3: Target building has a connector explicitly targeting building_name
        target_nodes_pointing_here = [
            r for r in target_connectors
            if (r.get("target_building") or "").strip().lower() == building_name.strip().lower()
        ]
        if target_nodes_pointing_here:
            target_names = [r.get("name", "").lower() for r in target_nodes_pointing_here]
            for room in bld_rooms:
                r_name = room.get("name", "").lower()
                if (room.get("is_connector") or "jembatan" in r_name or "bridge" in r_name) and any(r_name in tn or tn in r_name for tn in target_names):
                    return room
            for room in bld_rooms:
                if room.get("is_connector"):
                    return room

        # Tier 4: Bridge / Jembatan / Penghubung node
        for room in bld_rooms:
            nama = room.get("name", "").lower()
            if any(k in nama for k in ["jembatan", "bridge", "penghubung", "skybridge"]):
                return room

    # Tier 5: General connector in this building
    for room in bld_rooms:
        if room.get("is_connector"):
            return room

    # Tier 6: Entrance / Pintu / Gate / Exit
    for room in bld_rooms:
        nama = room.get("name", "").lower()
        if any(k in nama for k in ["pintu masuk", "pintu keluar", "pintu", "entrance", "exit", "gerbang", "gate", "lobby", "lobi"]):
            return room

    # Tier 7: Any non-transport room in building
    if bld_rooms:
        return bld_rooms[0]

    return None

def _cari_rute_antar_gedung(start_building, target_building):
    from collections import deque
    
    if start_building == target_building:
        return []

    all_buildings = set(r.get("building", "Gedung A") for r in RUANGAN_GRID.values())
    graph = {}
    
    for b1 in all_buildings:
        for b2 in all_buildings:
            if b1 == b2:
                continue
            door1 = get_pintu_gedung(b1, b2)
            door2 = get_pintu_gedung(b2, b1)
            if door1 and door2:
                if b1 not in graph:
                    graph[b1] = []
                graph[b1].append({"target": b2, "door_out": door1, "door_in": door2})

    queue = deque([(start_building, [])])
    visited = {start_building}
    
    while queue:
        curr_b, path = queue.popleft()
        if curr_b == target_building:
            return path
            
        if curr_b in graph:
            for edge in graph[curr_b]:
                nxt_b = edge["target"]
                if nxt_b not in visited:
                    visited.add(nxt_b)
                    new_path = path + [(curr_b, edge["door_out"], nxt_b, edge["door_in"])]
                    queue.append((nxt_b, new_path))
                    
    d_out = get_pintu_gedung(start_building, target_building)
    d_in = get_pintu_gedung(target_building, start_building)
    return [(start_building, d_out, target_building, d_in)]

def cari_rute_grid(start_id, target_id, language="id", target_name_override=None):
    if start_id not in RUANGAN_GRID or target_id not in RUANGAN_GRID:
        return {"status": "error", "pesan": "Titik awal atau tujuan tidak valid di peta." if language == "id" else "Start or destination point is invalid on the map."}

    start_node = RUANGAN_GRID[start_id]
    target_node = RUANGAN_GRID[target_id]
    
    start_floor = start_node.get("floor", "Lantai 1")
    target_floor = target_node.get("floor", "Lantai 1")
    
    phases = []
    
    # Keluar dari sub-map jika start di sub-map tapi target di luar.
    curr_node = start_node
    curr_floor = start_floor
    
    if curr_floor.startswith("submap_") and target_floor != curr_floor:
        parent_id = curr_floor.replace("submap_", "")
        parent_room = RUANGAN_GRID.get(parent_id)
        pintu_masuk = get_pintu_masuk(curr_floor)
        
        if not parent_room or not pintu_masuk:
            msg = "Sub-Map awal tidak memiliki Pintu Masuk atau Induk yang valid." if language == "id" else "Starting Sub-Map does not have a valid Entrance or Parent room."
            return {"status": "error", "pesan": msg}
            
        jalur = _a_star_single_floor(curr_node, pintu_masuk)
        if not jalur:
            msg = "Rute buntu menuju pintu keluar sub-map." if language == "id" else "Dead end route to sub-map exit."
            return {"status": "error", "pesan": msg}
        phases.extend(jalur)
        
        curr_node = parent_room
        curr_floor = parent_room.get("floor", "Lantai 1")
        
    # Tentukan target antara (apakah target di sub-map?).
    target_parent_room = None
    target_pintu_masuk = None
    actual_target_building = target_node.get("building", "Gedung Utama")
    actual_target_floor = target_floor
    
    if target_floor.startswith("submap_") and curr_floor != target_floor:
        parent_id = target_floor.replace("submap_", "")
        target_parent_room = RUANGAN_GRID.get(parent_id)
        target_pintu_masuk = get_pintu_masuk(target_floor)
        
        if not target_parent_room or not target_pintu_masuk:
            msg = "Sub-Map tujuan tidak memiliki Pintu Masuk atau Induk yang valid." if language == "id" else "Destination Sub-Map does not have a valid Entrance or Parent room."
            return {"status": "error", "pesan": msg}
        actual_target_floor = target_parent_room.get("floor", "Lantai 1")
        actual_target_building = target_parent_room.get("building", "Gedung Utama")

    # Helper untuk jalan dalam satu gedung
    def _jalan_dalam_gedung(start_n, target_n, s_floor, t_floor, b_name):
        res = []
        c_node = start_n
        c_floor = s_floor
        if c_floor != t_floor:
            lift_s, lift_t = cari_pasangan_lift_terbaik(c_node, target_n, c_floor, t_floor, b_name)
            if not lift_s or not lift_t:
                return None, f"Tidak ditemukan Lift antar lantai di {b_name}."
            jalur_l = _a_star_single_floor(c_node, lift_s)
            if not jalur_l: return None, f"Rute buntu menuju lift di {b_name}."
            res.extend(jalur_l)
            c_node = lift_t
            c_floor = t_floor
        
        jalur_w = _a_star_single_floor(c_node, target_n)
        if not jalur_w: return None, f"Rute buntu menuju tujuan di {b_name}."
        res.extend(jalur_w)
        return res, None

    curr_building = curr_node.get("building", "Gedung Utama")
    temp_target = target_parent_room if target_parent_room else target_node

    if curr_building != actual_target_building:
        building_path = _cari_rute_antar_gedung(curr_building, actual_target_building)
        if not building_path:
            return {"status": "error", "pesan": "Tidak ada rute antar gedung yang tersedia." if language == "id" else "No building route available."}
            
        for step in building_path:
            b_from, door_s, b_to, door_t = step
            if not door_s or not door_t:
                return {"status": "error", "pesan": f"Pintu dari {b_from} menuju {b_to} tidak ditemukan." if language == "id" else f"Door from {b_from} to {b_to} not found."}
                
            r1, err1 = _jalan_dalam_gedung(curr_node, door_s, curr_floor, door_s.get("floor", "Lantai 1"), curr_building)
            if err1: return {"status": "error", "pesan": err1}
            phases.extend(r1)
            
            curr_node = door_t
            curr_floor = door_t.get("floor", "Lantai 1")
            curr_building = b_to
        
    r2, err2 = _jalan_dalam_gedung(curr_node, temp_target, curr_floor, actual_target_floor, curr_building)
    if err2: return {"status": "error", "pesan": err2}
    phases.extend(r2)
    
    # Masuk ke sub-map tujuan (jika ada).
    if target_parent_room:
        jalur_3 = _a_star_single_floor(target_pintu_masuk, target_node)
        if not jalur_3:
            msg = "Rute buntu di dalam sub-map tujuan." if language == "id" else "Dead end route inside destination sub-map."
            return {"status": "error", "pesan": msg}
        phases.extend(jalur_3)
        
    nav_text = generate_navigation_text(phases, start_id, target_id, language, target_name_override=target_name_override)
    return {
        "status": "success",
        "jalur_grid": phases,
        "teks_navigasi": nav_text
    }

def get_room_display_name(room_obj, language="id"):
    if not room_obj:
        return ""
        
    if room_obj.get("is_connector") and room_obj.get("target_building"):
        target_bld = room_obj.get("target_building")
        return f"Pintu menuju {target_bld}" if language == "id" else f"Door to {target_bld}"
        
    name = room_obj.get("name", "Ruangan")
    if language == "id":
        return name
        
    name_en = room_obj.get("name_en")
    if name_en:
        return name_en
        
    return name

def get_nearest_landmark(x, y, floor, exclude_ids=None, building=None, direction=None):
    """Cari ruangan terdekat sebagai patokan navigasi.
    
    Args:
        x, y: Koordinat titik belok.
        floor: Lantai saat ini.
        exclude_ids: Set ID ruangan yang dikecualikan (asal & tujuan).
        building: Gedung saat ini — mencegah pencocokan lintas gedung.
        direction: Arah berjalan saat ini ('Atas'/'Bawah'/'Kanan'/'Kiri')
                   untuk memprioritaskan ruangan di samping jalur.
    """
    if exclude_ids is None:
        exclude_ids = set()
    
    closest_room = None
    best_score = float('inf')
    closest_room_center_dist = float('inf')
    
    for r_id, room in RUANGAN_GRID.items():
        if r_id in exclude_ids:
            continue
            
        if room.get("floor", "Lantai 1") != floor:
            continue
        
        if building and room.get("building", "Gedung Utama") != building:
            continue
        
        if room.get("type", "room") == "kiosk" or room.get("is_connector"):
            continue
            
        name = room.get("name", "")
        if not name or name.lower() == "tanpa nama" or "jalan" in name.lower() or "lorong" in name.lower() or name.lower() == "pintu masuk":
            continue

        rx = room["x"]
        ry = room["y"]
        rw = room.get("w", 1)
        rh = room.get("h", 1)
        
        dx = max(rx - x, 0, x - (rx + rw - 1))
        dy = max(ry - y, 0, y - (ry + rh - 1))
        dist = dx + dy
        
        if dist > 2:
            continue
        
        score = dist
        
        # Jika arah berjalan diketahui, prioritaskan ruangan di SAMPING jalur
        # (tegak lurus) daripada yang di depan/belakang (sepanjang sumbu jalan)
        if direction and dist > 0:
            if direction in ('Atas', 'Bawah'):
                is_to_side = dx > 0
            else:
                is_to_side = dy > 0
            
            if not is_to_side:
                score += 3  # Penalti untuk ruangan di depan/belakang pejalan
        
        cx = rx + rw / 2
        cy = ry + rh / 2
        center_dist = abs(cx - x) + abs(cy - y)
        
        if score < best_score or (score == best_score and closest_room and center_dist < closest_room_center_dist):
            best_score = score
            closest_room = room
            closest_room_center_dist = center_dist
    
    return closest_room

def get_clean_floor_name(floor_str, language="en"):
    if floor_str.startswith("submap_"):
        parent_id = floor_str.replace("submap_", "")
        parent_name = RUANGAN_GRID.get(parent_id, {}).get("name", "Ruangan Induk")
        if language == "id": return parent_name
        return parent_name
    return get_translated_floor(floor_str, language)

def get_translated_floor(floor_str, language="en"):
    if language == "id": return floor_str
    import re
    match = re.search(r'Lantai\s+(\d+)', floor_str, re.IGNORECASE)
    if match:
        num = int(match.group(1))
        ordinals = ["Zero", "First", "Second", "Third", "Fourth", "Fifth", "Sixth", "Seventh", "Eighth", "Ninth", "Tenth", "Eleventh", "Twelfth", "Thirteenth", "Fourteenth", "Fifteenth"]
        if 0 < num < len(ordinals): return f"{ordinals[num]} Floor"
        return f"Floor {num}"
    return floor_str


def generate_navigation_text(path, start_id, target_id, language="id", target_name_override=None):
    if not path:
        return "", []
        
    def get_exit_direction(px, py, flr, bldg):
        best_rm = None
        min_d = float('inf')
        for r in RUANGAN_GRID.values():
            if r.get("floor") == flr and r.get("building", "Gedung A") == bldg:
                rx, ry = r.get("x", 0), r.get("y", 0)
                rw, rh = r.get("w", 1), r.get("h", 1)
                
                # Cek bounding box dengan toleransi 2 tile (karena expanded_start_coords)
                if rx - 2 <= px <= rx + rw + 2 and ry - 2 <= py <= ry + rh + 2:
                    best_rm = r
                    print(f"DEBUG get_exit_direction: Found {r.get('name')} by bounds. px={px}, py={py}, rx={rx}, ry={ry}, rw={rw}, rh={rh}")
                    break
                
                # Fallback ke jarak terdekat
                dist = abs(px - (rx + rw//2)) + abs(py - (ry + rh//2))
                if dist < min_d:
                    min_d = dist
                    best_rm = r
        if best_rm and best_rm.get("endpoints"):
            ep = best_rm["endpoints"][0]
            if ep == "top": return "Atas"
            elif ep == "bottom": return "Bawah"
            elif ep == "left": return "Kiri"
            elif ep == "right": return "Kanan"
        
        return "Bawah"

    if len(path) < 2:
        msg = "Anda sudah sampai di tujuan." if language == "id" else "You have reached your destination."
        return [{"teks": msg, "index_akhir": len(path) - 1 if path else 0, "floor": path[0]["floor"] if path else "Lantai 1"}]

    start_room = RUANGAN_GRID.get(start_id, {})
    target_room = RUANGAN_GRID.get(target_id, {})
    
    start_facing = "Bawah"
    if start_room and start_room.get("endpoints"):
        ep = start_room["endpoints"][0]
        if ep == "top": start_facing = "Atas"
        elif ep == "bottom": start_facing = "Bawah"
        elif ep == "left": start_facing = "Kiri"
        elif ep == "right": start_facing = "Kanan"

    start_name = get_room_display_name(start_room, language)
    if not start_name: start_name = "Kiosk"
    
    if target_name_override:
        target_name = target_name_override
    else:
        target_name = get_room_display_name(target_room, language)
        if not target_name: target_name = "Tujuan" if language == "id" else "Destination"
    langkah = []
    current_dir = None
    is_after_transition = False
    last_transition_type = None
    last_vertical_transport = "lift"  # default; updated when a floor transition is detected

    def get_direction(p1, p2):
        if p2["x"] > p1["x"]: return 'Kanan'
        if p2["x"] < p1["x"]: return 'Kiri'
        if p2["y"] > p1["y"]: return 'Bawah'
        if p2["y"] < p1["y"]: return 'Atas'
        return None

    def get_relative_position(current_dir, turn_x, turn_y, room_obj):
        if not room_obj: return None
        rx = room_obj["x"]
        ry = room_obj["y"]
        rw = room_obj.get("w", 1)
        rh = room_obj.get("h", 1)
        
        if current_dir == 'Atas':
            if rx + rw - 1 < turn_x: return "kiri" if language == "id" else "left"
            if rx > turn_x: return "kanan" if language == "id" else "right"
        elif current_dir == 'Bawah':
            if rx + rw - 1 < turn_x: return "kanan" if language == "id" else "right"
            if rx > turn_x: return "kiri" if language == "id" else "left"
        elif current_dir == 'Kanan':
            if ry + rh - 1 < turn_y: return "kiri" if language == "id" else "left"
            if ry > turn_y: return "kanan" if language == "id" else "right"
        elif current_dir == 'Kiri':
            if ry + rh - 1 < turn_y: return "kanan" if language == "id" else "right"
            if ry > turn_y: return "kiri" if language == "id" else "left"
            
        return "dekat" if language == "id" else "near"

    def get_turn(prev_dir, next_dir):
        if prev_dir == next_dir: return None
        turns_id = {
            'Atas': {'Kanan': 'kanan', 'Kiri': 'kiri', 'Bawah': 'berbalik arah'},
            'Bawah': {'Kanan': 'kiri', 'Kiri': 'kanan', 'Atas': 'berbalik arah'},
            'Kanan': {'Atas': 'kiri', 'Bawah': 'kanan', 'Kiri': 'berbalik arah'},
            'Kiri': {'Atas': 'kanan', 'Bawah': 'kiri', 'Kanan': 'berbalik arah'}
        }
        turns_en = {
            'Atas': {'Kanan': 'right', 'Kiri': 'left', 'Bawah': 'turn around'},
            'Bawah': {'Kanan': 'left', 'Kiri': 'right', 'Atas': 'turn around'},
            'Kanan': {'Atas': 'left', 'Bawah': 'right', 'Kiri': 'turn around'},
            'Kiri': {'Atas': 'right', 'Bawah': 'left', 'Kanan': 'turn around'}
        }
        
        turn_map = turns_id if language == "id" else turns_en
        if prev_dir is None or next_dir is None:
            return None
        return turn_map.get(prev_dir, {}).get(next_dir, None)

    exclude_ids = {start_id, target_id}
    transition_node = None

    for i in range(len(path) - 1):
        p1 = path[i]
        p2 = path[i + 1]
        
        # Pindah Gedung!
        if p1.get("building") != p2.get("building"):
            b2 = p2.get("building", "Gedung A")
            is_bridge = False
            for r in RUANGAN_GRID.values():
                if r.get("building") in (p1.get("building"), p2.get("building")):
                    r_name = r.get("name", "").lower()
                    if any(k in r_name for k in ["jembatan", "bridge", "skybridge"]):
                        if hitung_manhattan(p1["x"], p1["y"], r["x"], r["y"]) <= 5 or hitung_manhattan(p2["x"], p2["y"], r["x"], r["y"]) <= 5:
                            is_bridge = True
                            break

            if is_bridge:
                teks_transisi = f"Lewati jembatan penghubung menuju {b2}." if language == "id" else f"Cross the connecting bridge to {b2}."
            else:
                teks_transisi = f"Jalan melalui pintu penghubung menuju {b2}." if language == "id" else f"Go through the connecting door to {b2}."
            langkah.append({
                "teks": teks_transisi,
                "index_akhir": i,
                "floor": p1["floor"],
                "building": p1.get("building", "Gedung A")
            })
            current_dir = None
            is_after_transition = True
            last_transition_type = 'building'
            transition_node = p2
            continue  # Building change supersedes any same-step floor change.
        # Pindah lantai / sub-map — mutually exclusive with building change above.
        elif p1["floor"] != p2["floor"]:
            if p2["floor"].startswith("submap_"):
                parent_id = p2["floor"].replace("submap_", "")
                parent_name = RUANGAN_GRID.get(parent_id, {}).get("name", "Ruangan Induk")
                teks_transisi = f"Masuk ke dalam {parent_name}." if language == "id" else f"Enter {parent_name}."
            elif p1["floor"].startswith("submap_"):
                parent_id = p1["floor"].replace("submap_", "")
                parent_name = RUANGAN_GRID.get(parent_id, {}).get("name", "Ruangan Induk")
                teks_transisi = f"Keluar dari {parent_name}." if language == "id" else f"Exit from {parent_name}."
            else:
                t_floor = get_translated_floor(p2['floor'], language)
                is_escalator = ("eskalator" in p1.get("name", "").lower() or "escalator" in p1.get("name", "").lower() or p1.get("type") == "escalator" or p1.get("facility_type") == "escalator" or
                                "eskalator" in p2.get("name", "").lower() or "escalator" in p2.get("name", "").lower() or p2.get("type") == "escalator" or p2.get("facility_type") == "escalator")
                is_stairs = (("tangga" in p1.get("name", "").lower() or "stairs" in p1.get("name", "").lower() or p1.get("type") == "stairs" or p1.get("facility_type") == "stairs" or
                              "tangga" in p2.get("name", "").lower() or "stairs" in p2.get("name", "").lower() or p2.get("type") == "stairs" or p2.get("facility_type") == "stairs") and not is_escalator)
                if is_escalator:
                    last_vertical_transport = "escalator"
                    teks_transisi = f"Gunakan eskalator untuk menuju ke {p2['floor']}." if language == "id" else f"Take the escalator to go to {t_floor}."
                elif is_stairs:
                    last_vertical_transport = "stairs"
                    teks_transisi = f"Gunakan tangga untuk menuju ke {p2['floor']}." if language == "id" else f"Take the stairs to go to {t_floor}."
                else:
                    last_vertical_transport = "lift"
                    teks_transisi = f"Gunakan lift untuk menuju ke {p2['floor']}." if language == "id" else f"Take the lift to go to {t_floor}."
            langkah.append({
                "teks": teks_transisi,
                "index_akhir": i,
                "floor": p1["floor"],
                "building": p1.get("building", "Gedung A")
            })
            current_dir = None
            is_after_transition = True
            last_transition_type = 'floor'
            transition_node = p2
            continue
            
        dir = get_direction(p1, p2)

        if not current_dir:
            current_dir = dir
        elif current_dir != dir:
            turn = get_turn(current_dir, dir)
            if turn is None:
                current_dir = dir
                continue

            adj_room_obj = get_nearest_landmark(p1["x"], p1["y"], p1["floor"], exclude_ids, building=p1.get("building", "Gedung A"), direction=current_dir)
            adj_room = get_room_display_name(adj_room_obj, language) if adj_room_obj else None
            
            if len(langkah) == 0:
                initial_turn = get_turn(start_facing, current_dir)
                if language == "id":
                    if initial_turn is None:
                        start_prefix = "Dari depan kiosk, jalan lurus"
                    elif initial_turn == 'berbalik arah':
                        start_prefix = "Putar balik dan jalan lurus"
                    else:
                        start_prefix = f"Belok ke {initial_turn} dan jalan lurus"
                else:
                    if initial_turn is None:
                        start_prefix = "From the kiosk, walk straight"
                    elif initial_turn == 'turn around':
                        start_prefix = "Turn around and walk straight"
                    else:
                        start_prefix = f"Turn {initial_turn} and walk straight"

                if adj_room:
                    pos = get_relative_position(current_dir, p1["x"], p1["y"], adj_room_obj)
                    if pos in ("dekat", "near"):
                        teks = f"{start_prefix}, lalu belok {turn} di dekat {adj_room}." if language == "id" else f"{start_prefix}, then turn {turn} near {adj_room}."
                    else:
                        teks = f"{start_prefix}, lalu belok {turn} setelah melewati {adj_room} di sebelah {pos} Anda." if language == "id" else f"{start_prefix}, then turn {turn} after passing {adj_room} on your {pos}."
                else:
                    teks = f"{start_prefix}, lalu belok {turn}." if language == "id" else f"{start_prefix}, then turn {turn}."
            elif is_after_transition and transition_node:
                exit_dir = get_exit_direction(transition_node["x"], transition_node["y"], transition_node["floor"], transition_node.get("building", "Gedung A"))
                turn_relative = get_turn(exit_dir, current_dir)
                
                if turn_relative is None:
                    dir_text = "depan" if language == "id" else "forward"
                else:
                    dir_text = turn_relative

                def get_directional_prefix(intro_id, intro_en, d_text, lang):
                    if d_text in ("depan", "forward"):
                        return f"{intro_id}, jalan lurus ke depan" if lang == "id" else f"{intro_en}, walk straight ahead"
                    elif d_text in ("berbalik arah", "turn around"):
                        return f"{intro_id}, putar balik dan jalan lurus" if lang == "id" else f"{intro_en}, turn around and walk straight"
                    else:
                        return f"{intro_id}, belok {d_text} dan jalan lurus" if lang == "id" else f"{intro_en}, turn {d_text} and walk straight"

                if p1['floor'].startswith("submap_"):
                    prefix = get_directional_prefix("Setelah masuk", "After entering", dir_text, language)
                else:
                    if last_transition_type == 'building':
                        b_name = p1.get('building', 'Gedung A')
                        intro_id = f"Setelah sampai di {b_name}"
                        intro_en = f"After arriving at {b_name}"
                        prefix = get_directional_prefix(intro_id, intro_en, dir_text, language)
                    else:
                        if last_vertical_transport == "escalator":
                            v_type_id = "eskalator"
                            v_type_en = "escalator"
                        elif last_vertical_transport == "stairs":
                            v_type_id = "tangga"
                            v_type_en = "stairs"
                        else:
                            v_type_id = "lift"
                            v_type_en = "lift"
                        flr1 = p1['floor']
                        t_floor1 = get_translated_floor(flr1, language)
                        intro_id = f"Setelah keluar dari {v_type_id} di {flr1}"
                        intro_en = f"After exiting the {v_type_en} on {t_floor1}"
                        prefix = get_directional_prefix(intro_id, intro_en, dir_text, language)
                is_after_transition = False

                if adj_room:
                    pos = get_relative_position(current_dir, p1["x"], p1["y"], adj_room_obj)
                    if pos in ("dekat", "near"):
                        teks = f"{prefix}, lalu belok {turn} di dekat {adj_room}." if language == "id" else f"{prefix}, then turn {turn} near {adj_room}."
                    else:
                        teks = f"{prefix}, lalu belok {turn} setelah melewati {adj_room} di sebelah {pos} Anda." if language == "id" else f"{prefix}, then turn {turn} after passing {adj_room} on your {pos}."
                else:
                    teks = f"{prefix}, lalu belok {turn}." if language == "id" else f"{prefix}, then turn {turn}."
            else:
                if adj_room:
                    pos = get_relative_position(current_dir, p1["x"], p1["y"], adj_room_obj)
                    if pos in ("dekat", "near"):
                        teks = f"Jalan lurus, lalu belok {turn} di dekat {adj_room}." if language == "id" else f"Walk straight, then turn {turn} near {adj_room}."
                    else:
                        teks = f"Jalan lurus, lalu belok {turn} setelah melewati {adj_room} di sebelah {pos} Anda." if language == "id" else f"Walk straight, then turn {turn} after passing {adj_room} on your {pos}."
                else:
                    teks = f"Jalan lurus, lalu belok {turn}." if language == "id" else f"Walk straight, then turn {turn}."
            
            langkah.append({
                "teks": teks,
                "index_akhir": i,
                "floor": p1["floor"],
                "building": p1.get("building", "Gedung A")
            })
            
            current_dir = dir

    if len(langkah) == 0:
        if current_dir is None:
            if language == "id": teks_akhir = f"Anda sudah berada di {target_name}."
            else: teks_akhir = f"You are already at {target_name}."
        else:
            initial_turn = get_turn(start_facing, current_dir)
            if language == "id":
                if initial_turn is None:
                    teks_akhir = f"Jalan lurus ke depan, Anda akan sampai di {target_name}."
                elif initial_turn == 'berbalik arah':
                    teks_akhir = f"Putar balik dan jalan lurus, Anda akan sampai di {target_name}."
                else:
                    teks_akhir = f"Belok {initial_turn} dan jalan lurus, Anda akan sampai di {target_name}."
            else:
                if initial_turn is None:
                    teks_akhir = f"Walk straight ahead, you will arrive at {target_name}."
                elif initial_turn == 'turn around':
                    teks_akhir = f"Turn around and walk straight, you will arrive at {target_name}."
                else:
                    teks_akhir = f"Turn {initial_turn} and walk straight, you will arrive at {target_name}."
    elif is_after_transition:
        if current_dir is None:
            if language == "id": teks_akhir = f"Anda sudah sampai di {target_name}."
            else: teks_akhir = f"You have arrived at {target_name}."
        else:
            exit_dir = get_exit_direction(path[-1]["x"], path[-1]["y"], path[-1]["floor"], path[-1].get("building", "Gedung A"))
            turn_relative = get_turn(exit_dir, current_dir)
            if turn_relative is None:
                dir_text = "depan" if language == "id" else "forward"
            else:
                dir_text = turn_relative
                
            if path[-1]['floor'].startswith("submap_"):
                if language == "id":
                    if dir_text in ("depan", "forward"): teks_akhir = f"Setelah masuk, jalan lurus ke depan menuju {target_name}."
                    elif dir_text in ("berbalik arah", "turn around"): teks_akhir = f"Setelah masuk, putar balik menuju {target_name}."
                    else: teks_akhir = f"Setelah masuk, belok {dir_text} dan jalan lurus menuju {target_name}."
                else:
                    if dir_text in ("depan", "forward"): teks_akhir = f"After entering, walk straight ahead towards {target_name}."
                    else: teks_akhir = f"After entering, turn {dir_text} and walk straight towards {target_name}."
            else:
                if last_transition_type == 'building':
                    b_name = path[-1].get('building', 'Gedung A')
                    if language == "id":
                        if dir_text in ("depan", "forward"): teks_akhir = f"Setelah sampai di {b_name}, jalan lurus ke depan menuju {target_name}."
                        elif dir_text in ("berbalik arah", "turn around"): teks_akhir = f"Setelah sampai di {b_name}, putar balik menuju {target_name}."
                        else: teks_akhir = f"Setelah sampai di {b_name}, belok {dir_text} dan jalan lurus menuju {target_name}."
                    else:
                        if dir_text in ("depan", "forward"): teks_akhir = f"After arriving at {b_name}, walk straight ahead towards {target_name}."
                        else: teks_akhir = f"After arriving at {b_name}, turn {dir_text} and walk straight towards {target_name}."
                else:
                    if last_vertical_transport == "escalator":
                        v_type_id = "eskalator"
                        v_type_en = "escalator"
                    elif last_vertical_transport == "stairs":
                        v_type_id = "tangga"
                        v_type_en = "stairs"
                    else:
                        v_type_id = "lift"
                        v_type_en = "lift"
                    flr_target = path[-1]['floor']
                    t_floor_target = get_translated_floor(flr_target, language)
                    if language == "id":
                        if dir_text in ("depan", "forward"): teks_akhir = f"Setelah keluar dari {v_type_id} di {flr_target}, jalan lurus ke depan menuju {target_name}."
                        elif dir_text in ("berbalik arah", "turn around"): teks_akhir = f"Setelah keluar dari {v_type_id} di {flr_target}, putar balik menuju {target_name}."
                        else: teks_akhir = f"Setelah keluar dari {v_type_id} di {flr_target}, belok {dir_text} dan jalan lurus menuju {target_name}."
                    else:
                        if dir_text in ("depan", "forward"): teks_akhir = f"After exiting the {v_type_en} on {t_floor_target}, walk straight ahead towards {target_name}."
                        else: teks_akhir = f"After exiting the {v_type_en} on {t_floor_target}, turn {dir_text} and walk straight towards {target_name}."
    else:
        target_room_obj = RUANGAN_GRID.get(target_id)
        
        final_dist = 0
        if len(path) > 0:
            last_turn_idx = langkah[-1]["index_akhir"] if len(langkah) > 0 else 0
            final_dist = hitung_manhattan(path[last_turn_idx]["x"], path[last_turn_idx]["y"], path[-1]["x"], path[-1]["y"])
            
        if target_room_obj:
            pos = get_relative_position(current_dir, path[-1]["x"], path[-1]["y"], target_room_obj)
            if pos == "dekat" or pos == "near":
                pos = "depan" if language == "id" else "front of"
                
            if pos == "depan" or pos == "front of":
                if final_dist > 2:
                    if language == "id": teks_akhir = f"Terus lurus, {target_name} ada tepat di depan Anda."
                    else: teks_akhir = f"Walk straight, {target_name} is right in front of you."
                else:
                    if language == "id": teks_akhir = f"{target_name} ada tepat di depan Anda."
                    else: teks_akhir = f"{target_name} is right in front of you."
            else:
                if final_dist > 2:
                    if language == "id": teks_akhir = f"Terus lurus, {target_name} berada di sebelah {pos} Anda."
                    else: teks_akhir = f"Walk straight, {target_name} will be on your {pos}."
                else:
                    if language == "id": teks_akhir = f"{target_name} berada di sebelah {pos} Anda."
                    else: teks_akhir = f"{target_name} is on your {pos}."
        else:
            if final_dist > 2:
                teks_akhir = f"Terus lurus, {target_name} ada di depan Anda." if language == "id" else f"Walk straight, {target_name} is in front of you."
            else:
                teks_akhir = f"{target_name} ada di depan Anda." if language == "id" else f"{target_name} is in front of you."

    langkah.append({
        "teks": teks_akhir,
        "index_akhir": len(path) - 1,
        "floor": path[-1]["floor"],
        "building": path[-1].get("building", "Gedung A")
    })

    return langkah