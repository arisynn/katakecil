---
name: katakecil-loading-motion
description: Rancang dan implementasikan dua motion loading KataKecil yang berbeda dari soft pulse/dots lama, sambil mempertahankan wordmark klasik, preferensi, preview dan aksesibilitas.
---

# Motion loading KataKecil

Gunakan untuk pekerjaan loading saat ini. Pengguna telah meminta pembuatan skill, pembagian beberapa worker dan penggantian dua loading opsional. Implementasi diizinkan; tidak perlu konfirmasi tambahan. Untuk tugas web jangan build APK/release tanpa instruksi pengguna. Pengguna kini meminta pembaruan APK dengan splash baru; build dan distribusi Android dalam cakupan ini diizinkan. Instruksi pengguna terbaru mengungguli batas skill ini.

## Hasil yang diminta

- Ganti visual Soft pulse (`pulse`) dan Dots (`dots`) dengan dua motion baru yang jelas berbeda satu sama lain maupun dari animasi lama. Bukan sekadar ubah kecepatan/warna atau menambah glow.
- Pertahankan loading Wordmark lama (`wordmark`) secara persis sebagai pilihan. Sesuai permintaan terbaru, default kini Turning pages (`pulse`); preferensi valid yang telah tersimpan tetap dihormati. Pertahankan key tersimpan `pulse`/`dots` agar preferensi dan backup lama tetap bekerja; nama tampilan baru boleh disesuaikan ID/EN.
- Satu konsep bersumber dari lembar/buku, satu konsep dari aliran tinta/garis. Buat gerak halus dengan fase, easing dan siluet yang berbeda. Tidak ada angka progress palsu, shimmer, interval JS atau delay loading buatan.
- Warna mengikuti tema/aksen. Ukuran stage stabil, tidak menggeser layout dan tidak ada aset jaringan baru. Gunakan CSS transform/opacity serta markup lokal yang ringan.
- Semua pemakai helper loading (preview, Library, reader, launch) mendapat hasil sama. Preview kandidat dan Coba tidak menyimpan pilihan; Gunakan menyimpan hanya tab aktif. Pertahankan container dan explicit preview saat apply.
- Animasi berhenti ketika reader loader hidden; semua layer/pseudo-element bergerak statis pada prefers-reduced-motion. Kondisi ini harus mencakup animasi baru, bukan hanya selector loader lama.
- Pertahankan nama/label aksesibel loading dari host, tanpa announcement setiap frame. Tidak mengubah icon pack, logo, reader glow, posisi baca, backend atau versi APK.

## Pembaruan dari HTML pengguna

Pengguna kemudian memberikan `katakecil-turning-pages.html` dan meminta memakainya. Untuk `pulse`, ikuti versi tersebut: tiga lembar 3D, buku melayang/bayangan, teks katakecil per huruf dan cahaya dekoratif dalam satu siklus 3 detik. Permintaan ini menggantikan batas visual 2D/transform-opacity saja untuk opsi tersebut. Classic wordmark dan Ink flow tetap tersedia; pengguna kemudian meminta Turning pages menjadi default. Scope seluruh CSS baru ke `pulse`; jangan mengambil aturan body/:root atau tema preview. Wordmark teks baru harus terisolasi dari kelas/artwork Classic. Hidden/reduced motion mencakup book, shadow, kedua sisi lembar, letters dan reading light. Tidak ada progres numerik atau delay buatan.

## Pembagian kerja

1. Designer: baca renderer/CSS dan berikan brief singkat dua konsep, tahapan gerak, ukuran, reduced motion. Read-only; jangan audit aplikasi luas.
2. Implementer: setelah brief, ubah hanya `dist/loading-logo.js`, `dist/loading-logo.css`, `dist/loading-previews.js` (nama loading) dan string terkait di `dist/i18n.js`. Tidak mengedit app entry/cache atau tests.
3. QA: sesudah implementasi, cek dua motion benar-benar berbeda, Classic tetap dan default Turning pages, apply/persistence/preview tidak rusak, hidden/reduced motion. Miliki tests dan harness lokal; laporkan temuan konkret, jangan redesign di luar scope.
4. Agent utama: prompt, integrasi cache version secara konsisten, dokumentasi, review visual, tes terarah dan push web berdasarkan otorisasi sesi. Jangan mengklaim worker aktif jika pemanggilan gagal. Bila kuota worker habis, lanjutkan sendiri dan jelaskan singkat.

## Verifikasi cukup

Check sintaks/module graph; tes renderer/controller terarah; browser viewport mobile terang/gelap dan reduced motion. Lihat frame berbeda untuk membuktikan gerak dan stage stabil. Pakai fixture lokal, bukan data Publisher produksi. Tidak perlu suite penuh, audit backend atau build Android. Catat hasil nyata dan daftar uji singkat pemilik.

## Splash Android 1.2.6

Splash khusus memakai `launch-splash.js/css`, independen dari pilihan loader. Pertahankan canvas opak sejak first paint, scene Turning pages, glow aksen dan exit setelah real readiness; tanpa delay minimum. Starting window memakai animated vector buku, signer/package tetap. Jangan menghapus jalur cleanup/fallback, reduced motion atau perlindungan posisi baca. Rilis Android hanya dilakukan bila pengguna mengizinkan; catat batas QA browser/mock dan uji HP fisik terpisah.
