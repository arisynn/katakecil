# Studio Penulis baru

Status 24 Oktober 2026. Source `8.0.0-rc.1`, cabang `feat/studio-rebuild`,
berangkat dari commit `d9a9bc2cd43f02d31f17e4aaff4639924c920598`.

## Alur penulis

- **Karya** berisi daftar cerita dan tombol Tambah cerita. Di dalam satu cerita,
  tab Isi, Rilis, dan Detail menangani pengelolaan.
- **Tulis** adalah halaman tersendiri, dengan editor visual, simpan otomatis,
  riwayat revisi, pemulihan draf perangkat, dan pratinjau pembaca. Mode Markdown
  tersedia melalui tombol MD.
- **Upload** menerima satu EPUB, ZIP berisi naskah, beberapa TXT/MD sekaligus,
  atau teks yang ditempel. Tahapannya Sumber → Periksa isi → Simpan atau rilis.
  Pratinjau menampilkan masalah, urutan, jenis bagian, pilihan duplikat, dan
  alat lanjutan untuk memecah atau menggabungkan bagian.
- **Rilis** memakai alur yang sama untuk semua format. Pilih terbit sekarang,
  jadwal WIB, atau simpan draf. Aturan mingguan dapat memuat beberapa bab pada
  hari yang sama, misalnya Kamis satu bab dan Minggu dua bab pukul 19.00 WIB.
- **Lainnya** menampung pengaturan, pengumuman, statistik, sampah buku, dan ekspor.
  Sampah bagian tersedia dari daftar isi cerita.

Jenis bagian terpisah dari nomor tautan pembaca: Bab, Prolog, Epilog, Halaman buku,
dan Pembatas. Halaman pengantar atau hak cipta tidak memperoleh label BAB 1.
Mengubah urutan atau jenis tidak mengganti identitas bagian dan tautan bacanya.
Judul dan isi disimpan terpisah; naskah naratif kosong atau hanya berisi judul
ditandai dan ditolak saat rilis. Baris narasi yang kebetulan memuat kata judul
tetap dipertahankan.

## Penyimpanan dan pembaca

Model kanonis berada di `qr_studio_*`. Isi draf, snapshot revisi, sumber asli,
dan tanda terima operasi bersifat privat untuk penulis. Metadata bagian terbit
dan ringkasan jadwal mempunyai kebijakan baca tersendiri. Tidak ada body draf
di bundle web atau service worker.

Menyimpan revisi membuat snapshot baru. Versi terbit menunjuk snapshot yang
tetap, sehingga menyunting draf tidak langsung mengganti bacaan publik.
Penerapan revisi dijalankan dari ruang Kelola/Rilis. RPC memeriksa nomor revisi
yang diharapkan; konflik perangkat tidak menimpa isi akun secara diam-diam.
UUID operasi dan tanda terima database membuat percobaan ulang aman ketika
respons berhasil hilang. Upload menyimpan pekerjaan dan berkasnya di IndexedDB
agar dapat dilanjutkan setelah halaman dimuat ulang. Pemulihan perangkat
memerlukan penyimpanan browser tersedia; status simpan akun tetap ditampilkan.

EPUB disimpan utuh dalam bucket privat. Indeks mengikuti urutan dokumen dan
jangkar EPUB, termasuk bab yang melintasi beberapa dokumen. Halaman semantik
EPUB dikenali sebagai halaman buku. Berkas asli diverifikasi dengan SHA-256
dan ukuran byte ketika dibaca. Layanan hanya mengembalikan rentang yang sudah
terbit, membersihkan HTML, memblokir skrip dan gambar pelacak, lalu memeriksa
ulang status rilis sebelum merespons. Pratinjau dan pembaca memakai renderer
yang sama. EPUB terkunci DRM dan tata letak tetap ditolak dengan penjelasan;
struktur ambigu masih perlu ditinjau penulis.

Ekspor ZIP mencakup isi, seluruh revisi yang masih tersimpan, metadata rilis,
dan sumber asli yang dirujuk. Pembacaan revisi dipaginasi agar tidak terpotong
oleh batas 1.000 baris API. ZIP ini merupakan salinan naskah dan metadata;
pemulihan seluruh keadaan database melalui satu tombol belum disediakan.

## Status pemasangan yang sudah dilakukan

Proyek Supabase tujuan: `wlckxrricnyiltdfmvdb`.

| Komponen | Status |
| --- | --- |
| Migrasi `20261023234835_studio_workspace.sql` | Sudah diterapkan |
| Migrasi `20261023235008_studio_revision_schema_access.sql` | Sudah diterapkan |
| Edge `book-content` versi 1 | ACTIVE; pembaca Studio baru |
| Edge `secure-episode` versi 3 | ACTIVE; kompatibilitas bacaan teks |
| Edge `web-push-dispatch` versi 2 | ACTIVE; mengenali rilis Studio baru |
| Aktivasi buku ke model kanonis | Belum; jumlah aktual masih 0 |
| Source antarmuka di GitHub | Belum dipush; kredensial tulis tidak tersedia |
| Deploy antarmuka Vercel | Belum; akses tim mengembalikan 403 |

Jangan menjalankan kedua migrasi di atas lagi pada proyek ini. Nama file lokal
disamakan dengan versi yang tercatat di riwayat migrasi server. Migrasi akses
schema hanya memberi `USAGE` pada `kk_private` kepada `authenticated`, sehingga
helper revisi lama yang sudah memeriksa identitas penulis dapat dipanggil.
Tidak ada pemberian akses tabel privat tambahan.

Simulasi transaksi pada data asli memindahkan dua buku dengan 81 bagian,
termasuk 36 bagian EPUB, dan menemukan nol perubahan body naskah naratif.
Transaksi simulasi di-rollback. Pemeriksaan setelahnya memastikan 45 episode
lama dan 36 rilis EPUB lama tetap ada, serta tabel rilis kanonis masih kosong.

Saat penulis pertama membuka antarmuka baru, Studio mengadopsi buku lama secara
atomik. Identitas, jadwal, sumber EPUB, dan riwayat privat dipertahankan. Pembaca
baru harus tersedia sebelum membuka Studio baru pada akun produksi: setelah
adopsi, kebijakan publik lama sengaja tidak lagi menyajikan salinan yang usang.
Klien EPUB lama memerlukan pembaruan; APK baru belum dibangun dalam pekerjaan ini.
Setelah adopsi, rollback antarmuka saja tidak cukup. Utamakan perbaikan maju;
jika perlu pemulihan database, ekspor pekerjaan baru dan gunakan snapshot
sebelum adopsi yang sudah diverifikasi.

## Menyelesaikan pemasangan antarmuka

1. Berikan akses tulis repository `arisynn/katakecil` melalui akun/integrasi yang
   dipakai untuk memasang source. Cabang lokal sudah berisi perubahan lengkap.
2. Gunakan proyek Vercel `katakecil` pada scope `karis-projects-9fbe4cf1` dengan
   akses tim yang sesuai. Paket ini tidak membuat proyek hosting pengganti.
3. Pertahankan `VITE_SUPABASE_URL` dan `VITE_SUPABASE_PUBLISHABLE_KEY` proyek
   tersebut. Variabel publik ini saja yang diperlukan Studio di frontend.
   Pembaca Studio baru memanggil Supabase Edge `book-content` secara langsung;
   tidak membutuhkan secret server baru di Vercel.
4. Build dengan `npm ci` dan `npm run build`; direktori keluaran adalah `dist`.
   Gunakan routing SPA dan konfigurasi hosting yang sudah ada di repository.
5. Setelah deploy, periksa login penulis, adopsi buku, isi/jadwal lama, satu
   unggahan draf, pratinjau, dan pembaca publik. Pemeriksaan penerbitan baru
   sebaiknya memakai buku uji yang memang ditujukan untuk itu.

Edge baru memakai kunci server bawaan Supabase, `READER_RATE_SALT` yang sudah
ada, dan origin dari `WEB_PUSH_SITE_ORIGIN` (default situs KataKecil). Jangan
menaruh kunci server pada variabel Vite. Endpoint Node `/api/book-content`
dipertahankan sebagai adapter kompatibilitas; frontend Studio tidak bergantung
pada adapter itu.

## Verifikasi

Pemeriksaan yang lulus:

- `npm run check`: TypeScript frontend/server, struktur impor dan aset, serta
  14 rangkaian regresi aktif menggunakan PostgreSQL PGlite untuk operasi SQL.
- `npm run build`: build produksi, pemeriksaan tidak adanya naskah privat pada
  source publik, dan pembuatan bundle layanan Edge dari source TypeScript bersama.
- `npm run test:studio:browser`: TXT/MD, EPUB, ZIP, validasi judul saja,
  percobaan ulang upload setelah reload, pemisahan Kelola/Tulis, autosave privat,
  snapshot terbit, halaman buku tanpa nomor bab, serta lebar 360–1.440 px.
  Ekspor diuji melewati 1.000 revisi dan byte EPUB hasil ekspor dibandingkan
  dengan berkas unggahan.
- `node scripts/test-epub.mjs`: urutan EPUB 2/3, jangkar, kelanjutan bab lintas
  dokumen, sanitasi, integritas sumber, dan gerbang rilis/SQL/RLS.
- `npm run test:studio:edge`: pemeriksaan adapter Deno dan dua uji runtime atas
  bundle JavaScript yang benar-benar dipasang: Markdown/snapshot dan EPUB/rentang
  terbit, termasuk penolakan berkas yang berubah.
- `npm run test:push`: regresi notifikasi, receipt service worker, kontrak cron,
  pemeriksaan Deno, dan dua uji runtime WebCrypto. Tidak mengirim notifikasi nyata.
- Pemeriksaan HTTP langsung pada Edge produksi: preflight 204, ID tidak valid
  400, UUID yang tidak terbit 404, serta indeks pembaca lama 200.

Uji browser memakai autentikasi dan Storage sintetis, dengan SQL, RPC, dan
handler bacaan yang sebenarnya. Uji ini tidak menggantikan smoke test login
dan penerbitan pada antarmuka yang sudah dideploy. Pemeriksaan langsung backend
tidak menerbitkan cerita produksi baru.

Advisor tidak menemukan peringatan keamanan pada objek `qr_studio_*` baru.
Advisor performa mencatat indeks baru belum dipakai (belum ada buku aktif),
serta kebijakan SELECT publik/penulis yang beririsan pada katalog, rilis, dan
jadwal. Ini dipertahankan agar penulis dan pembaca yang sudah masuk sama-sama
mendapat akses yang sesuai. Temuan lama pada tabel/fitur lain tidak diubah.
Rujukan: [kebijakan permisif beririsan](https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies)
dan [indeks belum dipakai](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index).

Untuk pengujian lokal, isi `.env.local` dari `.env.example`, lalu:

```sh
npm ci
npm run check
npm run test:studio:edge
npm run test:push
node scripts/test-epub.mjs
npx playwright install chromium
npm run test:studio:browser
npm run build
```

Jika Chromium berada di lokasi khusus, tetapkan
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`. Android memakai source UI yang sama;
build dan pengujian perangkat Android merupakan langkah rilis tersendiri.
