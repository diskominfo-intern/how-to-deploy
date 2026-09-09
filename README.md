# 🚀 Blueprint Deployment Fullstack (Next.js + NestJS) di cPanel Diskominfo & Docker

Repositori **`how-to-deploy`** ini berfungsi sebagai **blueprint (acuan utama)** untuk mempublikasikan (*deploy*) aplikasi fullstack yang terdiri dari 2 repositori terpisah:
1. **Frontend**: Next.js Standalone Mode (`next-frontend-boilerplate`)
2. **Backend**: NestJS REST API (`nest-backend-boilerplate`)

Aplikasi ini dirancang untuk dapat berjalan sempurna di server **cPanel Diskominfo** yang menggunakan **1 Slot Node.js App (Phusion Passenger)** tanpa akses SSH, maupun diuji secara lokal menggunakan **Docker Compose**.

> 💡 **Penggunaan Template Langsung:**
> - Untuk membuat Web App baru, Anda bisa langsung mengklik **"Use this template"** pada repositori [next-frontend-boilerplate](https://github.com/diskominfo-intern/next-frontend-boilerplate) dan [nest-backend-boilerplate](https://github.com/diskominfo-intern/nest-backend-boilerplate).
> - **Fleksibilitas Backend & Mobile App**: Jika di masa depan backend diganti menggunakan framework Node.js lain (seperti **Express**, **Koa**), atau jika backend NestJS hanya digunakan untuk **Mobile App (Flutter/React Native)** tanpa frontend Next.js, blueprint ini sangat fleksibel untuk disesuaikan.

---

## 📑 Fitur & Keunggulan Blueprint Ini

- ⚡ **1-Click Build & Packaging**: Disediakan script `build-cpanel.ps1` & `build-cpanel.sh` (dengan auto-check/install `node_modules`) yang sekali klik langsung mengompilasi backend, frontend standalone, menyalin file publik/statis, dan membungkus semuanya menjadi **1 file tunggal `deploy-cpanel.tar.gz`**.
- 🛠️ **1 Slot Node.js App cPanel**: Menggunakan Master Gateway Server (`app.js`) yang membagikan lalu lintas URL `/api` & `/api-docs` ➡️ NestJS (Port 39002) dan sisanya ➡️ Next.js (Port 39001) secara internal dengan error handler proxy yang informatif.
- 📜 **Centralized Gateway Logging & `/log` Viewer**: Master Gateway mencatat log aktivitas spawn process, proxy error, dan status server ke file `log.txt` di root + menyediakan endpoint `GET /log` untuk inspeksi log via browser tanpa SSH.
- 🔄 **Auto Database Sync & Prisma Retry**: Gateway secara otomatis menjalankan sync schema database Prisma (`npx prisma db push`) dengan retry hingga 5x saat booting.
- 🔧 **Script Penyesuaian Nama Folder (`fix-folder-names.sh`)**: Script otomatis untuk menyesuaikan rute subfolder backend/frontend di `build-cpanel.sh`, `docker-compose.yml`, dan `Dockerfile.cpanel` saat menggunakan repo monorepo intern.
- 📝 **File Logger cPanel (`server-cpanel.js`)**: Memastikan Next.js dapat membaca socket/pipe PORT cPanel tanpa error `parseInt`, otomatis mencari `server.js` di subfolder, serta mencatat log ke `app-debug.log`.
- 🗄️ **Remote MySQL Migration**: Memungkinkan migrasi schema Prisma dan seeding database MySQL cPanel dilakukan langsung dari komputer lokal.
- 🐳 **Simulasi Lokal Docker**: Siap diuji secara lokal dengan 3 container Docker (`mysql_db`, `backend`, `frontend`) atau 1-slot container (`docker-compose.cpanel.yml`).

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
├── fix-folder-names.sh        <-- Script Otomatis Penyesuaian Nama Folder Project
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

---

## ?? Catatan Evaluasi & Troubleshooting Deployment cPanel

Dokumentasi lengkap mengenai solusi atas kendala-kendala umum saat deployment (Error 503, crash auto-install Husky, tabrakan port, loop redirect 401, CORS, dll.) dapat dilihat pada:
?? **[DEPLOYMENT_NOTES.md](./DEPLOYMENT_NOTES.md)**

### Ringkasan Cepat:
1. **Error 503 Service Unavailable:** Dilarang menggunakan user -k atau lsof di pp.js karena akses non-root cPanel akan memblokir perintah tersebut.
2. **Husky Build Fail:** Gunakan "prepare": "husky || true" di package.json dan flag --ignore-scripts pada auto-install cPanel.
3. **Tabrakan Port (EADDRINUSE):** Tentukan port internal khusus di file .env root (contoh: FRONTEND_PORT=39011, BACKEND_PORT=39012).
4. **Loop 401 & Hardcode Localhost:** Pastikan frontend memakai relative path NEXT_PUBLIC_API_URL=/api dan interceptor Axios mencegah redirect loop jika sudah di halaman login.
5. **CORS Backend:** Gunakan origin handler dinamis yang otomatis meloloskan subdomain *.makassarkota.go.id tanpa trailing slash kaku.
