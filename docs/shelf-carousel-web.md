# Carousel Library — web

Library mengadaptasi pola punggung/sampul dari `rak-logic.js` yang diberikan pemilik. Controller memakai posisi melingkar, bukan berhenti di awal/akhir koleksi. Setiap buku tetap memiliki satu elemen dan satu ID.

| Jumlah buku | Tampilan |
| --- | --- |
| 0 | Rak kosong dengan aksi segarkan |
| 1 | Satu sampul di tengah, tanpa navigasi |
| 2–4 | Carousel sampul dengan loop dua arah |
| 5+ | Rak punggung buku, pilihan aktif melebar menjadi sampul |

Ketuk punggung/sampul samping untuk memilih. Ketuk sampul aktif atau tombol baca untuk masuk reader. Swipe memakai momentum terbatas hingga tiga buku, atau setengah jumlah koleksi bila lebih kecil, agar arah gerakan tetap konsisten; gerakan vertikal, pointer cancel dan sentuhan kedua tidak membuka reader. Klik susulan setelah drag ditekan selama 350 ms. Tombol panah dan keyboard kiri/kanan ikut melingkar. Preferensi reduced motion mematikan transisi.

Pilihan disimpan berdasarkan ID buku, termasuk saat refresh, reload dan koleksi melewati batas empat/lima buku. Bila pilihan dihapus, gunakan buku pada indeks terdekat yang masih ada. Untuk koleksi besar, tampilkan paling banyak lima titik dan nomor posisi. Naskah, progres dan catatan tidak diubah.

## Pemeriksaan cepat

- `npm run check`: sintaks, aset masuk dan versi URL modul konsisten.
- `node --test tests/shelf-carousel.test.mjs tests/reader.test.mjs`: controller dan integrasi Library/reader; termasuk loop, ketukan, cancel, sentuhan kedua dan pembersihan listener.
- Chromium headless dengan katalog/episode mock: 0, 1, 2, 4, 5, 6 dan 12 buku; loop pertama/terakhir, keyboard, pemilihan, drag mouse, reduced motion, refresh/reload, fallback setelah penghapusan, masuk reader dan resize 320×568/667×375/390×844. Sampul aktif berpusat dengan selisih kurang dari 0,01 CSS pixel setelah perpindahan selesai. [Hasil browser](generated/shelf-carousel-web.json).

Pemeriksaan ini tidak memakai HP fisik atau Safari. Perubahan web saja; tidak membangun APK, mengganti rilis stable 1.2.0 atau menerbitkan backend/situs.

### Koreksi swipe sentuh

Uji awal mouse dan pointer sintetis melewatkan implicit pointer capture pada tombol sampul. Dalam Chromium mobile, sentuhan menangkap pointer di tombol. Ketika drag memindahkannya ke viewport, `lostpointercapture` dari tombol menggelembung ke viewport dan keliru membatalkan swipe. Kejadian ini berhasil direproduksi: buku pilihan tidak berubah setelah swipe.

Controller sekarang hanya membatalkan drag karena `lostpointercapture` bila target kejadiannya viewport itu sendiri. Swipe pelan juga diterima setelah melewati 20% jarak antarbuku, dibatasi 24–60 px; gerakan kecil tetap kembali ke posisi semula. Tiga tes regresi memeriksa perpindahan capture dari anak, kehilangan capture viewport dan swipe pelan; seluruh sepuluh tes controller lulus. Input sentuh melalui CDP Chromium memeriksa swipe kiri/kanan pada 2, 5 dan 12 buku, cancel, posisi sampul di tengah dan ketukan untuk membuka reader. Ini emulasi sentuh browser, belum pengujian HP fisik. [Hasil](generated/shelf-touch-fix-web.json).

## Animasi 3D

Sampul membuka/menutup dari engsel kiri dengan perspektif 3D. Lebar gambar dan punggung tetap selama transisi, sementara ruang antarbuku serta tinggi kartu bergerak bersama. Buku samping memakai sedikit sudut dan kedalaman; buku aktif berhenti datar di tengah. Kurva 560 ms memperlambat gerak sebelum berhenti dengan overshoot kecil, dengan fallback cubic-bezier pada browser tanpa CSS `linear()`.

Saat swipe, posisi mengikuti jari tanpa transisi, dengan kemiringan/angkat ringan pada buku aktif. Pembaruan pointer digabungkan lewat requestAnimationFrame, dan frame yang tertunda dibatalkan saat gesture selesai atau carousel dilepas. Buku yang melintasi ujung cincin dipindahkan saat transparan, lalu muncul kembali; perpindahan beberapa buku tidak dianggap daur ulang kecuali melewati batas cincin. Tombol baca dan indikator turut berganti dengan transisi singkat.

Reduced motion mematikan transisi, animasi keterangan dan kemiringan swipe. Perubahan diuji cepat dengan sepuluh tes controller serta Chromium: fase buka sampul, navigasi beruntun, loop, reduced motion, tiga ukuran layar dan input sentuh pada kedua mode. [Hasil](generated/shelf-motion-web.json). Belum diuji pada HP fisik; tidak membangun APK atau mengubah rilis stable.

## Uji pemilik

1. Coba rak berisi 1, 2–4 dan 5+ buku, termasuk menambah/menghapus EPUB lewat Advanced hingga melintasi batas 4 ↔ 5.
2. Swipe dan gunakan panah dari buku pertama ke terakhir, lalu sebaliknya. Pastikan gerakannya nyaman di HP.
3. Ketuk buku samping, lalu sampul aktif/tombol baca. Pastikan membatalkan swipe tidak membuka reader.
4. Refresh, reload, rotasi layar, dan kembali dari reader. Pastikan pilihan, sampul, progres dan catatan tetap sesuai.
