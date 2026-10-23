# KataKecil — Library & Writer Studio

Versi Android 1.1-crystal (versionCode 2), paket `app.katakecil.mobile`.
Perubahan dikerjakan pada cabang lokal `feat/crystal-library`. Tidak ada push,
deploy Vercel, perubahan record produksi, migrasi, atau perubahan kebijakan Auth/RLS.

## Antarmuka

- Beranda menjadi satu Library. Ketuk sampul/kartu untuk membuka reader. Tidak
  ada tombol Baca terpisah, carousel, atau deretan fitur katalog besar.
- Tema, warna, dan tipografi mengikuti reader; kaca digunakan pada bilah navigasi
  dan dialog. Reader, progres lokal, pilihan tema, dan URL lama dipertahankan.
- Tata letak padat: karya dan buku berjajar dua kolom pada ponsel yang cukup
  lebar, pencarian/filter satu baris, ringkasan horizontal, panel berjarak rapat.
  Lebar 320px menyesuaikan kolom agar tulisan tidak terjepit. Reader tetap nyaman.
- Studio disusun ulang: Karya, Impor, Jadwal sebagai navigasi utama; alat lain
  melalui menu. Halaman awal menampilkan karya, bukan dashboard statistik.
- Setiap karya memiliki tab Bab, Halaman buku, dan Pengaturan. Penerbitan massal
  dan pengelolaan beberapa karya ditutup sampai dibutuhkan. Konfirmasi tindakan
  destruktif tetap berlaku.
- Editor berupa satu lembar dengan judul dan naskah besar; status simpan, riwayat,
  preview, toolbar, serta pemeriksaan penerbitan tetap tersedia. Form karya dan
  halaman buku memiliki penjagaan perubahan yang belum disimpan.
- Logo buku/bulu kristal baru tersedia dalam PNG, ikon adaptive, ikon PWA,
  favicon, splash sistem, dan transisi startup singkat. Transisi menghormati
  reduced motion dan memiliki batas waktu; tidak menunggu koneksi.

## Notifikasi Android

Buka menu Library → Notifikasi, atau Pengaturan Studio → Atur notifikasi.
Semua pilihan mati secara default. Izin Android diminta setelah pengguna
memilih mengaktifkan fitur atau mengirim notifikasi uji.

1. **Pengingat membaca**: notifikasi lokal setiap hari pada waktu yang dipilih.
   Menggunakan alarm tidak presisi, tanpa izin exact alarm atau pengecualian
   baterai. Android dapat menunda waktunya.
2. **Kabar bab baru**: WorkManager memeriksa metadata publik secara berkala
   (interval minimum 15 menit). Pemeriksaan pertama membentuk baseline senyap.
   Pengetukan notifikasi membuka bab terkait. Menonaktifkan pilihan membatalkan
   pekerjaan pemeriksaan.

Kabar bab baru ini **bukan push langsung FCM**. Belum ada Firebase/backend push
yang dikonfigurasi atau dipasang di produksi. Android mengatur jadwal, dapat
menunda karena Doze/penghemat baterai, dan tidak menjalankan pekerjaan selama
aplikasi di-force-stop. Tidak ada jaminan notifikasi seketika. Pemeriksaan hanya
mengambil hingga 1.000 buku publik dan 200 metadata bab terbaru; bukan sistem
sinkronisasi seluruh riwayat. Buku/bab privat tidak digunakan. Tidak ada token
akun, isi naskah, kontak, lokasi, atau service-role key dalam pekerjaan ini.

## Build web dan Android

Prasyarat: Node 24, JDK 21 lengkap, Android SDK platform 36, build tools 35.0.0
dan 36.0.0. Minimum Android API 24 dengan Android System WebView 111+.

```sh
npm ci
cp .env.example .env.android.local
# Isi URL Supabase dan PUBLIC publishable/anon key proyek yang sudah ada.
# Jangan gunakan service_role atau secret key.
npm run check
npm run test:crystal
npm run test:android
npm run test:browser
npm run android:apk
```

Hasil utama: `android/app/build/outputs/apk/release/app-release.apk`. Salin dengan
nama `KataKecil.apk`. Build ini tidak debuggable, tetapi ditandatangani sertifikat
pengujian lokal yang sama dengan APK awal agar pembaruan dapat mempertahankan
data aplikasi. Ini bukan sertifikat rilis Play Store. Kunci privat tidak
disertakan dalam ZIP. Build dari komputer/CI lain biasanya memakai sertifikat
debug berbeda, sehingga tidak dapat memperbarui instalasi lama secara langsung.

Untuk kunci rilis milik sendiri, sediakan variabel environment:
`KATAKECIL_KEYSTORE` (path absolut), `KATAKECIL_STORE_PASSWORD`,
`KATAKECIL_KEY_ALIAS`, `KATAKECIL_KEY_PASSWORD`. Simpan kunci di luar repositori.
`npm run android:debug` tetap menghasilkan debug APK untuk diagnosis.

Set `ANDROID_HOME` atau `android/local.properties` lokal dengan `sdk.dir`.
Sesudah mengubah frontend, selalu jalankan build dan `cap sync android` lagi.
Konfigurasi Capacitor memakai `webDir: dist`, tanpa `server.url` produksi.
Native build menonaktifkan service worker; PWA web tetap dipertahankan.

Untuk web: salin `.env.example` menjadi `.env.local`, isi konfigurasi publik,
lalu `npm run build`. Hasil website ada di `dist/`. ZIP source mencakup React,
TypeScript, aset, proyek Android, workflow, dan dokumentasi; tidak menyertakan
node_modules, credential lokal, build cache, atau keystore. Tidak ada perubahan
yang otomatis dipublikasikan ke website produksi.

## GitHub Actions

Workflow manual **Android APK** pada `.github/workflows/android-debug.yml`
menginstal Node/JDK/SDK, menjalankan pemeriksaan, build Vite, sync Capacitor,
build debug dan release pengujian, memverifikasi tanda tangan, dan mengunggah
artifact `KataKecil-testing`. Atur Actions repository variables
`VITE_SUPABASE_URL` dan `VITE_SUPABASE_PUBLISHABLE_KEY` dengan konfigurasi publik.
Workflow tidak melakukan deploy atau perubahan database. Workflow disediakan
dalam source dan belum dijalankan di GitHub.

## Instalasi dan batas pengujian

Transfer APK ke ponsel, buka berkas, lalu ikuti izin pemasangan Android.
Alternatif: `adb install -r KataKecil.apk`. Jangan uninstall versi lama jika
ingin mempertahankan sesi dan pengaturan lokal. Android memerlukan signer sama
untuk update.

Tanda tangan valid dan pemeriksaan permission bukan sertifikasi Play Protect.
Hasil Play Protect hanya dapat diketahui melalui pemeriksaan Google pada
perangkat; tidak dijamin atau diklaim lolos. Lihat `CRYSTAL_TEST_REPORT.md` untuk
pemisahan uji otomatis, keterbatasan emulator, dan daftar pemeriksaan ponsel.
