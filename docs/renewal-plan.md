# LuminaGlass — Audit & Rencana Pembaruan MVP

Tanggal: 4 November 2026  
Situs: https://luminaglass-reading-room.saptajulianto80.chatgpt.site  
Baseline: `e07f7a479b04c94887b2c283976b60d3f9a52e2f`, versi publik 1.

## Tujuan

Memusatkan aplikasi pada satu kegiatan: pilih buku dari katalog Supabase, lalu baca dengan nyaman. Tampilan mengikuti kesederhanaan iOS: latar netral, hierarki jelas, kontrol sedikit, dan bottom tab. Upload EPUB tetap tersedia melalui Pengaturan.

Dokumen ini merekam audit sebelum pembaruan. Setelah persetujuan pengguna, Library diimplementasikan sebagai satu carousel horizontal (menggantikan usulan grid), dengan aksen warna yang dapat diganti dan aksi salin teks buku dinonaktifkan. Status implementasi dan validasi terbaru ada di README.md.

## Dasar audit

- Membaca implementasi Library, reader, EPUB parser, penyimpanan lokal, CSS responsif, dan pengujian.
- Memastikan melalui Sites bahwa situs masih publik dan versi aktifnya 1.
- Menjalankan `npm test` dan `npm run check`: empat pengujian otomatis lulus dan pemeriksaan sintaks lulus.
- Memeriksa proyek yang tersedia melalui konektor Supabase dan dokumentasi Storage. Belum ada proyek/bucket yang terhubung ke LuminaGlass. Ada beberapa proyek di akun; tidak memilih atau mengubah proyek tersebut secara otomatis.
- Audit visual dan gesture di browser/perangkat nyata belum dilakukan karena alat browser yang disyaratkan lingkungan tidak tersedia. Pengujian sekarang memakai JSDOM pada viewport desktop; hasilnya tidak membuktikan perilaku Safari, pinch, safe area, atau fullscreen.

## Temuan

| Prioritas | Temuan saat ini | Dampak | Perubahan yang direncanakan |
| --- | --- | --- | --- |
| P0 | Katalog dibaca dari path lokal `/storage/v1/object/public/lumina-library/catalog.json`; EPUB juga berasal dari `/books/`. Loader hanya menerima manifest dengan `prototype: true`. | Alur utama masih demo lokal, belum memenuhi MVP yang mengambil buku dari Supabase sungguhan. | Hubungkan katalog dan berkas EPUB ke satu sumber Supabase yang dikonfigurasi pengelola. |
| P0 | `hud-hidden` hanya mengubah opacity toolbar. Padding reader, margin atas, dan ruang toolbar dalam layout tetap ada. | Menyembunyikan menu tidak membuat buku memenuhi layar. | Pisahkan mode baca penuh dan mode kontrol dengan geometri yang jelas. |
| P0 | Pengukuran halaman memakai perkiraan jumlah karakter. `.reading-page` memakai `min-height`, dan halaman panjang memang boleh memanjang. | Teks bisa membuat halaman reader ikut scroll; kapasitasnya tidak dijamin pas dengan viewport. | Ukur area teks dan pagination berdasarkan font serta ukuran layar yang sebenarnya. |
| P1 | Desktop memakai sidebar; mobile memindahkan navigasi ke atas. | Belum ada bottom tab seperti yang diminta. | Gunakan dua tab: Library dan Pengaturan. |
| P1 | Hero besar, slogan, kutipan, breadcrumb, status perangkat, filter, pilihan layout, dan label metadata tampil bersamaan. | Library terasa seperti dashboard, bukan rak buku yang sederhana. | Tampilkan judul, pencarian, resume kecil bila ada, dan grid buku. |
| P1 | Upload muncul di header, sidebar, dan dialog sumber. | Fitur tambahan bersaing dengan alur utama membaca katalog. | Satukan akses upload di Pengaturan → Lanjutan → Impor EPUB. |
| P1 | Buku selalu dibuka dengan `hudVisible = true`; tap untuk fokus hanya bekerja di area halaman selain teks. | Pengalaman masuk membaca masih penuh kontrol, dan tap pada area utama tidak membuka/menutup menu. | Buka buku dalam mode baca penuh; tap singkat di tengah membuka kontrol, tap preview mengembalikan baca penuh. |
| P1 | Gesture hanya membaca `touches[0]`, tidak ada pengenalan dua jari. | Pinch belum didukung dan berisiko dianggap swipe biasa bila ditambah tanpa pemisahan gesture. | Buat penanganan pinch, tap, swipe, dan seleksi teks secara terpisah. |
| P1 | Tidak ada penggunaan `safe-area-inset-*`; tombol Fullscreen API justru disembunyikan di mobile. | Belum ada jaminan kontrol aman dari notch dan home indicator iPhone. | Bangun reader berbasis viewport dan safe area; Fullscreen API hanya peningkatan opsional. |
| P2 | Perubahan menu dan banyak interaksi mengganti seluruh markup reader lewat `app.innerHTML`. | Memulai animasi dari kondisi yang sama, menjaga fokus, dan mempertahankan seleksi menjadi sulit. | Pertahankan elemen reader; ubah state/CSS untuk membuka menu dan memperbarui bagian yang diperlukan. |
| P2 | Cache buku digabungkan ke katalog dengan prioritas data cache. | Metadata dan isi lama berpotensi menimpa katalog Supabase yang diperbarui. | Jadikan metadata katalog sumber utama; pisahkan cache isi berdasarkan `id` dan versi. |

Referensi utama: `dist/app.js` (`shell`, `hero`, `renderLibrary`, `ensureBook`, `pageCapacity`, `renderReader`, penanganan click/touch, dan `init`); `dist/styles.css`; `dist/epub.js` (`paginate`); `tests/reader.test.mjs`.

## Struktur aplikasi yang baru

### Library

- Halaman awal langsung berupa koleksi buku dari Supabase.
- Header sederhana: “Library” dan pencarian yang ringkas.
- Grid dua kolom di ponsel; jumlah kolom bertambah secara wajar di layar lebih besar.
- Kartu hanya memuat sampul, judul, penulis, dan progres singkat untuk buku yang sudah dibaca.
- “Lanjutkan membaca” menjadi satu baris kecil, hanya muncul jika memang ada bacaan terakhir.
- Loading, katalog kosong, kegagalan koneksi, dan coba lagi mempunyai tampilan tersendiri.

### Bottom tab

Hanya dua tujuan: **Library** dan **Pengaturan**. Keduanya tersedia di luar reader, dengan ikon dan label. Tidak membuat tab tambahan untuk Reading Now, Notes, atau Upload. Di desktop, bottom bar tetap ringkas dan terpusat; sidebar dihapus. Bar dan isi memperhitungkan safe area.

### Pengaturan

- Bagian utama: tema Terang / Gelap / Ikuti Sistem dan ukuran teks.
- Font dapat disederhanakan menjadi Serif / Sans bila diperlukan; tidak menampilkan katalog pilihan font panjang.
- Bagian Lanjutan yang tertutup secara default: impor EPUB lokal, ekspor catatan, dan informasi penyimpanan.
- Alamat Supabase merupakan konfigurasi pengelola aplikasi, bukan sesuatu yang harus diisi pembaca sebelum bisa membaca.
- Blur/opacity manual, simulator lux, pilihan animasi, dan spread tidak tampil di alur utama MVP. Nilai lama tetap dapat disimpan untuk kompatibilitas tanpa menambah kontrol di UI baru.

### Arah visual

- Font sistem untuk antarmuka (`-apple-system`, system UI); font buku tetap mengutamakan keterbacaan.
- Latar putih hangat atau gelap netral, satu aksen biru, separator tipis, dan bayangan ringan.
- Efek kaca terbatas pada bottom bar dan sheet; mengurangi gradien, dekorasi atmosfer, serta label yang berulang.
- Kontrol sentuh setidaknya 44 × 44 CSS px; ikon mempunyai label aksesibel.

## Interaksi reader yang dimaksud

Interaksi sudah dikonfirmasi pengguna: pinch-in dua jari membuka kontrol sambil mengecilkan halaman; tap pada halaman mengembalikannya ke layar penuh. Tap tunggal juga bisa membuka menu, sehingga semua fungsi tetap dapat diakses tanpa gesture dua jari.

```text
Library → pilih buku → BACA PENUH
                         │
                   tap tengah / pinch-in
                         ↓
                   MENU TERBUKA
             halaman mengecil, kontrol muncul
                         │
                    tap halaman
                         ↓
                     BACA PENUH
```

### Baca penuh

- Reader langsung memenuhi viewport aplikasi yang tersedia, menggunakan tinggi dinamis dan safe area.
- Bottom tab, header aplikasi, kartu luar, tombol mengambang permanen, dan petunjuk dekoratif tidak mengambil ruang baca.
- Teks tetap memiliki margin nyaman. Di desktop, latar halaman memenuhi viewport, sementara kolom teks dibatasi agar tidak terlalu lebar.
- Swipe kiri/kanan dan tombol panah keyboard mengganti halaman. Ukuran teks yang dipilih tetap dihormati.
- Pembukaan buku memulihkan chapter dan offset teks terakhir.

### Menu terbuka

- Halaman yang sama mengecil sekitar 90% dengan animasi singkat dan sudut membulat; skala akhir menyesuaikan ruang kontrol dan perangkat.
- Skala adalah transformasi visual pada halaman yang sudah dirender. Membuka atau menutup menu tidak melakukan pagination ulang, mengubah ukuran font tersimpan, atau memajukan posisi baca.
- Kontrol minimum: kembali ke Library, daftar isi, tampilan teks, bookmark, dan scrubber progres. Detail lain berada di sheet per buku.
- Tap halaman mengembalikan skala penuh. Menutup sheet kembali ke menu; Escape menutup lapisan aktif.
- Animasi menghormati `prefers-reduced-motion`.

### Perilaku sentuh yang harus dipisahkan

- Tap singkat dibedakan dari drag, swipe, long press, dan seleksi teks.
- Seleksi teks dan tap pada highlight tidak menutup menu atau membalik halaman secara tidak sengaja.
- Setelah gesture dua jari terdeteksi, gesture itu tidak boleh diteruskan sebagai swipe satu jari. `pointercancel` dan perubahan jumlah jari mereset gesture dengan aman.
- Pinch merupakan peningkatan yang perlu diuji di iPhone dan Android. Jangan menambahkan `user-scalable=no` atau mematikan zoom browser secara global. Jika pinch kustom tidak dapat didukung dengan aman pada suatu browser, tap tetap menyediakan akses penuh ke menu.
- “Fullscreen” utama berarti memenuhi viewport aplikasi. Menyembunyikan address bar atau UI sistem tidak dapat dijamin di semua browser iOS; rancangan tidak bergantung pada Fullscreen API.

## Supabase sebagai sumber MVP

Pilihan paling kecil untuk MVP: **Supabase Storage + satu `catalog.json`**, tanpa menambah login, tabel database, atau sinkronisasi akun.

1. Tetapkan proyek dan bucket yang memang disiapkan untuk LuminaGlass. Akun memiliki beberapa proyek, sehingga target belum boleh diasumsikan dari nama proyek lain.
2. Simpan manifest, sampul, dan EPUB katalog dalam bucket publik yang sesuai dengan distribusi buku tersebut.
3. Konfigurasikan satu URL katalog untuk aplikasi. Manifest memakai ID buku stabil serta URL sampul, URL EPUB, dan versi isi yang konsisten.
4. Validasi manifest; selesaikan URL relatif terhadap lokasi manifest dan gunakan unduhan berbatas ukuran/waktu untuk buku.
5. Ambil metadata saat membuka/menyegarkan Library; ambil EPUB ketika pengguna memilih buku. Cache hasil yang sudah berhasil dibaca di IndexedDB.
6. Jika jaringan gagal, tampilkan katalog terakhir yang tersedia dengan status singkat dan tombol coba lagi. Instalasi baru yang gagal memuat katalog menampilkan error yang jelas; jangan mengganti kegagalan Supabase diam-diam dengan demo lokal.
7. Progres, preferensi, catatan, dan bookmark tetap lokal. Tidak diperlukan service-role key pada frontend; pembaca tidak memperoleh akses upload ke bucket melalui fitur impor lokal.

Parser perlu menerima manifest produksi tanpa syarat `prototype: true`. Cache tidak boleh menimpa judul, URL, atau versi katalog terbaru. Ketika versi isi berubah, invalidasi cache parser; pertahankan anotasi lama dan cocokkan ulang kutipannya bila memungkinkan, tanpa menempelkannya diam-diam pada teks berbeda.

Dokumentasi yang diperiksa: https://supabase.com/docs/guides/storage/serving/downloads dan https://supabase.com/docs/guides/storage/buckets/fundamentals.

## Urutan implementasi

### 1. Sederhanakan Library dan navigasi

Ganti sidebar dengan dua bottom tab, hilangkan hero/dekorasi, buat resume ringkas, dan pindahkan seluruh titik masuk impor ke Pengaturan. Pisahkan tampilan Library, Pengaturan, dan reader agar reader tidak mewarisi ruang navigasi.

### 2. Bangun reader penuh dan mode kontrol

Pisahkan state reader menjadi `reading` dan `controls`, serta state sheet yang terpisah. Pertahankan elemen reader saat menu dibuka. Ukur area teks menggunakan font yang sudah siap, pagination berdasarkan hasil pengukuran, dan hitung ulang hanya ketika ukuran layar/font berubah. Saat menu dibuka, cukup lakukan transformasi visual. Tambahkan tap dan keyboard lebih dahulu, lalu pinch setelah diuji pada perangkat nyata.

### 3. Hubungkan katalog Supabase sungguhan

Setelah target proyek/bucket diketahui, tambahkan konfigurasi sumber, loader manifest produksi, validasi unduhan, cache berversi, dan tampilan loading/error/empty. Pertahankan ID buku lama bila berkasnya sama agar progres tetap tersambung.

### 4. Verifikasi dan publikasi

Perbarui pengujian sesuai UI baru, periksa migrasi data, lalu lakukan QA browser/perangkat untuk geometri halaman dan gesture. Rilis melalui Sites dengan akses publik yang sekarang tetap dipertahankan. Jangan menganggap pengujian JSDOM sebagai bukti fullscreen atau pinch bekerja.

## Kriteria selesai

- Pengunjung baru bisa memilih dan membaca buku Supabase tanpa login aplikasi, mengisi URL, atau mengunggah EPUB.
- Di luar reader hanya ada dua bottom tab. Tidak ada tombol upload pada Library.
- Membuka buku langsung masuk baca penuh. Membuka menu mengecilkan halaman; menutupnya mengembalikan ukuran penuh tanpa menggeser posisi baca.
- Pada font dan viewport yang didukung, teks halaman tidak terpotong atau membutuhkan scroll dokumen; perubahan ukuran teks melakukan pagination ulang dengan anchor bacaan tetap terjaga. Font besar pada layar pendek tetap diuji, bukan diatasi dengan clipping.
- Notch, home indicator, rotasi layar, dan perubahan tinggi viewport browser tidak menutupi konten maupun tombol.
- Pinch tidak memicu swipe, dan seleksi teks tidak memicu tap menu. Zoom aksesibilitas browser tetap tersedia.
- Progress, bookmark, dan catatan pengguna sebelumnya tetap dapat dipulihkan; sinkronisasi antartab tetap bekerja.
- Katalog produksi tidak memerlukan `prototype: true`; kegagalan koneksi tidak disamarkan dengan koleksi demo.
- Tampilan kecil (sekitar 360 px), iPhone Safari, Android Chrome, tablet, desktop, dan reduced motion diverifikasi sebelum menyatakan QA visual/gesture selesai.

## Batas pembaruan

Tidak menambah login, akun, feed, statistik membaca, tab anotasi global, atau kontrol dekoratif baru. Catatan dan highlight yang sudah ada tetap tersedia secara kontekstual di buku. Impor EPUB adalah fasilitas tambahan di Pengaturan, bukan jalur onboarding atau aksi utama Library.
