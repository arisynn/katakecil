# KataKecil V6.8.1 — Beranda lebih ringkas

- Bab Baru hanya menampilkan maksimal **2** episode terbaru yang telah terbit dalam 30 hari terakhir.
- Bagian **Jelajahi Genre** dihapus dari Beranda. Filter genre tetap tersedia di Perpustakaan.
- Footer Beranda dihapus agar tidak ada bagian tambahan setelah Bab Baru; ruang bawah tetap mengikuti safe area bottom navigation.
- Tidak ada perubahan pada Supabase, jadwal rilis bab, Studio, atau Secure Reader.

Pengujian: `npm run test:current`, `npm run check:structure`, `npm run lint`, `npm run build`. Pengujian Supabase langsung masih diperlukan sebelum deployment.
