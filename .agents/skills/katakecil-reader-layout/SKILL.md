---
name: katakecil-reader-layout
description: >-
  Rapikan pengaturan reader, sheet tema bersama dan alat baca KataKecil dengan kategori Teks, Tata letak, Tema dan Alat baca. Gunakan untuk redesign layout yang mempertahankan pagination, posisi baca, RSVP, TTS dan preferensi yang ada.
---

# Penata reader dan tema KataKecil

Baca [brief bersama](../../../docs/plans/ui-settings-redesign.md), hasil audit serta kontrak koordinator. Pada fase persiapan skill, berhenti setelah berkas panduan siap; implementasi menunggu instruksi mulai.

## Prompt peran

Rapikan isi pengaturan reader dan sheet tema yang juga dibuka dari Pengaturan utama. Tata ulang kontrol yang sudah tersedia agar mudah dipahami tanpa mengubah cara aplikasi membaca buku.

## Langkah kerja

1. Inventaris `appearance`, `themeControls`, `themeDialog`, `customThemeDialog` dan `tools` di `dist/reader-experience.js`. Pertahankan pemanggilan, event dan key preferensi yang ada.
2. Susun kategori Teks, Tata letak dan Tema sesuai audit; kelompokkan pencarian, RSVP, baca nyaring dan navigasi pada Alat baca. Daftar isi dan anotasi tetap jelas aksesnya.
3. Susun tema terang/gelap/sistem dan preset dalam pilihan yang konsisten. Editor warna kustom dibuka melalui Kustom; jelaskan cakupan globalnya dengan label ringkas bila diperlukan.
4. Gunakan picker, tab/lensa, transisi dan layout sheet yang sudah ada. Pertahankan node heading/tab saat berpindah panel; jangan menambah lensa atau input ganda.
5. Atur jarak, alignment dan urutan untuk HP pendek/landscape. Gunakan satu area scroll ketika konten panjang; jangan menyembunyikan kontrol demi menghapus scroll.
6. Gunakan CSS khusus area reader/tema yang ditugaskan. Laporkan kebutuhan cache URL, stylesheet dan terjemahan kepada koordinator untuk integrasi berurutan.
7. Periksa alur tema dari kedua entry point, nilai tersimpan dan bahwa membuka/menutup pengaturan tidak memindahkan posisi baca. Kirim hasil ke koordinator.

## Batas

- File awal: area pengaturan/tema/tools pada `dist/reader-experience.js` dan CSS scoped yang disepakati. Jangan mengedit `dist/app.js`.
- Jangan mengubah `src/reader/display.ts`, default/key preferensi, parser, pagination, signature reflow, anchor/progres, isi EPUB atau backend.
- Jangan mengubah mesin TTS/RSVP, ukuran huruf RSVP, penempatan huruf fokus, WPM atau posisi resume. Bila menemukan masalah di luar layout, laporkan secara terpisah.
- Kertas naskah tetap opak dan polos; palet, kaca/ambient dan toast bersama dipertahankan.
- Tidak commit/push, menaikkan versi atau menjalankan build/release APK secara mandiri.

## Selesai bila

Sheet tema tersusun jelas, kategori dapat dipahami, semua kontrol lama bekerja, akses keyboard/Back/picker tetap benar dan naskah/posisi baca tidak berubah. Laporkan file, hasil cek, screenshot bila diminta, risiko dan kebutuhan integrasi.
