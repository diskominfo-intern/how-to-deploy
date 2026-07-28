# 🚀 Panduan Deployment cPanel & Simulasi Docker

Dokumen ini berisi panduan komprehensif untuk:
1. **Panduan Deployment cPanel (1 Slot Node.js App)** dengan **1-Click Build & Pack (`deploy-cpanel.tar.gz`)**.
2. **Panduan Simulasi Lokal dengan Docker & Docker Compose**.

---

## 📑 Daftar Isi
- [Bagian 1: Panduan Deployment cPanel (1 Node.js App Slot)](#bagian-1-panduan-deployment-cpanel-1-nodejs-app-slot)
  - [1. Struktur Direktori Lokal Proyek](#1-struktur-direktori-lokal-proyek)
  - [2. Perintah 1-Click Build, Copy Assets, & Pack (`build-cpanel.sh`)](#2-perintah-1-click-build-copy-assets--pack-build-cpanelsh)
  - [3. Struktur Akhir Hasil Ekstrak di cPanel](#3-struktur-akhir-hasil-ekstrak-di-cpanel)
  - [4. File Logging & Entry Point Next.js (`server-cpanel.js`)](#4-file-logging--entry-point-nextjs-server-cpaneljs)
  - [5. Master Gateway Server (`app.js`)](#5-master-gateway-server-appjs)
  - [6. Database Setup dari Lokal (Remote MySQL)](#6-database-setup-dari-lokal-remote-mysql)
  - [7. Langkah Upload & Ekstrak di cPanel](#7-langkah-upload--ekstrak-di-cpanel)
- [Bagian 2: Simulasi Lokal Menggunakan Docker Compose](#bagian-2-simulasi-lokal-menggunakan-docker-compose)

---

## Bagian 1: Panduan Deployment cPanel (1 Node.js App Slot)

### 1. Struktur Direktori Lokal Proyek

Di komputer lokal, kedua repositori (backend & frontend) dinaungi di bawah 1 root folder yang sama:

```text
/test-deploy/ (Root Project)
├── nest-backend-boilerplate/  <-- Repo 1: NestJS Backend
├── next-frontend-boilerplate/ <-- Repo 2: Next.js Frontend
├── app.js                     <-- Master Gateway
├── server-cpanel.js           <-- Next.js Server Khusus cPanel
├── package-master.json        <-- Config Dependencies Gateway
└── build-cpanel.sh            <-- Script Otomatis 1-Click Build & Pack
```

---

### 2. Perintah 1-Click Build, Copy Assets, & Pack (`build-cpanel.sh`)

Anda dapat menjalankan script otomatis [`build-cpanel.sh`](file:///c:/Users/HP/Test%20Intern/test-deploy/build-cpanel.sh) atau jalankan perintah gabungan berikut di terminal Git Bash / WSL dari root folder proyek:

```bash
bash build-cpanel.sh
```

Atau jalankan perintah cepat manual ini di terminal:

```bash
# 1. Build Backend & Frontend
(cd nest-backend-boilerplate && npm run build) && \
(cd next-frontend-boilerplate && npm run build) && \

# 2. Siapkan Folder Staging
rm -rf dist-cpanel deploy-cpanel.tar.gz && \
mkdir -p dist-cpanel/backend dist-cpanel/frontend && \

# 3. Copy Backend & Master Gateway Files
cp app.js dist-cpanel/app.js 2>/dev/null || true && \
cp package-master.json dist-cpanel/package.json 2>/dev/null || true && \
cp nest-backend-boilerplate/.env dist-cpanel/.env 2>/dev/null || true && \
cp -R nest-backend-boilerplate/dist dist-cpanel/backend/dist && \
cp nest-backend-boilerplate/package*.json dist-cpanel/backend/ && \
cp -R nest-backend-boilerplate/prisma dist-cpanel/backend/prisma 2>/dev/null || true && \

# 4. Copy Frontend Files & Assets
cp -R next-frontend-boilerplate/.next/standalone/* dist-cpanel/frontend/ && \
mkdir -p dist-cpanel/frontend/public dist-cpanel/frontend/.next/static && \
cp -R next-frontend-boilerplate/public/* dist-cpanel/frontend/public/ 2>/dev/null || true && \
cp -R next-frontend-boilerplate/.next/static/* dist-cpanel/frontend/.next/static/ && \
cp server-cpanel.js dist-cpanel/frontend/server-cpanel.js 2>/dev/null || true && \

# 5. Kompres Seluruh Proyek Menjadi 1 File deploy-cpanel.tar.gz
tar -czhvf deploy-cpanel.tar.gz -C dist-cpanel .
```

> 🔥 **Keuntungan:**
> Anda tidak perlu lagi membungkus folder backend dan frontend secara terpisah. Cukup upload **HANYA 1 FILE (`deploy-cpanel.tar.gz`)** ke cPanel!

---

### 3. Struktur Akhir Hasil Ekstrak di cPanel

Ketika file `deploy-cpanel.tar.gz` di-upload dan di-extract di cPanel pada folder aplikasi (misal `/home/user/app`), strukturnya langsung rapi dan otomatis siap jalan:

```text
/home/user/app/
├── app.js               <-- Master Gateway
├── package.json         <-- Gateway Dependencies
├── .env                 <-- Environment Variables
├── backend/
│   ├── dist/
│   │   └── main.js
│   ├── package.json
│   └── prisma/
└── frontend/
    ├── .next/
    ├── public/
    ├── server-cpanel.js <-- File Entry Point Next.js cPanel
    └── server.js
```

---

### 4. File Logging & Entry Point Next.js (`server-cpanel.js`)

File [`server-cpanel.js`](file:///c:/Users/HP/Test%20Intern/test-deploy/server-cpanel.js) dirancang khusus untuk cPanel Phusion Passenger:
- Menangani Socket/Named Pipe `PORT` bawaan cPanel tanpa error `parseInt`.
- Menulis log aplikasi otomatis ke file `app-debug.log` (sehingga mudah di-debug via File Manager tanpa SSH).
- Otomatis membaca file `.env` di cPanel.

---

### 5. Master Gateway Server (`app.js`)

File [`app.js`](file:///c:/Users/HP/Test%20Intern/test-deploy/app.js) di root folder aplikasi cPanel bertugas menggabungkan NestJS dan Next.js:

```javascript
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { spawn } = require('child_process');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Jalankan NestJS Backend secara internal di Port 3002
const backendProcess = spawn('node', [path.join(__dirname, 'backend/dist/main.js')], {
  env: { ...process.env, PORT: '3002' },
  stdio: 'inherit',
});

// 2. Jalankan Next.js Standalone Frontend secara internal di Port 3001
const frontendProcess = spawn('node', [path.join(__dirname, 'frontend/server-cpanel.js')], {
  env: { ...process.env, PORT: '3001', HOSTNAME: '127.0.0.1' },
  stdio: 'inherit',
});

process.on('exit', () => {
  backendProcess.kill();
  frontendProcess.kill();
});

// 3. Proxy request API & Documentation ke NestJS Backend (Port 3002) tanpa menghapus path
app.use(
  createProxyMiddleware({
    target: 'http://127.0.0.1:3002',
    changeOrigin: true,
    pathFilter: (pathname) => {
      return (
        pathname.startsWith('/api-docs') ||
        pathname.startsWith('/api') ||
        pathname.startsWith('/auth') ||
        pathname.startsWith('/product') ||
        pathname.startsWith('/user')
      );
    },
  })
);

// 4. Proxy request lainnya ke Next.js Standalone Frontend (Port 3001)
app.use(
  '/',
  createProxyMiddleware({
    target: 'http://127.0.0.1:3001',
    changeOrigin: true,
  })
);

app.listen(PORT, () => {
  console.log(`Master Gateway running on port ${PORT}`);
});
```

---

### 6. Database Setup dari Lokal (Remote MySQL)

1. Buka menu **MySQL Databases** di cPanel, buat Database dan User MySQL baru.
2. Buka menu **Remote MySQL** di cPanel, tambahkan IP publik komputer lokal Anda.
3. Di komputer lokal, sesuaikan file `.env` di `nest-backend-boilerplate`:
   ```env
   DATABASE_URL="mysql://db_user:password@cpanel_host_atau_ip:3306/db_name"
   ```
4. Jalankan perintah migrasi & seed dari lokal:
   ```bash
   npx prisma db push
   npx prisma db seed
   ```

---

### 7. Langkah Upload & Ekstrak di cPanel

1. **Upload File Singel**:
   Upload file **`deploy-cpanel.tar.gz`** ke cPanel File Manager pada folder aplikasi (misal `/home/user/app`).
2. **Ekstrak**:
   Klik kanan file `deploy-cpanel.tar.gz` ➡️ **Extract**.
3. **Setup Node.js App di cPanel**:
   - Buka menu **Setup Node.js App**.
   - Masukkan **Application Root**: `app`
   - Masukkan **Application Startup File**: `app.js`
   - Klik **Create** lalu klik **Run npm install**.
   - Klik **Restart Application**.

---

## Bagian 2: Simulasi Lokal Menggunakan Docker Compose

Terdapat 2 metode simulasi Docker lokal yang dapat Anda gunakan:

### Opsi A: Simulasi 1-Slot Node.js App (Persis Lingkungan cPanel Production) 🌟
Menggunakan **1 Container Node.js (`cpanel_app`)** yang menjalankan Master Gateway `app.js` + **1 Container MySQL**:
- File pendukung: [`docker-compose.cpanel.yml`](./docker-compose.cpanel.yml) & [`Dockerfile.cpanel`](./Dockerfile.cpanel)

Perintah menjalankan:
```bash
# 1. Build & jalankan container
docker-compose -f docker-compose.cpanel.yml up --build -d

# 2. Sync Schema & Seed Database di dalam container
docker exec -w /app/backend cpanel_node_app npx prisma@5.22.0 db push
docker exec -w /app/backend cpanel_node_app npx ts-node prisma/seed.ts
```
- **Web UI & API (via Master Gateway)**: [http://localhost:3000](http://localhost:3000)
- **API Docs**: [http://localhost:3000/api-docs](http://localhost:3000/api-docs)

---

### Opsi B: Simulasi Multi-Container Terpisah (Development Mode)
Menggunakan 2 container terpisah untuk backend (`port 3000`) dan frontend (`port 3001`):
- File pendukung: [`docker-compose.yml`](./docker-compose.yml), [`nest-backend-boilerplate/Dockerfile`](./nest-backend-boilerplate/Dockerfile), [`next-frontend-boilerplate/Dockerfile`](./next-frontend-boilerplate/Dockerfile)

Perintah menjalankan:
```bash
docker-compose up --build -d
```

---
