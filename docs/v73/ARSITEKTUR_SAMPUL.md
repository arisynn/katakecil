# Arsitektur sampul V7.3

## Kontrak tampilan

`Cover` menerima metadata sampul publik opsional. Kartu memakai bingkai 2:3; mode crop sudah dibentuk menjadi turunan 2:3. Mode contain mempertahankan rasio gambar. Detail memakai turunan utuh dengan dimensi intrinsik dan batas tinggi viewport. Satu komponen dipakai untuk kartu, koleksi, detail, dan preview.

State gagal mengikuti identitas URL/versi sehingga penggantian pulih dari error sebelumnya. Jika sebuah varian gagal, tersedia satu fallback ke `cover_url`, lalu placeholder netral. Ilustrasi contoh hanya digunakan oleh katalog demo. Backdrop gambar tersembunyi telah dihapus. Gambar diberi ruang sebelum dimuat; `srcset`/`sizes` memakai dimensi turunan sebenarnya.

## Pipeline dan codec

Masukan diverifikasi berdasarkan signature dan header, byte maksimum 15 MiB, 20 juta piksel, serta sisi maksimum 8.192 px sebelum decode. Browser menormalisasi orientasi EXIF dan rotasi manual, lalu menghasilkan PNG dengan sisi terpanjang maksimum 1.600 px. Crop belum diterapkan pada PNG ini agar detail tetap utuh. Pemrosesan dilakukan di worker ketika API tersedia; fallback memakai canvas dengan batas yang sama.

Server memeriksa keanggotaan penulis, hash/ukuran/tipe master privat dan hash/dimensi PNG normalisasi. Master JPG/WebP diperiksa signature serta dimensi; **yang didekode penuh dan dijadikan dasar turunan publik adalah PNG normalisasi**. Input yang hanya mengganti ekstensi tidak menjadi gambar publik.

Server memakai decoder PNG dan encoder WebP WebAssembly dari paket yang dipatok: `@jsquash/png` 3.1.1 dan `@jsquash/webp` 1.5.0. Tidak menggunakan native image addons. Modul WASM disematkan sebagai data pada `_shared/cover-codecs/wasm.ts`, sehingga tidak memerlukan unduhan codec saat request atau konfigurasi `static_files` yang terpisah. Lisensi dan checksum disertakan. `scripts/vendor-cover-codecs.mjs` membuat ulang data tersebut dari dependency yang terkunci.

Adapter RGBA melakukan crop dan resize dengan interpolasi alpha premultiplied. Varian kartu ditargetkan pada lebar 160/360/720 px tanpa upscale dan tanpa duplikasi dimensi. Detail maksimal sisi 1.600 px. Output WebP memakai quality 88 untuk kartu, 92 untuk detail, method 1. Batas tiap varian 2 MiB. Anggaran transfer dalam rencana adalah sasaran visual, bukan jaminan byte untuk setiap ilustrasi.

Thumbnail pemilih kandidat dibuat kecil secara antre, bukan mendekode semua master besar sekaligus menjadi elemen gambar. Object URL dibersihkan saat pilihan/komponen berganti. Blob dan isi naskah tidak ditambahkan ke penyimpanan browser.

## Model data dan otorisasi

- `qr_cover_assets`: master/PNG privat, konfigurasi potong, hash, manifest privat, dan status pending/ready/published/abandoned. RLS serta grant hanya mengizinkan penulis membaca; perubahan dilakukan lewat API yang dijaga.
- `qr_book_covers`: hanya referensi aset dan manifest publik yang diperlukan frontend. Pembaca melihat baris untuk buku terbit yang tidak berada di Sampah; penulis dapat membaca metadata karya mereka sesuai model keanggotaan Studio yang ada.
- `qr_cover_publications`: request ID, versi yang diharapkan, hasil commit, dan tombstone percobaan yang dibersihkan. Receipt membedakan respons hilang dari transaksi yang belum terjadi.
- `story-covers-v73-private`: bucket privat, input immutable pada path yang sudah dicatat operasi. Client tidak memiliki policy update atau delete.
- `story-covers-v73`: bucket publik khusus WebP turunan. Tidak ada policy tulis client.

Tidak ada path master baru yang dimasukkan ke `qr_books` atau manifest publik. Query katalog menggunakan daftar kolom buku eksplisit. `cover_url` lama tetap diisi saat publikasi agar frontend lama dapat membaca sampul terakhir jika rollback diperlukan.

Fungsi berprivilege berada dalam schema `kk_private`, memakai search path kosong, dan memeriksa identitas yang sesuai. Wrapper public memakai SECURITY INVOKER dengan grant EXECUTE eksplisit. RPC pemrosesan/publikasi hanya dapat dijalankan `service_role`; pengguna biasa tidak dapat mengirim manifest untuk disahkan. Endpoint memverifikasi user JWT dan keanggotaan sebelum memakai privilege server. `user_metadata` tidak dipakai untuk otorisasi.

## Retry dan konflik

Satu upload memakai UUID dan fingerprint payload yang stabil. Pemakaian UUID dengan isi berbeda ditolak. Path master dan normalisasi bersifat immutable; respons upload hilang dapat dicoba lagi dengan pembandingan hash berkas yang sudah ada. Proses server memakai lease dua menit untuk mencegah dua worker mengolah aset sama sekaligus.

Private preparation tidak membuat salinan publik. Setelah penulis memilih terbitkan, salinan publik diberi path berdasarkan UUID publikasi. Transaksi database mengunci baris buku, memeriksa versi yang diharapkan, mengganti manifest/cover_url, dan menyimpan receipt. Dua operasi berbeda tidak dapat sama-sama menimpa versi yang sama. Retry operasi yang sudah commit mengembalikan receipt yang sama.

Storage dan database bukan satu transaksi. Karena itu objek publik tidak langsung dihapus saat respons commit tidak pasti. Retry memeriksa receipt; pembersihan terarah hanya menyentuh percobaan yang kedaluwarsa dan belum commit.

## Pembersihan terarah

`scripts/cover-cleanup.mjs` adalah alat operator, default dry run. Ia memerlukan kredensial server pada lingkungan operator, tidak pada Vite. `--apply` hanya memilih unggahan pending/abandoned atau percobaan publikasi belum commit yang lebih tua dari tujuh hari. Sampul siap, aktif, dan seluruh riwayat yang sudah commit dipertahankan.

Unggahan lama ditandai abandoned sebelum objek dihapus. Lease baru tidak diterbitkan bagi input yang lebih tua dari dua hari. Percobaan publikasi ditandai abandoned dengan UPDATE bersyarat `result IS NULL`, bersaing dengan row lock commit; request yang sudah commit tidak dapat diklaim. Tombstone tetap disimpan sehingga request itu tidak bisa commit setelah salinannya dibersihkan.

Path penghapusan dibatasi ke bucket V7.3, prefix book/UUID yang dicatat, dan basename keluaran yang dikenal. Objek yang tidak dikenal menghentikan penghapusan untuk ditinjau. Script ini tidak dijalankan terhadap produksi selama pengerjaan.
