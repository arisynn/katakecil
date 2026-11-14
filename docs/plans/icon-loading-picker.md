# Ikon & Loading — kontrak implementasi web

Pengguna menyetujui penggantian menu Loading preview menjadi pemilihan **Ikon & Loading**. Tahap ini memperbarui source web dan dipush ke main; versi aplikasi tetap 1.2.5/build 13, tanpa build atau publikasi APK.

Status: **selesai dan lulus pemeriksaan terarah**. Dua worker menyelesaikan renderer/aset serta controller/persistensi, lalu pemeriksaan browser dan koreksi keyboard. [Hasil implementasi dan uji](../icon-loading-picker.md).

## Pilihan dan perilaku

- Tab Ikon: **Rounded KataKecil** (`katakecil`, default) dan **Lucide** (`lucide`). Paket berlaku ke semua ikon antarmuka dari helper bersama; logo/wordmark utama tetap.
- Tab Loading: **wordmark lama** (`wordmark`, default), **denyut lembut** (`pulse`) dan **titik-titik** (`dots`). Loading memakai artwork/gaya lokal yang menghormati reduced motion.
- Memilih kandidat menampilkan preview; hanya **Gunakan** yang menyimpan pilihan. **Coba** mereset preview loading setempat tanpa menyimpan atau menunda pemuatan buku.
- Pilihan disimpan dalam preferensi perangkat, disinkronkan antartab, disertakan dalam backup dan dipertahankan saat reset kenyamanan membaca. Backup lama tetap dapat diimpor.
- Default tetap sama untuk pengguna lama. Isi buku, pagination, posisi baca, WPM, TTS, tema serta kaca/ambient tidak diubah.

## Pembagian dua worker

| Pemilik | File/lingkup |
| --- | --- |
| Renderer/aset | `dist/ui.js`, `dist/loading-logo.js`, `dist/loading-logo.css`, `dist/visual-preferences.js`, aset/vendor Lucide, dependency/lockfile, generator/build script dan atribusi |
| Controller/persistensi/integrasi | `dist/loading-previews.js/.css`, `dist/store.js`, `src/platform/backup.ts`, `dist/app.js`, `dist/i18n.js`, `dist/index.html`, URL cache terkait dan tes preferensi/controller |
| Koordinator | Kontrak, review hasil, pemeriksaan terarah, dokumentasi dan push |

File tidak ditulis dua worker sekaligus. Build/test dijalankan setelah renderer/vendor dan controller mencapai handoff agar generator serta bundle tidak berubah saat pemeriksaan.

## API bersama

`visual-preferences.js` mengekspor `VISUAL_DEFAULTS` dan `normalizeVisualPreferences(input)`. Hanya dua enum diterima: `iconPack=katakecil|lucide`, `loadingStyle=wordmark|pulse|dots`; nilai lokal yang tidak dikenal kembali ke default. Backup menolak nilai/tipe salah sebelum penulisan.

`icon(name, cls='', pack?)` mempertahankan semua key lama. Argumen paket eksplisit menghasilkan preview bertanda `data-icon-preview`; `applyIconPack(pack, root)` mengubah ikon aktif tanpa mengganti node kontrol/form dan tidak menyentuh preview paket lain. Ikon baru memakai pilihan aktif. SVG Lucide berasal dari paket resmi, dipilih seperlunya, disertakan lokal dengan versi dan lisensi yang dipertahankan.

`loadingLogo(style?)` tanpa argumen menghasilkan loader aktif; argumen gaya eksplisit menghasilkan preview. `applyLoadingStyle(style, root)` hanya memperbarui loader aktif yang gayanya berubah. Pilihan tersimpan dibaca aman pada inisialisasi modul untuk loading awal, tanpa import Store yang menyebabkan siklus.

## Pemeriksaan penerimaan

1. Pengguna lama tetap memakai Rounded KataKecil dan wordmark lama. Kandidat yang tidak diterapkan tidak mengubah pilihan aktif, termasuk setelah tutup/buka.
2. Gunakan menerapkan paket/gaya yang benar, badge dan preview tetap konsisten; tab serta node form tidak diganti untuk perubahan ikon.
3. Lucide dan Rounded tampil berbeda, semua key terpetakan, preview paket tetap berbeda setelah global switch, dan tidak ada permintaan CDN.
4. Loading terpilih dipakai oleh Library/reader dan layar awal web aplikasi; preview tidak menunda proses nyata. Reduced motion serta penghentian animasi loader tersembunyi tetap bekerja.
5. Reload, antartab, backup roundtrip/validasi dan reset kenyamanan mempertahankan perilaku yang diharapkan. Perubahan ikon/loading tidak memicu reflow atau menggeser posisi baca.
6. Dua bahasa, fokus/keyboard, satu lensa tab, satu area scroll dan viewport HP pendek/landscape diperiksa secukupnya. Tidak memakai backend produksi atau klaim uji HP fisik.

Tidak menjalankan suite penuh, build Android atau perubahan backend untuk tahap ini. Tes baru dibatasi pada kontrak preferensi/persistensi dan preview-versus-commit yang mempunyai perilaku nyata.
