# KataKecil V6.6

KataKecil adalah aplikasi baca cerita publik dengan **Studio privat untuk penulis**, dibangun menggunakan React, TypeScript, Vite, Tailwind/CSS, dan Supabase. Desain iOS mobile-first dan dua tema global tetap dipertahankan. Beranda V6.6 menggunakan hero carousel otomatis berdasarkan cerita yang sudah terbit.

## Mulai

```bash
npm install
cp .env.example .env.local
# Isi kredensial publik Supabase pada .env.local
npm run dev
```

Untuk pemeriksaan:

```bash
npm run check:structure
npm run test:current
npm run lint
npm run build
```

**Penting:** jangan menaruh service-role key, naskah privat, atau kredensial rahasia di source frontend. Jangan menghapus/mengulang migrasi database tanpa backup dan audit.

## Struktur dan dokumentasi

- [Arsitektur V6.5](docs/architecture/README.md)
- [Panduan deployment](docs/deployment/README.md)
- [Riwayat versi dan migrasi](docs/archive/README.md)
- [Catatan rilis V6.6](docs/RELEASE_V6.6.md)
- [Riwayat V6.5](docs/RELEASE_V6.5.md)

### Rute

- `/` — beranda publik
- `/cerita` — perpustakaan publik
- `/cerita/:slug` — detail cerita
- `/baca/:slug` — Secure Reader
- `/studio` — dashboard privat, dengan otorisasi Supabase

Tidak ada cerita contoh yang ditambahkan ke database. Saat Supabase tidak dikonfigurasi, konten demo lokal digunakan hanya untuk preview antarmuka.
