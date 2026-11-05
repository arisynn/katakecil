# Catatan perubahan

Perubahan dicatat per rilis. Status Preview menandakan pengujian perangkat belum selesai.

## Preview 3 — Publisher dan ekspor file (5 November 2026)

- Tambahkan Advanced → Publisher, login pemilik terverifikasi dan dukungan publisher key existing.
- Unggah EPUB: tamat terbit utuh, ongoing dijadwalkan bertahap. Update TXT/MD/HTML/EPUB dicocokkan dengan bab existing dan wajib ditinjau sebelum disimpan.
- Pertahankan ID/jadwal lama, periksa konflik versi, cegah request duplikat, dan arsipkan EPUB private yang dapat diunduh oleh publisher.
- Perbaiki Save backup/Export notes dengan unduhan browser langsung; perbarui dialog simpan Android dan dukungan EPUB.
- Tambahkan SDK Supabase 2.117.3 dan Marked 18.1.3; lisensi disertakan. [Panduan dan pemeriksaan](docs/publisher.md).

## Reader — Buku tamat, cover dan arc EPUB (5 November 2026)

- Ganti cover Apa Itu Rumah? dan rapikan halaman judul tanpa sinopsis; metadata Masa Panen menjadi completed sesuai konfirmasi penulis.
- Kenali arc Romawi, hierarki TOC dan judul bab secara adaptif. Rentang episode divider tidak menjadi halaman cerita; BAB1 tampil pada bab pertama Apa Itu Rumah?.
- Simpan EPUB siap baca dua buku tamat di bucket private dengan pemeriksaan publikasi/revisi yang sama. Naskah sumber, jadwal buku ongoing, dan UUID episode dipertahankan.
- Rincian, pemeriksaan dan rollback: [dokumen pembaruan](docs/completed-books-and-epub-structure.md).

## Web — Sinkronkan gelombang dan fade (5 November 2026)

- Gunakan kembali satu animasi dengan tempo normal 3,2 detik dan jeda antarbagian 0,13 detik agar gerak vertikal serta fade selalu sinkron, dari kiri ke kanan.
- Pemeriksaan singkat: `npm run check` dan `git diff --check`.

## Web — Pulihkan ritme gelombang logo (5 November 2026)

- Pisahkan fade dan gerak vertikal agar percepatan fade tidak ikut mempercepat gelombang.
- Kembalikan gelombang ke siklus 3,2 detik dengan jeda antarbagian 0,13 detik dan amplitudo lama. Fade tetap 2,4 detik dari kiri ke kanan; titik tetap di kanan.
- Pemeriksaan singkat: `npm run check` dan `git diff --check`.

## Web — Arah dan tempo loading (5 November 2026)

- Balik fade logo menjadi kiri ke kanan, searah urutan tiga titik typing indicator.
- Percepat siklus logo dari 3,2 menjadi 2,4 detik dan titik dari 1,4 menjadi 1,2 detik. Gelombang tipis, posisi titik di kanan, tema dan reduced motion dipertahankan.
- Pemeriksaan singkat: `npm run check` dan `git diff --check`. Kenyamanan tempo di HP diserahkan ke pengguna.

## Web — Typing indicator dan loading Library (5 November 2026)

- Tambahkan tiga titik berdenyut berurutan di samping kanan logo, sejajar dengan dasar huruf. Fade logo tetap bergerak dari kanan ke kiri.
- Pakai komponen yang sama untuk loading Library, membuka buku, menata halaman, dan preview. Hapus placeholder sampul serta teks loading Library dari tampilan; status aksesibilitas dipertahankan.
- Reduced motion menampilkan titik/logo statis. Loading reader yang tersembunyi menghentikan seluruh animasinya.
- Pemeriksaan: build, check, typecheck dan diff check; Chromium 320×568 memverifikasi tiga titik berada di samping logo tanpa overflow, loading Library tanpa skeleton/teks, preview yang sama, dan reduced motion.

## Web — Logo loading bergelombang dari kanan ke kiri (5 November 2026)

- Terapkan pilihan logo ke loading membuka buku dan menata halaman, tanpa spinner atau teks status yang terlihat. Label aksesibilitas tetap tersedia.
- Gunakan artwork logo asli, dengan fade bertahap dari kanan ke kiri dan gelombang vertikal tipis. Tidak menambah waktu tunggu buatan.
- Sederhanakan Settings → Advanced → Loading preview agar menampilkan animasi yang sudah dipilih; hapus tiga percobaan lainnya.
- Animasi berhenti ketika loading tersembunyi dan menjadi statis pada reduced motion. About/header tidak berubah.
- Pemeriksaan: build, check, typecheck dan diff check; Chromium memverifikasi arah fade (kanan memudar lebih dahulu, lalu kiri), gerak vertikal, reduced motion, loading reader tanpa teks/spinner dan animasi berhenti setelah selesai.

## Web — Percobaan animasi loading (5 November 2026)

- Tambahkan Settings → Advanced → Loading previews untuk membandingkan empat animasi bernomor: kutip bergantian, kutip melayang, logo fade, dan napas lembut.
- Ganti pilihan tanpa membuka ulang sheet; preview mengikuti tema dan reduced motion. Animasi hanya berjalan pada preview yang sedang ditampilkan.
- Galeri ini belum mengganti loading utama atau menyimpan pilihan final.
- Pemeriksaan: build, check, typecheck, diff check, serta Chromium untuk empat pilihan, identitas sheet, reduced motion dan panel 320×568 tanpa scroll.

## Web — Motion, branding dan panel adaptif (5 November 2026)

- Perbarui ikon tab dan aktifkan motion singkat ketika tab berubah; transisi isi mempertahankan header, tab, dan sheet yang sama.
- Samakan animasi masuk/keluar dialog dan picker, dengan cleanup setelah animasi, penanganan buka ulang cepat, dan reduced motion.
- Geser slider progres untuk menampilkan halaman dan persentase secara langsung; simpan posisi saat dilepas. Escape/pointercancel mengembalikan posisi semula tanpa timer.
- Kecilkan color wheel secara responsif. Panel pendek boleh memakai tambahan ruang hingga 48px agar tidak memerlukan scroll kecil; konten panjang dan keyboard tetap memakai scroll konten saja.
- Ganti logo lama dengan wordmark transparan di About/loading dan ikon kutip untuk favicon/launcher. Header Library/Settings dipertahankan.
- Resource ikon/splash Android diperbarui dalam source; belum menerbitkan APK baru.

## Web — TTS paragraf dan custom theme popup (4 November 2026)

- Baca TTS per paragraf dan highlight paragraf utuh; event kata hanya untuk posisi/navigasi. Hapus fallback utterance per kata. Paragraf sangat panjang tetap dibatasi sesuai batas 4.000 karakter Android.
- Buka editor Custom theme sebagai popup saat Custom dipilih; perubahan diterapkan setelah Apply colors, tanpa accordion tema.
- Perbesar color wheel secara responsif, tetap menyediakan hex tanpa autofocus keyboard.
- Saat accordion dibuka pengguna, gulir container kontennya agar isi terlihat; header panel tetap di tempat dan reduced motion dihormati.

## Web — Tema ringkas, color wheel dan resume setelah refresh (4 November 2026)

- Rapikan pilihan tema menjadi baris dua kolom dengan ikon, Custom selebar panel, dan dua baris warna Text/Background yang sejajar.
- Ganti slider RGB dengan color wheel yang di-host sendiri; input hex dan Apply tetap tersedia tanpa autofocus keyboard.
- Ingat buku aktif dan buka kembali pada posisi tersimpan setelah refresh melalui alur pembacaan terotorisasi yang sama. Keluar ke Library/Settings mengakhiri sesi aktif; konten buku tidak ditambahkan ke penyimpanan sesi.
- Dependency baru: reinvented-color-wheel 0.4.0 (WTFPL) dan pure-color 1.3.0 (MIT); atribusi dan lisensi disertakan.

## Web — Pemilih warna RGB (4 November 2026)

- Ganti grid preset warna dengan tiga slider RGB, preview warna dan input hex yang saling tersinkron. Nilai baru disimpan setelah Apply.
- Buka panel tanpa memfokuskan input teks; keyboard hanya muncul saat input diketuk. Fokus yang sudah dipilih pengguna tidak ditimpa callback panel.
- Perlindungan fokus saat resize keyboard sekarang juga mencakup editor dalam color picker.

## Web — Seleksi UI dan zoom lokal (4 November 2026)

- Nonaktifkan copy/cut, seleksi native pada UI, context menu dan drag teks. Kolom notes/input tetap dapat diedit dan menerima paste; highlighter aplikasi tetap memakai DOM Range.
- Blokir zoom viewport dari gesture/shortcut; pinch-out memperbesar hanya kanvas bacaan, maksimal 3×, dengan pan satu jari. Pinch-in pada ukuran normal tetap membuka menu.
- Zoom bersifat sementara, direset saat menu dibuka atau halaman diganti, serta tidak mengubah font, pagination atau progres. Toolbar, sheet, Settings dan Library tetap pada skala normal.

## Web — Loading buku dan Settings ringkas (4 November 2026)

- Tampilkan layar loading segera ketika membuka buku, lalu lanjutkan ke tahap penataan halaman. Hapus toast Opening book; error tetap memiliki feedback dan kembali ke Library bila buku belum termuat.
- Hapus tiga deskripsi di halaman Settings dan pindahkan About app beserta updater Android ke accordion Advanced.
- Pertahankan posisi header Library, data bacaan dan mekanisme otorisasi buku.

## Web — Comfort defaults untuk Text dan Layout (4 November 2026)

- Batasi reset ke pengaturan pada tab Text dan Layout; tema, aksen, bahasa aplikasi, TTS dan seluruh data bacaan dipertahankan. Konfirmasi tetap memakai dialog aplikasi.
- Hapus petunjuk Hold a slider dan rapatkan jarak bawah panel Appearance sambil mempertahankan safe area dan gutter preview slider.
- Entri reset seluruh pengaturan di bawah merupakan riwayat perilaku yang telah diganti.

## Web — Reset seluruh pengaturan (4 November 2026)

- Comfort defaults meminta konfirmasi melalui dialog aplikasi sebelum mengembalikan seluruh preferensi ke default terpusat.
- Reset mencakup bahasa, tema, aksen, font, layout, navigasi, layar dan TTS. Progres, koleksi buku, bookmark, highlight, notes dan identitas perangkat dipertahankan.
- Pembatalan tidak mengubah preferensi; kegagalan penyimpanan ditampilkan dalam dialog. Pengiriman berulang dibatasi saat proses berlangsung.

## Web — Ruang konten dan accordion arc (4 November 2026)

- Terapkan batas setengah layar pada konten yang bergulir; header/tab mendapat ruang tersendiri, dengan batas total tetap mengikuti viewport dan keyboard.
- Pertahankan metadata arc dari heading EPUB dan kelompokkan Contents menggunakan accordion native. Arc aktif terbuka otomatis; buku tanpa arc tetap memakai daftar biasa.
- Urutan bab, teks, anchor, dan identitas episode tetap dipertahankan. Tidak ada perubahan database atau publikasi.

## Web — Panel setengah layar dan fokus notes (4 November 2026)

- Batasi semua dialog dan picker maksimal setengah layar; judul/tab tetap, isi bergulir.
- Jaga panel di area viewport yang terlihat saat keyboard terbuka.
- Jangan ambil kembali fokus dari kolom yang sudah aktif ketika panel dibuka; tunda reflow reader saat mengetik dalam dialog.
- Simpan anchor draft notes terpisah dari seleksi sementara agar tetap bisa disimpan setelah perubahan viewport.

## Web — Alignment dan penanda bab (4 November 2026)

- Sejajarkan pilihan font dengan tombol Comfort defaults; margin label tidak lagi mengenai wrapper kontrol.
- Baca nomor bab dari ID heading semantik seperti chapter-11-title apabila teks judul tidak mencantumkannya. Nomor dalam teks tetap diprioritaskan; ID sembarang tidak digunakan.
- Naikkan revisi parser agar EPUB lokal dengan buffer dapat diparsing ulang; isi dan identitas episode tetap sama.

## Web — Settings dan panel tetap (4 November 2026)

- Susun Settings menjadi Appearance & language, Reading, Data & storage, dan About app; upload EPUB tetap di Advanced.
- About menampilkan versi dari konfigurasi rilis, platform, GitHub dan atribusi; updater Android tetap tersedia.
- Header Settings serta judul/tab dialog tetap di tempat; hanya isi yang bergulir. Tab dan sheet tetap dipertahankan ketika berpindah.
- Hilangkan lingkaran tambahan pada ikon toolbar reader, pertahankan target sentuh dan penanda bookmark aktif.
- Pemeriksaan dibatasi ke build, typecheck, pemeriksaan modul, dan tes panel terarah. QA visual/perangkat dilanjutkan pemilik.

## Web — Header sederhana (4 November 2026)

- Hapus logo dan nama KataKecil dari header Library dan Settings, serta angka jumlah buku di samping Library.
- Pertahankan ruang baris branding sebelumnya agar posisi judul dan jarak atas tidak bergeser.

## Web — Kembali ke tampilan Preview 2 (4 November 2026)

- Kembalikan stylesheet kaca ke tampilan v1.0.1-preview.2: blur ringan, panel lebih tenang, tombol dan header seperti semula.
- Pertahankan kemampuan drag tab, pelepasan slider langsung, feedback validasi aplikasi, reader dan updater GitHub.
- Pembaruan web saja; APK Preview 2 tetap sama. Catatan audit liquid glass di bawah merupakan riwayat eksperimen yang telah dibatalkan tampilannya.

## Web — Konsistensi liquid glass (4 November 2026)

- Audit seluruh UI sebelum implementasi; satukan panel, header, picker, toast, loading dan empty state dalam fondasi kaca tiga lapis.
- Kontrol, disclosure, toolbar reader, slider dan switch memakai rim/tint konsisten tanpa nested backdrop blur.
- Pertahankan drag lensa, preview slider, tema global, dark mode, reduced motion dan fallback.
- Validasi form menggunakan toast aplikasi; constraint input tetap berlaku.
- 72 tes lulus; audit Chromium 32 konteks, 8 ukuran, 120 kombinasi slider serta drag mouse/touch. [Audit dan batas pengujian](docs/ui-liquid-glass-audit.md).

## Web — Liquid drag (4 November 2026)

- Gabungkan pembaruan CSS meniscus: lensa di atas ikon, pinggiran blur/prisma dan kubah bening.
- Drag jari/mouse mengikuti pointer; pelepasan langsung memilih tab terdekat satu kali, dengan velocity stretch terbatas dan sheet tetap terpasang.
- Kunci arah horizontal, perlindungan scroll vertikal, pointercancel/sentuhan kedua/Escape, reduced motion dan fokus keyboard.
- Adaptasi SVG displacement khusus tepi lensa serta gradasi latar yang lembut; fallback CSS tetap tersedia.
- 72 tes regresi, 12 tes terarah, 18 pemeriksaan posisi lensa, 6 drag mouse/touch browser dan 120 kombinasi slider lulus. [Detail](docs/liquid-glass-drag.md).

## Web — 4 November 2026

- Terapkan stylesheet iPhone glass yang diberikan pemilik proyek: tint lebih tipis, blur 44–60px, sorotan/bevel dan lensa lebih kuat.
- Cache stylesheet dinaikkan ke `glass.css?v=2`. Perilaku Reader dan updater tetap memakai implementasi yang sama.
- 9 tes terarah, 18 pemeriksaan posisi lensa di aplikasi asli dan 120 kombinasi preview slider lulus. Lihat [catatan web](docs/iphone-glass-web.md).

## v1.0.1-preview.2 — 4 November 2026

- Efek kaca konsisten di seluruh permukaan UI, mengikuti tema dan aksen global.
- Lensa aktif untuk tab yang ada; sheet dan elemen tab bertahan saat berpindah.
- Updater APK melalui GitHub Releases: pemeriksaan manual/harian, Preview channel, progres/cancel download, pemeriksaan SHA-256, package/version/signature dan installer Android.
- Identitas Karisyono tetap sama, versionCode naik ke 2; versi aplikasi `1.0.1-preview.2`.
- Konfigurasi versi terpusat dan unit test native pada build release.
- 69 tes web, 14 tes terarah akhir, 3 tes native, serta pemeriksaan browser nyata; belum QA perangkat Android. [Catatan rilis](docs/releases/v1.0.1-preview.2.md).

## v1.0.0-preview.1 — 4 November 2026

Rilis APK Android pertama, dengan versi aplikasi `1.0.0` dan versionCode `1`.

### Ditambahkan

- Proyek Android Capacitor dengan UI, font, dan parser yang disertakan dalam APK.
- Ikon launcher dan splash memakai logo KataKecil yang sudah ada.
- Integrasi Android TextToSpeech, layar penuh, orientasi, layar tetap menyala, dan dialog simpan berkas.
- Handler tombol/gesture Back Android dan browser Back.
- Backup JSON berversi untuk progres, anotasi, bookmark, dan pengaturan; preview sebelum pemulihan.
- Pemulihan ekspor catatan lama, penggabungan data berdasarkan timestamp, serta pelestarian identitas perangkat dan tombstone penghapusan.
- Checkpoint progres saat meninggalkan reader atau berpindah aplikasi, dialog yang mempertimbangkan keyboard, dan target sentuh mobile.
- Skrip build APK, pembuatan kunci privat, verifikasi tanda tangan, dan checksum.
- README baru, panduan kontribusi, template laporan masalah/PR, serta dokumentasi rilis.

### Dipertahankan

- Reader halaman/scroll, tema, kontrol teks, highlight, catatan, bookmark, pencarian, kamus, dan terjemahan.
- Pemeriksaan publikasi serta revisi EPUB server melalui `katakecil-reader`.
- Penyimpanan lokal untuk EPUB impor pribadi dan metadata bacaan.
- Identitas hosting yang sudah ada.

### Validasi build APK

- 63 tes otomatis lulus; typecheck dan pemeriksaan sintaks/integrasi lulus.
- Android assembleRelease dan lintRelease lulus; lint masih memiliki peringatan yang tercatat.
- Sertifikat `CN=Karisyono`, signature v2/v3, alignment, checksum, manifest, logo, dan 56 aset web diverifikasi.
- Katalog dan respons EPUB diperiksa melalui HTTPS dari host dengan Origin `https://localhost`.

### Batas yang diketahui

- Belum ada pengujian browser yang dirender, emulator, atau HP fisik; audio dan gesture nyata masih perlu QA.
- Pembukaan buku server memerlukan koneksi; offline berlaku untuk EPUB impor pribadi.
- Penyimpanan browser dan APK terpisah; EPUB tidak dibawa dalam backup JSON.
- Baca nyaring dijeda saat aplikasi ditinggalkan; belum ada layanan audio latar belakang/layar terkunci.
- Publikasi Play Store/AAB, penerbitan situs, serta deployment patch backend tidak termasuk rilis ini.

Detail dan berkas unduhan: [KataKecil Android Preview](https://github.com/arisynn/katakecil/releases/tag/v1.0.0-preview.1).
