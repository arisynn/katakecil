# Motion loading — web

Dua motion loading pada **Pengaturan → Lanjutan → Ikon & Loading → Loading** diganti dengan bentuk dan gerak baru:

| Pilihan | Motion | Key tersimpan |
| --- | --- | --- |
| Lembar buku / Turning pages | Versi HTML pengguna: tiga lembar 3D berputar, buku melayang dan tulisan katakecil berurutan; satu siklus 3 detik | `pulse` |
| Alur tinta / Ink flow | Tiga goresan diagonal berbeda panjang, mengalir secara berurutan; siklus 1,8 detik | `dots` |

Keduanya memakai area motion buku/goresan 104×64 px yang stabil dan warna tema/aksen. Turning pages menambahkan teks katakecil di bawah buku serta animasi CSS 3D, opacity dan pencahayaan; Ink flow memakai transform/opacity. Tidak memakai tiga titik lama sebagai loading opsional, persentase progress, shimmer atau delay loading buatan. Garis cahaya di bawah tulisan Turning pages hanya dekorasi berulang. **Turning pages menjadi default; Wordmark lama tetap tersedia.** Key `pulse`/`dots` dipertahankan agar preferensi dan backup sebelumnya otomatis memakai motion baru.

Preview menampilkan kandidat; **Coba** memulai ulang sampel, **Gunakan** menyimpan pilihan. Menutup tanpa Gunakan membuang kandidat. Helper yang sama dipakai Library, reader dan launch; container loader tetap ketika pilihan diterapkan. Dua motion dekoratif memakai `aria-hidden`, sementara nama/status loading tetap disediakan host. Reduced motion menampilkan buku/goresan statis; seluruh animasi baru, termasuk pseudo-element, berhenti saat reader loader tersembunyi.

[Skill motion](../.agents/skills/katakecil-loading-motion/SKILL.md) mengatur tiga worker: desain read-only, implementasi empat file renderer/CSS/picker/terjemahan, lalu QA tes/browser. Integrasi cache, dokumentasi dan push dikerjakan koordinator. Tidak ada perubahan ikon, glow naskah, default teks, backend, versi atau build APK.

## Default terbaru

Sesuai permintaan pengguna, `VISUAL_DEFAULTS.loadingStyle` dan fallback normalisasi memakai `pulse` (Turning pages). Berlaku untuk perangkat tanpa pilihan tersimpan, preferensi lama tanpa field loading, nilai tidak dikenal dan storage yang rusak/terblokir, termasuk renderer sebelum Store siap. Pilihan valid yang sudah tersimpan tetap dipakai; untuk perangkat yang menyimpan Classic wordmark, pilih Turning pages lalu Gunakan sekali.

Check sintaks/module graph dan **15 tes renderer/controller** lulus pada pembaruan default, termasuk startup sebelum Store, pemulihan pilihan tersimpan dan backup. Tidak mengulang browser animasi atau build APK karena hanya default/preferensi dan cache yang berubah.

## Versi HTML pengguna

Versi Turning pages saat ini memakai HTML revisi yang diberikan pengguna: tiga lembar dengan sisi depan/belakang, bayangan, buku melayang, sembilan huruf serta cahaya dekoratif dalam satu siklus 3 detik. CSS diisolasi pada `pulse`; teks baru memakai `.loading-pages-wordmark` agar aturan PNG Classic tidak bocor. Tema preview tidak disalin: warna mengikuti pengaturan aplikasi.

Check sintaks/module graph dan **14 tes terarah** lulus. Chromium 390×844 memeriksa enam jenis animasi, dua frame berbeda, `rotate`/`translate`/filter, book stage 104×64 dan total brand 104×108 yang tetap. Seluruh brand beserta pseudo-element statis ketika hidden/reduced, dengan huruf utuh pada reduced motion. Actual Library/reader, Coba/Gunakan/reload, terang/gelap, Classic PNG sembilan bagian+tiga titik/aspect 3:1 dan Ink flow tanpa perspective tetap bekerja. Tidak ada page error/jaringan tak terduga.

[Hasil v2](generated/turning-pages-v2-web.json). Screenshot lokal: `/workspace/scratch/katakecil-turning-pages-v2-{pulse,dots}-{light-a,light-b,dark,reduced}.png`. Tanpa suite penuh, uji HP fisik/native atau build APK; versi tetap 1.2.5/build 13.

## Pemeriksaan tahap motion awal

Bagian ini merekam tahap sebelum penggunaan HTML revisi pengguna.

Check sintaks/aset/module graph serta **14 tes renderer/controller** lulus. Chromium 390×844 memakai katalog/dua episode fixture lokal, tanpa penulisan produksi. Dua frame setiap motion membuktikan perubahan transform/opacity dengan wrapper tetap 104×64. Preview/Coba tidak menyimpan; Gunakan menyimpan, reload mempertahankan key lama. Kedua motion diperiksa pada loader Library dan reader sebenarnya, termasuk seluruh descendant/pseudo-element statis ketika tersembunyi. Terang/gelap dan reduced motion lulus; tidak ada page error atau jaringan tak terduga.

[Hasil terstruktur](generated/loading-motion-web.json). Screenshot lokal: `/workspace/scratch/katakecil-loading-motion-{pulse,dots}-{light-a,light-b,dark,reduced}.png`. Tidak menjalankan suite penuh, build helper TypeScript (sumber helper tidak berubah), build APK atau uji HP fisik/native. Versi tetap **1.2.5/build 13**.

## Uji pengguna

1. Pilih Lembar buku lalu Coba; ulangi Alur tinta. Pastikan bentuk dan gerak keduanya berbeda dan nyaman.
2. Tekan Gunakan, segarkan Library atau buka buku, lalu buka ulang aplikasi untuk memeriksa pilihan tersimpan.
3. Coba tema terang/gelap dan pengaturan Kurangi gerakan perangkat. Wordmark lama tetap bisa dipilih seperti sebelumnya.
