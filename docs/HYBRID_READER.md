# KataKecil 1.4 — reader hybrid

EPUB dan buku episode biasa sekarang membuka **SecureReaderApp yang sama** dari
Library, tanpa page EPUB tambahan. Kedua komponen reader EPUB lama dihapus.
Toolbar, gesture/keyboard/Back, pagination, tema, ukuran/font/jarak teks, daftar
isi, pencarian dalam bab aktif, penanda, tanda selesai dan progres memakai kode
reader yang sudah ada. Pratinjau privat Studio juga memakai komponen ini.
Tampilan Library tetap rak sampul dan popup buku; tidak menambah tombol Baca.

## EPUB tetap utuh, terbit per episode

Penyimpanan, RLS, RPC, jadwal dan API EPUB v1.3 tetap berlaku. File asli di bucket
privat tidak dipisah menjadi file bab atau record naskah episode. Struktur ZIP/XML
dibaca sementara di memori untuk merender bagian yang sudah terbit. Frontmatter,
prolog, kata pengantar dan penutup tetap dapat diterbitkan melalui Studio.

Adapter sumber mengubah HTML aman dari endpoint EPUB menjadi blok/inline React
bertipe. Reader menggunakan pohon DOM yang sama untuk pengukuran dan tampilan.
Teks panjang tidak dipotong; ilustrasi raster dibatasi ukuran halaman dan memiliki
dimensi intrinsik, dengan pengukuran ulang saat gambar/font siap. Tidak memasukkan
HTML mentah, skrip, CSS penerbit, iframe, resource remote, atau skema URL aktif.
Layout penerbit disesuaikan ke gaya reader; fixed-layout/DRM tetap tidak didukung.
Tautan HTTPS dibuka lewat browser eksternal di Android, jangkar dalam bagian aktif
bisa dilompati; pindah bab menggunakan daftar isi/kontrol bab terbit.

Public adapter hanya mengambil indeks rilis dan satu episode dari API yang
memeriksa izin server. Ia tidak mengunduh EPUB asli. Private preview memakai
unduhan penulis yang sudah diverifikasi hash, membaca satu bagian internal aktif,
dan membersihkan blob URL saat berpindah/keluar. Preview tidak menulis progres,
penanda atau tanda selesai milik pembaca.

Progres baru memakai `kk-secure-progress-<bookId>` untuk kedua format. Metadata
EPUB v1.3 (`kk:epub-last:*`, ratio scroll menurut hash sumber) dimigrasikan saat
bacaan dibuka tanpa progres baru; ratio diterjemahkan ke halaman terdekat sehingga
posisi lama bersifat perkiraan. Progres berikutnya memakai offset teks hasil ukur,
bukan angka halaman yang berubah saat ukuran font berubah. Hash sumber berubah
membatalkan offset lama. Tidak ada naskah/HTML/gambar yang ditulis ke localStorage.
Library membaca progres yang sama, dengan fallback metadata versi sebelumnya.

## Memasang dan membangun

1. `npm ci` dengan Node 24. Isi `.env.local` atau `.env.android.local` memakai
   konfigurasi publik dari `.env.example`. Jangan memasukkan server/private keys.
2. `npm run check`, `npm run test:epub`, `npm run test:crystal`,
   `npm run test:browser`, `npm run test:push`, `npm run test:android`.
3. Android memerlukan JDK 21, SDK 36, build-tools 35/36. Atur `JAVA_HOME` dan
   `ANDROID_HOME`, lalu `npm run build:android` dan di folder `android` jalankan
   `./gradlew assembleDebug assembleRelease --no-daemon`.
4. APK debug ada di `android/app/build/outputs/apk/debug/app-debug.apk`. Release
   pengujian di `android/app/build/outputs/apk/release/app-release.apk`. Paket
   `app.katakecil.mobile`, versionCode 5, versionName `1.4-hybrid`. Build lokal
   memakai signer pengujian yang sama dengan versi 1.3, sehingga bisa upgrade
   tanpa uninstall. Untuk distribusi umum gunakan keystore pemilik yang dikelola
   sendiri; identitas signer harus tetap sama untuk pembaruan berikutnya.
5. `npm run release:web` memvalidasi APK release sebenarnya, menyiapkan
   `releases/KataKecil.apk` + `latest.json`, lalu build Vite. Versi APK baru
   ditawarkan dari manifest web setelah paket yang ditinjau dipasang ke hosting;
   konfirmasi pemasangan Android tetap diperlukan, tanpa uninstall.

Reader hybrid tidak memerlukan migration baru di luar aktivasi EPUB v1.3 yang
sudah direncanakan. Proyek live yang diaudit belum memasang backend EPUB;
lihat `EPUB_UPDATE.md`. Migrasi Web Push terpisah ada di `WEB_PUSH_SETUP.md`.
Vercel tetap frontend dan API EPUB; Web Push sepenuhnya Edge Functions + Cron.
Tidak ada deploy atau SQL produksi otomatis di build/workflow QA/APK.

Website dan APK dibangun dari source UI yang sama; APK memuat aset lokal, tanpa
server.url. Membaca tetap online, dan tidak ada cache/sinkronisasi offline baru.
Notifikasi lokal/WorkManager Android v1.3 dipertahankan. Push browser Edge belum
diaktifkan di produksi dan tidak sama dengan layanan FCM native.
