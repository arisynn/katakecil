# Liquid glass: meniscus, drag dan helper optik

Pembaruan web setelah `0081d5a`. Sumber dari pemilik proyek:

- `katakecil_iphone_glass_css _1_.md`: potongan CSS, dengan dua penanda `existing code`.
- `katakecil_liquid_glass_helper_js_svg_filter.js`: contoh drag, velocity stretch dan definisi SVG filter.

CSS digabungkan dengan stylesheet sebelumnya: token dan bagian lensa diperbarui, sementara panel, kontrol, preview slider, updater dan fallback tetap tersedia. Lensa baru berada di atas tombol, memakai tengah transparan dan mask blur di pinggir. Cache URL naik menjadi `glass.css?v=3`, `glass-tabs.js?v=2`, dan entry `app.js?v=16`.

## Satu pengendali interaksi

Logic helper diadaptasi ke `dist/glass-tabs.js`, tidak dimuat sebagai IIFE tambahan. Satu lensa dekoratif dan satu set tombol tetap dipakai; tidak ada salinan label, event handler kedua atau tab fokus baru.

- Pointer horizontal melewati ambang 7px mengaktifkan drag. Lensanya mengikuti posisi pointer langsung; tab/isi panel tetap sama sampai dilepas.
- Saat dilepas, tombol aktif dipilih berdasarkan pusat lensa terdekat di antara tombol yang tidak disabled. Pemilihan langsung terjadi sekali, tanpa timer dan tanpa menunggu animasi snap.
- Native click sesudah drag disaring; tap berikutnya serta aktivasi keyboard/programatik tetap berfungsi. Pointer capture dan listener dokumen menangani pelepasan di luar track. Posisi dibatasi di ujung track.
- Gerak vertikal dibiarkan untuk scroll. Pointercancel, sentuhan kedua, Escape, kehilangan capture atau perubahan ukuran membatalkan drag dan mengembalikan posisi, tanpa memilih tab yang tidak dimaksudkan.
- Kecepatan pointer dihaluskan dan dipakai untuk stretch X 1.04–1.16 serta squash Y 0.92–1.08, mengadaptasi formula helper. Nilai sementara dihapus saat release/cancel. Reduced motion menonaktifkan stretch dan transisi, sambil mempertahankan drag langsung.
- Tab Appearance dan buku menggunakan sheet/tablist/lensa yang sama sesudah pemilihan. Segmented font di Settings memakai pengendali yang sama. Fokus keyboard tampil di atas lapisan dekoratif.

## Filter dan latar

Definisi SVG `feTurbulence` → `feGaussianBlur` → `feDisplacementMap` dari helper dibuat sekali, tanpa target fokus dan disembunyikan dari accessibility tree. Referensi filter memakai URL dokumen yang eksplisit agar tidak salah menunjuk ke stylesheet eksternal. CSS yang mendukung referensi filter memakainya pada pseudo-element tepi yang sudah dimask; fallback blur CSS tetap ada. Pusat label tidak diberi displacement seluruh permukaan.

Ini distorsi dekoratif berbasis noise yang menyimulasikan efek optik; bukan model pembiasan fisik lensa cembung. Dukungan/hasil SVG backdrop bergantung browser. Saat masker tidak didukung, lapisan tersebut dimatikan untuk menghindari blur penuh pada label.

Library dan Settings mendapat dua sapuan warna aksen yang lembut agar transparansi memiliki latar berwarna. Bidang baca tetap solid dan tidak ditambahkan wallpaper gambar. Tidak ada layanan eksternal, pengiriman naskah, dependensi baru atau perubahan database.

## Verifikasi

- `npm test`: **72 lulus, 0 gagal**, termasuk 3 tes drag baru.
- Tes terarah glass-tabs/reader-controls/app-popups: **12 lulus**.
- Build (melalui npm test), typecheck dan check sintaks/publication/module graph: lulus.
- Chromium pada aplikasi asli dengan EPUB Alice domain publik: **18** pemeriksaan geometri tab di enam lebar layar; sheet/lensa tetap, reduced motion dan tanpa exception JavaScript.
- Enam drag nyata melalui CDP: mouse dan input sentuh yang diemulasikan, masing-masing ke Contents/Bookmarks/Highlights. Aktivasi tepat sekali, pilihan berubah saat release, stretch berfungsi dan SVG filter terhubung. Pembatalan touch, gerak vertikal, Escape dan reduced motion diperiksa.
- Fixture Reader menggunakan modul/CSS asli: **120** kombinasi slider pada 320/375/390/430/768/1280px dan light/dark; posisi input tetap dan release segera memulihkan sheet.
- Screenshot Settings/Appearance/panel buku diperiksa. Tidak ada klaim benchmark FPS, QA HP fisik atau kontras semua kombinasi warna.

Fakta terstruktur: [validasi](generated/liquid-drag-validation.json). APK Preview 2 tidak dibangun ulang dalam pembaruan web ini. Rollback dengan revert commit perubahan web lalu redeploy; tidak memerlukan migrasi data.
