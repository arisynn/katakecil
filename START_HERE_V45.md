# KataKecil V4.5 — Secure Read Integration / REVIEW PATCH

**Status: PATCH SIAP REVIEW, BUKAN DEPLOY PRODUCTION.**

ZIP ini **BUKAN** source lengkap. Ini patch yang harus diterapkan ke repository lengkap KataKecil V4.3. Beberapa modul, CSS, file konfigurasi dan test lama tidak ada di ZIP sumber yang diberikan; maka `npm run build` belum bisa dilakukan dari paket ini sendiri. **Jangan unzip dan deploy sebagai repositori baru.**

## Temuan audit tanggal 12 Oktober 2026

Pengamatan read-only pada proyek Supabase **supabase-champagne-umbrella** (project ref `wlckxrricnyiltdfmvdb`):

- 45 episode: 3 released, 41 scheduled, 1 draft; belum ada Episode 0.
- Fungsi `secure-reader` aktif, tetapi `secure-episode` belum ada pada daftar Edge Functions.
- `qr_episodes_episode_number_check` masih `episode_number > 0`.
- `has_column_privilege('anon', ..., 'content_md','SELECT')` adalah TRUE, demikian juga untuk authenticated. RLS masih menyaring episode sesuai publikasi; namun naskah terbit dapat diambil langsung lewat PostgREST.
- `qr_author_get_episodes(integer,integer)` sudah ada dan memeriksa keanggotaan `qr_author_members` sebelum membaca naskah untuk penulis.
- Security Advisor: beberapa tabel non-KataKecil di proyek yang sama tidak mengaktifkan RLS. **Jangan ubah tabel aplikasi lain tanpa audit terpisah.**
- Tidak ada perubahan schema, Edge Functions, content atau jadwal yang dilakukan selama audit ini.

## Isi perubahan v4.5

1. `supabase/functions/secure-episode/index.ts`: menyediakan **metadata index** (`{bookId,action:'index'}`) dan **isi satu episode** (`{bookId,episodeNumber}`), selalu memverifikasi publikasi terhadap Supabase menggunakan jam server dan limiter backend.
2. `src/data/secureReader.ts`: indeks episode dibaca melalui Edge Function juga, sehingga tidak lagi bergantung pada jam perangkat pembaca. Naskah tidak disimpan ke localStorage.
3. `supabase/REVIEW_ONLY_stage2_metadata_grants.sql`: *proposal* penguncian SELECT konten di database, **tidak otomatis dijalankan**. Validasi fitur Studio dahulu dengan source lengkap dan akun penulis.
4. `scripts/test-v45.mjs`: unit mock untuk fungsi publik (Episode 0, indeks tanpa naskah, 404, 429, 503, validasi input, header no-store).
5. `package.json` versi dan test script diperbarui. Tidak ada perubahan desain, gesture, jadwal, atau import EPUB pada patch ini.
6. `supabase/migrations/20261012060000_episode_zero_v43.sql` tetap disertakan dari versi sumber. **Belum dijalankan.**

## Urutan rilis aman

1. **Snapshot**: backup terverifikasi dan snapshot hash `content_md`, `release_at`, `is_enabled`, nomor episode. Pastikan semua 45 episode cocok sesudah tiap tahap.
2. **Gabung source**: gunakan repository penuh, terapkan patch hanya ke file yang dituju, review diff, dan buat branch preview. Jangan overwrite `src` keseluruhan dengan 17 file patch.
3. **Episode 0**: jalankan `migrate-v43-termux.sh --check`, buat backup, dan apply migrasi khusus Episode 0 hanya setelah audit preflight. Tidak diperlukan untuk episode existing yang bernomor >=1, tetapi diperlukan untuk membuat Episode 0.
4. **Function first**: deploy `secure-episode` kode V4.5 dengan `verify_jwt=false` hanya pada fungsi itu. Siapkan server secret `READER_RATE_SALT` (bukan `VITE_*`) dan pastikan secret Supabase server tersedia.
5. **Endpoint test**: uji `action:'index'` metadata only, episode sudah terbit 200, nonterbit 404, novel privat 404, Episode 0 saat ada sampel publik yang memang boleh dipublikasikan, batas akses 429. Konfirmasi pembaca anonim bisa mengakses dengan publishable key.
6. **Frontend preview**: jalankan build + tes lengkap dari repo penuh, deploy ke Vercel Preview, uji mobile 5+ halaman swipe, pindah episode, pengaturan, bookmarks, pencarian, modal Studio, importer EPUB, Android file picker.
7. **Production frontend**: promote frontend setelah preview sukses, sementara SELECT lama masih ada. Pastikan reader menggunakan `secure-episode` dan tidak memiliki jalur pembacaan naskah publik langsung.
8. **Stage 2 TERPISAH**: setelah audit source penuh tidak menemukan komponen `select('*')` publik di `qr_episodes` / query `content_md` non-Studio, terapkan SQL dari folder REVIEW_ONLY secara manual. Pastikan Studio author RPC tetap berhasil. Jika gagal, ROLLBACK privilege saja dari backup grants; jangan rollback isi naskah atau jadwal.
9. **Post-release**: konfirmasi hash seluruh episode, 41 jadwal tetap sama, 3 episode rilis bisa dibaca, 1 draft tidak bocor. Jalankan Security Advisor dan tes jaringan Android.

**Catatan penting**: `verify_jwt=false` bukan berarti Edge Function bebas mengembalikan draft; validasi publikasi harus ditegakkan sepenuhnya di dalam fungsi. `READER_RATE_SALT` hanya dipakai server. Rate limit IP/UA adalah mitigasi penyalahgunaan yang dapat dikalahkan dan bukan mekanisme otorisasi. Gunakan proteksi gateway/WAF jika perlu.

## Testing lokal

Pada REPO LENGKAP dengan Node.js dan dependensi terpasang:

```bash
npm install
npm run test:v45
npm run lint
npm run build
```

Di paket ini, `npm run test:v45` dapat dijalankan setelah `typescript` tersedia, tetapi `lint`/`build` pasti membutuhkan file-file yang tidak ada dalam patch.

## Contoh kontrak API

Request indeks:

```json
{"bookId":"novel-pertama","action":"index"}
```

Response indeks (tanpa naskah):

```json
{"type":"index","episodes":[{"episode_number":1,"title":"Episode 1","arc_title":"Arc I","release_at":"2026-10-01T00:00:00+00:00"}]}
```

Request konten:

```json
{"bookId":"novel-pertama","episodeNumber":1}
```

Response konten: `{ "episodeNumber": 1, "title": "...", "arc": "...", "content": "..." }`.

## Rollback

Jika ada masalah **sebelum Stage 2**, ubah frontend preview/production kembali ke V4.3 dan biarkan fungsi lama `secure-reader` tetap tersedia. Jika Stage 2 sudah diterapkan, pulihkan grant SELECT sesuai snapshot privilege sebelumnya hanya sebagai langkah darurat (membuka paparan naskah publik kembali); lebih baik perbaiki client/RPC lalu tutup lagi. Jangan mengubah status rilis dan konten untuk rollback frontend.

Dokumentasi lengkap mengenai persona, alur, dan acceptance criteria ada di `V45_ARCHITECTURE_AND_TEAM.md`.
