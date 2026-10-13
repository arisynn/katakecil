# KataKecil V6.8 — Minimal Homepage & Scheduled Chapter Metadata

## Tampilan

- Homepage disederhanakan menjadi hero carousel, compact Lanjut Membaca, Bab Baru, dan Jelajahi Genre.
- Lanjut Membaca kini satu kartu ringkas yang seluruh permukaannya dapat ditekan; tidak ada tombol kedua dengan aksi identik.
- Bab Baru hanya menampilkan hingga 3 episode publik yang terbit dalam 30 hari terakhir; disembunyikan bila kosong.
- Genre hanya berasal dari cerita yang tersedia; bagian promosi Jelajahi Perpustakaan yang besar dihapus.
- Background dekoratif tetap tidak digunakan. Sampul cerita tetap utuh tanpa frame berlapis.
- Warna komponen utama, navigasi, metadata, dan Daftar Bab diselaraskan dengan token biru V6.7 untuk terang/gelap.
- Panel Informasi Cerita diprioritaskan sebelum Daftar Bab di mobile agar jadwal lebih mudah ditemukan.

## Jadwal bab baru

- Hero Carousel dan Informasi Cerita menampilkan waktu rilis berikutnya (WIB) jika ada.
- Sumber data: `qr_public_next_chapters()` dari migrasi SQL baru.
- Hanya mengembalikan nomor episode dan waktu rilis dari episode aktif pada buku publik; tidak membocorkan isi atau judul bab yang belum terbit.
- Tidak ada tanggal fiktif. Jadwal tidak muncul jika belum ada episode terjadwal atau jika migrasi belum diterapkan.
- Saat jadwal mencapai waktu rilis, metadata publik dijadwalkan untuk dimuat ulang.

## Perubahan database

Satu migrasi **additive**:
`supabase/migrations/20261013010000_public_next_chapter_schedule_v68.sql`.

Tidak ada tabel yang diubah dan kebijakan RLS episode tidak dilonggarkan. Terapkan migrasi ini di Supabase sebelum mengharapkan jadwal publik tampil. Pemilik fungsi SECURITY DEFINER harus role tepercaya.

## Pemeriksaan

- `npm run test:current`: lulus, termasuk V6.8 dan regresi Reader/Supabase.
- Sintaks TypeScript/TSX: 55 file, 0 kesalahan parsing.
- Pemeriksaan struktur: lulus.
- Kontras warna token utama: terang teks/card 14,09:1; gelap teks/card 14,38:1.
- `npm run build`: belum berhasil; Vite tidak terinstal di lingkungan kerja (`vite: not found`).
- Screenshot visual Chromium tidak berhasil dijalankan karena browser menolak akses ke fixture lokal (`ERR_BLOCKED_BY_ADMINISTRATOR`).
- Pengujian langsung Supabase, SQL, login, publikasi, autosave, dan gesture Reader masih perlu dilakukan pada staging.

## Tidak diubah

Secure Reader, pagination, pinch, swipe, bookmark, content protection, Supabase Auth, Studio, data cerita, dan aset cover asli.
