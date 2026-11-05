# Rencana ikon, motion, slider baca, dan branding KataKecil

Tanggal: 5 November 2026. Baseline: `f20004be6ad753eb073c5e7282f9f9d36aca5c9f`.
Status: rencana disetujui dan diimplementasikan. Lihat [hasil implementasi dan pemeriksaan](ui-motion-branding-update.md).

## Arah pembaruan

Pertahankan header Library/Settings, gap yang sudah disukai, kaca Preview 2, susunan menu, dan kenyamanan reader. Tambahkan motion singkat yang menjelaskan tindakan pengguna. Branding utama ditempatkan di About dan loading.

“Slider reading” diasumsikan sebagai slider progres/halaman di footer reader: halaman harus ikut berubah ketika slider diseret. Preview slider Typography/Layout yang sudah berjalan tetap dipertahankan.

## Audit UI saat ini

Audit source meliputi delapan modul yang merender/mengendalikan UI (`ui`, `app`, `reader-experience`, `app-popups`, `app-updates`, `glass-tabs`, `panel-layout`, `i18n`), stylesheet bersama, entry web, README, serta resource ikon/splash Android. Ini merupakan audit implementasi; tidak menjalankan QA perangkat atau suite besar pada tahap rencana.

| Area | Temuan | Tindakan yang direkomendasikan |
| --- | --- | --- |
| Ikon bersama | 47 definisi SVG; 31 nama literal dipakai, tanpa nama literal yang kehilangan definisi. Stroke rounded sudah menjadi dasar yang konsisten. | Rapikan keluarga ikon dan state, prioritaskan ikon tab dan toolbar. Pertahankan ukuran tombol sentuh. |
| Contents / Highlights / Notes / Bookmarks | Lensa tab mengikuti klik dan drag, tetapi ikon belum memiliki motion aktivasi khusus. | Aktivasi singkat pada ikon terpilih; lensa tetap satu dan label tidak diduplikasi. |
| Text / Layout / Theme dan Serif / Sans | Segmented control memakai pengendali lensa yang sama. | Gunakan pola motion yang sama, dengan intensitas lebih kecil pada segmented font. |
| Motion lensa | JS menghitung velocity/stretch; stylesheet Preview 2 saat ini terutama memakai translasi. | Bila ditambahkan kembali, stretch cukup kecil dan hanya selama drag; gaya kaca tetap kalem. |
| Pergantian isi tab | Kontainer dan header sudah dipertahankan; isi panel diperbarui langsung. | Fade dan geser pendek pada isi, tanpa membuka ulang sheet. |
| Dialog / bottom sheet | Overlay fade dan sheet masuk sudah ada; `closeOverlay()` langsung mengosongkan DOM. | Samakan animasi masuk/keluar. Hapus elemen setelah animasi keluar selesai, sambil menangani interupsi dan fokus. |
| Picker warna / pilihan | Struktur terpisah dari `.dialog`; pola transisinya belum seragam. | Pakai bahasa motion yang sama dan pertahankan keyboard tidak otomatis terbuka. |
| Progres reader | Event `input` hanya mengganti page counter; `change` baru memanggil navigasi halaman. | Scrub langsung mengubah halaman yang terlihat dan persentase. Commit posisi ketika gesture selesai. |
| Slider Appearance | Preview berjalan dengan input asli tetap terpasang dan selesai saat dilepas. | Pertahankan perilaku ini; jangan menambah timer atau memindahkan input ketika digeser. |
| Library / Settings | Header dan gap sudah sesuai preferensi pengguna. Tidak ada bottom navigation permanen. | Pertahankan geometri dan navigasinya. Tidak menaruh branding kembali di header. |
| Refresh dan tombol aksi | Ada press state dan rotasi singkat refresh; animasi belum seluruhnya mengikuti status operasi. | Refresh berputar selama permintaan berlangsung; bookmark, play/pause, dan tombol pilihan memberi feedback satu kali. |
| Reading canvas / gestures | Pagination, pinch menu, zoom lokal dan highlight aplikasi sudah tersedia. | Pertahankan. Motion panel tidak boleh menggerakkan kanvas ketika pengguna sedang menyeleksi atau menulis. |
| TTS / search / annotations | TTS sudah memakai paragraf; search, bookmark, highlight, notes memiliki UI tersendiri. | Rapikan ikon/status saja pada pembaruan ini; pertahankan logic dan penyimpanannya. |
| About | Sudah memiliki versi, platform, GitHub dan lisensi; belum menampilkan logo baru. | Tambahkan wordmark dan deskripsi singkat di bagian awal About. |
| Opening / preparing pages | Sudah memakai halaman loading, tanpa toast pembukaan buku. Belum memiliki branding. | Wordmark transparan, spinner kecil, dan status aktual. Tetap satu status yang jelas. |
| Aset branding | Logo lama berada di aset web, referensi favicon/apple-touch, helper logo, README, launcher dan splash Android. | Ganti seluruh referensi dan siapkan aset sesuai ukuran pemakaian. |
| CSS historis | `iconSettle` masih terkait bottom tab lama yang tidak dirender. | Pindahkan aturan motion yang relevan ke tab aktif yang benar; bersihkan selector usang yang sudah terverifikasi. |

## 1. Ikon dan motion tab

- Tetap gunakan SVG ringan dengan ujung rounded, bobot sekitar 2–2.2, dan ukuran visual yang seragam.
- Contents: garis daftar bergerak singkat saat aktif.
- Highlights: gerak penanda pendek; Notes: stroke pena pendek; Bookmarks: ribbon mengisi atau settle ringan.
- Text, Layout dan Theme: gerak kecil yang sesuai glyph, sekitar 140–180 ms.
- Motion berjalan sekali ketika pilihan berubah, bukan setiap render, pergantian bahasa, atau update angka.
- Isi tab memakai fade dan perpindahan sekitar 6–10 px selama 160–200 ms. Header dan tab tetap di tempat; state, scroll dan fokus dikendalikan sesuai panel.
- Drag lensa tetap mengikuti jari. Tidak menambah pengendali gesture kedua.
- Refresh mengikuti status jaringan; play/pause dan bookmark mengikuti state sebenarnya. Hindari animasi dekoratif terus-menerus saat membaca.

## 2. Buka/tutup bottom sheet

- Masuk: geser dari bawah dan fade backdrop, sekitar 220–260 ms.
- Keluar: gerak kebalikannya, sekitar 160–200 ms.
- Samakan dialog, picker pilihan, color wheel, serta popup Custom theme.
- Pertahankan ketentuan konten maksimal setengah layar, header di luar jatah konten, scroll konten saja, safe area, dan posisi di atas keyboard.
- Gunakan completion/cancellation animasi untuk cleanup. Callback penutupan sheet lama tidak boleh menghapus sheet baru.
- Back, Escape, tap backdrop dan tombol tutup menghasilkan alur yang sama serta mengembalikan fokus dengan aman.
- `prefers-reduced-motion` mematikan gerak dekoratif. Fokus editor, drag slider dan color wheel tidak boleh terganggu animasi.

## 3. Slider progres yang benar-benar mengikuti jari

1. Awal drag menyimpan posisi awal dan menghentikan TTS satu kali bila sedang aktif.
2. Setiap perubahan slider memilih halaman dari pagination yang sudah tersedia. Render dibatasi ke satu update per animation frame agar responsif.
3. Halaman, nomor halaman, dan persentase bergerak bersama; node slider tidak diganti.
4. Selama drag, hindari animasi page-turn berulang agar halaman tidak berkedip.
5. Saat dilepas, langsung tetapkan posisi terakhir dan simpan progres. Jangan menunggu timer, animation-end, atau reflow baru.
6. Hindari penulisan penyimpanan pada setiap frame. Tangani event `change` berikutnya agar tidak menyimpan/navigasi dua kali.
7. Escape/pointercancel mengembalikan posisi sebelum drag; tombol keyboard mendapat perilaku navigasi yang konsisten.
8. Pagehide/refresh tetap menyimpan posisi yang semestinya dan memakai resume yang sudah ada. Book ID, anchor dan progres cerita lain tetap terpisah.

## 4. Logo baru dan tempat branding

Sumber pengguna: `1279096.jpg`, 1280 × 1280, RGB tanpa alpha. Bentuk wordmark huruf kecil dan tanda kutip menjadi identitas baru.

Aset yang disiapkan pada implementasi:

- Wordmark transparan, dipotong rapi dari bidang kosong, dengan bentuk huruf/tanda kutip dipertahankan. Tidak mengetik ulang logo memakai font pengganti.
- Versi hijau untuk latar terang dan krem untuk latar gelap agar tetap terbaca setelah background dihapus.
- Rekomendasi ikon kecil: gunakan tanda kutip dari logo yang sama dalam bidang hijau. Wordmark lengkap dipakai di About dan loading; versi ikon ini perlu ditinjau sebelum dijadikan launcher final.
- Ukuran favicon, apple-touch, launcher/adaptive icon dan splash disiapkan sesuai mask/safe area masing-masing. Jangan sekadar memasukkan wordmark lebar ke aset launcher lama.

Penempatan:

- **About app:** wordmark di bagian atas, diikuti deskripsi singkat dan informasi versi yang sudah ada.
- **Loading:** wordmark transparan di atas spinner kecil dan status Opening book / Preparing pages. Logo tidak memakai kotak hijau bawaan gambar.
- **Favicon, ikon/splash Android dan README:** mengikuti aset baru, sehingga logo lama tidak tertinggal di permukaan lain.
- **Header Library dan Settings:** pertahankan persis susunan yang sekarang. Branding tidak ditambahkan ke area membaca.

Aset dan resource Android ikut diperbarui dalam source. Ikon pada APK yang sudah terpasang baru berubah setelah APK baru dibangun dan dipasang; rilis Preview 2 lama tetap artefak historis.

## 5. Urutan implementasi

1. Siapkan wordmark transparan, varian terang/gelap, dan contoh ikon kecil; periksa bentuk dan keterbacaannya.
2. Rapikan ikon tab serta token/durasi motion bersama.
3. Terapkan transisi isi tab dan lifecycle buka/tutup sheet tanpa mengganti gesture yang sudah bekerja.
4. Ubah slider progres menjadi scrub langsung, dengan commit yang aman.
5. Pasang branding di About/loading, lalu perbarui favicon, README dan resource Android.
6. Jalankan pemeriksaan singkat, siapkan source dan ringkasan perubahan. QA lanjutan diserahkan ke pengguna.

File utama yang diperkirakan terpengaruh: `dist/ui.js`, `dist/glass-tabs.js`, `dist/panel-layout.js`, `dist/app.js`, `dist/reader-experience.js`, `dist/app-popups.js`, stylesheet terkait, `dist/assets/`, `dist/index.html`, `README.md`, dan resource launcher/splash di `android/app/src/main/res/`.

## Pemeriksaan singkat dan tugas QA pengguna

Pemeriksaan implementasi dibatasi pada build/typecheck/check, regression test yang terkait tab/sheet/slider, serta satu alur Chromium: pindah tab, buka/tutup cepat, scrub halaman, dan cek branding. Tidak merencanakan matriks perangkat besar.

Pengguna menguji di HP:

- Seret lensa tab dan pindah tab berulang; ikon/isi bergerak halus dan sheet tetap terpasang.
- Buka/tutup sheet cepat, termasuk Back dan keyboard; tidak ada fokus yang direbut atau sheet yang tersangkut.
- Geser progres perlahan/cepat, lepas, lalu refresh; halaman yang terlihat dan posisi tersimpan harus sesuai.
- Cek logo pada tema terang/gelap, About, loading, dan launcher setelah APK baru dipasang.

Tetap dipertahankan sepanjang pembaruan: TTS per paragraf, highlight/notes, input keyboard stabil, color wheel, accordion auto-reveal, copy/zoom policy, resume reader, sumber buku dan otorisasi yang sudah berlaku. Tidak merencanakan perubahan database atau data konten.
