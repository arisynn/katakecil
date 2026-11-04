# KataKecil — seleksi khusus dan tampilan kaca

Permintaan: mencegah panel Google saat highlight, mengembalikan penanda bab, memperbesar sampul tanpa caption, membuat logo lewat image generation, serta ikon rounded/bold dan kaca lebih terasa.

## Perubahan

- Highlight memakai Range hanya untuk menghitung posisi teks dan menggambar kotak/handle aplikasi. Tidak memanggil `Selection.addRange` dan tidak memilih teks secara native.
- Long press memilih kata. Drag mouse dan dua handle mengatur rentang. Handle juga mendukung tombol panah; H memulai highlight untuk pengguna keyboard.
- `selectstart`, context menu, copy/cut, serta drag native teks reader dicegah. Editor catatan tetap normal. Tidak ada navigasi atau permintaan pencarian Google di aplikasi.
- Long press yang berubah menjadi swipe atau mendapat jari kedua dibatalkan agar tidak bertabrakan dengan navigasi/pinch.
- Parser menyimpan `chapterLabel` dari sumber, misalnya EPISODE 0 atau BAB 1. Subtitle tetap dipisah dan ditampilkan sekali. Cache parser diperbarui ke revision 4 dengan migrasi anchor lama.
- Judul/penulis yang mengulang sampul disembunyikan dari carousel; label aksesibel tetap tersedia. Sampul lebih besar dengan contain-fit dan layout tetap satu viewport.
- Logo PNG baru dihasilkan menggunakan image generation dan dipasang pada header, Pengaturan, favicon, serta apple touch icon.
- Ikon inti lebih rounded dan tebal. Bottom tab, toolbar/footer reader, popover, sheet, serta kartu Pengaturan mendapat transparansi lebih rendah, blur/saturasi lebih kuat, dan highlight kaca.

## Verifikasi

Tes DOM membuktikan pilihan lintas elemen mark tidak menghasilkan native Selection, quote highlight tetap tepat, handle stabil ketika digeser, input catatan tetap bisa disalin, serta timer long press dibatalkan oleh swipe/multi-touch. Tes integrasi mencakup penanda bab dari EPUB, migrasi cache, navigasi, font, fullscreen, anotasi, dan sinkronisasi.

Aplikasi tetap HTML/CSS/JavaScript statis. Penggunaan Next.js tidak diperlukan untuk backdrop-filter atau interaksi ini.

Tidak tersedia alat browser untuk uji Android/Chrome nyata pada sesi ini. Karena panel Google merupakan antarmuka browser, verifikasi perangkat nyata tetap diperlukan; pengujian DOM tidak diklaim sebagai pengujian panel Chrome.
