# Buku tamat, cover dan struktur EPUB

Pembaruan 5 November 2026, baseline `25dd9e1`.

## Audit dan perubahan

Apa Itu Rumah? memiliki 53 section terbit: halaman judul/sinopsis, empat divider Arc I–IV dan 48 bab. Parser lama mengandalkan ID arc numerik sehingga divider teks Romawi tidak dikenali. Parser revisi7 mengenali label arc, rentang episode pada divider, struktur TOC EPUB3 bertingkat dan induk NCX, serta judul/nomor bab. Halaman judul dan sinopsis pembuka dikeluarkan dari alur cerita; nomor BAB untuk cerita ber-arc tanpa nomor eksplisit mengikuti urutan naskah. Label eksplisit seperti EPISODE0 tetap dipertahankan.

Cover pengganti dari pengguna diekspor sebagai WebP600×900 pada `dist/assets/covers/apa-itu-rumah-20261105.webp`. Metadata cover Supabase diarahkan ke aset publik ini; cover yang sama disertakan ke EPUB siap baca. Halaman pembuka Apa Itu Rumah? menjadi halaman judul dengan nama penulis, tanpa sinopsis. Isi 48 bab, ID section dan jadwalnya tetap.

Masa Panen memiliki seluruh49 section terbit tetapi metadata masih ongoing. Sesuai pernyataan penulis, statusnya diperbarui menjadi completed; jadwal dan isi tidak diubah. Pembaca tetap memulai EPISODE0; terdapat46 episode dan satu bagian Tentang Buku.

## Pembacaan private

Source fungsi katakecil-reader yang sebelumnya hanya ada di server kini dilacak di repo. Dua ID yang disetujui memakai EPUB siap baca dalam bucket private kk-sources, pada `reader-editions/<book-id>/<revision>.epub`. Edisi ini dibuat dari section yang lolos RLS saat ini dan memuat cover; arsip asli tidak ditimpa. Setelah dibuat sekali, request selanjutnya memuat EPUB private tanpa merakit ulang HTML.

Pembaca tetap mengakses endpoint katakecil-reader yang sama dan menerima X-KataKecil-Revision. Tidak ada URL bertanda tangan, kunci admin, atau path private yang diberikan kepada browser. Endpoint memeriksa ulang revisi/publikasi setelah memuat/merakit bytes. Cache hanya berlaku untuk dua buku completed tanpa jadwal mendatang; buku ongoing tetap melalui perakitan section terbit. Frontend mempertahankan pemeriksaan UUID section, ukuran file, revisi, serta larangan menyimpan naskah server ke localStorage/IndexedDB. Tidak ada tabel atau migrasi schema baru.

## Pemeriksaan

Baseline: dua tes judul/arc existing lulus sebelum perubahan. Setelah perubahan: empat tes parser/TOC/cache/cover baru, dua regresi judul/arc existing, dan satu tes Deno untuk cover EPUB, titlepage serta sanitasi lulus. Build, typecheck frontend, check runtime/publication boundaries, Deno check fungsi server dan diff check dijalankan.

EPUB tayang sebelum perubahan dipakai untuk membandingkan teks dan anchor: seluruh48 bab Apa Itu Rumah?, 47 bagian Masa Panen, dan11 bab Garis yang Kita Teruskan tetap identik teksnya dan anchor contoh tetap ditemukan pada href episode yang sama. Parser mengenali empat arc Romawi pada Apa Itu Rumah?; UUID file narasi dipertahankan. Ini pemeriksaan terarah, bukan QA perangkat penuh.

## Operasi dan rollback

Perubahan data hanya cover/status buku serta judul/HTML halaman pembuka Apa Itu Rumah?. Simpan backup metadata/front dan source fungsi versi2 sebelum perubahan, di direktori artefak privat di luar Git. Tidak menyimpan naskah produksi di repo.

Rollback: restore fungsi lama dari backup, pulihkan metadata/front dari backup, lalu revert commit frontend bila diperlukan. Cache reader-editions bersifat immutable dan private; biarkan arsip asli tetap utuh. Jangan memulihkan tanggal rilis atau data buku ongoing dari snapshot lain.

QA HP: cek cover Library, BAB1 Apa Itu Rumah?, accordion empat arc, resume/progres lama dan highlight, serta pembukaan Masa Panen. Browser/HP fisik tidak menjadi klaim pemeriksaan ini.
