# KataKecil 1.3 — laporan uji

Tanggal: 23 Oktober 2026. Branch terisolasi: `feat/intact-epub`.
Tidak ada deploy, push Git, perubahan record, atau migrasi ke produksi.

## Hasil yang dijalankan

- `npm run check`: TypeScript frontend/server, pemeriksaan struktur, 13 suite regresi lulus.
- `npm run test:epub`: parser asli EPUB 2/NCX dan EPUB 3, urutan TOC, beberapa bab berjangkar dalam satu XHTML, ilustrasi raster, sanitasi skrip/atribut/tautan remote, penolakan EPUB terenkripsi/fixed layout/rusak; SHA-256 berkas tidak berubah.
- PostgreSQL lokal PGlite menjalankan SQL EPUB sebenarnya: RLS seluruh tabel baru, sumber hanya penulis, anonim tidak dapat mengambil file asli, draf/jadwal belum terbit tersembunyi, metadata jadwal aman, buku privat/Sampah tersembunyi, pengaman format episode lama, retry idempoten, penggantian atomik kembali draf, serta cascade metadata tanpa menghapus file asli atau buku seri lain.
- Handler HTTP dan bundle Node: pengecekan terbit dengan client publik, pembatasan origin, verifikasi ukuran/hash sumber, penolakan draf/masa depan/privat/Sampah sebelum unduh, pemeriksaan ulang setelah render, `no-store`, tidak mengirim sumber utuh atau bab berikutnya. Handler tanpa konfigurasi gagal tertutup dengan 503.
- Browser EPUB: pemilih `input[type=file]`, metadata dan unggahan utuh byte per byte, backend belum diaktifkan terdeteksi sebelum membuat buku, balasan RPC hilang dapat dicoba ulang tanpa duplikat, pratinjau privat, terbit per episode, jadwal WIB, halaman kata pengantar pada Library/reader, tema, ukuran huruf, posisi gulir setelah reload, episode berikut/sebelum saat jadwal tiba, serta status error API. Autentikasi dan Storage sintetis; renderer dan handler sebenarnya.
- `npm run test:browser`: V7.2–V7.5 lulus, termasuk PostgreSQL untuk editor/revisi/penerbitan. Fixture impor episode V7.5 kini memakai Markdown; EPUB utuh diuji di suite khusus.
- `npm run test:crystal`: tampilan 320–1440 px dan kedua tema, alur baca lama/progres, login/save/reload/logout sintetis, guard perubahan belum tersimpan, seluruh rute Studio. Tambahan: popup internal Sampah untuk buku/episode/halaman dan pemulihan; batal/Escape/input salah/retry dengan UUID sama; nol dialog browser pada alur Sampah; posisi popup di tengah dan tidak keluar viewport.
- `node scripts/test-web-delivery.mjs`: rak sampul, popup buku, jadwal, pencarian/paginasi, fokus/scroll, tawaran APK dan antarmuka push web lulus dengan mock browser.
- `npm run test:push`: RLS/lease/rate limit dan handler push lokal lulus; query rilis EPUB memakai client publik. Tidak ada kiriman notifikasi nyata.
- `npm run test:android`: kontrak bridge lewat mock desktop, Back/history/minimize, bar sistem, pengingat, konfigurasi pemeriksa bab, dan penawaran pembaruan lulus.
- `npm run build:android`: Vite Android + Capacitor sync lulus. Gradle JDK 21 `assembleRelease assembleDebug` lulus.
- `npm run release:web`: build web dengan APK dan latest.json lulus.
- `node scripts/test-bundled-smoke.mjs`: Library/login bundle produksi, inisialisasi Supabase publik, unduhan APK dan SHA-256 manifest versi cocok. Semua API produksi diintersep, tanpa penulisan.
- `npm audit --omit=dev`: 0 kerentanan pada saat pengujian.

## APK yang diperiksa

- Paket: `app.katakecil.mobile`; nama: KataKecil; versionCode 4; versionName `1.3-epub`.
- APK release pengujian: `6,131,588` byte, tidak debuggable.
- SHA-256: `968ebc990809c514a570582d7daa40144828560e4a23b0510d0d75ebd838586c`.
- `aapt` dan `apksigner` berhasil; sertifikat sama dengan APK 1.2, sehingga dapat dipasang sebagai pembaruan tanpa uninstall.
- Seluruh aset lokal hasil sync identik byte per byte dengan isi APK. Tidak ada APK bersarang, manifest instalasi PWA, `server.url`, referensi variabel secret server pada JavaScript publik, atau izin instalasi APK/penyimpanan umum tambahan.
- APK debug juga benar-benar dikompilasi dan tanda tangannya diperiksa.

## Belum diuji / perlu aktivasi

Tidak tersedia perangkat/emulator yang dapat dipakai (`adb devices` kosong). Instalasi, peluncuran native, gesture, keyboard, pemilih EPUB Android, notifikasi nyata, dan Play Protect belum diuji pada ponsel. Sertifikat lokal adalah sertifikat pengujian, bukan sertifikasi Play Protect.

Akun penulis dan Storage produksi tidak diuji. Migrasi EPUB dan API server belum dipasang ke produksi. Kunci server tidak dimasukkan ke web/APK/ZIP. Lihat [panduan aktivasi](EPUB_UPDATE.md).

Supabase CLI advisors lokal telah dicoba, tetapi daemon Supabase lokal pada 127.0.0.1:54322 tidak berjalan (ECONNREFUSED). Pengujian SQL dan pemeriksaan eksplisit RLS/grant/security-invoker dilakukan menggunakan PostgreSQL PGlite; ini tidak diklaim sebagai hasil advisors Supabase atau audit produksi.

Peringatan build yang tidak menghalangi: Vite chunk utama di atas 500 kB, repositori Gradle flatDir, perbedaan versi metadata SDK, dan deprecation menuju Gradle 9. Toolchain saat ini tetap menghasilkan APK terverifikasi.

Batas ukuran, format gambar, jadwal, penggantian sumber dan cache dijelaskan di [EPUB_UPDATE.md](EPUB_UPDATE.md).
