# Motion loading — web

Dua loading opsional pada **Pengaturan → Lanjutan → Ikon & Loading → Loading** diganti dengan bentuk dan gerak baru:

| Pilihan | Motion | Key tersimpan |
| --- | --- | --- |
| Lembar buku / Turning pages | Buku terbuka dengan dua lembar yang melintas kanan ke kiri, menyempit di lipatan dan menetap; siklus 2,6 detik | `pulse` |
| Alur tinta / Ink flow | Tiga goresan diagonal berbeda panjang, mengalir secara berurutan; siklus 1,8 detik | `dots` |

Keduanya memakai wrapper 104×64 px yang stabil, warna tema/aksen dan animasi CSS transform/opacity. Tidak memakai wordmark berdenyut, tiga titik lama, track/persentase progress, shimmer atau delay loading buatan. **Wordmark lama tetap persis dan menjadi default.** Key `pulse`/`dots` dipertahankan agar preferensi dan backup sebelumnya otomatis memakai motion baru.

Preview menampilkan kandidat; **Coba** memulai ulang sampel, **Gunakan** menyimpan pilihan. Menutup tanpa Gunakan membuang kandidat. Helper yang sama dipakai Library, reader dan launch; container loader tetap ketika pilihan diterapkan. Dua motion dekoratif memakai `aria-hidden`, sementara nama/status loading tetap disediakan host. Reduced motion menampilkan buku/goresan statis; seluruh animasi baru, termasuk pseudo-element, berhenti saat reader loader tersembunyi.

[Skill motion](../.agents/skills/katakecil-loading-motion/SKILL.md) mengatur tiga worker: desain read-only, implementasi empat file renderer/CSS/picker/terjemahan, lalu QA tes/browser. Integrasi cache, dokumentasi dan push dikerjakan koordinator. Tidak ada perubahan ikon, glow naskah, default teks, backend, versi atau build APK.

## Pemeriksaan singkat

Check sintaks/aset/module graph serta **14 tes renderer/controller** lulus. Chromium 390×844 memakai katalog/dua episode fixture lokal, tanpa penulisan produksi. Dua frame setiap motion membuktikan perubahan transform/opacity dengan wrapper tetap 104×64. Preview/Coba tidak menyimpan; Gunakan menyimpan, reload mempertahankan key lama. Kedua motion diperiksa pada loader Library dan reader sebenarnya, termasuk seluruh descendant/pseudo-element statis ketika tersembunyi. Terang/gelap dan reduced motion lulus; tidak ada page error atau jaringan tak terduga.

[Hasil terstruktur](generated/loading-motion-web.json). Screenshot lokal: `/workspace/scratch/katakecil-loading-motion-{pulse,dots}-{light-a,light-b,dark,reduced}.png`. Tidak menjalankan suite penuh, build helper TypeScript (sumber helper tidak berubah), build APK atau uji HP fisik/native. Versi tetap **1.2.5/build 13**.

## Uji pengguna

1. Pilih Lembar buku lalu Coba; ulangi Alur tinta. Pastikan bentuk dan gerak keduanya berbeda dan nyaman.
2. Tekan Gunakan, segarkan Library atau buka buku, lalu buka ulang aplikasi untuk memeriksa pilihan tersimpan.
3. Coba tema terang/gelap dan pengaturan Kurangi gerakan perangkat. Wordmark lama tetap bisa dipilih seperti sebelumnya.
