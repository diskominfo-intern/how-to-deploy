# 📌 Catatan Evaluasi & Solusi Deployment cPanel (Next.js + NestJS)

Dokumen ini merangkum seluruh akar permasalahan (ranjau teknis) yang sering terjadi saat melakukan deployment aplikasi fullstack **Next.js + NestJS** di server **cPanel (CloudLinux Phusion Passenger)** beserta solusi tuntasnya.

---

## 🛑 5 Akar Masalah Utama & Solusinya

### 1. Error 503 Service Unavailable (Crash di Gateway `app.js`)
* **Penyebab:** Pada `app.js`, terdapat perintah shell seperti `execSync('fuser -k ...')` atau `lsof` untuk mematikan port sebelum aplikasi jalan. Pada hosting cPanel CloudLinux, akun cPanel **bukan root/sudoers**. Perintah tersebut otomatis diblokir sistem dengan exit code error, sehingga `app.js` crash seketika sebelum server sempat menyala.
* **Solusi (Otomatis & Dinamis):**
  - Gateway pp.js kini dilengkapi fitur alokasi port dinamis (getTwoFreePorts()) yang meminta kernel OS memberikan 2 port acak yang sedang kosong/bebas saat booting. Pengguna tidak perlu menyetel port manual lagi.
  - Opsi override manual tetap tersedia melalui file .env root (FRONTEND_PORT & BACKEND_PORT) jika ingin port spesifik:
    `env
    # Opsional (Default: otomatis mencari port bebas)
    FRONTEND_PORT=39011
    BACKEND_PORT=39012
    ```

---

### 4. Frontend Build Hardcode `localhost:3000` & Loop Redirect 401
* **Penyebab:**
  - Next.js di-build saat variabel `NEXT_PUBLIC_API_URL` masih mengarah ke `http://localhost:3000`. Akibatnya, browser klien di internet mencoba mengirim request ke komputer lokal mereka sendiri.
  - Interceptor Axios memicu `window.location.href = '/login'` setiap kali menerima status response `401`. Saat user gagal login di halaman `/login`, browser mengalami refresh terus-menerus (*infinite reload loop*).
* **Solusi:**
  - Di `src/lib/axios.ts`, gunakan baseURL relatif `/api` di sisi browser (`typeof window !== 'undefined' ? '/api' : ...`), sehingga semua request diarahkan melalui reverse proxy gateway cPanel.
  - Tambahkan proteksi pada interceptor Axios agar tidak me-redirect jika user sudah berada di halaman `/login`:
    ```typescript
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    ```

---

### 5. CORS Backend Kaku & Trailing Slash
* **Penyebab:**
  - Backend menulis whitelist origin secara statis dan menambahkan trailing slash: `'https://magang.makassarkota.go.id/'`. Ketika browser mengirimkan origin tanpa trailing slash (`https://magang.makassarkota.go.id`), NestJS menolaknya dan memicu error CORS.
  - Jika `enableCors()` dibiarkan tanpa parameter (`origin: '*'`), browser akan memblokir request yang membutuhkan *cookie* atau *credentials*.
* **Solusi (Bulletproof CORS):**
  - Implementasikan origin handler dinamis di `src/main.ts`:
    1. Otomatis meloloskan seluruh domain & subdomain `*.makassarkota.go.id`.
    2. Otomatis meloloskan `localhost` di semua port (`3000`, `3001`, `5173`, dll).
    3. Membaca `FRONTEND_URL` dari `.env` dan otomatis menghapus trailing slash (`replace(/\/+$/, '')`).
    4. Meloloskan request non-browser (cURL, Postman, cron job).
    5. Mengaktifkan `credentials: true`.

---

## 📋 Checklist Pra-Deployment ke cPanel
Sebelum mengunggah file `deploy-cpanel.tar.gz` ke cPanel:
1. [ ] Port internal di file `.env` root sudah unik (bukan port umum 3000/3001).
2. [ ] `app.js` bersih dari perintah Linux root (`fuser` / `lsof`).
3. [ ] Script `prepare` di `package.json` menggunakan `husky || true`.
4. [ ] `NEXT_PUBLIC_API_URL` diatur ke `/api`.
5. [ ] CORS backend sudah mengizinkan subdomain `*.makassarkota.go.id` tanpa trailing slash.
6. [ ] Kredensial akun admin/user pada file SQL dump telah diuji validitas hash password-nya.
