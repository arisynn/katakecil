<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="dist/assets/katakecil-wordmark-cream.png">
    <img src="dist/assets/katakecil-wordmark.png" width="320" alt="Logo KataKecil">
  </picture>
</p>

<h1 align="center">KataKecil</h1>

<p align="center">Rak buku pribadi untuk Android dan web.<br>Baca cerita, tandai bagian yang berkesan, lalu lanjutkan dari halaman terakhir.</p>

<p align="center">
  <img alt="Android 7 atau lebih baru" src="https://img.shields.io/badge/Android-7%2B-54756c">
  <img alt="Android System WebView 113 atau lebih baru" src="https://img.shields.io/badge/WebView-113%2B-4269a5">
  <img alt="Status Android Preview" src="https://img.shields.io/badge/Status-Preview-a07732">
</p>

<p align="center">
  <a href="https://github.com/arisynn/katakecil/releases/tag/v1.0.2-preview.3">Unduh rilis</a> ·
  <a href="docs/android-release.md">Panduan Android</a> ·
  <a href="CHANGELOG.md">Catatan perubahan</a> ·
  <a href="https://github.com/arisynn/katakecil/issues/new/choose">Laporkan masalah</a>
</p>

## Pasang di Android

1. Unduh **[KataKecil 1.0.2 Preview 3 — APK Karisyono](https://github.com/arisynn/katakecil/releases/download/v1.0.2-preview.3/KataKecil-1.0.2-preview.3-Karisyono.apk)** dari halaman rilis.
2. Buka berkas APK. Jika diminta Android, izinkan pemasangan dari aplikasi tempat berkas dibuka.
3. Jalankan KataKecil, pilih buku dari Library, lalu mulai membaca.

| Kebutuhan | Keterangan |
| --- | --- |
| Sistem | Android 7.0 / API 24 atau lebih baru |
| Komponen web | Android System WebView 113 atau lebih baru |
| Ukuran APK | Sekitar 7 MB |
| Identitas aplikasi | `id.karisyono.katakecil` · versi `1.0.2-preview.3` · build `3` |
| Penandatanganan | `CN=Karisyono` · APK Signature Scheme v2/v3 |
| Jaringan | Diperlukan untuk membuka buku server, kamus, terjemahan, dan suara online |

**Rilis ini berstatus Preview.** Build, pemeriksaan kode, dan 69 tes web dan 3 unit test Android lulus; 14 tes terarah akhir juga lulus. Pengujian HP fisik/emulator, sentuhan, pemilih berkas, dan suara perangkat masih perlu dilakukan. Ini belum merupakan rilis Play Store.

## Yang bisa dilakukan

- **Baca dengan nyaman.** Pilih mode halaman atau scroll, ubah huruf dan jarak teks, gunakan tema terang/gelap/sepia, atau atur warna sendiri.
- **Temukan kembali bagian penting.** Simpan highlight, catatan, dan bookmark; cari kata di episode yang sedang dibaca.
- **Lanjutkan bacaan.** Posisi baca disimpan di perangkat, termasuk ketika meninggalkan reader atau berpindah aplikasi.
- **Dengarkan cerita.** Kontrol play, pause, resume, kecepatan, bahasa, dan suara. Android memakai TextToSpeech perangkat; web memakai suara browser.
- **Bawa buku sendiri.** Impor EPUB tanpa DRM hingga 30 MB. EPUB impor tetap lokal dan bisa dibaca offline.
- **Pindahkan data.** Ekspor dan pulihkan backup progres, catatan, bookmark, dan pengaturan. Data yang lebih baru di perangkat tujuan dipertahankan.
- **Pakai di Android dan web.** Handler kembali, backup/pemulihan, checkpoint progres, dan dialog mobile berasal dari source yang sama. Bahasa aplikasi tersedia dalam Inggris dan Indonesia.

Android juga memiliki integrasi layar penuh, area aman layar, orientasi, opsi layar tetap menyala, dan dialog simpan berkas. Ketersediaan suara serta perilaku layar dapat berbeda menurut perangkat.

## Buku, koneksi, dan data pribadi

| Data atau fitur | Perilakunya |
| --- | --- |
| Buku dari server | Dibuka setelah pemeriksaan publikasi online dan revisi isi. Naskah tidak disimpan sebagai cache buku offline. |
| EPUB impor sendiri | Disimpan di perangkat dan dapat dibaca offline. |
| Progres, highlight, catatan, bookmark | Disimpan lokal; belum ada akun atau sinkronisasi cloud. |
| Backup JSON | Berisi metadata bacaan dan pengaturan; tidak membawa berkas EPUB atau naskah server. Batas impor 8 MB. |
| Kamus dan terjemahan | Permintaan dikirim setelah tombol pencarian/terjemahan ditekan, menggunakan kata atau teks pilihan. |
| Suara online | Dapat memakai jaringan layanan mesin suara. Suara offline bergantung pada paket suara yang terpasang. |

Penyimpanan browser dan APK terpisah. Menghapus data browser, menghapus data aplikasi, atau uninstall dapat menghapus data lokal. Simpan backup sebelum berpindah perangkat atau mengganti instalasi.

### Memperbarui APK

Preview 1 perlu diperbarui secara manual satu kali memakai APK Preview 2 di atas. Pasang di atas aplikasi lama dengan sertifikat Karisyono yang sama, tanpa uninstall. Selanjutnya buka **Settings → App → App updates** untuk memeriksa GitHub Releases, mengunduh dan memverifikasi APK, lalu membuka pemasang Android. Konfirmasi instalasi dan izin dari Android tetap diperlukan. Preview builds memeriksa rilis Preview juga; pemeriksaan otomatis dilakukan paling sering sekali sehari setelah pemeriksaan berhasil. Isi buku tidak dikirim ke GitHub.

### Pindah dari web ke APK

1. Pada versi web yang memiliki fitur backup, buka **Settings → Advanced → Save backup**.
2. Pindahkan berkas JSON ke HP.
3. Di APK, buka **Settings → Advanced → Restore backup**, pilih berkas, periksa jumlah data, lalu pulihkan.
4. Impor ulang EPUB pribadi dari berkas aslinya.

Ekspor catatan dari versi lama juga dapat dipulihkan, tetapi hanya membawa data yang memang ada di berkas tersebut. Fitur backup baru di source web belum otomatis mengubah situs yang sudah tayang.

## Menjalankan source web

Gunakan **Node.js 24+** dan npm.

```sh
git clone https://github.com/arisynn/katakecil.git
cd katakecil
npm ci
npm run build
npm run typecheck
npm run check
npm test
```

Aplikasi berupa HTML/CSS/JavaScript statis dengan helper TypeScript yang dibundel esbuild. Jalankan `dist/` melalui server HTTP lokal pilihanmu; membuka `index.html` sebagai `file://` tidak cukup untuk modul dan penyimpanan aplikasi. Akses fitur browser tertentu memerlukan localhost atau HTTPS.

| Perintah | Kegunaan |
| --- | --- |
| `npm run build` | Membundel helper reader, adapter perangkat, dan backup; menyalin atribusi paket. |
| `npm run typecheck` | Memeriksa TypeScript reader, adapter perangkat, dan patch Edge Function. |
| `npm run check` | Memeriksa sintaks, aset masuk, konsistensi URL modul, dan batas sumber publikasi. |
| `npm test` | Build lalu menjalankan pengujian Node/JSDOM dan fake-indexeddb. |

`dist/` juga berisi source UI yang dipelihara langsung. Build membundel helper; build tidak membuat ulang seluruh UI dari folder `src/` dan tidak menerbitkan situs atau backend.

## Membangun APK

Siapkan **JDK 21 yang memiliki `javac`**, Android SDK Platform 36, Build Tools 36.0.0, dan Platform Tools. Atur `JAVA_HOME` serta `ANDROID_HOME`, atau isi `android/local.properties` untuk lokasi SDK.

```sh
# Sesudah npm ci
npm run android:debug

# Membuka proyek di Android Studio
npx cap open android
```

Build release memakai folder penandatanganan privat:

```sh
# Buat satu kali untuk identitas release baru; simpan di luar repo.
npm run android:key -- /private/path/katakecil-signing

KATAKECIL_SIGNING_DIR=/private/path/katakecil-signing npm run android:release
```

Hasil default berada di `artifacts/`. Gunakan `KATAKECIL_OUTPUT_DIR` untuk lokasi lain. Perintah build melalui npm di atas ditujukan untuk shell Linux/macOS; di Windows, proyek native dapat dibuka melalui Android Studio.

**Untuk meneruskan rilis resmi Karisyono, gunakan kunci asli yang dicadangkan secara privat.** Membuat kunci baru menghasilkan identitas berbeda meskipun nama sertifikatnya sama. Instalasi Android hanya dapat diperbarui langsung dengan ID paket dan kunci yang sesuai. Simpan backup sebelum beralih dari build debug atau APK bertanda tangan berbeda.

Detail toolchain, penandatanganan, migrasi data, dan batas QA ada di [panduan Android](docs/android-release.md).

## Struktur repo

```text
android/          Proyek Android dan plugin perangkat
dist/             Source UI statis, aset lokal, dan hasil bundle
src/reader/       Helper reader TypeScript
src/platform/     Adapter Android/web, navigasi, dan format backup
scripts/          Build, pemeriksaan, dan penandatanganan
tests/            Pengujian dan EPUB fixture domain publik
supabase/         Patch kompatibilitas gateway yang disiapkan
docs/             Panduan, catatan rilis, audit, dan bukti pengujian
```

## Dokumentasi dan kontribusi

- [Indeks dokumentasi](docs/README.md)
- [Catatan rilis Android Preview](docs/releases/v1.0.2-preview.3.md)
- [Panduan kontribusi](CONTRIBUTING.md)
- [Hasil pemeriksaan APK](docs/generated/android-validation.json)
- [Atribusi open-source](OPEN_SOURCE_ATTRIBUTIONS.md)

Manifest hosting yang sudah ada tetap dipertahankan. Update repo dan rilis APK tidak menerbitkan ulang situs atau backend. Patch gateway lama `lumina-library` masih memerlukan rollout dan verifikasi terpisah sebelum rilis produksi; lihat [panduan deployment](docs/advanced-reader-deployment.md).

Repo ini belum menetapkan lisensi umum untuk kode aplikasinya. Lisensi paket pihak ketiga dan font dicatat pada atribusi; tidak ada naskah pribadi yang disertakan dalam paket rilis.
