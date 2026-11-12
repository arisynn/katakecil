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

## Berikutnya

Preview 2 menyelaraskan reader, pagination, tab, slider, serta panel membaca. Preview 3 menyelesaikan Publisher, color picker, About, updater dan dialog pendukung.
