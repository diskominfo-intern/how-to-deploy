# 🚀 Blueprint Deployment Fullstack (Next.js + NestJS) di cPanel Diskominfo & Docker

Repositori **`how-to-deploy`** ini berfungsi sebagai **blueprint (acuan utama)** untuk mempublikasikan (*deploy*) aplikasi fullstack yang terdiri dari 2 repositori terpisah:
1. **Frontend**: Next.js Standalone Mode (`next-frontend-boilerplate`)
2. **Backend**: NestJS REST API (`nest-backend-boilerplate`)

Aplikasi ini dirancang untuk dapat berjalan sempurna di server **cPanel Diskominfo** yang menggunakan **1 Slot Node.js App (Phusion Passenger)** tanpa akses SSH, maupun diuji secara lokal menggunakan **Docker Compose**.

---

## 📑 Fitur & Keunggulan Blueprint Ini

- ⚡ **1-Click Build & Packaging**: Disediakan script `build-cpanel.ps1` & `build-cpanel.sh` yang sekali klik langsung mengompilasi backend, frontend standalone, menyalin file publik/statis, dan membungkus semuanya menjadi **1 file tunggal `deploy-cpanel.tar.gz`**.
- 🛠️ **1 Slot Node.js App cPanel**: Menggunakan Master Gateway Server (`app.js`) yang membagikan lalu lintas URL `/api` ➡️ NestJS dan sisanya ➡️ Next.js secara internal.
- 📝 **File Logger cPanel (`server-cpanel.js`)**: Memastikan Next.js dapat membaca socket/pipe PORT cPanel tanpa error `parseInt`, serta otomatis mencatat log ke `app-debug.log` untuk kemudahan debugging tanpa SSH.
- 🗄️ **Remote MySQL Migration**: Memungkinkan migrasi schema Prisma dan seeding database MySQL cPanel dilakukan langsung dari komputer lokal.
- 🐳 **Simulasi Lokal Docker**: Siap diuji secara lokal dengan 3 container Docker (`mysql_db`, `backend`, `frontend`).

---

## 📂 Struktur Direktori Proyek

```text
how-to-deploy/ (Root Blueprint)
├── nest-backend-boilerplate/  <-- Sub-Repo 1: NestJS Backend
├── next-frontend-boilerplate/ <-- Sub-Repo 2: Next.js Frontend
├── app.js                     <-- Master Express Gateway Server
├── server-cpanel.js           <-- Next.js Server Entry Point khusus cPanel
├── package-master.json        <-- Dependencies Master Gateway
├── build-cpanel.ps1           <-- Script 1-Click Build & Pack (PowerShell Windows)
├── build-cpanel.sh            <-- Script 1-Click Build & Pack (Bash/Linux/Git Bash)
├── docker-compose.yml         <-- Konfigurasi Simulasi Docker Lokal
├── DEPLOY.md                  <-- Dokumentasi Panduan Deployment Detail
└── README.md                  <-- Dokumentasi Utama Blueprint
```

---

## ⚡ Cara Penggunaan (1-Click Deployment ke cPanel)

### 1. Build & Pack di Komputer Lokal
Jalankan salah satu script build di root folder proyek:

- **Windows (PowerShell)**:
  ```powershell
  powershell -ExecutionPolicy Bypass -File build-cpanel.ps1
  ```
- **Linux / Git Bash**:
  ```bash
  bash build-cpanel.sh
  ```

Script akan menghasilkan file tunggal **`deploy-cpanel.tar.gz`**.

### 2. Upload & Extract di cPanel
1. Upload file **`deploy-cpanel.tar.gz`** ke cPanel File Manager pada folder aplikasi (misal `/home/user/app`).
2. Klik kanan `deploy-cpanel.tar.gz` ➡️ **Extract**.
3. Di cPanel **Setup Node.js App**, buat app dengan Application Startup File **`app.js`**.
4. Klik **Run npm install** lalu **Restart Application**.

---

## 🐳 Cara Simulasi Lokal Menggunakan Docker

Pastikan Docker Desktop aktif, lalu jalankan:

```bash
# 1. Build dan jalankan seluruh container
docker-compose up --build -d

# 2. Sync Schema & Seed Database di dalam container
docker exec -it test_nest_backend npx prisma db push
docker exec -it test_nest_backend npx ts-node prisma/seed.ts
```

- **Frontend**: [http://localhost:3001](http://localhost:3001)
- **Backend API**: [http://localhost:3000](http://localhost:3000)
- **API Docs (Scalar)**: [http://localhost:3000/api-docs](http://localhost:3000/api-docs)

---

## 📖 Dokumentasi Lengkap
Untuk panduan langkah demi langkah yang lebih mendalam, silakan baca **[DEPLOY.md](./DEPLOY.md)**.
