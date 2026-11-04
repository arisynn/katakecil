# Berkontribusi ke KataKecil

KataKecil berfokus pada pengalaman membaca. Perubahan sebaiknya membantu pembaca membuka buku, membaca dengan nyaman, atau menjaga data bacaannya.

## Melaporkan masalah

Gunakan [template laporan bug](https://github.com/arisynn/katakecil/issues/new/choose). Sertakan langkah untuk mengulang masalah, hasil yang diharapkan, hasil aktual, dan versi aplikasi. Untuk Android, cantumkan versi OS, Android System WebView, model perangkat, serta apakah buku berasal dari server atau impor pribadi.

Screenshot boleh disertakan setelah teks pribadi, catatan, dan detail akun disamarkan. Gunakan EPUB fixture domain publik untuk contoh; naskah pribadi, token, keystore, password, dan backup pribadi tidak perlu dilampirkan ke issue.

## Menyiapkan pengembangan

```sh
git clone https://github.com/arisynn/katakecil.git
cd katakecil
npm ci
git switch -c perbaikan/nama-singkat
npm run build
```

Gunakan Node 24+. Untuk native Android, siapkan JDK 21 beserta Android SDK sebagaimana dijelaskan dalam [panduan Android](docs/android-release.md). Gunakan kunci debug sendiri saat mengembangkan; kunci release resmi disimpan privat.

`dist/` berisi source UI yang dipelihara langsung. Edit helper reader di `src/reader/` dan adapter perangkat/backup di `src/platform/`, lalu jalankan build untuk memperbarui bundle yang dikomit. Jangan mengedit hasil bundle minified sebagai source utama.

## Memvalidasi perubahan

```sh
npm test
npm run typecheck
npm run check
git diff --check
```

Jalankan pemeriksaan yang sesuai dengan perubahan. Untuk perubahan dokumentasi saja, periksa tautan, contoh perintah, dan konsistensi fakta; tidak perlu mengulang build APK.

Perubahan pada reader atau integrasi perangkat memerlukan QA yang relevan, misalnya Back, keyboard, rotasi, seleksi teks, pemulihan posisi, impor/ekspor, dan audio. Catat perangkat serta hasil yang benar-benar diuji. Tes JSDOM tidak menggantikan pemeriksaan tampilan dan interaksi pada HP.

Pertahankan hal berikut saat mengubah kode:

- Posisi, catatan, bookmark, dan identitas buku tidak direset tanpa migrasi yang jelas.
- Kutipan yang tidak dapat dicocokkan dengan aman ditandai untuk ditinjau.
- Buku server tetap diperiksa terhadap publikasi dan revisi saat dibuka.
- Backup tidak menyertakan naskah server atau berkas EPUB.
- Kunci penandatanganan, token, dan konfigurasi mesin lokal tetap di luar Git.

## Mengirim pull request

Buat perubahan yang bisa ditinjau dengan mudah, jelaskan masalah dan perilaku akhirnya, lalu sertakan pemeriksaan yang dijalankan beserta batasnya. Gunakan template PR yang disediakan. Perubahan source, publikasi situs, deployment Supabase, dan rilis APK adalah tindakan berbeda; jelaskan cakupan yang dikerjakan.

Repo belum menetapkan lisensi umum untuk kode aplikasi. Jangan mengganti lisensi proyek atau menambahkan kode/aset pihak ketiga tanpa mencatat sumber dan ketentuan penggunaannya.
