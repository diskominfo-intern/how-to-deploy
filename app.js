const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// === LOAD ROOT .ENV MANUALLY IN CPANEL ===
try {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split(/\r?\n/).forEach((line) => {
      if (!line || line.trim().startsWith('#')) return;
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        if (!(key in process.env)) {
          process.env[key] = value.trim();
        }
      }
    });
  }
} catch (e) {}


const app = express();
const PORT = process.env.PORT || 3000;

// Logging File Utama (log.txt) di root folder
const mainLogPath = path.join(__dirname, 'log.txt');
const logStream = fs.createWriteStream(mainLogPath, { flags: 'a' });

function logGateway(msg) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${msg}\n`;
  console.log(`[GATEWAY] ${msg}`);
  logStream.write(line);
}

logGateway("=================================================");
logGateway("=== MASTER GATEWAY STARTING ===");
logGateway(`Master PID    : ${process.pid}`);
logGateway(`Assigned PORT : ${PORT}`);
logGateway(`NODE_ENV      : ${process.env.NODE_ENV || 'production'}`);
logGateway(`Directory     : ${__dirname}`);
logGateway("=================================================");

// 1. Verifikasi Keberadaan Path File
const backendScript = path.join(__dirname, 'backend/dist/main.js');
const frontendScript = path.join(__dirname, 'frontend/server-cpanel.js');

logGateway(`[PATH CHECK] Backend script  : ${backendScript} -> ${fs.existsSync(backendScript) ? 'FOUND ✅' : 'NOT FOUND ❌'}`);
logGateway(`[PATH CHECK] Frontend script : ${frontendScript} -> ${fs.existsSync(frontendScript) ? 'FOUND ✅' : 'NOT FOUND ❌'}`);

// Auto-install dependencies backend jika folder backend/node_modules belum ada
const backendPath = path.join(__dirname, 'backend');
if (fs.existsSync(backendPath) && !fs.existsSync(path.join(backendPath, 'node_modules'))) {
  logGateway("📦 [AUTO-INSTALL] Installing backend node_modules automatically...");
  try {
    execSync('npm install --omit=dev --ignore-scripts', { cwd: backendPath, stdio: 'inherit', env: process.env });
    logGateway("✅ [AUTO-INSTALL] Backend dependencies installed!");
  } catch (err) {
    logGateway(`⚠️ [AUTO-INSTALL FAILED] Backend npm install: ${err.message}`);
  }
}

// Auto-sync database schema jika DATABASE_URL tersedia
if (process.env.DATABASE_URL) {
  if (fs.existsSync(path.join(backendPath, 'prisma'))) {
    logGateway("🔄 [PRISMA] Syncing database schema with Prisma...");
    let retries = 5;
    while (retries > 0) {
      try {
        execSync('npx prisma db push --accept-data-loss', {
          cwd: backendPath,
          stdio: 'inherit',
          env: process.env,
        });
        logGateway("✅ [PRISMA] Database schema synchronized!");
        break;
      } catch (err) {
        retries--;
        logGateway(`⚠️ [PRISMA] db push failed. Retrying in 3 seconds... (${retries} attempts left)`);
        if (retries === 0) {
          logGateway("❌ [PRISMA] Failed to push Prisma schema after retries.");
        } else {
          execSync('sleep 3 2>/dev/null || timeout /t 3 2>/dev/null || node -e "setTimeout(()=>{},3000)"');
        }
      }
    }
  }
}

// Port Internal Khusus (Dapat diatur via Environment Variables di cPanel, dengan fallback port default)
// PENTING: Jika ada beberapa app di server yang sama, ubah port ini agar tidak tabrakan!
const BACKEND_PORT = process.env.BACKEND_PORT || '39002';
const FRONTEND_PORT = process.env.FRONTEND_PORT || '39001';

// Status Kesiapan Process
let isBackendAlive = false;
let isFrontendAlive = false;

// -------------------------------------------------------------
// 2. SPAWN BACKEND PROCESS (NestJS - Port 39002)
// -------------------------------------------------------------
logGateway(`🚀 [SPAWN ATTEMPT] Spawning NestJS Backend on internal port ${BACKEND_PORT}...`);
const backendProcess = spawn('node', [backendScript], {
  env: { ...process.env, PORT: BACKEND_PORT },
});

backendProcess.on('spawn', () => {
  isBackendAlive = true;
  logGateway(`✅ [BACKEND SPAWNED SUCCESS] PID: ${backendProcess.pid}`);
});

backendProcess.on('error', (err) => {
  isBackendAlive = false;
  logGateway(`❌ [BACKEND SPAWN ERROR] ${err.stack || err.message}`);
});

backendProcess.on('exit', (code, signal) => {
  isBackendAlive = false;
  logGateway(`🛑 [BACKEND PROCESS EXIT] Code: ${code}, Signal: ${signal}`);
});

backendProcess.stdout.on('data', (data) => {
  const msg = data.toString().trim();
  logGateway(`[BACKEND STDOUT] ${msg}`);
});

backendProcess.stderr.on('data', (data) => {
  const msg = data.toString().trim();
  logGateway(`[BACKEND STDERR] ${msg}`);
});

// -------------------------------------------------------------
// 3. SPAWN FRONTEND PROCESS (Next.js - Port 39001)
// -------------------------------------------------------------
logGateway(`🚀 [SPAWN ATTEMPT] Spawning Next.js Frontend on internal port ${FRONTEND_PORT}...`);
const frontendProcess = spawn('node', [frontendScript], {
  env: { ...process.env, PORT: FRONTEND_PORT, HOSTNAME: '127.0.0.1' },
});

frontendProcess.on('spawn', () => {
  isFrontendAlive = true;
  logGateway(`✅ [FRONTEND SPAWNED SUCCESS] PID: ${frontendProcess.pid}`);
});

frontendProcess.on('error', (err) => {
  isFrontendAlive = false;
  logGateway(`❌ [FRONTEND SPAWN ERROR] ${err.stack || err.message}`);
});

frontendProcess.on('exit', (code, signal) => {
  isFrontendAlive = false;
  logGateway(`🛑 [FRONTEND PROCESS EXIT] Code: ${code}, Signal: ${signal}`);
});

frontendProcess.stdout.on('data', (data) => {
  const msg = data.toString().trim();
  logGateway(`[FRONTEND STDOUT] ${msg}`);
});

frontendProcess.stderr.on('data', (data) => {
  const msg = data.toString().trim();
  logGateway(`[FRONTEND STDERR] ${msg}`);
});

// Cleanup saat exit
process.on('exit', () => {
  logGateway("🛑 [GATEWAY SHUTDOWN] Terminating child processes...");
  try { backendProcess.kill(); } catch (e) {}
  try { frontendProcess.kill(); } catch (e) {}
});

// -------------------------------------------------------------
// 4. ROUTE KHUSUS VIEW LOG VIA BROWSER (/log)
// -------------------------------------------------------------
app.get('/log', (req, res) => {
  if (fs.existsSync(mainLogPath)) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    fs.createReadStream(mainLogPath).pipe(res);
  } else {
    res.status(404).send('Log file (log.txt) does not exist yet.');
  }
});

// -------------------------------------------------------------
// 5. PROXY CONFIGURATION WITH DETAILED ERROR LOGGING
// -------------------------------------------------------------
const handleProxyError = (serviceName, targetPort) => (err, req, res) => {
  logGateway(`❌ [PROXY ERROR - ${serviceName}] Failed to proxy ${req.method} ${req.url} -> http://127.0.0.1:${targetPort}. Error: ${err.message}`);
  if (!res.headersSent) {
    res.status(502).json({
      error: `Proxy Error (${serviceName})`,
      message: `${serviceName} service on port ${targetPort} is currently starting or unreachable.`,
      details: err.message,
      timestamp: new Date().toISOString(),
    });
  }
};

// Proxy /api dan /api-docs ke NestJS Backend (Port 39002)
app.use(
  createProxyMiddleware({
    target: `http://127.0.0.1:${BACKEND_PORT}`,
    changeOrigin: true,
    pathFilter: (pathname) => pathname.startsWith('/api') || pathname.startsWith('/api-docs'),
    onError: handleProxyError('Backend NestJS', BACKEND_PORT),
    on: {
      error: handleProxyError('Backend NestJS', BACKEND_PORT),
    }
  })
);

// Proxy rute web lainnya ke Next.js Frontend (Port 39001)
app.use(
  '/',
  createProxyMiddleware({
    target: `http://127.0.0.1:${FRONTEND_PORT}`,
    changeOrigin: true,
    onError: handleProxyError('Frontend NextJS', FRONTEND_PORT),
    on: {
      error: handleProxyError('Frontend NextJS', FRONTEND_PORT),
    }
  })
);

app.listen(PORT, () => {
  logGateway(`🌐 [GATEWAY READY] Master Gateway listening on port ${PORT}`);
});


