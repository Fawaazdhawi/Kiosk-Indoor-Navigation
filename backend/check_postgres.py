import os
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from urllib.parse import urlparse
from dotenv import load_dotenv

load_dotenv()

db_url = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/indoor_navigator")
parsed = urlparse(db_url)

username = parsed.username or "postgres"
password = parsed.password or "postgres"
hostname = parsed.hostname or "localhost"
port = parsed.port or 5432
target_db = parsed.path.lstrip("/") or "indoor_navigator"

print("=" * 60)
print("🔍 DIAGNOSTIK KONEKSI POSTGRESQL WAYFINDER")
print("=" * 60)
print(f"Host     : {hostname}")
print(f"Port     : {port}")
print(f"User     : {username}")
print(f"Password : {'*' * len(password)} ({password})")
print(f"Target DB: {target_db}")
print("-" * 60)

# 1. Coba koneksi ke database default 'postgres'
print("\n[Langkah 1] Mencoba autentikasi ke server PostgreSQL...")
try:
    conn = psycopg2.connect(
        dbname="postgres",
        user=username,
        password=password,
        host=hostname,
        port=port
    )
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cursor = conn.cursor()
    print("✅ BERHASIL: Autentikasi user & password valid!")

    # 2. Cek apakah target database ada
    print(f"\n[Langkah 2] Memeriksa apakah database '{target_db}' sudah ada...")
    cursor.execute(f"SELECT 1 FROM pg_database WHERE datname = '{target_db}';")
    exists = cursor.fetchone()

    if exists:
        print(f"✅ BERHASIL: Database '{target_db}' sudah ada.")
    else:
        print(f"⚠️ Database '{target_db}' belum ada. Mencoba membuat otomatis...")
        try:
            cursor.execute(f'CREATE DATABASE "{target_db}";')
            print(f"🎉 BERHASIL: Database '{target_db}' otomatis dibuatkan!")
        except Exception as e_create:
            print(f"❌ Gagal membuat database otomatis: {e_create}")
            print(f"Silakan buat manual di pgAdmin: Klik kanan Databases -> Create -> Database -> '{target_db}'")

    cursor.close()
    conn.close()

except psycopg2.OperationalError as e:
    err_msg = str(e)
    print("\n❌ KONEKSI GAGAL!")
    if "password authentication failed" in err_msg:
        print("\n👉 PENYEBAB: Password untuk user 'postgres' di file .env SALAH.")
        print("   Solusi: Buka file backend/.env, lalu ubah password di:")
        print(f"   DATABASE_URL=postgresql://{username}:PASSWORD_ASLI_ANDA@{hostname}:{port}/{target_db}")
        print("   (Ganti dengan password yang Anda masukkan saat menginstal PostgreSQL/pgAdmin).")
    elif "could not connect to server" in err_msg or "10061" in err_msg:
        print("\n👉 PENYEBAB: Service PostgreSQL di Windows belum berjalan atau port 5432 tidak aktif.")
        print("   Solusi: Buka 'Services' di Windows (services.msc), cari 'postgresql-x64-...', lalu klik 'Start'.")
    elif f'database "{target_db}" does not exist' in err_msg:
        print(f"\n👉 PENYEBAB: Database '{target_db}' belum dibuat di pgAdmin.")
        print(f"   Solusi: Buka pgAdmin -> klik kanan Databases -> Create -> Database -> nama: '{target_db}'")
    else:
        print(f"Detail Error: {err_msg}")

except Exception as ex:
    print(f"\n❌ Error lain: {ex}")

print("=" * 60)
