# Catatan perubahan

Perubahan dicatat per rilis. Status Preview menandakan pengujian perangkat belum selesai.

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
