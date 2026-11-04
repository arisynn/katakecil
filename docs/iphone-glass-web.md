# iPhone glass — pembaruan web

Permintaan pemilik: menerapkan isi `katakecil_iphone_glass_css.md` ke web KataKecil. Lampiran berisi CSS langsung, sehingga isinya dipakai sebagai `dist/glass.css` dengan normalisasi newline akhir saja. Gaya yang lebih kuat dari referensi dipertahankan; tidak ada perubahan JavaScript, struktur Reader, naskah, database atau perilaku updater.

Fill utama menjadi 22–36%, blur panel 60px, Settings 44px dan permukaan umum/slider 50px. Kilau berlapis, highlight tepi, bayangan, kapsul tombol dan lensa mengikuti file yang diberikan. Tema global, varian gelap, Custom, fallback blur/mask serta reduced motion tetap menggunakan selector yang kompatibel dengan aplikasi. Warna/bidang teks buku tidak diganti oleh stylesheet ini.

`dist/index.html` memuat `glass.css?v=2` agar browser mengambil gaya baru. APK Preview 2 tetap merupakan artefak historis bertanda tangan dari commit rilisnya; pembaruan ini menargetkan web.

Pemeriksaan yang benar-benar dijalankan:

- `npm run check`: lulus.
- 9 tes terarah glass-tabs, reader-controls dan app-popups: lulus.
- Chromium, aplikasi asli dengan EPUB Alice domain publik: 18 pemeriksaan tab/ukuran layar, sheet/lensa bertahan, reduced motion dan tanpa exception JavaScript: lulus.
- Fixture Reader dengan modul/CSS asli: 120 kombinasi dari 10 slider, enam lebar layar (320/375/390/430/768/1280px), light/dark. Posisi input tetap, satu permukaan preview dan pelepasan langsung: lulus.

Screenshot diperiksa pada Settings terang serta panel Appearance gelap. Pengujian tersebut tidak mengukur FPS atau membuktikan performa/kontras setiap kombinasi warna di ponsel fisik. Blur referensi yang lebih besar dapat membutuhkan GPU lebih banyak; QA perangkat tetap diperlukan.

Rollback web: kembalikan dua perubahan `dist/glass.css` dan cache URL di `dist/index.html`, lalu redeploy source sebelumnya. Tidak ada migrasi data untuk dibatalkan.
