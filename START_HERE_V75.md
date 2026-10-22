# KataKecil V7.5 RC1

Update pengelolaan perpustakaan pribadi: hapus massal, impor EPUB dengan pilihan penerbitan, preset 1/2/3 kali seminggu, jeda/lanjutkan/atur ulang jadwal, serta penyempurnaan beranda dan Studio.

## Pemasangan

1. Pertahankan backup database dan gunakan staging untuk pemasangan pertama. V7.4 beserta migrasi sebelumnya harus sudah terpasang.
2. Jalankan **sekali** isi `supabase/updates/v75_publishing_management.sql` melalui SQL Editor pada proyek Supabase yang sama. File ini paket SQL mandiri, bukan migrasi bertimestamp dalam rantai CLI. Seluruh pernyataan dibungkus transaksi. Pemasangannya tidak menghapus novel atau menerbitkan naskah lama.
3. Jalankan `npm ci`, `npm run check`, `npm run build`, lalu deploy frontend seperti sebelumnya. Endpoint `cover-assets` V7.3 tetap digunakan; tidak ada secret baru di frontend.
4. Uji dengan novel sintetis: impor enam bab, tiga langsung terbit dan tiga terjadwal; jeda/lanjutkan; pindahkan ke Sampah dan pulihkan sebagai privat.

Frontend lama tetap dapat menggunakan RPC lama. Frontend V7.5 membutuhkan pembaruan SQL untuk fitur baru; jika belum terpasang, pesan pemasangan muncul dan tindakan baru gagal aman. Penerbitan terjadwal memakai `release_at` dan pemeriksaan waktu database yang sudah tersedia, sehingga tidak membutuhkan HP aktif atau cron penerbitan.

## Penggunaan

- **Karya Saya:** pilih novel melalui kotak centang, pilih hasil filter, atau tekan **Hapus semua novel**. Tombol terakhir mencakup semua novel yang dimuat, termasuk yang tersembunyi oleh filter. Dialog menunjukkan daftar/jumlah sebelum konfirmasi `HAPUS`. Novel masuk Sampah terlebih dahulu.
- **Sampah:** pulihkan pilihan sebagai privat/draf, hapus permanen pilihan, atau **Kosongkan Sampah** dengan konfirmasi `HAPUS PERMANEN`. Tidak ada penghapusan permanen otomatis berdasarkan umur.
- **Upload Naskah:** setelah pemeriksaan bab, pilih draf, terbitkan semua, jadwalkan semua, atau terbitkan pembuka dan jadwalkan sisanya. Preset hari dapat disesuaikan. Tanggal dan jam memakai WIB. Pilihan melanjutkan setelah jadwal terakhir tersedia untuk novel lama.
- **Sampul:** jika dipilih untuk diterbitkan bersama novel, unggahan privat diselesaikan lalu diterbitkan melalui endpoint sampul yang sudah ada. Kegagalan sampul tidak mengulang impor. Gunakan **Coba simpan sampul**; jika tab sudah ditutup, buka pengaturan sampul novel.
- **Kalender → Jadwal massal:** pilih draf, bab dijeda, atau bab mendatang. Buat pratinjau sebelum penerapan. **Jeda** menyembunyikan hanya bab mendatang. **Lanjutkan** membuat tanggal baru yang perlu dikonfirmasi; tanggal lama tidak dilepas sekaligus sebagai backlog.
- **Beranda:** enam Bab Baru dalam 30 hari terakhir dan rak Novel Tamat. Tautan rak tamat membuka Temukan dengan filter Tamat.

## Batas dan perlindungan

Studio saat ini merupakan **satu perpustakaan bersama untuk akun yang terdaftar di `qr_author_members`**, bukan platform kepemilikan novel per pengguna. Update mempertahankan model ini; penghapusan massal hanya tersedia bagi anggota Studio tersebut.

Maksimal 1000 bab per impor/jadwal, 60 halaman tambahan dan isi total 12 MB. Batas arsip: ZIP 20 MB, EPUB 18 MB, MD/TXT 8 MB. Impor besar tetap tunduk pada pemeriksaan ukuran dan keamanan arsip.

Impor + penerbitan merupakan satu transaksi. UUID dan payload dipertahankan saat mencoba ulang. Jika koneksi putus, periksa status impor sebelum memilih ulang berkas. Jadwal baru tidak menimpa bab terbit; pengaturan ulang hanya berlaku pada bab mendatang yang telah dipratinjau. Perubahan judul/status sasaran sejak dialog penghapusan dibuka membatalkan seluruh operasi.

## Pembersihan sampul novel yang dihapus permanen

Database mengantrekan ID novel yang dihapus permanen. File Storage tidak dihapus melalui SQL; jalankan alat operator berikut pada server dengan secret yang disimpan di lingkungan server:

```sh
# SUPABASE_URL dan SUPABASE_SECRET_KEY harus sudah disediakan oleh lingkungan operator.
npm run cleanup:deleted-covers
npm run cleanup:deleted-covers -- --apply
```

Perintah pertama hanya inventaris. Perintah kedua menghapus objek pada direktori persis novel yang telah dihapus, di bucket sampul yang dikelola aplikasi. Ada jeda minimal 10 menit untuk membiarkan unggahan yang sedang berjalan berakhir. Jika sebagian pembersihan gagal, antrean tetap tersimpan dan dapat dicoba lagi. Tombstone ID mencegah pemakaian ulang ID novel yang telah dihapus. URL sampul eksternal tidak dihapus.

**Antrean ini baru diproses jika alat operator dijalankan.** Untuk otomatisasi di hosting, jadwalkan perintah kedua pada runner tepercaya. Paket sumber ini tidak memasang job produksi atau mengubah pengaturan hosting.

## Verifikasi

```sh
npm run check
npm run build
npm run test:browser
```

Uji V7.5 memakai PostgreSQL PGlite dan Chromium dengan data sintetis: EPUB nyata, impor transaksional 1000 bab, penerbitan campuran, jeda/lanjutkan, hapus lintas filter, pemulihan privat, respons sukses yang terputus dan retry identik, penolakan akses non-penulis, serta ukuran layar 320/390/768/1440. Bukan bukti bahwa SQL/deployment sudah diterapkan pada proyek produksi atau pengujian langsung pada perangkat Android.

Rollback frontend dapat menggunakan versi V7.4. Pertahankan SQL baru dan backup; rollback frontend tidak membatalkan novel yang sudah dihapus/diterbitkan oleh penulis. Pulihkan dari Sampah untuk soft delete, dan gunakan backup untuk penghapusan permanen.
