# Tubes2 IF2211 — DOM Tree Traversal dengan BFS & DFS

> Tugas Besar 2 IF2211 Strategi Algoritma — Semester II 2025/2026  
> Program Studi Teknik Informatika, STEI — Institut Teknologi Bandung

---

## Deskripsi Singkat

Aplikasi web untuk menelusuri elemen HTML pada struktur pohon **Document Object Model (DOM)** menggunakan algoritma **Breadth-First Search (BFS)** dan **Depth-First Search (DFS)** berdasarkan **CSS Selector**. Aplikasi dapat menerima input berupa URL website atau HTML mentah, lalu menampilkan visualisasi pohon DOM beserta animasi proses penelusuran secara real-time.

---

## Penjelasan Algoritma

### Breadth-First Search (BFS)
BFS menelusuri pohon DOM secara **melebar**, mengunjungi seluruh node pada satu level (kedalaman) sebelum berpindah ke level berikutnya. Implementasi menggunakan **antrian (queue)** dengan prinsip FIFO. Dimulai dari root `<html>`, seluruh anak-anaknya dimasukkan ke antrian, kemudian diproses satu per satu sambil memasukkan anak-anak mereka ke antrian, hingga antrian kosong atau batas hasil tercapai.

**Multithreading pada BFS:** Setiap level pohon diproses secara paralel menggunakan goroutine dan `sync.WaitGroup`. Seluruh node dalam satu level diperiksa secara bersamaan, hasil dikumpulkan, lalu dilanjutkan ke level berikutnya.

**Karakteristik:** Menemukan elemen di level paling dangkal terlebih dahulu. Cocok untuk mencari elemen yang dekat dengan root seperti `<header>` atau `<nav>`.

### Depth-First Search (DFS)
DFS menelusuri pohon DOM secara **mendalam**, menyelami satu cabang hingga ujung sebelum backtrack dan menjelajahi cabang lainnya. Implementasi menggunakan **rekursi pre-order**: mengunjungi node saat ini terlebih dahulu, kemudian secara rekursif mengunjungi setiap subtree anak dari kiri ke kanan.

**Multithreading pada DFS:** Subtree dari setiap anak root diproses secara paralel oleh goroutine terpisah. Hasil digabungkan kembali dalam urutan pre-order asli menggunakan channel dan sorting berdasarkan `childIdx`.

**Karakteristik:** Menghasilkan urutan yang sesuai dengan kemunculan elemen dalam dokumen HTML. Cocok untuk elemen yang bersarang dalam (deeply nested).

### LCA Binary Lifting (Bonus)
Fitur tambahan untuk menentukan **Lowest Common Ancestor (LCA)** — elemen HTML terdekat yang menjadi parent bersama dari dua elemen yang dipilih. Preprocessing O(N log N) menggunakan tabel sparse `table[v][k]` yang menyimpan ancestor ke-2^k dari node v, memungkinkan query LCA dalam O(log N).

---

## Requirement

### Backend
- **Go** >= 1.22
- Dependensi eksternal: `github.com/rs/cors v1.11.0`
- Tidak menggunakan library parsing HTML eksternal — tokenizer dan tree builder diimplementasikan sendiri

### Frontend
- **Node.js** >= 18
- **npm** >= 9

### Docker (opsional)
- **Docker** >= 24
- **Docker Compose** >= 2

---

## Cara Build dan Menjalankan Program

### Cara 1 — Tanpa Docker (Manual)

#### Backend
```bash
# Masuk ke folder backend
cd backend

# Download dependencies
go mod tidy

# Jalankan langsung
go run main.go

# ATAU build binary terlebih dahulu
go build -o tubes2_backend ./main.go
./tubes2_backend
```
Backend berjalan di `http://localhost:8080`

#### Frontend
```bash
# Masuk ke folder frontend
cd frontend

# Install dependencies
npm install

# Jalankan development server
npm run dev
```
Frontend berjalan di `http://localhost:5173`

Buka browser dan akses `http://localhost:5173`

---

### Cara 2 — Dengan Docker (Recommended)

Pastikan Docker Desktop sudah berjalan, lalu dari **root folder proyek**:

```bash
# Build dan jalankan semua service sekaligus
docker compose up --build

# Atau jalankan di background
docker compose up --build -d
```

Tunggu hingga build selesai (~5-10 menit pertama kali), lalu buka browser:
```
http://localhost
```

Untuk menghentikan:
```bash
docker compose down
```
---
## Akses Web

Aplikasi sudah di-deploy dan dapat diakses langsung tanpa instalasi apapun:

**http://tubes2-kasifaham.eastasia.cloudapp.azure.com**

Untuk akses langsung tanpa instalasi, gunakan link di atas.
---

## Cara Penggunaan Aplikasi

1. **Masukkan sumber HTML** — pilih antara URL website (akan di-scrape otomatis) atau paste HTML mentah langsung
2. **Pilih algoritma** — BFS atau DFS
3. **Masukkan CSS Selector** — contoh: `p.text`, `div > h1`, `#main .container`, `h1 ~ p`
4. **Tentukan jumlah hasil** — top-n (masukkan angka) atau semua kemunculan (isi 0)
5. **Klik Traversal** — animasi penelusuran akan berjalan secara real-time pada visualisasi pohon DOM
6. **Lihat hasil** — daftar elemen yang cocok, jumlah node dikunjungi, waktu pencarian, dan log traversal

---

## Struktur Folder

```
Tubes2_NamaKelompok/
├── docker-compose.yml
├── README.md
├── backend/
│   ├── main.go
│   ├── go.mod
│   ├── Dockerfile
│   └── internal/
│       ├── models/
│       │   └── models.go
│       ├── parser/
│       │   ├── parser.go        # Tree builder (tanpa library eksternal)
│       │   ├── tokenizer.go     # HTML tokenizer (tanpa library eksternal)
│       │   ├── selector.go      # CSS selector engine
│       │   └── parser_test.go
│       ├── traversal/
│       │   ├── bfs_dfs.go       # BFS & DFS + multithreading
│       │   ├── lca.go           # LCA Binary Lifting
│       │   ├── traversal_test.go
│       │   └── lca_test.go
│       ├── scraper/
│       │   └── scraper.go
│       └── handler/
│           └── handler.go       # HTTP handlers + SSE
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    ├── package.json
    └── src/
        ├── App.tsx
        ├── api/
        │   └── client.ts
        └── components/
            ├── DomTree.tsx
            ├── SearchForm.tsx
            └── TraversalLog.tsx
```

---

## Author

| Nama | NIM |
|------|-----|
| ... | ... |
| ... | ... |
| ... | ... |

---
