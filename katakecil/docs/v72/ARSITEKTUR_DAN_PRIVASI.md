# Arsitektur, privasi, dan audit V7.2

## Kontrak utama

`qr_import_manuscript_v72(UUID, JSONB)` memeriksa penulis, batas payload, dan fingerprint. Advisory transaction lock mencakup pasangan actor + UUID. UUID sama dan payload sama mengembalikan receipt sebelumnya; payload berbeda ditolak. Wrapper menjalankan impor V5 yang sudah diperbaiki, lalu menyimpan receipt dalam transaksi yang sama. Konflik salah satu item membatalkan seluruh transaksi naskah/buku/halaman/receipt. Sampul merupakan langkah terpisah setelah commit.

`qr_import_status_v72(UUID)` memeriksa receipt milik penulis dan menunggu lock operasi yang sudah berjalan. Status kosong berarti belum ada transaksi yang terlihat pada pemeriksaan tersebut, bukan jaminan terhadap permintaan yang belum sampai ke server. Jangan membuat operasi baru ketika status masih ambigu; gunakan retry sesi yang sama. Double-click UI ditahan status saving dan server tetap menjadi pengaman utama.

`qr_import_requests` hanya menyimpan actor/UUID, fingerprint, hasil, waktu, dan metadata keputusan yang dibatasi/diambil melalui whitelist. Tidak ada kolom salinan isi episode. Penulis dapat membaca receipt miliknya; anon tidak diberi akses. Keputusan merekam path, klasifikasi, pilihan, nomor dan alasan, bukan arsip asli. Kunci payload dan identitas sementara disimpan di RAM; sessionStorage hanya menyimpan UUID operasi untuk pemeriksaan status setelah reload.

`qr_author_episode_metadata_v72` mengembalikan metadata, panjang isi dan hash, tanpa `content_md`. `qr_author_episode_v72` memuat satu episode non-Sampah untuk akun penulis. Model otorisasi tetap mengikuti proyek asli: anggota `qr_author_members` merupakan penulis tepercaya pada perpustakaan ini, bukan model multi-tenant per buku.

Penanganan arsip memeriksa central directory sebelum JSZip menormalisasi nama. Path traversal, absolute path, drive path, symlink, duplikasi case/Unicode, header tidak konsisten, encryption, ZIP64/multipart, jumlah entry, dan ukuran ditolak/dibatasi. Ekstraksi berkas yang dipakai dibatasi per chunk dan memeriksa CRC. Berkas unsupported tidak didekompresi menjadi naskah. EPUB memakai pemeriksaan arsip yang sama; XML/XHTML diproses inert dan tidak dimasukkan sebagai HTML aktif. Nested EPUB diurai di main thread setelah worker ZIP; perangkat lambat masih perlu diuji.

## Kebijakan penyimpanan

| Data | Lokasi dan masa hidup |
|---|---|
| Isi reader publik | Satu episode di RAM; dibuang saat offline/gagal akses, dimuat ulang saat kembali online atau kembali dari background lama |
| Isi editor dan preview | RAM selama editor aktif; tidak ditulis ke penyimpanan browser oleh aplikasi |
| File ZIP dan review | RAM/worker; worker dihentikan setelah selesai/batal/timeout |
| Kemajuan baca | Nomor episode, anchor/offset, waktu; tanpa tubuh cerita |
| Bookmark publik | Metadata judul dan anchor; label generik, bukan kutipan isi |
| Bookmark preview | State RAM; tidak dipersistenkan |
| Preferensi | Tema, ukuran huruf dan pengaturan baca |
| Sesi Auth | Tetap dikelola SDK Supabase; bukan isi naskah |
| Operasi impor tertunda | UUID pada sessionStorage; dihapus setelah hasil terverifikasi/logout |
| Sampul impor | Bucket `story-covers-private`, akses penulis; preview melalui fetch berizin no-store dan object URL yang dicabut saat unmount |
| Service worker | Tidak memakai Cache Storage, IndexedDB, precache, background sync atau replay mutation |
| Aset JS/CSS/font/ikon | Cache HTTP browser biasa dapat berlaku; tidak berisi naskah privat |

Pembersihan migrasi browser hanya menyasar `quiet_reader_bookmarks_preview-*` dan `quiet_reader_anchor_preview-*`. Data aplikasi lain tidak dibersihkan. Ini tidak dapat menghapus salinan yang sebelumnya diekspor pengguna/browser di luar pengelolaan aplikasi.

Semua fetch SDK memakai `cache: no-store`; endpoint reader mempertahankan header no-store, RPC baru menetapkan response headers. Hosting memberi header untuk worker, manifest dan rute sensitif. Service worker hanya menangani navigasi GET same-origin, mengembalikan halaman koneksi generik ketika fetch gagal. HTTP 404/429/500 tetap dipertahankan. Worker tidak mengaktifkan dirinya/reload seluruh tab tanpa tindakan pengguna.

Tanpa offline bukan DRM. Perangkat tetap perlu menerima teks untuk menampilkan cerita; tangkapan layar, ekstensi, atau pengguna yang menguasai browser tidak dapat dicegah mutlak oleh PWA. Kontrol akses server, pembatasan read budget, no-store dan masa hidup RAM tetap menjadi batas yang nyata.

## Hasil terhadap audit awal

| Temuan | Implementasi / status |
|---|---|
| A01–A02 | Parser teks mempertahankan pembuka, mengikuti perpindahan arc; EPUB multiheading juga mempertahankan prefix |
| A03 | UUID/fingerprint, transaction lock, receipt, pemeriksaan status dan retry payload tetap |
| A04 | Mesin preview bersama, penanda tanpa kutipan, pembersihan key preview lama |
| A05 | Guard editor/import, beforeunload, navigasi aplikasi/Back, logout dan update |
| A06–A08 | ZIP UI/worker/RPC, penomoran Romawi/Chapter/nama file, default lanjut nomor terbesar dan opsi eksplisit |
| A09–A13 | Nomor asli, satu mesin reader, grid TOC, state gagal/target retry, route pathname + search |
| A14 | Metadata dahulu, single-episode load, state logout dan pembatalan hasil request usang |
| A15 | Filter `deleted_at` pada buku/episode di kedua endpoint |
| A16 | Batas episode/halaman/byte, review ambigu wajib; server tetap validasi final |
| A17 | Pemasangan manual, fallback petunjuk, worker network-only, update terkendali, ikon any/maskable terpisah |
| A18 | Studio dan EPUB dipecah dari JS awal. CSS lama masih eager untuk menjaga cascade; konsolidasi 31 stylesheet belum dilakukan |
| A19 | Versi dependency dipatok + lockfile, compiler API stabil, suite perilaku baru; hash reader lama tidak diganti sekadar agar hijau |
| A20 | Bucket privat, pilihan eksplisit, preview berizin, penyalinan ke publik setelah konfirmasi |
| A21 | Update editor memakai expected `updated_at`; konflik tidak menimpa server |
| A22 | Endpoint legacy dipertahankan, dengan filter Sampah. Penghapusan endpoint menunggu bukti pemakaian produksi; legacy tetap tidak menerima episode 0 |

Batas tambahan: UI belum memiliki diff berdampingan untuk kandidat duplikat, filter konflik khusus, pengelompokan multi-karya otomatis, atau undo bertingkat. Konflik dijelaskan oleh validator/receipt dan bisa diselesaikan melalui editor item. Riwayat keputusan tersimpan di database, belum ada halaman audit visual tersendiri. Ini dicatat sebagai kelanjutan perawatan, bukan disembunyikan sebagai fitur yang telah selesai.

## Pemeriksaan proyek terhubung

Audit read-only Supabase menemukan akses SELECT langsung ke body terbit dan policy/Edge live yang belum memfilter Sampah. Detail, batas pembuktian, dan patch bertahap tersedia di `AUDIT_SUPABASE.md`. Kedua temuan belum diperbaiki pada produksi; sumber dan SQL perbaikannya disertakan untuk staging.
