# Audit UI menyeluruh dan konsistensi Liquid Glass

Audit awal dilakukan pada commit `f60c705`, sebelum perubahan visual berikutnya. Instruksi pemilik meminta inventaris ditampilkan terlebih dahulu, kemudian implementasi. Daftar awal sudah ditampilkan dalam percakapan sebelum perubahan kode. Audit memindai 33 file aplikasi; 8 file menghasilkan markup/kontrol. Tidak ada JSX/TSX atau migrasi framework.

Renderers: `dist/app.js`, `dist/reader-experience.js`, `dist/app-popups.js`, `dist/app-updates.js`, `dist/glass-tabs.js`, `dist/text-selection.js`, `dist/ui.js`, serta entry `dist/index.html`. Stylesheets: `styles.css`, `advanced-reader.css`, `app-popups.css`, `glass.css`, dan definisi font. TypeScript di `src/reader/` dan `src/platform/` merupakan helper data/reader/perangkat; bundle yang dihasilkan tidak diedit sebagai source. Daftar file lengkap tersedia dalam [bukti terstruktur](generated/ui-glass-audit-validation.json).

## Tahap 1 — inventaris sebelum perubahan

| Tampilan | Temuan awal | Penanganan |
| --- | --- | --- |
| Library header/refresh/Settings | Ikon berkaca, header masih polos | Header menjadi panel bersama; geometri tetap responsif |
| Carousel, sampul, navigasi buku | Sampul utuh; navigasi masih campuran | Navigasi berkaca; sampul/object-fit dipertahankan |
| Loading/kosong/error Library | Skeleton memakai warna pekat | Skeleton dan empty-state root mengikuti kaca |
| Settings header | Polos | Panel utama, sejajar kartu Settings |
| Settings surfaces | Kaca sudah ada; aturan lama tersebar | Satu aturan paint yang mengalahkan aturan lama saat tema aktif |
| Tema global/Custom | Chip belum seragam; tint Custom panel 42% | Kontrol bersama, tint Custom 34%; sampel warna tetap akurat |
| Appearance Text/Layout/Theme | Lensa/drag sudah berfungsi | Dipertahankan |
| Preview slider | Satu permukaan dan release langsung berfungsi | Node/koordinat/mekanisme dipertahankan |
| Bidang baca dan sampul | Solid sebagai konten | Dipertahankan untuk keterbacaan/akurasi gambar |
| Reader toolbar/footer | Panel kaca; beberapa ikon berbeda | Kontrol anak satu standar |
| Contents/Highlights/Notes/Bookmarks | Lensa ada; baris/isi daftar datar | Baris/kartu layer 2 tanpa blur sendiri |
| Highlight, notes, bookmark CRUD | Panel kaca; kutipan/input/tombol campuran | Kutipan, field, aksi dan handle memakai rim konsisten |
| Reading Tools/page jump | Beberapa kontrol sudah kaca | Input angka, tombol dan kartu Tools disamakan |
| Search/results/floating navigation | Panel kaca; beberapa row/ikon datar | Row dan kontrol bersama |
| Dictionary/translation | Panel kaca; hasil belum berupa kartu konsisten | Area hasil/kutipan/kontrol layer 2 |
| TTS settings/player/mini-player | Root kaca; beberapa ikon datar | Tombol dan field seragam; audio tidak diubah |
| Selection popover | Root kaca; note/word-tools campuran | Kontrol anak sama; warna highlight/area hit tetap |
| Option/color picker | Root kaca; opsi/hex/Apply campuran | Seluruh kontrol picker seragam |
| EPUB import | Upload zone datar | Kontrol cembung dan state drop aktif |
| Backup preview/restore | Checkbox native, aksi campuran | Switch kaca; merge/storage tidak diubah |
| Device storage | `.status-details` memakai `var(--bg)` | Kartu transparan dan wrapping ID |
| Licenses | Teks panjang di panel kaca | Keterbacaan/wrapping tetap |
| App updates | Root kaca; tombol/progres belum seragam | Kontrol/progres bersama; updater tidak diubah |
| Toast | `#28382fee`, sekitar 93% alpha | Root kaca sesuai palet, tint 20–34% |
| Reader loading | `var(--paper)` pekat | Overlay kaca; canvas bacaan tetap solid |
| Empty/error/loading text | Bergantung parent; tidak semuanya membutuhkan kartu | Hindari menggandakan panel untuk setiap label |
| OS/browser-owned prompts | File picker, permission, installer | Tetap memakai otorisasi/alur sistem |

| Kontrol | Temuan/keputusan |
| --- | --- |
| Icon buttons | Semua kelompok kini memakai bevel, bukan hanya header/close |
| Primary/read CTA/Apply picker | Dasar aksen pekat/cakupan berbeda diganti tint aksen 30% dan ink palet |
| Secondary/back/comfort reset | Satu gradient/border/rim/state tekan |
| Input teks/search/angka/textarea/hex | Layer 2; tidak memiliki blur sendiri |
| Native select fallback dan trigger picker | Style seragam; native controls yang disembunyikan tetap tersembunyi |
| Opsi picker dan kartu tema | Tint/rim/state aktif sama; pilihan tema bukan tab navigasi |
| Range/progress | Paint track/thumb/bar mengikuti tema; node dan value handling tetap |
| Checkbox/switch | Appearance dan backup satu bentuk; checked state tetap native |
| TOC/search/saved passage | Kartu/baris inset dengan shadow luar ringan agar tidak ramai |
| Quotes/lookup/status/release notes | Layer 2 tanpa blur; preview warna bukan kartu kontrol |
| Text actions/license/note/passage actions | Bevel bersama; struktur/handler dipertahankan |
| Selection handles | Hanya paint knob; area hit dan offset tidak diubah |
| Color swatches/theme samples | Warna asli dipertahankan, rim ditambahkan |
| Highlight/search/TTS marks | Semantik posisi teks, bukan panel; tidak diblur |
| Carousel dots | Indikator posisi buku, bukan tab panel; tidak ditambah sistem lensa baru |

### Bocoran dan konflik yang ditemukan

1. Toast dan detail perangkat memakai latar pekat efektif; reader loading dan skeleton juga belum mengikuti panel kaca.
2. Primary pada dialog/CTA memakai gradient di atas warna aksen solid, sementara Apply picker tidak masuk cakupan yang sama.
3. Banyak icon buttons, row daftar, hex input, switch dan rail slider belum mengikuti aturan kontrol bersama.
4. Aturan gelap `body[data-theme=dark]` pada stylesheet lama memiliki specificity lebih tinggi daripada sebagian aturan kaca baru. Aturan aktif kini diberi qualifier tema sehingga bevel tidak tertimpa.
5. Tidak semua deklarasi pekat di stylesheet lama merupakan bocoran aktif: sebagian sudah tertimpa atau merupakan fallback/selector bottom-tab lama yang tidak dirender. Bottom navigation lama tidak dihidupkan kembali.
6. Struktur picker merupakan saudara modal, bukan anak modal. Backdrop layar penuh sudah tidak diblur. Kontrol biasa kini eksplisit `backdrop-filter:none`; pseudo-element optik tepi lensa merupakan pengecualian lokal yang sengaja melihat ikon di bawahnya.
7. Semua tab nyata sudah memiliki `.liquid-tabs` dan satu `.glass-tab-lens`: Appearance, panel buku dan segmented font. Tidak dibuat pengendali kedua.
8. Custom panel menggunakan 42% pada tahap sebelumnya; sekarang panel/fill Custom memakai `color-mix(... var(--paper) 34%, transparent)`.
9. Temuan tambahan saat QA: constraint validation input lompat halaman masih dapat membuka bubble browser. Event `invalid` di dalam panel kini menampilkan toast aplikasi. HTML constraints tetap memblokir submit yang tidak valid; tidak memakai `novalidate` atau melewati pemeriksaan range.

## Tahap 2 — implementasi tiga lapis

`dist/glass.css` kini memuat fondasi panel dan kontrol yang terpadu, bukan menambah blur pada setiap anak.

- Layer 1: panel, header, navigasi buku, picker, toast, loading dan empty-state root memakai tint 20–34%, blur 50px, saturasi 260%, brightness 1.08, contrast 1.06, hotspot/caustic, bevel empat sisi dan inner glow. Selector berkualifikasi tema menangani cascade gelap.
- Layer 2: kontrol/card inset memakai specular gradient, border/rim, tint lebih rendah dan `backdrop-filter:none`. Toolbar reader dan disclosure interaktif juga menggunakan fondasi kontrol; tombol menu tersembunyi tetap mengikuti visibilitas aslinya. Tombol menekan pada scale .972 dengan easing yang diminta. Row daftar mengurangi shadow luar; swatch dan sample tidak ditint ulang. Range/switch/progress memakai paint konsisten tanpa mengganti elemen atau value handling.
- Layer 3: pengendali drag, velocity stretch, satu lensa, pusat bening dan blur/displacement di tepi dipertahankan. Track z=0, tombol z=1 dan lensa z=3; fokus keyboard boleh naik ke z=4 agar outline terlihat. Tidak ada lensa/label/handler ganda.

File kode: `dist/glass.css`, cache entry `dist/index.html` (`glass.css?v=4`, `app.js?v=17`), serta handler feedback validasi di `dist/app.js`. Regresi input angka ditambahkan ke pengujian reader existing. Tidak ada dependensi baru, perubahan naskah, database, endpoint, publikasi buku, default reader atau arsitektur.

## Tahap 3 — fungsi dan batas desain

`.appearance-peeking`, transparansi dialog saat preview, `.reader-peek-control::before`, input asli dan release langsung dipertahankan. Dukungan dark/Custom, prefix WebKit, fallback blur/mask dan reduced motion tetap ada.

Pengecualian yang disengaja: bidang baca, sampul, contoh tema/warna, semantic highlight/selection/progress indicators serta knob kontrol tetap menunjukkan data secara akurat. Fill panel rendah tidak melarang kilau putih pada rim. Fallback tanpa backdrop memakai permukaan solid agar terbaca. Native file/permission/installer bukan elemen web dan tidak diganti tampilannya.

## Verifikasi

- Full suite: **72 passed, 0 failed**, termasuk invalid page-jump yang tetap tidak berpindah halaman dan menggunakan toast aplikasi.
- Typecheck serta check sintaks/publication/module graph lulus; build helper dijalankan oleh `npm test`.
- Audit Chromium: **20 konteks aplikasi asli**, light/dark/Custom, **8 ukuran portrait/landscape**, tint panel/child dan tidak ada ancestor blur bertumpuk pada kontrol biasa. Sampul tetap contain dan elemen Library penting berada dalam viewport.
- Tambahan **12 konteks UI**: bookmark, form label, seleksi teks nyata/popover, notes CRUD, preview backup/switch, serta UI TTS/updater dengan renderer asli dan driver/API injeksi. Native audio/instalasi tidak diklaim diuji.
- Drag tab, geometri/responsivitas dan matriks slider diverifikasi terpisah sebelum deployment; bukti final ada pada [JSON validasi](generated/ui-glass-audit-validation.json).

Tidak ada QA Safari/iPhone/Android fisik atau benchmark FPS/kontras seluruh kemungkinan gambar di belakang kaca. Pemeriksaan ancestor blur pada Chromium memverifikasi arsitektur layer, bukan klaim membuktikan seluruh compositor WebKit.

Pembaruan ini menargetkan web; APK Preview 2 tetap artefak historis dari commit rilisnya. Rollback web dengan revert commit audit/konsistensi dan redeploy. Tidak memerlukan migrasi data atau uninstall.
