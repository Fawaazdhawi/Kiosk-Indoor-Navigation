import os
import sys
from dotenv import load_dotenv

# Tambahkan backend ke sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

load_dotenv()

from loguru import logger
from app.core.database import SessionLocal, init_db
from app.models.mall import Floor, Tenant, Facility, Kiosk

def seed_mall_data():
    logger.info("[SEED] Memulai inisialisasi tabel dan data Pusat Perbelanjaan...")
    
    # 1. Pastikan tabel dibuat di PostgreSQL
    if not init_db():
        logger.error("[SEED] Gagal inisialisasi database. Cek koneksi PostgreSQL Anda di .env")
        return False

    db = SessionLocal()
    try:
        # Cek apakah data sudah ada
        existing_tenants = db.query(Tenant).count()
        if existing_tenants > 0:
            logger.info(f"[SEED] Database sudah memiliki {existing_tenants} tenant toko. Melewati seeding.")
            return True

        logger.info("[SEED] Mengisi data master lantai (Floors)...")
        floors_data = [
            Floor(id="GF", building="Mall Utama", name="Ground Floor", floor_level=1, grid_width=80, grid_height=80),
            Floor(id="L1", building="Mall Utama", name="Lantai 1", floor_level=2, grid_width=80, grid_height=80),
            Floor(id="L2", building="Mall Utama", name="Lantai 2", floor_level=3, grid_width=80, grid_height=80),
        ]
        db.add_all(floors_data)
        db.commit()

        logger.info("[SEED] Mengisi data Tenant Toko (Tenants)...")
        tenants_data = [
            # === GROUND FLOOR (GF) ===
            Tenant(
                id="STORE_STARBUCKS_GF",
                name="Starbucks Reserve",
                name_en="Starbucks Reserve",
                category="F&B",
                sub_category="Coffee Shop & Bakery",
                unit_number="GF-01",
                building="Mall Utama",
                floor="Ground Floor",
                grid_x=6, grid_y=6, grid_width=8, grid_height=6,
                endpoints=["bottom"],
                keywords=["starbucks", "kopi", "coffee", "cafe", "kafe", "haus", "minum", "minuman", "ngopi", "latte", "espresso", "frappuccino", "croissant", "nongkrong", "wifi"]
            ),
            Tenant(
                id="STORE_ZARA_GF",
                name="Zara",
                name_en="Zara Flagship",
                category="Fashion",
                sub_category="Apparel & Accessories",
                unit_number="GF-02",
                building="Mall Utama",
                floor="Ground Floor",
                grid_x=18, grid_y=6, grid_width=10, grid_height=8,
                endpoints=["bottom"],
                description="Koleksi busana pria, wanita, gaun, kemeja formal, celana, jaket, dan tas fashion terbaru.",
                keywords=["zara", "baju", "kemeja", "celana", "jaket", "dress", "fashion", "pakaian wanita", "pakaian pria", "sepatu", "tas"]
            ),
            Tenant(
                id="STORE_SEPHORA_GF",
                name="Sephora",
                name_en="Sephora Beauty",
                category="Beauty & Health",
                sub_category="Cosmetics & Skincare",
                unit_number="GF-03",
                building="Mall Utama",
                floor="Ground Floor",
                grid_x=6, grid_y=16, grid_width=7, grid_height=6,
                endpoints=["right"],
                description="Pusat kecantikan kosmetik, skincare, parfum branded, lipstik, dan produk perawatan wajah dunia.",
                keywords=["sephora", "makeup", "parfum", "skincare", "lipstik", "kosmetik", "bedak", "serum", "kecantikan", "perawatan"]
            ),
            Tenant(
                id="STORE_IBOX_GF",
                name="iBox Apple Premium Reseller",
                name_en="iBox Apple Store",
                category="Gadget",
                sub_category="Electronics & Mobile",
                unit_number="GF-04",
                building="Mall Utama",
                floor="Ground Floor",
                grid_x=18, grid_y=18, grid_width=8, grid_height=6,
                endpoints=["left"],
                description="Toko resmi produk Apple: iPhone, MacBook, iPad, Apple Watch, AirPods, dan aksesoris original.",
                keywords=["apple", "ibox", "iphone", "macbook", "ipad", "airpods", "hp", "gadget", "charger", "laptop", "elektronik", "handphone"]
            ),

            # === LANTAI 1 (L1) ===
            Tenant(
                id="STORE_UNIQLO_L1",
                name="Uniqlo",
                name_en="Uniqlo Lifewear",
                category="Fashion",
                sub_category="Casual Apparel",
                unit_number="L1-01",
                building="Mall Utama",
                floor="Lantai 1",
                grid_x=6, grid_y=6, grid_width=12, grid_height=8,
                endpoints=["bottom"],
                description="Pakaian kasual berkualitas tinggi teknologi AIRism, HEATTECH, kaos polos, kemeja flannel, dan jeans.",
                keywords=["uniqlo", "kaos", "celana", "jeans", "jaket", "airism", "baju santai", "pakaian dalam", "hoodie", "lifewear"]
            ),
            Tenant(
                id="STORE_HM_L1",
                name="H&M",
                name_en="H&M",
                category="Fashion",
                sub_category="Trendy Apparel",
                unit_number="L1-02",
                building="Mall Utama",
                floor="Lantai 1",
                grid_x=22, grid_y=6, grid_width=10, grid_height=8,
                endpoints=["bottom"],
                description="Busana tren kekinian untuk pria, wanita, remaja, dan anak-anak dengan harga terjangkau.",
                keywords=["hnm", "h&m", "baju", "kaos", "dress", "fashion murah", "celana pendek", "topi", "baju anak"]
            ),
            Tenant(
                id="STORE_GRAMEDIA_L1",
                name="Gramedia",
                name_en="Gramedia Bookstore",
                category="Books & Stationery",
                sub_category="Books & Office Supplies",
                unit_number="L1-03",
                building="Mall Utama",
                floor="Lantai 1",
                grid_x=6, grid_y=18, grid_width=9, grid_height=7,
                endpoints=["right"],
                description="Toko buku terlengkap, novel bestseller, komik manga, alat tulis kantor, tas ransel, dan perlengkapan seni.",
                keywords=["gramedia", "buku", "novel", "komik", "alat tulis", "stationery", "pensil", "pulpen", "majalah", "baca"]
            ),
            Tenant(
                id="STORE_CHATIME_L1",
                name="Chatime",
                name_en="Chatime Milk Tea",
                category="F&B",
                sub_category="Beverages & Boba",
                unit_number="L1-04",
                building="Mall Utama",
                floor="Lantai 1",
                grid_x=20, grid_y=18, grid_width=6, grid_height=5,
                endpoints=["left"],
                description="Minuman teh susu boba taiwan, pearl milk tea, hazelnut chocolate, dan aneka minuman segar pelepas dahaga.",
                keywords=["chatime", "boba", "milk tea", "teh", "haus", "minum", "minuman", "es teh", "minuman manis", "segar"]
            ),

            # === LANTAI 2 (L2) ===
            Tenant(
                id="STORE_XXI_L2",
                name="Cinema XXI & Premiere",
                name_en="Cinema XXI",
                category="Entertainment",
                sub_category="Movie Theater",
                unit_number="L2-01",
                building="Mall Utama",
                floor="Lantai 2",
                grid_x=6, grid_y=6, grid_width=14, grid_height=10,
                endpoints=["bottom"],
                description="Bioskop bioskop modern studio Deluxe dan Premiere, menyajikan film bioskop terbaru, popcorn manis, dan cafe XXI.",
                keywords=["xxi", "bioskop", "cinema", "nonton", "film", "movie", "popcorn", "premiere", "tiket nonton", "hiburan"]
            ),
            Tenant(
                id="STORE_FUNWORLD_L2",
                name="Funworld Arcade",
                name_en="Funworld Game Center",
                category="Entertainment",
                sub_category="Arcade & Family Games",
                unit_number="L2-02",
                building="Mall Utama",
                floor="Lantai 2",
                grid_x=24, grid_y=6, grid_width=10, grid_height=9,
                endpoints=["bottom"],
                description="Pusat rekreasi keluarga dan arena bermain game arkade, mesin capit boneka, balap mobil, dan atraksi anak.",
                keywords=["funworld", "timezone", "game", "main", "anak-anak", "mesin capit", "boneka", "arcade", "hiburan keluarga"]
            ),
            Tenant(
                id="STORE_MARUGAME_L2",
                name="Marugame Udon",
                name_en="Marugame Udon",
                category="F&B",
                sub_category="Japanese Restaurant & Udon",
                unit_number="L2-03",
                building="Mall Utama",
                floor="Lantai 2",
                grid_x=6, grid_y=20, grid_width=8, grid_height=6,
                endpoints=["right"],
                description="Restoran mie udon autentik Jepang, kuah kake dashi, beef niku udon, aneka gorengan tempura gurih dan renyah.",
                keywords=["marugame", "udon", "tempura", "mie", "makan", "lapar", "restoran", "makanan", "kuliner", "makan siang", "lunch", "dinner", "kenyang"]
            ),
            Tenant(
                id="STORE_SUSHITEI_L2",
                name="Sushi Tei",
                name_en="Sushi Tei Restaurant",
                category="F&B",
                sub_category="Japanese Dining & Sushi",
                unit_number="L2-04",
                building="Mall Utama",
                floor="Lantai 2",
                grid_x=18, grid_y=20, grid_width=8, grid_height=6,
                endpoints=["left"],
                description="Restoran sushi ternama dengan conveyor belt, salmon sashimi segar, sushi roll lezat, ramen, dan menu bento keluarga.",
                keywords=["sushi", "sushi tei", "salmon", "sashimi", "ramen", "restoran", "makan", "lapar", "makanan", "kuliner", "makan malam", "lunch", "dinner", "seafood"]
            )
        ]
        db.add_all(tenants_data)
        db.commit()

        logger.info("[SEED] Mengisi data Fasilitas Mall (Facilities)...")
        facilities_data = [
            # GF Facilities
            Facility(
                id="CS_LOBBY_GF",
                name="Customer Service & Meja Informasi",
                name_en="Customer Service & Information",
                facility_type="customer_service",
                floor="Ground Floor",
                grid_x=14, grid_y=14, grid_width=3, grid_height=3,
                endpoints=["top"],
                keywords=["informasi", "tanya", "cs", "customer service", "satpam", "pusat bantuan", "keluhan"]
            ),
            Facility(
                id="TOILET_GF",
                name="Toilet GF (Pria & Wanita)",
                name_en="Restroom Ground Floor",
                facility_type="toilet",
                floor="Ground Floor",
                grid_x=28, grid_y=16, grid_width=3, grid_height=3,
                endpoints=["left"],
                keywords=["toilet", "wc", "kamar mandi", "buang air", "restroom", "lavatory"]
            ),
            Facility(
                id="ATM_CENTER_GF",
                name="ATM Center GF",
                name_en="ATM Center",
                facility_type="atm",
                floor="Ground Floor",
                grid_x=28, grid_y=22, grid_width=3, grid_height=2,
                endpoints=["left"],
                keywords=["atm", "tarik tunai", "bca", "mandiri", "bri", "bni", "uang", "bank"]
            ),
            Facility(
                id="LIFT_UTAMA_GF",
                name="Lift Utama GF",
                name_en="Main Elevator GF",
                facility_type="elevator",
                floor="Ground Floor",
                grid_x=14, grid_y=26, grid_width=2, grid_height=2,
                endpoints=["top"],
                is_connector=True,
                connector_group="LIFT_UTAMA",
                keywords=["lift", "elevator", "naik lantai", "lantai 1", "lantai 2", "kursi roda"]
            ),

            # L1 Facilities
            Facility(
                id="MUSHOLLA_L1",
                name="Musholla Eksekutif L1",
                name_en="Prayer Room L1",
                facility_type="musholla",
                floor="Lantai 1",
                grid_x=28, grid_y=16, grid_width=4, grid_height=4,
                endpoints=["left"],
                keywords=["musholla", "sholat", "tempat wudhu", "solat", "ibadah", "masjid", "mukena"]
            ),
            Facility(
                id="TOILET_L1",
                name="Toilet L1 (Pria & Wanita)",
                name_en="Restroom Lantai 1",
                facility_type="toilet",
                floor="Lantai 1",
                grid_x=28, grid_y=22, grid_width=3, grid_height=3,
                endpoints=["left"],
                keywords=["toilet", "wc", "kamar mandi", "restroom"]
            ),
            Facility(
                id="LIFT_UTAMA_L1",
                name="Lift Utama L1",
                name_en="Main Elevator L1",
                facility_type="elevator",
                floor="Lantai 1",
                grid_x=14, grid_y=26, grid_width=2, grid_height=2,
                endpoints=["top"],
                is_connector=True,
                connector_group="LIFT_UTAMA",
                keywords=["lift", "elevator", "lantai 2", "ground floor"]
            ),

            # L2 Facilities
            Facility(
                id="TOILET_L2",
                name="Toilet L2 (Pria & Wanita)",
                name_en="Restroom Lantai 2",
                facility_type="toilet",
                floor="Lantai 2",
                grid_x=28, grid_y=20, grid_width=3, grid_height=3,
                endpoints=["left"],
                keywords=["toilet", "wc", "kamar mandi", "restroom"]
            ),
            Facility(
                id="LIFT_UTAMA_L2",
                name="Lift Utama L2",
                name_en="Main Elevator L2",
                facility_type="elevator",
                floor="Lantai 2",
                grid_x=14, grid_y=26, grid_width=2, grid_height=2,
                endpoints=["top"],
                is_connector=True,
                connector_group="LIFT_UTAMA",
                keywords=["lift", "elevator", "lantai 1", "ground floor"]
            ),
        ]
        db.add_all(facilities_data)
        db.commit()

        logger.info("[SEED] Mengisi data Kiosk Direktori Sentuh (Kiosks)...")
        kiosks_data = [
            Kiosk(
                id="KIOSK_LOBBY_GF",
                name="Kiosk Direktori Lobby GF",
                floor="Ground Floor",
                grid_x=14, grid_y=10, grid_width=1, grid_height=1,
                endpoints=["bottom"]
            ),
            Kiosk(
                id="KIOSK_ATRIUM_L1",
                name="Kiosk Direktori Atrium L1",
                floor="Lantai 1",
                grid_x=16, grid_y=14, grid_width=1, grid_height=1,
                endpoints=["bottom"]
            ),
            Kiosk(
                id="KIOSK_CINEMA_L2",
                name="Kiosk Direktori Cinema L2",
                floor="Lantai 2",
                grid_x=16, grid_y=16, grid_width=1, grid_height=1,
                endpoints=["bottom"]
            )
        ]
        db.add_all(kiosks_data)
        db.commit()

        logger.info("🎉 [SEED] BERHASIL! Seluruh data lantai, toko mall, fasilitas, dan kiosk siap digunakan!")
        return True

    except Exception as e:
        db.rollback()
        logger.error(f"[SEED] Terjadi kesalahan saat seeding: {e}")
        return False
    finally:
        db.close()

if __name__ == "__main__":
    seed_mall_data()
