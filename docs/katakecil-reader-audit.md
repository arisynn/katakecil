# KataKecil — koreksi berdasarkan screenshot pengguna

4 November 2026. Baseline situs versi 2; audit membaca empat screenshot yang dilampirkan, kode produksi, dan EPUB asli koleksi pengguna. Tidak ada alat browser yang tersedia untuk sesi ini, sehingga audit ini tidak mengklaim screenshot baru atau QA visual langsung pada Safari/Android.

| Screenshot | Penyebab yang ditemukan | Koreksi |
| --- | --- | --- |
| Tombol “Layar penuh” di menu baca | Tombol memakai aksi toggle menu | Memanggil Fullscreen API browser, menyinkronkan ikon keluar/masuk, dan memberi pesan jika API tidak tersedia. Pada browser yang tidak mendukungnya, tombol tidak diam-diam menutup menu. |
| “BAB 3” di atas “Bab 1 — Sesudah Tepuk Tangan” | Nomor buatan berasal dari indeks spine, yang juga menghitung judul dan imprint | Nomor buatan dihapus. Judul asli diekstrak sekali; prefiks Bab/Episode dipisahkan dari subjudul. |
| Halaman “Section 2” | Dokumen tanpa heading diberi judul generik; imprint yang pendek menjadi halaman tersendiri | Tidak membuat judul Section. Dokumen title/front/imprint/copyright dikeluarkan dari alur baca; konten tanpa judul tidak mendapat heading palsu. |
| Bagian awal terasa besar/harus digulir | Tinggi sampul, jarak, CTA, dan padding berdiri sendiri | Library memakai viewport tetap, baris carousel yang dapat mengecil, CTA ringkas, dan ruang bottom tab yang sudah dicadangkan. Sampul memakai contain-fit, bukan cover-fit. |

## Ruang kosong pada teks

Pagination sebelumnya memilih batas paragraf yang dapat terletak hanya 60% dari kapasitas halaman. Ia tidak mencoba mengisi ruang tersisa dengan paragraf berikutnya. Versi baru mencari batas teks yang benar-benar muat, lalu merapikan batas kata di dekat ujung halaman.

Perbandingan terhadap isi EPUB asli dengan kapasitas terkontrol 1.200 karakter per halaman, mengecualikan halaman terakhir tiap bab:

| Buku | Rata-rata pengisian sebelumnya | Sesudah | Halaman isi di bawah 80% sebelumnya → sesudah |
| --- | --- | --- | --- |
| Masa Panen | 91% | ~100% | 59 → 0 |
| Garis yang Kita Teruskan | 91% | ~100% | 43 → 0 |

Angka ini menguji pemotongan teks, bukan tinggi piksel hasil browser. Pengukuran sesungguhnya tetap memakai area teks dan font yang sudah siap pada perangkat pengguna. Akhir bab, akhir buku, dan EPUB contoh yang hanya berisi satu kalimat tetap dapat mempunyai ruang kosong secara wajar; teks tidak diregangkan untuk menyamarkannya.

Judul pertama yang ditemukan pada berkas koleksi pengguna:

- Masa Panen: **Suara Mesin di Balik Terpal**.
- Garis yang Kita Teruskan: **Sesudah Tepuk Tangan**.
- Ruang Kecil: tidak menampilkan judul buatan untuk “Episode 1”; teks pendeknya langsung dibaca.

## Cache dan data tersimpan

Parser revision 3 memaksa cache hasil parser lama diperbarui. Progres dan bookmark dicocokkan menurut sumber chapter dan potongan teks; highlight memakai kutipan persis. Anchor lama dicadangkan pada record. Kutipan yang tidak dapat dicocokkan dengan aman tetap disimpan dan ditandai untuk ditinjau, bukan ditempel ke teks yang berbeda. Kunci penyimpanan dan ID perangkat tetap digunakan agar branding baru tidak mereset data.

## Branding dan verifikasi

Branding UI, favicon, logo, judul tab, dan nama tampilan Site diganti menjadi KataKecil. URL situs tetap. Ikon pengaturan/menu dan animasi ringan ditambahkan dengan dukungan reduced motion. Asset UI/parser memakai versi URL baru agar browser tidak mencampur modul lama dan baru.

Pengujian mencakup parser pada EPUB asli dan fixture, deteksi judul bernomor serta nested span, batas halaman/paragraf, pelestarian teks, migrasi cache/anchor, native fullscreen API serta fallback, carousel, aksen, anotasi, blokir salin, dan perilaku menu reader. QA visual nyata atas no-scroll, ukuran font, safe area, dan fullscreen perangkat tetap belum tersedia di lingkungan ini.
