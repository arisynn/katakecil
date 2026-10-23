# KataKecil 1.3/1.4 — EPUB utuh, terbit per episode

Versi 1.4 menyatukan reader EPUB dan episode biasa; lihat [reader hybrid](HYBRID_READER.md).

EPUB disimpan sebagai **satu berkas asli** dalam bucket privat `book-epubs`.
Studio membaca struktur buku untuk membuat **metadata** episode: nomor, judul,
penunjuk bagian internal, status dan jadwal. Tidak ada teks EPUB yang disalin ke
`qr_episodes`, tidak ada berkas bab hasil ekstraksi, dan tidak ada unggahan folder.
Pembacaan ZIP/XML sementara di memori tetap diperlukan untuk menampilkan EPUB.

## Alur pemakaian

1. Studio → Impor → pilih `.epub`. EPUB otomatis memakai alur utuh; ZIP/MD/TXT
   tetap memakai alur episode lama. EPUB di dalam ZIP ditolak dengan petunjuk
   memilih berkas `.epub` langsung, agar tidak terkonversi diam-diam.
2. Periksa judul, genre, sinopsis dan daftar bagian. Simpan privat.
3. Halaman buku menyediakan pratinjau EPUB privat dan kontrol padat per bagian:
   **Draf / Terbit / Terjadwal**, tanggal/jam WIB, lalu Simpan.
4. Atur sampul dan aktifkan **Tampilkan novel di perpustakaan** di pengaturan buku.
   Visibilitas buku dan status rilis episode sama-sama harus mengizinkan pembacaan.
5. Beranda tetap rak sampul. Popup buku memuat episode yang sudah terbit dan
   jadwal berikutnya. Mengetuk episode membuka reader utama yang sama dengan buku episode biasa,
   lengkap dengan tema, pengaturan teks, navigasi halaman, penanda dan progres lokal.

Kata pengantar, prolog, halaman pembuka dan penutup tidak dibuang otomatis.
Semuanya muncul di Studio untuk dipilih penerbitannya. Jika belum diterbitkan,
judul dan isinya tidak muncul di daftar publik. Daftar isi EPUB 2 (NCX) dan EPUB 3
didukung. Urutan mengikuti isi buku, termasuk beberapa jangkar bab dalam satu
XHTML. Tanpa daftar isi yang memadai, setiap dokumen bacaan internal menjadi
satu bagian; periksa daftar sebelum menerbitkan.

Konfirmasi pindah ke Sampah untuk buku, episode, dan halaman buku memakai popup
internal sesuai tema, termasuk pembatalan, tombol Kembali/Escape, dan retry.
Pemulihan satu item dari Sampah juga memakai popup internal.

Mengganti EPUB membuat unggahan baru yang tidak menimpa file lama. Setelah
konfirmasi, metadata episode/jadwal diganti secara atomik dan semua kembali
menjadi draf. Balasan jaringan yang hilang dapat dicoba lagi dengan path yang
sama tanpa membuat buku atau rilis ganda. Penggantian dari sesi yang usang ditolak.
Buku lama yang sudah memiliki episode tidak otomatis dikonversi ke mode EPUB.

## Aktivasi pada lingkungan tujuan

**Belum ada SQL, deploy Vercel, atau perubahan data yang dijalankan ke produksi.**
Paket ini menyiapkan implementasinya untuk ditinjau dan dipasang.

1. Gunakan database pengujian dengan migrasi KataKecil yang sudah ada. Tinjau lalu
   terapkan migrasi tambahan
   `supabase/migrations/20261023112934_intact_epub_books.sql`.
   Migrasi menambah empat tabel, bucket privat, indeks, kebijakan untuk objek baru,
   dan pengaman format. Tidak mengubah kebijakan autentikasi atau record yang ada.
2. Pasang source **beserta** `api/epub-episode.ts` dan `server/epub/` pada runtime
   Node/Vercel yang mendukung Web Request/Response. ZIP `dist` statis saja tidak
   menyediakan endpoint EPUB ini.
3. Isi variabel **server saja**, tidak memakai awalan `VITE_`:

   ```text
   SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   SUPABASE_PUBLIC_KEY=sb_publishable_REPLACE_ME
   SUPABASE_SERVICE_ROLE_KEY=SERVER_ONLY_REPLACE_ME
   EPUB_SITE_ORIGIN=https://YOUR_WEB_DOMAIN
   ```

   Secret/service-role key tidak boleh dimasukkan ke React, APK, `.env.local`
   frontend, Git, atau ZIP publik. Gunakan pengelola variabel server. Endpoint
   mengizinkan origin situs yang dikonfigurasi dan `https://localhost` Capacitor.
4. Browser memakai API pada origin situsnya. APK secara default menghubungi
   `https://katakecil.vercel.app/api/epub-episode`. Jika target berbeda, set
   `VITE_EPUB_API_ORIGIN` sebelum build. Ini URL publik, bukan kredensial.
5. Uji login penulis, unggah, penerbitan, jadwal, unpublish, Sampah, akses anonim
   ke file asli yang harus ditolak, serta instalasi pada ponsel sebelum rilis.

Endpoint mengecek rilis dengan client Supabase **publik** dan waktu server sebelum
membaca sumber menggunakan client server. Sumber privat diverifikasi ukuran dan
SHA-256-nya; hanya bagian yang diminta yang dirender dan dikirim. Status terbit
dan versi sumber diperiksa lagi sesudah render. Respons `no-store`; file lengkap,
URL privat, token, daftar bab mendatang, dan kunci server tidak dikirim ke pembaca.
HTML disusun ulang memakai daftar tag/atribut aman. Skrip, CSS penerbit, formulir,
iframe, SVG aktif dan sumber daya remote dibuang. Reader hybrid membangun ulang isi sebagai node React bertipe; tidak ada
iframe, injeksi HTML, CSS penerbit atau eksekusi skrip. Tidak ada sistem unduh/offline novel baru.

Bucket asli **tidak pernah publik**. Jangan menambahkan policy baca anonim atau
mengganti endpoint dengan URL unduh EPUB lengkap: itu membuka bab belum terbit.
Halaman yang sudah dibaca tidak dapat ditarik kembali dari ingatan/perangkat
pembaca; penarikan terbit mencegah permintaan berikutnya.

## Build dan pemeriksaan

```sh
npm ci
npx playwright install chromium
npm run check
npm run test:epub
npm run test:browser
npm run test:crystal
npm run test:push
npm run test:android
```

Web: isi konfigurasi browser publik, lalu `npm run build`.
Android: Node 24, JDK 21, Android SDK 36 dan build tools diperlukan.

```sh
npm run build:android
cd android
./gradlew assembleRelease assembleDebug --no-daemon
```

Hasil: `android/app/build/outputs/apk/release/app-release.apk` dan
`android/app/build/outputs/apk/debug/app-debug.apk`.
Identitas `app.katakecil.mobile`, versionCode `5`, versionName `1.4-hybrid`.
Untuk paket website dengan unduhan APK dan manifest versi terbaru, kembali ke
root lalu `npm run release:web` setelah build Android berhasil.
Lihat [panduan penandatanganan dan pembaruan](SHELF_UPDATE.md) untuk menjaga
sertifikat yang sama antarversi. Workflow Android ikut menjalankan tes EPUB lokal.

## Batas versi ini

- EPUB teks mengalir UTF-8, maksimal 18 MB, total isi ZIP 70 MB, maksimal 600 bagian.
  DRM, sumber daya terenkripsi, fixed layout dan spine berulang ditolak dengan pesan.
- Ilustrasi internal PNG/JPEG/WebP dibatasi total 2 MB per bagian. Gambar yang tidak
  didukung/dibatasi diberi placeholder. Tampilan mengikuti tema reader, bukan CSS
  asli penerbit. Audio/video, formula MathML dan SVG tidak ditampilkan.
- Belum ada editor isi EPUB. Sunting di editor EPUB lalu unggah penggantinya.
  Jadwal EPUB dikelola di halaman buku; kalender massal lama khusus episode lama.
- Berkas versi lama dan unggahan gagal tetap privat dan perlu pembersihan Storage
  secara terencana. Hapus permanen buku menghapus metadata lewat FK, bukan file asli.
- API membaca sumber di memori per permintaan; belum ada cache hasil render atau
  sinkronisasi offline. Batas respons terender 3,8 MB. Uji beban sesuai koleksi tujuan.
- Metadata rilis EPUB ikut masuk sumber web push dan pemeriksa bab baru Android.
  Push web tetap memerlukan [aktivasi server](WEB_PUSH_SETUP.md); pemeriksaan Android
  bersifat periodik dan mengikuti penjadwalan sistem, bukan FCM seketika.
- Pengujian akun/Storage produksi, pemilih file dan notifikasi pada WebView ponsel,
  gesture Android serta Play Protect memerlukan perangkat/konfigurasi tujuan.
  Tidak ada jaminan atau klaim sertifikasi Play Protect.
