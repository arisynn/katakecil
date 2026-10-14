# KataKecil V7.0.0-alpha.3 — Studio Pengumuman & Temukan Terintegrasi

**14 Oktober 2026 · Rilis source untuk staging, bukan deployment produksi.** Basis V7.0 Alpha.2.

## Fitur baru

1. **Pengelola Pengumuman Studio** di `/studio/pengumuman`, diakses dari dropdown **Alat Studio** (tidak menambah tab utama). Penulis dapat membuat, menyunting, menjadwalkan, menerbitkan, dan menghapus pengumuman.
2. Form pengumuman memuat judul (1–120 karakter), pesan (maks. 320 karakter), tautan cerita publik opsional, tanggal mulai, tanggal selesai opsional, dan status draft/terbit.
3. **Carousel Temukan** memprioritaskan pengumuman aktif dari Studio, lalu jadwal bab dan bab terbit terbaru. Pengumuman tanpa cerita tidak menampilkan tombol palsu. Jika tidak ada konten yang valid, carousel tidak muncul.
4. Pengumuman yang belum mulai, telah berakhir, atau masih draft tidak ditampilkan ke pembaca. Link cerita privat juga tidak ditampilkan.
5. Pembaruan metadata publik berjalan saat batas jadwal/masa aktif pengumuman tercapai, atau maksimal setiap 10 menit saat aplikasi terbuka.
6. Styling pengelola dan carousel menggunakan token Sapphire global; tidak menambah warna literal. Seluruh sistem Reader V6.12 dan Koleksi Alpha.2 dipertahankan.

## Perubahan database (perlu tindakan manual)

Jalankan migrasi berikut di **Supabase staging** setelah memastikan migrasi V2 (tabel `qr_author_members`, `qr_books`, fungsi `qr_touch_updated_at`) sudah diterapkan:

`supabase/migrations/20261014010000_v7_public_announcements.sql`

Migrasi ini **menambah** tabel `qr_announcements` dengan RLS:
- `anon` / `authenticated`: SELECT pengumuman terbit yang aktif berdasarkan jam server; tautan hanya ke buku publik dan tidak dihapus.
- Akun Studio yang terdaftar pada `qr_author_members`: SELECT semua serta INSERT/UPDATE/DELETE.
- Tidak ada hak untuk menambah anggota penulis melalui frontend.
- Tidak ada akses ke naskah draft, judul bab yang belum terbit, atau konten Reader.
- Tidak mengubah data/struktur `qr_books`, `qr_episodes`, maupun cover asli.

**Tanpa migrasi:** Temukan tetap berjalan dengan jadwal/bab, tetapi pengelola Pengumuman Studio akan menampilkan error yang meminta migrasi. Jangan menerapkan SQL ke produksi sebelum diuji di staging.

## Validasi di lingkungan kerja

- `npm run test:current`: **PASS**, 15 kelompok pengujian kontrak/regresi.
- `npm run test:v7alpha`: **PASS**, 3 kelompok tes Alpha.
- `npm run audit:v7-theme`: **PASS**, warna V7 token-only dan enam pasangan warna WCAG AA.
- `npm run audit:colors`: **PASS** pemeriksaan literal komponen, tetapi **1.115 literal warna di CSS historis** masih ada.
- `npm run check:structure`: **PASS**, 94 file source, 255 referensi lokal.
- Parse/sintaks TS/TSX untuk modul baru: **PASS**.
- `npm run lint`: **BELUM** — definisi tipe `vite/client` tidak tersedia karena dependensi npm tidak terpasang.
- `npm run build`: **BELUM** — `vite: not found`. `npm install` gagal (`EAI_AGAIN` pada registry.npmjs.org).
- Pengujian browser runtime, CRUD Supabase staging, RLS nyata, dan autentikasi nyata: **BELUM DIVERIFIKASI**.

Tes otomatis yang ada memeriksa kontrak source dan fungsi domain, **bukan** pengganti integration test terhadap Supabase atau visual QA runtime.

## Checklist staging sebelum deploy

1. Backup Supabase dan deploy Alpha.3 ke preview branch Vercel.
2. Jalankan SQL migrasi di Supabase staging; verifikasi tabel dan policy RLS dengan akun anon, akun tanpa membership, dan akun penulis.
3. `npm install && npm run lint && npm run build && npm run test:current && npm run audit:v7-theme` di CI dengan akses registry.
4. Login sebagai penulis, buka Alat Studio → Pengumuman. Buat draft, pastikan tidak muncul di Temukan. Terbitkan pengumuman, uji waktu mulai/selesai, edit, hapus.
5. Pastikan pengumuman yang terkait buku privat tidak tampil untuk anon. Jangan gunakan service-role key di frontend.
6. Periksa tampilan 320/375/390/430 px dan desktop dalam light/dark. Uji navigasi, filter Koleksi, Reader pinch/swipe, autosave, dan publikasi.
7. Jika ada regresi, rollback frontend ke Alpha.2. Migrasi tambahan dapat dibiarkan (tidak merusak data), atau dihapus secara terencana setelah backup bila memang diperlukan.

## Belum termasuk

Smart Reader 2.0 lanjutan, Web Push, PWA offline, penyisiran total CSS historis, dan deployment produksi. Jangan menganggap fitur tersebut selesai dalam Alpha.3.
