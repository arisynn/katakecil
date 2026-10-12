# KataKecil V5 — Mist Blue

**Status saat paket dibuat:** source V5 disiapkan dan diuji secara statis; **belum diterapkan ke Supabase produksi maupun di-deploy ke Vercel**. Jangan menganggap backend sudah selesai hanya karena website baru tampil.

## Apa yang berubah

- Website publik dan Studio memakai Mist Blue/soft glassmorphism; halaman Reader **tidak disentuh**.
- Sampul di seluruh kartu memakai `object-fit: contain`, tidak lagi dipotong saat rasio gambar berbeda.
- Import EPUB/MD/TXT menggunakan `qr_import_manuscript_v5`: novel baru + episode + halaman buku + catatan impor dibuat bersama dalam satu transaksi SQL. Kegagalan berarti semuanya dibatalkan (upload sampul Storage terjadi belakangan dan tidak transaksional).
- Kata pengantar dan halaman depan yang dipilih sekarang disimpan ke `qr_book_sections`. Dapat ditambah dan diedit dari **Studio → Karya → [novel] → Halaman buku**. Halaman tersebut bersifat privat dan **belum ditampilkan di Reader**; Reader dibekukan sesuai permintaan.
- Umpan balik proses penyimpanan, pemeriksaan ulang jumlah catatan di riwayat impor, peringatan sampul gagal terunggah.
- **Hapus lunak** novel, episode, dan halaman buku dengan `qr_trash_item`, **Studio → Sampah** untuk pemulihan. Pemulihan novel privat; episode draft tanpa jadwal lama. **Belum ada tombol hapus permanen.**
- Konfigurasi `supabase/config.toml` untuk endpoint `secure-episode` (public function, server checks visibility + rate limit). Perhatikan Edge Function ini **belum otomatis di-deploy**.

## Wajib sebelum rilis: backup

1. Simpan salinan repository sekarang dan unduh backup database Supabase yang terverifikasi (termasuk full manuscript dan Storage). Periksa apakah backup dapat dipulihkan.
2. Gunakan `supabase/tests/V5_READ_ONLY_preflight.sql` di SQL Editor untuk memeriksa jumlah episode, status, sidik jari konten dan fungsi. Simpan hasil lokal secara aman; jangan publikasi sidik jari naskah.
3. **Jangan menerapkan perubahan frontend sebelum database V5 siap.** UI V5 menggunakan kolom dan RPC yang belum ada di versi lama.

## Urutan aman (staging → preview → production)

1. Periksa skema SQL saat ini, lalu verifikasi perubahan V1–V4 sudah ada **secara fungsional**. Database hasil audit memiliki tabel dan RPC KataKecil, tetapi riwayat `supabase_migrations` tidak mencatat semua file migration repository. **Jangan jalankan `supabase db push` untuk seluruh folder secara membabi-buta.** Pastikan `20261012060000_episode_zero_v43.sql` sudah diterapkan (cek constraint `episode_number >= 0`); bila belum, jalankan *hanya migrasi Episode 0 yang telah direview* setelah backup. Jangan mengulang migrasi lama yang membuat tabel atau data sebelumnya.
2. Pada **staging yang berisi salinan aman**, jalankan `supabase/migrations/20261012170000_katakecil_v5_core.sql`, lalu jalankan `V5_READ_ONLY_preflight.sql` dan uji login Studio, importer 0 episode + kata pengantar, importer 48 episode, impor ke novel lama, Trash/Restore. **Jangan gunakan naskah asli untuk uji coba destruktif.**
3. Pastikan Supabase Secrets `READER_RATE_SALT` terisi **hanya di server**. `SUPABASE_SECRET_KEYS.default` atau legacy `SUPABASE_SERVICE_ROLE_KEY` harus tersedia untuk fungsi. Never put a secret in `VITE_*`.
4. Deploy `supabase/functions/secure-episode/index.ts` dengan **JWT verification disabled**, seperti `supabase/config.toml`: misalnya setelah Supabase CLI terpasang/terautentikasi, `supabase functions deploy secure-episode --project-ref <PROJECT_REF> --no-verify-jwt`. Tidak perlu men-deploy ulang fungsi `secure-reader` lama saat ini.
5. Uji endpoint `secure-episode` dengan novel publik dan episode terbit: `action:index` hanya metadata; episode terbit mengembalikan isi; episode draft, belum waktunya, atau novel privat tidak dapat dibuka; status 429 bila melewati rate-limit. Jangan mengirim data rahasia ke public test logs.
6. Jalankan `npm install` (atau toolchain yang sesuai lockfile), lalu `npm run lint`, `npm run test:v5`, `npm run test:v43`, `npm run test:v45`, dan `npm run build`. Lakukan uji mobile Android dan UI pada Vercel Preview. V5 ZIP tidak mengandung `node_modules`. Lockfile `bun.lock` sumber ternyata tidak cocok dengan `package.json` (termasuk tidak memiliki `jszip`), jadi tidak dibawa ke rilis; jalankan `npm install`, lalu **commit `package-lock.json` baru** agar deploy berikutnya dapat direproduksi.
7. Baru sesudah Preview terbukti mengambil konten hanya lewat fungsi aman, lakukan **stage-2 metadata grants** `supabase/REVIEW_ONLY_stage2_metadata_grants.sql` (atau migrasi staged yang sama, sekali saja) untuk mencabut pembacaan `content_md` lewat Data API. **JANGAN** lakukan langkah ini lebih dahulu: Reader bisa blank bila fungsi belum aktif.
8. Bandingkan jumlah dan hash seluruh `content_md`, `release_at`, dan `is_enabled` sebelum/sesudah. Tidak boleh ada perubahan pada episode yang sudah ada. Rilis frontend Vercel setelah semua pemeriksaan lulus.
9. Bila cutover gagal: rollback Vercel frontend ke commit lama, pulihkan SQL grants stage-2 **hanya sesuai prosedur keamanan**, tetap jaga draft. Jangan rollback migrasi dengan `DROP TABLE` karena dapat menghilangkan halaman buku.

## Catatan penting

- Frontend versi baru membutuhkan migrasi V5. Jika belum diterapkan, impor/Trash/halaman buku akan menampilkan error yang bisa dibaca.
- Tidak ada bukti end-to-end produksi sampai diuji di deployment asli. Dalam lingkungan pengerjaan ini, pemasangan seluruh dependency npm terhambat, jadi full browser/TypeScript/Vite build **belum terverifikasi**.
- Status Secure Read di Supabase saat audit: `secure-reader` ada, `secure-episode` belum ada; direct SELECT `content_md` belum dikunci. Jangan menyebut pekerjaan ini selesai sebelum tahap 4–8.
- Reader styling, halaman, gerakan, dan pagination tidak dimodifikasi pada source V5.

## Perintah verifikasi ringkas

```bash
npm install
npm run test:v5
npm run test:v421
npm run test:v43
npm run test:v45
npm run lint
npm run build
```
