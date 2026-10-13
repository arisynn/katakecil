# KataKecil V4.2.1 — perbaikan layar putih pembaca

## Penyebab yang ditemukan

`SecureReaderApp.tsx` memasok `chapters={[chapter]}` langsung ke `PageMeasurer`. Array baru dibuat setiap kali komponen render. Karena `PageMeasurer` memakai `chapters` sebagai dependensi `useLayoutEffect`, ia memanggil `onMeasured` lagi, dan `onMeasured` memanggil `setPages` dengan array state baru. Siklus itu berulang ketika respons bagian naskah pertama berhasil dimuat, berpotensi menjatuhkan React menjadi layar putih.

## Perbaikan

- Memoisasi array chapters sehingga referensi tidak berubah untuk chapter yang sama.
- `setPages` tidak lagi menyebabkan render saat hasil pengukuran sama.
- `ReaderErrorBoundary` memulihkan navigasi ke katalog ketika render reader mengalami kesalahan.
- Tidak ada perubahan pada Supabase, kunci API, keamanan server, atau jadwal publikasi.
- Tidak ada perubahan pada style, gesture, font, watermark Karisyono, dan tata letak reader normal.

## Instalasi Termux

**Simpan commit saat ini terlebih dahulu dan cek tidak ada file `.env.local` atau backup pribadi yang ter-stage.** Ekstrak ZIP patch ke ROOT repository yang sama (`src` di dalam ZIP harus menyatu dengan `src` repository, tidak boleh menjadi folder bersarang).

```sh
cd ~/storage/shared/katakecil
unzip -o ~/storage/downloads/KataKecil_V4.2.1_Reader_White_Screen_Patch.zip -d .
node scripts/test-v421-reader.mjs
# Jalankan npm install bila node_modules belum tersedia, lalu build:
npm run build
git status
git add src/App.tsx src/SecureReaderApp.tsx src/components/ReaderErrorBoundary.tsx src/secure-reader.css scripts/test-v421-reader.mjs
git commit -m "Fix secure reader white screen V4.2.1"
git push origin main
```

Jika `npm run build` gagal, jangan push: periksa log dan perbaiki lebih dahulu. Jika menggunakan Vercel Preview, deploy branch preview dahulu sebelum menggabungkan ke `main`.

## Verifikasi di Chrome Android

1. Pastikan Vercel menampilkan `Ready`, kemudian muat ulang halaman dari browser.
2. Buka episode 1: teks harus muncul setelah status "Memuat bagian cerita…".
3. Buka menu dengan ketukan di tengah, pindah halaman dan bagian, lalu tes kembali ke daftar novel.
4. Uji setelah keluar-masuk tab Chrome, terutama mode proteksi layar.
5. Jika muncul layar pemulihan, catat pesan dan screenshot-nya. Jangan jalankan Stage 2 sebelum semua tes berhasil.

**Migrasi Stage 2 tetap ditunda** sampai reader baru terbukti berfungsi dan perlindungan direct API publik siap diverifikasi.
