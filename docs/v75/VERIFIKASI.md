# Verifikasi V7.5 RC1

Basis source: commit `1d98d0a` (V7.4). Perubahan disiapkan pada branch `feat/v75-publishing-management`.

| Pemeriksaan | Hasil |
|---|---|
| TypeScript dan struktur import/aset | Lulus |
| `npm run check` | 13 suite lulus |
| `npm run build` | Build produksi berhasil; verifikasi tidak ada naskah privat di bundle lulus |
| Regresi browser V7.2, V7.3, V7.4 | Lulus |
| Browser V7.5 dengan RPC PostgreSQL | Lulus |
| SQL transaksional 1000 bab, replay UUID, rollback | Lulus di PGlite |
| Jeda/lanjutkan, snapshot jadwal usang, pemulihan privat | Lulus |
| Hapus massal termasuk parent+child, revisi privat dan antrean sampul | Lulus |
| Cleanup dry-run, 205 objek, retry kegagalan dan guard novel aktif | Lulus |
| Dialog pembatalan Escape dan overflow 320–1440 | Lulus |
| Impor dan beranda mobile, tema terang/gelap | Lulus di Chromium |

Alur yang diuji: unggah EPUB nyata → parser → pilihan tiga bab sekarang/tiga terjadwal → RPC → PostgreSQL → status sukses di UI; jeda → pratinjau lanjutkan → tanggal baru; hapus semua lintas filter → respons sukses terputus → retry UUID identik → pemulihan privat → kosongkan Sampah. Pengujian memakai teks sintetis dan endpoint lokal, bukan data pengguna.

Tidak ada deployment frontend, penerapan SQL produksi, job pembersihan hosting, atau uji pada perangkat Android fisik yang dilakukan. Akses baca GitHub berhasil; akses push memerlukan autentikasi penulis repo. Lihat `START_HERE_V75.md` untuk pemasangan dan batas fitur.
