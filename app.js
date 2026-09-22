/**
 * ==============================================================================
 * ?? PERINGATAN KERAS / DO NOT MODIFY THIS FILE! ??
 * ==============================================================================
 * File ini adalah Master Gateway cPanel Phusion Passenger.
 * Pemilik / Maintainer: @PangeranJJ4321
 *
 * ATURAN MUTLAK:
 * 1. DILARANG KERAS menambahkan shell command root Linux seperti:
 *    - execSync('fuser -k ...')
 *    - execSync('lsof ...')
 *    - execSync('killall ...')
 *    Akun cPanel BUKAN root/sudoers! Perintah tersebut AKAN MENYEBABKAN
 *    APLIKASI CRASH SEKETIKA DENGAN ERROR 503 SERVICE UNAVAILABLE.
 *
 * 2. DILARANG mengubah port hardcode di dalam file ini.
 *    Semua port WAJIB dikonfigurasi melalui file .env root:
 *    (FRONTEND_PORT, BACKEND_PORT, dll).
 *
 * 3. Developer aplikasi HANYA diperbolehkan koding di dalam folder:
 *    - next-frontend-boilerplate/src/
 *    - nest-backend-boilerplate/src/
 * ==============================================================================
 */
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const net = require('net');

/**
 * Helper to dynamically allocate two distinct available ports from the OS kernel.
 * Completely eliminates EADDRINUSE collisions in shared cPanel environments.
 */
function getTwoFreePorts() {
  return new Promise((resolve, reject) => {
    const s1 = net.createServer();
    s1.unref();
    s1.on('error', reject);
    s1.listen(0, '127.0.0.1', () => {
      const p1 = s1.address().port;
      const s2 = net.createServer();
      s2.unref();
      s2.on('error', (err) => {
        s1.close(() => reject(err));
      });
      s2.listen(0, '127.0.0.1', () => {
        const p2 = s2.address().port;
        s1.close(() => {
          s2.close(() => {
            resolve([p1, p2]);
          });
        });
      });
    });
  });
}

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
let backendScript = path.join(__dirname, 'backend/dist/main.js');
if (!fs.existsSync(backendScript) && fs.existsSync(path.join(__dirname, 'backend/dist/src/main.js'))) {
  backendScript = path.join(__dirname, 'backend/dist/src/main.js');
}
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

// -------------------------------------------------------------
// 2. ROUTE KHUSUS VIEW LOG VIA BROWSER (/log)
// Demi keamanan, hanya aktif di mode non-production (atau jika ENABLE_PUBLIC_LOG=true)
// -------------------------------------------------------------
app.get('/log', (req, res) => {
  const isProduction = (process.env.NODE_ENV || 'production') === 'production';
  const allowLog = process.env.ENABLE_PUBLIC_LOG === 'true';

  if (isProduction && !allowLog) {
    return res.status(404).send('Not Found');
  }

  if (fs.existsSync(mainLogPath)) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    fs.createReadStream(mainLogPath).pipe(res);
  } else {
    res.status(404).send('Log file (log.txt) does not exist yet.');
  }
});

// -------------------------------------------------------------
// 3. ASYNC GATEWAY BOOTSTRAP (Dynamic Port Allocation & Spawning)
// -------------------------------------------------------------
async function startGateway() {
  // Alokasi port internal secara dinamis dari kernel OS
  let dynamicBackendPort = '39002';
  let dynamicFrontendPort = '39001';
  try {
    const [p1, p2] = await getTwoFreePorts();
    dynamicBackendPort = String(p1);
    dynamicFrontendPort = String(p2);
  } catch (err) {
    logGateway(`⚠️ [PORT WARNING] Failed to acquire dynamic free ports: ${err.message}. Falling back to default.`);
  }

  const BACKEND_PORT = process.env.BACKEND_PORT || dynamicBackendPort;
  const FRONTEND_PORT = process.env.FRONTEND_PORT || dynamicFrontendPort;

  logGateway(`🎯 [PORT ALLOCATION] Backend Port  : ${BACKEND_PORT} (${process.env.BACKEND_PORT ? 'Manual ENV' : 'Dynamic Auto-Allocated'})`);
  logGateway(`🎯 [PORT ALLOCATION] Frontend Port : ${FRONTEND_PORT} (${process.env.FRONTEND_PORT ? 'Manual ENV' : 'Dynamic Auto-Allocated'})`);

  // Status Kesiapan Process
  let isBackendAlive = false;
  let isFrontendAlive = false;

  // SPAWN BACKEND PROCESS (NestJS)
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

  // SPAWN FRONTEND PROCESS (Next.js)
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
  const cleanExit = () => {
    logGateway("🛑 [GATEWAY SHUTDOWN] Terminating child processes...");
    try { backendProcess.kill(); } catch (e) {}
    try { frontendProcess.kill(); } catch (e) {}
    process.exit();
  };
  process.on('exit', cleanExit);
  process.on('SIGINT', cleanExit);
  process.on('SIGTERM', cleanExit);

  // -------------------------------------------------------------
  // PROXY CONFIGURATION WITH DETAILED ERROR LOGGING
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

  // Proxy /api, /api-docs, dan /uploads ke NestJS Backend
  app.use(
    createProxyMiddleware({
      target: `http://127.0.0.1:${BACKEND_PORT}`,
      changeOrigin: true,
      pathFilter: (pathname) => pathname.startsWith('/api') || pathname.startsWith('/api-docs') || pathname.startsWith('/uploads'),
      onError: handleProxyError('Backend NestJS', BACKEND_PORT),
      on: {
        error: handleProxyError('Backend NestJS', BACKEND_PORT),
      }
    })
  );

  // Proxy rute web lainnya ke Next.js Frontend
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
}

startGateway().catch((err) => {
  logGateway(`❌ [FATAL BOOT ERROR] ${err.stack || err.message}`);
});



