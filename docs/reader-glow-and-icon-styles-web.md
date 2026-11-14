# Glow halaman baca dan gaya ikon — web

**Tema → Glow halaman baca** tersedia dari Pengaturan utama maupun Tampilan baca → Tema. Default **mati**, termasuk pada instalasi lama: kertas tetap polos seperti sebelumnya. Ketika aktif, dua gradasi radial statis mengikuti warna aksen dan intensitas Ambient di pengaturan Liquid Glass. Ambient 0 mematikan warna glow; warna dasar kertas dan opacity teks tetap. Tidak ada blur atau animasi pada naskah.

Preferensi boolean `readerAmbientGlow` tersimpan antarsesi, tersinkron antartab dan disertakan dalam backup. Nilai lokal selain `true` menjadi mati; backup dengan nilai selain boolean ditolak. Backup lama diterima. Reset kenyamanan teks mempertahankan pilihan glow. Toggle tidak masuk signature pagination dan tidak mengganti node teks atau posisi baca. Efek dibatasi pada canvas reader, termasuk tata letak gulir/dua halaman; pengukur pagination dan RSVP tidak mendapat lapisan tambahan.

**Pengaturan → Lanjutan → Ikon & Loading** tetap menyediakan dua paket. Seluruh **52 ikon klasik Rounded KataKecil** kini memakai artwork mandiri solid/dua nada, dengan siluet dan detail berbeda dari **Lucide outline resmi**. Ikon sederhana juga dibedakan: tambah pada kotak rounded, centang dalam lingkaran dan menu tiga tanda vertikal. SVG Lucide upstream dipertahankan. Paket terpilih berlaku lewat helper bersama pada Library, Pengaturan, reader dan Publisher. Node SVG, atribut aksesibilitas serta listener tetap saat paket diganti. Loading dan logo KataKecil tidak diganti oleh pembaruan ini.

## Pemeriksaan singkat

- Build helper web, typecheck, check sintaks/aset/module graph lulus; **26 tes Node terarah** lulus untuk renderer, controller, toggle di kedua panel Tema, preferensi, reset dan backup.
- Chromium **390×844** dengan katalog/dua episode fixture lokal: default solid, aktif/mati, reload keduanya, sinkron antartab, Ambient 0/100, aksen rose/biru, terang/gelap, opacity/ukuran teks dan posisi baca tetap.
- Pergantian paket ikon mempertahankan SVG dan node teks/progres. Contact sheet seluruh 52 pasangan diperiksa visual. Glow statis pada reduced motion. Tidak ada page error atau permintaan jaringan tak terduga.
- [Hasil terstruktur](generated/reader-glow-and-icon-styles-web.json). Screenshot lokal: `/workspace/scratch/katakecil-reader-glow-icon-pairs.png`, `katakecil-reader-glow-light.png`, `katakecil-reader-glow-dark.png`.

Tidak menjalankan suite penuh, uji HP fisik, build APK atau penerbitan buku/backend produksi. Versi APK tetap **1.2.5/build 13**; pembaruan ini source web.

## Uji pengguna

1. Buka Tema: pastikan Glow halaman baca awalnya mati. Aktifkan, baca beberapa halaman, matikan lagi dan buka ulang aplikasi.
2. Coba aksen favorit, tema terang/gelap dan Ambient 0/60/100. Pastikan tulisan tetap nyaman dan posisi baca tidak bergeser; coba juga mode gulir dan dua halaman pada perangkatmu.
3. Bandingkan Rounded KataKecil dan Lucide melalui Ikon & Loading → Gunakan, termasuk di Tema, Library, reader dan Publisher.
