# KataKecil V6.9 — Writer Studio Redesign

KataKecil adalah aplikasi baca cerita publik dengan **Studio privat untuk satu penulis**, menggunakan React, TypeScript, Vite, CSS, dan Supabase. Tema global tetap **Arctic Blue** (terang) dan **Midnight Sapphire** (gelap).

V6.9 memprioritaskan pengalaman menulis: dashboard yang langsung menuju draft terakhir, editor kanvas dengan mode fokus dan autosave, pemeriksaan sebelum publikasi, pencarian/filter bab, alur upload tiga langkah, dan navigasi empat tab utama. Seluruh fitur publik V6.8.1 tetap dipertahankan, termasuk Hero Carousel, Lanjut Membaca ringkas, maksimal dua Bab Baru, serta jadwal bab yang benar-benar tersedia.

## Menjalankan

```bash
npm install
cp .env.example .env.local
# Isi URL dan publishable key Supabase pada .env.local
npm run dev
```

## Validasi

```bash
npm run check:structure
npm run test:current
npm run lint
npm run build
```

Pemeriksaan visual opsional menggunakan Python Playwright + Chromium:

```bash
python scripts/fixtures/render-v69.py
```

Fixture hanya menggunakan konten contoh untuk mengecek CSS, bukan data Supabase. Untuk integrasi sebenarnya, uji dengan akun penulis di staging.

## Struktur utama

- `src/features/studio/components/` — dashboard, navigasi, editor, pengelolaan karya.
- `src/pages/ManuscriptImporter.tsx` — importer EPUB/MD/TXT yang menjaga draft dan konflik nomor bab.
- `src/design/v69-writer-studio.css` — penyesuaian Studio untuk dua tema global.
- `src/SecureReaderApp.tsx` — engine Secure Reader lama yang dipertahankan.
- `supabase/` — migrasi, RLS, dan Edge Functions asli.

## Catatan penting

- Studio hanya untuk anggota `qr_author_members` yang terautentikasi. Jangan menaruh service-role key dalam frontend.
- V6.9 **tidak menambah migrasi database**. Untuk jadwal bab publik dari V6.8, migrasi `20261013010000_public_next_chapter_schedule_v68.sql` masih diperlukan bila belum dijalankan.
- Tidak ada naskah atau cover asli yang diganti, dan tidak ada cerita demo yang dimasukkan ke Supabase.
- [Catatan Rilis V6.9](docs/RELEASE_V6.9.md) · [Arsitektur](docs/architecture/README.md) · [Deployment](docs/deployment/README.md)
