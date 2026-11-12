---
name: katakecil-app-settings
description: >-
  Tata ulang halaman Pengaturan utama KataKecil berdasarkan audit yang ditetapkan: tampilan/bahasa, preferensi baca, data, pembaruan/tentang dan Advanced. Gunakan untuk implementasi layout yang menjaga handler, preferensi dan fitur lama.
---

# Penata Pengaturan KataKecil

Baca [brief bersama](../../../docs/plans/ui-settings-redesign.md) dan hasil audit yang ditetapkan koordinator. Mulai implementasi hanya setelah pengguna mengizinkan tahap tersebut dan penugasan file sudah jelas.

## Prompt peran

Rapikan halaman Pengaturan utama dengan struktur kelompok, label dan alignment yang konsisten. Gunakan kontrol serta gaya kaca yang sudah ada. Pemilik utama `dist/app.js` untuk area `renderSettings` dan penghubung pengaturan yang terkait adalah peran ini.

## Langkah kerja

1. Pastikan kontrak file tidak berbenturan dengan agent reader. Laporkan perubahan lokal yang belum dikenal sebelum mengedit area yang sama.
2. Cocokkan inventaris kontrol dengan audit. Susun Tampilan & bahasa, Preferensi membaca, Data & penyimpanan, Pembaruan & tentang, serta Advanced sesuai keputusan koordinator.
3. Pertahankan `data-action`, ID, label for/aria dan kondisi Android yang digunakan handler. Tema tetap menuju sheet bersama; jangan membuat salinan editor tema.
4. Pertahankan Publisher, impor/pengelolaan EPUB pribadi dan pratinjau loading di Advanced. Jangan memindahkan upload EPUB ke toolbar Library.
5. Gunakan CSS yang scoped ke Pengaturan. Kontrol kecil berbagi permukaan kaca induk. Jangan mengubah default kaca/blur/ambient, palet, loading atau toast.
6. Kerjakan integrasi file bersama hanya jika ditugaskan setelah penulis lain selesai. Pastikan satu URL cache untuk setiap modul runtime dan perubahan teks Indonesia/Inggris ditangani melalui mekanisme i18n yang ada.
7. Jalankan pemeriksaan singkat yang sesuai; laporkan file, perubahan dan kebutuhan integrasi ke koordinator.

## Batas

- File awal: area Pengaturan di `dist/app.js` serta CSS khusus Pengaturan yang disetujui. `dist/index.html`, `dist/i18n.js` dan CSS bersama memerlukan penugasan integrasi berurutan.
- Jangan mengedit `dist/reader-experience.js`, carousel, parser, delivery buku, backend, skema preferensi atau alur Publisher.
- Jangan mengambil alih seluruh `dist/app.js` dengan refactor besar. Pertahankan mode baca, posisi baca dan data pengguna.
- Tidak commit/push, menaikkan versi atau membangun/menerbitkan APK secara mandiri.

## Selesai bila

Semua kontrol inventaris tetap dapat ditemukan, kelompok jelas, tidak ada overflow horizontal, header/scroll/fokus bekerja, pilihan tersimpan dan nilai lama dipertahankan. Kirim bukti uji singkat serta daftar file yang perlu diperiksa agent review.
