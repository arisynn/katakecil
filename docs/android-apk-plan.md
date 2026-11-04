# Rencana APK Android KataKecil

Tanggal: 4 November 2026. Dokumen rencana awal. Implementasi berikutnya tersedia
pada branch `feat/android-app`; lihat [hasil Android](android-release.md).

Repo: `arisynn/katakecil`, branch `feat/advanced-reader`, commit `85eb4e6`.
Branch default `main` hanya berisi commit kosong. Checkout lokal: `/workspace/katakecil`.

**Rekomendasi: gunakan Capacitor dengan aset aplikasi disertakan dalam APK.**
Capacitor menjalankan HTML/CSS/JavaScript yang sudah ada di Android WebView dan
menyediakan penghubung ke fitur Android. UI dan mesin reader dipertahankan,
sementara perilaku perangkat ditangani melalui integrasi native yang terbatas.

| Pilihan | Kesesuaian dengan repo | Konsekuensi |
| --- | --- | --- |
| Capacitor, aset lokal | Paling cocok: aplikasi statis sudah tersedia di `dist/` | Memakai ulang reader dan UI; perlu adaptasi fitur Android dan pengujian WebView. Pembaruan kode UI biasanya melalui APK baru. |
| WebView yang membuka URL situs | Cepat untuk prototipe sederhana | Startup bergantung pada situs/jaringan; fitur perangkat tetap memerlukan penanganan sendiri. |
| TWA / situs yang dibuka melalui browser Android | Cocok bila prioritasnya selalu mengikuti situs | Memerlukan kontrol domain dan Digital Asset Links; belum ada manifest PWA atau service worker di checkout ini. Integrasi perangkat mengikuti kemampuan web. |
| Tulis ulang dengan Flutter / React Native / Kotlin | Dipertimbangkan bila kebutuhan native berkembang jauh | UI, pagination, seleksi teks, dan anotasi perlu dikerjakan ulang atau diintegrasikan kembali; biaya dan risiko regresi lebih besar. |

Asumsi tahap pertama: Android, distribusi APK langsung untuk pengujian di HP.
Belum mencakup publikasi Play Store, akun pengguna baru, sinkronisasi cloud,
unduhan buku server untuk offline, atau audio ketika layar terkunci.

1. **Pastikan baseline dan buat percobaan Android kecil.**

   Buat branch kerja dari `feat/advanced-reader`. Pasang versi Capacitor beserta
   plugin yang saling kompatibel, atur `webDir: 'dist'`, dan tambahkan proyek
   `android/`. Gunakan aset lokal tanpa `server.url` produksi. Tetapkan nama
   aplikasi, ID paket yang stabil, versi, serta min/target SDK sesuai versi
   toolchain dan persyaratan distribusi saat implementasi.

   Siapkan Android SDK, Gradle, dan JDK yang sesuai. Lingkungan saat audit
   memiliki Node 24 dan Java 21; `adb` dan `sdkmanager` belum tersedia di PATH.

   Hasil tahap ini: APK debug dapat dipasang, membuka Library, memuat katalog,
   dan membuka satu buku dari Supabase. Ini menjadi bukti awal sebelum
   menambahkan integrasi lain.

2. **Hubungkan perilaku reader dengan Android.**

   Buat lapisan adapter agar versi browser dan Android dapat memakai mesin
   reader yang sama. Atur tombol/gesture Back secara berurutan: tutup keyboard
   atau dialog/seleksi yang aktif, kembali dari reader atau Settings ke Library,
   lalu gunakan perilaku keluar yang wajar di Library.

   Tangani status/navigation bar, mode layar penuh, area kamera/notch, rotasi,
   dan keyboard. Pagination harus dihitung ulang ketika area baca berubah
   sambil mempertahankan posisi teks. Simpan progres ketika aplikasi masuk
   latar belakang; validasi ulang publikasi ketika aplikasi aktif kembali.

   Uji opsi agar layar tetap menyala; sediakan integrasi Android bila API web
   tidak mencukupi. Brightness saat ini berupa overlay peredup aplikasi;
   pengaturan brightness perangkat dapat menjadi tambahan kemudian.

3. **Pastikan impor, ekspor, dan penyimpanan aman dipakai di HP.**

   Uji pemilih berkas Android untuk impor EPUB melalui input berkas yang ada;
   gunakan adapter native jika alur WebView tidak memadai. Ekspor JSON catatan
   melalui mekanisme simpan/bagikan Android. Pertahankan batas ukuran EPUB
   30 MB, validasi parser, dan pemilihan berkas oleh pengguna tanpa izin akses
   seluruh penyimpanan.

   Mulai dengan IndexedDB/LocalStorage yang ada, lalu uji persistensinya setelah
   tutup paksa, restart HP, dan pemasangan pembaruan APK dengan ID paket serta
   kunci penandatanganan yang sama. Perpindahan ke SQLite belum diperlukan
   tanpa bukti kebutuhan.

   Penyimpanan situs dan APK terpisah. Ekspor saat ini memuat anotasi, bukan
   backup lengkap progres/pengaturan, dan alur impor backup belum tersedia.
   Rancang format backup berversi serta impor yang memvalidasi data dan
   menangani duplikasi. Pemindahan dari browser memerlukan dukungan ekspor
   pada versi web asal; EPUB pribadi bisa diimpor ulang. Buku server tidak
   disertakan dalam backup. Uninstall/hapus data dapat menghapus data lokal.

4. **Adaptasi baca nyaring ke Android.**

   Implementasi sekarang memakai EasySpeech/Web Speech API. Jangan menganggap
   API ini tersedia atau berperilaku sama di Android WebView. Sediakan driver
   Android TextToSpeech melalui plugin yang cocok atau bridge kecil, memakai
   interface `SpeechDriver` yang sudah ada bila memungkinkan.

   Uji suara Indonesia/Inggris yang terpasang, play/pause/resume/stop, kecepatan,
   perpindahan halaman, dan sinkronisasi kata. Bila mesin suara tidak menyediakan
   batas kata yang memadai, tampilkan keterbatasannya dengan jelas. Suara
   offline hanya tersedia bila paket suara perangkat mendukungnya.

   Cakupan pertama: membaca saat aplikasi aktif. Audio di latar belakang,
   kontrol notifikasi, dan layar terkunci membutuhkan pekerjaan tersendiri.

5. **Verifikasi koneksi dan aturan konten dari dalam APK.**

   Frontend tetap menggunakan endpoint `katakecil-reader`. Uji CORS dari origin
   lokal Capacitor, termasuk akses ke header `X-KataKecil-Revision`, serta
   koneksi kamus dan terjemahan. Jangan menonaktifkan verifikasi TLS atau
   pemeriksaan revisi untuk membuat koneksi berhasil. Buka tautan luar melalui
   browser, dan batasi navigasi WebView sesuai kebutuhan aplikasi.

   UI, font, dan aset dapat dimuat lokal. EPUB impor pribadi tetap dapat dibaca
   offline. Membuka buku server tetap membutuhkan otorisasi online sebagaimana
   rancangan repo; katalog yang tersimpan bukan izin membaca offline.

   Menurut dokumentasi branch, patch gateway lama `lumina-library` telah
   disiapkan tetapi belum dideploy. Status live belum diperiksa pada audit ini;
   verifikasi penutupan jalur sumber lama sebelum rilis publik. Pekerjaan APK
   tidak otomatis menerapkan patch backend tersebut.

6. **Uji perangkat, lalu siapkan hasil rilis.**

   Jalankan build, typecheck, pemeriksaan sintaks, dan pengujian regresi sebelum
   sinkronisasi/build Android. Tambahkan pengujian untuk adapter native dan
   backup jika sudah diimplementasikan.

   Uji di emulator dan HP fisik, termasuk versi Android minimum yang dipilih:
   katalog dan buku, swipe/pinch/seleksi, highlight/catatan/bookmark, font besar,
   tema, rotasi, area sistem, Back, keyboard, impor/ekspor, penyimpanan penuh,
   mode pesawat, jaringan putus, publikasi berubah, resume, dan suara nyata.
   Hasil JSDOM tidak membuktikan perilaku tersebut di perangkat.

   Hasil awal: APK debug untuk uji instalasi. Setelah QA, hasilkan APK release
   bertanda tangan beserta versi, checksum, dan petunjuk instalasi. Simpan
   keystore/password di luar repo dan cadangkan agar pembaruan berikutnya
   memakai identitas yang sama. Jika distribusi berlanjut ke Play Store,
   siapkan AAB dan kebutuhan listing, privasi, serta pengujian Play yang berlaku.

**Kriteria APK pertama siap diuji:** dapat dipasang dan dibuka; katalog/buku
online berfungsi; EPUB impor bisa dibaca offline; Back dan area layar nyaman;
progres/catatan bertahan setelah aplikasi ditutup dan diperbarui; ekspor catatan
benar-benar menghasilkan berkas; baca nyaring diuji dengan suara perangkat atau
keterbatasannya dinyatakan. Belum dinyatakan siap rilis publik hanya karena build
berhasil.

**Pemeriksaan pada sesi perencanaan:** clone berhasil, dependensi dipasang dengan
`npm ci --ignore-scripts`, `npm run typecheck` dan `npm run check` lulus.
`node --test tests/*.test.mjs`: **53 lulus, 0 gagal**. Pengujian regresi memakai
bundle `dist/` yang sudah dikomit, tanpa menjalankan ulang build web. Log lokal:
`/workspace/scratch/katakecil-baseline-tests.txt`. Build Android dan pengujian HP
belum dijalankan. Kode aplikasi dan backend belum diubah; hanya dokumen rencana
ini yang ditambahkan.
