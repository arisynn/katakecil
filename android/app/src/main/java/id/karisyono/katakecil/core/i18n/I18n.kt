package id.karisyono.katakecil.core.i18n

object I18n {
    private val enToIdExact = mapOf(
        "Library" to "Pustaka",
        "Settings" to "Pengaturan",
        "Import" to "Impor",
        "Import EPUB" to "Impor EPUB",
        "Read book" to "Baca buku",
        "Continue reading" to "Lanjutkan membaca",
        "Not started" to "Belum dibaca",
        "Completed" to "Selesai dibaca",
        "Unknown Author" to "Penulis Tidak Diketahui",
        "Personal EPUB" to "EPUB Pribadi",
        "Personal EPUBs" to "EPUB Pribadi",
        "Published" to "Terbitan",
        "Contents" to "Daftar Isi",
        "Highlights" to "Sorotan",
        "Notes" to "Catatan",
        "Bookmarks" to "Markah",
        "This Book" to "Buku Ini",
        "Reading Appearance" to "Tampilan Baca",
        "Reading Tools" to "Alat Baca",
        "Search in episode" to "Cari di episode",
        "Speed Reading" to "Baca Cepat",
        "Speed reading (RSVP)" to "Baca cepat (RSVP)",
        "Read Aloud" to "Baca Nyaring",
        "Read aloud (TTS)" to "Baca nyaring (TTS)",
        "Word Tools" to "Alat Kata",
        "Word tools" to "Alat kata",
        "Dictionary" to "Kamus",
        "Translate" to "Terjemahan",
        "Text" to "Teks",
        "Layout" to "Tata Letak",
        "Theme" to "Tema",
        "Custom" to "Kustom",
        "Global Theme" to "Tema Global",
        "Liquid Glass" to "Liquid Glass",
        "Language" to "Bahasa",
        "Device Backup" to "Cadangan Perangkat",
        "Save backup" to "Simpan cadangan",
        "Restore backup" to "Pulihkan cadangan",
        "Export notes" to "Ekspor catatan",
        "Advanced" to "Lanjutan",
        "Device storage" to "Penyimpanan perangkat",
        "Loading preview" to "Pratinjau muat",
        "Publisher" to "Publisher",
        "App Updates" to "Pembaruan Aplikasi",
        "Check for updates" to "Periksa pembaruan",
        "About & Licenses" to "Tentang & Lisensi",
        "Open-source attributions" to "Atribusi sumber terbuka",
        "Close" to "Tutup",
        "Cancel" to "Batal",
        "Save" to "Simpan",
        "Delete" to "Hapus",
        "Edit" to "Ubah",
        "Reset" to "Atur ulang",
        "Apply" to "Terapkan",
        "Done" to "Selesai",
        "Back" to "Kembali",
        "Previous" to "Sebelumnya",
        "Next" to "Berikutnya",
        "Previous episode" to "Episode sebelumnya",
        "Next episode" to "Episode berikutnya",
        "Go to page" to "Ke halaman",
        "Go" to "Buka",
        "Page" to "Halaman",
        "Episode" to "Episode",
        "All episodes" to "Semua episode",
        "All colors" to "Semua warna",
        "Needs review" to "Perlu ditinjau",
        "Jump to passage" to "Buka bagian",
        "Add bookmark" to "Tambah markah",
        "Remove bookmark" to "Hapus markah",
        "Bookmark saved." to "Markah disimpan.",
        "Bookmark removed." to "Markah dihapus.",
        "Highlight saved." to "Sorotan disimpan.",
        "Note saved." to "Catatan disimpan.",
        "Annotation deleted." to "Catatan dihapus.",
        "Follow global" to "Ikuti global",
        "Follow device" to "Ikuti perangkat",
        "Light" to "Terang",
        "Dark" to "Gelap",
        "Sepia" to "Sepia",
        "Paper" to "Kertas",
        "Green" to "Hijau",
        "Pages" to "Halaman",
        "Scroll" to "Gulir",
        "Single page" to "Satu halaman",
        "Two-page spread" to "Dua halaman",
        "Slide" to "Geser",
        "Fade" to "Pudar",
        "None" to "Tanpa animasi",
        "Top" to "Atas",
        "Center" to "Tengah",
        "Justify" to "Rata kiri-kanan",
        "Left" to "Rata kiri",
        "Right" to "Rata kanan",
        "Auto" to "Otomatis",
        "Portrait" to "Potret",
        "Landscape" to "Lanskap",
        "Font family" to "Jenis huruf",
        "Font size" to "Ukuran huruf",
        "Line height" to "Tinggi baris",
        "Font weight" to "Ketebalan huruf",
        "Paragraph spacing" to "Jarak paragraf",
        "Letter spacing" to "Jarak huruf",
        "First-line indent" to "Indentasi baris pertama",
        "Text alignment" to "Perataan teks",
        "Reading mode" to "Mode baca",
        "Page spread" to "Bentangan halaman",
        "Page animation" to "Animasi halaman",
        "Vertical alignment" to "Posisi vertikal",
        "Horizontal margin" to "Margin samping",
        "Vertical margin" to "Margin atas-bawah",
        "Column width" to "Lebar kolom",
        "Reading brightness" to "Kecerahan baca",
        "Tap edge to turn page" to "Ketuk tepi untuk balik halaman",
        "Keep screen awake" to "Layar tetap menyala",
        "Screen orientation" to "Orientasi layar",
        "Accent color" to "Warna aksen",
        "Text color" to "Warna teks",
        "Paper color" to "Warna kertas",
        "Contrast ratio" to "Rasio kontras",
        "Glass transparency" to "Transparansi kaca",
        "Glass blur" to "Blur kaca",
        "Ambient glow" to "Pendaran ambient",
        "Reset to default" to "Kembalikan ke awal",
        "Focus mode" to "Mode fokus",
        "Exit focus" to "Keluar fokus",
        "Play" to "Putar",
        "Pause" to "Jeda",
        "Stop" to "Berhenti",
        "Restart" to "Ulangi",
        "Voice" to "Suara",
        "Speed" to "Kecepatan",
        "Local" to "Lokal",
        "Online" to "Online",
        "Lookup" to "Cari arti",
        "Translate passage" to "Terjemahkan kutipan",
        "Source language" to "Bahasa sumber",
        "Target language" to "Bahasa tujuan",
        "Replace cover" to "Ganti sampul",
        "Reset cover" to "Sampul asli",
        "Delete book" to "Hapus buku",
        "Restore appearance settings" to "Pulihkan pengaturan tampilan",
        "Up to date" to "Sudah versi terbaru",
        "Update available" to "Pembaruan tersedia",
        "Download & install" to "Unduh & pasang",
        "Install update" to "Pasang pembaruan",
        "Include preview releases" to "Sertakan rilis pratinjau",
        "Loading library…" to "Memuat pustaka…",
        "Opening book…" to "Membuka buku…",
        "Loading episode…" to "Memuat episode…",
        "Importing EPUB…" to "Mengimpor EPUB…"
    )

    private val idToEnExact: Map<String, String> = enToIdExact.entries.associate { (en, id) -> id to en }

    fun normalizeLang(lang: String?): String {
        val v = (lang ?: "id").trim().lowercase()
        return if (v.startsWith("en")) "en" else "id"
    }

    fun t(idText: String, enText: String, lang: String): String {
        return if (normalizeLang(lang) == "en") enText else idText
    }

    fun tr(text: String, lang: String): String {
        val normalized = normalizeLang(lang)
        if (normalized == "id") {
            enToIdExact[text]?.let { return it }
            Regex("^(\\d+)% read$", RegexOption.IGNORE_CASE).matchEntire(text)?.let {
                return "${it.groupValues[1]}% dibaca"
            }
            Regex("^Page (\\d+) of (\\d+)$", RegexOption.IGNORE_CASE).matchEntire(text)?.let {
                return "Halaman ${it.groupValues[1]} dari ${it.groupValues[2]}"
            }
            Regex("^Episode (\\d+) of (\\d+)$", RegexOption.IGNORE_CASE).matchEntire(text)?.let {
                return "Episode ${it.groupValues[1]} dari ${it.groupValues[2]}"
            }
            return text
        } else {
            idToEnExact[text]?.let { return it }
            Regex("^(\\d+)% dibaca$", RegexOption.IGNORE_CASE).matchEntire(text)?.let {
                return "${it.groupValues[1]}% read"
            }
            Regex("^Halaman (\\d+) dari (\\d+)$", RegexOption.IGNORE_CASE).matchEntire(text)?.let {
                return "Page ${it.groupValues[1]} of ${it.groupValues[2]}"
            }
            Regex("^Episode (\\d+) dari (\\d+)$", RegexOption.IGNORE_CASE).matchEntire(text)?.let {
                return "Episode ${it.groupValues[1]} of ${it.groupValues[2]}"
            }
            return text
        }
    }

    fun formatReadingProgressStatus(percentage: Double?, lang: String): String {
        val isEn = normalizeLang(lang) == "en"
        if (percentage == null || percentage <= 0.0) {
            return if (isEn) "Not started" else "Belum dibaca"
        }
        val rounded = kotlin.math.round(percentage).toInt().coerceIn(0, 100)
        if (rounded >= 100) {
            return if (isEn) "Completed" else "Selesai dibaca"
        }
        return if (isEn) "$rounded% read" else "$rounded% dibaca"
    }
}
