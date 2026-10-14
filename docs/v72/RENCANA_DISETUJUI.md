# KataKecil — Rencana maksimal PWA, impor ZIP, dan penyempurnaan reader

Tanggal audit: 14 Oktober 2026 (WIB). Dasar: `KataKecil_V7_1_RC1_Five_Minds_Source.zip`, versi paket `7.1.0-rc.1`.

**Status: rencana untuk ditinjau. Kode sumber, database, dan deployment belum diubah.** Dokumen ini memisahkan temuan yang terbukti dari sumber/reproduksi dengan risiko yang masih memerlukan pengujian browser dan staging.

**Rekomendasi utama:** bangun PWA yang bisa dipasang tetapi tetap memerlukan internet untuk mengakses cerita; benahi kehilangan bagian naskah dan keamanan retry sebelum memperluas impor ZIP; samakan model episode pada pratinjau dan reader publik; rapikan daftar isi tanpa mengganti pola membaca yang sudah ada.

## 1. Sasaran dan keputusan dasar

1. KataKecil dapat dipasang dari browser yang mendukung, dibuka dari ikon, dan digunakan dalam jendela aplikasi.
2. Tidak ada unduh cerita, simpan bab offline, precache naskah, sinkronisasi naskah di latar belakang, ataupun salinan draft di penyimpanan browser.
3. ZIP dapat berisi folder, episode terpisah, naskah gabungan, materi tambahan, dan dokumen kerja. Sistem menginventarisasi serta mengusulkan klasifikasi sebelum menyimpan.
4. Berkas tidak relevan dikeluarkan dari antrean impor, bukan dihapus dari ZIP asli/perangkat penulis.
5. Bagian yang ambigu harus diputuskan penulis. Panjang pendek teks atau nama file saja tidak cukup untuk membuang isi cerita.
6. Semua hasil impor menjadi draft. Karya baru tetap privat; jadwal dan status episode lama tidak berubah.
7. Pratinjau menampilkan nomor episode, judul, isi, dan pagination berdasarkan kontrak yang sama dengan reader publik.
8. Identitas Sapphire, tema terang/gelap, swipe, tap, pinch, pengaturan font, dan pemulihan posisi dipertahankan sebagai dasar pengujian.
9. Pemrosesan pintar memakai aturan yang dapat dijelaskan terlebih dahulu. Naskah tidak dikirim ke layanan AI eksternal.
10. Implementasi dilakukan bertahap setelah pengguna menyetujui rencana; tidak ada perubahan produk pada tahap audit ini.

## 2. Batas audit dan bukti baseline

Arsip berisi 385 berkas, total ukuran tidak terkompresi 3.508.755 byte. Audit memetakan struktur lalu menelusuri alur PWA, reader publik, pratinjau, parser, penyimpanan impor, autentikasi, pagination, CSS daftar isi, dan migrasi terkait. Ini audit sumber terarah, bukan klaim bahwa setiap kombinasi perilaku aplikasi telah diuji.

SHA-256 arsip: `97008405c5ffab81baf6bb53095aadc215307fcd3a6b7716fcb43d4f4290a559`.

| Pemeriksaan | Hasil audit ini | Maknanya |
|---|---|---|
| Perbandingan isi ekstraksi dengan ZIP | 385 berkas identik | Sumber tidak diubah |
| `check-structure` | Lulus: 103 sumber, 288 referensi | Import lokal/aset yang diperiksa tersedia |
| `verify-public-build` | Lulus pemeriksaan sumber | Belum membuktikan bundle produksi bebas seluruh kebocoran |
| `audit-v7-theme` | Lulus | Dua tema dan pasangan warna yang diperiksa memenuhi kontrak audit |
| `audit-v7beta` | Lulus | Stylesheet beta sesuai aturan token; 1.080 literal warna lama masih terhitung |
| Reproduksi parser dengan input sintetis | Enam kasus dijalankan | Masalah parser pada bagian 4 terkonfirmasi |
| `test:current` | Terhenti: paket `typescript` tidak ditemukan | Suite lengkap tidak boleh dilaporkan lulus |
| Typecheck/build produksi | Belum dijalankan penuh | Dependency proyek belum tersedia; ZIP tidak membawa lockfile |
| Browser/perangkat asli | Belum dijalankan | Alignment, safe area, gesture, pemasangan PWA perlu verifikasi visual |
| Supabase aktif | Tidak diakses/dimutasi | Keadaan RLS, migrasi, endpoint, dan header produksi belum diketahui |

Tidak ada P0 yang terkonfirmasi dalam audit terbatas ini. Hal tersebut bukan sertifikasi keamanan produksi.

## 3. Fondasi yang sudah baik

- Manifest sudah terhubung di `index.html`, memakai `display: standalone`, `start_url: /`, dan `scope: /`.
- Ikon PNG 192×192, 512×512, dan Apple touch icon 180×180 benar-benar tersedia dengan ukuran tersebut.
- Reader publik meminta indeks metadata lalu satu episode aktif melalui `secure-episode`; isi episode disimpan di memori React.
- Endpoint `secure-episode` sudah mengirim `Cache-Control: private, no-store, max-age=0`, memeriksa status terbit berdasarkan waktu server, dan memanggil pembatasan permintaan.
- Migrasi stage 2 membatasi akses langsung `content_md`; Studio memakai RPC penulis. Penerapannya di server tetap harus dicek.
- RPC impor V5 sudah menggabungkan karya, episode, halaman buku, dan riwayat dalam satu transaksi.
- Impor menjadi draft; konflik nomor/isi ditolak di server.
- EPUB sudah memakai urutan spine, mendeteksi sebagian materi noncerita, membatasi ukuran/jumlah berkas, dan mengubah XHTML menjadi teks/Markdown tanpa menyisipkan HTML mentah ke UI.
- `ReaderPage`, `ChapterText`, `PageMeasurer`, geometri reader, dan gesture sudah sebagian dipakai bersama.

Fondasi tersebut dipertahankan. Pekerjaan utama adalah memperbaiki kontrak dan jalur yang belum konsisten.

## 4. Temuan audit dan prioritas

P1 = didahulukan karena risiko kehilangan/duplikasi isi atau privasi. P2 = fungsi penting dan konsistensi. P3 = perawatan lanjutan. “Terbukti” berarti terlihat pada sumber atau reproduksi; tidak selalu berarti sudah direproduksi pada aplikasi produksi.

| ID | Prioritas | Temuan dan bukti | Dampak / rencana |
|---|---|---|---|
| A01 | P1 | `parseMarkdownUpload` mengambil potongan mulai heading Bab/Episode bernomor; teks sebelumnya tidak dimasukkan. Reproduksi prolog sebelum Bab 1 kehilangan prolog. | Simpan seluruh rentang teks; preamble menjadi kandidat untuk ditinjau. Tidak boleh hilang tanpa keputusan. |
| A02 | P1 | `arcTitle` diambil sekali dari heading ARC pertama dan digunakan untuk semua hasil. Dua arc direproduksi menjadi ARC I seluruhnya. | Parser berjalan mengikuti perubahan arc, dengan asal/rentang tiap bagian. |
| A03 | P1 | Impor karya baru mempertahankan ID sementara, tetapi retry konflik `qr_books_pkey` membuat ID baru. RPC tidak memiliki kunci idempotensi. | Jika commit berhasil dan respons hilang, retry dapat membuat karya kedua. Tambahkan identitas operasi dan verifikasi status. |
| A04 | P1 | `ReaderApp` membuat bookmark memakai `getSnippet`, kemudian menulisnya ke `quiet_reader_bookmarks_*`. | Cuplikan draft bisa menetap di perangkat penulis. Pratinjau memakai state sesi; migrasi membersihkan cuplikan lama secara terarah. |
| A05 | P1 | Editor menjaga `quiet:before-navigate` dan `beforeunload`; App langsung mengikuti `popstate`. Importer tidak memiliki penjaga sesi tinjauan. | Tombol Back/penutupan saat impor atau autosave perlu dilindungi dan diuji. Jangan mengandalkan penyimpanan saat unmount. |
| A06 | P2 | Pemilih/importer hanya menerima EPUB/MD/TXT; RPC dan `source_format` juga hanya mengizinkan tiga format tersebut. | ZIP memerlukan pipeline UI/parser sekaligus migrasi kontrak database. Mengubah `accept` saja tidak cukup. |
| A07 | P2 | Markdown hanya memecah heading Bab/Episode dengan angka Arab. Reproduksi Bab IV/V dan Chapter TXT tidak terpecah; awalan `0012_` pada nama file dibuang tanpa menjadi nomor. | Satukan pengenalan judul, nomor, dan jenis bagian; tampilkan konflik antar sumber. |
| A08 | P2 | `assignEpisodeNumbers` mengisi nomor kosong mulai 1, termasuk celah di antara episode lama. | Penulis bisa mengira impor melanjutkan cerita. Jadikan lanjut dari nomor terbesar sebagai default untuk nomor yang belum jelas. |
| A09 | P2 | `makePreview` tidak mengirim nomor episode; `ReaderApp` memakai indeks + 1 dan `parseMarkdown`, sedangkan publik memakai `chapterFromEpisode`. | Bab 12 bisa berlabel Bab 1; heading dalam isi dapat menghasilkan bab tambahan di pratinjau. |
| A10 | P2 | `ContentsPanel` mengambil nomor dari pola ID publik atau posisi array untuk badge/pencarian; `displayNumber` hanya dipakai sebagian. | Nomor, pencarian, status, dan judul tidak selalu merujuk bab yang sama. Gunakan metadata kanonis. |
| A11 | P2 | CSS baris daftar isi memakai flex; nomor `align-self: start`, sedangkan arc ditaruh sebelum judul dan status memiliki lebar sendiri. | Struktur menjelaskan potensi ketidaksejajaran. Perbaikan grid dan screenshot diperlukan; belum ada verifikasi piksel. |
| A12 | P2 | Pada kegagalan memuat bab berikutnya, `segment` lama tetap ada; cabang render hanya mensyaratkan `!loading`, bukan `!error`. Retry memakai nomor `segment` lama. | Kegagalan dapat menyisakan bab lama atau mencoba ulang bab yang salah. Gunakan target permintaan dan state gagal yang eksplisit. |
| A13 | P2 | `App` menyimpan pathname tanpa search; reader mengambil `episode` langsung dari URL saat render. | Navigasi query saja pada slug yang sama berpotensi tidak memperbarui target. Router harus mengamati pathname + search. |
| A14 | P2 | `getStudioLibrary` memuat isi seluruh episode sampai batas 6.000 sejak masuk Studio; logout tidak langsung mengosongkan array tersebut. | Beban dan masa hidup naskah dalam RAM lebih besar dari kebutuhan. Muat metadata dahulu, isi saat editor dibuka; bersihkan state saat keluar. |
| A15 | P2 | Endpoint `secure-episode`/legacy memeriksa flag terbit tetapi tidak `deleted_at`. RPC sampah saat ini memang mematikan flag publik. | Risiko pertahanan berlapis bila data tidak konsisten, bukan bukti kebocoran saat ini. Periksa buku dan episode yang tidak dihapus secara eksplisit. |
| A16 | P2 | Validasi UI untuk episode tidak menyamai seluruh batas halaman buku/byte server. Peringatan `confidence: periksa` tidak mewajibkan pengakuan per item. | Persoalan baru muncul saat simpan. Tambahkan validasi lengkap dan keputusan untuk kandidat ambigu. |
| A17 | P2 | Tidak ada service worker, pengendali install, atau pengelola update aplikasi yang ditemukan. | Fondasi instalasi sudah ada; pengalaman PWA belum lengkap. Tidak berarti situs pasti tidak bisa dipasang. |
| A18 | P2 | App mengimpor Studio dan semua 31 stylesheet secara langsung; importer mengimpor parser EPUB/JSZip secara statis. | Ukuran awal berpotensi lebih besar; ukur build sebelum menetapkan angka. Pisahkan muatan Studio/importer. |
| A19 | P2 | Tidak ada lockfile; tes V7.1 mengunci hash lima modul reader. | Build belum reproduktif. Refactor yang sah perlu tes perilaku, bukan sekadar mengganti hash agar hijau. |
| A20 | P2 | Cover hasil impor dapat masuk bucket publik walau buku privat, dengan pilihan opt-in dan peringatan yang sudah ada. | Untuk sampul karya belum diumumkan, tawarkan alur cover privat; jangan otomatis mempublikasikan aset ZIP. |
| A21 | P2 | Autosave memperbarui berdasarkan ID saja, tanpa versi yang diharapkan. | Dua tab dapat saling menimpa perubahan. Tambahkan deteksi konflik versi setelah fondasi impor/reader stabil. |
| A22 | P3 | Endpoint lama `secure-reader` masih ada sebagai kompatibilitas dan tidak menerima episode 0. Ada komentar yang tidak sesuai jalur terbaru. | Petakan pemakaian produksi sebelum menutup jalur; koreksi dokumentasi dan uji fallback yang benar-benar dipertahankan. |

Reproduksi A01/A02/A07/A08 memakai naskah sintetis, bukan karya pengguna. Hasil ringkas: prolog terlewat; dua arc menjadi satu label; Bab IV/V menjadi satu kandidat tanpa nomor; Chapter TXT menjadi satu kandidat; `0012_Hujan.md` kehilangan nomor; nomor otomatis pada koleksi 1 dan 3 menghasilkan 2.

## 5. Rancangan PWA yang selalu menggunakan jaringan

### 5.1 Pengalaman pemasangan

- Identitas aplikasi tetap KataKecil, dengan `id` manifest stabil dan origin produksi kanonis. Perubahan nama/tampilan tidak membuat identitas instalasi baru.
- Pertahankan `display: standalone`; jangan mengunci orientasi agar reader landscape/spread tetap bekerja.
- Pisahkan ikon `any` dan `maskable` setelah memeriksa area aman ikon. Jangan berasumsi satu gambar cocok hanya karena deklarasinya `any maskable`.
- Sinkronkan warna splash dengan identitas brand; jelaskan secara internal bahwa splash manifest tidak selalu mengikuti tema pengguna secara dinamis.
- Tambahkan screenshot publik yang tidak memakai isi naskah privat dan shortcut menuju Beranda/Temukan/Koleksi bila didukung.
- Sediakan menu “Pasang KataKecil”. Tombol native muncul saat event pemasangan tersedia; jika tidak, tampilkan panduan yang sesuai browser/perangkat.
- Gunakan deteksi kemampuan, bukan asumsi semua Android/iPhone sama. `beforeinstallprompt` tidak tersedia merata [S2].
- Pada iPhone/iPad, siapkan panduan penambahan ke layar utama sesuai browser yang didukung dan verifikasi pada perangkat nyata. Browser dalam aplikasi diarahkan ke browser utama lewat petunjuk, bukan tombol palsu.
- Cek `display-mode: standalone` dan mekanisme platform yang tersedia agar promosi pemasangan tidak terus muncul di aplikasi yang sudah terpasang.
- Ajakan pemasangan muncul setelah interaksi wajar, tidak menutupi teks reader atau mengganggu unggah. Penolakan diberi jeda, misalnya tujuh hari; menu manual tetap ada.
- Studio tetap di balik autentikasi. Tidak ada password, token, identitas draft, atau judul privat di manifest/shortcut.

PWA bisa installable tanpa service worker; service worker bukan syarat universal pemasangan [S1]. Untuk kebutuhan KataKecil, rekomendasi lengkapnya adalah service worker sangat kecil **tanpa precache dan tanpa penulisan Cache Storage**, khusus untuk menangani navigasi yang gagal dan siklus pembaruan secara terkendali.

### 5.2 Kebijakan penyimpanan

| Jenis data | Kebijakan yang direncanakan |
|---|---|
| Naskah publik yang sedang dibaca | Satu episode aktif di RAM; diambil melalui endpoint terbit; tidak ditulis ke storage browser |
| Draft/pratinjau | RAM pada sesi penulis; hanya disimpan ke database privat lewat tindakan/auto-save online yang berhasil |
| ZIP asli dan hasil ekstraksi | RAM sesi impor; tidak diunggah utuh secara default; dilepas ketika selesai/dibatalkan |
| Cuplikan bookmark | Tidak disimpan; ganti label generik + ID/offset |
| Metadata bookmark publik | ID buku/episode, posisi, tanggal; judul publik bila diperlukan; bukan kutipan |
| Preview bookmark/progres | Sesi terpisah di RAM; tidak mencemari progres pembaca |
| Tema/font dan ID koleksi | Boleh disimpan lokal; tidak mengandung isi karya |
| Sesi login | Tetap melalui SDK Auth; tidak disalin ke log, report, atau cache worker |
| JS/CSS/font/ikon statis | HTTP cache dapat dipakai untuk aset yang tidak mengandung naskah; tidak membangun paket baca offline |
| API naskah dan RPC penulis | `no-store`; tidak masuk CDN cache, runtime cache, atau antrean background sync |

Header `no-store` sudah ada pada endpoint publik. Pemeriksaan perlu mencakup respons RPC penulis, respons error, CDN, dan kemungkinan jalur lama. Cache API tidak otomatis mematuhi header cache HTTP [S3], sehingga larangan menyimpan naskah harus menjadi aturan implementasi dan pengujian tersendiri.

### 5.3 Service worker minimal

1. `sw.js` memakai URL stabil, scope yang jelas, dan tidak boleh terkena fallback HTML SPA.
2. Navigasi dokumen mengambil versi jaringan. Saat permintaan jaringan benar-benar gagal, worker mengembalikan halaman statis pendek: “KataKecil membutuhkan koneksi internet” dan tombol coba lagi.
3. Halaman kegagalan tidak memuat katalog lama, judul privat, teks episode, atau data pengguna. Ini pemulihan kesalahan koneksi, bukan fitur membaca offline.
4. HTTP 401/403/404/429/500 harus dibedakan dari putus jaringan; jangan diganti semuanya dengan pesan offline.
5. Permintaan API, Auth, unggah, dan perubahan data tidak mendapat fallback tersimpan. Tidak ada replay otomatis terhadap POST publikasi/import.
6. Worker tidak memakai `cache.put`, `cache.addAll`, precache Workbox, maupun penyimpanan IndexedDB.
7. Jika kelak plugin PWA diperlukan, pilih konfigurasi eksplisit; jangan menerima precache default tanpa audit.
8. Pemeriksaan build memastikan payload manuskrip tidak tersisip di aset statis atau source map yang dipublikasikan.

### 5.4 Koneksi terputus dan perlindungan sesi

`navigator.onLine` hanya sinyal awal; kegagalan endpoint dan percobaan ulang menentukan keadaan layanan. UI membedakan koneksi perangkat, sesi kedaluwarsa, layanan bermasalah, dan pembatasan akses.

- Reader menampilkan status koneksi dan menghentikan permintaan/perpindahan episode yang membutuhkan jaringan. Mode offline tidak ditawarkan. Teks yang sudah diterima tetap merupakan data sementara di RAM, bukan janji bahwa browser tidak pernah memegang salinannya.
- Saat kembali dari background, revalidasi akses dan status episode sebelum memulihkan sesi yang sudah kedaluwarsa. Jangan membuat polling agresif setiap pergantian halaman.
- Saat meninggalkan reader, logout, akses dicabut, atau sesi privat berakhir: hapus referensi naskah, objek URL, hasil pencarian, dan hasil ekstraksi yang relevan.
- Jika koneksi putus saat editor memiliki perubahan, pertahankan perubahan di RAM dan tampilkan “Belum tersimpan”. Jangan menghapus draft untuk mengejar aturan tanpa cache.
- Tidak ada jaminan pemulihan setelah sistem operasi mematikan aplikasi. Tanpa penyimpanan lokal, pekerjaan yang belum sampai server bisa hilang; UI harus jujur dan mencegah reload yang tidak perlu.
- Uji back/forward cache dan `pageshow`, bukan hanya cache HTTP. Tirai tampilan background bukan jaminan antitangkapan layar.

### 5.5 Pembaruan aplikasi

Tambahkan informasi versi build dan pemberitahuan “Pembaruan tersedia” dengan “Nanti”/“Muat ulang”. Jangan otomatis melakukan reload ketika penulis mengedit atau memproses ZIP.

Sebelum pengguna menerapkan update: selesaikan penyimpanan online yang sedang berlangsung; tahan update jika masih ada perubahan gagal tersimpan; pertahankan metadata posisi publik tanpa teks; koordinasikan tab terbuka. Aktivasi `skipWaiting` tidak dijalankan membabi buta karena dapat mencampur worker baru dengan halaman lama [S4].

Sediakan fallback pemulihan kesalahan pemuatan chunk, pembatas satu kali reload otomatis ketika aman, dan tombol pemulihan manual. Kegagalan jaringan tidak boleh membuat loop reload.

Rollback worker harus dirancang: kirim worker perbaikan pada URL yang sama, matikan perilaku bermasalah, dan bersihkan hanya cache lama milik KataKecil yang diketahui. Menghapus file worker dari server saja tidak cukup sebagai strategi rollback.

## 6. Impor ZIP pintar: alur penulis

Alur yang disarankan mempunyai enam langkah: **Pilih berkas → Analisis → Pilah → Atur urutan → Pratinjau → Simpan draft**. Pada layar sempit, gunakan kartu ringkas dan panel detail, bukan tabel lebar yang harus digeser ke samping.

### 6.1 Pilih berkas

Format inti: `.zip`, `.epub`, `.md`, `.txt`. ZIP mendukung folder bertingkat dan banyak MD/TXT. EPUB di dalam ZIP dikenali sebagai dokumen ebook; pemrosesannya harus disengaja, memakai batas gabungan, dan tidak membuka ekstraksi rekursif tanpa batas.

DOCX/PDF/HTML umum belum diasumsikan didukung. Jika ditemukan, daftar menampilkan “Format belum didukung” beserta alasannya; tidak diam-diam dinyatakan sampah. DOCX/PDF dapat menjadi pekerjaan terpisah setelah parser inti stabil.

Pengguna memilih karya tujuan atau karya baru. Jika ZIP tampak mengandung beberapa karya, sistem tidak menggabungkannya otomatis. Tawarkan kelompok folder untuk diimpor per karya.

### 6.2 Analisis dan ringkasan

Pemindaian menampilkan tahap nyata: memeriksa arsip, membaca daftar berkas, mengekstrak kandidat, mengenali struktur, mendeteksi konflik. Persentase hanya dipakai jika jumlah pekerjaan benar-benar diketahui. Ada tombol batal; pembatalan menghentikan worker dan tidak membuat draft parsial.

Contoh tampilan hipotetis, bukan hasil membaca naskah pengguna:

> 68 berkas ditemukan. 48 kandidat episode, 4 halaman tambahan, 11 berkas non-naskah, 5 perlu diperiksa. Belum ada yang disimpan.

Setiap item memperlihatkan nama/path asal, jenis usulan, nomor, judul, arc, jumlah kata, tingkat keyakinan, alasan, dan tindakan yang akan dilakukan. Teks ditampilkan hanya ketika penulis membuka pratinjau item.

### 6.3 Klasifikasi

| Contoh | Usulan awal | Keputusan yang diperlukan |
|---|---|---|
| `Episode_001.md`, heading Bab 1, isi naratif | Episode | Terpilih bila sinyal sesuai |
| `0000_Prolog.md` | Prolog naratif | Pertahankan sebagai calon episode 0; konfirmasi bila nomor bertentangan |
| `Epilog.md`, interlude/bonus | Bagian naratif | Tentukan nomor/posisi, bukan otomatis dibuang |
| `Kata_Pengantar.md`, dedikasi | Halaman buku | Penulis dapat menyimpan di halaman tambahan |
| Folder `ARC_II`, pemisah arc | Metadata arc/halaman pemisah | Terapkan hanya pada anak/rentang yang sesuai |
| `README.md`, laporan revisi, outline, daftar tokoh | Non-episode yang disarankan | Bisa ditinjau dan diubah jenisnya; isi naratif mengalahkan asumsi nama |
| `.DS_Store`, `__MACOSX`, berkas OS | Abaikan | Otomatis keluar dari antrean, tetap tercatat ringkas |
| Cover JPG/PNG/WebP | Aset sampul | Pratinjau dan persetujuan tersendiri; tidak otomatis diunggah publik |
| `final.md` dan `final_revisi.md` bernomor sama | Konflik | Pilih versi setelah perbandingan |
| Berkas pendek berjudul “Catatan” | Perlu diperiksa | Jangan dibuang hanya karena singkat |
| Berkas tidak terbaca, terenkripsi, atau berbahaya | Ditolak | Jelaskan; jangan menyajikan hasil seolah lengkap |

“Abaikan semua non-episode” tetap menampilkan jumlah dan jenis yang dilewati. Tidak ada penghapusan ZIP asli. Berkas berbahaya yang menyebabkan ambiguitas struktur/ukuran menolak seluruh arsip; format tidak didukung yang terpisah cukup ditandai agar penulis memutuskan apakah batch tetap dilanjutkan.

### 6.4 Mesin deteksi

Sinyal yang digabung: struktur heading, awalan nama file, nomor eksplisit, folder/arc, metadata ebook, struktur paragraf, pola dokumen kerja, serta kecocokan dengan episode yang sudah ada. Label “tinggi/sedang/perlu diperiksa” disertai alasan; jangan menampilkan persentase akurasi tanpa pengukuran.

Aturan normalisasi:

- Dukungan `Bab 12`, `Episode 12`, `Chapter 12`, angka Romawi yang valid, `0012_Judul`, prolog, epilog, dan variasi pemisah umum.
- Periksa Markdown dengan parser sadar struktur: heading di code fence atau contoh dokumen tidak dianggap batas episode.
- Heading level 1–6 tidak otomatis semuanya menjadi bab. Judul bagian di dalam episode tetap isi.
- Konflik nama file Bab 12 dengan heading Bab 13 wajib ditinjau; jangan diam-diam memilih satu.
- Folder arc menjadi konteks yang bisa dikoreksi. Pergantian arc dalam satu berkas ikut mengubah konteks rentang berikutnya.
- Teks sebelum heading pertama, sesudah heading terakhir, dan di antara pemisah selalu masuk kandidat atau catatan review. Tidak ada rentang yang terlewat tanpa klasifikasi.
- Kutipan, tanda baca, italic, dialog, pemisah adegan, dan paragraf dipertahankan. Pembersihan whitespace untuk pembanding duplikat tidak boleh menulis ulang teks sumber secara diam-diam.
- Deteksi BOM/UTF-8, karakter pengganti, dan file biner menyamar sebagai teks. Berikan opsi encoding hanya jika diperlukan dan dapat dipratinjau.
- File gabungan dan file episode terpisah yang memuat isi sama memunculkan duplikasi lintas berkas; nama berbeda tidak membuatnya dianggap konten baru.
- Tidak ada pengubahan kalimat atau penyuntingan kreatif oleh classifier.

### 6.5 Urutan dan nomor

Pisahkan `sourceOrder`, nomor episode, urutan review, dan identitas database. Saat tersimpan, reader saat ini mengurutkan menurut nomor episode; tombol naik/turun review harus menjelaskan efeknya terhadap nomor, bukan memberikan kesan urutan publik berubah otomatis.

Urutan rekomendasi: nomor eksplisit yang disepakati → struktur dokumen/arc → natural sort nama file (2 sebelum 10) → penentuan manual. Nomor yang sudah terbaca tidak ditimpa otomatis.

Untuk nomor kosong, sediakan tiga pilihan: lanjut setelah nomor terbesar (default untuk karya lama), mulai dari nomor tertentu, atau isi celah dengan pilihan eksplisit. Jangan menutup celah numbering tanpa persetujuan; prolog 0 tidak otomatis berubah menjadi 1. Epilog tidak otomatis menandai novel tamat.

### 6.6 Review sebelum commit

Filter: Semua, Episode, Halaman tambahan, Diabaikan, Perlu diperiksa, Konflik. Tombol tiap item: ubah jenis, edit nomor/judul/arc, lihat isi, gabung/pisah, abaikan/kembalikan. Sediakan undo perubahan selama sesi.

Nomor ganda, judul kosong, isi kosong, versi konflik, dan batas ukuran adalah penghalang simpan. Kandidat ambigu harus diakui/ditetapkan jenisnya atau dikeluarkan. Peringatan ringan dapat dilanjutkan dengan ringkasan yang jelas.

Sebelum menyimpan, tampilkan ringkasan final: karya tujuan, jumlah episode, rentang nomor, halaman tambahan, item dilewati, konflik yang diselesaikan, penggunaan sampul, dan status draft. Contoh: “Simpan 48 episode sebagai draft ke Cerita A. 11 berkas dilewati. Tidak ada episode lama yang diganti.”

## 7. Keamanan dan performa ekstraksi

ZIP diproses lokal di perangkat pada Web Worker untuk pekerjaan unzip, hashing, dan analisis teks. Server tetap memvalidasi payload yang akan disimpan; hasil classifier klien bukan otorisasi.

Jangan memakai `DOMParser` EPUB langsung dalam Web Worker dengan asumsi API tersedia. Pilih parser XML yang kompatibel dan aman, atau kirim pekerjaan XML/DOM terbatas ke main thread dengan penjadwalan. Jalur EPUB existing harus diuji ulang, bukan dipindah begitu saja.

| Batas awal yang diusulkan | Nilai | Catatan |
|---|---:|---|
| ZIP terkompresi | 20.000.000 byte | Awal konservatif untuk ponsel; dikalibrasi dengan pengukuran |
| Seluruh isi tak terkompresi | 70.000.000 byte | Hitung ukuran deklarasi dan keluaran aktual |
| Entry arsip | 1.000 | Termasuk folder; hitung sebelum menyiapkan DOM/UI |
| Kedalaman folder | 10 | Path ekstrem ditolak |
| Satu MD/TXT | 8.000.000 byte | Kandidat multi-episode; tampilkan alasan jika melampaui |
| Isi satu episode | 1.000.000 karakter | Pertahankan batas server existing; ukur byte juga |
| Episode per commit | 120 | Menjaga kontrak transaksi yang ada |
| Halaman tambahan per commit | 60 | Validasi pada UI dan server |
| Total isi commit | 12.000.000 byte UTF-8 | Periksa juga ukuran JSON request dan batas gateway sebenarnya |
| ZIP rekursif umum | Tidak diproses | EPUB dalam ZIP lewat jalur khusus dengan anggaran total bersama |
| Paralelisme ekstraksi | 1–2 pekerjaan | Hindari lonjakan memori pada Android |

Semua angka di atas adalah parameter awal, bukan klaim batas aman universal atau hasil benchmark. Jika melewati batas commit, tawarkan pembagian batch yang jelas; jangan menyimpan sebagian lalu melaporkan seluruh ZIP berhasil.

Pemeriksaan arsip: signature, struktur central directory, path absolut/drive/UNC, `..`, NUL/control character, symlink, nama duplikat setelah normalisasi Unicode/case, file encrypted/multipart, CRC untuk kandidat yang dipakai, serta rasio kompresi mencurigakan. Rasio ekstrem menjadi sinyal untuk pemeriksaan/dibatasi; teks sah bisa sangat mudah terkompresi.

Validasi nama mentah sebelum normalisasi/de-duplikasi library. JSZip menyanitasi path tertentu dan dapat mengganti entry bernama sama [S5]; pemeriksaan hanya pada objek akhir bisa terlambat mendeteksi benturan. Jangan mempercayai `_data.uncompressedSize` sebagai API stabil. Pilih pembaca central directory/streaming yang terdokumentasi dan uji keluarannya.

Batas dekompresi harus ditegakkan selama produksi byte. Mengecek panjang hasil setelah alokasi raksasa sudah terjadi tidak cukup. Worker dan timeout membantu menjaga UI, tetapi bukan satu-satunya perlindungan ZIP bomb.

Tidak mengeksekusi script, HTML aktif, macro, SQL, atau executable dari arsip. Tidak memuat URL eksternal dari dokumen. Preview memakai renderer aman; gambar sampul diperiksa jenis, ukuran byte, dimensi piksel, dan hasil decode. Jangan menyimpan teks atau ZIP dalam log/telemetri.

## 8. Penyimpanan yang atomik dan aman diulang

Pertahankan prinsip satu transaksi untuk satu commit. Tambahkan kontrak impor versi baru secara aditif agar UI lama tetap bekerja selama rollout.

Data minimum yang direncanakan:

- `request_id`/kunci idempotensi yang stabil sejak pengguna menyetujui commit.
- Identitas penulis, karya tujuan, hash payload, versi parser, format `zip`, nama sumber, jumlah item, dan status hasil.
- Manifest keputusan: path asal, jenis item, nomor/ID episode hasil, hash isi untuk pembanding, serta alasan dilewati. Jangan gandakan seluruh naskah di tabel log.
- Constraint unik pada identitas operasi penulis dan pemeriksaan bahwa request ID yang sama tidak dipakai untuk payload berbeda.

Alur server: verifikasi author membership → validasi format/batas → kunci operasi/karya → deteksi replay → validasi konflik → insert draft dan halaman → catat hasil → commit → kembalikan receipt berisi ID dan jumlah.

Jika respons hilang, klien memeriksa status operasi menggunakan request ID yang sama. Operasi yang telah selesai mengembalikan receipt lama. Jangan mengganti ID karya karena respons tidak jelas. Refresh aplikasi tidak menyimpan naskah lokal; hanya ID operasi dan metadata minimum boleh digunakan untuk mengecek hasil setelah login ulang.

Duplikasi dibagi menjadi empat kasus: isi identik (usulkan lewati), nomor sama isi berbeda (wajib pilih), isi sama nomor berbeda (duplikat lintas nomor), serta item di Sampah (tawarkan tinjau/pulihkan, bukan menimpa). Kesamaan isi yang mendekati hanya peringatan, tidak cukup untuk menghapus otomatis.

“Ganti episode lama” tidak menjadi perilaku impor default. Jika kelak ditambahkan, perlu perbandingan, versi yang diharapkan, dan konfirmasi khusus—terutama untuk bab terbit. Penyimpanan sampul tetap operasi terpisah; kegagalannya tidak mengulang transaksi episode. Tangani aset sampul yatim secara terarah.

Riwayat impor menampilkan hasil yang dapat ditelusuri dan tautan ke draft. Fitur batalkan hasil impor, bila ditambahkan, hanya menyentuh ID yang dibuat batch tersebut, masih draft, dan belum diedit; jangan menghapus berdasarkan rentang nomor semata.

Untuk impor lebih dari 120 episode pada fase lanjutan, pilih batch eksplisit dengan receipt per batch atau staging server privat dengan commit akhir. Jangan mengklaim atomik untuk beberapa transaksi terpisah.

## 9. Pratinjau yang sama cerdasnya dengan reader publik

### 9.1 Kontrak episode bersama

Gunakan model eksplisit: ID stabil, nomor episode asli (termasuk 0), judul asli, label tampilan, arc, isi, versi, dan jenis konteks. Jangan menyusun Markdown pembungkus lalu menebak kembali metadata yang sebenarnya sudah ada.

`ChapterEditor` memberikan snapshot judul/arc/body yang sedang diedit beserta `ep.episode_number` langsung ke adapter pratinjau. Satu episode tetap satu unit pagination; heading internal tidak berubah menjadi episode baru.

Renderer heading, paragraf, geometri, pengukuran halaman, pengaturan, kontrol, dan daftar isi digunakan bersama. Sumber data dan akses dipisah: publik hanya endpoint episode terbit; pratinjau memakai snapshot yang sudah diotorisasi. Tidak boleh ada parameter `preview=true` pada endpoint publik yang membuka draft.

### 9.2 Perilaku yang ditargetkan

- Pratinjau Bab 12 menampilkan Bab 12, bukan Bab 1.
- Prolog 0, epilog, judul berawalan “Episode 12 — …”, dan nomor yang berlompatan tampil konsisten.
- “Halaman 3 dari 8” berarti halaman dalam episode yang sedang dibaca. “Bab 12” adalah identitas episode, bukan angka halaman atau indeks daftar.
- Teks yang belum tersimpan boleh dipratinjau sebagai snapshot RAM dengan label “Perubahan belum tersimpan”. Membuka preview tidak mempublikasikan isi.
- Pindah kembali ke editor mempertahankan teks, posisi kursor/scroll yang relevan, dan status penyimpanan.
- Estimasi waktu, cari dalam bab, pengaturan, dan menu yang relevan tersedia setara. Tanda selesai/progres pratinjau tidak menulis statistik pembaca publik.
- “Pratinjau bab ini” adalah fitur utama. “Pratinjau rangkaian bab” dapat ditambahkan setelah metadata/on-demand fetch selesai; tidak memuat seluruh novel hanya untuk satu preview.
- Nomor metadata menjadi sumber kebenaran. Jika judul menyebut nomor berbeda, beri peringatan di editor; jangan mengubah judul database diam-diam.

### 9.3 Perbaikan reader publik terkait

Gunakan state `loading`, `ready`, `error` dengan target episode eksplisit. Setelah Bab 13 gagal dimuat, UI menyebut Bab 13, retry memuat Bab 13, dan tidak memperlihatkan Bab 12 seolah hasil baru. Abaikan respons yang sudah usang dan batalkan fetch bila memungkinkan.

Route harus memantau query; buka `/baca/slug?episode=12` lalu `?episode=13` pada slug sama benar-benar berpindah. Deep link langsung, Back, refresh, dan resume mempunyai aturan prioritas yang terdokumentasi.

Untuk karya/episode tidak tersedia, bedakan tidak ditemukan, belum terbit, akses dicabut, dan layanan bermasalah sejauh aman; tampilkan retry untuk gangguan jaringan. Validasi storage metadata yang rusak, offset di luar rentang, dan episode lama yang sudah dihapus tanpa membuat reader crash.

## 10. Daftar isi yang sejajar dan mudah dipindai

Ubah struktur baris menjadi grid tiga kolom: nomor dengan lebar stabil, judul fleksibel, dan indikator status ringkas. Nomor serta baris pertama judul berada pada baseline/baris yang sama. Arc ditaruh di bawah judul atau menjadi heading kelompok yang jelas, sehingga tidak menggeser nomor.

Ketentuan tampilan:

- Nomor 0, 1, 12, 100, dan 9999 tidak mengubah posisi awal judul.
- Judul dua/tiga baris boleh membungkus; jangan menaruh ellipsis yang menyembunyikan seluruh identitas bab.
- Status “Dibaca”/“Selesai” tidak mengambil lebar judul berlebihan. Pada ponsel sempit, gunakan ikon aksesibel atau pindahkan status ke baris metadata.
- `min-width: 0` dan pembungkusan kata panjang mencegah horizontal overflow.
- Kondisi aktif dibedakan melalui lebih dari warna; gunakan indikator/`aria-current`.
- Area sentuh minimal sekitar 44×44 px, fokus keyboard terlihat, tab panel memiliki hubungan ARIA dan navigasi keyboard yang benar.
- Saat panel dibuka, bab aktif dapat digulirkan ke dalam pandangan tanpa memindahkan fokus secara membingungkan.
- Filter nomor memakai nomor episode asli, termasuk saat daftar disaring; bukan indeks hasil pencarian.
- Pada 320, 360, 390, 430, 768, 1024, dan 1440 px: uji dua tema, font diperbesar, arc panjang, judul panjang, dan status campuran.

Geometri halaman cerita tidak ikut dirombak untuk menyelesaikan alignment daftar isi.

## 11. Audit lanjutan yang masuk lingkup perbaikan

**Keamanan akses:** tambahkan pengecekan `deleted_at` pada seluruh endpoint pembaca yang masih aktif; pertahankan waktu server; uji anon, pengguna biasa, penulis, draft, jadwal mendatang, karya privat, sampah, dan akses body langsung. Server dengan secret/service-role dapat melewati RLS [S6], sehingga filter endpoint harus lengkap.

**Privasi logout:** kosongkan state naskah/hasil impor dan batalkan permintaan tertunda ketika logout/izin dicabut. Respons lama tidak boleh mengisi ulang Studio setelah keluar. Sesi autentikasi yang persisten tidak disamakan dengan menyimpan karya offline.

**Navigasi dan autosave:** satukan penjaga tindakan belum tersimpan untuk tombol dalam aplikasi, browser Back, update PWA, dan import review. Untuk mobile app termination, gunakan status simpan yang jujur; tidak mengandalkan `beforeunload` sebagai jaminan. Konflik dua tab memerlukan perbandingan versi server, bukan hanya antrean lokal.

**Efisiensi data:** Studio memuat ringkasan buku/bab dahulu, isi saat diperlukan, dan hash/metadata konflik untuk impor. Daftar publik memakai pagination/aggregasi yang sesuai agar response cap tidak memotong jumlah bab. Jangan mengatasi kebutuhan statistik dengan mengunduh semua naskah.

**Beban awal:** lazy-load Studio, importer, dan parser ZIP/EPUB; ukur bundle nyata. Total sumber CSS yang ditemukan 384.718 byte pada 31 berkas, bukan ukuran transfer produksi. Konsolidasi hanya selector yang bersinggungan setelah screenshot baseline tersedia.

**Header keamanan:** audit `vercel.json`, CSP dalam mode report-only sebelum enforcement, `nosniff`, referrer policy, dan frame policy. Cocokkan dengan Supabase, font, cover, worker, serta inline boot script. Jangan menambahkan CSP generik yang memutus login/reader.

**Observabilitas:** catat kode error, durasi tahap, ukuran/jumlah, parser version, dan request ID. Jangan merekam badan naskah, snippet, token, nama file privat, atau isi session replay secara default. Metrik pemasangan bersifat best-effort karena kemampuan browser berbeda.

**Kebersihan pengujian:** kunci dependency/lockfile dan runtime yang kompatibel, jalankan typecheck/build pada lingkungan registry yang tersedia, lalu uji perilaku. Perbarui tes hash secara sadar setelah ada pengganti yang memverifikasi tujuan perubahan.

## 12. Peta perubahan file

Semua path berikut merupakan rencana, bukan perubahan yang sudah dikerjakan. Nama modul baru dapat disesuaikan saat implementasi.

| Area | File existing | Rencana perubahan |
|---|---|---|
| PWA | `public/manifest.webmanifest`, `index.html`, `vercel.json`, `src/main.tsx` | Identitas, ikon, header, registrasi worker, bootstrap update |
| UI pemasangan/update | Baru: `src/features/pwa/` | Install controller, panduan, koneksi, update coordinator |
| Worker | Baru: `public/sw.js` atau sumber worker yang dibangun | Network-only navigation, fallback generik, tanpa cache naskah |
| Routing | `src/App.tsx`, `src/utils/nav.ts` | Query reactive, deep link, penjaga navigasi |
| Importer | `src/pages/ManuscriptImporter.tsx` | Wizard/state machine, review, resume status operasi |
| Parsing | `src/utils/importManuscript.ts`, `importMarkdown.ts`, `importEpub.ts` | Model kandidat, rentang sumber, arc/nomor, validasi bersama |
| ZIP | Baru: `src/features/import/` dan worker | Inventory, ekstraksi berbatas, classifier, konflik, hash |
| Commit | Baru: layanan impor pada `src/data/` | RPC baru, idempotency, receipt, status check |
| Editor/preview | `ChapterEditor.tsx`, `src/ReaderApp.tsx` | Snapshot episode langsung, nomor asli, state privat sesi |
| Reader bersama | `src/types/reader.ts`, `episodeChapter.ts`, `readerHeading.ts` | Identitas episode tunggal dan label konsisten |
| Daftar isi | `src/components/ReaderPanels.tsx`, stylesheet reader terkait | Nomor kanonis, grid sejajar, a11y |
| Reader publik | `src/SecureReaderApp.tsx`, `src/data/secureReader.ts` | Target retry benar, state error, validasi metadata |
| Studio data | `src/data/library.ts`, `src/pages/Studio.tsx` | Metadata-first, fetch isi terarah, reset logout |
| Backend | `supabase/functions/secure-episode/` dan legacy bila aktif | Filter akses lengkap dan header terverifikasi |
| Database | Migrasi baru setelah persetujuan | Format ZIP, operasi/receipt, constraint, grant/RLS, versi jika diperlukan |
| QA | `scripts/` dan suite perilaku/browser baru | Parser, transaksi, worker, reader parity, snapshot visual |

PWA, perbaikan label, dan grid daftar isi tidak memerlukan perubahan data cerita. ZIP/idempotency serta optimasi API Studio memerlukan kontrak backend/migrasi tambahan. Jangan mencampur migrasi keamanan lama dengan fitur baru tanpa memeriksa keadaan staging terlebih dahulu.

Untuk tabel baru, tulis grant eksplisit, RLS, dan kebijakan akses bersamaan. Dokumentasi Supabase terbaru mengubah default eksposur tabel; jangan mengandalkan grant bawaan [S7].

## 13. Tahap pelaksanaan yang direkomendasikan

| Tahap | Hasil yang harus terlihat | Ketergantungan | Perkiraan usaha* |
|---|---|---|---|
| 0 — Baseline | Build/typecheck berjalan, lockfile, dataset sintetis, screenshot reader | Akses dependency dan staging | 1–2 hari kerja |
| 1 — Integritas dan privasi | Prolog/arc aman, bookmark tanpa kutipan, kebijakan storage, draft guard, desain idempotensi | Tahap 0 | 2–3 hari |
| 2 — Reader konsisten | Bab asli di preview, model bersama, TOC sejajar, retry/query diperbaiki | Tahap 1 | 2–3 hari |
| 3 — ZIP dan commit | Worker, klasifikasi/review, konflik, RPC ZIP idempoten, receipt | Tahap 1 dan kontrak parser stabil | 4–6 hari |
| 4 — PWA | Install flow, standalone, worker tanpa cache, koneksi dan update aman | Guard editor/import sudah teruji | 2–3 hari |
| 5 — Verifikasi rilis | E2E, perangkat, keamanan, gangguan jaringan, panduan deploy/rollback | Semua fitur di staging | 2–3 hari |

*Perkiraan 13–20 hari kerja untuk implementasi teruji oleh satu pengembang, bukan janji waktu kalender. Dapat berubah setelah build dan staging tersedia. Tidak memerlukan pengerjaan oleh banyak agen. Fitur opsional di luar tahap ini belum termasuk.

Setiap tahap memiliki changelog dan hasil uji. Bila sebuah tahap gagal gerbang penerimaan, lanjutkan perbaikannya sebelum mengaktifkan fitur terkait kepada pengguna produksi.

## 14. Matriks penerimaan dan pengujian

| Kelompok | Skenario wajib | Lulus jika |
|---|---|---|
| PWA | Android Chrome/Samsung Internet, iOS Safari/home screen, desktop Chromium, browser tanpa prompt | Instalasi/panduan sesuai kemampuan, situs biasa tetap dapat digunakan |
| PWA | Cold start tanpa internet | Hanya layar koneksi generik bila worker sudah tersedia; tidak ada cerita tersimpan |
| PWA | Update saat mengedit/impor/dua tab | Tidak reload sepihak; pekerjaan yang belum tersimpan tidak dibuang |
| Penyimpanan | Baca, bookmark, preview, import, logout, reload | Cache Storage/IndexedDB/localStorage/sessionStorage tidak mengandung kalimat sentinel naskah |
| Keamanan | Draft, jadwal masa depan, buku privat, soft-delete, anon/non-author, body API langsung | Isi hanya tersedia pada jalur dan peran yang tepat |
| Impor teks | Bab 0, angka Romawi, Chapter, nama bernomor, dua arc, preamble/prolog, epilog | Nomor/arc tepat, tidak ada rentang teks hilang |
| ZIP | Folder bertingkat, urutan 1/2/10, multi-karya, duplikasi gabungan/per-episode | Klasifikasi dan urutan dapat dijelaskan, tidak ada penggabungan diam-diam |
| ZIP berbahaya | Path traversal, duplicate entry, Unicode collision, symlink, zip bomb, CRC rusak, password, nested ZIP | Ditolak/dibatasi sesuai aturan, UI tidak membeku atau mengirim isi |
| Review | Berkas ambigu/pendek, kata pengantar, README berisi narasi, unsupported | Penulis dapat menentukan; tidak ada penghapusan berdasarkan tebakan tunggal |
| Transaksi | Satu item invalid di tengah batch | Tidak ada episode/halaman parsial dalam commit itu |
| Idempotensi | Double click, lost response setelah commit, timeout, tab kedua | Satu operasi menghasilkan satu hasil; retry mengembalikan receipt yang sama |
| Konflik | Nomor sama, isi sama, item di Sampah, dua operasi bersamaan | Konflik dijelaskan; data lama tidak ditimpa |
| Preview | Episode 12/0/48, heading internal, judul panjang, teks belum tersimpan | Metadata dan halaman setara dengan publik untuk input sama |
| Reader | Bab berikut gagal, respons tertukar, query berubah, akses dicabut | Target tidak tertukar, retry benar, tidak menampilkan hasil lama sebagai bab baru |
| TOC | Nomor 0–9999, arc panjang, judul multi-baris, status aktif/selesai | Kolom stabil, judul sejajar, tanpa overflow |
| Pagination | Font/line-height/margin, rotasi, keyboard, pinch/swipe, spread | Teks tidak hilang/terpotong; posisi kembali sesuai anchor |
| Studio | Logout saat fetch/impor, sesi habis saat commit, Back saat dirty | Data privat dibersihkan; operasi yang statusnya belum pasti bisa diperiksa |
| Aksesibilitas | Keyboard, pembaca layar, reduced motion, pembesaran font | Fokus/modal/label/target sentuh berfungsi |
| Build | Typecheck, build, unit/integrasi/browser, scan output | Tidak ada error kritis, naskah privat, atau secret di artefak publik |

Gunakan naskah sentinel sintetis untuk memeriksa penyimpanan, bukan mengirim karya ke sistem pengujian eksternal. Kesetaraan teks divalidasi dengan urutan/rentang dan perbandingan hasil, bukan hanya jumlah kata.

Target performa awal: UI tetap menerima input saat ekstraksi, tombol batal merespons cepat, tidak ada kenaikan bundle publik akibat memuat ZIP parser di rute umum, serta pagination tidak berulang tanpa batas. Angka p95/anggaran memori final ditetapkan setelah baseline pada ponsel kelas menengah; jangan mengklaim target yang belum diukur tercapai.

## 15. Rollout, rollback, dan keluaran implementasi

Urutan rollout: backup terverifikasi → migrasi aditif staging → endpoint/RPC baru → pengujian peran dan transaksi → frontend preview → uji perangkat → persetujuan rilis produksi. ZIP dapat dikendalikan flag sementara importer lama masih ada; jika dimatikan, data draft hasil impor tetap valid.

Rollback frontend tidak boleh menghapus episode hasil impor. Migrasi baru sebaiknya tetap kompatibel dengan versi sebelumnya; jangan membalik migrasi dengan drop tabel berisi riwayat. Rollback cache/worker dan backend memiliki prosedur tersendiri. Perubahan database produksi tidak dilakukan hanya karena rencana disetujui jika tahapan staging belum lulus.

Keluaran yang sebaiknya tersedia setelah implementasi kelak:

1. Paket sumber baru dengan versi dan changelog jelas.
2. Migrasi aditif dan petunjuk urutan penerapan sesuai lingkungan nyata.
3. Dokumen kebijakan penyimpanan dan hasil uji tanpa naskah di browser storage.
4. Panduan penulis: struktur ZIP yang didukung, cara menyelesaikan konflik, dan arti hasil impor.
5. Laporan QA yang memisahkan lulus, gagal, terblokir, dan belum diuji.
6. Panduan deployment/rollback serta daftar tindakan manual yang memang memerlukan akses pemilik proyek.

## 16. Fitur opsional setelah inti stabil

- Menerima ZIP dari menu berbagi perangkat, jika browser mendukung dan autentikasi tetap aman. Tidak diaktifkan sebelum pipeline impor lolos uji.
- Notifikasi bab baru dengan opt-in, payload hanya metadata publik, tanpa kutipan naskah. Membutuhkan rancangan langganan/push tersendiri.
- Pratinjau rangkaian beberapa bab lewat fetch terarah dan sesi penulis.
- Revisi bab terbit melalui draft revisi, sehingga autosave tidak langsung mengubah versi publik. Ini perubahan workflow tersendiri, bukan perbaikan kecil.
- Pemulihan sesi impor lintas perangkat melalui staging server privat yang memiliki masa simpan dan kontrol akses; bukan penyimpanan ZIP lokal tersembunyi.
- Dukungan DOCX dan ekstraksi PDF setelah ada kebutuhan serta fixture yang representatif. PDF gambar memerlukan OCR dan review lebih ketat.

Offline reading, tombol unduh novel untuk pembaca, prefetch seluruh buku, publikasi otomatis setelah upload, dan klaim antisalinnya mutlak tidak masuk rekomendasi.

## 17. Batas perlindungan karya

Rencana ini mengurangi penyimpanan tidak perlu, paparan draft, dan akses massal yang terlalu mudah. Konten yang sudah ditampilkan di perangkat tetap dapat ditangkap lewat screenshot atau cara lain; PWA, pemblokiran copy, watermark, dan `no-store` bukan DRM absolut. Fokusnya adalah server menentukan akses, draft tetap privat, isi tidak dipaketkan untuk offline, dan data tidak tersimpan tanpa kebutuhan.

## 18. Keputusan yang diajukan untuk persetujuan

Paket inti yang direkomendasikan mencakup seluruh tahap 0–5: **perbaikan integritas/privasi → penyamaan preview dan daftar isi → ZIP pintar dengan review serta commit idempoten → PWA online-only → verifikasi staging/perangkat**.

Default yang sudah ditetapkan dalam rencana: tidak menyimpan cerita offline; ekstraksi lokal; hasil selalu draft; item ambigu meminta keputusan; non-episode dikeluarkan dari impor, bukan dihapus dari arsip; nomor kosong melanjutkan nomor terbesar; batas awal 120 episode per commit; tidak memakai layanan AI eksternal; fitur opsional dipisahkan dari paket inti.

Saat implementasi dimulai, yang perlu dicocokkan adalah sumber terbaru/repo tujuan, domain deployment, kondisi migrasi server, dan akses staging. Detail yang tidak tersedia pada ZIP ini tidak ditebak. Persetujuan rencana belum berarti audit runtime/produksi sudah selesai.

## 19. Referensi teknis resmi

Diakses 14 Oktober 2026. Referensi menjelaskan perilaku platform; temuan kode pada dokumen ini berasal dari arsip yang diaudit.

- [S1 — MDN: Making PWAs installable](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable): syarat manifest/HTTPS dan service worker bukan syarat universal instalasi.
- [S2 — MDN: beforeinstallprompt](https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeinstallprompt_event): keterbatasan dukungan dan event pemasangan.
- [S3 — MDN: Cache API](https://developer.mozilla.org/en-US/docs/Web/API/Cache), [Cache-Control](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control): Cache API terpisah dari kebijakan cache HTTP; no-store berbeda dari no-cache.
- [S4 — web.dev: The service worker lifecycle](https://web.dev/articles/service-worker-lifecycle): waiting, aktivasi, update, dan risiko skipWaiting.
- [S5 — JSZip: loadAsync](https://stuk.github.io/jszip/documentation/api_jszip/load_async.html): sanitasi path, original filename, penimpaan entry sama nama, CRC, dan keterbatasan format.
- [S6 — Supabase: Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security): grant/RLS dan akses service-role/secret.
- [S7 — Supabase: perubahan default eksposur Data API](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically): grant eksplisit untuk objek baru.

Dokumen ini adalah spesifikasi pekerjaan yang diusulkan; tidak berisi patch kode atau migrasi yang telah diterapkan.
