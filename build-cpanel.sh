#!/bin/bash
set -e

echo "=========================================================="
echo "🚀 STARTING FULL BUILD & PACKAGING FOR CPANEL DEPLOYMENT"
echo "=========================================================="

# 1. Build Backend
echo "📦 [1/4] Building NestJS Backend..."
cd nest-backend-boilerplate
rm -rf dist
if [ ! -d "node_modules" ]; then
    echo "📥 Installing backend dependencies..."
    npm install --legacy-peer-deps
fi
npm run build
cd ..

# 2. Build Frontend
echo "📦 [2/4] Building Next.js Frontend (Standalone)..."
cd next-frontend-boilerplate
rm -rf .next
if [ ! -d "node_modules" ]; then
    echo "📥 Installing frontend dependencies..."
    npm install --legacy-peer-deps
fi
npm run build
cd ..

# 3. Create Staging Directory
echo "📁 [3/4] Preparing cPanel Staging Directory (dist-cpanel)..."
rm -rf dist-cpanel deploy-cpanel.tar.gz
mkdir -p dist-cpanel/backend dist-cpanel/frontend

# Copy Master Gateway files
cp app.js dist-cpanel/app.js 2>/dev/null || true
cp package-master.json dist-cpanel/package.json 2>/dev/null || true
cp nest-backend-boilerplate/.env dist-cpanel/.env 2>/dev/null || true

# Copy Backend files
cp -R nest-backend-boilerplate/dist dist-cpanel/backend/dist
cp nest-backend-boilerplate/package*.json dist-cpanel/backend/
cp -R nest-backend-boilerplate/prisma dist-cpanel/backend/prisma 2>/dev/null || true

# Copy Frontend files
cp -R next-frontend-boilerplate/.next/standalone/. dist-cpanel/frontend/
mkdir -p dist-cpanel/frontend/public dist-cpanel/frontend/.next/static
cp -R next-frontend-boilerplate/public/* dist-cpanel/frontend/public/ 2>/dev/null || true
cp -R next-frontend-boilerplate/.next/static/* dist-cpanel/frontend/.next/static/
cp server-cpanel.js dist-cpanel/frontend/server-cpanel.js 2>/dev/null || true

# 4. Pack into single deploy-cpanel.tar.gz
echo "📦 [4/4] Packing into single deploy-cpanel.tar.gz..."
tar -czhvf deploy-cpanel.tar.gz -C dist-cpanel .

echo "=========================================================="
echo "✅ SUCCESS! File 'deploy-cpanel.tar.gz' is ready!"
echo "👉 Upload ONLY 'deploy-cpanel.tar.gz' to cPanel & Extract!"
echo "=========================================================="