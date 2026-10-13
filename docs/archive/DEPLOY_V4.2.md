# Deployment aman KataKecil V4.2 (Supabase + Vercel + Termux)

**Migrasi pada database aktif tidak dijalankan ketika ZIP ini dibuat.** Jangan jalankan SQL secara acak. Atur urutan:

1. **Backup dan pemeriksaan read-only** (Termux, di folder ZIP yang diekstrak):
   ```sh
   pkg install -y postgresql
   bash migrate-secure-v42-termux.sh --check
   ```
   Isi URL PostgreSQL TANPA password dan password di prompt yang tersembunyi. Pastikan 44 episode dan jadwal lama tetap ada; angka masa depan memang akan berkurang seiring berjalannya waktu.
2. **Stage 1** menyiapkan RPC khusus penulis dan limiter, tidak mengubah RLS naskah publik:
   ```sh
   bash migrate-secure-v42-termux.sh --stage1
   ```
   Skrip membuat backup privat dan snapshot episode + jadwal sebelum migrasi, menerapkan satu transaksi, lalu membandingkan snapshot. Jangan unggah file backup `.dump` ke GitHub.
3. **Siapkan Edge Function** `supabase/functions/secure-reader/index.ts` dari perangkat yang bisa menjalankan Supabase CLI (Termux belum tentu mendukung binary Supabase CLI). Perlu login dan akses project yang tepat.
   ```sh
   supabase login
   supabase secrets set READER_RATE_SALT=ISI_NILAI_ACAK_PANJANG --project-ref wlckxrricnyiltdfmvdb
   supabase functions deploy secure-reader --project-ref wlckxrricnyiltdfmvdb --no-verify-jwt
   ```
   Buat nilai acak lokal, contoh: `openssl rand -hex 32`. Jangan kirim nilai aslinya ke chat / git. Edge Function memakai `SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY` sebagai server-side environment di Supabase. Jangan masukkan keduanya sebagai VITE_ public secret. Jika service key tidak tersedia secara default pada project kamu, konfigurasikan **di Supabase Edge Function Secrets saja**. Endpoint tidak akan melayani konten tanpa `READER_RATE_SALT`.
4. **Uji Vercel Preview**, bukan langsung Production. Push branch `v4.2-preview` dan uji pada HP: `/studio/impor` → pilih EPUB dummy → kembali ke browser → status muncul dan bagian terbaca, Studio tidak remount; `/baca/SLUG?episode=1` → potongan pertama tampil, swipe maju melewati akhir potongan mengambil potongan berikutnya. Periksa request melalui Network: panggilan baca publik `secure-reader` seharusnya mengirim satu bagian, bukan isi 44 episode sekaligus. Uji ISBN atau judul lain sebagai novel dummy tanpa publikasi.
5. **Deploy V4.2 frontend ke Production** setelah preview berfungsi dan pastikan di URL Production reader memang memanggil `secure-reader`. Baru lanjut Stage 2. Pada tahap ini API langsung masih bisa mengakses full `content_md`, jadi belum aman sepenuhnya.
6. **Stage 2 (lockdown)** di Termux:
   ```sh
   bash migrate-secure-v42-termux.sh --stage2
   ```
   Perintah ini **akan membuat reader lama V4.1 tidak berfungsi**. Jalankan hanya setelah V4.2 produksi terbukti siap. Meminta dua konfirmasi, membuat backup dan memastikan data episode + jadwal tidak berubah.
7. **Audit sesudah Stage 2**:
   ```sh
   bash migrate-secure-v42-termux.sh --check
   ```
   Target `Status (Stage1|Stage2): 1|1`. Uji metadata publik masih bisa diakses, tetapi `select=content_md` melalui anon API harus ditolak (biasanya HTTP 403 / permission denied). Studio Karisyono harus tetap bisa mengedit dan mengimpor draft: V4 importer menggunakan fungsi owner yang secara eksplisit memeriksa keanggotaan `qr_author_members`, dan editor memuat isi melalui RPC author. Periksa 44 episode serta jadwal lama identik dengan snapshot backup.

### ENV di Vercel

```dotenv
VITE_SUPABASE_URL=https://wlckxrricnyiltdfmvdb.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Kunci service_role dan READER_RATE_SALT **hanya ada di Supabase server secrets**, bukan Vercel frontend / `.env` Vite.

### Batas perlindungan

Pembaca tanpa login tetap dapat membaca episode yang sudah dirilis. Panggilan server mengembalikan paling banyak 1.800 karakter per potongan, dibatasi 120 permintaan/menit per hash pengunjung. Ini mitigasi sederhana, bukan pencegah scraping total; scraper dapat mengulang permintaan dalam waktu lama atau beralih jaringan. Untuk produksi, tambah rate limit pada CDN/WAF dan pemantauan anomali tanpa menyimpan data pembaca berlebihan.

KataKecil tidak dapat menjamin screenshot kosong di browser. Jangan mematikan zoom browser demi aksesibilitas. Proteksi tab tidak aktif hanya mengubah tampilan, bukan menghapus memori jaringan.

### Jika ada kegagalan saat cutover

Jangan langsung mengganti kebijakan RLS atau menghapus data. Gunakan backup dan SQL migrasi untuk memeriksa status. Pulihkan reader dengan redeploy V4.2 yang diuji; rollback SELECT lama hanya opsi darurat terbatas waktu karena membuka kembali akses langsung ke konten publik. Periksa Log Supabase Edge Functions untuk error koneksi/server-side secrets tanpa membagikan credential.
