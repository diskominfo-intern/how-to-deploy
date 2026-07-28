Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "STARTING FULL BUILD AND PACKAGING FOR CPANEL DEPLOYMENT" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Build Backend
Write-Host "[1/4] Building NestJS Backend..." -ForegroundColor Yellow
Set-Location -Path "nest-backend-boilerplate"
npm run build
Set-Location -Path ".."

# 2. Build Frontend
Write-Host "[2/4] Building Next.js Frontend (Standalone)..." -ForegroundColor Yellow
Set-Location -Path "next-frontend-boilerplate"
npm run build
Set-Location -Path ".."

# 3. Create Staging Directory
Write-Host "[3/4] Preparing cPanel Staging Directory..." -ForegroundColor Yellow
if (Test-Path "dist-cpanel") { Remove-Item -Recurse -Force "dist-cpanel" }
if (Test-Path "deploy-cpanel.tar.gz") { Remove-Item -Force "deploy-cpanel.tar.gz" }

New-Item -ItemType Directory -Path "dist-cpanel/backend" -Force | Out-Null
New-Item -ItemType Directory -Path "dist-cpanel/frontend" -Force | Out-Null

# Copy Master Gateway files
if (Test-Path "app.js") { Copy-Item "app.js" "dist-cpanel/app.js" }
if (Test-Path "package-master.json") { Copy-Item "package-master.json" "dist-cpanel/package.json" }
if (Test-Path "nest-backend-boilerplate/.env") { Copy-Item "nest-backend-boilerplate/.env" "dist-cpanel/.env" }

# Copy Backend files
Copy-Item -Recurse "nest-backend-boilerplate/dist" "dist-cpanel/backend/dist"
Copy-Item "nest-backend-boilerplate/package*.json" "dist-cpanel/backend/"
if (Test-Path "nest-backend-boilerplate/prisma") { Copy-Item -Recurse "nest-backend-boilerplate/prisma" "dist-cpanel/backend/prisma" }

# Copy Frontend files
Copy-Item -Recurse "next-frontend-boilerplate/.next/standalone/*" "dist-cpanel/frontend/"
New-Item -ItemType Directory -Path "dist-cpanel/frontend/public" -Force | Out-Null
New-Item -ItemType Directory -Path "dist-cpanel/frontend/.next/static" -Force | Out-Null
if (Test-Path "next-frontend-boilerplate/public") { Copy-Item -Recurse "next-frontend-boilerplate/public/*" "dist-cpanel/frontend/public/" }
Copy-Item -Recurse "next-frontend-boilerplate/.next/static/*" "dist-cpanel/frontend/.next/static/"
if (Test-Path "server-cpanel.js") { Copy-Item "server-cpanel.js" "dist-cpanel/frontend/server-cpanel.js" }

# 4. Pack into single deploy-cpanel.tar.gz
Write-Host "[4/4] Packing into single deploy-cpanel.tar.gz..." -ForegroundColor Yellow
tar -czhvf deploy-cpanel.tar.gz -C dist-cpanel .

Write-Host "==========================================================" -ForegroundColor Green
Write-Host "SUCCESS! File 'deploy-cpanel.tar.gz' is ready!" -ForegroundColor Green
Write-Host "Upload ONLY 'deploy-cpanel.tar.gz' to cPanel and Extract!" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
