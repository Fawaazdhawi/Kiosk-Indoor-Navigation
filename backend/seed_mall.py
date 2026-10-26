import os
import sys
from dotenv import load_dotenv

# Tambahkan backend ke sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

load_dotenv()

from loguru import logger
from app.core.database import SessionLocal, init_db
from app.models.mall import Floor, Tenant, Facility, Kiosk

def get_galaxy_mall_dataset():
    floors = []
    tenants = []
    facilities = []
    kiosks = []

    buildings = ["Galaxy Mall 1", "Galaxy Mall 2", "Galaxy Mall 3"]
    floor_names = ["Ground Floor", "Lantai 1", "Lantai 2", "Lantai 3"]
    floor_levels = [1, 2, 3, 4]

    for b in buildings:
        for idx, fl in enumerate(floor_names):
            b_code = "GM1" if "1" in b else ("GM2" if "2" in b else "GM3")
            fl_code = ["GF", "L1", "L2", "L3"][idx]
            floors.append(Floor(
                id=f"FL_{b_code}_{fl_code}",
                building=b,
                name=fl,
                floor_level=floor_levels[idx],
                grid_width=72,
                grid_height=48
            ))

    # =========================================================================
    # GALAXY MALL 1 (South-West Wing)
    # =========================================================================
    # GF
    tenants.extend([
        Tenant(id="GM1_ZARA_GF", name="Zara Flagship Store", name_en="Zara Flagship", category="Fashion", sub_category="Apparel", unit_number="GM1-GF-01", building="Galaxy Mall 1", floor="Ground Floor", grid_x=3, grid_y=14, grid_width=10, grid_height=18, endpoints=["right"], keywords=["zara", "baju", "fashion", "dress", "kemeja", "celana"]),
        Tenant(id="GM1_PULLBEAR_GF", name="Pull & Bear", name_en="Pull & Bear", category="Fashion", sub_category="Casual Apparel", unit_number="GM1-GF-02", building="Galaxy Mall 1", floor="Ground Floor", grid_x=16, grid_y=3, grid_width=11, grid_height=8, endpoints=["bottom"], keywords=["pull&bear", "pull and bear", "kaos", "hoodie", "jeans"]),
        Tenant(id="GM1_STRADIVARIUS_GF", name="Stradivarius", name_en="Stradivarius", category="Fashion", sub_category="Womenswear", unit_number="GM1-GF-03", building="Galaxy Mall 1", floor="Ground Floor", grid_x=29, grid_y=3, grid_width=11, grid_height=8, endpoints=["bottom"], keywords=["stradivarius", "baju wanita", "dress", "rok"]),
        Tenant(id="GM1_BERSHKA_GF", name="Bershka", name_en="Bershka", category="Fashion", sub_category="Youth Apparel", unit_number="GM1-GF-04", building="Galaxy Mall 1", floor="Ground Floor", grid_x=42, grid_y=3, grid_width=11, grid_height=8, endpoints=["bottom"], keywords=["bershka", "baju gaul", "jaket", "denim"]),
        Tenant(id="GM1_SEPHORA_GF", name="Sephora Beauty", name_en="Sephora Beauty Store", category="Beauty & Health", sub_category="Cosmetics", unit_number="GM1-GF-05", building="Galaxy Mall 1", floor="Ground Floor", grid_x=16, grid_y=36, grid_width=11, grid_height=8, endpoints=["top"], keywords=["sephora", "makeup", "parfum", "skincare", "lipstik"]),
        Tenant(id="GM1_STARBUCKS_GF", name="Starbucks Reserve GM 1", name_en="Starbucks Reserve GM 1", category="F&B", sub_category="Coffee & Bakery", unit_number="GM1-GF-06", building="Galaxy Mall 1", floor="Ground Floor", grid_x=29, grid_y=36, grid_width=11, grid_height=8, endpoints=["top"], keywords=["starbucks", "kopi", "cafe", "coffee", "minum", "haus", "latte"]),
        Tenant(id="GM1_IBOX_GF", name="iBox Apple Reseller", name_en="iBox Apple Store", category="Gadget", sub_category="Electronics", unit_number="GM1-GF-07", building="Galaxy Mall 1", floor="Ground Floor", grid_x=42, grid_y=36, grid_width=11, grid_height=8, endpoints=["top"], keywords=["ibox", "apple", "iphone", "macbook", "ipad", "gadget", "hp"])
    ])
    facilities.extend([
        Facility(id="CONCOURSE_GM1_TO_GM2_GF", name="Koridor ke Galaxy Mall 2", name_en="Concourse to Galaxy Mall 2", facility_type="connector", building="Galaxy Mall 1", floor="Ground Floor", grid_x=58, grid_y=18, grid_width=11, grid_height=10, endpoints=["left"], is_connector=True, connector_group="CONCOURSE_GM1_GM2_GF", keywords=["gm 2", "galaxy mall 2", "penghubung"]),
        Facility(id="LIFT_GM1_GF", name="Lift Utama Galaxy Mall 1", name_en="Main Elevator GM 1", facility_type="elevator", building="Galaxy Mall 1", floor="Ground Floor", grid_x=26, grid_y=20, grid_width=4, grid_height=4, endpoints=["bottom"], is_connector=True, connector_group="LIFT_GM1", keywords=["lift", "elevator", "naik lantai"]),
        Facility(id="TOILET_GM1_GF", name="Toilet Galaxy Mall 1 (GF)", name_en="Restroom GM 1 (GF)", facility_type="toilet", building="Galaxy Mall 1", floor="Ground Floor", grid_x=34, grid_y=20, grid_width=4, grid_height=4, endpoints=["bottom"], keywords=["toilet", "wc", "kamar mandi", "restroom"])
    ])
    kiosks.append(Kiosk(id="KIOSK_GM1_GF", name="Kiosk Direktori Galaxy Mall 1 - Ground Floor", building="Galaxy Mall 1", floor="Ground Floor", grid_x=30, grid_y=28, grid_width=2, grid_height=2, endpoints=["top"]))

    # L1
    tenants.extend([
        Tenant(id="GM1_UNIQLO_L1", name="Uniqlo Lifewear GM 1", name_en="Uniqlo Lifewear GM 1", category="Fashion", sub_category="Casual Apparel", unit_number="GM1-L1-01", building="Galaxy Mall 1", floor="Lantai 1", grid_x=3, grid_y=14, grid_width=10, grid_height=18, endpoints=["right"], keywords=["uniqlo", "kaos", "celana", "airism", "heattech", "jaket"]),
        Tenant(id="GM1_COTTONON_L1", name="Cotton On", name_en="Cotton On", category="Fashion", sub_category="Apparel", unit_number="GM1-L1-02", building="Galaxy Mall 1", floor="Lantai 1", grid_x=16, grid_y=3, grid_width=11, grid_height=8, endpoints=["bottom"], keywords=["cotton on", "baju", "kaos", "fashion"]),
        Tenant(id="GM1_WATSONS_L1", name="Watsons Health & Beauty", name_en="Watsons Pharmacy", category="Beauty & Health", sub_category="Personal Care", unit_number="GM1-L1-03", building="Galaxy Mall 1", floor="Lantai 1", grid_x=29, grid_y=3, grid_width=11, grid_height=8, endpoints=["bottom"], keywords=["watsons", "obat", "vitamin", "skincare", "apotek"]),
        Tenant(id="GM1_GRAMEDIA_L1", name="Gramedia Bookstore", name_en="Gramedia Bookstore", category="Books & Stationery", sub_category="Books", unit_number="GM1-L1-04", building="Galaxy Mall 1", floor="Lantai 1", grid_x=42, grid_y=3, grid_width=13, grid_height=8, endpoints=["bottom"], keywords=["gramedia", "buku", "novel", "komik", "alat tulis", "stationery"]),
        Tenant(id="GM1_GUARDIAN_L1", name="Guardian Pharmacy", name_en="Guardian Pharmacy", category="Beauty & Health", sub_category="Pharmacy", unit_number="GM1-L1-05", building="Galaxy Mall 1", floor="Lantai 1", grid_x=16, grid_y=36, grid_width=11, grid_height=8, endpoints=["top"], keywords=["guardian", "obat", "apotek", "vitamin", "kesehatan"]),
        Tenant(id="GM1_EXCELSO_L1", name="Excelso Coffee", name_en="Excelso Coffee", category="F&B", sub_category="Cafe & Coffee", unit_number="GM1-L1-06", building="Galaxy Mall 1", floor="Lantai 1", grid_x=29, grid_y=36, grid_width=11, grid_height=8, endpoints=["top"], keywords=["excelso", "kopi", "cafe", "nongkrong", "minum", "haus"])
    ])
    facilities.extend([
        Facility(id="CONCOURSE_GM1_TO_GM2_L1", name="Koridor ke Galaxy Mall 2", name_en="Concourse to Galaxy Mall 2", facility_type="connector", building="Galaxy Mall 1", floor="Lantai 1", grid_x=58, grid_y=18, grid_width=11, grid_height=10, endpoints=["left"], is_connector=True, connector_group="CONCOURSE_GM1_GM2_L1", keywords=["gm 2", "galaxy mall 2"]),
        Facility(id="LIFT_GM1_L1", name="Lift Utama Galaxy Mall 1", name_en="Main Elevator GM 1", facility_type="elevator", building="Galaxy Mall 1", floor="Lantai 1", grid_x=26, grid_y=20, grid_width=4, grid_height=4, endpoints=["bottom"], is_connector=True, connector_group="LIFT_GM1", keywords=["lift", "elevator"]),
        Facility(id="TOILET_GM1_L1", name="Toilet Galaxy Mall 1 (L1)", name_en="Restroom GM 1 (L1)", facility_type="toilet", building="Galaxy Mall 1", floor="Lantai 1", grid_x=34, grid_y=20, grid_width=4, grid_height=4, endpoints=["bottom"], keywords=["toilet", "wc", "kamar mandi"]),
        Facility(id="MUSHOLLA_GM1_L1", name="Musholla Eksekutif Galaxy Mall 1", name_en="Executive Prayer Room GM 1", facility_type="musholla", building="Galaxy Mall 1", floor="Lantai 1", grid_x=42, grid_y=20, grid_width=4, grid_height=4, endpoints=["bottom"], keywords=["musholla", "sholat", "ibadah"])
    ])
    kiosks.append(Kiosk(id="KIOSK_GM1_L1", name="Kiosk Direktori Galaxy Mall 1 - Lantai 1", building="Galaxy Mall 1", floor="Lantai 1", grid_x=30, grid_y=28, grid_width=2, grid_height=2, endpoints=["top"]))

    # L2
    tenants.extend([
        Tenant(id="GM1_MARUGAME_L2", name="Marugame Udon", name_en="Marugame Udon", category="F&B", sub_category="Japanese Restaurant", unit_number="GM1-L2-01", building="Galaxy Mall 1", floor="Lantai 2", grid_x=3, grid_y=12, grid_width=10, grid_height=10, endpoints=["right"], keywords=["marugame", "udon", "tempura", "mie jepang", "lapar", "makan siang", "kuliner", "kenyang"]),
        Tenant(id="GM1_SUSHITEI_L2", name="Sushi Tei", name_en="Sushi Tei Restaurant", category="F&B", sub_category="Japanese Dining", unit_number="GM1-L2-02", building="Galaxy Mall 1", floor="Lantai 2", grid_x=3, grid_y=24, grid_width=10, grid_height=10, endpoints=["right"], keywords=["sushi", "sushi tei", "salmon", "sashimi", "ramen", "lapar", "makan malam"]),
        Tenant(id="GM1_SHABURI_L2", name="Shaburi & Kintan Buffet", name_en="Shaburi & Kintan Buffet", category="F&B", sub_category="All You Can Eat", unit_number="GM1-L2-03", building="Galaxy Mall 1", floor="Lantai 2", grid_x=16, grid_y=3, grid_width=12, grid_height=8, endpoints=["bottom"], keywords=["shaburi", "kintan", "ayce", "shabu shabu", "daging", "makan", "lapar"]),
        Tenant(id="GM1_PEPPER_L2", name="Pepper Lunch", name_en="Pepper Lunch", category="F&B", sub_category="Hotplate Dining", unit_number="GM1-L2-04", building="Galaxy Mall 1", floor="Lantai 2", grid_x=30, grid_y=3, grid_width=11, grid_height=8, endpoints=["bottom"], keywords=["pepper lunch", "beef pepper rice", "hotplate", "makan", "lapar"]),
        Tenant(id="GM1_FUNWORLD_L2", name="Funworld Arcade", name_en="Funworld Game Center", category="Entertainment", sub_category="Arcade", unit_number="GM1-L2-05", building="Galaxy Mall 1", floor="Lantai 2", grid_x=43, grid_y=3, grid_width=12, grid_height=8, endpoints=["bottom"], keywords=["funworld", "game", "main", "arcade", "anak-anak", "mesin capit"]),
        Tenant(id="GM1_BAKMI_L2", name="Bakmi GM", name_en="Bakmi GM", category="F&B", sub_category="Noodle & Rice", unit_number="GM1-L2-06", building="Galaxy Mall 1", floor="Lantai 2", grid_x=16, grid_y=36, grid_width=11, grid_height=8, endpoints=["top"], keywords=["bakmi gm", "mie ayam", "pangsit goreng", "makan", "lapar"]),
        Tenant(id="GM1_KOI_L2", name="KOI Thé", name_en="KOI Thé Bubble Tea", category="F&B", sub_category="Beverages", unit_number="GM1-L2-07", building="Galaxy Mall 1", floor="Lantai 2", grid_x=29, grid_y=36, grid_width=11, grid_height=8, endpoints=["top"], keywords=["koi the", "boba", "milk tea", "minum", "haus", "es teh"])
    ])
    facilities.extend([
        Facility(id="CONCOURSE_GM1_TO_GM2_L2", name="Koridor ke Galaxy Mall 2", name_en="Concourse to Galaxy Mall 2", facility_type="connector", building="Galaxy Mall 1", floor="Lantai 2", grid_x=58, grid_y=18, grid_width=11, grid_height=10, endpoints=["left"], is_connector=True, connector_group="CONCOURSE_GM1_GM2_L2", keywords=["gm 2", "galaxy mall 2"]),
        Facility(id="LIFT_GM1_L2", name="Lift Utama Galaxy Mall 1", name_en="Main Elevator GM 1", facility_type="elevator", building="Galaxy Mall 1", floor="Lantai 2", grid_x=26, grid_y=20, grid_width=4, grid_height=4, endpoints=["bottom"], is_connector=True, connector_group="LIFT_GM1", keywords=["lift", "elevator"]),
        Facility(id="TOILET_GM1_L2", name="Toilet Galaxy Mall 1 (L2)", name_en="Restroom GM 1 (L2)", facility_type="toilet", building="Galaxy Mall 1", floor="Lantai 2", grid_x=34, grid_y=20, grid_width=4, grid_height=4, endpoints=["bottom"], keywords=["toilet", "wc", "kamar mandi"])
    ])
    kiosks.append(Kiosk(id="KIOSK_GM1_L2", name="Kiosk Direktori Galaxy Mall 1 - Lantai 2", building="Galaxy Mall 1", floor="Lantai 2", grid_x=30, grid_y=28, grid_width=2, grid_height=2, endpoints=["top"]))

    # L3
    tenants.extend([
        Tenant(id="GM1_XXI_L3", name="Cinema XXI Galaxy Mall", name_en="Galaxy XXI Cinema", category="Entertainment", sub_category="Movie Theater", unit_number="GM1-L3-01", building="Galaxy Mall 1", floor="Lantai 3", grid_x=3, grid_y=12, grid_width=11, grid_height=22, endpoints=["right"], keywords=["xxi", "bioskop", "cinema", "nonton", "film", "movie", "popcorn"]),
        Tenant(id="GM1_PREMIERE_L3", name="The Premiere XXI", name_en="The Premiere Cinema XXI", category="Entertainment", sub_category="Luxury Cinema", unit_number="GM1-L3-02", building="Galaxy Mall 1", floor="Lantai 3", grid_x=17, grid_y=3, grid_width=12, grid_height=8, endpoints=["bottom"], keywords=["premiere", "xxi vip", "bioskop mewah", "kursi sofa", "film"]),
        Tenant(id="GM1_XXICAFE_L3", name="XXI Cafe & Refreshments", name_en="XXI Cafe", category="F&B", sub_category="Cinema Snacks", unit_number="GM1-L3-03", building="Galaxy Mall 1", floor="Lantai 3", grid_x=31, grid_y=3, grid_width=11, grid_height=8, endpoints=["bottom"], keywords=["popcorn", "xxi cafe", "coca cola", "snack bioskop"]),
        Tenant(id="GM1_DCOST_L3", name="D'Cost Seafood", name_en="D'Cost Seafood Restaurant", category="F&B", sub_category="Seafood", unit_number="GM1-L3-04", building="Galaxy Mall 1", floor="Lantai 3", grid_x=17, grid_y=36, grid_width=12, grid_height=8, endpoints=["top"], keywords=["dcost", "seafood", "ikan bakar", "udang", "kepiting", "makan", "lapar"]),
        Tenant(id="GM1_SOLARIA_L3", name="Solaria Family Restaurant", name_en="Solaria Restaurant", category="F&B", sub_category="Family Dining", unit_number="GM1-L3-05", building="Galaxy Mall 1", floor="Lantai 3", grid_x=31, grid_y=36, grid_width=12, grid_height=8, endpoints=["top"], keywords=["solaria", "nasi goreng", "mie ayam", "bihun", "makan", "lapar"])
    ])
    facilities.extend([
        Facility(id="CONCOURSE_GM1_TO_GM2_L3", name="Koridor ke Galaxy Mall 2", name_en="Concourse to Galaxy Mall 2", facility_type="connector", building="Galaxy Mall 1", floor="Lantai 3", grid_x=58, grid_y=18, grid_width=11, grid_height=10, endpoints=["left"], is_connector=True, connector_group="CONCOURSE_GM1_GM2_L3", keywords=["gm 2", "galaxy mall 2"]),
        Facility(id="LIFT_GM1_L3", name="Lift Utama Galaxy Mall 1", name_en="Main Elevator GM 1", facility_type="elevator", building="Galaxy Mall 1", floor="Lantai 3", grid_x=26, grid_y=20, grid_width=4, grid_height=4, endpoints=["bottom"], is_connector=True, connector_group="LIFT_GM1", keywords=["lift", "elevator"]),
        Facility(id="TOILET_GM1_L3", name="Toilet Galaxy Mall 1 (L3)", name_en="Restroom GM 1 (L3)", facility_type="toilet", building="Galaxy Mall 1", floor="Lantai 3", grid_x=34, grid_y=20, grid_width=4, grid_height=4, endpoints=["bottom"], keywords=["toilet", "wc", "kamar mandi"])
    ])
    kiosks.append(Kiosk(id="KIOSK_GM1_L3", name="Kiosk Direktori Galaxy Mall 1 - Lantai 3", building="Galaxy Mall 1", floor="Lantai 3", grid_x=30, grid_y=28, grid_width=2, grid_height=2, endpoints=["top"]))

    # =========================================================================
    # GALAXY MALL 2 (Center Wing)
    # =========================================================================
    # GF
    tenants.extend([
        Tenant(id="GM2_SOGO_GF", name="SOGO Department Store (GF)", name_en="SOGO Department Store GF", category="Department Store", sub_category="Beauty & Fragrance", unit_number="GM2-GF-01", building="Galaxy Mall 2", floor="Ground Floor", grid_x=58, grid_y=12, grid_width=11, grid_height=22, endpoints=["left"], keywords=["sogo", "department store", "parfum", "kosmetik", "belanja"]),
        Tenant(id="GM2_CHARLES_GF", name="Charles & Keith", name_en="Charles & Keith", category="Fashion", sub_category="Shoes & Bags", unit_number="GM2-GF-02", building="Galaxy Mall 2", floor="Ground Floor", grid_x=16, grid_y=3, grid_width=11, grid_height=8, endpoints=["bottom"], keywords=["charles & keith", "tas", "sepatu", "dompet"]),
        Tenant(id="GM2_PEDRO_GF", name="Pedro Shoes", name_en="Pedro Shoes", category="Fashion", sub_category="Footwear", unit_number="GM2-GF-03", building="Galaxy Mall 2", floor="Ground Floor", grid_x=45, grid_y=3, grid_width=11, grid_height=8, endpoints=["bottom"], keywords=["pedro", "sepatu pria", "pantofel", "tas kulit"]),
        Tenant(id="GM2_LACOSTE_GF", name="Lacoste", name_en="Lacoste", category="Fashion", sub_category="Apparel", unit_number="GM2-GF-04", building="Galaxy Mall 2", floor="Ground Floor", grid_x=16, grid_y=36, grid_width=11, grid_height=8, endpoints=["top"], keywords=["lacoste", "polo shirt", "kaos polo", "baju"]),
        Tenant(id="GM2_TOMMY_GF", name="Tommy Hilfiger", name_en="Tommy Hilfiger", category="Fashion", sub_category="Premium Casual", unit_number="GM2-GF-05", building="Galaxy Mall 2", floor="Ground Floor", grid_x=29, grid_y=36, grid_width=11, grid_height=8, endpoints=["top"], keywords=["tommy hilfiger", "baju", "jaket", "kemeja"]),
        Tenant(id="GM2_JCO_GF", name="J.CO Donuts & Coffee", name_en="J.CO Donuts & Coffee", category="F&B", sub_category="Bakery & Cafe", unit_number="GM2-GF-06", building="Galaxy Mall 2", floor="Ground Floor", grid_x=42, grid_y=36, grid_width=11, grid_height=8, endpoints=["top"], keywords=["jco", "donat", "kopi", "jcool", "minum", "haus", "manis"])
    ])
    facilities.extend([
        Facility(id="CONCOURSE_GM2_TO_GM1_GF", name="Koridor ke Galaxy Mall 1", name_en="Concourse to Galaxy Mall 1", facility_type="connector", building="Galaxy Mall 2", floor="Ground Floor", grid_x=3, grid_y=18, grid_width=10, grid_height=10, endpoints=["right"], is_connector=True, connector_group="CONCOURSE_GM1_GM2_GF", keywords=["gm 1", "galaxy mall 1"]),
        Facility(id="ACCESS_GM2_TO_GM3_GF", name="Lobby Penyeberangan ke Galaxy Mall 3", name_en="Pedestrian Crossing to GM 3", facility_type="connector", building="Galaxy Mall 2", floor="Ground Floor", grid_x=28, grid_y=2, grid_width=16, grid_height=6, endpoints=["bottom"], is_connector=True, connector_group="ACCESS_GM2_GM3_GF", keywords=["gm 3", "galaxy mall 3", "seberang"]),
        Facility(id="LIFT_GM2_GF", name="Lift Utama Galaxy Mall 2", name_en="Main Elevator GM 2", facility_type="elevator", building="Galaxy Mall 2", floor="Ground Floor", grid_x=24, grid_y=20, grid_width=4, grid_height=4, endpoints=["bottom"], is_connector=True, connector_group="LIFT_GM2", keywords=["lift", "elevator"]),
        Facility(id="TOILET_GM2_GF", name="Toilet Galaxy Mall 2 (GF)", name_en="Restroom GM 2 (GF)", facility_type="toilet", building="Galaxy Mall 2", floor="Ground Floor", grid_x=32, grid_y=20, grid_width=4, grid_height=4, endpoints=["bottom"], keywords=["toilet", "wc", "kamar mandi"])
    ])
    kiosks.append(Kiosk(id="KIOSK_GM2_GF", name="Kiosk Direktori Galaxy Mall 2 - Ground Floor", building="Galaxy Mall 2", floor="Ground Floor", grid_x=36, grid_y=28, grid_width=2, grid_height=2, endpoints=["top"]))

    # L1
    tenants.extend([
        Tenant(id="GM2_SOGO_L1", name="SOGO Department Store (L1)", name_en="SOGO Fashion L1", category="Department Store", sub_category="Ladies Apparel", unit_number="GM2-L1-01", building="Galaxy Mall 2", floor="Lantai 1", grid_x=58, grid_y=12, grid_width=11, grid_height=22, endpoints=["left"], keywords=["sogo", "baju wanita", "sepatu", "tas"]),
        Tenant(id="GM2_GIORDANO_L1", name="Giordano", name_en="Giordano", category="Fashion", sub_category="Casual Apparel", unit_number="GM2-L1-02", building="Galaxy Mall 2", floor="Lantai 1", grid_x=16, grid_y=3, grid_width=11, grid_height=8, endpoints=["bottom"], keywords=["giordano", "polo", "kaos", "celana"]),
        Tenant(id="GM2_BATIK_L1", name="Batik Keris", name_en="Batik Keris", category="Fashion", sub_category="Traditional Batik", unit_number="GM2-L1-03", building="Galaxy Mall 2", floor="Lantai 1", grid_x=45, grid_y=3, grid_width=11, grid_height=8, endpoints=["bottom"], keywords=["batik", "batik keris", "kemeja batik", "baju pesta"]),
        Tenant(id="GM2_BONIA_L1", name="Bonia Leather", name_en="Bonia Leather", category="Fashion", sub_category="Leather Accessories", unit_number="GM2-L1-04", building="Galaxy Mall 2", floor="Lantai 1", grid_x=16, grid_y=36, grid_width=11, grid_height=8, endpoints=["top"], keywords=["bonia", "tas kulit", "dompet", "koper"]),
        Tenant(id="GM2_CHAGEE_L1", name="Chagee Modern Tea", name_en="Chagee Tea", category="F&B", sub_category="Premium Tea", unit_number="GM2-L1-05", building="Galaxy Mall 2", floor="Lantai 1", grid_x=29, grid_y=36, grid_width=11, grid_height=8, endpoints=["top"], keywords=["chagee", "teh susu", "milk tea", "minum", "haus", "fresh tea"])
    ])
    facilities.extend([
        Facility(id="CONCOURSE_GM2_TO_GM1_L1", name="Koridor ke Galaxy Mall 1", name_en="Concourse to Galaxy Mall 1", facility_type="connector", building="Galaxy Mall 2", floor="Lantai 1", grid_x=3, grid_y=18, grid_width=10, grid_height=10, endpoints=["right"], is_connector=True, connector_group="CONCOURSE_GM1_GM2_L1", keywords=["gm 1", "galaxy mall 1"]),
        Facility(id="SKYBRIDGE_GM2_TO_GM3_L1", name="Skybridge ke Galaxy Mall 3", name_en="Skybridge to Galaxy Mall 3", facility_type="connector", building="Galaxy Mall 2", floor="Lantai 1", grid_x=28, grid_y=2, grid_width=16, grid_height=6, endpoints=["bottom"], is_connector=True, connector_group="SKYBRIDGE_GM2_GM3_L1", keywords=["skybridge", "jembatan gm 3", "penghubung"]),
        Facility(id="LIFT_GM2_L1", name="Lift Utama Galaxy Mall 2", name_en="Main Elevator GM 2", facility_type="elevator", building="Galaxy Mall 2", floor="Lantai 1", grid_x=24, grid_y=20, grid_width=4, grid_height=4, endpoints=["bottom"], is_connector=True, connector_group="LIFT_GM2", keywords=["lift", "elevator"]),
        Facility(id="TOILET_GM2_L1", name="Toilet Galaxy Mall 2 (L1)", name_en="Restroom GM 2 (L1)", facility_type="toilet", building="Galaxy Mall 2", floor="Lantai 1", grid_x=32, grid_y=20, grid_width=4, grid_height=4, endpoints=["bottom"], keywords=["toilet", "wc", "kamar mandi"]),
        Facility(id="MUSHOLLA_GM2_L1", name="Musholla Eksekutif Galaxy Mall 2", name_en="Executive Prayer Room GM 2", facility_type="musholla", building="Galaxy Mall 2", floor="Lantai 1", grid_x=40, grid_y=20, grid_width=4, grid_height=4, endpoints=["bottom"], keywords=["musholla", "sholat", "ibadah"])
    ])
    kiosks.append(Kiosk(id="KIOSK_GM2_L1", name="Kiosk Direktori Galaxy Mall 2 - Lantai 1", building="Galaxy Mall 2", floor="Lantai 1", grid_x=36, grid_y=28, grid_width=2, grid_height=2, endpoints=["top"]))

    # L2
    tenants.extend([
        Tenant(id="GM2_SOGO_L2", name="SOGO Department Store (L2)", name_en="SOGO Mens & Living L2", category="Department Store", sub_category="Menswear & Homeware", unit_number="GM2-L2-01", building="Galaxy Mall 2", floor="Lantai 2", grid_x=58, grid_y=12, grid_width=11, grid_height=22, endpoints=["left"], keywords=["sogo", "pakaian pria", "alat rumah", "koper"]),
        Tenant(id="GM2_ERAFONE_L2", name="Techno Zone - Erafone Megastore", name_en="Erafone Megastore", category="Gadget", sub_category="Smartphones & Gadgets", unit_number="GM2-L2-02", building="Galaxy Mall 2", floor="Lantai 2", grid_x=16, grid_y=3, grid_width=11, grid_height=8, endpoints=["bottom"], keywords=["erafone", "hp", "samsung", "oppo", "vivo", "gadget", "techno zone"]),
        Tenant(id="GM2_XIAOMI_L2", name="Xiaomi Store", name_en="Xiaomi Authorized Store", category="Gadget", sub_category="Smart Electronics", unit_number="GM2-L2-03", building="Galaxy Mall 2", floor="Lantai 2", grid_x=45, grid_y=3, grid_width=11, grid_height=8, endpoints=["bottom"], keywords=["xiaomi", "redmi", "tv", "smartband", "elektronik"]),
        Tenant(id="GM2_KIDZ_L2", name="Kidz Station", name_en="Kidz Station Toys", category="Kids & Toys", sub_category="Toys", unit_number="GM2-L2-04", building="Galaxy Mall 2", floor="Lantai 2", grid_x=16, grid_y=36, grid_width=11, grid_height=8, endpoints=["top"], keywords=["kidz station", "mainan", "lego", "barbie", "anak"]),
        Tenant(id="GM2_TAWAN_L2", name="Ta Wan Restaurant", name_en="Ta Wan Restaurant", category="F&B", sub_category="Chinese Family Dining", unit_number="GM2-L2-05", building="Galaxy Mall 2", floor="Lantai 2", grid_x=29, grid_y=36, grid_width=11, grid_height=8, endpoints=["top"], keywords=["ta wan", "bubur", "chinese food", "kuliner", "makan", "lapar"])
    ])
    facilities.extend([
        Facility(id="CONCOURSE_GM2_TO_GM1_L2", name="Koridor ke Galaxy Mall 1", name_en="Concourse to Galaxy Mall 1", facility_type="connector", building="Galaxy Mall 2", floor="Lantai 2", grid_x=3, grid_y=18, grid_width=10, grid_height=10, endpoints=["right"], is_connector=True, connector_group="CONCOURSE_GM1_GM2_L2", keywords=["gm 1", "galaxy mall 1"]),
        Facility(id="SKYBRIDGE_GM2_TO_GM3_L2", name="Skybridge ke Galaxy Mall 3", name_en="Skybridge to Galaxy Mall 3", facility_type="connector", building="Galaxy Mall 2", floor="Lantai 2", grid_x=28, grid_y=2, grid_width=16, grid_height=6, endpoints=["bottom"], is_connector=True, connector_group="SKYBRIDGE_GM2_GM3_L2", keywords=["skybridge", "jembatan gm 3"]),
        Facility(id="LIFT_GM2_L2", name="Lift Utama Galaxy Mall 2", name_en="Main Elevator GM 2", facility_type="elevator", building="Galaxy Mall 2", floor="Lantai 2", grid_x=24, grid_y=20, grid_width=4, grid_height=4, endpoints=["bottom"], is_connector=True, connector_group="LIFT_GM2", keywords=["lift", "elevator"]),
        Facility(id="TOILET_GM2_L2", name="Toilet Galaxy Mall 2 (L2)", name_en="Restroom GM 2 (L2)", facility_type="toilet", building="Galaxy Mall 2", floor="Lantai 2", grid_x=32, grid_y=20, grid_width=4, grid_height=4, endpoints=["bottom"], keywords=["toilet", "wc", "kamar mandi"])
    ])
    kiosks.append(Kiosk(id="KIOSK_GM2_L2", name="Kiosk Direktori Galaxy Mall 2 - Lantai 2", building="Galaxy Mall 2", floor="Lantai 2", grid_x=36, grid_y=28, grid_width=2, grid_height=2, endpoints=["top"]))

    # L3
    tenants.extend([
        Tenant(id="GM2_FOODGALAXY_L3", name="Food Galaxy (Food Court)", name_en="Food Galaxy Food Court", category="F&B", sub_category="Food Court", unit_number="GM2-L3-01", building="Galaxy Mall 2", floor="Lantai 3", grid_x=58, grid_y=10, grid_width=11, grid_height=24, endpoints=["left"], keywords=["food galaxy", "food court", "pempek", "bakso", "nasi campur", "makan", "lapar", "kuliner"]),
        Tenant(id="GM2_CELEBRITY_L3", name="Celebrity Fitness", name_en="Celebrity Fitness Gym", category="Entertainment", sub_category="Fitness & Gym", unit_number="GM2-L3-02", building="Galaxy Mall 2", floor="Lantai 3", grid_x=16, grid_y=3, grid_width=11, grid_height=8, endpoints=["bottom"], keywords=["celebrity fitness", "gym", "olahraga", "fitnes"]),
        Tenant(id="GM2_AW_L3", name="A&W Restaurants", name_en="A&W Restaurants", category="F&B", sub_category="Fast Food", unit_number="GM2-L3-03", building="Galaxy Mall 2", floor="Lantai 3", grid_x=45, grid_y=3, grid_width=11, grid_height=8, endpoints=["bottom"], keywords=["a&w", "ayam goreng", "root beer", "burger", "makan", "lapar"]),
        Tenant(id="GM2_SHIHLIN_L3", name="Shihlin Taiwan Street Snacks", name_en="Shihlin Taiwan Snacks", category="F&B", sub_category="Snacks", unit_number="GM2-L3-04", building="Galaxy Mall 2", floor="Lantai 3", grid_x=16, grid_y=36, grid_width=11, grid_height=8, endpoints=["top"], keywords=["shihlin", "ayam crispy", "snack", "camilan"]),
        Tenant(id="GM2_CHATIME_L3", name="Chatime Milk Tea", name_en="Chatime Milk Tea", category="F&B", sub_category="Beverages", unit_number="GM2-L3-05", building="Galaxy Mall 2", floor="Lantai 3", grid_x=29, grid_y=36, grid_width=11, grid_height=8, endpoints=["top"], keywords=["chatime", "boba", "milk tea", "minum", "haus", "es teh"])
    ])
    facilities.extend([
        Facility(id="CONCOURSE_GM2_TO_GM1_L3", name="Koridor ke Galaxy Mall 1", name_en="Concourse to Galaxy Mall 1", facility_type="connector", building="Galaxy Mall 2", floor="Lantai 3", grid_x=3, grid_y=18, grid_width=10, grid_height=10, endpoints=["right"], is_connector=True, connector_group="CONCOURSE_GM1_GM2_L3", keywords=["gm 1", "galaxy mall 1"]),
        Facility(id="SKYBRIDGE_GM2_TO_GM3_L3", name="Skybridge ke Galaxy Mall 3", name_en="Skybridge to Galaxy Mall 3", facility_type="connector", building="Galaxy Mall 2", floor="Lantai 3", grid_x=28, grid_y=2, grid_width=16, grid_height=6, endpoints=["bottom"], is_connector=True, connector_group="SKYBRIDGE_GM2_GM3_L3", keywords=["skybridge", "jembatan gm 3"]),
        Facility(id="LIFT_GM2_L3", name="Lift Utama Galaxy Mall 2", name_en="Main Elevator GM 2", facility_type="elevator", building="Galaxy Mall 2", floor="Lantai 3", grid_x=24, grid_y=20, grid_width=4, grid_height=4, endpoints=["bottom"], is_connector=True, connector_group="LIFT_GM2", keywords=["lift", "elevator"]),
        Facility(id="TOILET_GM2_L3", name="Toilet Galaxy Mall 2 (L3)", name_en="Restroom GM 2 (L3)", facility_type="toilet", building="Galaxy Mall 2", floor="Lantai 3", grid_x=32, grid_y=20, grid_width=4, grid_height=4, endpoints=["bottom"], keywords=["toilet", "wc", "kamar mandi"])
    ])
    kiosks.append(Kiosk(id="KIOSK_GM2_L3", name="Kiosk Direktori Galaxy Mall 2 - Lantai 3", building="Galaxy Mall 2", floor="Lantai 3", grid_x=36, grid_y=28, grid_width=2, grid_height=2, endpoints=["top"]))

    # =========================================================================
    # GALAXY MALL 3 (North Expansion Wing across the Skybridge)
    # =========================================================================
    # GF
    tenants.extend([
        Tenant(id="GM3_GOURMET_GF", name="The Gourmet Supermarket", name_en="The Gourmet Supermarket", category="Supermarket", sub_category="Gourmet Grocery", unit_number="GM3-GF-01", building="Galaxy Mall 3", floor="Ground Floor", grid_x=3, grid_y=14, grid_width=11, grid_height=20, endpoints=["right"], keywords=["gourmet", "supermarket", "buah", "sayur", "ranch market", "daging", "impor", "belanja"]),
        Tenant(id="GM3_HNM_GF", name="H&M Flagship", name_en="H&M Flagship Store", category="Fashion", sub_category="Apparel", unit_number="GM3-GF-02", building="Galaxy Mall 3", floor="Ground Floor", grid_x=17, grid_y=3, grid_width=12, grid_height=8, endpoints=["bottom"], keywords=["h&m", "hnm", "baju", "dress", "fashion", "kaos", "celana"]),
        Tenant(id="GM3_BBW_GF", name="Bath & Body Works", name_en="Bath & Body Works", category="Beauty & Health", sub_category="Fragrance & Body", unit_number="GM3-GF-03", building="Galaxy Mall 3", floor="Ground Floor", grid_x=31, grid_y=3, grid_width=11, grid_height=8, endpoints=["bottom"], keywords=["bbw", "bath and body works", "lotion", "parfum", "lilin", "body mist"]),
        Tenant(id="GM3_UNIQLO_GF", name="Uniqlo Lifewear GM 3", name_en="Uniqlo Lifewear GM 3", category="Fashion", sub_category="Casual Apparel", unit_number="GM3-GF-04", building="Galaxy Mall 3", floor="Ground Floor", grid_x=44, grid_y=3, grid_width=12, grid_height=8, endpoints=["bottom"], keywords=["uniqlo", "kaos", "celana", "airism", "heattech", "jaket"]),
        Tenant(id="GM3_VICTORIA_GF", name="Victoria's Secret", name_en="Victoria's Secret", category="Fashion", sub_category="Lingerie & Beauty", unit_number="GM3-GF-05", building="Galaxy Mall 3", floor="Ground Floor", grid_x=58, grid_y=14, grid_width=11, grid_height=9, endpoints=["left"], keywords=["victorias secret", "parfum", "tas", "lingerie", "body mist"]),
        Tenant(id="GM3_FRANKCO_GF", name="Frank & Co. Jewellery", name_en="Frank & Co. Jewellery", category="Jewelry", sub_category="Diamonds & Gold", unit_number="GM3-GF-06", building="Galaxy Mall 3", floor="Ground Floor", grid_x=58, grid_y=25, grid_width=11, grid_height=9, endpoints=["left"], keywords=["frank & co", "perhiasan", "berlian", "emas", "cincin nikah"]),
        Tenant(id="GM3_SOCIOLLA_GF", name="Sociolla Beauty", name_en="Sociolla Cosmetics", category="Beauty & Health", sub_category="Cosmetics & Skincare", unit_number="GM3-GF-07", building="Galaxy Mall 3", floor="Ground Floor", grid_x=16, grid_y=36, grid_width=10, grid_height=8, endpoints=["top"], keywords=["sociolla", "skincare", "makeup", "serum", "kecantikan"]),
        Tenant(id="GM3_STARBUCKS_GF", name="Starbucks Reserve GM 3", name_en="Starbucks Reserve GM 3", category="F&B", sub_category="Coffee Shop", unit_number="GM3-GF-08", building="Galaxy Mall 3", floor="Ground Floor", grid_x=46, grid_y=36, grid_width=10, grid_height=8, endpoints=["top"], keywords=["starbucks", "kopi", "cafe", "coffee", "minum", "haus", "latte"]),
        Tenant(id="GM3_KENANGAN_GF", name="Kopi Kenangan Heritage", name_en="Kopi Kenangan Heritage", category="F&B", sub_category="Coffee", unit_number="GM3-GF-09", building="Galaxy Mall 3", floor="Ground Floor", grid_x=58, grid_y=36, grid_width=11, grid_height=8, endpoints=["left"], keywords=["kopi kenangan", "kopi susu", "minum", "haus", "roti"])
    ])
    facilities.extend([
        Facility(id="ACCESS_GM3_FROM_GM2_GF", name="Lobby Penyeberangan dari Galaxy Mall 2", name_en="Pedestrian Crossing from GM 2", facility_type="connector", building="Galaxy Mall 3", floor="Ground Floor", grid_x=28, grid_y=40, grid_width=16, grid_height=6, endpoints=["top"], is_connector=True, connector_group="ACCESS_GM2_GM3_GF", keywords=["gm 2", "galaxy mall 2", "penyeberangan"]),
        Facility(id="LIFT_GM3_GF", name="Lift Utama Galaxy Mall 3", name_en="Main Elevator GM 3", facility_type="elevator", building="Galaxy Mall 3", floor="Ground Floor", grid_x=24, grid_y=20, grid_width=4, grid_height=4, endpoints=["bottom"], is_connector=True, connector_group="LIFT_GM3", keywords=["lift", "elevator"]),
        Facility(id="TOILET_GM3_GF", name="Toilet Eksekutif Galaxy Mall 3 (GF)", name_en="Executive Restroom GM 3 (GF)", facility_type="toilet", building="Galaxy Mall 3", floor="Ground Floor", grid_x=32, grid_y=20, grid_width=4, grid_height=4, endpoints=["bottom"], keywords=["toilet", "wc", "kamar mandi"])
    ])
    kiosks.append(Kiosk(id="KIOSK_GM3_GF", name="Kiosk Direktori Galaxy Mall 3 - Ground Floor", building="Galaxy Mall 3", floor="Ground Floor", grid_x=36, grid_y=28, grid_width=2, grid_height=2, endpoints=["top"]))

    # L1
    tenants.extend([
        Tenant(id="GM3_PLANETSPORTS_L1", name="Planet Sports Asia", name_en="Planet Sports Asia", category="Sports", sub_category="Sportswear & Equipment", unit_number="GM3-L1-01", building="Galaxy Mall 3", floor="Lantai 1", grid_x=3, grid_y=14, grid_width=11, grid_height=20, endpoints=["right"], keywords=["planet sports", "sepatu lari", "jersey", "raket", "olahraga", "sports"]),
        Tenant(id="GM3_NIKE_L1", name="Nike Store", name_en="Nike Store", category="Sports", sub_category="Athletic Footwear & Apparel", unit_number="GM3-L1-02", building="Galaxy Mall 3", floor="Lantai 1", grid_x=17, grid_y=3, grid_width=12, grid_height=8, endpoints=["bottom"], keywords=["nike", "air jordan", "sepatu nike", "dunk", "sneakers", "baju olahraga"]),
        Tenant(id="GM3_ADIDAS_L1", name="Adidas Originals", name_en="Adidas Originals", category="Sports", sub_category="Originals & Performance", unit_number="GM3-L1-03", building="Galaxy Mall 3", floor="Lantai 1", grid_x=31, grid_y=3, grid_width=11, grid_height=8, endpoints=["bottom"], keywords=["adidas", "samba", "gazelle", "sepatu adidas", "ultraboost"]),
        Tenant(id="GM3_SKECHERS_L1", name="Skechers Footwear", name_en="Skechers", category="Sports", sub_category="Comfort Footwear", unit_number="GM3-L1-04", building="Galaxy Mall 3", floor="Lantai 1", grid_x=44, grid_y=3, grid_width=12, grid_height=8, endpoints=["bottom"], keywords=["skechers", "sepatu santai", "slip on", "sepatu jalan"]),
        Tenant(id="GM3_NEWBALANCE_L1", name="New Balance", name_en="New Balance Store", category="Sports", sub_category="Running & Lifestyle", unit_number="GM3-L1-05", building="Galaxy Mall 3", floor="Lantai 1", grid_x=58, grid_y=14, grid_width=11, grid_height=9, endpoints=["left"], keywords=["new balance", "nb 550", "nb 574", "sepatu lari", "sneakers"]),
        Tenant(id="GM3_PUMA_L1", name="Puma Store", name_en="Puma Sports", category="Sports", sub_category="Sportswear", unit_number="GM3-L1-06", building="Galaxy Mall 3", floor="Lantai 1", grid_x=58, grid_y=25, grid_width=11, grid_height=9, endpoints=["left"], keywords=["puma", "sepatu puma", "baju olahraga", "jaket"]),
        Tenant(id="GM3_EXECUTIVE_L1", name="The Executive", name_en="The Executive", category="Fashion", sub_category="Formal & Workwear", unit_number="GM3-L1-07", building="Galaxy Mall 3", floor="Lantai 1", grid_x=16, grid_y=36, grid_width=10, grid_height=8, endpoints=["top"], keywords=["the executive", "kemeja kerja", "jas", "blazer", "celana bahan"]),
        Tenant(id="GM3_OWL_L1", name="Owl Eyewear", name_en="Owl Eyewear", category="Fashion", sub_category="Optical & Sunglasses", unit_number="GM3-L1-08", building="Galaxy Mall 3", floor="Lantai 1", grid_x=46, grid_y=36, grid_width=10, grid_height=8, endpoints=["top"], keywords=["owl", "kacamata", "frame", "lensa", "optik"]),
        Tenant(id="GM3_PEDRO_L1", name="Pedro Shoes & Bags GM 3", name_en="Pedro GM 3", category="Fashion", sub_category="Footwear", unit_number="GM3-L1-09", building="Galaxy Mall 3", floor="Lantai 1", grid_x=58, grid_y=36, grid_width=11, grid_height=8, endpoints=["left"], keywords=["pedro", "sepatu", "tas", "dompet"])
    ])
    facilities.extend([
        Facility(id="SKYBRIDGE_GM3_FROM_GM2_L1", name="Skybridge ke Galaxy Mall 2", name_en="Skybridge to Galaxy Mall 2", facility_type="connector", building="Galaxy Mall 3", floor="Lantai 1", grid_x=28, grid_y=40, grid_width=16, grid_height=6, endpoints=["top"], is_connector=True, connector_group="SKYBRIDGE_GM2_GM3_L1", keywords=["skybridge", "jembatan gm 2", "penghubung"]),
        Facility(id="LIFT_GM3_L1", name="Lift Utama Galaxy Mall 3", name_en="Main Elevator GM 3", facility_type="elevator", building="Galaxy Mall 3", floor="Lantai 1", grid_x=24, grid_y=20, grid_width=4, grid_height=4, endpoints=["bottom"], is_connector=True, connector_group="LIFT_GM3", keywords=["lift", "elevator"]),
        Facility(id="TOILET_GM3_L1", name="Toilet Eksekutif Galaxy Mall 3 (L1)", name_en="Executive Restroom GM 3 (L1)", facility_type="toilet", building="Galaxy Mall 3", floor="Lantai 1", grid_x=32, grid_y=20, grid_width=4, grid_height=4, endpoints=["bottom"], keywords=["toilet", "wc", "kamar mandi"]),
        Facility(id="MUSHOLLA_GM3_L1", name="Musholla Eksekutif Galaxy Mall 3", name_en="Executive Prayer Room GM 3", facility_type="musholla", building="Galaxy Mall 3", floor="Lantai 1", grid_x=40, grid_y=20, grid_width=4, grid_height=4, endpoints=["bottom"], keywords=["musholla", "sholat", "ibadah"])
    ])
    kiosks.append(Kiosk(id="KIOSK_GM3_L1", name="Kiosk Direktori Galaxy Mall 3 - Lantai 1", building="Galaxy Mall 3", floor="Lantai 1", grid_x=36, grid_y=28, grid_width=2, grid_height=2, endpoints=["top"]))

    # L2
    tenants.extend([
        Tenant(id="GM3_KKV_L2", name="KKV / OH! SOME", name_en="KKV Lifestyle Concept", category="Department Store", sub_category="Lifestyle & Beauty", unit_number="GM3-L2-01", building="Galaxy Mall 3", floor="Lantai 2", grid_x=3, grid_y=14, grid_width=11, grid_height=20, endpoints=["right"], keywords=["kkv", "oh some", "skincare", "mainan", "snack impor", "aksesoris", "estetik"]),
        Tenant(id="GM3_DIGIMAP_L2", name="Digimap Apple Premium Partner", name_en="Digimap Apple Store", category="Gadget", sub_category="Apple Products", unit_number="GM3-L2-02", building="Galaxy Mall 3", floor="Lantai 2", grid_x=17, grid_y=3, grid_width=12, grid_height=8, endpoints=["bottom"], keywords=["digimap", "apple", "iphone", "macbook", "ipad", "airpods", "gadget"]),
        Tenant(id="GM3_SAMSUNG_L2", name="Samsung Experience Store", name_en="Samsung Experience Store", category="Gadget", sub_category="Mobile & Tablet", unit_number="GM3-L2-03", building="Galaxy Mall 3", floor="Lantai 2", grid_x=31, grid_y=3, grid_width=11, grid_height=8, endpoints=["bottom"], keywords=["samsung", "galaxy s24", "galaxy fold", "hp samsung", "tablet"]),
        Tenant(id="GM3_TOYSKINGDOM_L2", name="Toys Kingdom", name_en="Toys Kingdom", category="Kids & Toys", sub_category="Toys & Collectibles", unit_number="GM3-L2-04", building="Galaxy Mall 3", floor="Lantai 2", grid_x=44, grid_y=3, grid_width=12, grid_height=8, endpoints=["bottom"], keywords=["toys kingdom", "mainan anak", "hot wheels", "nerf", "board game"]),
        Tenant(id="GM3_MINISO_L2", name="Miniso Lifestyle", name_en="Miniso Lifestyle", category="Retail", sub_category="Lifestyle Goods", unit_number="GM3-L2-05", building="Galaxy Mall 3", floor="Lantai 2", grid_x=58, grid_y=14, grid_width=11, grid_height=9, endpoints=["left"], keywords=["miniso", "boneka", "earphone", "tas", "aksesoris"]),
        Tenant(id="GM3_MOTHERCARE_L2", name="Mothercare & ELC", name_en="Mothercare & ELC", category="Kids & Baby", sub_category="Baby Care & Toys", unit_number="GM3-L2-06", building="Galaxy Mall 3", floor="Lantai 2", grid_x=58, grid_y=25, grid_width=11, grid_height=9, endpoints=["left"], keywords=["mothercare", "baju bayi", "stroller", "perlengkapan bayi"]),
        Tenant(id="GM3_GENKI_L2", name="Genki Sushi", name_en="Genki Sushi", category="F&B", sub_category="Japanese Sushi Train", unit_number="GM3-L2-07", building="Galaxy Mall 3", floor="Lantai 2", grid_x=16, grid_y=36, grid_width=10, grid_height=8, endpoints=["top"], keywords=["genki sushi", "sushi kereta", "salmon", "kuliner", "makan", "lapar"]),
        Tenant(id="GM3_CROCS_L2", name="Crocs Footwear", name_en="Crocs", category="Fashion", sub_category="Comfort Footwear", unit_number="GM3-L2-08", building="Galaxy Mall 3", floor="Lantai 2", grid_x=46, grid_y=36, grid_width=10, grid_height=8, endpoints=["top"], keywords=["crocs", "sandal", "sepatu karet", "jibbitz"]),
        Tenant(id="GM3_SLEEPCO_L2", name="Sleep & Co.", name_en="Sleep & Co. Bedding", category="Home & Living", sub_category="Mattress & Bedding", unit_number="GM3-L2-09", building="Galaxy Mall 3", floor="Lantai 2", grid_x=58, grid_y=36, grid_width=11, grid_height=8, endpoints=["left"], keywords=["sleep & co", "kasur", "bantal", "king koil", "spring bed"])
    ])
    facilities.extend([
        Facility(id="SKYBRIDGE_GM3_FROM_GM2_L2", name="Skybridge ke Galaxy Mall 2", name_en="Skybridge to Galaxy Mall 2", facility_type="connector", building="Galaxy Mall 3", floor="Lantai 2", grid_x=28, grid_y=40, grid_width=16, grid_height=6, endpoints=["top"], is_connector=True, connector_group="SKYBRIDGE_GM2_GM3_L2", keywords=["skybridge", "jembatan gm 2"]),
        Facility(id="LIFT_GM3_L2", name="Lift Utama Galaxy Mall 3", name_en="Main Elevator GM 3", facility_type="elevator", building="Galaxy Mall 3", floor="Lantai 2", grid_x=24, grid_y=20, grid_width=4, grid_height=4, endpoints=["bottom"], is_connector=True, connector_group="LIFT_GM3", keywords=["lift", "elevator"]),
        Facility(id="TOILET_GM3_L2", name="Toilet Eksekutif Galaxy Mall 3 (L2)", name_en="Executive Restroom GM 3 (L2)", facility_type="toilet", building="Galaxy Mall 3", floor="Lantai 2", grid_x=32, grid_y=20, grid_width=4, grid_height=4, endpoints=["bottom"], keywords=["toilet", "wc", "kamar mandi"])
    ])
    kiosks.append(Kiosk(id="KIOSK_GM3_L2", name="Kiosk Direktori Galaxy Mall 3 - Lantai 2", building="Galaxy Mall 3", floor="Lantai 2", grid_x=36, grid_y=28, grid_width=2, grid_height=2, endpoints=["top"]))

    # L3
    tenants.extend([
        Tenant(id="GM3_BALLROOM_L3", name="Grand Galaxy Ballroom & Exhibition", name_en="Grand Galaxy Ballroom", category="Convention", sub_category="Ballroom & Events", unit_number="GM3-L3-01", building="Galaxy Mall 3", floor="Lantai 3", grid_x=3, grid_y=14, grid_width=11, grid_height=20, endpoints=["right"], keywords=["ballroom", "grand galaxy ballroom", "pameran", "wedding", "expo", "gedung nikah"]),
        Tenant(id="GM3_PLAYTOPIA_L3", name="Playtopia Family Playland", name_en="Playtopia Indoor Playground", category="Entertainment", sub_category="Children Playground", unit_number="GM3-L3-02", building="Galaxy Mall 3", floor="Lantai 3", grid_x=17, grid_y=3, grid_width=12, grid_height=8, endpoints=["bottom"], keywords=["playtopia", "playground", "mandi bola", "anak-anak", "perosotan", "wahana"]),
        Tenant(id="GM3_MAGAL_L3", name="Magal Korean BBQ", name_en="Magal Korean BBQ", category="F&B", sub_category="Korean BBQ Dining", unit_number="GM3-L3-03", building="Galaxy Mall 3", floor="Lantai 3", grid_x=31, grid_y=3, grid_width=11, grid_height=8, endpoints=["bottom"], keywords=["magal", "korean bbq", "daging panggang", "kimchi", "kuliner", "makan", "lapar"]),
        Tenant(id="GM3_GYUKAKU_L3", name="Gyu-Kaku Japanese BBQ", name_en="Gyu-Kaku Japanese BBQ", category="F&B", sub_category="Japanese Yakiniku", unit_number="GM3-L3-04", building="Galaxy Mall 3", floor="Lantai 3", grid_x=44, grid_y=3, grid_width=12, grid_height=8, endpoints=["bottom"], keywords=["gyukaku", "yakiniku", "daging jepang", "buffet", "kuliner", "makan", "lapar"]),
        Tenant(id="GM3_HAIDILAO_L3", name="Haidilao Hotpot", name_en="Haidilao Hot Pot", category="F&B", sub_category="Chinese Hotpot", unit_number="GM3-L3-05", building="Galaxy Mall 3", floor="Lantai 3", grid_x=58, grid_y=14, grid_width=11, grid_height=9, endpoints=["left"], keywords=["haidilao", "hotpot", "kuah mala", "mie ditarik", "makan", "lapar", "kuliner"]),
        Tenant(id="GM3_PARADISE_L3", name="Paradise Dynasty", name_en="Paradise Dynasty", category="F&B", sub_category="Xiao Long Bao & Dimsum", unit_number="GM3-L3-06", building="Galaxy Mall 3", floor="Lantai 3", grid_x=58, grid_y=25, grid_width=11, grid_height=9, endpoints=["left"], keywords=["paradise dynasty", "xiao long bao", "dimsum", "chinesefood", "makan", "lapar"]),
        Tenant(id="GM3_TOBY_L3", name="Toby's Estate Coffee & Brunch", name_en="Toby's Estate", category="F&B", sub_category="Artisan Coffee & Dining", unit_number="GM3-L3-07", building="Galaxy Mall 3", floor="Lantai 3", grid_x=16, grid_y=36, grid_width=10, grid_height=8, endpoints=["top"], keywords=["tobys estate", "brunch", "kopi", "cafe", "nongkrong", "minum", "haus"]),
        Tenant(id="GM3_DAPURSOLO_L3", name="Dapur Solo Nusantara", name_en="Dapur Solo Indonesian Cuisine", category="F&B", sub_category="Traditional Cuisine", unit_number="GM3-L3-08", building="Galaxy Mall 3", floor="Lantai 3", grid_x=46, grid_y=36, grid_width=10, grid_height=8, endpoints=["top"], keywords=["dapur solo", "nasi liwet", "tumpeng", "kuliner indonesia", "makan", "lapar"])
    ])
    facilities.extend([
        Facility(id="SKYBRIDGE_GM3_FROM_GM2_L3", name="Skybridge ke Galaxy Mall 2", name_en="Skybridge to Galaxy Mall 2", facility_type="connector", building="Galaxy Mall 3", floor="Lantai 3", grid_x=28, grid_y=40, grid_width=16, grid_height=6, endpoints=["top"], is_connector=True, connector_group="SKYBRIDGE_GM2_GM3_L3", keywords=["skybridge", "jembatan gm 2"]),
        Facility(id="LIFT_GM3_L3", name="Lift Utama Galaxy Mall 3", name_en="Main Elevator GM 3", facility_type="elevator", building="Galaxy Mall 3", floor="Lantai 3", grid_x=24, grid_y=20, grid_width=4, grid_height=4, endpoints=["bottom"], is_connector=True, connector_group="LIFT_GM3", keywords=["lift", "elevator"]),
        Facility(id="TOILET_GM3_L3", name="Toilet Eksekutif Galaxy Mall 3 (L3)", name_en="Executive Restroom GM 3 (L3)", facility_type="toilet", building="Galaxy Mall 3", floor="Lantai 3", grid_x=32, grid_y=20, grid_width=4, grid_height=4, endpoints=["bottom"], keywords=["toilet", "wc", "kamar mandi"])
    ])
    kiosks.append(Kiosk(id="KIOSK_GM3_L3", name="Kiosk Direktori Galaxy Mall 3 - Lantai 3", building="Galaxy Mall 3", floor="Lantai 3", grid_x=36, grid_y=28, grid_width=2, grid_height=2, endpoints=["top"]))

    return floors, tenants, facilities, kiosks


def seed_mall_data(force=False):
    logger.info("[SEED] Memulai inisialisasi tabel dan data Galaxy Mall (GM 1, 2, 3)...")
    
    # 1. Pastikan tabel dibuat di PostgreSQL
    if not init_db():
        logger.error("[SEED] Gagal inisialisasi database. Cek koneksi PostgreSQL Anda di .env")
        return False

    db = SessionLocal()
    try:
        # Cek apakah data sudah ada
        existing_tenants = db.query(Tenant).count()
        if existing_tenants > 0 and not force:
            logger.info(f"[SEED] Database sudah memiliki {existing_tenants} tenant toko. Gunakan force=True untuk refresh.")
            return True

        # Jika force=True atau tabel kosong, bersihkan data lama
        logger.info("[SEED] Menyiapkan data master Galaxy Mall 1, 2, 3...")
        db.query(Kiosk).delete()
        db.query(Facility).delete()
        db.query(Tenant).delete()
        db.query(Floor).delete()
        db.commit()

        floors_data, tenants_data, facilities_data, kiosks_data = get_galaxy_mall_dataset()

        logger.info(f"[SEED] Menambahkan {len(floors_data)} lantai...")
        db.add_all(floors_data)
        db.commit()

        logger.info(f"[SEED] Menambahkan {len(tenants_data)} tenant toko...")
        db.add_all(tenants_data)
        db.commit()

        logger.info(f"[SEED] Menambahkan {len(facilities_data)} fasilitas & konektor gedung...")
        db.add_all(facilities_data)
        db.commit()

        logger.info(f"[SEED] Menambahkan {len(kiosks_data)} direktori kiosk sentuh...")
        db.add_all(kiosks_data)
        db.commit()

        logger.info("🎉 [SEED] BERHASIL! Seluruh denah Galaxy Mall 1, 2, dan 3 telah terpasang sempurna di PostgreSQL!")
        return True

    except Exception as e:
        db.rollback()
        logger.error(f"[SEED] Terjadi kesalahan saat seeding: {e}")
        return False
    finally:
        db.close()

if __name__ == "__main__":
    success = seed_mall_data(force=True)
    if success:
        print("Seeding berhasil! Memperbarui memory graph...")
        from main import muat_data_dari_postgres
        muat_data_dari_postgres()
        print("Sinkronisasi memori selesai!")
    else:
        sys.exit(1)
