# KataKecil V5.3 — Reader First / Mobile Frontend

**Basis:** source KataKecil V5.1. **Jenis pembaruan:** frontend saja. **Tidak perlu SQL, RPC, atau deployment Edge Function baru.**

## Apa yang berubah

1. **Navigasi publik dipisah dari Studio.** Pembaca hanya melihat Beranda, Perpustakaan, dan Tentang Penulis. URL privat `/studio` tetap ada dan masih memerlukan login serta otorisasi server.
2. **Mist Blue light/dark** dengan toggle khusus website/Studio; tema ini disimpan pada `katakecil_ui_theme_v53`, terpisah dari preferensi Reader.
3. **Mobile Beranda:** hierarki judul–CTA–featured cover diperjelas, hero dipadatkan, label episode dan kutipan tidak lagi ditumpuk pada satu posisi.
4. **Jelajah:** pencarian dengan tombol bersihkan; filter genre digulir horizontal untuk layar kecil.
5. **Detail novel:** sampul original ditampilkan utuh, metadata dan CTA dibaca dengan nyaman, daftar episode tetap berasal dari data publik.
6. **Studio privat:** navigasi bawah 4 tab utama ditambah bottom sheet **Lainnya** untuk Data, Sampah, dan tautan melihat website. Desktop tetap memakai sidebar yang lama.
7. **Aset ambient:** enam ilustrasi WebP baru (sudut baca, meja penulis, rak buku; masing-masing terang dan gelap) di `public/assets/v53`. **Tidak ada sampul novel yang diubah atau digenerate.**

## Batasan desain

- Seluruh perubahan layout baru diberlakukan dalam breakpoint <=767px, kecuali bottom sheet Studio tambahan untuk rentang 768–820px sesuai breakpoint Studio lama.
- Desktop tidak didesain ulang. Header publik desktop kehilangan tombol Studio sesuai keputusan produk: website publik khusus membaca.
- Sepuluh file Reader utama (ReaderApp, SecureReaderApp, kontrol, panel, pagination, CSS Reader, index CSS) diverifikasi identik byte demi byte dengan V5.1. Tidak ada perubahan navigasi membaca, kontrol Aa, swipe, pagination, bookmark, atau mekanisme Secure Read.
- Mockup sebelumnya hanyalah referensi visual; rating dan angka statistik fiktif **tidak** dimasukkan.

## Verifikasi yang dilakukan

- `node scripts/test-v421-reader.mjs` — PASS
- `node scripts/test-v5.mjs` — PASS
- `node scripts/test-v51.mjs` — PASS
- `node scripts/test-v53.mjs` — PASS
- `node scripts/verify-public-build.mjs` — PASS
- Parser TypeScript (transpile/syntax, bukan type-check penuh) — PASS untuk file yang diubah
- Parser CSS — PASS
- Enam aset WebP ada dan ukuran per file <10 KB

**Belum diverifikasi:** `npm run lint`, `npm run build`, inspeksi visual nyata, Android Chrome, dan Vercel Preview. Instalasi dependensi di lingkungan penyusunan tidak selesai karena timeout. Jalankan pemeriksaan tersebut sebelum men-deploy ke production.

## QA wajib sebelum production

- Lebar 320/360/390/430 px; home light/dark, katalog, detail, About, Studio, importer, Sampah, dan menu Lainnya.
- Pastikan tidak ada overflow horizontal dan elemen bertumpuk; judul sampul tidak terpotong.
- Uji reader: navigasi sentuh, halaman berikutnya, daftar isi, Aa, search, bookmark, progress, dan kembali dari detail. Website dark toggle **tidak** boleh mengubah tema Reader.
- Uji desktop visual di 1024/1440 px untuk memastikan tidak ada regresi tak disengaja.
- Uji login Studio, izin penulis, impor EPUB, dan tindakan Sampah menggunakan akun berizin; jangan melakukan penghapusan permanen hanya untuk QA di production.
- Pantau network: halaman publik tidak boleh mengakses konten episode draft.

## Catatan backend

Source ini tidak menjalankan migrasi, mengubah jadwal terbit, atau mengubah konten novel. Function Supabase yang sudah terpasang pada update sebelumnya tetap digunakan sebagaimana adanya.
