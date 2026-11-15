# Empat koleksi ikon — web

**Pengaturan → Lanjutan → Ikon & Loading → Ikon** kini berisi empat paket terpisah:

| Nama tampilan | Preferensi tersimpan | Asal dan varian |
| --- | --- | --- |
| Rounded KataKecil | `katakecil` | Klasik solid/dua nada yang sudah ada |
| Lucide | `lucide` | Outline resmi yang sudah ada |
| Lentera | `katakecil-new` | ZIP pengguna sebelumnya: 52 outline dan 52 solid asli |
| Lembar | `katakecil-lembar` | ZIP baru: 52 outline asli, dilengkapi 52 solid buatan baru |

Lentera adalah nama baru untuk pilihan yang dahulu berlabel KataKecil baru. ID dan seluruh 104 SVG sumbernya tetap; pilihan pengguna tidak hilang. Lembar ditambahkan sebagai koleksi keempat, bukan menggantikan koleksi lain. Pilih card lalu **Gunakan** untuk menerapkan. **Lembar kini menjadi default** bila belum ada pilihan valid tersimpan; pilihan pengguna yang sudah valid tetap digunakan. [Perbaikan outline dan tata letak glow](lembar-default-glow-web.md).

Lentera/Lembar memakai outline saat normal, solid saat ditekan atau pilihan aktif. State mengikuti mouse, sentuhan, keyboard dan atribut/class pilihan yang dipakai kontrol aplikasi. Hover saja tidak mengubah state. Setelah pelepasan atau cancel, ikon kembali mengikuti status pilihan; disabled dan reduced motion tetap ditangani. Dua varian memakai satu SVG dan ukuran yang sama. Preferensi/backup menerima keempat ID.

## SVG Lembar

Outline berasal dari `katakecil-icons _1_.zip`, termasuk elemen ellipse pada globe. Play, pause dan kutipan diperbaiki menjadi garis tanpa isi saat normal; detail kecil seperti pupil dan titik informasi tetap berisi sesuai maknanya. Solid dibuat dari geometri sumber: badan diisi, detail seperti jarum jam, lipatan halaman, pupil, tanda informasi dan lubang kunci dijadikan potongan transparan, sementara garis terbuka menjadi bentuk tertutup rounded. Tidak menggunakan raster, warna latar tiruan, ID/mask bersama atau dependensi jaringan. Semua 52 bentuk solid berada dalam viewBox 24×24.

Sumber: `dist/assets/icons/katakecil-lembar/{outline,solid}`. Generator runtime `scripts/generate-katakecil-new-icons.mjs` memvalidasi dan membangun dua koleksi berpasangan saat `npm run build`. Helper authoring opsional `scripts/create-lembar-solid.py` menggunakan fonttools/skia-pathops untuk operasi bentuk; tidak dijalankan build normal dan tidak diperlukan di aplikasi.

ZIP unduhan lokal: `/workspace/scratch/KataKecil-Lembar-outline-solid.zip`, berisi `icons/`, `icons-solid/`, `preview.html` mandiri dan README. Preview juga dapat dibuka dari `/workspace/scratch/katakecil-lembar-preview.html`.

## Pemeriksaan singkat

Build, typecheck/check dan **26 tes terarah** lulus; sesudah detail slider solid dirapikan, lima tes paket ikon dijalankan ulang dan lulus. Tes membandingkan kedua koleksi dengan SVG sumber serta memeriksa empat ID, backup, kandidat/Gunakan, renderer/preview dan splash yang sudah ada.

Chromium dengan katalog/episode fixture memeriksa keempat pilihan, simpan/reload, perubahan paket antartab tanpa mengganti teks/posisi reader, tema aktif, mouse down/up, sentuhan/cancel, Enter, disabled dan reduced motion. Layout 320×568/390×844/667×375 tanpa overflow horizontal, paling banyak satu area scroll dan tombol Gunakan terjangkau. Contact sheet serta preview final 104 SVG Lembar diperiksa visual. [Hasil terstruktur](generated/icon-collections-web.json).

Web saja; tidak membangun APK atau mengubah splash pemulihan 1.2.8. Tidak menjalankan suite penuh, backend produksi, emulator atau HP fisik.
