# Web Push: Supabase Edge Functions + Cron

Frontend tetap di Vercel. Push memakai tiga Edge Functions dan satu Supabase Cron
15 menit. API Vercel dan workflow pengirim lama sudah dihapus dari source.
**Belum diterapkan ke produksi.** Tidak ada VAPID baru, langganan asli, pengiriman
nyata, perubahan cerita, kebijakan Auth, atau jadwal cerita yang dibuat saat QA.

## Audit dan arsitektur

Audit read-only pada proyek yang cocok dengan konfigurasi frontend mengonfirmasi
`qr_web_push_subscriptions`, `qr_web_push_limits`, RLS dan RPC push lama tersedia.
Kolom/grant sesuai migration awal. pg_cron/pg_net belum aktif dan belum ada Edge
Function push. Tabel EPUB belum terpasang pada proyek itu; buku episode lama tetap
bekerja. Tidak ada isi naskah, endpoint pembaca, atau nilai secret yang diambil.

- `web-push-subscribe`: GET kesiapan + VAPID **publik**, POST opt-in.
- `web-push-unsubscribe`: POST endpoint + capability milik browser.
- `web-push-dispatch`: POST bearer secret khusus Cron, tanpa pesan bebas dari klien.
- Browser menghubungi `${VITE_SUPABASE_URL}/functions/v1/...`, memakai publishable
  key yang sudah ada. Tidak menghubungi API push Vercel.
- Subscription/capability tetap kompatibel: tabel dan key localStorage lama
  dipertahankan. Capability 256-bit di-hash; registrasi dibatasi 30/IP-HMAC/jam.
  Origin diperiksa persis, provider endpoint dibatasi, JSON maksimal 8 KiB.
- `verify_jwt=false` disengaja: pembaca anonim memakai capability, Cron memakai
  bearer secret yang diverifikasi handler. JWT penulis tidak pernah diteruskan ke
  query metadata; RLS publik tetap menentukan episode yang terlihat.
- Hanya metadata buku/episode publik terbit yang dibaca, termasuk rilis EPUB jika
  tabelnya ada. Tidak membaca `content_md`/EPUB asli atau mengubah sistem rilis.
- Pengiriman menggunakan WebCrypto AES128GCM + VAPID dan fetch, kompatibel Deno.
  Subscription di-lease, diurutkan adil, dan memakai cutoff waktu database.

## Konfigurasi server: pindahkan nilai lama, jangan buat ulang VAPID

Simpan environment Edge di berkas lokal yang diabaikan Git, misalnya
`.env.web-push.local` (mode 0600). Isi **nilai asli yang sudah digunakan**:

```dotenv
WEB_PUSH_ENABLED=true
WEB_PUSH_SITE_ORIGIN=https://katakecil.vercel.app
WEB_PUSH_VAPID_PUBLIC_KEY=<existing-public-key>
WEB_PUSH_VAPID_PRIVATE_KEY=<existing-private-key>
WEB_PUSH_SUBJECT=<existing-mailto-subject>
WEB_PUSH_DISPATCH_SECRET=<existing-dispatch-secret-at-least-32-characters>
```

Tidak ada script pembuat VAPID lagi. Memakai pasangan berbeda akan memutus
subscription yang sudah ada. `SUPABASE_URL` dan server keys disediakan runtime
Supabase. Handler mendukung secret/publishable key baru maupun service-role/anon
legacy. Bila public key runtime tidak tersedia, pasang
`WEB_PUSH_SUPABASE_PUBLIC_KEY` dengan publishable key proyek yang sama.
**Jangan memakai awalan VITE_ untuk private key, dispatch secret atau server key.**
Frontend hanya perlu `VITE_SUPABASE_URL` dan `VITE_SUPABASE_PUBLISHABLE_KEY` lama.

## Urutan staging dan cutover

1. Cadangkan konfigurasi/scheduler lama. Cocokkan riwayat migrasi tujuan terlebih
   dahulu; jangan menjalankan ulang migrasi seluruh aplikasi secara membabi buta.
   Tabel push lama tidak perlu dibuat ulang. Tinjau lalu jalankan hanya migration
   tambahan `supabase/migrations/20261023121650_edge_web_push_delivery.sql` pada
   staging. Migration menambah JSON receipt dan empat RPC khusus server; tidak
   mereset subscription/cursor dan tidak menyentuh tabel novel atau Auth.
2. Dari CLI Supabase yang sudah login, targetkan proyek staging secara eksplisit:

   ```sh
   supabase secrets set --env-file .env.web-push.local --project-ref PROJECT_REF
   supabase functions deploy web-push-subscribe --project-ref PROJECT_REF
   supabase functions deploy web-push-unsubscribe --project-ref PROJECT_REF
   supabase functions deploy web-push-dispatch --project-ref PROJECT_REF
   ```

   Config ketiga function sudah `verify_jwt=false`; pengaman berada di handler.
   Deno imports dan lockfile dipin per function. Jangan mengubah function reader.
3. Jalankan `supabase/cron/setup-web-push.sql` sebagai administrator. Ini memasang
   ekstensi yang diperlukan, wrapper privat dan **satu job dalam keadaan mati**.
   Mengulang setup tetap satu job dan menonaktifkannya; aktivasi terpisah.
4. Di dashboard Vault, simpan dua secret bernama
   `katakecil_web_push_project_url` (URL https proyek tanpa trailing slash) dan
   `katakecil_web_push_dispatch_secret` (**nilai sama dengan dispatch secret lama
   dan Edge**). Gunakan editor secret, jangan memasukkan nilainya ke source,
   command history, screenshot atau job SQL. VAPID tetap di Edge secrets.
5. Deploy frontend uji yang telah ditinjau. GET subscribe dengan Origin frontend
   harus menunjukkan `available:true` dan public key lama; Origin lain ditolak.
   Dispatch tanpa bearer/secret salah harus 401. Dengan browser uji sendiri,
   aktifkan izin, tutup/buka kembali browser, lalu nonaktifkan. Uji episode milik
   akun uji di staging, termasuk kegagalan sementara, dua dispatch bersamaan,
   jadwal mendatang, buku privat, EPUB, dan 404/410 provider. Tidak memakai data
   atau endpoint pembaca produksi untuk pengujian.
6. Saat rollout yang ditinjau: **hentikan workflow/GitHub scheduler/Vercel Cron lama
   sebelum mengaktifkan pengirim baru**; tunggu invocation/lease lama selesai
   (lease lama empat menit). Deploy migrasi + Edge + frontend sebagai cutover yang
   dikoordinasikan. Tidak ada kompatibilitas permanen `/api/web-push` di Vercel;
   tab web lama perlu reload untuk subscribe/unsubscribe melalui endpoint baru.
   Subscription lama tetap menerima pesan dari tabel yang sama.
7. Setelah smoke test lolos, jalankan `supabase/cron/enable-web-push.sql`.
   Periksa job `katakecil-web-push-15m`, jadwal `*/15 * * * *`, hasil
   `cron.job_run_details`, respons `net._http_response`, log Edge tanpa secret,
   serta notifikasi pada perangkat uji. Error HTTP tidak otomatis menjadi error
   job Cron karena pg_net asinkron: periksa respons HTTP juga.
8. Hapus konfigurasi secret push lama dari Vercel/Actions hanya setelah masa
   observasi dan rollback selesai. Vercel masih menjalankan API EPUB v1.3;
   penghapusan ketergantungan Vercel pada pembaruan ini khusus **Web Push**.

**Rollback:** jalankan `supabase/cron/disable-web-push.sql` dahulu. Jangan menghapus
subscription/kolom receipt. Kembalikan frontend/API lama jika diperlukan, kemudian
aktifkan hanya pengirim lama. Jangan menjalankan dua scheduler bersamaan.

## Duplikasi dan batas operasional

Receipt keberhasilan disimpan sebelum cursor maju sehingga kegagalan buku kedua
tidak mengulang buku pertama. Lease menolak worker lama; worker memeriksa ulang
visibilitas dan lease sebelum mengirim. Event ID deterministik menjadi Topic
provider, tag notifikasi, dan receipt IndexedDB pada service worker (7 hari,
maksimal 2.048 ID, tanpa naskah). Delivery duplikat ditekan bahkan setelah
notifikasi ditutup atau service worker restart.

HTTP push tidak memiliki transaksi bersama Postgres. Crash sesudah provider
menerima dan sebelum receipt DB tersimpan masih dapat mengulang **transport**;
receipt service worker mencegah tampilan ulang selama tersimpan. Storage browser
yang dihapus/tidak tersedia dan delivery sangat terlambat di luar retensi tidak
memungkinkan jaminan exactly-once. Satu pesan terbaru per buku per batch; bukan
satu pesan untuk setiap bab jika beberapa terbit bersamaan.

Maksimal 50 subscription/claim, 5 worker, 80 send dan anggaran 85 detik per request;
request HTTP ber-timeout. Backlog dilanjutkan melalui cursor/receipt dan lease.
Interval Cron, pembatasan provider dan kebijakan OS memengaruhi keterlambatan.
Waktu publikasi yang sengaja dimundurkan sebelum cursor bisa tidak terdeteksi.
Tidak ada trigger baru, perubahan jadwal cerita, atau sinkronisasi offline.

`sw.js` hanya notifikasi, tanpa cache/fetch handler/PWA installer. Browser Android
Chrome dan PWA yang mendukung Push API memakai standar yang sama. Safari iOS
memerlukan Home Screen; alur instalasi PWA tetap dihapus sesuai v1.3. Capacitor
WebView tidak menyediakan Push API: notifikasi lokal/WorkManager Android v1.3
tetap terpisah dan tidak berubah menjadi FCM otomatis oleh migrasi ini.

## Verifikasi lokal

```sh
npm ci
npm run check
npm run test:push
node scripts/test-web-delivery.mjs
npm run build
```

`test:push` menjalankan SQL PostgreSQL lokal (PGlite), receipt service worker,
kontrak SQL Cron, typecheck tiga function dan uji runtime Deno/enkripsi nyata.
Kontrak Cron memakai stub ekstensi; Docker Supabase PostgreSQL tidak berhasil
dipasang karena batas ruang saat ekstraksi. **Scheduler pg_cron/pg_net terkelola,
pengiriman provider nyata, credentials, dan perangkat nyata harus diuji pada
staging**. Detail hasil ada di `WEB_PUSH_EDGE_TEST_REPORT.md`.
