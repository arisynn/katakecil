# Pengaturan Liquid Glass — web

Buka **Pengaturan → Tampilan dan bahasa → Liquid Glass**. Kebeningan memakai rentang 0–100%, default **75%**, dan blur 0–40 px, default **20 px**. Makin tinggi kebeningan, makin rendah opacity lapisan dasar: 75% berarti opacity latar 25%. Teks, ikon dan halaman buku tidak dibuat transparan atau diburamkan.

Sheet menyediakan pratinjau kaca di atas latar berwarna dan tombol **Kembalikan default** yang hanya mereset dua nilai kaca. Slider memperbarui CSS pada frame berikutnya tanpa mengganti elemen input. Nilai disimpan ketika perubahan selesai, sheet ditutup, atau aplikasi meninggalkan foreground. Reset kenyamanan membaca tidak mereset kaca.

Panel Settings, dialog/picker, kapsul Library/Reader dan tombol Baca menggunakan parameter bersama. Lapisan putih, bevel dan bayangan diperingan; kontrol kecil tidak menambahkan panel putih lagi. Library full-cover/split-stage, warna sampul dan respons tekan terbaru tetap dipertahankan. Teks/ikon tombol Baca memilih warna kontras terhadap komposit tint dan latar tema. Tema kustom memakai warna pilihannya dengan kebeningan yang sama. Browser tanpa backdrop blur memakai permukaan cadangan solid yang terbaca.

## Preferensi dan kompatibilitas

- `glassTransparency`: angka 0–100, default 75; `glassBlur`: angka 0–40, default 20. Nilai lokal dibulatkan/dijepit; tipe yang salah atau angka non-finite kembali ke default.
- Instalasi lama mendapat kebeningan 75% bila field baru belum ada. `glassOpacity` lama tidak digunakan untuk renderer karena sebelumnya belum mengendalikan tampilan. Nilai blur lama yang valid, termasuk 34 px, tetap dipertahankan.
- Ekspor/pemulihan backup menyertakan kedua field tanpa menaikkan schema backup. Backup lama tetap diterima; nilai kaca dengan tipe/rentang salah ditolak sebelum impor.
- Perubahan tema dan sinkronisasi antartab menerapkan kembali token kaca tanpa reflow teks atau perpindahan posisi baca. Penyesuaian memakai renderer lokal; tidak ada API/backend baru.

## Pemeriksaan cepat

Build helper web, typecheck, pemeriksaan sintaks/versi modul dan 27 tes Node terarah lulus. Tes mencakup normalisasi, token/kontras, commit/reset, backup, tab kaca dan integrasi reader.

Chromium dengan katalog/episode mock memeriksa drag slider tanpa mengganti DOM input, keyboard Home/End, rentang ekstrem, reset, simpan saat tutup, reload, sinkronisasi antartab, identitas node/posisi reader, swipe sentuh carousel, tema gelap/kustom, reduced motion dan layout HP/landscape/desktop. Fallback CSS tanpa blur diuji dengan mengaktifkan cabang fallback pada fixture browser. Tidak ada pengujian HP fisik atau klaim tolok ukur FPS. [Hasil ringkas](generated/glass-settings-web.json).

Perubahan ini berbasis `main` setelah `df7b0eb` (1.2.2/build 10). Tidak menaikkan versi, membangun APK, menerbitkan situs/backend atau menjalankan workflow GitHub Actions; APK memerlukan build berikutnya.

Uji pemilik: geser kedua slider, coba 0/75/100%, tutup lalu buka ulang, ganti tema dan kembali ke buku. Pastikan kaca sesuai selera, tombol Baca terbaca, swipe tetap nyaman, dan posisi baca tetap sama.
