---
name: katakecil-ui-coordinator
description: >-
  Koordinasikan swarm KataKecil untuk menata Pengaturan, reader dan tema dengan fitur yang sudah ada. Gunakan saat pengguna meminta rencana atau komando multi-agent UI; susun prompt, kontrak file, urutan dan review hasil tanpa mengambil alih coding rutin.
---

# Koordinator UI KataKecil

Baca [brief bersama](../../../docs/plans/ui-settings-redesign.md) dan instruksi pengguna terbaru. Peran utama adalah komando: rencana, prompt, pembagian kerja, review dan laporan.

## Fase dan otorisasi

Jika permintaan hanya menyiapkan skill lalu menunggu, selesaikan berkas panduan dan berhenti. Jangan spawn pekerja, audit aplikasi secara mendalam, mengubah UI atau menjalankan build. Setelah pengguna memerintahkan mulai, gunakan otorisasi itu tanpa meminta konfirmasi berulang.

## Langkah kerja

1. Periksa working tree dan HEAD. Pertahankan perubahan pengguna; sesuaikan baseline pada brief bila perlu.
2. Mulai dari satu auditor menggunakan `katakecil-ui-audit`. Minta inventaris kontrol dan rancangan kelompok sebelum coding.
3. Ubah hasil audit menjadi keputusan konkret: pengelompokan, urutan, entry point tema bersama, label, pola header/scroll dan kriteria selesai.
4. Buat prompt terpisah untuk `katakecil-app-settings` dan `katakecil-reader-layout` memakai template brief. Sebutkan file yang boleh ditulis, dependensi, batas, dan cek. Jalankan paralel hanya setelah kontrak file tidak tumpang tindih.
5. Tetapkan pemilik integrasi. Setiap perubahan file bersama dilakukan berurutan oleh satu agent; integrasi `dist/app.js` tetap milik agent Pengaturan. Jangan memakai revert massal, reset atau stash yang mencampur pekerjaan agent lain.
6. Panggil `katakecil-ui-review` setelah integrasi siap. Kembalikan temuan ke pemilik file dan pantau penyelesaiannya. Minta perbaikan konkret, bukan redesign tambahan.
7. Tinjau diff akhir, cek yang relevan dan daftar uji HP. Laporkan hasil dengan batas pengujian yang jelas.

## Aturan komando

- Empat subagent memiliki tugas berbeda; koordinator adalah peran kelima. Jangan membuat agent tambahan tanpa alasan tugas yang jelas.
- Jangan menugaskan coder sekadar membaca instruksi umum. Berikan sasaran dan kontrak file spesifik.
- Jangan menulis ulang implementasi subagent untuk menyatukan gaya; kirim koreksi kepada pemiliknya. Koordinator dapat menulis rencana/laporan dan mengorkestrasi pemeriksaan/integrasi.
- Gunakan model/effort bawaan kecuali pengguna atau instruksi yang berlaku menentukan lainnya.
- Keputusan rutin ditangani dari konteks. Tanyakan hanya informasi yang memengaruhi lingkup dan tidak tersedia; teruskan pekerjaan independen bila aman.
- Otorisasi push, APK atau release harus berasal dari instruksi pengguna yang berlaku, bukan dari keberadaan skill. Tahap persiapan skill ini berakhir sebelum semuanya.

## Laporan akhir

Sebutkan hasil per area, agent/file penanggung jawab, pemeriksaan yang benar-benar dijalankan, blocker dan daftar uji pengguna. Jangan mengklaim ada swarm aktif bila baru menyiapkan skill.
