# Perbaikan ikon dan kapsul Library — web

Ikon refresh memakai kepala panah diagonal yang tersambung ke jalur melingkar. Ikon pengaturan memakai knob lebih ringan dengan track terputus di luar lingkaran. Keduanya mempertahankan nama/key, stroke 1,85 dan ujung rounded dari helper ikon bersama.

Header Library memakai satu kapsul kaca. Tombol di dalamnya tidak lagi memiliki border atau bayangan sendiri saat idle; rim tambahan kapsul dihilangkan. Ikon tetap 21×21 px, area sentuh masing-masing 44×44 px, dan hover/press/fokus keyboard tetap tersedia. CSS dibatasi ke header Library.

Build web, pemeriksaan sintaks/modul dan smoke Chromium lulus. Katalog memakai fixture lokal; tiga viewport 390×844, 320×568 dan 667×375 diperiksa. Tampilan terang/gelap, bounds kedua glyph, refresh, buka Pengaturan dan fokus dengan Tab bekerja. Tidak menjalankan suite penuh untuk perubahan SVG/CSS ini dan tidak mengklaim pengujian HP fisik.

[Hasil pemeriksaan](generated/library-header-icons-web.json). Screenshot lokal: `/workspace/scratch/katakecil-library-header-icons-web-dark.png` dan `katakecil-library-header-icons-web-light.png`.

Sesuai instruksi terbaru pengguna, hasil akhir hanya dipush sebagai pembaruan source web. Tidak menerbitkan APK/release baru; versi aplikasi tetap **1.2.5/build 13**.

Uji pemilik: refresh halaman web, periksa bentuk kedua ikon pada tema terang/gelap, lalu tekan refresh dan buka Pengaturan.
