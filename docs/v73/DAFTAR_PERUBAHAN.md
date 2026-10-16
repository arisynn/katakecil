# KataKecil V7.3 RC1 — perubahan utama

- Satu kontrak cover untuk katalog, detail, koleksi, Studio, dan preview; placeholder netral, responsive variants, pemulihan state error, ruang gambar stabil, serta dialog sampul lebih besar.
- Editor sampul dengan validasi signature/dimensi/byte sebelum decode, normalisasi orientasi, rotasi, contain/crop, fokus/zoom, keyboard/sentuhan, overview bagian terpotong, dan tiga preview konteks.
- Pipeline server WebAssembly PNG → RGBA → WebP, tanpa native addons atau ketergantungan image-transform berbayar. Codec dipatok dan modulnya disertakan bersama lisensi/checksum.
- Dua bucket baru, metadata privat/public terpisah, private preparation, publikasi eksplisit, UUID/fingerprint, input immutable, lease, receipt publikasi, serta pemeriksaan versi buku dalam transaksi.
- Pengelola riwayat dan pemulihan sampul. Upload gagal dan percobaan publikasi belum commit memiliki alat pembersihan terarah dengan mode dry run.
- Kandidat sampul ZIP/EPUB, thumbnail kecil yang dibuat bertahap, batas bersama, dan retry sampul terpisah dari commit naskah.
- Query buku publik memakai kolom eksplisit; fallback metadata lama tetap tersedia. Sampul baru tidak membuat buku/bab terbit otomatis.
- Sepuluh suite regresi, dua suite browser, dan verifikasi entry point Deno. Fixture dan codec tes juga portabel tanpa native image addons.

Tidak ada perubahan terhadap cara membaca atau tambahan bacaan offline. Panah kembali, ikon Sapphire, dan penghapusan banner preview penulis dari V7.2 tetap dipertahankan.
