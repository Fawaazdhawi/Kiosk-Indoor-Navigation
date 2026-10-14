# 🧭 Wayfinder — 3D Indoor Navigator & AI Mall Directory

Aplikasi navigasi dalam ruangan (*Indoor Navigation*) modern berbasis **3D WebGL (Three.js)** dan **2D Interactive Grid** yang dirancang khusus untuk **Pusat Perbelanjaan (Mall / Shopping Center)**. 

Didukung oleh **Algoritma Pathfinding A\*** (*multi-floor navigation*), database relasional **PostgreSQL**, serta asisten pencarian cerdas berbasis **AI Lokal (Ollama dengan model Qwen)** tanpa ketergantungan API cloud berbayar.

---

## ✨ Fitur Utama

- 🌐 **Tampilan Denah 3D WebGL & 2D Dual-Mode**: Denah toko, lorong, dan fasilitas dirender secara prosedural dalam 3D Three.js dengan pencahayaan dinamis, label billboard tajam, rute neon bercahaya, serta avatar 3D animasi yang dapat berjalan mengantar pengunjung. Pengguna dapat berganti antara mode **3D Isometric** dan **2D Konva** kapan saja.
- 🏬 **Arsitektur Khusus Pusat Perbelanjaan**:
  - **Toko/Tenant**: Kategori F&B, Fashion, Gadget, Entertainment, Beauty (*Starbucks, Uniqlo, XXI Cinema, Zara, dsb*).
  - **Fasilitas Umum**: Toilet Pria/Wanita, Musholla, Nursery Room, ATM Center, Meja Informasi, Lift Utama, dan Eskalator.
  - **Kiosk Direktori**: Titik awal navigasi layar sentuh interaktif di setiap lantai.
- 🧠 **AI Percakapan Lokal (Ollama + Qwen 2.5)**: Pengunjung dapat bertanya dengan bahasa sehari-hari (*"mau cari makan udon jepang di lantai berapa?"*), dan model Qwen akan mengekstrak toko tujuan lalu menarik garis rute navigasi terpendek.
- ⚡ **Algoritma A\* Multi-Lantai**: Menghitung rute navigasi terpendek dan mengarahkan pengunjung berpindah lantai secara mulus melalui Lift atau Eskalator.
- 🔐 **Dashboard Admin & Visual Map Editor**: Kelola posisi toko, kunci kiosk, dan gambar rute denah langsung dari browser dengan sistem login demo 1-klik yang persisten.

---

## 📋 Prasyarat Sistem

Sebelum memulai, pastikan perangkat Anda telah terinstal:

1. **Python 3.10+** — [Unduh Python](https://www.python.org/downloads/) *(Centang opsi "Add Python to PATH")*
2. **Node.js 18+ & npm** — [Unduh Node.js](https://nodejs.org/)
3. **PostgreSQL & pgAdmin 4** — [Unduh PostgreSQL](https://www.postgresql.org/download/)
4. **Ollama** *(Opsional tapi direkomendasikan untuk AI lokal)* — [Unduh Ollama](https://ollama.ai/)

---

## 🚀 Panduan Setup Langkah Demi Langkah

### 1. Buat Database di pgAdmin 4
1. Buka aplikasi **pgAdmin 4**.
2. Masukkan password master pgAdmin Anda.
3. Di panel sebelah kiri: Klik kanan pada **`Databases`** $\rightarrow$ **`Create`** $\rightarrow$ **`Database...`**.
4. Masukkan nama database: **`indoor_navigator`** lalu klik **Save**.

---

### 2. Konfigurasi Environment File (`.env`)

#### A. Backend `.env`
Buka file `backend/.env` (atau salin dari `backend/.env.example`):
```env
# PostgreSQL Database Connection
# Ganti 'admin' dengan kata sandi user postgres Anda saat instalasi pgAdmin
DATABASE_URL=postgresql://postgres:admin@localhost:5432/indoor_navigator

# Ollama Local AI Configuration (Qwen Model)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:7b
```

#### B. Frontend `.env` (Opsional)
Frontend sudah dilengkapi dengan **Mode Demo & PostgreSQL Auto-Fetch**, jadi file `.env` di frontend opsional. Jika Anda memiliki proyek Firebase asli, Anda dapat menyalin `frontend/.env.example` menjadi `frontend/.env`.

---

### 3. Setup & Seeding Database Backend (Python)

1. Buka terminal baru dan arahkan ke folder `backend`:
   ```bash
   cd "indoor-Navigator-Main/backend"
   ```

2. Instal seluruh pustaka dependensi Python:
   ```bash
   pip install -r requirements.txt
   ```

3. Jalankan pengujian koneksi database:
   ```bash
   python check_postgres.py
   ```
   *Pastikan muncul pesan `✅ BERHASIL: Autentikasi user & password valid!`.*

4. Isi database dengan data denah mall awal (*Seeding*):
   ```bash
   python seed_mall.py
   ```
   *Output:* `🎉 [SEED] BERHASIL! Seluruh data lantai, toko mall, fasilitas, dan kiosk siap digunakan!`

---

### 4. Setup Frontend (React + Vite)

1. Buka terminal kedua dan arahkan ke folder `frontend`:
   ```bash
   cd "indoor-Navigator-Main/frontend"
   ```

2. Instal dependensi JavaScript (React, Three.js, dsb):
   ```bash
   npm install
   ```

---

### 5. Setup AI Lokal (Ollama dengan Model Qwen)

1. Pastikan aplikasi **Ollama** sudah terpasang dan berjalan di background.
2. Unduh model **Qwen 2.5** di terminal:
   ```bash
   ollama run qwen2.5:7b
   ```
   *(Atau gunakan model yang lebih ringan untuk laptop hemat RAM: `ollama run qwen2.5:3b`).*

---

## ▶️ Menjalankan Aplikasi

Anda dapat menjalankan backend dan frontend secara bersamaan dengan membuka 2 terminal:

### Terminal 1: Backend API (FastAPI)
```bash
cd "indoor-Navigator-Main/backend"
uvicorn main:app --reload
```
> Server backend berjalan di: **`http://localhost:8000`**  
> Dokumentasi Swagger API interaktif: **`http://localhost:8000/docs`**

### Terminal 2: Frontend UI (React + Vite HTTPS)
```bash
cd "indoor-Navigator-Main/frontend"
npm run dev
```
> Buka browser di: **`https://localhost:5173/`**  
> *(Karena menggunakan sertifikat lokal SSL, jika browser menampilkan peringatan "Your connection is not private", klik **Advanced** $\rightarrow$ **Proceed to localhost**).*

---

## 🔑 Akses & Kredensial Admin

Untuk mengelola denah atau mengunci kiosk:
1. Klik tombol **Masuk** di pojok kanan atas header aplikasi.
2. Di jendela login, Anda dapat menggunakan tombol instan:
   > **`⚡ Masuk Langsung (1-Klik Mode Demo)`**
3. Atau masukkan kredensial:
   - **Email**: `admin@wayfinder.id`
   - **Kata Sandi**: `admin123`
4. Sesi login tersimpan otomatis di browser tanpa khawatir ter-logout saat me-refresh halaman.

---

## 📡 Ringkasan Endpoint API Backend

| Metode | Endpoint | Deskripsi |
| :--- | :--- | :--- |
| `GET` | `/api/map-data` | Mengambil seluruh denah lantai, toko mall, fasilitas, dan kiosk dari PostgreSQL. |
| `POST` | `/api/route` | Menghitung rute algoritma A* dari titik Kiosk ke tujuan. |
| `POST` | `/api/chat-nav` | Memproses percakapan pengunjung dengan Ollama (Qwen) & mengembalikan rute navigasi. |
| `POST` | `/api/seed` | Melakukan reset / pengisian ulang data mall ke database PostgreSQL. |
| `GET` | `/docs` | Dokumentasi OpenAPI / Swagger interaktif FastAPI. |

---

## 📁 Struktur Direktori Proyek

```text
indoor-Navigator-Main/
├── backend/
│   ├── app/
│   │   ├── core/
│   │   │   ├── database.py       # Engine SQLAlchemy & koneksi PostgreSQL
│   │   │   └── state.py          # State matriks grid lorong & ruangan
│   │   ├── models/
│   │   │   └── mall.py           # Skema tabel Floor, Tenant, Facility, Kiosk
│   │   └── services/
│   │       ├── a_star_service.py # Algoritma pencarian rute terpendek A*
│   │       └── nlp_service.py    # SentenceTransformers & semantic matching
│   ├── main.py                   # FastAPI REST API & Ollama Qwen router
│   ├── seed_mall.py              # Script seeding master denah mall GF, L1, L2
│   ├── check_postgres.py         # Script diagnostik koneksi database
│   ├── requirements.txt          # Dependensi Python
│   └── .env                      # Konfigurasi database & Ollama
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── SharedMap3D.jsx   # Engine visualisasi 3D WebGL (Three.js)
    │   │   ├── SharedMap.jsx     # Visualisasi 2D Grid (Konva)
    │   │   └── ProtectedRoute.jsx# Proteksi rute halaman Admin & Editor
    │   ├── MainPages/
    │   │   ├── MainPage.jsx      # Tampilan direktori mall pengunjung (3D/2D)
    │   │   └── Main.css          # Desain antarmuka Glassmorphism & UI
    │   ├── AdminPages/           # Dashboard analitik & manajemen kiosk
    │   ├── EditPages/            # Visual map grid editor
    │   └── firebase.js           # Guard fallback autentikasi
    ├── package.json
    └── vite.config.js
```

---

## 🛠️ Tips & Pemecahan Masalah

- **Password PostgreSQL ditolak?**  
  Jalankan `python check_postgres.py` di folder `backend` untuk melihat hasil tes koneksi. Sesuaikan password di `backend/.env`.
- **Layar browser blank saat buka localhost?**  
  Pastikan URL diawali dengan protokol HTTPS: **`https://localhost:5173/`** (bukan `http://`).
- **Ollama tidak merespons?**  
  Pastikan Ollama sudah dinyalakan dengan menjalankan `ollama list` di terminal untuk melihat model yang terpasang. Jika Ollama belum aktif, sistem otomatis beralih (*graceful fallback*) ke pencarian nama toko langsung.

---

*Dikembangkan untuk tugas akhir & pengembangan sistem navigasi indoor cerdas berbasis WebGL & AI Lokal.*
