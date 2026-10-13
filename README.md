# KataKecil V6.8 — Minimal Homepage & Jadwal Bab

KataKecil adalah aplikasi baca cerita publik dengan **Studio privat untuk penulis**, dibangun menggunakan React, TypeScript, Vite, Tailwind/CSS, dan Supabase. Desain mobile-first menggunakan dua tema global: **Arctic Blue** dan **Midnight Sapphire**.

Beranda V6.8 berisi empat bagian yang adaptif terhadap data: carousel cerita terbit, Lanjut Membaca yang ringkas, Bab Baru (maksimal tiga episode yang terbit dalam 30 hari terakhir), dan Jelajahi Genre. Jika tidak ada data yang relevan, bagian tersebut disembunyikan.

Jadwal **bab berikutnya** muncul pada carousel dan Informasi Cerita hanya ketika ada episode aktif yang sudah dijadwalkan di Supabase. Yang ditampilkan hanya nomor bab dan waktu terbit WIB, bukan isi atau judul draft.

## Menjalankan aplikasi

```bash
npm install
cp .env.example .env.local
# Isi URL Supabase dan anon key publik dalam .env.local
npm run dev
```

## Migrasi SQL wajib untuk jadwal publik

Sebelum jadwal bab muncul, jalankan **satu migrasi tambahan** berikut pada Supabase SQL Editor / workflow migrasi yang sudah dipakai:

`supabase/migrations/20261013010000_public_next_chapter_schedule_v68.sql`

Fungsi `qr_public_next_chapters()` memakai `SECURITY DEFINER` dengan `search_path` terkunci dan hanya mengembalikan `book_id`, `episode_number`, serta `release_at` dari **episode aktif yang belum terbit** pada buku yang benar-benar publik. RLS untuk isi naskah tidak berubah. Periksa pemilik fungsi adalah role database tepercaya (normalnya `postgres`) sebelum deployment.

Jika migrasi belum dijalankan, website tetap dapat digunakan; jadwal tidak ditampilkan. Tidak ada penjadwalan fiktif, dan tidak ada modifikasi terhadap naskah yang tersimpan.

## Validasi

```bash
npm run check:structure
npm run test:current
npm run test:v68
npm run lint
npm run build
```

Pemeriksaan integrasi Supabase, otorisasi, autosave, dan gesture Reader tetap harus dilakukan pada deployment staging. Jangan menaruh service-role key, naskah privat, atau rahasia dalam frontend.

## Dokumentasi

- [Catatan rilis V6.8](docs/RELEASE_V6.8.md)
- [Arsitektur V6.5](docs/architecture/README.md)
- [Panduan deployment](docs/deployment/README.md)
- [Riwayat versi dan migrasi](docs/archive/README.md)

## Rute

- `/` — beranda publik
- `/cerita` — perpustakaan publik
- `/cerita/:slug` — detail cerita dan jadwal berikutnya
- `/baca/:slug` — Secure Reader
- `/studio` — dashboard privat dengan otorisasi Supabase

Tidak ada cerita contoh yang ditambahkan ke database. Saat Supabase tidak dikonfigurasi, data demo lokal hanya digunakan untuk preview antarmuka.
