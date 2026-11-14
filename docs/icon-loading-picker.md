# Ikon & Loading — web

**Pengaturan → Lanjutan → Ikon & Loading** menggantikan pintu masuk Pratinjau loading. Pilihan awal tetap **Rounded KataKecil** dan **Wordmark lama**. Dua tab menggunakan satu heading, satu lensa tab dan paling banyak satu area scroll bila layar pendek.

## Pilihan dan perilaku

- **Ikon:** Rounded KataKecil atau Lucide. Card menampilkan contoh refresh, pengaturan, tema Sistem dan buku. Kedua contoh memakai paket eksplisit sehingga tetap berbeda saat paket aplikasi berubah.
- **Loading:** Wordmark lama, Denyut lembut, atau Titik-titik. Wordmark lama memakai PNG, pembagian sembilan bagian, wave serta tiga titik yang sudah ada. Denyut memakai artwork yang sama; Titik-titik memakai tiga titik tanpa progress palsu atau shimmer.
- Memilih card hanya mengubah kandidat. **Coba** memulai ulang pratinjau loading; **Gunakan** menyimpan pilihan pada tab aktif. Menutup sheet membuang kandidat yang belum diterapkan. Label “Sedang digunakan” membedakan pilihan tersimpan dari kandidat.
- Ikon yang sudah tampil diperbarui pada node SVG yang sama, sehingga class, aria, handler dan kontrol induk tetap. Loader aktif diperbarui pada container `.loading-brand` yang sama; penerapan style yang sama tidak memulai ulang animasi. Pratinjau eksplisit dikecualikan dari perubahan global.
- Preferensi lokal `iconPack` (`katakecil`/`lucide`) dan `loadingStyle` (`wordmark`/`pulse`/`dots`) disertakan dalam backup. Instalasi lama mendapat default; backup lama tetap diterima tanpa menghapus pilihan lokal yang sudah ada. Nilai lokal yang tidak dikenal dinormalisasi dan nilai backup yang tidak valid ditolak sebelum restore. Reset kenyamanan teks mempertahankan keduanya.

Renderer membaca dua preferensi ini secara aman sebelum Store tersedia, sehingga startup juga mengikuti pilihan tersimpan. Tidak ada impor Store dari renderer atau permintaan ikon melalui CDN. Lucide asli berasal dari `lucide-static@1.73.0`: 52 SVG terpilih menghasilkan modul lokal **9.747 bytes**, dengan lisensi ISC/notice Feather yang disertakan. Geometry upstream dipertahankan. Paket npm hanya alat development; font/library penuh tidak masuk aset aplikasi. [Atribusi](../OPEN_SOURCE_ATTRIBUTIONS.md).

## Pemeriksaan singkat

Build helper web, typecheck/check dan **36 tes terarah** lulus. Setelah temuan keyboard diperbaiki, subset controller dengan regresi keyboard baru lulus **6/6**. Suite penuh dan build APK tidak dijalankan.

Chromium memakai katalog/dua episode fixture lokal. Pemeriksaan meliputi default instalasi lama, kandidat yang dibatalkan, Coba tanpa simpan, Gunakan, preview dua paket yang tetap berbeda, node SVG/kontrol tetap, reload, kedua bahasa dan viewport **320×568, 390×844, 667×375**. Card dan tombol tetap terjangkau; tidak ada overflow horizontal atau lensa ganda. Kandidat loading dalam reduced motion berhenti untuk ketiga style.

Pulse dan dots diperiksa pada **loader Library dan reader yang sebenarnya**, dengan respons katalog/sesi fixture ditahan sementara lalu dilepas sesudah pemeriksaan. Loader reader yang tersembunyi berhenti beranimasi. Perubahan ikon/loading dari tab browser lain tidak mengganti node `.page-text`, warna kertas atau progres bacaan. Ekspor backup mengunduh JSON dengan kedua preferensi. Publisher memakai paket terpilih melalui helper yang sama; auth hanya fixture.

Temuan keyboard pada tab baru diperbaiki: arah panah/Home/End kini memindahkan fokus bersama pilihan tab, tanpa pemanggilan ganda handler lama. Follow-up browser mengonfirmasi lensa tepat pada tab aktif sesudah transisi (selisih pusat/lebar **0 px**) dan satu lensa. Tidak ada temuan terbuka pada cakupan uji ini.

[Hasil terstruktur](generated/icon-loading-picker-web.json). Screenshot lokal: `/workspace/scratch/katakecil-icon-loading-stable-icons-390.png` dan `katakecil-icon-loading-stable-loading-390.png`. Belum ada pengujian HP fisik/WebView/native; tidak ada klaim benchmark performa atau perubahan akun/buku/backend produksi. Versi tetap 1.2.5/build 13 pada tahap web ini.

## Uji pengguna

1. Pilih Lucide lalu tutup tanpa Gunakan; pastikan ikon belum berubah. Ulangi dengan Gunakan lalu buka ulang aplikasi.
2. Coba tiga loading dan simpan pilihan favorit. Segarkan Library atau buka buku untuk melihat loader saat ada pekerjaan nyata; tidak ada jeda buatan bila proses cepat.
3. Coba layar pendek/landscape, tema terang/gelap, backup/restore dan pindah tab browser sambil reader terbuka. Pastikan posisi baca tetap sama.
