# Kontrak implementasi swarm Pengaturan dan reader

Pengguna memerintahkan **Lanjutkan implementasi** setelah lima skill proyek disiapkan. Baseline runtime `167af437778c1f258456f5e905b16dd359fb5f63` (1.2.4/build 12); pull awal tidak menemukan update lain. Panduan/skill yang sudah dibuat tetap dipertahankan.

## Keputusan setelah audit

- Halaman Pengaturan memakai lima kelompok sejajar: Tampilan & bahasa, Preferensi membaca, Data & penyimpanan, Pembaruan & tentang, serta Advanced/Lanjutan. Hanya isi Advanced tetap dapat dilipat.
- Tema tetap satu preferensi global, dipilih dari Mode tampilan (Terang/Gelap/Sistem), Palet tambahan (Sepia/Kertas/Hijau), dan pintu masuk Kustom. Kelompok bukan setting independen; satu pilihan aktif di seluruh kelompok. Halaman utama dan reader menggunakan renderer tema bersama.
- Reader mempertahankan tiga tab Teks/Tata letak/Tema. Isi Teks dikelompokkan menjadi Huruf dan Spasi; Tata letak menjadi Halaman, Margin & kolom, dan Layar. Opsi lanjutan yang sudah tersedia tetap ada.
- Tools membedakan Alat bantu dari Navigasi. Daftar isi, anotasi, RSVP, TTS, prev/next dan page jump tetap menggunakan handler lama.
- UI tetap memakai kaca/ambient, palet, toast dan loading yang sudah disetujui. Tidak mengubah key/default, parser, pagination, posisi baca, semantik reset, atau mesin RSVP/TTS.

## Kepemilikan aktif

| Peran | File | Tahap |
| --- | --- | --- |
| Auditor | `docs/plans/ui-settings-audit.md` | Audit kode selesai |
| Pengaturan | `dist/app.js`, `dist/settings-layout.css` | Implementasi halaman utama selesai |
| Reader | `dist/reader-experience.js`, `dist/reader-settings-layout.css` | Implementasi reader dan tema bersama selesai |
| Integrator: agent Pengaturan, setelah handoff | `dist/index.html`, `dist/i18n.js`, URL import/cache di `dist/app.js`; ekspektasi struktur di `tests/reader.test.mjs` | Integrasi berurutan selesai, app v62 / reader v31 / i18n v15 |
| Pemeriksa | Fixture/screenshot sementara dan laporan validasi | Selesai: 37 tes terarah, build/typecheck/check, empat viewport dan picker aktual lulus |

Tidak ada dua penulis pada satu file. Stylesheet baru harus scoped; Publisher memakai shell yang sama dengan Pengaturan sehingga tidak boleh ikut terkena selector umum. `.appearance-field`, `data-reader-pref`, node range, tab dan lensa dipertahankan untuk preview/fokus/gesture yang ada.

Heading Pengaturan memakai sumber Indonesia stabil melalui dictionary i18n. Ini mempertahankan pergantian EN→ID pada node yang sama tanpa merender ulang form; temuan pemeriksa pada dua heading baru diperbaiki oleh agent Pengaturan. Koordinator juga menemukan swatch aksen kustom terpotong pada screenshot; pemilik CSS memperbaiki penumpukan swatch/ikon, dan reviewer memverifikasi picker aktual serta screenshot stabil. Tidak ada temuan terbuka pada cakupan pemeriksaan ini.

## Pemeriksaan dan batas tahap

Build helper, typecheck/check, subset tes yang terdampak dan browser lokal dengan fixture. Target 320×568, 390×844, 667×375, 1280×800; periksa kedua bahasa, tema utama/reader, Kustom, fokus, Back, scroll, persistence dan posisi baca. Pemeriksa melaporkan temuan ke pemilik file; perbaikan dan pengulangan cek mengikuti dampak temuan.

Tahap ini adalah penataan UI web. Versi aplikasi tetap 1.2.4/build 12. Tidak menjalankan build/release APK atau menulis data produksi. Koordinator bertugas menyusun prompt, menetapkan kontrak, memantau serta menilai hasil; coding runtime dikerjakan agent pemilik file.
