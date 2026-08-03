#!/bin/bash
set -e

# ==============================================================================
# SCRIPT PENYESUAIAN NAMA FOLDER BACKEND & FRONTEND
# ==============================================================================
# Script ini secara otomatis memperbarui rute folder di:
# - Dockerfile.cpanel
# - build-cpanel.sh
# - docker-compose.yml
#
# Penggunaan:
#   ./fix-folder-names.sh [nama_folder_backend] [nama_folder_frontend]
#
# Contoh:
#   ./fix-folder-names.sh backend-persuratan frontend-persuratan
# ==============================================================================

# Definisikan nama folder target (Default: backend-persuratan & frontend-persuratan)
BACKEND_DIR="${1:-backend-persuratan}"
FRONTEND_DIR="${2:-frontend-persuratan}"

echo "=========================================================="
echo "🔧 PENYESUAIAN NAMA FOLDER PROJECT CPANEL & DOCKER"
echo "=========================================================="
echo "📌 Backend Target  : $BACKEND_DIR"
echo "📌 Frontend Target : $FRONTEND_DIR"
echo "----------------------------------------------------------"

FILES=("Dockerfile.cpanel" "build-cpanel.sh" "docker-compose.yml")

# Pola nama lama/boilerplate yang sering digunakan
OLD_BACKENDS=("nest-backend-boilerplate" "backend")
OLD_FRONTENDS=("next-frontend-boilerplate" "frontend")

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "📝 Memproses $file..."
    
    # Ganti placeholder backend lama dengan nama folder backend baru
    for old_b in "${OLD_BACKENDS[@]}"; do
      if [ "$old_b" != "$BACKEND_DIR" ]; then
        perl -pi -e "s|\b$old_b\b|$BACKEND_DIR|g" "$file" 2>/dev/null || sed -i "s|$old_b|$BACKEND_DIR|g" "$file"
      fi
    done

    # Ganti placeholder frontend lama dengan nama folder frontend baru
    for old_f in "${OLD_FRONTENDS[@]}"; do
      if [ "$old_f" != "$FRONTEND_DIR" ]; then
        perl -pi -e "s|\b$old_f\b|$FRONTEND_DIR|g" "$file" 2>/dev/null || sed -i "s|$old_f|$FRONTEND_DIR|g" "$file"
      fi
    done

    echo "   ✅ $file berhasil diperbarui."
  else
    echo "   ⚠️ File $file tidak ditemukan, dilewati."
  fi
done

echo "=========================================================="
echo "✅ SELESAI! Semua rute folder telah disesuaikan."
echo "=========================================================="
