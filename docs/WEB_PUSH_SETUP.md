# Push web — aktivasi server terpisah

Kode tersedia dan diuji lokal; push **belum diaktifkan di produksi**. Tidak ada
langganan pembaca asli yang dibuat atau notifikasi langsung yang dikirim dalam
pengujian. Jangan menganggap tombol atau service worker saja sudah cukup untuk
mengirim push.

## Arsitektur

Browser meminta izin hanya setelah pengguna mengaktifkan pilihan Notifikasi web.
Browser menyimpan subscription Push API dan capability acak 256 bit. API satu
origin menyimpan subscription privat ke dua tabel baru Supabase. Semua akses
anon/authenticated ke tabel dan RPC ini ditolak; hanya server memakai secret.
Capability di-hash sebelum disimpan dan diperlukan untuk mengubah/menghapus
subscription yang sama. Pendaftaran dibatasi 30 percobaan per kelompok IP/jam;
IP hanya dipakai untuk HMAC, bukan disimpan mentah.

`/sw.js` hanya menerima push dan membuka route pembaca yang tervalidasi. Tidak
memasang PWA, mengintersep request, atau menyimpan halaman/naskah. Manifest PWA
dan UI pemasangan PWA dihapus. Safari iOS biasanya memerlukan instalasi Home
Screen untuk web push; karena alur itu tidak disediakan, browser tersebut dapat
menampilkan keadaan tidak didukung. Situs tetap dapat dipakai untuk membaca.

Pengirim mengambil **metadata episode publik yang sudah terbit** melalui client
Supabase publik/RLS, terpisah dari client server untuk subscription. Tidak pernah
mengambil `content_md` atau token penulis. Pemeriksaan pertama subscription
dimulai pada waktu pendaftaran, sehingga tidak mengirim backlog lama.

## Konfigurasi

1. Tinjau migration tambahan
   `supabase/migrations/20261023101426_web_push_opt_in.sql` dan jalankan pada
   lingkungan uji terlebih dahulu. Migration hanya membuat tabel/index/RPC push
   baru dan tidak mengubah record novel, Auth, atau kebijakan tabel lama. Tidak
   dijalankan oleh build atau workflow APK.
2. Jalankan `node scripts/create-web-push-env.mjs`. Hasilnya
   `.env.web-push.local`, diabaikan Git dan tidak menampilkan kunci di terminal.
   Script menolak menimpa berkas yang sudah ada. Simpan pasangan VAPID untuk
   penggunaan berikutnya; mengganti pasangan kunci memerlukan subscription baru.
3. Isi email pemilik yang valid (`WEB_PUSH_SUBJECT`, format `mailto:`), URL
   Supabase, public key, dan secret/service-role key proyek yang sudah ada.
   Pasang variabel ini hanya di environment server Vercel. Jangan memberi
   awalan `VITE_` pada private key, secret backend, atau dispatch secret.
4. Atur `WEB_PUSH_SITE_ORIGIN` ke origin HTTPS website persis, tanpa trailing
   slash. Sesudah tabel/API terpasang di deployment yang ditinjau, set
   `WEB_PUSH_ENABLED=true`. GET `/api/web-push` hanya mengembalikan status dan
   VAPID public key. Jika konfigurasi hilang/tidak valid, UI menyatakan belum
   diaktifkan, tanpa meminta izin browser.
5. Aktifkan workflow terpisah **Send public chapter web notifications** dengan
   Actions variable `WEB_PUSH_DISPATCH_ENABLED=true`, variable
   `WEB_PUSH_DISPATCH_URL=https://DOMAIN/api/web-push-dispatch`, dan Actions secret
   `WEB_PUSH_DISPATCH_SECRET` yang sama dengan server. Workflow memanggil POST
   terautentikasi setiap 15 menit atau secara manual. Tidak perlu cron Vercel
   berbayar; GitHub Actions dapat menunda jadwal atau menonaktifkan jadwal repo
   yang lama tidak aktif. Penggunaan hosting/Actions tetap mengikuti akunmu.
6. Uji dengan browser/perangkat uji sendiri setelah memberi izin, kemudian bab
   uji publik yang memang boleh diterbitkan. Tidak ada endpoint publik untuk
   mengirim pesan bebas ke semua pembaca.

Untuk menjalankan API bersama frontend lokal, gunakan `vercel dev` dengan
environment server yang benar dan origin uji HTTPS yang sesuai. `npm run dev`
sendiri menyediakan frontend; tanpa API, keadaan notifikasi belum aktif adalah
hasil yang diharapkan. Tes otomatis memakai PostgreSQL lokal/backend sintetis:

```sh
npm run lint
npm run test:push
node scripts/test-web-delivery.mjs
```

## Batas MVP

- Ini push browser sungguhan dengan Web Push/VAPID, tetapi deteksi episode
  dilakukan lewat pemeriksaan server berkala, bukan webhook saat transaksi
  publish. Tidak menjamin notifikasi seketika atau tampil saat perangkat offline.
- Setiap pemanggilan mengklaim hingga 50 subscription, lima pengiriman paralel,
  dengan lease database untuk mencegah pekerjaan bersamaan memproses baris sama.
  Maksimal 100 metadata episode dibaca per subscription per batch, memakai cursor
  waktu dan UUID. Backlog dilanjutkan pada batch berikutnya.
- Satu pesan terbaru per buku per batch. Kegagalan sementara mempertahankan cursor
  untuk dicoba lagi; kegagalan sebagian dapat menghasilkan pengiriman ulang,
  memakai tag episode yang sama. Endpoint 404/410 dihapus. Data rate limit yang
  kedaluwarsa dibersihkan dari tabel push sendiri.
- Publikasi dengan waktu rilis sengaja dimundurkan ke sebelum cursor dapat tidak
  terdeteksi. Alur publish normal yang memakai waktu kini dan episode terjadwal
  didukung. Tidak ada trigger baru pada tabel episode produksi.
- Mematikan pilihan menghentikan subscription browser dan meminta penghapusan
  server. Jika request server gagal, endpoint browser tetap dihentikan; data
  server tersisa dibersihkan ketika pengiriman berikutnya mendapat 404/410.
- Kunci service-role adalah akses server yang kuat. Kode memisahkannya dari bundle
  web/APK; pemilik deployment tetap harus menjaga environment server dan kunci
  VAPID. ZIP ini tidak memuat kunci privat atau credential server.
- Push nyata lintas provider/perangkat dan perilaku browser saat ditutup belum
  diuji di lingkungan ini. Uji mock dan kompilasi tidak menggantikannya.
