# Default Lembar dan tata letak Glow — web

Lembar menjadi paket ikon default bila belum ada pilihan valid tersimpan, termasuk renderer startup sebelum Store siap. Keempat koleksi tetap tersedia; pilihan valid yang sudah tersimpan tidak ditimpa.

Play, pause dan kutipan Lembar kini memakai garis tanpa isi saat normal. Varian solid saat ditekan/dipilih tetap sama. Detail berisi yang bermakna, seperti pupil mata dan titik informasi, tetap dipertahankan. Lentera dan dua koleksi lain tidak diubah.

**Glow halaman baca** berada di sebelah **Kustom**, baik melalui Tema di Pengaturan maupun Tampilan → Tema di reader. Layout layar pendek dipadatkan agar baris tersebut terlihat tanpa scroll pada ukuran uji. Checkbox, penyimpanan dan default mati tetap sama; hint mengikuti intensitas Ambient tersedia sebagai deskripsi aksesibilitas.

## Pemeriksaan cepat

`npm run build`, `npm run check`, pemeriksaan whitespace diff dan **33 tes terarah** lulus. Tes mencakup default/fallback startup, pelestarian empat pilihan, bentuk outline/solid serta kedua pintu masuk Tema.

Chromium dengan katalog/episode fixture memeriksa Pengaturan dalam bahasa Indonesia/Inggris pada 320×568, 390×844 dan 667×375, serta Tema reader pada dua ukuran portrait. Kustom dan Glow sejajar tanpa tumpang tindih, overflow horizontal atau kebutuhan scroll untuk menjangkau toggle. Toggle tersimpan, tidak mengganti node teks maupun menggeser progres bacaan. Play/pause/kutipan diperiksa visual dalam state normal/solid. Tidak ada error halaman atau permintaan jaringan di luar fixture. [Hasil terstruktur](generated/lembar-default-glow-web.json).

Web saja; tidak membangun APK atau mengubah versi Android 1.2.8/build 16. Tidak menjalankan suite penuh, backend produksi atau pengujian HP fisik.

Uji pengguna: buka Tema dari Pengaturan dan reader, coba Glow di sebelah Kustom lalu buka ulang aplikasi. Di Ikon & Loading pilih Lembar dan tekan Gunakan bila sebelumnya sudah menyimpan paket lain; cek ikon normal dan saat ditekan.
