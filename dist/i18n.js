// Only interface text is localized. EPUB text and personal writing opt out explicitly.
export const LANGUAGES=['id','en'];
let language='en',observer,onUpdate=()=>{};
const sourceNodes=new WeakMap(),sourceAttributes=new WeakMap();
const english={
 'Wordmark lama':'Classic wordmark','Denyut lembut':'Soft pulse','Titik-titik':'Dots',
 'Ikon & Loading':'Icons & Loading','Ikon':'Icons','Bagian ikon dan loading':'Icon and loading sections',
 'Pilihan diterapkan setelah menekan Gunakan.':'Select an option, then press Use.',
 'Pilihan paket ikon':'Icon packs','Pilihan loading':'Loading styles','Pratinjau loading':'Loading preview',
 'Sedang digunakan':'Currently used','Gunakan':'Use','Coba':'Try',
 'Paket ikon diterapkan.':'Icon pack applied.','Animasi loading diterapkan.':'Loading style applied.',

 'Pilih satu tema untuk aplikasi dan reader.':'Choose one theme for the app and reader.',
 'Mode tampilan':'Display mode','Palet tambahan':'More palettes','Teks dan latar':'Text and background',
 'Spasi dan paragraf':'Spacing and paragraphs','Margin dan kolom':'Margins and column','Layar':'Screen',
 'Alat bantu':'Reading aids','Navigasi':'Navigation','Preferensi membaca':'Reading preferences','Pembaruan & tentang':'Updates & about',
 'Pratinjau ambient dan kaca':'Live ambient and glass preview','Kuat':'Strong','Mati':'Off',
 'Kebeningan':'Clarity','Pekat':'Opaque','Bening':'Clear','Tajam':'Sharp','Buram':'Soft','Kembalikan default':'Restore defaults',
 'Pratinjau kaca langsung di atas latar berwarna':'Live glass preview over a colored background',
 'Tampilan dan bahasa':'Appearance & language','Data dan penyimpanan':'Data & storage','Tentang aplikasi':'About app',
 'Atur spasi, margin, dan navigasi saat membuka buku.':'Adjust spacing, margins, and navigation inside a book.',
 'Ruang tenang untuk koleksi buku pribadi dan cerita berikutnya.':'A quiet place for your personal library and your next chapter.',
 'Versi':'Version','Platform':'Platform',

 'Simpan backup':'Save backup','Pulihkan backup':'Restore backup','Backup disimpan.':'Backup saved.',
 'Backup memuat progres dan catatan. Buku pribadi perlu diimpor ulang.':'Backups include progress and notes. Import personal EPUBs again.',
 'Data digabungkan. Catatan dan progres yang lebih baru di perangkat ini dipertahankan.':'Data is merged. Newer notes and progress on this device are kept.',
 'Pulihkan pengaturan tampilan':'Restore appearance settings','Batal':'Cancel',
 'Progres dan catatan tersimpan di perangkat ini. Buku dari server memerlukan koneksi.':'Progress and notes are saved on this device. Server books require an internet connection.',
 'Menghapus data aplikasi atau browser menghapus data lokal. Simpan backup untuk memindahkannya ke perangkat lain.':'Clearing app or browser data removes local data. Save a backup to move it to another device.',
 'Kertas':'Paper','Hijau':'Green','Kustom':'Custom',
 'Aksi Library':'Library actions',
 'Progres dan catatan tersimpan di browser ini. Buku dari server memerlukan koneksi.':'Progress and notes are saved in this browser. Server books require an internet connection.',
 'Alat':'Tools','Lisensi open-source':'Open-source licenses','Hapus catatan':'Remove note','Hapus highlight':'Delete highlight',
 'Informasi buku':'Book information','Library':'Library','Pengaturan':'Settings','Bahasa':'Language','Bahasa aplikasi':'App language','Hanya mengubah bahasa aplikasi, bukan isi buku.':'Changes the app language only. Books stay in their original language.',
 'Navigasi utama':'Main navigation','Koleksi buku':'Book collection','Geser untuk memilih buku':'Swipe to choose a book','Buku sebelumnya':'Previous book','Buku selanjutnya':'Next book','Pilih buku':'Choose a book','Segarkan koleksi':'Refresh library','Menyiapkan rak buku…':'Loading your library…','Rak belum bisa dibuka':'Unable to load your library','Rak masih kosong':'Your shelf is empty','Koleksi buku akan muncul di sini.':'Your books will appear here.','Coba lagi':'Try again','Menampilkan koleksi tersimpan ·':'Showing saved books ·','Selesai dibaca':'Finished','Belum dibaca':'Not started','Lanjutkan membaca':'Continue reading','Baca buku':'Read book',
 'Tampilan':'Appearance','Tema':'Theme','Terang':'Light','Gelap':'Dark','Sistem':'System','Warna aksen':'Accent color','Pilih warna sendiri':'Choose a custom color','Warna aksen pilihan':'Custom accent color','Membaca':'Reading','Huruf':'Font','Ukuran teks':'Text size','Seleksi kalimat untuk highlight. Aksi salin teks buku dinonaktifkan.':'Select a passage to highlight it. Copying book text is disabled.','Lanjutan':'Advanced','Impor EPUB dari perangkat':'Import an EPUB','Ekspor catatan':'Export notes','Penyimpanan perangkat':'Device storage','Progres dan catatan tersimpan di perangkat ini.':'Progress and notes are saved on this device.',
 'Biru':'Blue','Ungu':'Purple','Awal highlight':'Start of highlight','Akhir highlight':'End of highlight','Pilihan highlight':'Highlight selection','Highlight pilihan teks':'Highlight selected text','Catatan':'Notes','Catatanmu':'Your note','Tulis di sini…':'Write here…','Simpan':'Save','Hapus':'Delete','Dihapus.':'Deleted.','Tutup':'Close','Bookmark':'Bookmark','Daftar isi':'Contents','Tampilan baca':'Reading appearance','Buku ini':'This book','Kembali ke bagian yang kamu simpan.':'Return to a saved passage.','Simpan pikiranmu tentang bagian ini.':'Keep a thought about this passage.','Hapus bookmark':'Remove bookmark','Buka halaman':'Go to page','Buka bagian':'Go to passage','Edit catatan':'Edit note','Posisi catatan perlu ditinjau setelah pembaruan buku.':'This note’s location needs review after the book was updated.','Belum ada bookmark.':'No bookmarks yet.','Belum ada highlight atau catatan.':'No highlights or notes yet.',
 'Kembali ke Library':'Back to Library','Bookmark halaman':'Bookmark page','Halaman buku':'Book page','Nomor halaman':'Page number','Buka menu baca':'Open reading menu','Layar penuh':'Full screen','Masuk layar penuh':'Enter full screen','Keluar layar penuh':'Exit full screen','Halaman sebelumnya':'Previous page','Halaman berikutnya':'Next page','Posisi baca':'Reading position','Menata halaman…':'Preparing pages…','Membuka buku…':'Opening book…','Isi halaman. Tekan H untuk mulai highlight.':'Page text. Press H to start highlighting.',
 'Impor EPUB':'Import EPUB','Tambahkan buku dari perangkat ke rak pribadimu.':'Add a book from your device to your shelf.','Pilih berkas EPUB':'Choose an EPUB file','DRM-free · maksimal 30 MB':'DRM-free · up to 30 MB','Perangkat ini':'This device','Progres, catatan, dan buku yang sudah dibuka tersimpan di browser ini.':'Your progress, notes, and opened books are saved in this browser.','Penyimpanan aktif':'Storage available','Penyimpanan tidak tersedia':'Storage unavailable','Menghapus data browser juga menghapus data lokal. Ekspor catatan untuk menyimpan salinannya.':'Clearing browser data also removes your local library. Export your notes to keep a copy.',
 'Layar penuh belum didukung browser ini.':'This browser does not support full screen.','Browser tidak mengizinkan layar penuh.':'The browser did not allow full screen.','Penyimpanan perangkat tidak tersedia. Progres mungkin tidak tersimpan.':'Device storage is unavailable. Your progress may not be saved.','Penyimpanan perangkat tidak tersedia.':'Device storage is unavailable.','Bookmark dihapus.':'Bookmark removed.','Halaman ditandai.':'Page bookmarked.','Catatan tersimpan.':'Note saved.','Highlight tersimpan.':'Highlight saved.','Catatan diekspor.':'Notes exported.','Buku ini sudah ada di rak.':'This book is already on your shelf.','Buku ditambahkan ke rak.':'Book added to your shelf.','Berkas tidak dapat dibuka.':'Unable to open this file.','Pilih berkas .epub.':'Choose an .epub file.','Ukuran maksimal 30 MB.':'The maximum file size is 30 MB.','Penyimpanan perangkat penuh atau tidak tersedia.':'Device storage is full or unavailable.','Alamat buku tidak valid.':'The book URL is invalid.','Buku diperbarui. Segarkan koleksi dan buka lagi.':'The book has changed. Refresh your library and open it again.','Koneksi ke koleksi buku gagal. Coba lagi.':'Unable to connect to your library. Try again.','Berkas lebih besar dari 30 MB.':'This file is larger than 30 MB.','Format koleksi tidak valid.':'The library format is invalid.','Data buku tidak lengkap.':'Some book details are missing.','Periksa koneksi internet, lalu coba lagi.':'Check your internet connection and try again.','Buku tidak tersedia.':'This book is unavailable.','Buku belum bisa dibuka.':'Unable to open this book.','Posisi catatan ini perlu ditinjau setelah pembaruan buku.':'This note’s location needs review after the book was updated.','Rak belum bisa dibuka. Coba segarkan halaman.':'Unable to load your library. Try refreshing the page.','Ukuran teks terlalu besar untuk area baca. Kecilkan teks atau putar layar.':'The text is too large for this screen. Reduce the text size or rotate your device.','Halaman tidak dapat ditata untuk ukuran layar ini.':'Unable to lay out a page for this screen size.'
};
const parserErrors={
 'Invalid KataKecil backup.':'Backup KataKecil tidak valid.',
 'Backup is larger than 8 MB.':'Ukuran backup lebih dari 8 MB.',
 'Storage is unavailable. Keep your backup and try again.':'Penyimpanan tidak tersedia. Simpan berkas backup dan coba lagi.',
 'Reading data was imported, but settings could not be saved.':'Data bacaan dipulihkan, tetapi pengaturan gagal disimpan.',
 'A note ID belongs to another book. Nothing was imported.':'ID catatan berbenturan dengan buku lain. Tidak ada data yang diimpor.',
 'Orientation lock is unavailable. Rotate your device manually.':'Kunci orientasi tidak tersedia. Putar perangkat secara manual.',
 'Storage is unavailable. Export your notes before closing this tab.':'Penyimpanan tidak tersedia. Ekspor catatan sebelum menutup tab ini.',
 'Original quotation is kept in your annotation export.':'Kutipan asli tersimpan dalam ekspor anotasi Anda.',
 'Select between 1 and 4,000 characters.':'Pilih antara 1 hingga 4.000 karakter.',
 'Select a single word to look it up.':'Pilih satu kata untuk mencari artinya.',
 'Select a shorter passage (up to 450 UTF-8 bytes).':'Pilih teks lebih pendek (maksimal 450 byte UTF-8).',
 'No definition was found for this word.':'Definisi kata ini tidak ditemukan.',
 'Dictionary lookup supports English and Indonesian.':'Kamus mendukung bahasa Inggris dan Indonesia.',
 'Choose two different supported languages.':'Pilih dua bahasa berbeda yang didukung.',
 'The service is unavailable or its request limit was reached.':'Layanan tidak tersedia atau batas permintaan tercapai.',
 'Translation is unavailable or its free request limit was reached.':'Terjemahan tidak tersedia atau batas gratis tercapai.',
 'No speech voices are available on this device.':'Tidak ada suara pembaca di perangkat ini.',
 'No voice is installed for this language. Choose an available voice.':'Suara untuk bahasa ini belum terpasang. Pilih suara yang tersedia.',
 'Screen Wake Lock is not supported by this browser.':'Browser ini tidak mendukung layar tetap menyala.',
 'Published content is unavailable. Please retry online.':'Konten terbit tidak tersedia. Coba lagi saat daring.',
 'Book changed. Refresh the library and open it again.':'Buku berubah. Segarkan Library lalu buka kembali.',
 'This book is no longer published.':'Buku ini tidak lagi diterbitkan.',
 'Publication changed. Reopen the book to load its published episodes.':'Publikasi berubah. Buka ulang buku untuk memuat episode terbit.',

 'This EPUB is larger than 30 MB. Please choose a smaller file.':'Ukuran EPUB lebih dari 30 MB. Pilih berkas yang lebih kecil.',
 'This EPUB is too large to safely open in the browser.':'EPUB ini terlalu besar untuk dibuka di browser.',
 'Encrypted or DRM-protected EPUBs are not supported. Please use a DRM-free edition.':'EPUB terenkripsi atau dengan DRM belum didukung. Gunakan edisi tanpa DRM.',
 'The EPUB contains an invalid XML document.':'Struktur XML EPUB tidak valid.',
 'An essential EPUB file is missing. Please try another edition.':'Ada berkas penting EPUB yang hilang. Coba edisi lain.',
 'This file does not contain a valid EPUB package.':'Berkas ini bukan paket EPUB yang valid.',
 'No readable text was found. Image-only and fixed-layout EPUBs are not supported.':'Tidak ditemukan teks yang dapat dibaca. EPUB gambar atau tata letak tetap belum didukung.'
};
export function getUiLanguage(){return language;}
export function translatePhrase(value,locale=language){
 const original=String(value),core=original.trim();if(!core)return original;let text=core;
 if(locale==='id')text=parserErrors[core]||core;
 else if(english[core])text=english[core];
 else {
  const rules=[
   [/^(\d+) dari (\d+): ([\s\S]*)$/,(_,a,b,title)=>`${a} of ${b}: ${title}`],
   [/^Buku (\d+): ([\s\S]*)$/,(_,n,title)=>`Book ${n}: ${title}`],
   [/^Baca ([\s\S]+)$/,(_,title)=>`Read ${title}`],
   [/^Sampul ([\s\S]+)$/,(_,title)=>`Cover of ${title}`],
   [/^Halaman (\d+) dari (\d+)$/,(_,a,b)=>`Page ${a} of ${b}`],
   [/^Halaman (\d+)$/,(_,a)=>`Page ${a}`],
   [/^(\d+)% dibaca$/,(_,n)=>`${n}% read`],
   [/^Aksen (.+)$/,(_,color)=>`Accent: ${english[color]||color}`],
   [/^Warna (.+)$/,(_,color)=>`Color: ${english[color]||color}`]
  ];
  for(const [pattern,replace] of rules)if(pattern.test(core)){text=core.replace(pattern,replace);break;}
 }
 return original.slice(0,original.length-original.trimStart().length)+text+original.slice(original.trimEnd().length);
}
const protectedText=element=>element?.closest?.('[data-book-content],[data-no-translate],script,style,textarea,code');
function textNode(node){if(protectedText(node.parentElement))return;const current=node.nodeValue;let record=sourceNodes.get(node);if(!record||record.last!==current)record={source:current};const next=translatePhrase(record.source);if(next!==current)node.nodeValue=next;sourceNodes.set(node,{source:record.source,last:next});}
function attributes(element){
 for(const attribute of ['aria-label','title','placeholder','alt']){
  if(!element.hasAttribute?.(attribute))continue;const current=element.getAttribute(attribute);let map=sourceAttributes.get(element);if(!map){map=new Map();sourceAttributes.set(element,map);}let record=map.get(attribute);if(!record||record.last!==current)record={source:current};const next=translatePhrase(record.source);if(next!==current)element.setAttribute(attribute,next);map.set(attribute,{source:record.source,last:next});
 }
}
export function localizeUI(root){
 if(!root)return;if(root.nodeType===3){textNode(root);return;}if(root.nodeType!==1)return;
 attributes(root);for(const element of root.querySelectorAll('[aria-label],[title],[placeholder],[alt]'))attributes(element);
 const walker=root.ownerDocument.createTreeWalker(root,4);let node;while(node=walker.nextNode())textNode(node);
}
export function setUiLanguage(locale){language=LANGUAGES.includes(locale)?locale:'en';if(typeof document!=='undefined'){document.documentElement.lang=language;localizeUI(document.body);onUpdate();}}
export function startUiTranslations(callback=()=>{}){
 onUpdate=callback;observer?.disconnect();localizeUI(document.body);
 observer=new document.defaultView.MutationObserver(records=>{for(const record of records){if(record.type==='attributes')attributes(record.target);else for(const node of record.addedNodes)localizeUI(node);}onUpdate();});
 observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['aria-label','title','placeholder','alt']});
}
