# Ikon outline/solid dari ZIP — web

**Pengaturan → Lanjutan → Ikon & Loading → Ikon → KataKecil baru → Gunakan** menambahkan pilihan ketiga dari ZIP pengguna. Dua pilihan Rounded KataKecil dan Lucide serta default sebelumnya tetap tersedia. Memilih card hanya mengubah kandidat; Gunakan menerapkan pilihan.

Paket memiliki **52 pasangan outline/solid**. Normal dan hover memakai outline. Saat tombol ditekan dengan mouse, sentuhan atau keyboard, pasangan solid tampil. Solid tetap tampil pada pilihan aktif (`aria-pressed`, `aria-selected`, `aria-current`, `aria-expanded`, class active/selected/is-selected dan summary terbuka). Pelepasan/batal tekan kembali mengikuti status pilihan; tombol disabled tidak mendapat state tekan/aktif solid.

Kedua varian berbagi satu SVG, viewBox 24 dan parent tombol yang sama. CSS mengubah opacity dengan transisi 120ms; reduced motion menghapus transisi. Tidak ada penggantian node SVG atau handler saat ditekan. Artwork memakai currentColor sehingga mengikuti tema/aksen. Semua pemakai helper bersama, termasuk Library, Pengaturan, reader dan Publisher, mendapat paket yang dipilih.

SVG sumber asli berada di `dist/assets/icons/katakecil-new/{outline,solid}`. Generator `scripts/generate-katakecil-new-icons.mjs` memeriksa 52 nama/variant, viewport, elemen/atribut dan warna lokal sebelum menghasilkan modul. Pewarisan fill/stroke akar disimpan di grup agar kedua varian tidak terpengaruh stroke global. Tidak memakai HTML preview dari ZIP atau aset jaringan. `npm run build` menjalankan generator. Pilihan `iconPack: katakecil-new` tersimpan antarsesi/antartab dan diterima backup baru; data/default lain tetap.

## Pemeriksaan singkat

Build helper, typecheck dan check module graph lulus. **25 tes terarah** lulus: seluruh 104 SVG dibandingkan dengan sumber, pilihan/candidate/Use, SVG/listener/preview tetap, backup, default dan splash lama. Chromium memakai katalog/episode fixture lokal untuk tiga viewport 320×568/390×844/667×375, picker/reload, perubahan paket antartab tanpa mengganti teks/posisi reader serta pilihan tema aktif.

Cek interaksi meliputi hover, mouse down/up, Enter, toggle aktif/nonaktif, touch cancel, tombol disabled, node/dimensi SVG tetap dan reduced motion. Contact sheet seluruh 52 pasangan diperiksa visual. Tidak ada page error atau jaringan tak terduga pada cakupan uji. [Hasil terstruktur](generated/icon-solid-states-web.json). Screenshot lokal `/workspace/scratch/katakecil-solid-states-{picker,theme-active,pairs}.png`.

Source web saja, tanpa build/release APK baru atau uji HP fisik. APK 1.2.8/build 16 belum memuat paket ini; source baru diperlukan untuk memakai pilihan baru. Tidak menjalankan suite penuh atau backend produksi.

## Coba sendiri

1. Pilih KataKecil baru lalu Gunakan. Tahan tombol untuk melihat solid, lepas dan bandingkan.
2. Di Tema/Tampilan baca, pindah pilihan/tab; pilihan aktif tetap solid.
3. Coba reload dan kembali ke Rounded/Lucide melalui menu yang sama.
