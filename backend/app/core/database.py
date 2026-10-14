import os
from dotenv import load_dotenv
from loguru import logger
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

load_dotenv()

# Konfigurasi PostgreSQL
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql://postgres:postgres@localhost:5432/indoor_navigator"
)

# Engine SQLAlchemy
engine = None
SessionLocal = None
Base = declarative_base()

try:
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20
    )
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    logger.info(f"[POSTGRES] Engine terhubung ke: {DATABASE_URL.split('@')[-1] if '@' in DATABASE_URL else DATABASE_URL}")
except Exception as e:
    logger.warning(f"[POSTGRES] Peringatan: Tidak dapat membuat engine Postgres ({e}). Pastikan service PostgreSQL aktif.")

def get_db():
    """Dependency FastAPI untuk mendapatkan session database."""
    if SessionLocal is None:
        raise RuntimeError("Database engine belum terinisialisasi.")
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def ensure_database_exists():
    """Memeriksa apakah database target sudah ada di PostgreSQL, jika belum akan dibuatkan otomatis."""
    from urllib.parse import urlparse
    import psycopg2
    from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

    db_url = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/indoor_navigator")
    try:
        parsed = urlparse(db_url)
        username = parsed.username or "postgres"
        password = parsed.password or "postgres"
        hostname = parsed.hostname or "localhost"
        port = parsed.port or 5432
        target_db = parsed.path.lstrip("/") or "indoor_navigator"

        conn = psycopg2.connect(
            dbname="postgres",
            user=username,
            password=password,
            host=hostname,
            port=port
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cur = conn.cursor()
        cur.execute(f"SELECT 1 FROM pg_database WHERE datname = '{target_db}';")
        exists = cur.fetchone()
        if not exists:
            cur.execute(f'CREATE DATABASE "{target_db}";')
            logger.info(f"[POSTGRES] 🎉 Database '{target_db}' otomatis dibuat di PostgreSQL!")
        cur.close()
        conn.close()
        return True
    except psycopg2.OperationalError as e:
        err_msg = str(e)
        if "password authentication failed" in err_msg:
            logger.error("[POSTGRES] ❌ Password user 'postgres' di file backend/.env SALAH!")
            logger.error(f"[POSTGRES] 👉 Buka backend/.env dan ganti 'postgres' setelah ':' dengan password asli Anda.")
        elif "could not connect to server" in err_msg or "10061" in err_msg:
            logger.error("[POSTGRES] ❌ Service PostgreSQL belum berjalan di Windows (port 5432)!")
            logger.error("[POSTGRES] 👉 Pastikan service PostgreSQL sudah di-Start di Windows (services.msc).")
        else:
            logger.error(f"[POSTGRES] ❌ Gagal koneksi: {err_msg.strip()}")
        return False
    except Exception as e:
        logger.error(f"[POSTGRES] Gagal koneksi database: {e}")
        return False

def init_db():
    """Membuat semua tabel di PostgreSQL jika belum ada."""
    ensure_database_exists()
    
    if engine is None:
        logger.error("[POSTGRES] Gagal init_db: Engine belum aktif.")
        return False
    try:
        import app.models.mall  # Pastikan semua model diimpor
        Base.metadata.create_all(bind=engine)
        logger.info("[POSTGRES] Seluruh tabel (floors, tenants, facilities, kiosks, search_analytics) berhasil diverifikasi/dibuat!")
        return True
    except Exception as e:
        logger.error(f"[POSTGRES] Gagal membuat tabel di PostgreSQL: {e}")
        return False

# -------------------------------------------------------------
# Optional Firebase Fallback (Backward Compatibility)
# -------------------------------------------------------------
db = None
def listen_to_firestore(callback):
    """Fallback opsional jika serviceAccountKey.json ada."""
    pass