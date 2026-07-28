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
