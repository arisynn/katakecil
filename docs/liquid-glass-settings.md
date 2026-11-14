# Pengaturan Liquid Glass — web

Buka **Pengaturan → Tampilan dan bahasa → Liquid Glass**. Kebeningan memakai rentang 0–100%, default **75%**, blur 0–40 px, default **20 px**, dan Ambient glow 0–100%, default **60%**. Makin tinggi kebeningan, makin rendah opacity lapisan dasar: 75% berarti opacity latar 25%. Teks, ikon dan halaman buku tidak dibuat transparan atau diburamkan.

Sheet menyediakan pratinjau ambient dan kaca serta tombol **Kembalikan default** yang mereset ketiga nilai ke 75% / 20 px / 60%. Slider memperbarui CSS pada frame berikutnya tanpa mengganti elemen input. Nilai disimpan ketika perubahan selesai, sheet ditutup, atau aplikasi meninggalkan foreground. Reset kenyamanan membaca tidak mereset kaca maupun ambient. Pada HP pendek pratinjau dipadatkan; landscape pendek menampilkan tiga slider sejajar tanpa pratinjau.

Ambient terdiri atas dua gradasi radial statis mengikuti warna aksen, tanpa animasi terus-menerus atau filter blur layar penuh. Intensitas 0 mematikan ambient global dan tint ambient di kontrol Reader; glow lokal di sekitar sampul tetap mengikuti warna buku. Pada intensitas maksimum, alpha kedua gradasi dibatasi 0,22/0,10 dalam tema terang dan 0,18/0,08 dalam tema gelap. Panel kontrol Reader mendapat tint lokal yang lebih tipis (maksimum 0,09/0,07).

UI terang memakai Pearl (#EEF2F6, teks #25313B), UI gelap memakai charcoal (#11161C, teks #E6EDF3). Kertas buku tetap memakai #FAF9F5 / #28302B saat terang dan #191D1B / #DDDCD4 saat gelap, opak dan polos secara default. Toggle **Glow halaman baca** di Tema dapat menambahkan gradasi ambient statis di atas warna dasar kertas; default mati, mengikuti aksen dan intensitas Ambient, tanpa mengubah opacity teks. Sepia, Paper, Green dan warna kustom mempertahankan warna dasar sebelumnya.

Panel Settings, dialog/picker, kapsul Library/Reader dan tombol Baca menggunakan parameter bersama. Lapisan putih, bevel dan bayangan diperingan; kontrol kecil tidak menambahkan panel putih lagi. Library full-cover/split-stage, warna sampul dan respons tekan terbaru tetap dipertahankan. Teks/ikon tombol Baca memilih warna kontras terhadap komposit tint dan latar tema. Tema kustom memakai warna pilihannya dengan kebeningan yang sama. Browser tanpa backdrop blur memakai permukaan cadangan solid yang terbaca.

## Preferensi dan kompatibilitas

- `readerAmbientGlow`: boolean, default `false`; toggle berada di Tema dari Pengaturan maupun reader, tersimpan antarsesi/antartab dan di backup. Reset kenyamanan mempertahankannya.
- `glassTransparency`: angka 0–100, default 75; `glassBlur`: angka 0–40, default 20; `ambientIntensity`: angka 0–100, default 60. Nilai lokal dibulatkan/dijepit; tipe yang salah atau angka non-finite kembali ke default.
- Instalasi lama mendapat kebeningan 75% bila field baru belum ada. `glassOpacity` lama tidak digunakan untuk renderer karena sebelumnya belum mengendalikan tampilan. Nilai blur lama yang valid, termasuk 34 px, tetap dipertahankan.
- Pengguna yang sudah mengatur kebeningan/blur mempertahankan nilainya dan mendapat ambient 60% bila belum diatur.
- Ekspor/pemulihan backup menyertakan ketiga field tanpa menaikkan schema backup. Backup lama tetap diterima; nilai kaca/ambient dengan tipe/rentang salah ditolak sebelum impor.
- Perubahan tema dan sinkronisasi antartab menerapkan kembali token kaca tanpa reflow teks atau perpindahan posisi baca. Penyesuaian memakai renderer lokal; tidak ada API/backend baru.

## Pemeriksaan cepat

Build helper web, typecheck, pemeriksaan sintaks/versi modul dan 31 tes Node terarah lulus. Tes mencakup normalisasi, batas ambient, palet UI/kertas, token/kontras, commit/reset, backup, tab kaca dan integrasi reader. Tiga tes backup dijalankan kembali setelah pemeriksaan pelestarian preferensi pada reset kenyamanan diperluas; seluruhnya lulus.

Chromium dengan katalog/episode mock memeriksa drag slider tanpa mengganti DOM input, keyboard Home/End, ambient mati/maksimum, reset, simpan saat tutup, reload, sinkronisasi antartab, identitas node/posisi reader, swipe sentuh carousel, tema terang/gelap, aksen rose/biru, reduced motion dan layout HP/landscape/desktop. Warna dan opacity halaman buku diperiksa langsung. Palet kustom/preset lain dan aksen hitam/putih/abu-abu diperiksa pada tes Node. Tidak ada pengujian HP fisik atau klaim tolok ukur FPS. [Hasil ambient](generated/ambient-glow-web.json); [pemeriksaan kaca sebelumnya, termasuk fallback](generated/glass-settings-web.json).

Perubahan ambient berbasis `main` setelah `5421463` (1.2.2/build 10). Tidak menaikkan versi, membangun APK, menerbitkan situs/backend atau menjalankan workflow GitHub Actions; APK memerlukan build berikutnya.

Uji pemilik: coba Ambient glow 0/60/100%, ganti aksen dan tema terang/gelap/kustom, lalu tutup dan buka ulang. Coba kebeningan/blur favoritmu dan reset ke 75/20/60. Pastikan tombol Baca terbaca, tiga slider muat pada HP, swipe nyaman, serta halaman buku tetap di posisi semula. Coba Glow halaman baca mati/aktif; default tetap polos.
