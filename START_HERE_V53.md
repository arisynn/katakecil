# Cara memasang KataKecil V5.3 dari Termux

Semua perintah dijalankan **dari repo Git yang aman di folder HOME**, bukan dari `/storage/emulated/0`.

Repo bersihmu sebelumnya: `~/katakecil-v51-clean` (ubah bila repo berada di folder lain).

## 1. Ekstrak ZIP yang diunduh

Sesuaikan lokasi ZIP jika browser menyimpannya di folder berbeda:

```bash
mkdir -p "$HOME/katakecil-v53-extract"
unzip -q /storage/emulated/0/Download/KataKecil_V5_3_Reader_First_Mobile.zip \
  -d "$HOME/katakecil-v53-extract"
```

ZIP berisi folder `katakecil-main/` sebagai root source project, tidak mengandung folder `.git` ataupun `.env` rahasia.

## 2. Salin ke repo GitHub yang benar

```bash
cd "$HOME/katakecil-v51-clean"
git rev-parse --show-toplevel
# Pastikan menunjuk ke /data/data/com.termux/files/home/katakecil-v51-clean

git status --short
# Idealnya bersih sebelum menyalin pembaruan.

cp -R "$HOME/katakecil-v53-extract/katakecil-main/." .
git status --short
```

Perintah menyalin/menimpa source yang bernama sama tetapi **tidak menghapus file GitHub lain**. Jangan lakukan `git reset --hard`, `git clean -fd`, ataupun `git push --force`.

## 3. Jalankan tes bawaan

```bash
node scripts/test-v421-reader.mjs
node scripts/test-v5.mjs
node scripts/test-v51.mjs
node scripts/test-v53.mjs
node scripts/verify-public-build.mjs
```

Untuk verifikasi lengkap, bila instalasi paket berhasil di Termux:

```bash
npm install
npm run lint
npm run build
```

## 4. Commit hanya file V5.3

```bash
git add -- \
  src/App.tsx \
  src/pages/PublicLibrary.tsx \
  src/pages/Studio.tsx \
  src/components/public/PublicHeader.tsx \
  src/components/ThemeToggle.tsx \
  src/hooks/useUiTheme.ts \
  src/design/v53-mobile.css \
  public/assets/v53 \
  scripts/test-v53.mjs \
  package.json \
  START_HERE_V53.md \
  RELEASE_V5.3.md

git diff --cached --check
git diff --cached --stat
git commit -m "feat: KataKecil V5.3 Reader First mobile light dark"
git push origin main
```

Jika push ditolak karena remote berubah, jangan gunakan `--force`; periksa `git fetch origin` dan riwayat commit terlebih dahulu.

## 5. Vercel Preview / production

- Periksa status Ready, lalu buka preview di Android Chrome.
- Pastikan Beranda, Perpustakaan, Detail, About dan Studio terlihat sesuai target.
- Ubah light/dark website, lalu buka Reader. **Preferensi baca tetap independen.**
- Lihat checklist pada `RELEASE_V5.3.md` sebelum promosi ke production.

**Tidak perlu migrasi SQL/Edge Function baru untuk V5.3.**
