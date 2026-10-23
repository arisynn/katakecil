# KataKecil 1.2 — rak sampul dan pembaruan aplikasi

Kode dan artefak dikerjakan pada cabang lokal `feat/cover-shelf-apk-web-push`.
Tidak ada push Git, deploy website, migrasi produksi, perubahan akun atau naskah.

## Perubahan yang terlihat

- Library hanya menampilkan sampul. Ponsel memakai tiga kolom; tablet/desktop
  menambah kolom sesuai ruang. Nama buku tetap tersedia untuk pembaca layar.
- Ketuk sampul untuk popup: info ringkas, sinopsis yang bisa diperluas, jadwal
  berikutnya dari RPC metadata publik, dan episode yang sudah terbit. Ketuk
  episode untuk membuka reader. Tidak mengekspos judul/naskah episode mendatang.
- Popup memakai area gulir episode terpisah, pencarian jika daftarnya panjang,
  dan 50 baris per tahap. Escape, Android Back dan tombol tutup mengembalikan rak
  dengan posisi gulir yang sama.
- Pilihan notifikasi Android dipadatkan. Izin tetap atas pilihan pengguna;
  reminder lokal dan pemeriksaan bab native tetap tersedia.
- Ikon Android baru berupa monogram buku/K yang sederhana, dengan adaptive icon,
  splash dan branding yang sama. Minimum Android API 24 dengan WebView 111+.
- Pemasangan PWA di web dihapus. Tidak ada manifest atau dialog Add to Home Screen.
  Ajakan unduh APK muncul di halaman publik, bisa ditutup, dan tidak muncul lagi
  selama tujuh hari. Tidak muncul otomatis di reader/Studio. Menu Unduh APK tetap
  tersedia. PWA yang sebelumnya sudah dipasang tidak bisa dihapus dari OS oleh
  website; pengguna dapat melepas shortcut lama sendiri.

## Pembaruan APK sesuai pilihan pengguna

Aplikasi **mengecek versi dan menawarkan pembaruan**, bukan mengganti bundle
React diam-diam. Sumber default:

`https://katakecil.vercel.app/downloads/latest.json`

Pemeriksaan otomatis saat aplikasi dibuka/aktif kembali dibatasi enam jam.
Pemeriksaan manual tersedia di menu Library dan Pengaturan Studio. Jika versi
lebih baru ditemukan, dialog otomatis ditampilkan saat kembali ke Library agar
tidak mengganggu reader/editor. Pilihan Nanti menunda tawaran otomatis sehari.
Kegagalan jaringan tidak menghalangi startup atau membaca.

Manifest harus menyebut package ID yang sama, versionCode lebih tinggi, URL APK
HTTPS pada origin manifest yang sama, ukuran dan SHA-256 yang valid. Tombol
unduh membuka browser Android. Android tetap meminta izin/konfirmasi pemasangan;
tidak ada pemasangan diam-diam atau izin `REQUEST_INSTALL_PACKAGES` tambahan.
Pembaruan dipasang di atas aplikasi sebelumnya, tanpa uninstall, **jika signing
key dan package ID sama**. Android yang memverifikasi signer saat pemasangan;
aplikasi tidak mengunduh atau memverifikasi seluruh APK sendiri.

Website produksi saat ini belum diperbarui oleh pekerjaan ini. Sampai berkas
rilis dipublikasikan, pemeriksaan otomatis boleh gagal secara senyap dan manual
menyatakan belum tersedia. Tidak ada klaim update sudah aktif di produksi.

## Build dan hosting berkas unduhan

ZIP source menyertakan `releases/KataKecil.apk` dan `releases/latest.json` dari
build terbaru. Untuk build website saja:

```sh
npm ci
cp .env.example .env.local
# Isi konfigurasi publik Supabase yang sudah dipakai website.
npm run build
```

Vite menyalin dua berkas rilis itu ke `dist/downloads/`. Default tombol web menuju
`/downloads/KataKecil.apk`; dapat diganti lewat `VITE_ANDROID_APK_URL` publik.
Origin manifest dapat diganti lewat `VITE_ANDROID_UPDATE_URL` sebelum build APK.
`vercel.json` menyediakan MIME APK, unduhan attachment, no-cache dan CORS publik
pada JSON versi. Route API/download tidak diarahkan ke HTML SPA.

Untuk membuat versi Android baru, naikkan versionCode dan versionName pada
`android/app/build.gradle`, lalu:

```sh
# Prasyarat: Node 24, full JDK 21, SDK 36/build tools 35 dan 36.
cp .env.example .env.android.local
# Isi PUBLIC Supabase URL/key. Jangan isi key server di VITE_.
npm run android:apk
npm run release:web
```

`release:web` mengambil APK hasil kompilasi, membuat SHA-256/manifest versi, lalu
build website. Set `KATAKECIL_PUBLIC_ORIGIN` jika host berbeda. Build Android
**tidak menyalin APK unduhan ke dalam APK**, sehingga tidak ada bundling rekursif.
Capacitor tetap membundel frontend lokal, tanpa `server.url` website.

Publikasikan source/build yang sudah ditinjau sesuai prosesmu. Jangan menimpa
APK di server dengan signer berbeda. Kunci privat tidak ada dalam ZIP.

## Signing dan workflow

APK lokal ini tidak debuggable tetapi menggunakan sertifikat pengujian yang sama
dengan APK sebelumnya. Cocok untuk pembaruan pengujian; bukan rilis Play Store.
Untuk distribusi yang berkelanjutan, kelola signing key milikmu secara privat.
Local Gradle mendukung `KATAKECIL_KEYSTORE`, `KATAKECIL_STORE_PASSWORD`,
`KATAKECIL_KEY_ALIAS`, `KATAKECIL_KEY_PASSWORD`.

Workflow manual Android APK dapat memakai Actions secrets
`APK_SIGNING_KEY_BASE64`, `APK_KEYSTORE_PASSWORD`, `APK_KEY_ALIAS`,
`APK_KEY_PASSWORD`. Tanpa kunci tersebut runner menghasilkan signer debug
sementara; hasilnya biasanya tidak dapat memperbarui instalasi dari runner atau
komputer lain. Workflow juga menghasilkan website ZIP dengan unduhan APK.

## Notifikasi web

Web Push/VAPID disediakan melalui API server dan penyimpanan Supabase privat,
dengan service worker **khusus notifikasi**, tanpa page caching/PWA. Deteksi
episode melalui pekerjaan server berkala; berbeda dari polling Android.
Konfigurasi server dan dua tabel baru **belum dipasang di produksi**. UI
menampilkan belum diaktifkan jika belum dikonfigurasi. Lihat
[WEB_PUSH_SETUP.md](WEB_PUSH_SETUP.md) untuk langkah aktivasi dan batasnya.

Build bukan sertifikasi Play Protect. Perangkat Android, pemasangan pembaruan
di atas versi lama, notifikasi asli, dan hasil Play Protect tetap memerlukan
pengujian ponsel. Lihat [SHELF_TEST_REPORT.md](SHELF_TEST_REPORT.md).
