# Pembaruan motion, branding, slider dan panel

5 November 2026. Baseline: `f20004b`; branch `feat/advanced-reader`.

## Hasil

- Tab Contents/Highlights/Notes/Bookmarks dan Text/Layout/Theme memiliki feedback ikon aktivasi dan transisi isi pendek. Header, nav dan dialog tetap terpasang ketika berpindah tab di menu yang sama.
- Dialog/picker masuk dan keluar menggunakan Web Animations API bawaan browser; tidak menambah dependency. Reduced motion melewati animasi. Penutupan berulang berbagi completion; cleanup sheet lama tidak menghapus sheet baru. Fokus editor tidak direbut callback picker lama.
- Slider halaman menampilkan hasil pagination yang sudah ada sekali per frame selama drag, tanpa mengganti input atau menulis progres setiap frame. Release langsung menyimpan posisi. Native change berikutnya tidak mengulang commit. Escape/pointercancel memulihkan halaman dan anchor awal. Keyboard, pagehide dan resume tetap menggunakan mekanisme penyimpanan yang sama.
- Color wheel dibatasi 144–224px berdasarkan viewport. Heading tetap di luar konten dan minimal 44px. Konten biasanya maksimal setengah layar; kelebihan kecil hingga 48px dapat memakai ruang yang masih tersedia. Konten panjang tetap bergulir. Visual viewport keyboard membatasi tinggi panel tanpa mengganti input.
- Wordmark pengguna dipersiapkan dengan background transparan memakai image editing, lalu diekspor untuk web. Warna wordmark di app mengikuti warna teks tema melalui alpha mask. README memiliki varian hijau/krem. Ikon kutip dari identitas yang sama dipakai pada favicon, apple-touch, serta launcher/splash Android.
- Logo hanya ditaruh di About dan loading. Gap/header Library dan Settings, kaca Preview 2, TTS paragraf, zoom lokal, notes/highlight dan secure publication flow dipertahankan.

## Pemeriksaan yang dijalankan

- `npm run build`, `npm run check`, `npm run typecheck`, `git diff --check`.
- `node --test tests/page-scrubber.test.mjs tests/sheet-motion.test.mjs tests/glass-tabs.test.mjs tests/app-popups.test.mjs tests/reader-controls.test.mjs`: 21 tes lulus.
- Chromium lokal, fixture teks publik tersendiri: panel warna 390×740 (wheel224px; body354px) dan 320×568 (wheel172px; body302px), Apply terlihat penuh tanpa scroll. Tidak autofocus hex; fokus/isi hex bertahan ketika viewport mengecil.
- Chromium: drag range dengan pointer nyata menampilkan halaman19 sementara posisi tersimpan masih halaman3; pelepasan menyimpan halaman19. Input tidak diganti. Reload memulihkan offset. Tab mempertahankan dialog/nav/body, ikon dan isi memiliki motion aktivasi. Buka ulang sheet saat exit, termasuk menu yang sama, tetap interaktif. Reduced motion menutup langsung.

Pemeriksaan ini bukan matriks QA perangkat. Audio native, keyboard HP fisik, launcher/splash dan instalasi APK belum diuji pada pembaruan ini.

## Tugas QA HP

1. Seret slider baca perlahan/cepat, lepas, refresh; coba tab dengan tap maupun drag.
2. Buka/tutup sheet cepat lewat Back/tombol/backdrop; ketik hex dan notes, pastikan keyboard stabil.
3. Cek panel warna di portrait/landscape, serta logo About/loading pada tema terang/gelap.
4. Ikon launcher/splash diuji setelah membangun dan memasang APK baru dengan kunci yang sama.

## Deployment dan rollback

Tidak ada dependency atau perubahan database, endpoint, otorisasi maupun data konten. Web memakai source `dist/` dan cache URL modul diperbarui konsisten. Resource Android ikut source, tetapi APK Preview 2 yang sudah dirilis tidak diganti dalam pekerjaan ini. Build APK berikutnya harus menaikkan versionCode dan ditandatangani dengan kunci lama.

Untuk rollback web, revert commit pembaruan ini di branch deployment atau promote deployment Vercel sebelumnya. Baseline source `f20004b` mencakup aset lama. Tidak ada migrasi database yang perlu dibatalkan.
