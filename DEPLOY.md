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

### 1. Struktur Direktori Lokal Proyek & Skenario Repository Intern

Di komputer lokal, kedua komponen aplikasi (backend & frontend) dinaungi di bawah 1 root folder yang sama:

```text
/test-deploy/ (Root Project)
├── nest-backend-boilerplate/  <-- Repo 1: NestJS Backend
├── next-frontend-boilerplate/ <-- Repo 2: Next.js Frontend
├── app.js                     <-- Master Gateway
├── server-cpanel.js           <-- Next.js Server Khusus cPanel
├── package-master.json        <-- Config Dependencies Gateway
├── build-cpanel.ps1           <-- Script Otomatis 1-Click Build & Pack (Windows)
├── build-cpanel.sh            <-- Script Otomatis 1-Click Build & Pack (Linux/Bash)
└── fix-folder-names.sh        <-- Script Otomatis Penyesuaian Nama Folder Project
```

---

#### 💡 Penanganan 2 Skenario Struktur Repository Intern

Dalam praktik magang, anak intern dapat mengorganisir kodenya dalam 2 cara:

##### **Skenario A: 2 Repository Terpisah (Frontend & Backend Dipisah)**
Jika intern membuat 2 repo terpisah dari template:
1. Gunakan repo `how-to-deploy` ini sebagai wadah deployment.
2. Clone kedua repo intern ke subfolder masing-masing di dalam `how-to-deploy`:
   ```bash
   git clone <URL_REPO_FE_INTERN> next-frontend-boilerplate
   git clone <URL_REPO_BE_INTERN> nest-backend-boilerplate
   ```
3. Jalankan `build-cpanel.ps1` (Windows) atau `bash build-cpanel.sh` (Linux/Git Bash).

##### **Skenario B: 1 Repository Gabungan / Monorepo (misal: `persuratan-diskominfo`)**
Jika intern menyatukan kodenya ke 1 repo yang berisi subfolder `frontend-persuratan/` dan `backend-persuratan/`:
1. Minta intern **menyalin (copy)** file-file pendukung deployment berikut dari `how-to-deploy` ke root project monorepo mereka:
   - `app.js`, `server-cpanel.js`, `package-master.json`, `build-cpanel.ps1`, `build-cpanel.sh`, `fix-folder-names.sh`, `docker-compose.yml`, `docker-compose.cpanel.yml`, dan `Dockerfile.cpanel`.
2. **Jalankan Script Otomatis `fix-folder-names.sh`**:
   Jalankan script ini di terminal Git Bash/Linux untuk memperbarui seluruh rute subfolder di `Dockerfile.cpanel`, `build-cpanel.sh`, dan `docker-compose.yml` secara otomatis:
   ```bash
   ./fix-folder-names.sh backend-persuratan frontend-persuratan
   ```
3. **(Opsional) Penyesuaian Manual Nama Folder**:
   Jika ingin menyesuaikan secara manual:

   * **A. Di File `build-cpanel.ps1` / `build-cpanel.sh`**:
     ```powershell
     # Contoh penyesuaian folder di build-cpanel.ps1:
     Set-Location -Path "backend-persuratan"  # (sebelumnya nest-backend-boilerplate)
     npm run build
     Set-Location -Path ".."

     Set-Location -Path "frontend-persuratan" # (sebelumnya next-frontend-boilerplate)
     npm run build
     Set-Location -Path ".."
     ```

   * **B. Di File `docker-compose.yml` (Simulasi Docker Local)**:
     ```yaml
     backend:
       build:
         context: ./backend-persuratan       # (sebelumnya ./nest-backend-boilerplate)
         dockerfile: Dockerfile
       ...
     frontend:
       build:
         context: ./frontend-persuratan      # (sebelumnya ./next-frontend-boilerplate)
         dockerfile: Dockerfile
       ...
     ```

   * **C. Di File `Dockerfile.cpanel` (Simulasi Docker cPanel 1-Slot)**:
     ```dockerfile
     # Ubah baris COPY folder di Dockerfile.cpanel:
     COPY ./backend-persuratan /app/backend-persuratan
     COPY ./frontend-persuratan /app/frontend-persuratan
     ```

4. Minta intern menjalankan `docker compose up -d` (untuk test Docker lokal) atau `powershell -ExecutionPolicy Bypass -File build-cpanel.ps1` / `bash build-cpanel.sh` (untuk membuat paket `deploy-cpanel.tar.gz`).

---

### 2. Perintah 1-Click Build, Copy Assets, & Pack (`build-cpanel.sh`)

Anda dapat menjalankan script otomatis [`build-cpanel.sh`](file:///c:/Users/HP/Test%20Intern/test-deploy/build-cpanel.sh) atau jalankan perintah gabungan berikut di terminal Git Bash / WSL dari root folder proyek:

```bash
bash build-cpanel.sh
```

Atau jalankan perintah cepat manual ini di terminal:

```bash
# 1. Build Backend & Frontend (Auto-install node_modules jika belum ada)
(cd nest-backend-boilerplate && [ ! -d "node_modules" ] && npm install; npm run build) && \
(cd next-frontend-boilerplate && [ ! -d "node_modules" ] && npm install; npm run build) && \

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
cp -R next-frontend-boilerplate/.next/standalone/. dist-cpanel/frontend/ && \
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

File [`server-cpanel.js`](file:///d:/Intern%20Pangeran/how-to-deploy/server-cpanel.js) dirancang khusus untuk cPanel Phusion Passenger:
- Menangani Socket/Named Pipe `PORT` bawaan cPanel tanpa error `parseInt`.
- Menulis log aplikasi otomatis ke file `app-debug.log` (sehingga mudah di-debug via File Manager tanpa SSH).
- Mendukung *dynamic path resolution* untuk secara otomatis mencari dan memuat `server.js` standalone dari subfolder jika aplikasi berada di dalam direktori turunan.
- Otomatis membaca file `.env` di cPanel.

---

### 5. Master Gateway Server (`app.js`)

File [`app.js`](file:///d:/Intern%20Pangeran/how-to-deploy/app.js) di root folder aplikasi cPanel bertugas menggabungkan NestJS dan Next.js:

```javascript
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Logging File Utama (log.txt) di root folder & endpoint /log
const mainLogPath = path.join(__dirname, 'log.txt');
const logStream = fs.createWriteStream(mainLogPath, { flags: 'a' });

function logGateway(msg) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${msg}\n`;
  console.log(`[GATEWAY] ${msg}`);
  logStream.write(line);
}

// 1. Port Internal Khusus (Dapat diisi via Environment Variables cPanel)
const BACKEND_PORT = process.env.BACKEND_PORT || '39002';
const FRONTEND_PORT = process.env.FRONTEND_PORT || '39001';

// 2. Auto-install backend node_modules & sync database schema jika ada DATABASE_URL
const backendPath = path.join(__dirname, 'backend');
if (fs.existsSync(backendPath) && !fs.existsSync(path.join(backendPath, 'node_modules'))) {
  logGateway("📦 [AUTO-INSTALL] Installing backend node_modules automatically...");
  try {
    execSync('npm install --omit=dev', { cwd: backendPath, stdio: 'inherit', env: process.env });
    logGateway("✅ [AUTO-INSTALL] Backend dependencies installed!");
  } catch (err) {
    logGateway(`⚠️ [AUTO-INSTALL FAILED] Backend npm install: ${err.message}`);
  }
}

// 3. Spawn NestJS Backend (Port 39002) & Next.js Frontend (Port 39001)
const backendScript = path.join(__dirname, 'backend/dist/main.js');
const frontendScript = path.join(__dirname, 'frontend/server-cpanel.js');

const backendProcess = spawn('node', [backendScript], {
  env: { ...process.env, PORT: BACKEND_PORT },
});

const frontendProcess = spawn('node', [frontendScript], {
  env: { ...process.env, PORT: FRONTEND_PORT, HOSTNAME: '127.0.0.1' },
});

process.on('exit', () => {
  try { backendProcess.kill(); } catch (e) {}
  try { frontendProcess.kill(); } catch (e) {}
});

// 4. Rute khusus inspeksi log via browser (/log)
app.get('/log', (req, res) => {
  if (fs.existsSync(mainLogPath)) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    fs.createReadStream(mainLogPath).pipe(res);
  } else {
    res.status(404).send('Log file (log.txt) does not exist yet.');
  }
});

// 5. Proxy rute /api & /api-docs ke NestJS (39002) dan rute web ke Next.js (39001)
const handleProxyError = (serviceName, targetPort) => (err, req, res) => {
  logGateway(`❌ [PROXY ERROR - ${serviceName}] Failed to proxy ${req.method} ${req.url}. Error: ${err.message}`);
  if (!res.headersSent) {
    res.status(502).json({
      error: `Proxy Error (${serviceName})`,
      message: `${serviceName} service on port ${targetPort} is currently starting or unreachable.`,
      details: err.message,
      timestamp: new Date().toISOString(),
    });
  }
};

app.use(
  createProxyMiddleware({
    target: `http://127.0.0.1:${BACKEND_PORT}`,
    changeOrigin: true,
    pathFilter: (pathname) => pathname.startsWith('/api') || pathname.startsWith('/api-docs'),
    onError: handleProxyError('Backend NestJS', BACKEND_PORT),
  })
);

app.use(
  '/',
  createProxyMiddleware({
    target: `http://127.0.0.1:${FRONTEND_PORT}`,
    changeOrigin: true,
    onError: handleProxyError('Frontend NextJS', FRONTEND_PORT),
  })
);

app.listen(PORT, () => {
  logGateway(`🌐 [GATEWAY READY] Master Gateway listening on port ${PORT}`);
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
