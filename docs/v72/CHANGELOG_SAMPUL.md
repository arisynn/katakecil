# Changelog — Sampul pintar

Di atas **KataKecil V7.2 RC1**. Web, pembaca, Studio, impor, jadwal, dan Sampah tidak diganti. Tidak ada migrasi database.

## Yang baru

### Kenali bentuk sampul

Saat gambar dimuat, lebar dan tinggi diukur. Bentuknya masuk salah satu kelompok:

| Bentuk | Syarat (tinggi ÷ lebar) | Contoh |
|---|---|---|
| Poster panjang | 2,35 atau lebih | Poster yang harus digeser |
| Wallpaper HP | 1,6 sampai di bawah 2,35 | 9:16, 9:19.5, 9:21 |
| Sampul buku | 1,25 sampai di bawah 1,6 | 3:4 dan 2:3 dibedakan |
| Hampir kotak | 0,85 sampai di bawah 1,25 | 1:1 |
| Sampul lebar | di bawah 0,85 | 16:9, 3:2, 4:3 |

Nama rasio terdekat juga ditampilkan (9:16, 3:4, 2:3, dan seterusnya) jika selisihnya kecil.

### Rak, daftar, dan detail

- Rak dan daftar tetap bingkai **2:3** supaya baris buku rata.
- Gambar **tidak dipotong** dan tidak ditarik. Wallpaper 9:16 tidak dipaksa jadi 2:3.
- Jika bentuknya tidak pas 2:3 (selisih lebih dari 0,06), ruang kosong diisi blur dari sampul yang sama.
- 2:3 yang pas mengisi bingkai tanpa blur.
- Rak mengisi ruang kosong dengan sampul yang sama: diperbesar sampai menutupi bingkai, lalu di-blur. Gambar tajam tetap utuh di depan.
- Di Studio, memilih sampul membuka langkah crop dulu. Bisa utuh, 2:3, 3:4, 9:16, atau kotak. Gambar digeser dan diperbesar sebelum dipakai.
- Fokus bawaan wallpaper dan poster ada di bagian atas (38%), supaya judul yang biasanya di atas lebih kelihatan. Belum ada penggeser fokus manual.

### Unggah di Studio

- Sebelum simpan, Studio menampilkan tiga pratinjau: **Rak**, **Detail**, dan **Daftar**, plus nama rasio dan keterangan singkat.
- Berkas JPG, PNG, atau WebP dibaca di HP, lalu dikecilkan ke WebP. Sisi terpanjang 1600 px (turun ke 1280 atau 960 bila masih terlalu besar). Hasil akhir paling besar 5 MB.
- Ditolak: sisi terpendek di bawah 200 px, sisi terpanjang di atas 8000 px, rasio lebih ekstrem dari 4:1, berkas di atas 20 MB, dan selain JPG/PNG/WebP.
- HEIC iPhone ditolak dengan pesan: simpan sebagai JPG, lalu unggah lagi.
- URL sampul tetap bisa dipakai. Ukurannya dicek; gambar di URL tidak dikompres ulang.
- Sampul privat dari impor, bila dipilih untuk dipublikasikan, ikut dikompres dengan aturan yang sama.
- Konfirmasi sebelum salinan masuk penyimpanan publik tetap ada.

### Contoh di mode pratinjau

Jika Supabase tidak terhubung, enam cerita contoh memakai sampul dengan bentuk berbeda: 9:16, 3:4, 2:3, lebar, kotak, dan poster panjang. Katalog produksi tidak berubah sampai sampul diunggah ulang.

## Yang tidak berubah

- Pembaca, PWA, koleksi, Temukan, Tentang, editor episode, impor naskah, jadwal rilis, dan Sampah.
- Skema database dan bucket Storage. Sampul lama di rak tetap tampil dengan aturan baru begitu halamannya dimuat, tanpa diunggah ulang. Kompresi WebP hanya terjadi saat unggah baru atau saat sampul privat dipublikasikan.
- Tidak ada pemotong manual dan tidak ada pilihan “paskan paksa ke rak”.

## Berkas

| Status | Berkas |
|---|---|
| Baru | `src/utils/coverFit.ts` |
| Baru | `src/features/studio/components/CoverFields.tsx` |
| Baru | `src/features/studio/components/CoverCropper.tsx` |
| Baru | `scripts/test-cover-fit.mjs` |
| Diubah | `src/components/Cover.tsx` |
| Diubah | `src/design/v72.css` |
| Diubah | `src/features/studio/components/BookManagement.tsx` |
| Diubah | `src/pages/PublicLibrary.tsx` |
| Diubah | `scripts/test-current.mjs` |
| Baru | `public/assets/v73/` (sampul contoh) |
