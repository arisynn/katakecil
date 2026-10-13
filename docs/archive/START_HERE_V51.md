# KataKecil V5.1 — Hapus Permanen Aman + EPUB Duplicate-ID Fix

## Status penerapan (12 Oktober 2026)

- **Supabase project `wlckxrricnyiltdfmvdb`:** RPC `qr_permanently_delete_item(text,text,text)` sudah dipasang dan diperiksa. Migrasi bernama `katakecil_v51_permanent_delete_function` diterapkan dengan sukses.
- **Data belum dihapus:** verifikasi sesudah pemasangan: 2 novel, 45 episode, 1 novel di Sampah.
- **Frontend V5.1:** sudah disiapkan dalam ZIP ini; **belum di-push atau di-deploy** ke GitHub/Vercel.
- **Vercel preview / Android / build lengkap:** belum diuji. Perlu verifikasi setelah deploy.

## Tindakan yang perlu dilakukan pemilik website

1. Simpan salinan atau pastikan backup database Supabase tersedia sebelum memakai Hapus Permanen.
2. Upload/push isi source V5.1 ke repositori GitHub yang sama. Tetap pertahankan environment variables Vercel yang sekarang; jangan memasukkan service-role keys ke Vite.
3. Deploy ke Vercel Preview terlebih dulu. Periksa `/studio/sampah` dan `/studio/impor` di HP.
4. Pada Sampah, sekarang ada tombol **Pulihkan** dan **Hapus permanen**. Tombol konfirmasi baru aktif setelah kamu mengetik **judul item yang persis sama**. Penghapusan tidak bisa dipulihkan.
5. Coba impor EPUB sebagai **novel baru (privat)**. V5.1 menghasilkan ID acak per judul dan otomatis mengulang transaksi hanya ketika database secara jelas melaporkan benturan primary key `qr_books_pkey`.
6. Setelah semua berhasil di Preview, promosikan ke Production.

## PENTING: Jangan buang karya hanya untuk memperbaiki impor

Benturan ID `masa-panen` dengan novel yang ada di Sampah **bisa diselesaikan tanpa menghapus data lama**. Impor baru V5.1 menghasilkan ID unik. Gunakan Hapus Permanen hanya bila kamu memang sudah tidak memerlukan novel beserta seluruh episodenya.

## Batasan dan pengamanan

- Hapus Permanen hanya berhasil bila item **sudah dipindahkan ke Sampah** sebelumnya.
- Hanya pengguna terautentikasi yang terdaftar sebagai penulis di `qr_author_members` dapat menjalankan operasi ini.
- Backend memeriksa ID, status Sampah dan kesesuaian judul, bukan hanya mengandalkan tombol UI.
- Hapus Permanen novel akan menghapus episode, halaman buku, pengaturan jadwal, log publikasi, dan riwayat impor novel yang bersangkutan, dalam satu transaksi PostgreSQL.
- **Berkas sampul di Supabase Storage tidak terhapus otomatis**. Itu memerlukan cleanup terpisah karena Storage berada di luar transaksi PostgreSQL.
- Tidak ada perubahan pada `ReaderApp.tsx`, `SecureReaderApp.tsx`, atau stylesheet Reader.

## Status pengujian

- Lulus: `node scripts/test-v421-reader.mjs`
- Lulus: `node scripts/test-v45.mjs`
- Lulus: `node scripts/test-v5.mjs`
- Lulus: `node scripts/test-v51.mjs`
- Lulus: validasi parse TSX/TS file yang berubah.
- Belum diuji: `npm run build` dan `npm run lint` (instalasi dependency tidak tersedia di lingkungan audit).

## Migrasi SQL

File `supabase/migrations/20261012190000_permanent_delete_v51.sql` dimasukkan untuk tracking dan penerapan ke database baru. **Jangan menerapkan ulang secara manual pada proyek Supabase di atas tanpa alasan**, karena RPC tersebut sudah terpasang. SQL bersifat `CREATE OR REPLACE` dan tidak melakukan penghapusan data ketika migrasi dijalankan.
