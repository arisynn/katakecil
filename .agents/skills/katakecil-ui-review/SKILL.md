---
name: katakecil-ui-review
description: >-
  Periksa hasil penataan Pengaturan, reader dan tema KataKecil dengan review diff, tes terarah dan browser lokal. Gunakan untuk QA singkat setelah integrasi; laporkan masalah ke pemilik file dan siapkan daftar uji HP tanpa publikasi produksi.
---

# Pemeriksa UI KataKecil

Baca [brief bersama](../../../docs/plans/ui-settings-redesign.md), kontrak koordinator dan diff integrasi. Mulai pemeriksaan setelah ditugaskan; menyiapkan skill tidak memulai QA.

## Prompt peran

Nilai apakah redesign memenuhi rancangan, mempertahankan fitur lama dan tetap nyaman pada HP. Uji seperlunya sesuai dampak perubahan. Kamu memberi temuan kepada pemilik file, bukan mengedit runtime milik mereka.

## Pemeriksaan

1. Cocokkan kontrol akhir dengan inventaris audit. Periksa entry point tema utama/reader, kondisi Android, Advanced, Publisher dan pengelolaan EPUB.
2. Tinjau diff untuk perubahan default, key, handler, reflow/posisi baca atau scope CSS yang tidak diperlukan. Periksa URL cache/import dan integrasi i18n.
3. Bila perubahan memerlukannya, jalankan `npm run build`, `npm run typecheck`, `npm run check` dan subset tes yang relevan. Laporkan perintah dan hasil nyata; jangan menjalankan `npm test`/suite penuh otomatis.
4. Uji browser lokal dengan fixture katalog/episode; gunakan fixture auth/API untuk Publisher bila area itu perlu diperiksa. Jangan memakai login atau publikasi produksi untuk QA.
5. Periksa viewport 320×568, 390×844, 667×375 dan 1280×800, tema terang/gelap, satu preset tambahan/Kustom yang relevan, label Indonesia/Inggris, fokus, Back, picker dan scroll.
6. Periksa tema kedua entry point, edit Kustom, perubahan nilai lalu tutup/buka ulang, tab/lensa, reset dan persistence yang terdampak. Periksa posisi baca sebelum/sesudah bila reader disentuh.
7. Pastikan naskah tetap polos, loading lama, toast global dan pengaturan kaca/ambient tidak ikut berubah. RSVP diperiksa hanya sejauh jalur masuk/keluar dan posisi resume terdampak layout.
8. Kirim temuan dengan file/selector, langkah reproduksi, dampak dan pemilik perbaikan. Setelah perbaikan, ulangi hanya cek yang terdampak atau belum pasti.

## Batas dan keluaran

- Runtime dibaca; tulis fixture/screenshot sementara dan laporan pemeriksaan yang ditugaskan. Tidak menaikkan versi, commit/push, build Android atau publikasi release.
- Jangan menyimpulkan pengujian HP/native dari viewport Chromium. Sebutkan fixture, cakupan serta batas pengujian.
- Laporan akhir: kontrol yang dipetakan, perintah/status cek, viewport/alur browser, temuan terbuka, lalu daftar uji HP singkat. Jika tidak ada temuan, tuliskan cakupan yang mendasari kesimpulan itu.
