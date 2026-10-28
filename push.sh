#!/usr/bin/env bash

set -e

echo "=================================="
echo " KataKecil Studio Smart Push"
echo "=================================="

if [ ! -f "package.json" ]; then
    echo "ERROR: package.json tidak ditemukan."
    echo "Pastikan jalankan di folder KataKecil-Studio."
    exit 1
fi

echo "[1/7] Mengecek Git..."

if [ ! -d ".git" ]; then
    echo "Git repository belum ada. Menginisialisasi..."
    git init
fi

CURRENT_BRANCH=$(git branch --show-current)
echo "Branch sekarang: ${CURRENT_BRANCH:-main}"

if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "Mengubah branch menjadi main..."
    git branch -M main
fi

echo "[2/7] Memperbarui .gitignore..."
touch .gitignore
grep -qxF ".aistudio/" .gitignore || echo ".aistudio/" >> .gitignore
grep -qxF "*.log" .gitignore || echo "*.log" >> .gitignore
grep -qxF ".env" .gitignore || echo ".env" >> .gitignore
grep -qxF "node_modules/" .gitignore || echo "node_modules/" >> .gitignore
grep -qxF "Studio_Update.bundle" .gitignore || echo "Studio_Update.bundle" >> .gitignore

echo "[3/7] Mengecek remote GitHub..."
REMOTE=$(git remote get-url origin 2>/dev/null || true)

if [ -z "$REMOTE" ]; then
    echo "Menambahkan remote GitHub..."
    git remote add origin https://github.com/arisynn/katakecil.git
else
    echo "Remote: $REMOTE"
fi

echo "[4/7] Mengambil update GitHub..."
git fetch origin main || true

echo "[5/7] Menambahkan file proyek..."
git add \
  .editorconfig \
  .env.example \
  .gitignore \
  index.html \
  metadata.json \
  package.json \
  package-lock.json \
  tsconfig.json \
  tsconfig.server.json \
  vite.config.ts \
  vercel.json \
  capacitor.config.ts \
  push.sh \
  src \
  public \
  api \
  server \
  scripts \
  supabase \
  android \
  docs \
  *.md

echo "[6/7] Ringkasan perubahan:"
echo "--------------------------------"
git status --short
echo "--------------------------------"

read -p "Commit dan push sekarang ke origin/main? (y/n): " PUSH

if [ "$PUSH" != "y" ]; then
    echo "Push dibatalkan."
    exit 0
fi

git commit -m "Update KataKecil Studio: UI Penulis Ringkas & Upload EPUB 1-Layar" || echo "Tidak ada perubahan baru."

echo "[7/7] Push ke GitHub..."
git push -u origin main

echo ""
echo "=================================="
echo " SUCCESS"
echo " KataKecil Studio berhasil dipush!"
echo "=================================="
