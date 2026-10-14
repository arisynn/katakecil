# Pembersihan paket — 15 Oktober 2026

107 file usang dihapus dari sumber, total 490.245 byte sebelum kompresi. Pembersihan mencakup:

- Catatan rilis dan daftar file versi lama yang telah digantikan dokumentasi V7.2.
- Tes snapshot/hash lama di luar 9 suite regresi aktif, serta fixture visual yang sudah digantikan pengujian browser V7.2.
- Empat modul yang tidak lagi dijangkau aplikasi: carousel lama beserta helper-nya, buffer prefetch lama, dan alias preferensi tema lama.
- Gambar empty-state desktop yang tidak dirujuk, parser CLI duplikat, skrip penerbitan khusus satu karya, dan pembungkus migrasi Termux versi lama.

README dan pintasan npm sudah disesuaikan. Perintah `check` kini menjalankan lint, pemeriksaan struktur, dan regresi aktif. Perintah lama `publish` yang menunjuk skrip khusus satu karya dihapus. Impor CLI umum tetap tersedia melalui `import:episodes` dan hasil impornya masih diuji.

CSS yang masih diimpor, aset yang masih dirujuk atau dipilih secara dinamis, sumber vektor ikon PWA, seluruh migrasi SQL, kedua Edge Function, serta audit keamanan dipertahankan. Berkas lama tidak dihapus hanya karena nomor versinya kecil.

## Memperbarui folder yang sudah ada

Ekstrak ZIP lalu salin pembaruan seperti biasa. Penyalinan saja tidak menghapus file lama yang sudah ada di foldermu. Untuk membersihkannya:

```sh
npm run clean:obsolete
npm run clean:obsolete -- --apply
```

Perintah pertama hanya menampilkan daftar. Perintah kedua hanya menghapus path yang terdaftar **dan** masih mempunyai SHA-256 yang sama dengan hasil audit. File yang kamu edit dan symlink dilewati. Skrip tidak menyentuh naskah, `.env`, `.git`, atau file lain di luar daftar. Daftar rinci ada di `scripts/obsolete-files.json`.

Paket tidak menyertakan `node_modules`, hasil build, atau screenshot QA. Dependensi bisa dipasang kembali dengan `npm ci`; tidak perlu menghapus dependensi lokal untuk menggunakan paket ini. Database dan situs produksi tidak diubah oleh pembersihan sumber.
