# Penataan Pengaturan, reader dan tema

Pengaturan kini mempunyai lima kelompok sejajar: **Tampilan & bahasa**, **Preferensi membaca**, **Data & penyimpanan**, **Pembaruan & tentang**, serta **Lanjutan**. Tentang/pembaruan tidak lagi tersembunyi di Advanced dalam kelompok Data. Publisher, impor/pengelolaan EPUB pribadi dan pratinjau loading tetap berada di Lanjutan.

Sheet tema dipakai bersama oleh Pengaturan utama dan reader. Pilihan disusun menjadi **Mode tampilan** (Terang/Gelap/Sistem), **Palet tambahan** (Sepia/Kertas/Hijau), serta pintu masuk **Kustom**. Seluruh pilihan tetap memakai satu `themeMode`; pengelompokan tidak menambahkan preferensi atau mode baru. Editor Kustom, validasi kontras dan jalur kembali dipertahankan.

Reader mempertahankan tab Teks/Tata letak/Tema. Teks membedakan Huruf dari Spasi dan paragraf; Tata letak membedakan Halaman, Margin dan kolom, serta Layar. Alat baca membedakan Alat bantu dari Navigasi. Kontrol panjang memakai satu area scroll dalam sheet, dengan heading/tab tetap di luar scroller.

Gaya kaca, Pearl/charcoal, ambient, loading wordmark lama dan toast bersama dipertahankan. Key/default preferensi, parser, pagination, store, mesin RSVP/TTS dan versi aplikasi tidak berubah. Versi tetap **1.2.4/build 12**; tahap ini tidak membangun APK atau menerbitkan release.

## Bukti pemeriksaan

- Build helper web, typecheck serta pemeriksaan sintaks/modul lulus.
- **37 tes terarah lulus**, mencakup integrasi reader/Pengaturan, kontrol preview, kaca, tab/lensa, i18n dan picker aplikasi. Suite penuh tidak dijalankan.
- Chromium dengan katalog/dua episode fixture memeriksa empat viewport: **320×568, 390×844, 667×375 dan 1280×800**. Pengaturan utama tidak overflow horizontal; tema, teks dan tools diperiksa juga pada HP pendek/landscape/desktop. Sheet panjang memiliki paling banyak satu scroller yang diperlukan.
- Kedua bahasa diperiksa, termasuk pergantian EN→ID→EN pada node heading yang sama. Tema terang/gelap/sistem, Paper, Kustom, pilihan aktif tunggal, simpan/reload dan jalur kembali editor berfungsi.
- Range preview mempertahankan node input asli dan posisi baca; tab mempertahankan sheet/nav serta satu lensa. Seluruh kontrol teks/layout lama tetap tersedia. Manuskrip tetap opak tanpa gambar latar ambient.
- Pencarian fixture menemukan hasil; entry RSVP/baca nyaring, navigasi episode dan page jump tetap dapat ditemukan. Suara native tidak diuji melalui browser ini.
- Publisher tetap dapat dibuka dari Advanced dengan panel kaca. Ekspor backup mengunduh berkas dan memakai toast bersama. Kondisi pembaruan Android diperiksa dalam source.
- Follow-up memakai **picker aplikasi sebenarnya** untuk aksen kustom dan warna tema, termasuk kontras tidak valid/valid serta Escape kembali ke Pengaturan. Screenshot penilaian diambil setelah transisi selesai.

Dua temuan ditangani oleh pemilik Pengaturan: heading baru yang sempat tertinggal dalam bahasa Inggris saat pindah ke Indonesia, serta swatch aksen kustom yang terpotong. Keduanya sudah diverifikasi kembali; tidak ada temuan terbuka pada cakupan pemeriksaan ini.

[Hasil terstruktur dan matriks viewport](generated/ui-settings-redesign-validation.json). Screenshot lokal berada di `/workspace/scratch/katakecil-ui-settings-stable-*.png`; daftar nama direkam pada hasil terstruktur. Pengujian memakai fixture dan tidak mengubah akun, buku, jadwal atau backend produksi. Belum ada uji HP fisik/WebView, audio native, atau klaim tolok ukur performa.

## Uji singkat di HP

1. Periksa lima kelompok Pengaturan; buka Tentang dan Advanced, lalu pastikan Publisher serta impor EPUB tetap mudah ditemukan.
2. Ganti bahasa, tema terang/gelap/sistem dan Kustom; coba aksen pilihan sendiri dan buka kembali pengaturannya.
3. Di reader, buka Teks/Tata letak/Tema; geser range, tutup sheet dan pastikan posisi baca tetap sama. Coba portrait/landscape dengan keyboard atau picker terbuka.
4. Buka alat pencarian, RSVP, baca nyaring serta navigasi; lakukan pemeriksaan suara/fullscreen pada perangkat yang biasa dipakai.
