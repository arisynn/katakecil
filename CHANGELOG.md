# Catatan perubahan

Perubahan dicatat per rilis. Status Preview menandakan pengujian perangkat belum selesai.

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
