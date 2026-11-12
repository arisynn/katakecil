# Persiapan swarm penataan Pengaturan dan reader

Status: **IMPLEMENTASI SELESAI — pemeriksaan terarah lulus**.

Pengguna telah memberi instruksi **Lanjutkan implementasi**. Swarm menyelesaikan audit, implementasi pada file terpisah, integrasi berurutan dan review terarah. Build helper, typecheck/check, 37 tes terarah dan browser fixture lulus. [Catatan hasil](../ui-settings-redesign.md). Tidak ada fitur baru, perubahan backend, atau build/release APK dalam tahap penataan web ini.

## Tujuan dan konteks

Rapikan tata letak isi dan pengelompokan pengaturan aplikasi, reader serta sheet tema. Gunakan fitur yang sudah tersedia. Acuan persiapan adalah source `167af437778c1f258456f5e905b16dd359fb5f63`, versi 1.2.4/build 12. Periksa HEAD aktual ketika pekerjaan dimulai; jangan menganggap acuan ini selalu versi terbaru.

Pertahankan gaya kaca, Pearl/charcoal, glow sesuai aksen, loading wordmark lama, serta toast global yang sudah disetujui. Nilai default kaca tetap 75%, blur 20 px dan ambient 60%. Kertas buku tetap polos dan opak; ukuran huruf RSVP serta huruf penandanya tetap stabil. Fokus pekerjaan adalah hierarki, urutan, label, jarak, alignment dan navigasi pengaturan.

## Struktur awal untuk diaudit

| Area | Kelompok yang diusulkan | Isi yang sudah tersedia |
| --- | --- | --- |
| Pengaturan utama | Tampilan & bahasa | Bahasa, tema, aksen, Liquid Glass/ambient |
| Pengaturan utama | Preferensi membaca | Pilihan huruf dan ukuran dasar |
| Pengaturan utama | Data & penyimpanan | Backup, pemulihan, ekspor catatan, status penyimpanan |
| Pengaturan utama | Pembaruan & tentang | Pembaruan pada Android, informasi aplikasi |
| Pengaturan utama | Advanced/Lanjutan | Publisher, impor/pengelolaan EPUB pribadi, pratinjau loading |
| Reader | Teks | Huruf, ukuran, tebal, jarak dan perataan yang sudah ada |
| Reader | Tata letak | Margin, lebar, posisi konten, halaman/scroll dan opsi tampilan yang sudah ada |
| Reader | Tema | Pilihan tema tersusun seragam; editor warna kustom melalui pilihan Kustom |
| Reader | Alat baca | Pencarian episode, RSVP, baca nyaring dan navigasi yang sudah ada |

Auditor memetakan setiap kontrol aktual ke kelompok sebelum implementasi. Jangan membuat kontrol baru untuk memenuhi tabel. Daftar isi, highlight, catatan dan bookmark tetap mudah ditemukan. Pengaturan tema dari halaman utama dan reader memakai implementasi bersama yang sudah ada. Perubahan tema dari kedua pintu masuk harus konsisten.

## Lima peran

1. **Koordinator:** menyusun rencana, prompt, dependensi, kontrak file dan kriteria penerimaan; mengarahkan serta menilai hasil. Tidak mengambil alih coding rutin dari subagent.
2. **Auditor UI:** membaca UI/kode aktual, memetakan kontrol dan menyusun rancangan hierarki. Tidak mengubah aplikasi.
3. **Penata Pengaturan:** menerapkan pengelompokan pada halaman Pengaturan dan integrasi entry point.
4. **Penata reader:** menerapkan pengelompokan reader serta sheet tema bersama.
5. **Pemeriksa UI:** memeriksa hasil integrasi dengan uji terarah dan fixture; melaporkan masalah ke pemilik file.

## Urutan kerja setelah pengguna memerintahkan mulai

1. Koordinator memeriksa status repo, instruksi terbaru dan otorisasi lingkup.
2. Auditor mengirim inventaris dan rancangan kelompok. Koordinator menetapkan kontrak antarmuka/file berdasarkan hasil audit; keputusan rutin tidak memerlukan pertanyaan ulang ke pengguna.
3. Agent Pengaturan dan reader bekerja paralel pada file yang berbeda. Tidak ada dua penulis pada file yang sama.
4. Koordinator memberi tugas integrasi berurutan kepada pemilik file: tautan stylesheet, terjemahan, import/cache URL dan dokumentasi. Agent tetap menyelesaikan implementasi; koordinator menjaga konsistensi rencana dan hasil.
5. Pemeriksa menguji hasil integrasi. Perbaikan dikirim ke pemilik file; ulangi hanya pemeriksaan yang terdampak.
6. Koordinator melaporkan hasil, bukti singkat, batas pengujian dan daftar uji HP. Push/build/release mengikuti instruksi pengguna yang berlaku untuk tahap tersebut.

## Kontrak file

| Pemilik | Lingkup awal | Batas |
| --- | --- | --- |
| Auditor | Baca kode dan UI; laporan audit di `docs/plans/` | Tidak mengedit runtime |
| Pengaturan | `dist/app.js`: `renderSettings`, entry point/handler pengaturan terkait; stylesheet dengan selector Pengaturan | Jangan menyentuh reader, carousel, delivery, importer atau Publisher |
| Reader | `dist/reader-experience.js`: tampilan teks/layout/tema/tools; CSS khusus area tersebut | Jangan mengedit `dist/app.js`, parser, pagination, posisi baca atau mesin RSVP/TTS |
| Integrasi berurutan, ditugaskan koordinator | `dist/index.html`, `dist/i18n.js`, CSS bersama, import/cache URL, dokumentasi terkait | Tetapkan satu pemilik untuk setiap file sebelum edit; perubahan di `dist/app.js` tetap dikerjakan pemilik Pengaturan |
| Pemeriksa | Fixture sementara, screenshot dan laporan pemeriksaan | Runtime dibaca; minta pemilik file memperbaiki temuan |

Kontrak ini dapat dipersempit setelah audit. Sebelum memperluasnya, koordinator memberi penugasan eksplisit dan menghentikan penulis lain pada file yang sama. Setiap agent melaporkan asumsi, file yang disentuh, hasil cek dan blocker. Agent tidak commit/push secara mandiri.

## Konteks teknis untuk prompt

- `dist/app.js`: `renderSettings`, penghubung pengaturan global, shell dan event aplikasi.
- `dist/reader-experience.js`: `appearance`, `themeControls`, `themeDialog`, `customThemeDialog`, `tools` dan UI reader.
- `dist/glass-settings.js`, `dist/glass-preferences.js`, `dist/glass*.css`, `dist/ambient.css`, `dist/toast.css`: preferensi dan gaya bersama yang dipertahankan.
- `dist/app-popups.js`, `dist/panel-layout.js`, `dist/glass-tabs.js`, `dist/motion.js`: picker, konten sheet, tab/lensa dan transisi; pakai mekanisme yang ada.
- `src/reader/display.ts`, `dist/store.js`, `src/platform/backup.ts`: semantik/default/penyimpanan preferensi; tidak menjadi sasaran redesign.
- Tes yang mungkin relevan: `tests/reader-controls.test.mjs`, `tests/glass-preferences.test.mjs`, `tests/glass-tabs.test.mjs`, `tests/app-popups.test.mjs`, `tests/i18n.test.mjs`. Baca dan pilih yang benar-benar terdampak.

## Kriteria penerimaan

- Setiap kontrol lama punya tempat yang jelas; tidak ada fitur yang hilang atau muncul ganda tanpa kebutuhan navigasi.
- Label Indonesia/Inggris konsisten, terjemahan tidak menyentuh isi buku, fokus keyboard dan nama aksesibel dipertahankan.
- Tema terang/gelap/sistem, preset lain dan Kustom tetap berfungsi. Editor kustom jelas dan tidak menumpuk dengan kelompok lain.
- Form/picker tidak kehilangan nilai/fokus karena rerender; tab tetap memakai satu lensa noninteraktif sesuai arsitektur yang ada.
- Pada 320×568 dan 390×844 tidak ada overflow horizontal; landscape 667×375 dan desktop 1280×800 tetap dapat dipakai. Header/aksi penting terlihat dan sheet memiliki satu area scroll bila diperlukan.
- Sheet singkat dipadatkan, tetapi jangan memotong kontrol atau memaksa seluruh pengaturan panjang tanpa scroll. RSVP fokus dan manuskrip tidak diubah.
- Default/key preferensi, reset, persistence, backup, posisi baca, Publisher/Advanced, toast bersama dan loading lama tetap berfungsi.
- Build helper, typecheck/check dan tes terarah yang diperlukan lulus. Uji browser memakai fixture lokal. Jangan mengklaim QA HP fisik jika belum dilakukan.

## Template penugasan koordinator

```text
Peran dan skill: <satu dari empat skill pelaksana>
Fase/otorisasi pengguna: <audit atau implementasi; kutip lingkup terbaru secara singkat>
Tujuan konkret: <hasil yang dapat ditinjau>
Konteks: baca brief dan file yang relevan pada HEAD aktual
Berkas yang boleh ditulis: <daftar eksplisit>
Berkas/kontrak yang harus dipertahankan: <batas spesifik>
Dependensi: <hasil audit atau kontrak yang sudah siap>
Kriteria selesai: <perubahan dan pemeriksaan singkat>
Laporan: file, perubahan, cek/bukti, risiko dan blocker
Larangan operasional: tidak push/build APK/publikasi; laporkan kebutuhan integrasi ke koordinator
```
