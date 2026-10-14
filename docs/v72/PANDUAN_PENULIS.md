# Panduan penulis V7.2

## Menyiapkan ZIP

Satu ZIP sebaiknya mewakili satu karya. Gunakan file UTF-8, misalnya `Arc I/001_Awal.md`, `Arc I/002_Pertemuan.md`, `Arc II/010_Pulang.md`. Folder dengan nama Arc/Bagian/Part dapat menjadi petunjuk arc. Struktur EPUB tetap mengikuti spine, bukan urutan abjad file.

| Isi arsip | Perlakuan |
|---|---|
| MD/TXT | Dibaca, dipecah berdasarkan heading/batas bab yang dikenali |
| Satu EPUB | Diproses setelah ekstraksi ZIP; lebih dari satu EPUB ditolak |
| Prolog | Calon episode 0, bukan otomatis dibuang |
| Epilog/interlude/bonus | Bagian naratif; nomor diperiksa penulis |
| Pembuka sebelum Bab 1 | Dipertahankan sebagai kandidat yang perlu diperiksa |
| Kata pengantar/dedikasi | Dapat disimpan sebagai halaman buku tanpa nomor |
| README/outline/dokumen kerja | Dikeluarkan dari pilihan awal; tetap bisa dibuka dan dikembalikan |
| Berkas sistem | Dilewati, tidak disimpan |
| PDF/DOCX/nested ZIP/gambar isi/lainnya | Dicatat sebagai belum didukung; tidak dimasukkan ke episode |
| `cover...png/jpg/webp` atau `sampul...` | Ditawarkan sebagai sampul terpisah, tidak menjadi bab |

Tidak ada pengiriman isi ke layanan AI. “Pintar” di sini adalah pengenalan struktur dan aturan yang dapat diperiksa, bukan janji semua ZIP akan terklasifikasi sempurna. Arsip beberapa karya belum dipisahkan menjadi beberapa buku otomatis; periksa path sumber dan impor karya secara terpisah.

## Memeriksa hasil

1. Pilih ZIP, EPUB, MD, atau TXT. Tunggu progres; ZIP dapat dibatalkan.
2. Pilih karya tujuan atau buat karya baru yang privat.
3. Buka setiap kandidat yang bertanda perlu diperiksa. Periksa path sumber, alasan, jenis, nomor, judul, arc, dan isi. Centang konfirmasi setelah sesuai.
4. Keluarkan file yang bukan episode. Jika ternyata halaman tambahan, ubah jenisnya. Berkas unsupported yang tidak mempunyai teks tidak bisa dipaksakan menjadi episode.
5. Gunakan penomoran hanya untuk nomor yang kosong. Default melanjutkan setelah nomor terbesar karya; pilihan mulai nomor tertentu dan isi celah tersedia. Nomor yang sudah ada tidak ditimpa.
6. Naik/turun mengubah urutan pemeriksaan. **Reader mengurutkan berdasarkan nomor episode.** Gunakan urutkan berdasarkan nomor untuk membantu review; koreksi nomor jika urutan baca harus berubah.
7. Gabung/pisah membuat kandidat perlu dikonfirmasi kembali. Undo menyimpan satu langkah perubahan selama sesi.
8. Periksa ringkasan jumlah episode, halaman, nomor dan item yang dilewati, lalu simpan. Tidak ada publikasi otomatis.

Batas: ZIP 20 MB, EPUB 18 MB, teks 8 MB per berkas, keluaran ekstraksi gabungan 70 MB, 1000 entry ZIP/kandidat teks, kedalaman folder 10, maksimal 120 episode + 60 halaman per commit, satu isi maksimal 1 juta karakter, total isi 12 MB. UI menggunakan batas konservatif 12 MB untuk seluruh payload JSON, sehingga metadata dan escaping juga dihitung. Pecah arsip besar menjadi beberapa batch.

## Jika koneksi terputus saat menyimpan

- Jangan membuat operasi baru dengan file yang sama langsung. Form dikunci untuk menjaga UUID dan payload tetap identik.
- Pilih **Periksa status impor**. Jika server sudah menyimpan, receipt akan menunjukkan jumlah hasil.
- Bila hasil belum terkonfirmasi dan sesi review masih ada, **Coba simpan lagi** mengirim UUID dan payload yang sama. Server mengembalikan hasil lama bila commit sebelumnya berhasil.
- Sesudah reload, hanya UUID operasi yang tersedia. Isi review tidak dipersistenkan. Periksa status terlebih dahulu; jika belum ada transaksi, periksa daftar karya lalu pilih berkas ulang. Status tidak bisa memulihkan draft review yang belum pernah dikirim.
- Kesalahan validasi yang ditolak server membuka kembali pemeriksaan. Pesan konflik nomor/isi berarti data lama tidak ditimpa; bagian di Sampah juga bisa masih menggunakan nomor tersebut.
- Kegagalan sampul tidak membatalkan naskah yang sudah tersimpan dan tidak mengulang commit episode.

## Sampul dan editor

Sampul dari impor hanya diunggah jika dipilih, ke bucket privat. Di pengaturan novel, penulis dapat melihatnya melalui unduhan berizin di RAM. Opsi publikasi sampul menyalin ke bucket publik setelah konfirmasi; mempublikasikan novel tidak otomatis memindahkan sampul privat.

Editor menolak autosave jika versi server sudah berubah sejak dibuka. Saat konflik, pertahankan teks lokal, salin perubahan yang ingin diselamatkan, lalu muat ulang versi terbaru untuk menyelaraskan. Tidak ada penggabungan otomatis atau penimpaan paksa.

Pratinjau menggunakan isi saat ini dan nomor asli. Untuk bab yang sudah terbit, autosave editor tetap memperbarui bab publik sesuai perilaku sebelumnya; pratinjau bukan cabang draft baru.

## PWA

Pilih **Pasang aplikasi** dari navigasi/pengaturan. Browser yang mendukung prompt akan menawarkannya; browser lain menampilkan petunjuk menu. Membaca tetap memerlukan internet. Ketika offline, reader menghapus isi sementara yang tampil dan meminta koneksi kembali. Perubahan editor yang belum tersimpan tetap berada di RAM, sehingga jangan menutup tab sampai tersimpan.
