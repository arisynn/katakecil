# Audit struktur Pengaturan, reader dan tema

Audit statis pada HEAD `167af437778c1f258456f5e905b16dd359fb5f63` (1.2.4/build 12), setelah instruksi pengguna “Lanjutkan implementasi”. Peran: `katakecil-ui-audit`. Runtime tidak diedit. Audit ini membaca kode dan CSS; belum mengklaim observasi browser atau HP.

## Temuan dan keputusan yang disarankan

| Dampak | Lokasi | Temuan nyata dalam struktur sekarang | Tindakan |
| --- | --- | --- | --- |
| Sedang | `dist/app.js: renderSettings` | About dan App updates berada dalam Advanced, sedangkan Advanced bersarang di section Data dan penyimpanan | Jadikan Pembaruan & tentang section sendiri; Advanced section sejajar dengan kelompok lain |
| Sedang | `renderSettings` | Aksen memakai baris penuh swatch, sementara bahasa/tema/kaca memakai bentuk baris berbeda; nilai kanan/chevron memiliki pola berbeda | Samakan lebar, alignment label/ringkasan dan jarak antarkontrol; pertahankan swatch pada baris sendiri di dalam kelompok Tampilan |
| Sedang | `dist/reader-experience.js: themeControls` | Tujuh pilihan satu grid linear mencampur mode terang/gelap/sistem, nuansa sepia/kertas/hijau dan pintu masuk editor Kustom | Kelompokkan Mode tampilan, Nuansa baca dan Kustom dalam satu implementasi tema bersama |
| Rendah | `appearance('text')` | Font/reset ada di atas, empat range dalam grid, perataan sendiri, serta dua opsi lain di accordion tanpa subkelompok isi | Buat urutan Huruf → Spasi/paragraf → Opsi teks tambahan; beri pemisah/judul ringkas, pertahankan konfirmasi reset |
| Sedang | `appearance('layout')` | Empat select dan empat range mencampur mode halaman, animasi, margin dan brightness; opsi layar ada di accordion terpisah | Susun Halaman → Margin & kolom → Layar & gestur; brightness bersama opsi layar, tanpa mengubah key atau rentang |
| Rendah | `tools()` | Search/RSVP/TTS, navigasi episode dan lompat halaman berurutan tanpa judul pembeda | Kelompokkan Alat bantu dan Navigasi; statistik tetap footer yang ringkas |
| Risiko integrasi | CSS global | `advanced-reader.css` memuat deklarasi awal tema 4 kolom dan override kemudian 2 kolom; `glass.css` dan style global juga mengatur panel/tab | Tambahkan CSS scoped terakhir untuk struktur baru atau ganti bagian khusus secara hati-hati; jangan ubah token kaca bersama |

Header dan satu konten scroll sudah disediakan `.settings-shell/.settings-content` serta `layoutDialog()`. Jangan membuat scroller kedua di kartu atau tiap kelompok. Editor Kustom sudah dialog terpisah dan punya validasi kontras; pertahankan alurnya, bukan membuat editor kedua.

## Inventaris Pengaturan utama

| Kontrol sekarang | Selector/aksi | Key atau perilaku | Kelompok usulan |
| --- | --- | --- | --- |
| Bahasa aplikasi | `#app-language` | `uiLanguage` | Tampilan & bahasa |
| Tema global | `.global-theme-link`, `global-theme`, `#global-theme-summary` | Membuka `features.themeDialog()` bersama | Tampilan & bahasa |
| Liquid Glass | `glass-settings`, `#glass-summary` | `glassTransparency/glassBlur/ambientIntensity` via sheet yang ada | Tampilan & bahasa |
| Aksen preset/kustom | `accent`, `#accent-custom` | `accentColor` | Tampilan & bahasa |
| Serif/Sans | `font` | `fontFamily` | Preferensi membaca |
| Ukuran teks | `#settings-font-size`, `#font-size-output` | `fontSize` | Preferensi membaca |
| Simpan backup | `backup-export` | Ekspor data yang ada | Data & penyimpanan |
| Pulihkan backup | `backup-import` | Preview/pemulihan yang ada | Data & penyimpanan |
| Ekspor catatan | `export-notes` | Ekspor yang ada | Data & penyimpanan |
| Penyimpanan perangkat | `status` | Dialog status yang ada | Data & penyimpanan |
| Tentang aplikasi | `about` | APP_INFO, versi tetap | Pembaruan & tentang |
| Pembaruan aplikasi | `updates`, `#app-update-summary` | Hanya dirender ketika `isNativeApp` | Pembaruan & tentang |
| Publisher | `publisher` | Alur Publisher yang ada | Advanced/Lanjutan |
| Impor EPUB perangkat | `import` | Import pribadi yang ada | Advanced/Lanjutan |
| Kelola EPUB pribadi | `local-manager` | Cover/hapus buku lokal | Advanced/Lanjutan |
| Pratinjau loading | `loading-previews` | Preview yang ada | Advanced/Lanjutan |

Urutan section: **Tampilan & bahasa → Preferensi membaca → Data & penyimpanan → Pembaruan & tentang → Advanced**. Tentang tetap terlihat di web; Pembaruan tetap kondisional Android. Pertahankan `.advanced-settings` dan elemen `details/summary` agar mekanisme reveal yang ada tetap bekerja.

## Inventaris reader

| Kelompok | Kontrol dan key/aksi yang harus dipertahankan |
| --- | --- |
| Teks / Huruf | `fontFamily`, `fontSize`, `fontWeight`; reset `comfort-reset` dengan konfirmasi yang ada |
| Teks / Spasi & paragraf | `lineHeight`, `paragraphSpacing`, `textAlign`; opsi tambahan `letterSpacing`, `paragraphIndent` |
| Tata letak / Halaman | `readingMode`, `spreadMode`, `pageAnimation`, `contentPosition` |
| Tata letak / Margin & kolom | `marginHorizontal`, `marginVertical`, `readerWidth` |
| Tata letak / Layar & gestur | `brightness`, `orientation`, `tapNavigation`, `wakeLock` |
| Tema / Mode tampilan | `app-theme-preset`: `light`, `dark`, `system` |
| Tema / Nuansa baca | `app-theme-preset`: `sepia`, `paper`, `green` |
| Tema / Kustom | `app-theme-preset`: `custom`; dialog lama `#reader-ink`, `#reader-paper`, `#theme-preview`, `#theme-contrast`, `custom-theme-back`, `apply-reader-theme` |
| Alat bantu | `reader-search`, `reader-speed`, `reader-speech` |
| Navigasi | `previous-episode`, `next-episode`, `#page-jump-form`, `#page-jump`; disabled/batas tetap |
| Statistik | `readingStats` untuk episode aktif, jumlah kata dan estimasi menit |
| Daftar isi & anotasi | Tab `contents/highlights/notes/bookmarks`, label/data buku; tetap terpisah dan mudah ditemukan |

Tab Teks/Tata letak/Tema sudah tersedia dan sesuai kebutuhan. Tidak perlu tab atau fitur baru. Tugasnya adalah merapikan isi masing-masing tab.

## Rancangan sheet tema bersama

1. Caption ringkas bahwa tema berlaku pada aplikasi dan reader; pilih bahasa lewat `tr()` yang ada.
2. Label **Mode tampilan** dengan tiga pilihan setara Terang, Gelap, Sistem.
3. Label **Nuansa baca** dengan tiga pilihan setara Sepia, Kertas, Hijau.
4. Baris **Kustom** selebar kelompok yang membuka dialog warna yang sudah tersedia; tidak menambahkan input warna pada grid preset.
5. Check aktif dan `aria-pressed` hanya mengikuti `themeMode` aktual. Klik Kustom tetap membuka editor dahulu; menerapkan warna tetap memerlukan kontras minimal 4,5:1 sebagaimana sebelumnya.

`themeControls()` tetap sumber markup tunggal untuk `themeDialog()` di halaman utama dan tab Tema di reader. Pertahankan `.global-theme-chip`, tujuh nilai `data-value`, `app-theme-preset`, serta logika kembali dari editor (`themeReturn`). Warna aksen dan kaca tetap di Pengaturan utama; jangan menyalin preferensi tersebut ke tab Tema.

## Kontrak dua implementer

- **Agent Pengaturan:** `dist/app.js` untuk `renderSettings` serta integrasi entry point yang diperlukan; CSS khusus Pengaturan. Jangan mengedit reader atau Publisher. Semua ID/data-action inventaris dipertahankan. Integrasi `dist/index.html`, `dist/i18n.js` dan cache version dapat ditugaskan kepadanya secara berurutan setelah implementer reader selesai.
- **Agent reader:** `dist/reader-experience.js` untuk markup appearance/theme/tools dan stylesheet scoped reader/tema. Jangan mengedit `dist/app.js`. Pertahankan `.appearance-field`, `data-reader-pref`, input range asli, `#appearance-body` dan heading/tab yang dipakai preview/transition; jangan menyentuh reflow, anchor, engine RSVP/TTS, nilai default, store atau parser.
- **File bersama:** satu integrator yang ditetapkan koordinator; tidak ada dua penulis simultan. Jangan mengubah `glass-preferences`, `ambient.css`, `toast.css`, palet `display.ts`, backup schema atau versi aplikasi untuk pekerjaan tata letak ini.

## Pemeriksaan yang diserahkan ke reviewer

- Pastikan seluruh kontrol inventaris masih ada, kondisi Android benar, serta tema kedua entry point memakai UI yang sama.
- Periksa 320×568, 390×844, 667×375 dan 1280×800 dalam browser lokal; tidak ada overflow horizontal, kontrol terpotong atau nested scroll yang tidak perlu. Viewport tersebut belum diuji dalam audit statis ini.
- Tema terang/gelap/sistem, satu preset nuansa, Kustom dan kembali; warna/kontras dan ringkasan pilihan tetap benar.
- ID, `data-action`, label for/aria, tab/lensa, focus keyboard dan Back tetap bekerja; teks Indonesia/Inggris tidak menyentuh naskah buku.
- Ubah range tanpa kehilangan DOM/capture, simpan/tutup/buka ulang, reset konfirmasi; posisi baca dan manuskrip tetap terjaga.
- Advanced tetap menyediakan Publisher serta impor/kelola EPUB. Toast dan loading tidak berubah.
- Gunakan tes terarah yang relevan dan build/check/typecheck sesuai integrasi; hindari suite penuh atau build APK pada tahap redesign yang belum meminta release.
