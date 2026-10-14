# KataKecil V7.0 Alpha.1 — The Living Library

Tanggal: 14 Oktober 2026. Basis: source V6.12.1. Ini **rilis alpha untuk uji staging**, bukan V7.0 final.

## Yang sudah diimplementasikan

1. **Brand baru KataKecil:** simbol bulu pena dengan bintang kecil (vector SVG), lockup header, identitas Studio, logo pada loading React dan pre-React, favicon PNG/SVG, Apple touch icon, serta ikon 192/512. Palet tetap Arctic Blue / Midnight Sapphire.
2. **Beranda editorial:** hero carousel besar dihapus dari Beranda; tampil intro ringkas, Lanjut Membaca (jika ada progres), Cerita Pilihan dalam rail sampul, serta maksimal dua Bab Baru (jika benar-benar tersedia). Semua data dari sumber yang sudah ada.
3. **Temukan:** navigasi publik mengganti label Perpustakaan dengan Temukan (`/temukan`). URL lama `/cerita` tetap menampilkan listing. Temukan mempunyai carousel kabar dari jadwal bab publik dan rilis episode terbaru; tidak ada pemberitahuan palsu. Jika tidak ada kabar valid, carousel disembunyikan. Pencarian, filter status, genre, dan urutan tersedia.
4. **Koleksi:** tab selalu muncul meski kosong. Sampul kartu bersih tanpa bookmark overlay. Simpan cerita dilakukan melalui tombol berlabel di halaman detail; menghapus simpanan dapat dilakukan melalui detail maupun rak Koleksi. Key localStorage lama `katakecil:v6:collection` dipertahankan untuk menghindari kehilangan data.
5. **Sampul:** artwork penulis tetap dipakai, ditampilkan dengan `object-fit: contain`, tanpa bingkai tebal, badge, atau overlay di atas artwork.
6. **PWA identity:** manifest dan ikon aplikasi disertakan. **Belum ada service worker atau offline reader** dalam alpha ini.
7. **Tidak ada migrasi database baru** dan tidak ada perubahan pada engine pagination, secure reader, Auth/RLS, autosave, atau naskah.

## Yang belum masuk alpha

- Pengumuman bebas yang dibuat manual dari Studio (alpha memakai kabar yang diturunkan dari jadwal/rilis nyata).
- Push notifications, VAPID, subscription, dan scheduled job.
- Smart Reader 2.0 (text anchors lanjutan, completion status, estimasi membaca, Wake Lock).
- Drag-and-drop reorder bab, publishing checklist, penguatan autosave.
- Service worker, update prompt, offline shell; pemasangan PWA lintas perangkat belum diuji.
- Audit computed styles di aplikasi React yang berjalan dan pembersihan penuh CSS historis.

## Hasil pengujian di lingkungan pengerjaan

- `npm run test:current`: **13 kelompok tes lulus**, termasuk V7 alpha, keamanan Reader, dan kontrak V6.12.1.
- `npm run test:v7alpha`: **lulus**, termasuk selector pengumuman yang mengecualikan buku privat, jadwal lampau, dan episode mendatang.
- `npm run check:structure`: **lulus**.
- `node scripts/verify-public-build.mjs`: **lulus**.
- Pemeriksaan sintaks TS/TSX menggunakan global TypeScript transpiler: **0 error sintaks**.
- CSS baru: **0 parse error**.
- `npm run audit:colors`: 33 komponen UI tidak memiliki literal hex; **1.115 literal historis** masih ada di CSS lama dan perlu QA runtime.
- `npm run lint`: **belum dapat dijalankan penuh** karena `vite/client` tidak tersedia tanpa npm dependencies.
- `npm run build`: **belum dapat dijalankan** karena executable Vite belum tersedia.
- `npm install` gagal akibat `EAI_AGAIN` pada registry npm.
- Browser Chromium tersedia tetapi navigasi halaman lokal diblokir (`ERR_BLOCKED_BY_ADMINISTRATOR`), sehingga **belum ada screenshot aplikasi runtime atau QA visual yang tervalidasi**.

Tes historis V6.5–V6.8 yang mengunci markup/posisi carousel lama sengaja tidak dimasukkan ke `test:current` karena ekspektasi visualnya tidak berlaku untuk V7. Tes tersebut tetap tersedia secara terpisah; kontrak keamanan, Reader, dan baseline Studio tetap dijalankan. Ini bukan pengganti pengujian end-to-end.

## Langkah manual sebelum staging/deployment

1. Jalankan `npm install` pada komputer dengan akses registry npm, lalu `npm run lint`, `npm run build`, dan `npm run test:current`.
2. Konfigurasi `.env.local` dengan **publishable key** Supabase saja; jangan menaruh service-role key di frontend.
3. Pastikan RPC `qr_public_next_chapters` V6.8 telah dipasang bila ingin menampilkan jadwal bab berikutnya. Tanpa RPC, carousel hanya dapat memakai data episode yang telah terbit.
4. Uji navigasi Beranda → Temukan → Detail → Simpan → Koleksi, pencarian, filter, dua tema, 320/390/430px, tablet dan desktop.
5. Uji Reader pada Android/iOS (pinch, swipe, pagination, bookmark, posisi), serta Studio Auth, autosave, impor, dan publikasi menggunakan staging Supabase.
6. Setelah semua lulus, deploy alpha di preview/staging Vercel, bukan langsung menggantikan production.

## Keamanan dan kompatibilitas

- Tidak mengubah `src/data/secureReader.ts`, `src/data/supabase.ts`, `src/SecureReaderApp.tsx`, atau fungsi RLS Supabase.
- Tidak membuat episode, cover, pengumuman, statistik, atau konten palsu di database.
- Tidak menyimpan naskah ke service worker atau cache offline.
- `/cerita` tetap kompatibel sebagai rute lama, `/cerita/:slug` tetap menjadi detail cerita, `/baca/:slug` tetap Reader.
