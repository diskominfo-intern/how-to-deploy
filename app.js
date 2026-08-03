const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Auto-sync database schema jika DATABASE_URL tersedia
if (process.env.DATABASE_URL) {
  const backendPath = path.join(__dirname, 'backend');
  if (fs.existsSync(path.join(backendPath, 'prisma'))) {
    console.log("🔄 Syncing database schema with Prisma...");
    let retries = 5;
    while (retries > 0) {
      try {
        execSync('npx prisma db push --accept-data-loss', {
          cwd: backendPath,
          stdio: 'inherit',
          env: process.env,
        });
        console.log("✅ Database schema synchronized!");
        break;
      } catch (err) {
        retries--;
        console.warn(`⚠️ Prisma db push failed. Retrying in 3 seconds... (${retries} attempts left)`);
        if (retries === 0) {
          console.error("❌ Failed to push Prisma schema after retries.");
        } else {
          execSync('sleep 3 2>/dev/null || timeout /t 3 2>/dev/null || node -e "setTimeout(()=>{},3000)"');
        }
      }
    }
  }
}

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

// 3. Proxy request /api dan /api-docs ke NestJS Backend (Port 3002)
app.use(
  createProxyMiddleware({
    target: 'http://127.0.0.1:3002',
    changeOrigin: true,
    pathFilter: (pathname) => {
      // Semua rute API backend berawalan /api atau /api-docs
      return pathname.startsWith('/api') || pathname.startsWith('/api-docs');
    },
  })
);

// 4. Proxy request lainnya (Web Pages) ke Next.js Standalone Frontend (Port 3001)
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
