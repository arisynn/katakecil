# Native mengikuti web

Acuan awal: `main` pada `8185ce3c8c4a130da7c26395710eca1a27df8d57` (web 1.2.3). Branch native diperbarui dari GitHub sebelum perubahan. Web dan backend tidak diubah. Nama launcher/berkas tetap KataKecil/KataKecil.apk, package native tetap `id.karisyono.katakecil.nativeapp`.

## Preview 1 — fondasi, Library, Settings

- Gunakan font UI sistem seperti web, dengan warna permukaan, garis dan teks sekunder diturunkan dari palette web; font buku tetap terpisah.
- Header Library/Settings mengikuti ruang kosong dan hierarki judul web. Library tidak lagi memiliki baris logo atau judul/penulis tambahan di bawah sampul.
- Sampul memakai fit tanpa crop dan tanpa latar/bingkai tambahan. Carousel menyesuaikan ruang yang tersedia.
- Settings mengikuti kelompok Tampilan dan bahasa, Membaca, Data dan penyimpanan, lalu accordion Advanced; About dan updater berada di Advanced.
- Tombol/ikon menggunakan permukaan lebih tenang; satu scrim dialog, transisi masuk/keluar, header tetap pada sheet tema dan Liquid Glass, serta isi dibatasi setengah ruang jendela.
- Backdrop blur Android31+ mengambil satu snapshot RAM dari jendela aplikasi sendiri melalui PixelCopy. Hanya bagian latar panel yang diburamkan; teks foreground tetap tajam. Tidak ada tangkapan buku yang ditulis ke disk. Android lama mempertahankan fallback warna.

QA HP oleh pemilik. Proses rilis hanya kompilasi, identitas paket, tanda tangan, alignment dan checksum; tidak menjalankan suite QA atau emulator. Umpan balik visual tetap diperlukan, terutama warna kaca pada perangkat berbeda dan font sistem nonstandar.

## Preview 2 — Reader dan panel

- Font, indentasi dan jarak paragraf diukur dengan annotated layout yang sama dengan rendering, tanpa mengubah karakter/offset buku. Jarak huruf memakai satuan ukuran tampilan.
- Reflow dibatalkan ketika parameter berubah dan dikerjakan berurutan pada worker. Overlay loading tampil selama pengukuran; anchor offset tidak dipindahkan ke awal halaman saat reflow.
- Contents memakai header/tab tetap dan konten setengah layar. Appearance menggunakan tiga tab, grid ringkas dan dialog tema kustom.
- Slider dan tab mengikuti drag langsung; release/cancel mengakhiri pratinjau, tanpa timer. Reset teks/layout memakai konfirmasi dan tidak menyentuh tema/data.

## Preview 3 — Publisher dan dialog pendukung

- Publisher memakai padding, header, input dan daftar buku yang seragam dengan UI lainnya; login memiliki kontrol visibilitas kata sandi.
- Color picker memakai hue ring dan kotak saturasi/kecerahan, ukuran adaptif dan input HEX tanpa autofocus. Pemilih tema memakai tile; tema kustom tetap berupa dialog.
- About menampilkan wordmark asli. Impor, backup, penyimpanan, notes dan reading tools menggunakan sheet bersama. Hapus EPUB pribadi meminta konfirmasi.
- Updater menjaga aksi di atas changelog yang bergulir, memisahkan unduh dari pemasangan, dan menghormati opsi preview. Animasi pergantian halaman mengikuti pengaturan.
- Warna campuran menggunakan interpolasi kanal sRGB seperti CSS; bahasa tombol tutup mengikuti bahasa UI.

Ketiga tahap diimplementasikan dan diterbitkan sebagai prerelease native terpisah. Tidak ada QA visual/perangkat dalam sesi ini; pemilik menilai tampilan dan interaksi di Android. Build release dan pemeriksaan artefak tidak membuktikan semua interaksi benar pada semua perangkat.
