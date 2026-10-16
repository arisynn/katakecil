> Arsip rencana yang disetujui sebelum implementasi. Pernyataan status di bawah merujuk saat rencana dibuat. Hasil V7.3 dan pekerjaan staging yang tersisa dijelaskan dalam QA_DAN_DEPLOY.md. Saran update setelah sampul tetap menjadi backlog.

# KataKecil — Rencana Sampul Cerdas dan Update Lanjutan

**Status: usulan untuk ditinjau; belum ada perubahan kode, database, atau deployment untuk fitur ini.**

Dasar audit: paket KataKecil V7.2 RC1 setelah pembersihan. Pemeriksaan kali ini menelusuri sumber upload manual, impor ZIP/EPUB, komponen sampul, query buku, dan CSS. Temuan sumber belum berarti seluruh kasus telah direproduksi di perangkat atau produksi. Catatan Supabase sebelumnya digunakan sebagai tindak lanjut yang harus diperiksa kembali, bukan dianggap sebagai keadaan produksi terkini.

## 1. Keputusan utama yang direkomendasikan

**Terima berbagai rasio sampul, pertahankan proporsi gambar, dan pisahkan bentuk bingkai katalog dari bentuk gambar aslinya.** Bingkai kartu katalog tetap 2:3 supaya baris dan judul rapi. Gambar ditampilkan utuh secara bawaan; penulis dapat memilih pemotongan dengan pratinjau yang jelas.

Jika rasio gambar berbeda dari bingkai, ada dua pilihan yang jujur: menyisakan ruang di sekeliling gambar atau memotong sebagian gambar. Memaksakan keduanya tanpa ruang dan tanpa potongan akan meregangkan gambar. Perilaku `contain` dan `cover` mendukung dua pilihan tersebut [S1].

| Sampul masuk | Tampilan bawaan dalam kartu 2:3 | Pilihan penulis |
|---|---|---|
| 2:3 | Memenuhi bingkai, proporsi tetap | Geser fokus jika memilih pembesaran |
| 9:16 seperti wallpaper HP | Utuh, ada ruang di kiri dan kanan | Penuhi bingkai dengan meninjau bagian atas/bawah yang terpotong |
| 3:4 | Utuh, ada ruang di atas dan bawah | Penuhi bingkai dengan meninjau bagian kiri/kanan yang terpotong |
| 1:1 atau lanskap | Utuh dengan ruang lebih besar | Atur area potong untuk katalog atau gunakan gambar lain |
| Sangat tinggi/panjang | Utuh; sistem memberi tahu bahwa detail akan terlihat kecil | Buat potongan khusus katalog, sementara tampilan detail tetap utuh |
| Resolusi kecil | Ditampilkan sesuai kemampuan sumber | Peringatan kualitas; penulis boleh melanjutkan |

Ruang tambahan menggunakan warna permukaan Sapphire sesuai tema. Warna ilustrasi asli tetap dipertahankan. Latar blur dapat menjadi pilihan lanjutan, bukan bawaan yang menambah beban gambar dan mengganggu karya.

## 2. Temuan audit yang menjadi dasar pekerjaan

| Temuan pada sumber sekarang | Dampak | Rencana perbaikan |
|---|---|---|
| Upload manual menyimpan berkas asli, tanpa resize atau kompresi | Kartu kecil dapat memuat gambar besar | Buat ukuran turunan sesuai tempat tampil |
| Pemeriksaan tipe dan ukuran berkas dilakukan setelah `createImageBitmap` pada upload manual | Berkas terlalu besar sudah mulai didekode | Periksa byte, signature, dan dimensi header sebelum decode; beri batas total piksel |
| Batas manual 5.242.880 byte, sedangkan impor dan bucket privat 5.000.000 byte | Perilaku berbeda antar jalur | Satu kebijakan ukuran yang dipakai UI, parser, validator, dan Storage |
| `Cover.tsx` mempertahankan state gagal meskipun URL berubah | Sampul pengganti dapat tetap menjadi gambar cadangan | Reset status saat identitas/versi sampul berubah; batasi rantai fallback |
| Sampul unggahan tidak memiliki varian responsif seperti aset bawaan | Pemborosan transfer dan kurang kendali ketajaman | Gunakan manifest ukuran, `srcset`, `sizes`, dan dimensi intrinsik |
| Aturan `contain`, ukuran, dan `!important` tersebar di CSS | Perubahan mudah berbeda antara Studio, katalog, dan detail | Satu kontrak tampilan sampul dengan variasi konteks yang eksplisit |
| Komponen memuat elemen gambar backdrop yang disembunyikan di beberapa halaman | DOM dan pekerjaan gambar yang tidak diperlukan | Hilangkan elemen dekoratif jika tidak digunakan; jangan menganggap URL sama pasti berarti dua unduhan jaringan |
| Gambar cadangan dipilih dari ilustrasi berdasarkan judul/ID | Kegagalan sampul dapat tampak seperti pilihan ilustrasi penulis | Placeholder Sapphire dengan judul; kegagalan dibedakan dari belum punya sampul |
| Prioritas preview form dapat menampilkan URL publik lama saat sampul privat dipilih | Penulis bisa meninjau gambar yang berbeda dari yang akan dipublikasikan | Satu state sumber terpilih: unggahan, impor privat, atau URL lama |
| ZIP mengambil kandidat pertama bernama `cover`/`sampul` | Sampul lain bisa terlewat atau pilihan pertama keliru | Daftar kandidat, urutan rekomendasi, dan keputusan penulis |
| Penyimpanan objek Storage dan pengaitan ke buku berjalan terpisah | Gagal menyimpan buku dapat meninggalkan objek; penggantian menyisakan versi lama | Status operasi, commit metadata, retry idempoten, dan pembersihan terarah |

Lokasi sumber utama: `src/components/Cover.tsx`, `src/features/studio/components/BookManagement.tsx`, `src/pages/ManuscriptImporter.tsx`, `src/features/import/zip.ts`, `src/utils/importEpub.ts`, `src/data/library.ts`, serta `src/design/v70-alpha.css` dan `v69-writer-studio.css`.

## 3. Pengalaman upload yang diusulkan

### Langkah 1 — Pilih gambar

Penulis memilih gambar dari HP, menyeret berkas di desktop, atau memilih kandidat dari impor. Sistem menampilkan thumbnail, nama, dimensi, ukuran berkas, dan rasio yang dikenali. Pemilihan gambar baru membatalkan proses gambar sebelumnya supaya hasil lama tidak menimpa pilihan terakhir.

JPG, PNG, dan WebP menjadi format awal. Berkas rusak, format tidak didukung, animasi, dan berkas yang hanya mengganti ekstensi mendapatkan pesan spesifik. HEIC/AVIF dapat ditambahkan sesudah jalur konversinya diuji; jangan mengiklankan dukungan yang belum ada.

### Langkah 2 — Analisis dan saran

Sistem memeriksa orientasi foto, dimensi, transparansi, rasio, kebutuhan resize, dan kecukupan resolusi untuk ukuran tampil. Contoh pesan: “Sampul 9:16. Gambar akan tampil utuh dengan ruang di sisi kiri dan kanan.”

Untuk gambar ekstrem: “Gambar sangat panjang. Detail akan terlihat kecil di katalog. Kamu bisa mengatur potongan khusus katalog.” Rekomendasi tidak memotong gambar secara otomatis.

Deteksi tahap awal menggunakan metadata dan aturan geometri yang bisa dijelaskan. Membaca teks pada sampul atau mengenali area penting dengan AI merupakan eksperimen lanjutan; hasilnya hanya saran yang dapat dikoreksi. Tidak perlu mengirim karya ke layanan AI untuk fitur dasar ini.

### Langkah 3 — Atur tampilan

Dua pilihan sederhana:

- **Tampilkan utuh — bawaan.** Seluruh gambar terlihat; penulis dapat mengatur posisi atas/tengah/bawah jika relevan.
- **Penuhi bingkai.** Penulis menggeser dan memperbesar area potong 2:3. Area di luar potongan terlihat redup selama pengaturan agar kehilangan bagian gambar mudah dikenali.

Sediakan putar 90°, reset, geser/zoom dengan sentuhan, dan kontrol keyboard. Orientasi EXIF diperbaiki sekali sebelum koordinat potongan dihitung. Gambar tidak diregangkan. Resolusi rendah mendapatkan peringatan, bukan pembesaran yang diklaim menambah detail.

### Langkah 4 — Lihat hasil nyata

Tampilkan tiga preview dari sumber dan pengaturan yang sama: **kartu katalog**, **detail cerita**, dan **daftar Studio**. Preview memakai komponen tampilan yang nantinya dipakai pembaca. Ada pemeriksaan tema terang/gelap, terutama untuk PNG transparan.

Judul, nama penulis, serta tombol ditempatkan di luar area ilustrasi. Kontrol preview tidak menutupi gambar atau teks cerita.

### Langkah 5 — Simpan atau terbitkan

Sediakan aksi yang jelas: **Simpan sampul privat** dan **Terbitkan sampul**. Untuk karya yang sudah terbit, versi yang sedang disiapkan tidak mengganti sampul pembaca sampai penulis memilih menerbitkannya. Perubahan status buku tidak otomatis memublikasikan sampul privat hasil impor.

Status proses: memeriksa gambar → menyiapkan ukuran → mengunggah → menyimpan. Persentase hanya ditampilkan saat jumlah pekerjaan diketahui. Sediakan batal, coba lagi, dan pesan yang membedakan “gambar gagal diunggah” dari “gambar sudah diunggah tetapi belum tersambung ke cerita”. Sampul aktif tetap tersedia ketika operasi baru gagal.

## 4. Aturan menampilkan sampul di setiap halaman

| Tempat | Aturan |
|---|---|
| Katalog, pencarian, rekomendasi | Bingkai 2:3 tetap; gunakan pilihan utuh/potong penulis; judul memiliki area tersendiri dengan tinggi yang konsisten |
| Koleksi dan daftar Studio | Thumbnail berukuran stabil; gunakan pengaturan katalog; judul panjang tidak menggeser gambar |
| Detail cerita | Gambar utuh dengan proporsi asli, lebar/tinggi maksimum yang responsif; gambar ekstrem tidak membuat halaman sangat panjang |
| Lihat lebih besar | Tampilkan versi detail yang dioptimalkan dengan zoom dan tombol tutup/kembali yang terlihat; tidak membuka berkas master privat |
| Form dan importer | Perlihatkan pilihan yang sedang diedit dengan jelas; sumber privat diambil melalui akses penulis |
| Gagal dimuat | Placeholder netral yang tidak menyerupai ilustrasi terpilih; Studio menawarkan retry dan alasan yang dapat ditindaklanjuti |

Untuk rasio ekstrem, kartu dapat memakai potongan yang disetujui sedangkan detail tetap utuh. Kedua hasil tersebut sudah ditampilkan saat pengaturan, sehingga tidak menjadi kejutan setelah publikasi.

Sediakan ruang gambar sejak awal agar layout tidak melompat. Muat gambar di luar layar secara bertahap; prioritaskan hanya sampul utama yang benar-benar terlihat. Ikon upload, putar, kembali, zoom, dan reset mengikuti token Sapphire dengan kontras yang sesuai pada tombol berwarna biru.

## 5. Optimasi dan batas yang diusulkan

Angka berikut adalah **parameter awal untuk diuji**, bukan batas yang sudah diterapkan atau jaminan performa seluruh HP.

| Bagian | Usulan awal |
|---|---|
| Masukan | Maksimum 15 MiB, 20 megapiksel, dan 8.192 piksel pada sisi terpanjang; ketiganya wajib terpenuhi |
| Thumbnail daftar | Lebar target 160 px |
| Kartu | Lebar target 360 dan 720 px, mengikuti kebutuhan layar dan kepadatan piksel |
| Detail | Sisi terpanjang maksimum 1.600 px |
| Format turunan | WebP jika encoder mendukung; fallback JPEG/PNG yang sesuai transparansi |
| Anggaran transfer awal | Thumbnail sekitar 20–50 KB; kartu 80–160 KB; detail 200–500 KB, dengan kelonggaran bila detail ilustrasi/teks membutuhkannya |

Varian mode utuh mempertahankan rasio asli dan dibatasi sisi terpanjang; gunakan lebar keluaran sebenarnya dalam `srcset`. Varian mode potong mengikuti 2:3. Jangan membuat ukuran yang sama berulang kali atau menaikkan resolusi sumber kecil. Browser memilih ukuran yang sesuai melalui `srcset`/`sizes` [S2].

Pemrosesan di perangkat dilakukan bertahap, idealnya dalam worker bila didukung, agar pilihan gambar dan tombol batal tetap responsif. Jalur fallback harus diuji pada Safari dan HP dengan memori terbatas. Batas byte, dimensi header, dan total piksel diperiksa sebelum alokasi bitmap besar; timeout dan pembatalan tetap tersedia.

Browser membuat preview dan turunan awal. Sebelum publikasi, jalur server tepercaya harus memvalidasi isi gambar, dimensi, jumlah berkas, batas byte, dan hak penulis. Batas MIME/ukuran bucket dan validasi browser saja tidak membuktikan bahwa isi berkas valid. Pilih validator/processor yang dapat dijalankan dengan batas memori deployment; buktikan lewat uji kecil sebelum menetapkan dependensi baru.

Rekomendasi dasar adalah menyimpan ukuran turunan yang sudah jadi agar tampilan tidak bergantung pada transformasi berbayar saat dibaca. Supabase Image Resizing saat ini tersedia pada paket Pro ke atas [S3]; alternatif tersebut dapat dinilai jika paket proyek dan kebutuhan biaya memang cocok. Tidak ada asumsi bahwa proyek sekarang sudah memakai paket tersebut.

Perubahan batas upload wajib serentak pada UI, pembaca arsip, validator server, dan konfigurasi bucket. Batas total ekstraksi ZIP serta batas jumlah kandidat tetap diberlakukan; menaikkan ukuran satu sampul bukan alasan membuka dekompresi tanpa batas.

## 6. Penyimpanan, privasi, dan kegagalan

### Data dan akses

- Simpan master asli secara privat untuk pengaturan ulang. Yang dipublikasikan adalah turunan yang telah disetujui, bukan master asli.
- Normalisasi orientasi; hilangkan metadata lokasi/EXIF pada turunan publik. Uji profil warna agar ilustrasi tidak berubah mencolok.
- Tambahkan data aset sampul privat: identitas buku, versi, sumber impor/manual, dimensi, ukuran, checksum, pengaturan potong, status, dan identitas operasi.
- Data publik hanya memuat URL turunan, dimensi, versi, serta pengaturan tampilan yang diperlukan. Jalur master privat dan metadata internal tidak masuk respons publik.
- `getPublicLibrary()` sekarang mengambil `qr_books.select('*')`. Ganti kontrak publik dengan kolom eksplisit dan simpan metadata sensitif dalam struktur privat yang dijaga izin server. Pemilihan kolom frontend sendiri bukan kontrol keamanan.
- Kebijakan akses mengikuti model penulis yang ada. Hak upload/publikasi diperiksa di server terhadap keanggotaan dan karya tujuan; identitas dari browser tidak dipercaya begitu saja.

### Urutan penyimpanan

1. Buat identitas operasi unik dan versi sampul yang masih privat.
2. Unggah serta validasi master/turunan; catat status dan daftar objek hasilnya.
3. Simpan versi privat yang siap ditinjau. Persiapan ini belum mengubah sampul aktif.
4. Sesudah penulis memilih terbitkan, salin turunan yang disetujui ke lokasi publik dengan nama berversi.
5. Transaksi database mengganti referensi sampul aktif jika versi buku masih cocok. Bila penulis lain/tab lain sudah mengubahnya, tampilkan konflik.
6. Simpan hasil operasi agar retry setelah respons hilang mengembalikan hasil yang sama, tanpa versi ganda.

Storage dan database bukan satu transaksi atomik. Jika publikasi gagal setelah salinan publik dibuat, objek yang belum terhubung harus dihapus melalui kompensasi/retry. Hanya turunan yang telah disetujui publikasinya boleh mencapai langkah tersebut. URL berversi mencegah sampul baru tertukar dengan cache versi sebelumnya.

Berikan riwayat sampul dan aksi kembali ke versi sebelumnya. Penghapusan objek hanya boleh menyentuh objek yang tidak direferensikan oleh versi aktif, draft tersimpan, atau riwayat yang dipertahankan. Kandidat pembersihan pertama adalah unggahan gagal yang tidak direferensikan dan berumur lebih dari tujuh hari; lakukan inventaris/dry run dahulu. Jangan menghapus objek lama hanya karena namanya terlihat usang.

Sampul publik memang dapat diminta oleh browser; pemisahan master privat menjaga berkas sumber, bukan menjanjikan gambar publik mustahil disalin. Kebijakan PWA tetap memerlukan internet untuk membaca cerita; fitur ini tidak menambahkan cache naskah atau bacaan offline.

## 7. Integrasi ZIP/EPUB dan sampul lama

### Impor baru

- Kumpulkan kandidat gambar dengan batas jumlah, byte total, dan pemeriksaan keamanan arsip yang sudah ada.
- Utamakan metadata cover EPUB; gunakan nama `cover`/`sampul`, struktur folder, dan rasio sebagai petunjuk tambahan, bukan kepastian isi gambar.
- Jika ada beberapa kandidat, tampilkan thumbnail serta alasan rekomendasi. Penulis memilih satu atau melewati semuanya. Ilustrasi bab tidak otomatis menjadi sampul hanya karena urutan berkasnya lebih awal.
- Jalankan gambar terpilih melalui proses yang sama dengan upload manual.
- Sampul hasil impor masuk privat. Untuk mengganti sampul buku yang sudah ada, tampilkan pilihan eksplisit; tidak mengganti otomatis.
- Kegagalan sampul tidak membatalkan naskah yang telah berhasil disimpan. Tawarkan retry sampul terpisah tanpa mengimpor bab lagi.
- Kandidat yang tidak dipilih dilewati dengan penjelasan; ZIP asli dan berkas sumber penulis tidak diubah.

### Kompatibilitas lama

`cover_url` lama tetap berfungsi sampai buku tersebut memperoleh aset baru. Buku tanpa metadata rasio menggunakan tampilan utuh. Migrasi struktur bersifat tambahan; tidak mengubah semua ilustrasi massal.

URL eksternal lama tetap dapat ditampilkan dengan fallback yang aman. Optimasi otomatis URL eksternal tidak termasuk tahap pertama karena akses CORS dan hak mengambil berkas belum tentu tersedia. Jika kelak dibuat fitur “salin ke penyimpanan”, perlu validasi URL, batas ukuran/waktu/redirect, dan perlindungan agar server tidak mengakses alamat internal.

## 8. Urutan implementasi dan hasil tiap tahap

| Tahap | Cakupan | Bukti selesai |
|---|---|---|
| A — Kontrak tampilan | Satukan komponen sampul; fit/crop; reset error; placeholder; preview tiga konteks; ikon Sapphire | Kumpulan gambar uji konsisten di katalog, detail, dan Studio pada tema terang/gelap |
| B — Upload andal | Validasi sebelum decode; optimasi; state batal/retry; model versi privat; commit publikasi dan manifest publik | Gangguan jaringan tidak mengganti sampul aktif atau membuat versi duplikat; akses privat diuji |
| C — Impor dan kompatibilitas | Pemilihan kandidat ZIP/EPUB; proses upload bersama; fallback sampul lama; riwayat dan inventaris objek gagal | Impor naskah tetap berhasil jika sampul gagal; sampul lama tetap tampil |
| D — Verifikasi rilis | Uji perangkat, staging Auth/Storage/database, transfer gambar, regresi reader/PWA; dokumentasi dan ZIP | Seluruh kriteria penerimaan lulus; paket berisi changelog, prosedur migrasi, dan rollback |
| Opsional setelah stabil | Saran fokus berbasis pengenalan teks/area penting; konversi format tambahan | Manfaat terukur, keputusan penulis tetap tersedia, biaya dan privasi diketahui |

A dapat ditinjau sebagai preview visual. B–D harus selesai sebelum alur upload baru menggantikan alur produksi. Status migrasi dan endpoint live diperiksa terlebih dahulu, mengikuti temuan audit sebelumnya. Jika rollback frontend diperlukan, aset dan metadata baru tetap dipertahankan; rollback tidak dilakukan dengan menghapus karya.

## 9. Kriteria penerimaan

1. Rasio 2:3, 9:16, 3:4, 1:1, lanskap, serta ekstrem 1:5 dan 5:1 tidak meregang; mode utuh mempertahankan seluruh gambar.
2. Potongan yang disimpan sama dengan preview katalog, termasuk setelah refresh dan perubahan ukuran layar. Teks di tepi sampul tidak hilang pada mode utuh.
3. Rotasi/mirroring EXIF, transparansi, gambar kecil, dan profil warna diuji dengan fixture yang mewakili kasus nyata.
4. Katalog tetap sejajar pada 320, 390, 768, dan 1.440 px, dengan judul pendek/panjang dan tema terang/gelap.
5. File rusak, signature salah, dimensi ekstrem, animasi, serta batas byte/piksel ditangani sebelum publikasi; UI tetap dapat dibatalkan.
6. Memilih A lalu B dengan cepat, memilih ulang berkas yang sama, batal saat proses, dan logout di tengah upload tidak menampilkan atau menerbitkan pilihan yang salah.
7. URL gagal lalu diganti berhasil; varian hilang mempunyai fallback terbatas; tidak ada loop error atau placeholder yang terus melekat.
8. Putus jaringan, respons commit hilang, kegagalan database, dan konflik dua tab diuji; sampul aktif tetap utuh dan retry tidak membuat duplikasi.
9. Anon dan akun biasa ditolak saat mengakses master privat atau mengubah aset; penulis sah dapat melakukan operasi yang ditetapkan. Uji melalui Auth, Storage, dan API staging sungguhan.
10. Kartu kecil tidak mengambil master asli. `sizes` sesuai lebar komponen, kandidat `srcset` memakai dimensi sebenarnya, dan ruang gambar tersedia sebelum selesai dimuat.
11. Android Chrome dan iOS Safari diuji langsung untuk pemilih gambar, orientasi, sentuhan, penggunaan memori, dan pembatalan. Chromium otomatis saja belum membuktikan semua ini.
12. Tidak ada tambahan penyimpanan isi cerita ke browser; preview reader tetap tanpa banner penulis yang menghalangi teks.

## 10. Saran update setelahnya, menurut prioritas

| Urutan | Peningkatan | Nilai untuk penulis/pembaca | Batas pekerjaan |
|---|---|---|---|
| P0 — Gerbang sebelum rilis | Verifikasi penerapan penguatan akses V7.2 dan kecocokan frontend/backend | Memastikan perlindungan akses naskah yang disiapkan benar-benar berlaku | Audit terdahulu mencatat akses body langsung dan filter Sampah; periksa keadaan live terkini, lalu uji staging sebelum perubahan produksi |
| P1 — Update fitur terdekat | Sampul cerdas pada dokumen ini | Tampilan rapi untuk berbagai rasio, lebih ringan, dan upload lebih mudah dipahami | Selesaikan tahap A–D |
| P1 — Menjaga hasil menulis | Riwayat revisi dan tampilan perbandingan saat konflik editor | Penulis dapat memilih/menggabungkan perubahan dan memulihkan versi | Melengkapi deteksi konflik yang sudah ada; revisi disimpan privat di server dengan batas retensi, bukan naskah offline |
| P1 — Impor lebih mudah ditinjau | Perbandingan isi/judul/nomor pada konflik, riwayat batch, pemulihan hasil impor | Penulis tahu perubahan tepatnya sebelum menyimpan | Pembatalan batch hanya menyasar draft yang belum berubah; bab terbit atau sudah diedit meminta peninjauan tersendiri |
| P2 — Publikasi lebih jelas | Kalender rilis dan preview perubahan jadwal massal | Mengurangi salah waktu, urutan bab, dan jadwal bertabrakan | Tingkatkan alur jadwal yang ada dengan WIB yang konsisten dan ringkasan sebelum simpan |
| P2 — Kenyamanan membaca | Audit tipografi, aksesibilitas, progres bab, dan navigasi lintas perangkat | Teks panjang, judul panjang, nomor bab, dan kontrol lebih nyaman | Pertahankan reader publik/preview bersama; ukur kasus nyata, jangan mengulang banner yang sudah dihapus |
| P2 — Pemeliharaan tampilan | Konsolidasi CSS dan token ikon/warna yang benar-benar masih dipakai | Perbaikan satu halaman tidak merusak halaman lain | Berdasarkan dependensi dan perbandingan visual; nama versi lama bukan bukti file tidak digunakan |
| P3 — Membagikan cerita | Kartu tautan dengan sampul dan metadata publik | Tautan cerita lebih jelas saat dibagikan | Hanya cerita yang terbit; tidak memasukkan draft atau cuplikan privat; periksa dukungan metadata server/hosting |

Rekomendasi urutan pengerjaan: **periksa gerbang rilis V7.2 → sampul cerdas → riwayat revisi dan konflik → penyempurnaan impor → jadwal, reader, dan perawatan tampilan**. Fitur tambahan dapat dipilih setelah hasil tahap sebelumnya terlihat; tidak perlu memperbesar rilis sampul dengan seluruh daftar sekaligus.

## 11. Referensi

- **[S1] MDN, object-fit:** https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/object-fit — perbedaan mempertahankan seluruh gambar, memenuhi bingkai dengan pemotongan, dan peregangan.
- **[S2] MDN, Responsive images:** https://developer.mozilla.org/en-US/docs/Web/HTML/Guides/Responsive_images — pemilihan resolusi dengan `srcset`, `sizes`, dan `picture`.
- **[S3] Supabase, Storage Image Transformations:** https://supabase.com/docs/guides/storage/serving/image-transformations — kemampuan transformasi dan persyaratan paket saat dokumentasi diperiksa.
- **Sumber internal:** paket `KataKecil_V7_2`, khususnya lokasi pada bagian 2; `docs/v72/AUDIT_SUPABASE.md` dan `QA_DAN_DEPLOY.md` untuk temuan/pembatasan verifikasi sebelumnya.

Dokumen ini merupakan spesifikasi usulan. Kode sampul, migrasi, ZIP sumber yang sudah dikirim, dan layanan produksi tidak diubah dalam penyusunan rencana ini.
