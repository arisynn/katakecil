# EPUB pribadi dan baca cepat — 1.2.0-rc.1

Build kandidat versionCode 7 memakai package `id.karisyono.katakecil` dan kunci Karisyono yang sama. Ini perubahan source dan APK uji lokal; bukan publikasi GitHub Release atau deployment web/Supabase.

## Perubahan

- Library memiliki tombol impor EPUB. Pemilih file dan file yang diterima Android membuka pratinjau judul, penulis, cover, ukuran dan jumlah bagian. Pengguna memilih Impor ke Library; file yang sama menawarkan Buka buku tanpa menggandakan data.
- Android menerima ACTION_VIEW dan ACTION_SEND EPUB melalui URI content/file. Plugin menyalin URI sementara ke cache privat, membatasi ukuran 30 MB, lalu mengirim byte ke web dalam potongan 256 KB. File sementara dihapus setelah alur impor selesai/dibatalkan; tidak meminta izin storage menyeluruh. Penanganan ini tidak memanggil Publisher atau mengunggah buku.
- Cover lokal dibaca dari EPUB 3 cover-image, metadata cover EPUB 2, guide cover, dan pembungkus XHTML/SVG yang menunjuk gambar raster di dalam arsip. JPEG, PNG, WebP dan GIF diperiksa melalui penanda berkas dan dibatasi 5 MB. Referensi jaringan tidak diambil. SVG murni tanpa gambar raster internal tetap memakai cover generik.
- Saat Library dibuka, cover impor lama dipulihkan sekali dari EPUB yang sudah tersimpan. ID buku, progres dan catatan dipertahankan. Buku yang tidak memiliki arsip EPUB tersimpan tidak dapat diekstrak ulang.
- Parser revisi 8 mengikuti target fragmen daftar isi EPUB 3/NCX, termasuk target pada kontainer section/anchor. TOC memandu pemisahan bab tanpa menjadikan subjudul biasa sebagai bab. Mendukung label eksplisit, angka desimal/Romawi, prolog/epilog dan arc bertingkat; teks pembuka yang bukan metadata tidak dibuang.
- Bagian lokal dalam satu file mendapat href berfragmen. Dokumen satu bagian mempertahankan href sebelumnya. Progres dan anotasi dimigrasikan dengan pencocokan kutipan; hasil ambigu ditandai perlu ditinjau. Backend yang memakai parser bersama tetap menggunakan href UUID sumber melalui opsi preserveSourceHref. Versi edisi backend dinaikkan agar revisi berubah bila source backend kelak di-deploy; tidak ada deployment backend dalam pekerjaan ini.
- Alat baca → Baca cepat menampilkan satu kata bergantian (RSVP), mulai dari posisi saat ini. Default 250 kata/menit, rentang 100–600, jeda tanda baca/paragraf, mundur/maju 5 kata, pause/resume dan kembali ke kata yang sama. Kecepatan tersimpan dalam preferensi dan backup. WPM adalah kecepatan dasar; jeda tanda baca memperpanjang waktu tampil.
- RSVP berhenti saat ditutup dan dijeda saat aplikasi tidak aktif. TTS dihentikan ketika RSVP dibuka. Untuk buku server, episode berikutnya diminta saat episode aktif selesai; tidak ada prefetch/unduhan seluruh buku. Error jaringan/kuota menjeda RSVP.
- Dua assertion updater disesuaikan dengan teks verifikasi signature/checksum yang sudah digunakan UI sebelumnya.

## Pemeriksaan cepat

34 tes terarah lulus: parser/cover lokal dan RSVP, reader, Publisher, updater, anchor dan backup store. Build, typecheck dan pemeriksaan modul dijalankan. Tidak menjalankan suite penuh, uji beban, pemindaian malware atau QA HP fisik.

Chromium headless 390×844 dengan katalog mock dan EPUB Alice domain publik: pratinjau impor, baca lokal, RSVP 600 kata/menit, jeda, maju kata, resume offset 32 setelah reload, serta deteksi duplikat berhasil; tidak ada page error. Uji cover memakai fixture EPUB 2/3 dan guide wrapper. Pengujian ini tidak mengakses naskah produksi.

APK berhasil dikompilasi dengan `--skip-qa`; signature v2/v3 dan alignment diverifikasi. Sertifikat SHA-256 sesuai rilis Karisyono sebelumnya. Seluruh aset `dist/` di dalam APK cocok dengan source akhir. [Bukti ringkas](generated/1.2.0-rc.1-validation.json). Pemeriksaan ini tidak membuktikan perilaku intent pada HP atau menyelesaikan laporan Play Protect.

## Daftar uji HP untuk pemilik

1. Simpan backup data lama, lalu pasang build uji di atas aplikasi lama dengan package/signer yang sama. Periksa Library, progres dan anotasi lama. Bila Play Protect memblokir, hentikan pemasangan dan catat pesan/versi; build ini bukan klaim penyelesaian klasifikasi Google.
2. Ketuk EPUB di file manager → Buka dengan → KataKecil. Ulangi ketika aplikasi ditutup dan ketika sedang membaca/berada di Publisher. Tujuannya selalu pratinjau impor Library pribadi.
3. Bagikan EPUB dari file manager ke KataKecil. Jika file manager menawarkan MIME generik/berbeda, catat nama file manager dan perilakunya. Pemilih Android dapat mengingat aplikasi default; pilihan tidak selalu muncul kembali.
4. Impor novel yang cover-nya sebelumnya generik, misalnya Hujan. Bandingkan cover asli, judul, penulis, rasio dan tampilan terang/gelap. Periksa juga cover buku impor lama setelah membuka Library.
5. Batalkan pratinjau; pastikan buku tidak ditambahkan. Impor file sama dua kali; pastikan hanya satu buku dan progres sebelumnya tetap. Coba EPUB rusak/DRM/lebih dari 30 MB; harus ada pesan tanpa crash.
6. Aktifkan mode pesawat dan buka EPUB lokal. Periksa cover, daftar isi dan resume. Buku server tetap memerlukan koneksi.
7. Coba EPUB dengan prolog, epilog, angka Romawi, Episode 0, arc bertingkat dan banyak bab dalam satu file. Periksa urutan, judul, seluruh paragraf serta subjudul. Bandingkan dengan EPUB asli bila ada bagian yang terasa hilang atau salah kelompok.
8. Buka buku lama yang punya highlight/bookmark/progres, lalu periksa lokasi kutipan setelah parser diperbarui. Kutipan ambigu harus tetap tersedia untuk ditinjau, bukan berpindah ke kalimat lain.
9. Alat baca → Baca cepat: mulai di tengah bab, ubah 100/250/600 kata per menit, jeda/lanjut, ±5 kata, tutup dan buka ulang. Posisi normal harus mengikuti kata RSVP terakhir.
10. Saat RSVP berjalan, tekan Home, matikan layar, gunakan Back dan rotasi HP. Harus jeda ketika keluar, dan tidak ada dua pemutaran setelah kembali. Coba TTS sebelum/sesudah RSVP; jangan ada audio yang bertumpuk dengan RSVP.
11. Pada buku server, uji perpindahan episode melalui RSVP. Saat jaringan terputus atau mendapat batas layanan, harus jeda dengan pesan; tidak mengunduh episode lain di latar belakang.
12. Ekspor/pulihkan backup dan periksa preferensi kecepatan serta progres. Jika melaporkan masalah, sertakan versi Android/WebView, file manager, sumber EPUB dan langkah reproduksi tanpa mengirim naskah pribadi/kunci.
