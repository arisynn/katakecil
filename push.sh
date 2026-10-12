#!/data/data/com.termux/files/usr/bin/bash

set -e

echo "=================================="
echo " KataKecil Smart Push V5.4"
echo "=================================="

# cek folder
if [ ! -f "package.json" ]; then
    echo "ERROR: package.json tidak ditemukan."
    echo "Pastikan jalankan di folder KataKecil."
    exit 1
fi

echo "[1/8] Mengecek Git..."

if [ ! -d ".git" ]; then
    echo "Git repository belum ada."
    git init
fi


# branch ke main
CURRENT_BRANCH=$(git branch --show-current)

echo "Branch sekarang: $CURRENT_BRANCH"

if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "Mengubah branch menjadi main..."
    git branch -M main
fi


# ignore file sampah
echo "[2/8] Memperbarui .gitignore..."

touch .gitignore

grep -qxF ".aistudio/" .gitignore || echo ".aistudio/" >> .gitignore
grep -qxF "*.log" .gitignore || echo "*.log" >> .gitignore
grep -qxF ".env" .gitignore || echo ".env" >> .gitignore
grep -qxF "node_modules/" .gitignore || echo "node_modules/" >> .gitignore


# remote
echo "[3/8] Mengecek remote..."

REMOTE=$(git remote get-url origin 2>/dev/null || true)

if [ -z "$REMOTE" ]; then
    echo "Menambahkan remote GitHub..."

    git remote add origin \
    https://github.com/arisynn/katakecil.git
else
    echo "Remote:"
    echo "$REMOTE"
fi


# sync
echo "[4/8] Mengambil update GitHub..."

git fetch origin main || true


# status
echo "[5/8] Perubahan yang ditemukan:"
echo "--------------------------------"

git status --short


echo "--------------------------------"

read -p "Lanjut commit perubahan ini? (y/n): " CONFIRM

if [ "$CONFIRM" != "y" ]; then
    echo "Dibatalkan."
    exit 0
fi


# add aman
echo "[6/8] Menambahkan file..."

git add \
index.html \
metadata.json \
package.json \
push.sh \
src \
public \
scripts \
supabase \
*.md \
.gitignore


# cek
echo "[7/8] Ringkasan commit:"
git diff --cached --stat


read -p "Commit dan push sekarang? (y/n): " PUSH

if [ "$PUSH" != "y" ]; then
    echo "Commit belum dibuat."
    exit 0
fi


git commit \
-m "KataKecil V5.4 Reader & Studio Upgrade" \
|| echo "Tidak ada perubahan baru."


echo "[8/8] Push ke GitHub..."

git push -u origin main


echo ""
echo "=================================="
echo " SUCCESS"
echo " KataKecil berhasil dipush!"
echo "=================================="
