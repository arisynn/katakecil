# Menggunakan revisi dan menyelesaikan konflik

## Membuat titik pemulihan

Tekan ikon riwayat di bar atas editor. Editor menyimpan perubahan yang masih tertunda sebelum membuka daftar. Jika penyimpanan gagal, perbaiki koneksi atau tinjau konflik terlebih dahulu; teks lokal tetap berada di editor.

Daftar menampilkan paling banyak 30 revisi milik bab tersebut. Isi tidak diunduh sekaligus. Tekan **Buat checkpoint** untuk menyimpan versi saat ini sebagai titik pemulihan. Checkpoint tidak menerbitkan bab atau mengubah jadwalnya.

Snapshot otomatis menyimpan keadaan sebelum perubahan sekitar sekali setiap lima menit ketika ada perubahan judul, arc, atau isi. Snapshot pertama diambil ketika bab pertama kali berubah setelah migrasi. Ini bukan riwayat setiap ketukan tombol. Tidak ada pemulihan versi yang sudah ditimpa sebelum fitur diaktifkan. Revisi tertua digantikan saat jumlahnya melewati 30; tidak ada batas umur berbasis hari.

## Memulihkan revisi

Pilih salah satu revisi. Periksa judul, arc, isi lengkap, dan ringkasan perubahan terhadap server. Hasil tinjauan boleh diedit terlebih dahulu. Centang **Saya sudah meninjau hasil ini**, lalu tekan **Pulihkan hasil tinjauan** dan setujui konfirmasi.

Versi server sebelum perubahan disimpan sebagai revisi **Sebelum pemulihan** bila hasil berbeda. Bab tidak berganti nomor, status, jadwal, atau penanda akhirnya. Jika bab sudah terbit, hasil yang disimpan langsung terlihat oleh pembaca. Untuk membatalkan hasil pemulihan, buka kembali riwayat dan tinjau versi sebelum pemulihan.

## Jika bab berubah di tab lain

Editor berhenti menyimpan otomatis dan menampilkan **Tinjau konflik**. Teks yang sedang ditulis tetap ada. Panel menyediakan:

- Versi dasar saat editor terakhir berhasil menyimpan.
- Perubahan lokal yang belum berhasil disimpan.
- Versi server lengkap beserta nomor versinya.
- Kolom **Hasil tinjauan**, judul/arc, dan ringkasan baris yang berubah.

Usulan awal memakai bidang server jika bidang itu belum kamu ubah. Bila kedua sisi mengubah isi, panel mempertahankan isi lokal sebagai titik awal. Gabungkan bagian yang ingin dipertahankan secara manual; sistem tidak menggabungkan atau menimpa naskah secara diam-diam. Pilihan **Pakai perubahan lokal** dan **Pakai versi server** hanya mengisi hasil tinjauan.

Simpan setelah memeriksa dan mencentang konfirmasi. Server memeriksa nomor versi lagi. Bila server berubah selama tinjauan, penyimpanan kembali ditolak dan hasil gabungan tetap ada. Tekan **Muat ulang versi server**; teks gabungan yang diketik tidak hilang. Tinjau ulang terhadap server terbaru sebelum menyimpan lagi. Menutup panel yang berisi perubahan manual meminta konfirmasi.

Ringkasan perubahan dibatasi 120 baris dan 4.000 karakter per baris. Naskah besar dibandingkan sebagai blok agar panel tetap ringan. Pembatasan ringkasan tidak memangkas teks pada kolom hasil atau tampilan lengkap.

## Saat jaringan terputus

Gunakan **Coba simpan**. Editor mempertahankan UUID dan payload operasi yang statusnya belum pasti di memori, sehingga respons commit yang hilang dapat diambil kembali tanpa menerapkan perubahan dua kali. Jika teks berubah setelah kegagalan, operasi sebelumnya diselesaikan dahulu, lalu perubahan berikutnya disimpan dengan nomor versi baru.

Jangan tutup atau muat ulang tab sebelum penyimpanan berhasil jika masih ada teks yang belum terkirim. Fitur ini menyimpan revisi di server privat, tanpa membuat draft offline. Setelah keluar dari akun, hanya penulis yang kembali terverifikasi dapat meminta isi revisi.
