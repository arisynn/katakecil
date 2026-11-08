# Mode fokus RSVP — web

Mode fokus dibuka melalui Alat baca → Baca cepat → Mode fokus. Sheet tetap menjadi pengaturan singkat. Tampilan fokus menutupi seluruh halaman buku, memakai tema aplikasi, dan menempatkan huruf penanda tepat di tengah area yang terlihat. Tidak ada APK baru atau deployment backend dalam perubahan ini.

## Penyajian kata

Kata tetap utuh. Tiga kolom simetris menempatkan awalan di kiri, satu grapheme penanda di tengah, dan akhiran di kanan. Pusat kotak grapheme tidak mengikuti lebar keseluruhan kata. Penanda pemandu di atas/bawah mempertahankan sasaran yang sama; kontrol memakai posisi overlay sehingga kemunculannya tidak memindahkan kata.

Pemilihan huruf adalah heuristik untuk kata berhuruf/angka: 1 karakter memilih pertama, 2–5 memilih kedua, 6–9 memilih ketiga, 10–13 memilih keempat, selebihnya sekitar 30% dari awal. Tanda baca di luar huruf/angka tidak dihitung; Unicode grapheme menjaga huruf beraksen dan emoji tetap utuh. Ini pilihan tampilan yang dapat disempurnakan, bukan formula optimal yang terbukti berlaku untuk semua bahasa atau pembaca.

Lebar kedua sisi diukur dan font diperkecil seperlunya agar kata panjang tetap satu baris. Naskah dan offset UTF-16 tidak diubah. Warna penanda berasal dari aksen, dicampur ke warna teks bila diperlukan untuk mencapai kontras 4,5:1 terhadap latar tema.

## Kontrol dan posisi

- Masuk/keluar fokus menjeda pemutaran dan mempertahankan kata, kecepatan dan posisi baca. Satu mesin RSVP digunakan bersama oleh sheet dan tampilan fokus.
- Saat berjalan, header/pengaturan/kontrol disembunyikan dan dibuat inert. Ketuk area kata atau tekan Space untuk jeda. Tab menjeda sebelum navigasi keyboard, dan kontrol kembali terlihat.
- Tombol Pengaturan kembali ke sheet; tombol tutup kembali ke bacaan. Back keluar dari fokus terlebih dahulu. Escape keluar dari fullscreen browser terlebih dahulu bila aktif, lalu dari fokus.
- Fullscreen meminta izin browser langsung dari klik tombol. Jika tidak didukung/ditolak, mode fokus halaman tetap dapat dipakai. Fullscreen milik mode fokus dilepas saat keluar tanpa mematikan fullscreen lain yang sudah aktif sebelumnya.
- Tetap memakai WPM dasar 100–600, jeda tanda baca/paragraf, tambahan waktu terbatas untuk kata panjang, ±5 kata dan progres lokal. Angka WPM adalah kecepatan dasar; jeda membuat laju aktual berbeda.
- Berpindah tab/meninggalkan aplikasi menjeda. Pembukaan episode berikutnya hanya terjadi saat episode aktif selesai. Resume selama satu permintaan episode masih menunggu tidak memulai permintaan kedua; sesi yang sudah ditutup tidak mengubah sesi baru.

## Dasar rancangan

RSVP adalah penyajian kata berurutan; huruf penanda tetap merupakan tambahan yang dikenal sebagai ORP pada Spritz. Tidak mengklaim bahwa RSVP/ORP meningkatkan pemahaman atau memungkinkan kecepatan tinggi tanpa pengorbanan pemahaman. Kontrol jeda, mundur dan kembali ke teks biasa tetap tersedia.

- [Benedetto dkk., Rapid serial visual presentation in reading: The case of Spritz](https://doi.org/10.1016/j.chb.2014.12.043).
- [Rayner dkk., So Much to Read, So Little Time](https://journals.sagepub.com/doi/10.1177/1529100615623267).
- [MDN, requestFullscreen](https://developer.mozilla.org/en-US/docs/Web/API/Element/requestFullscreen).

## Pemeriksaan cepat

16 tes Node terarah: pemilihan grapheme, integritas token/offset, jeda kata, sesi/episode, parser lokal, sheet dan Back. Build helper web, typecheck dan pemeriksaan modul dijalankan; bukan build APK.

Chromium headless memakai katalog mock dan EPUB sintetis lokal: sampel kata pendek/panjang, kutipan, huruf beraksen, tiga ukuran viewport termasuk landscape, tema terang/gelap dengan aksen kustom, tampilan tanpa scroll, kontrol tersembunyi saat berjalan, tap untuk jeda, perpindahan sheet/fokus, fullscreen browser, fallback tanpa API, Escape, Back dan resume setelah reload. Pusat kotak grapheme menyimpang kurang dari 0,01 CSS pixel pada sampel yang diukur. Sepuluh pemeriksaan sheet Tools/RSVP di lima ukuran tetap tanpa overflow. [Bukti ringkas](generated/rsvp-focus-web.json).

Belum diuji pada HP fisik atau Safari iOS. Pengukuran geometri bukan penelitian pemahaman membaca. Uji pemilik: coba Mode fokus, beberapa kecepatan, kata panjang, jeda dengan ketukan, fullscreen bila tersedia, Back/rotasi, tema gelap dan kembali ke posisi baca.
