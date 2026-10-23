# Laporan uji Library & Writer Studio — 23 Oktober 2026

Cabang lokal: `feat/crystal-library`, melanjutkan integrasi Android `7abc69f`
di atas repositori asli `cc9972f`. Tidak ada push, deploy, perubahan record
produksi, pemasangan migrasi, atau perubahan Auth/RLS. Tes penulisan menggunakan
backend sintetis dan PostgreSQL lokal PGlite.

## Hasil yang dijalankan

| Pemeriksaan | Hasil / cakupan |
| --- | --- |
| `npm run check` | TypeScript, struktur/import/aset, 13 suite regresi aktif. |
| `npm run test:browser` | Empat suite browser V7.2–V7.5: reader/preview, EPUB/ZIP, sampul, revisi/konflik, publikasi/jadwal, hapus/pulih dengan database lokal. |
| `npm run test:crystal` | Alur aplikasi sebenarnya dengan backend sintetis: Library, kartu langsung ke reader, bab berikutnya, progres, kembali, login, reload sesi, simpan editor, logout, retry katalog. |
| Studio baru | Tiga navigasi utama, tab karya, penjagaan perubahan pengaturan/halaman buku/karya baru, parser berkas, kalender, seluruh URL alat Studio. Kartu berjajar pada 390px; tanpa overflow horizontal pada lebar yang diuji. |
| Tampilan | Library 320/390/768/1440px dalam kedua tema; editor 320/390/1440px; kalender 320/390/768/1440px; alat Studio 320px. Teks editor minimal 16px dengan line-height minimal 29px. Screenshot juga diperiksa secara visual. |
| `npm run test:android` | Kontrak bridge memakai mock desktop: startup, viewport, tidak mendaftarkan SW native, Back/guard/history/background, external browser, system bars, export share, izin notifikasi ditolak/diterima, jadwal tidak presisi, konfigurasi pekerjaan bab, uji notifikasi, pembatalan. |
| `node scripts/test-bundled-smoke.mjs` | Bundle produksi: Library, inisialisasi konfigurasi Supabase publik, lazy Studio/login, tanpa error JavaScript. Semua request Supabase diintersep; tidak menulis produksi. |
| `npm run build` | Build web Vite berhasil. |
| `npm run build:android` | Validasi konfigurasi publik, build target Chrome 111, penyalinan aset, enam plugin native, `cap sync android` berhasil. |
| Gradle `assembleRelease assembleDebug` | Berhasil lokal dengan JDK 21, SDK 36, AGP 8.13, Gradle 8.14.3. |
| APK | Arsip valid/CRC, manifest Android dan DEX ada, tanda tangan diverifikasi dengan apksigner, metadata dibaca memakai aapt. Seluruh aset `dist` cocok byte per byte dengan aset yang dibundel di APK. |

`KataKecil.apk`: **6.035.632 byte**, package `app.katakecil.mobile`, label
KataKecil, versionCode 2, versionName `1.1-crystal`, min SDK 24, target 36.
Release pengujian **tidak debuggable**. Signer cocok dengan APK debug awal,
sehingga Android dapat memperbaruinya tanpa mengganti identitas aplikasi.

SHA-256:

```text
b245c555a6f252aa6576339d6111da800d423e433eba58d0e3ab901ad94ba4fa
```

Debug terbaru tersedia terpisah sebagai `KataKecil-Crystal-debug.apk`.
`KataKecil-debug.apk` sebelumnya tetap dipertahankan sebagai artefak versi awal.

Permission APK: internet, status jaringan, notifikasi, menerima boot, wake lock,
dan permission internal receiver AndroidX yang tidak diekspor. Tidak ada akses
kamera, kontak, lokasi, storage luas, exact alarm, atau foreground service.
Backup Android dimatikan dan cleartext HTTP ditolak. Tidak ada `server.url`
produksi; frontend dibundel lokal. Tidak ada service-role/privileged key.

Build menampilkan peringatan ukuran chunk CSS dan deprecation Gradle dari
toolchain/dependensi. Build berhasil; peringatan tersebut bukan bukti pengujian
performa pada ponsel.

## Yang belum dapat diklaim berhasil

- **Menjalankan aplikasi di Android asli.** Tidak ada ponsel terhubung atau
  `/dev/kvm`. Percobaan emulator software API 30 gagal boot; percobaan API 35
  tidak menyelesaikan boot setelah sekitar 24 menit lalu dihentikan. Tidak ada
  klaim uji launch, gesture, keyboard, picker, atau splash di perangkat.
- **Akun produksi.** Tidak ada kredensial penulis uji. Login/password, simpan,
  logout dan persistensi reload diuji dengan backend sintetis; sesi setelah
  restart proses Android, expiry nyata, dan operasi Storage/RLS produksi masih
  perlu diuji dengan akun yang sesuai. Tidak ada OAuth/magic-link UI dalam sumber
  yang diaudit; tidak ditambahkan redirect/Auth policy baru.
- **Pemilih berkas WebView.** Input file asli dan parser EPUB/ZIP/MD browser
  diuji. Pemilih Android/Files/Drive, URI `content://`, membatalkan picker, kembali
  dari background, dan penyimpanan hasil ekspor belum diuji di Android asli.
  Tidak meminta permission storage luas atau mengasumsikan browser sama dengan
  WebView.
- **Pengiriman notifikasi Android.** Kode native berhasil dikompilasi dan bridge
  diuji dengan mock; belum memverifikasi izin OS, alarm, reboot, Doze, kanal,
  worker, dan tap notifikasi pada perangkat. Kabar bab menggunakan polling
  WorkManager minimum 15 menit, **bukan FCM/push langsung**. Firebase/backend push
  belum dikonfigurasi. Jangan mengharapkan notifikasi seketika.
- **Play Protect.** Tanda tangan valid dan permission terbatas tidak menjamin
  penilaian Google. Belum dipindai melalui Play Protect di perangkat dan tidak
  diklaim lolos. Sertifikat yang digunakan adalah sertifikat pengujian, bukan
  kunci rilis Play Store.
- **Offline membaca.** Aset antarmuka tersedia lokal. Bab dan Studio tetap
  memerlukan jaringan. Tidak ada cache novel/offline sync baru. Retry katalog
  dan pesan koneksi diuji pada browser; bukan simulasi seluruh kondisi radio.
- Workflow Actions tersedia tetapi belum dipush atau dijalankan di GitHub.

## Pemeriksaan ponsel berikutnya

1. Pasang/update APK; buka dan ulangi setelah menutup proses. Periksa logo,
   transisi startup sesuai tema, portrait, cutout, status/gesture bar dan keyboard.
2. Baca, pindah bab, kembali; pastikan progres/tema pulih. Putuskan internet dan
   sambungkan lagi; antarmuka/error tetap terlihat.
3. Dengan akun uji yang berizin, login, restart, simpan draf uji, logout; pastikan
   pengguna tanpa izin tetap ditolak. Gunakan data uji, bukan naskah produksi.
4. Pilih EPUB/ZIP/MD dan sampul dari Files/provider cloud, batalkan, lalu buka
   lagi; periksa isi dan simpan hanya data uji yang memang ingin disimpan.
5. Aktifkan tiap opsi notifikasi, gunakan Coba notifikasi, uji reminder,
   baseline bab, tap, pembatalan, reboot dan penghemat baterai. Pemeriksaan bab
   memerlukan bab publik baru; jangan mengubah produksi hanya untuk tes ini.
6. Jalankan Play Protect dan catat hasil aktual; jangan mematikan proteksi untuk
   menganggap tes berhasil.

Petunjuk build, signing pribadi, interval/batas notifikasi dan keamanan produksi
ada di [CRYSTAL.md](CRYSTAL.md).
