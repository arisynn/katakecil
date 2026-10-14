# KataKecil V7.2 RC1

Aplikasi membaca cerita dan Studio privat penulis, dengan palet Sapphire, impor ZIP/EPUB/Markdown, dan PWA yang memerlukan internet untuk membaca.

Mulai dari [START_HERE_V72.md](START_HERE_V72.md) untuk urutan migrasi, pemasangan, dan batas pengujian. Paket sumber belum berarti perubahan telah diterapkan ke produksi.

## Menjalankan

Gunakan Node 22.12+ atau Node 24.

```sh
npm ci
cp .env.example .env.local
# Isi URL dan publishable key Supabase milik lingkungan pengujian.
npm run dev
```

## Validasi

```sh
npm run check
npm run audit:v7-theme
npm run audit:v7beta
npm run build
npx playwright install chromium --only-shell
npm run test:browser
```

## Dokumentasi

- [Panduan penulis](docs/v72/PANDUAN_PENULIS.md)
- [Arsitektur dan privasi](docs/v72/ARSITEKTUR_DAN_PRIVASI.md)
- [QA dan deployment](docs/v72/QA_DAN_DEPLOY.md)
- [Audit Supabase](docs/v72/AUDIT_SUPABASE.md)
- [Pembersihan paket](docs/v72/PEMBERSIHAN.md)

Seluruh migrasi database dan tes keamanan aktif dipertahankan. CSS bernomor versi yang masih diimpor aplikasi tetap diperlukan. Jangan menghapusnya hanya berdasarkan nama file.
