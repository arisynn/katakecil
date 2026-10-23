# Audit dan uji migrasi Web Push — 23 Oktober 2026

Basis: v1.3 `2b19284`, worktree terisolasi `feat/supabase-web-push`.
Working copy dan artefak update sebelumnya tidak ditimpa. Tidak ada push Git,
deploy Vercel/Edge, SQL produksi, perubahan akun, kunci VAPID, atau data cerita.

## Hasil yang dijalankan

| Pemeriksaan | Hasil |
| --- | --- |
| Audit schema/grant Supabase read-only | Dua tabel push dan RPC lama cocok; RLS aktif, akses khusus server. Edge push dan pg_cron/pg_net belum terpasang. Nilai secret/subscription tidak dibaca. |
| `npm run lint`, `check:structure` | Lulus TypeScript frontend/server dan pemeriksaan dependensi sumber. |
| `npm run test:push` | Lulus SQL PostgreSQL lokal/PGlite: data/cursor lama utuh, RLS/grant, ownership, rate limit, claim bertumpuk, lease kedaluwarsa, receipt dan retry sebagian tanpa mengirim ulang buku yang selesai. |
| WebCrypto | Ciphertext asli RFC8291 didekripsi dengan private ECDH klien sintetis; VAPID ES256, Topic stabil, timeout/fetch redirect diperiksa. Fixture VAPID publik tetap, tidak menghasilkan pasangan deployment baru. |
| Deno 2.9.6 | Ketiga entrypoint lolos typecheck dengan frozen lockfile; dua runtime test lulus, termasuk 80 enkripsi/pengiriman fetch sintetis. |
| Service worker | IndexedDB nyata lokal: duplikat serentak, restart/dismiss, rollback saat display gagal, retensi, rute aman dan tanpa cache halaman. |
| Kontrak SQL Cron | Setup idempoten satu job mati setiap 15 menit, Vault lookup, privilege, HTTP bearer, enable/disable. pg_cron/pg_net diganti stub kontrak pada PGlite. |
| `node scripts/test-web-delivery.mjs` | Lulus Playwright: rak/popup/jadwal, 320–1440 px, gelap/terang, promosi APK, opt-in/penolakan/izin/unsubscribe capability lama dan keadaan belum dikonfigurasi. Browser Push API/backend sintetis. |
| `npm run build` | Lulus Vite; tidak ada backend secret masuk frontend/APK. |

Uji menggunakan data/credential sintetis. Uji SQL menjalankan migration asli awal
serta migration tambahan; bukan hanya pemeriksaan regex. Uji browser menemukan
race pada tes penutupan modal ketika async unsubscribe belum selesai; tes kini
menunggu kontrol aktif sebelum Escape, sesuai perilaku UI saat menyimpan.

## Batas verifikasi dan deploy

- Docker tersedia, tetapi ekstraksi image PostgreSQL Supabase melampaui ruang
  storage Docker. Tidak ada container/instance database produksi yang diubah.
  Kontrak SQL Cron teruji; ekstensi dan jadwal pg_cron/pg_net nyata memerlukan
  smoke test staging sebagaimana panduan aktivasi.
- Tidak ada VAPID privat deployment/test subscription nyata atau kredensial penulis
  dipakai. Penerimaan provider, delivery OS, perangkat Android/PWA nyata dan
  notifikasi saat browser ditutup belum diuji.
- Lease + receipt menekan pengiriman ulang sukses parsial; SW receipt menekan
  tampilan ulang. Exactly-once lintas provider/database/browser tidak dapat
  dijamin jika crash berada di sela commit atau storage dihapus.
- Tidak mengubah Auth, reader, impor, sampul, jadwal cerita, EPUB API atau native
  notifications dalam commit migrasi. Advisory Supabase juga menunjukkan masalah
  RLS pada tabel lain yang sudah ada; tidak diubah karena di luar lingkup push.
  [Panduan advisory RLS](https://supabase.com/docs/guides/database/database-linter?lint=0013_rls_disabled_in_public).
- Workflow `web-push-check.yml` hanya QA, tanpa jadwal/deploy/secret produksi.
  Pengirim baru harus diaktifkan setelah pengirim lama dihentikan; panduan
  `WEB_PUSH_SETUP.md` menjelaskan cutover dan rollback yang mempertahankan data.
