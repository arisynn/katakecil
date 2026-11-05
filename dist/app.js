import {loadingPreviews} from './loading-previews.js?v=4';
import {loadingLogo} from './loading-logo.js?v=3';
import {installPageScrubber} from './page-scrubber.js?v=1';
import {enterSheet,leaveSheet,animateIcon} from './motion.js?v=1';
import {createReaderZoom} from './reader-zoom.js?v=1';
import {layoutDialog,installAccordionReveal,scheduleSheetFit} from './panel-layout.js?v=3';
import {APP_INFO} from './app-info.js?v=1';
import {installGlassTabs} from './glass-tabs.js?v=3';
import {createAppUpdater} from './app-updates.js?v=3';
import {installAppPopups} from './app-popups.js?v=14';
import {parseEpub,PARSER_REVISION} from './epub.js?v=7';
import {relocateAnchor} from './anchors.js?v=4';
import {paginateToFit} from './pagination.js?v=8';
import {CATALOG_URL,CATALOG_CACHE_KEY} from './config.js?v=8';
import {$,$$,escapeHTML,icon,actionButton,brandMark} from './ui.js?v=12';
import * as Store from './store.js?v=15';
import {setUiLanguage,startUiTranslations,translatePhrase} from './i18n.js?v=12';
import {createTextSelection,wordBounds} from './text-selection.js?v=8';
import {normalizePublishedCatalog,fetchPublishedBook,findPage,makeAnchor,prepareChapters,globalPalette,contrast} from './advanced-reader.js?v=12';
import {createReaderExperience} from './reader-experience.js?v=22';
import {isNativeApp,nativeUpdates,nativeSpeechDriver,createNativeWakeLock,saveJSON,toggleNativeFullscreen,nativeFullscreen,resetNativeScreen,setReaderOrientation,updateSystemTheme,listenNativeLifecycle,installBackNavigation} from './platform.js?v=2';
import {createBackup,parseBackup,BACKUP_MAX_BYTES} from './device-backup.js?v=1';
const app=$('#app'),overlay=$('#overlay-root');
const ACTIVE_READER_KEY='katakecil_active_reader';
const rememberReader=id=>Store.writeLocal(ACTIVE_READER_KEY,id?{bookId:id}:null);
const readerZoom=createReaderZoom(()=>$('#reading-page'));
const popups=installAppPopups(document);
installGlassTabs(document);
installAccordionReveal(document);
const updates=createAppUpdater({enabled:isNativeApp,api:nativeUpdates,language:()=>p().uiLanguage,show:showOverlay,heading:dialogHeading,lastCheck:()=>readLocal('katakecil_update_checked',0),saveCheck:date=>Store.writeLocal('katakecil_update_checked',date)});
const colors={amber:'#e7ca7e',emerald:'#a4c9ae',sapphire:'#acc7e6',rose:'#e4b3c3'};
const accents=[['#54756c','Sage'],['#4269a5','Biru'],['#82669c','Ungu'],['#a15e73','Rose'],['#a07732','Amber'],['#58616e','Graphite']];
let books=[],catalogState='loading',catalogError='',catalogOffline=false,view='library';
let activeLibraryId='',carouselObserver=null,carouselTimer;
let currentBook=null,pages=[],pageIndex=0,readerMode='reading',readingRequest=0,layoutRequest=0;
let selectedRange=null,noteDraftRange=null,editingAnnotation=null,noteColor='amber',drawerTab='contents',previousFocus=null;
let customSelection;
let deferredEditorReflow=false;
let toastTimer,resizeTimer,ignoreClickUntil=0,pointerStart=null,touchState=null,reflowing=false;
const percentage=id=>Math.round(Store.progress[id]?.percentage||0);
const notesFor=id=>Store.annotations.filter(a=>a.bookId===id);
const p=()=>Store.preferences;
const features=createReaderExperience({
 speechDriver:nativeSpeechDriver,wakeLock:createNativeWakeLock(),setOrientation:setReaderOrientation,
 book:()=>currentBook,pages:()=>pages,index:()=>pageIndex,prefs:p,annotations:()=>Store.annotations,progress:id=>Store.progress[id],
 savePreferences:Store.updatePreferences,resetReadingPreferences:Store.resetReadingPreferences,saveAnnotation:Store.saveAnnotation,saveSpeech:tts=>{if(currentBook)Store.saveProgress({...Store.progress[currentBook.id],bookId:currentBook.id,tts});},
 goPage:goToPage,reflow,paint:updatePage,persist:persistPosition,apply:applyPreferences,show:showOverlay,close:closeOverlay,heading:dialogHeading,mode:setReaderMode,toast,selection:()=>selectedRange,clearSelection:removeSelection,download,
 syncIndex:index=>{if(index>=0){pageIndex=index;syncPageControls();}},
});
const scrubber=installPageScrubber(document,{
 enabled:()=>!!currentBook&&pages.length>0&&!reflowing,
 snapshot:()=>({index:pageIndex,position:{...features.position()}}),begin:()=>{features.stopSpeech();removeSelection();},
 preview:(index,origin)=>{if(!currentBook||!pages[index])return;if(index===pageIndex&&!origin)return;pageIndex=index;features.setPosition(origin?.position||{chapterIndex:pages[index].chapterIndex,start:pages[index].start});updatePage();},
 save:persistPosition,active:value=>{const shell=$('.reader-shell');if(shell){if(value)shell.dataset.scrubbing='true';else delete shell.dataset.scrubbing;}}
});
let publicationCheck=null;
const selectedBook=()=>books.find(b=>b.id===activeLibraryId)||books[0];
function toast(message){const el=$('#toast');el.textContent=message;el.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('visible'),3000);}
function theme(){if(p().themeMode==='system'||p().themeMode==='auto-sensor')return matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';return p().themeMode;}
function applyPreferences(){
 setUiLanguage(p().uiLanguage||'en');lastTextPreferences=features.signature();
 const palette=globalPalette(p(),matchMedia('(prefers-color-scheme: dark)').matches);document.body.dataset.theme=palette.dark?'dark':'light';document.body.dataset.palette=palette.key;document.body.style.colorScheme=palette.dark?'dark':'light';for(const [key,value] of Object.entries(palette.variables))document.body.style.setProperty(key,value);
 const s=document.documentElement.style,accent=/^#[a-f\d]{6}$/i.test(p().accentColor)?p().accentColor:'#54756c';
 s.setProperty('--accent',accent);s.setProperty('--g-active-ink',contrast(accent,palette.background)>=4.5?accent:palette.text);const rgb=[1,3,5].map(i=>parseInt(accent.slice(i,i+2),16));s.setProperty('--accent-rgb',rgb.join(','));
 const luminance=rgb.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);
 s.setProperty('--accent-ink',luminance>.35?'#151918':'#ffffff');
 s.setProperty('--reader-font',['DM Sans','Plus Jakarta Sans'].includes(p().fontFamily)?'system-ui,sans-serif':"'Lora',Georgia,serif");
 s.setProperty('--reader-size',`${Math.max(14,Math.min(32,p().fontSize))}px`);s.setProperty('--reader-line',String(Math.max(1.4,Math.min(2,p().lineHeight))));
 $('meta[name="theme-color"]').content=palette.background;
 features.apply();void updateSystemTheme(palette.dark).catch(()=>{});
}
function shell(content,page='library'){
 return `<main class="personal-shell ${page==='library'?'library-shell':'settings-shell'}">${content}</main>`;
}
function genericCover(title,author=''){
 const words=title.slice(0,70).split(' '),lines=[''];for(const word of words){if((lines.at(-1)+' '+word).length>17)lines.push(word);else lines[lines.length-1]+=(lines.at(-1)?' ':'')+word;}
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 440"><rect width="300" height="440" fill="#b4bcae"/><rect x="22" y="22" width="256" height="396" fill="none" stroke="#f6efde" opacity=".6"/><path d="M90 290q30-14 60 0 30-14 60 0v-65q-30-14-60 0-30-14-60 0zm60-65v65" fill="none" stroke="#faf8ed" stroke-width="2"/>${lines.slice(0,5).map((l,i)=>`<text x="150" y="${85+i*32}" text-anchor="middle" font-size="25" font-family="Georgia,serif" fill="#fffdf5">${escapeHTML(l)}</text>`).join('')}<text x="150" y="385" text-anchor="middle" font-size="12" font-family="Georgia,serif" fill="#fffdf5">${escapeHTML(author.slice(0,35))}</text></svg>`;
 return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
}
function bookCard(book,index){
 return `<article class="shelf-book ${book.id===activeLibraryId?'is-current':''}" data-book-id="${escapeHTML(book.id)}" aria-label="${index+1} dari ${books.length}: ${escapeHTML(book.title)}"><button class="cover-button" data-action="open" data-id="${escapeHTML(book.id)}" aria-label="Baca ${escapeHTML(book.title)}"><img class="book-cover" src="${escapeHTML(book.cover||genericCover(book.title,book.author))}" alt="Sampul ${escapeHTML(book.title)}" ${index===0?'fetchpriority="high"':'loading="lazy"'} draggable="false"></button></article>`;
}
function libraryBody(){
 if(catalogState==='loading')return `<div class="library-loading" role="status" aria-label="${p().uiLanguage==='id'?'Menyiapkan rak buku':'Loading your library'}">${loadingLogo()}</div>`;
 if(!books.length)return `<div class="empty-state">${icon('bookOpen')}<h2>${catalogState==='error'?'Rak belum bisa dibuka':'Rak masih kosong'}</h2><p>${escapeHTML(catalogError||'Koleksi buku akan muncul di sini.')}</p><button class="secondary" data-action="refresh">Coba lagi</button></div>`;
 return `<section class="shelf" aria-label="Koleksi buku"><div class="book-carousel" id="book-carousel" tabindex="0" aria-label="Geser untuk memilih buku">${books.map(bookCard).join('')}</div><div class="shelf-navigation"><button class="icon-button" data-action="carousel-prev" aria-label="Buku sebelumnya">${icon('left')}</button><div class="shelf-dots" role="group" aria-label="Pilih buku">${books.map((b,i)=>`<button data-action="select-book" data-id="${escapeHTML(b.id)}" aria-label="Buku ${i+1}: ${escapeHTML(b.title)}" aria-pressed="${b.id===activeLibraryId}" class="shelf-dot ${b.id===activeLibraryId?'active':''}"><span></span></button>`).join('')}</div><button class="icon-button" data-action="carousel-next" aria-label="Buku selanjutnya">${icon('chevron')}</button></div><div class="shelf-action" id="shelf-action">${shelfAction()}</div>${catalogOffline?'<p class="offline-label">Menampilkan koleksi tersimpan · <button data-action="refresh">Coba lagi</button></p>':''}</section>`;
}
function shelfAction(){const b=selectedBook();if(!b)return '';const saved=Store.progress[b.id];return `<p class="reading-status">${saved?percentage(b.id)===100?'Selesai dibaca':`${percentage(b.id)}% dibaca`:'Belum dibaca'}</p><button class="primary read-button" data-action="open" data-id="${escapeHTML(b.id)}">${saved?'Lanjutkan membaca':'Baca buku'} ${icon('arrow')}</button>`;}
function renderLibrary(){
 disconnectCarousel();view='library';currentBook=null;document.body.classList.remove('is-reading');document.body.classList.add('is-library');document.title='Library · KataKecil';
 if(!books.some(b=>b.id===activeLibraryId))activeLibraryId=books[0]?.id||'';
 app.innerHTML=shell(`<header class="library-header"><div class="library-heading"><div class="header-brand-space" aria-hidden="true"></div><h1>Library</h1></div><div class="library-header-actions" role="group" aria-label="Aksi Library">${actionButton('refresh','refresh','Segarkan koleksi')}${actionButton('settings','sliders','Pengaturan')}</div></header>${libraryBody()}`);
 $('.library-header [data-action=refresh]')?.setAttribute('aria-busy',String(catalogState==='loading'));connectCarousel();
}
function disconnectCarousel(){carouselObserver?.disconnect();clearTimeout(carouselTimer);}
function connectCarousel(){const el=$('#book-carousel');if(!el)return;el.addEventListener('scroll',()=>{clearTimeout(carouselTimer);carouselTimer=setTimeout(()=>{
 const center=el.getBoundingClientRect().left+el.clientWidth/2;let best=null,distance=Infinity;
 $$('.shelf-book',el).forEach(card=>{const r=card.getBoundingClientRect(),d=Math.abs(r.left+r.width/2-center);if(d<distance){best=card;distance=d;}});if(best)selectBook(best.dataset.bookId,false);
 },90);},{passive:true});requestAnimationFrame(()=>scrollToSelected(false));}
function scrollToSelected(smooth=true){const el=$('#book-carousel'),card=$$('.shelf-book').find(c=>c.dataset.bookId===activeLibraryId);if(!el||!card)return;const left=card.offsetLeft-(el.clientWidth-card.offsetWidth)/2;if(el.scrollTo)el.scrollTo({left,behavior:smooth&&!matchMedia('(prefers-reduced-motion: reduce)').matches?'smooth':'instant'});else el.scrollLeft=left;}
function selectBook(id,scroll=true){if(!books.some(b=>b.id===id))return;activeLibraryId=id;Store.writeLocal('lumina_selected_book',id);$$('.shelf-book').forEach(c=>c.classList.toggle('is-current',c.dataset.bookId===id));$$('.shelf-dot').forEach(c=>{c.classList.toggle('active',c.dataset.id===id);c.setAttribute('aria-pressed',String(c.dataset.id===id));});if($('#shelf-action'))$('#shelf-action').innerHTML=shelfAction();if(scroll)scrollToSelected();}
function renderSettings(){
 rememberReader(null);disconnectCarousel();view='settings';currentBook=null;document.body.classList.remove('is-reading','is-library');document.title='Pengaturan · KataKecil';
 app.innerHTML=shell(`<header class="settings-header"><div class="header-brand-space" aria-hidden="true"></div><div class="settings-title-row"><h1>Pengaturan</h1><button class="header-back" data-action="library" aria-label="Kembali ke Library">${icon('left')}<span>Library</span></button></div></header><div class="settings-content">
 <section class="settings-group"><h2>${icon('appearance')} Tampilan dan bahasa</h2><div class="settings-surface">
 <div class="setting-row"><label class="setting-label" for="app-language">${icon('globe')}Bahasa aplikasi</label><select id="app-language" class="language-select" aria-label="Bahasa aplikasi"><option value="id" ${p().uiLanguage!=='en'?'selected':''}>Bahasa Indonesia</option><option value="en" ${p().uiLanguage==='en'?'selected':''}>English</option></select></div>
 <button class="settings-link global-theme-link" data-action="global-theme"><span class="setting-label">${icon('appearance')}Tema</span><span id="global-theme-summary">${({light:'Terang',dark:'Gelap',system:'Sistem',sepia:'Sepia',paper:'Kertas',green:'Hijau',custom:'Kustom'})[p().themeMode]||'Terang'}</span>${icon('chevron')}</button>
 <div class="setting-row accent-row"><span class="setting-label">${icon('palette')}Warna aksen</span><div class="accent-options">${accents.map(([color,name])=>`<button class="accent-swatch ${p().accentColor===color?'selected':''}" style="--swatch:${color}" data-action="accent" data-value="${color}" aria-label="Aksen ${name}" aria-pressed="${p().accentColor===color}">${icon('check')}</button>`).join('')}<label class="custom-accent" title="Pilih warna sendiri">${icon('plus')}<input type="color" id="accent-custom" aria-label="Warna aksen pilihan" value="${p().accentColor}"></label></div></div></div></section>
 <section class="settings-group"><h2>${icon('bookOpen')} Membaca</h2><div class="settings-surface"><div class="setting-row"><span class="setting-label">${icon('type')}Huruf</span><div class="segmented">${[['Lora','Serif'],['Plus Jakarta Sans','Sans']].map(([v,l])=>`<button data-action="font" data-value="${v}" class="${p().fontFamily===v?'active':''}">${icon('type')}<span>${l}</span></button>`).join('')}</div></div><div class="setting-row font-range"><label for="settings-font-size"><span class="setting-label">${icon('textSize')}Ukuran teks</span><output id="font-size-output">${p().fontSize}</output></label><input type="range" id="settings-font-size" min="14" max="32" step="1" value="${p().fontSize}" aria-label="Ukuran teks"></div></div></section>
 <section class="settings-group"><h2>${icon('shield')} Data dan penyimpanan</h2><div class="settings-surface">
 <button class="settings-link" data-action="backup-export"><span class="setting-label">${icon('download')}Simpan backup</span>${icon('chevron')}</button>
 <button class="settings-link" data-action="backup-import"><span class="setting-label">${icon('upload')}Pulihkan backup</span>${icon('chevron')}</button>
 <button class="settings-link" data-action="export-notes"><span class="setting-label">${icon('notes')}Ekspor catatan</span>${icon('chevron')}</button>
 <button class="settings-link" data-action="status"><span class="setting-label">${icon('device')}Penyimpanan perangkat</span>${icon('chevron')}</button></div>
 <details class="advanced-settings"><summary><span class="setting-label">${icon('sliders')}Lanjutan</span>${icon('chevron')}</summary><div class="settings-surface"><button class="settings-link" data-action="import"><span class="setting-label">${icon('upload')}Impor EPUB dari perangkat</span>${icon('chevron')}</button><button class="settings-link" data-action="loading-previews"><span class="setting-label">${icon('sparkle')}${p().uiLanguage==='id'?'Pratinjau loading':'Loading preview'}</span>${icon('chevron')}</button><button class="settings-link" data-action="about"><span class="setting-label">${icon('bookOpen')}Tentang aplikasi</span><span class="settings-value" data-book-content translate="no">${escapeHTML(APP_INFO.version)}</span>${icon('chevron')}</button>${isNativeApp?`<button class="settings-link" data-action="updates"><span class="setting-label">${icon('download')}${p().uiLanguage==='id'?'Pembaruan aplikasi':'App updates'}</span><span class="update-summary" id="app-update-summary">${escapeHTML(updates.summary())}</span>${icon('chevron')}</button>`:''}</div></details></section>
 </div>`,'settings');
}
async function fetchLimited(url,type='buffer'){
 const target=new URL(url,location.href);if(!['https:','http:'].includes(target.protocol))throw Error('Alamat buku tidak valid.');
 const response=await fetch(target,{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(30000),credentials:'omit',referrerPolicy:'no-referrer'});
 if(!response.ok)throw Error(response.status===409?'Buku diperbarui. Segarkan koleksi dan buka lagi.':'Koneksi ke koleksi buku gagal. Coba lagi.');
 const limit=30*1024*1024;if(Number(response.headers.get('content-length'))>limit)throw Error('Berkas lebih besar dari 30 MB.');
 if(!response.body)return type==='json'?response.json():response.arrayBuffer();
 const reader=response.body.getReader(),chunks=[];let length=0;
 while(true){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>limit){await reader.cancel();throw Error('Berkas lebih besar dari 30 MB.');}chunks.push(value);}
 const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 return type==='json'?JSON.parse(new TextDecoder().decode(bytes)):bytes.buffer;
}
export function normalizeCatalog(manifest,base=CATALOG_URL){return normalizePublishedCatalog(manifest,base);}
async function loadCatalog(){
 catalogState='loading';catalogError='';if(view==='library')renderLibrary();
 try{const manifest=await fetchLimited(CATALOG_URL+'?action=catalog','json');const fresh=normalizeCatalog(manifest);const stored=await Store.dbGetAll('books');
  // Purge legacy downloaded server manuscripts. Only user-imported books are kept offline.
  for(const cached of stored.filter(b=>b.source!=='local')){
   const saved=Store.progress[cached.id],chapter=cached.chapters?.[saved?.chapterIndex];
   if(saved&&!saved.anchor&&chapter?.text.length){const start=Math.min(chapter.text.length-1,saved.charOffset||0);Store.saveProgress({...saved,legacySourceAnchor:true,anchor:makeAnchor(chapter,start,Math.min(chapter.text.length,start+80))});}
   for(const a of notesFor(cached.id).filter(a=>!a.anchor)){const ch=cached.chapters?.[a.chapterIndex],start=a.startOffset??a.charOffset??0,end=a.type==='highlight'?a.endOffset:Math.min(ch?.text.length||0,start+80);if(ch&&end>start&&end-start<=4000)Store.saveAnnotation({...a,legacySourceAnchor:true,anchor:makeAnchor(ch,start,end)});}
   await Store.dbDelete('books',cached.id);
  }
  books=fresh.map(b=>{const memory=books.find(s=>s.id===b.id&&s.version===b.version&&s.source==='supabase');return memory?{...memory,...b}:b;});books.push(...stored.filter(b=>b.source==='local'));Store.writeLocal(CATALOG_CACHE_KEY,fresh);catalogState='ready';catalogOffline=false;
 }catch(error){const cached=readLocal(CATALOG_CACHE_KEY,[]),stored=await Store.dbGetAll('books');books=cached.map(({chapters,epubBuffer,...metadata})=>metadata);books.push(...stored.filter(b=>b.source==='local'));catalogState=books.length?'ready':'error';catalogOffline=books.length>0;catalogError='Periksa koneksi internet, lalu coba lagi.';}
 if(view==='library')renderLibrary();
}
function readLocal(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}}
async function ensureBook(id){
 let book=books.find(b=>b.id===id);if(!book)throw Error('Buku tidak tersedia.');
 if(book.source==='supabase'){
  const manifest=normalizeCatalog(await fetchLimited(CATALOG_URL+'?action=catalog','json'));
  const fresh=manifest.find(b=>b.id===id);if(!fresh)throw Error('This book is no longer published.');
  const bytes=await fetchPublishedBook(fresh);const parsed=await parseEpub(bytes,book.title);
  if(parsed.chapters.some(ch=>!fresh.sectionIds.some(section=>ch.href.split('/').pop()==='section-'+section+'.xhtml')))throw Error('The publication contains an unverified episode.');
  const verified=normalizeCatalog(await fetchLimited(CATALOG_URL+'?action=catalog','json')).find(b=>b.id===id);
  if(!verified||verified.version!==fresh.version)throw Error('Book changed. Refresh the library and open it again.');
  if(book.chapters&&book.parsedRevision!==PARSER_REVISION)migrateSavedAnchors(id,book.chapters,parsed.chapters);
  book={...fresh,...parsed,chapters:await prepareChapters(parsed.chapters),title:fresh.title,author:fresh.author,parsedRevision:PARSER_REVISION};
  books=books.map(b=>b.id===id?book:b);return book;
 }
 if(book.chapters&&book.parsedRevision===PARSER_REVISION){if(book.chapters.some(ch=>!ch.contentHash))book={...book,chapters:await prepareChapters(book.chapters)};return book;}
 if(book.source==='local'&&!book.epubBuffer){book={...book,parsedRevision:PARSER_REVISION,chapters:await prepareChapters(book.chapters.map(ch=>({...ch,title:/^Section\s*\d+$/i.test(ch.title)?'':ch.title.replace(/^(?:bab|chapter|episode|bagian)\s*(?:\d+|[ivxlcdm]+)[\s.:—–-]*/i,'')})))};return book;}
 const parsed=await parseEpub(book.epubBuffer||await fetchLimited(book.url),book.title);
 if(book.chapters)migrateSavedAnchors(id,book.chapters,parsed.chapters);
 book={...book,...parsed,chapters:await prepareChapters(parsed.chapters),title:book.title,author:book.author,parsedRevision:PARSER_REVISION};books=books.map(b=>b.id===id?book:b);await Store.dbPut('books',book);return book;
}
async function validatePublication(){
 if(!currentBook||currentBook.source!=='supabase'||publicationCheck)return;
 const book=currentBook;
 publicationCheck=(async()=>{try{const latest=normalizeCatalog(await fetchLimited(CATALOG_URL+'?action=catalog','json')).find(b=>b.id===book.id);if(currentBook!==book)return;if(!latest||latest.version!==book.version)throw Error('Publication changed. Reopen the book to load its published episodes.');}
 catch(error){if(currentBook===book){navigateLibrary();toast(error.message||'Connect to verify this publication.');}}})();
 try{await publicationCheck;}finally{publicationCheck=null;}
}
function pageMarkup(page,index,measurement=false){
 const chapter=currentBook.chapters[page.chapterIndex];
 return `<div class="page-inner"><div class="page-heading" data-book-content translate="no" ${page.start!==0||(!chapter.title&&!chapter.chapterLabel)?'hidden':''}>${chapter.chapterLabel?`<p class="chapter-label">${escapeHTML(chapter.chapterLabel)}</p>`:''}<h1 ${!chapter.title?'hidden':''}>${escapeHTML(chapter.title)}</h1></div><div class="page-text" data-book-content translate="no" tabindex="0" aria-label="Isi halaman. Tekan H untuk mulai highlight." lang="${escapeHTML(currentBook.language||'id')}" ${measurement?'':`data-page="${index}"`}>${measurement?'':markedText(page)}</div><div class="page-number" aria-label="Nomor halaman">${measurement?'':index+1}</div></div>`;
}
function mountReader(){
 rememberReader(currentBook.id);disconnectCarousel();document.body.classList.remove('is-library');document.body.classList.add('is-reading');view='reader';readerMode='reading';document.title=`${currentBook.title} · KataKecil`;
 app.innerHTML=`<main class="reader-shell" data-mode="reading"><header class="reader-toolbar glass" inert aria-hidden="true"><button class="icon-button" data-action="library" aria-label="Kembali ke Library">${icon('back')}</button><span class="reader-title" data-book-content translate="no">${escapeHTML(currentBook.title)}</span><button class="icon-button" data-action="bookmark" aria-label="Bookmark halaman">${icon('bookmark')}</button></header><div class="reader-stage"><article class="reading-page" id="reading-page" aria-label="Halaman buku">${pageMarkup({chapterIndex:0,start:0,end:0},0,true)}</article></div><button class="reader-menu-trigger" data-action="show-controls" aria-label="Buka menu baca">${icon('more')}</button><footer class="reader-controls glass" inert aria-hidden="true"><div class="reader-tool-actions"><button data-action="contents">${icon('list')}<span>Daftar isi</span></button><button data-action="appearance">${icon('type')}<span>Tampilan</span></button><button data-action="reader-tools">${icon('sliders')}<span>Alat</span></button><button data-action="fullscreen" aria-label="Masuk layar penuh" aria-pressed="false">${icon('expand')}<span>Layar penuh</span></button></div><div class="scrubber-row"><button class="icon-button" data-action="prev" aria-label="Halaman sebelumnya">${icon('left')}</button><label><span class="sr-only">Posisi baca</span><input type="range" id="page-scrubber" min="0" max="1" value="0" aria-label="Posisi baca"></label><button class="icon-button" data-action="next" aria-label="Halaman berikutnya">${icon('chevron')}</button></div><div class="reader-progress"><span id="page-counter"></span><span id="reading-percent"></span></div></footer><div class="reader-loading" role="status" aria-label="${p().uiLanguage==='id'?'Menata halaman':'Preparing pages'}">${loadingLogo()}</div></main>`;
}
function migrateSavedAnchors(bookId,oldChapters,newChapters){
 const saved=Store.progress[bookId];if(saved){const moved=relocateAnchor(oldChapters,newChapters,saved.chapterIndex,saved.charOffset||0);Store.saveProgress({...saved,...moved,anchorBeforeV3:saved.anchorBeforeV3||{chapterIndex:saved.chapterIndex,charOffset:saved.charOffset},parserRevision:PARSER_REVISION});}
 for(const annotation of [...Store.annotations].filter(a=>a.bookId===bookId)){const moved=relocateAnchor(oldChapters,newChapters,annotation.chapterIndex,annotation.charOffset??annotation.startOffset??0,annotation.selectedText||'');const original=annotation.anchorBeforeV3||{chapterIndex:annotation.chapterIndex,charOffset:annotation.charOffset,startOffset:annotation.startOffset,endOffset:annotation.endOffset};Store.saveAnnotation(moved?{...annotation,...moved,...(annotation.type==='highlight'?{startOffset:moved.charOffset,endOffset:moved.charOffset+annotation.selectedText.length}:{}),needsReview:false,anchorBeforeV3:original,parserRevision:PARSER_REVISION}:{...annotation,needsReview:true,anchorBeforeV3:original,parserRevision:PARSER_REVISION});}
}
function fullscreenElement(){return nativeFullscreen()||document.fullscreenElement||document.webkitFullscreenElement;}
function syncFullscreenButton(){const button=$('[data-action="fullscreen"]');if(!button)return;const active=!!fullscreenElement();button.innerHTML=icon(active?'collapse':'expand')+`<span>${active?'Keluar layar penuh':'Layar penuh'}</span>`;button.setAttribute('aria-label',active?'Keluar layar penuh':'Masuk layar penuh');button.setAttribute('aria-pressed',String(active));}
async function toggleFullscreen(){
 if(isNativeApp){await toggleNativeFullscreen();syncFullscreenButton();setReaderMode('reading');return;}
 try{if(fullscreenElement()){const exit=document.exitFullscreen||document.webkitExitFullscreen;if(!exit)throw Error();await exit.call(document);}
 else{const root=document.documentElement,request=root.requestFullscreen||root.webkitRequestFullscreen;if(!request){toast('Layar penuh belum didukung browser ini.');return;}await request.call(root);setReaderMode('reading');}
 syncFullscreenButton();
 }catch{toast('Browser tidak mengizinkan layar penuh.');}
}
for(const event of ['fullscreenchange','webkitfullscreenchange'])document.addEventListener(event,()=>{syncFullscreenButton();clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(currentBook)reflow().catch(e=>toast(e.message));},100);});
function editingDialog(){const field=document.activeElement;return !!field?.closest?.('.dialog,.app-picker')&&field.matches('textarea,[contenteditable="true"],input:not([type=hidden]):not([type=range]):not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit]):not([type=color])');}
async function reflow(anchor=null){
 if(!currentBook)return;
 if(editingDialog()){deferredEditorReflow=true;return;}const request=++layoutRequest;reflowing=true;anchor=anchor||features.position();features.setPosition(anchor);features.apply();
 const pageEl=$('#reading-page');if(!pageEl||!currentBook)return;
 $('.reader-loading')?.classList.remove('hidden');
 if(document.fonts?.ready)await document.fonts.ready;
 if(request!==layoutRequest||!currentBook)return;
 const measure=document.createElement('article');measure.className='reading-page page-measure';measure.style.width=((pageEl.offsetWidth||innerWidth)/(features.spread()?2:1))+'px';measure.style.height=(pageEl.offsetHeight||innerHeight)+'px';measure.setAttribute('aria-hidden','true');document.body.appendChild(measure);
 let lastChapter=-1,lastFirst=null,textEl;const chapterSource=currentBook.chapters;
 const fits=(text,chapterIndex,first,start=first?0:1)=>{
  if(chapterIndex!==lastChapter||first!==lastFirst){measure.innerHTML=pageMarkup({chapterIndex,start:first?0:1,end:0},0,true);lastChapter=chapterIndex;lastFirst=first;textEl=$('.page-text',measure);}
  textEl.innerHTML=features.measureText(text,chapterIndex,start);
  if(measure.offsetHeight>0)return textEl.clientHeight>0&&textEl.scrollHeight<=textEl.clientHeight;
  // Non-layout environments (DOM tests) only; real browsers always use measured height.
  const width=Math.min(innerWidth/(features.spread()?2:1)-prefMargin(),Number(p().readerWidth)||720),lines=Math.max(1,Math.floor((innerHeight-100-(first&&chapterSource[chapterIndex].title?80:0))/(p().fontSize*p().lineHeight)));
  return text.length<=Math.max(1,Math.floor(width/(p().fontSize*.53))*lines);
 };
 try{
  const result=await paginateToFit(chapterSource,fits,()=>new Promise(resolve=>requestAnimationFrame(resolve)),()=>request!==layoutRequest||currentBook?.chapters!==chapterSource);
  if(!result||request!==layoutRequest)return;
  if(editingDialog()){deferredEditorReflow=true;return;}
  pages=result;const offset=anchor.start??anchor.charOffset??0;let index=pages.findIndex(pg=>pg.chapterIndex===anchor.chapterIndex&&offset>=pg.start&&offset<pg.end);pageIndex=index>=0?index:Math.max(0,Math.min(pageIndex,pages.length-1));
  updatePage();persistPosition();syncFullscreenButton();
 }finally{measure.remove();if(request===layoutRequest){reflowing=false;$('.reader-loading')?.classList.add('hidden');}}
}
function mountOpeningPage(){
 disconnectCarousel();view='loading';document.body.classList.remove('is-library');document.body.classList.add('is-reading');
 app.innerHTML=`<main class="reader-shell" data-mode="loading" aria-busy="true"><div class="reader-loading" role="status" aria-label="${p().uiLanguage==='id'?'Membuka buku':'Opening book'}">${loadingLogo()}</div></main>`;
}
async function openBook(id,anchor=null){
 scrubber.finish();features.leave();const request=++readingRequest;closeOverlay(true);removeSelection();layoutRequest++;currentBook=null;pages=[];pageIndex=0;reflowing=false;
 clearTimeout(toastTimer);$('#toast').classList.remove('visible');mountOpeningPage();
 try{const book=await ensureBook(id);if(request!==readingRequest)return;currentBook=book;const saved=Store.progress[id];features.enter();features.resolveAnnotations();mountReader();features.apply();await reflow(anchor||features.savedPosition(saved));if(request!==readingRequest)return;if(!Store.storageHealthy)toast('Penyimpanan perangkat tidak tersedia. Progres mungkin tidak tersimpan.');}
 catch(error){if(request===readingRequest){reflowing=false;if(currentBook){setReaderMode('controls');$('.reader-loading')?.classList.add('hidden');}else{rememberReader(null);renderLibrary();}toast(error.message||'Buku belum bisa dibuka.');}}
}
function bookmarked(page){if(!page||!currentBook)return null;return notesFor(currentBook.id).find(a=>!a.needsReview&&a.type==='bookmark'&&a.chapterIndex===page.chapterIndex&&(a.charOffset||0)>=page.start&&(a.charOffset||0)<page.end);}
function prefMargin(){return (Number(p().marginHorizontal)||24)*2;}
function markedText(page){return features.renderText(page);}
function updatePage(animate=false){
 if(!pages[pageIndex]||!currentBook)return;readerZoom.reset();removeSelection();
 const page=$('#reading-page');features.apply();const displayed=features.renderedPages(pageIndex);page.innerHTML=displayed.map(pg=>`<div class="spread-leaf">${pageMarkup(pg,pg.displayIndex)}</div>`).join('');features.afterRender();page.setAttribute('aria-label',`Halaman ${pageIndex+1} dari ${pages.length}`);
 if(animate){page.classList.remove('page-changing');void page.offsetWidth;page.classList.add('page-changing');}
 syncPageControls();
}
function syncPageControls(){if(!currentBook||!pages[pageIndex])return;
 const range=$('#page-scrubber');range.max=pages.length-1;range.value=pageIndex;range.setAttribute('aria-valuetext',`Halaman ${pageIndex+1} dari ${pages.length}`);
 $('#page-counter').textContent=`${pageIndex+1}${features.spread()&&pageIndex+1<pages.length?'–'+(pageIndex+2):''} / ${pages.length}`;$('#reading-percent').textContent=`${readingPercentage()}%`;
 const mark=$('.reader-toolbar [data-action="bookmark"]');mark.classList.toggle('active',!!bookmarked(pages[pageIndex]));mark.setAttribute('aria-pressed',String(!!bookmarked(pages[pageIndex])));
 $('[data-action="prev"]').disabled=pageIndex===0;$('[data-action="next"]').disabled=pageIndex===pages.length-1;
}
function readingPercentage(){if(!currentBook)return 0;const scroller=$('.page-inner');if(features.mode()==='scroll'&&features.position().chapterIndex===currentBook.chapters.length-1&&scroller?.clientHeight>0&&scroller.scrollTop+scroller.clientHeight>=scroller.scrollHeight-2)return 100;const a=features.position(),chapters=currentBook.chapters,total=chapters.reduce((s,c)=>s+c.text.length,0),before=chapters.slice(0,a.chapterIndex).reduce((s,c)=>s+c.text.length,0);if(features.mode()!=='scroll'&&pageIndex+(features.spread()?1:0)>=pages.length-1)return 100;return Math.min(100,Math.round((before+a.start)/Math.max(1,total)*100));}
function persistPosition(){const page=pages[pageIndex];if(!page||!currentBook)return;const a=features.position();Store.saveProgress({...Store.progress[currentBook.id],bookId:currentBook.id,chapterIndex:a.chapterIndex,pageIndex,totalPages:pages.length,totalChapters:currentBook.chapters.length,percentage:readingPercentage(),charOffset:a.start,...features.progressMetadata(),epubCfi:null});}
function goToPage(index,source='user'){if(!currentBook||reflowing||!Number.isInteger(Number(index)))return;if(source!=='speech')features.stopSpeech();removeSelection();pageIndex=Math.max(0,Math.min(pages.length-1,Number(index)));if(!['speech','anchor'].includes(source))features.setPosition({chapterIndex:pages[pageIndex].chapterIndex,start:pages[pageIndex].start});updatePage(true);persistPosition();}
function setReaderMode(mode){if(!currentBook)return;if(mode!=='reading')readerZoom.reset();setTimeout(()=>features.paintSpeech(),340);readerMode=mode;const shell=$('.reader-shell');shell.dataset.mode=mode;const page=$('#reading-page'),bar=$('.reader-toolbar'),controls=$('.reader-controls');if(mode==='controls'&&page&&bar&&controls){const height=page.offsetHeight||innerHeight,top=(bar.offsetTop||12)+(bar.offsetHeight||50)+14,bottom=(controls.offsetTop||height-145)-14,scale=Math.min(.9,Math.max(.3,(bottom-top)/height));shell.style.setProperty('--preview-scale',String(scale));shell.style.setProperty('--preview-offset',((top+bottom)/2-height/2)+'px');}$$('.reader-toolbar,.reader-controls').forEach(el=>{el.inert=mode==='reading';el.setAttribute('aria-hidden',String(mode==='reading'));});if(mode==='reading'&&document.activeElement?.closest('.reader-controls,.reader-toolbar'))document.activeElement.blur();}
function toggleBookmark(){const page=pages[pageIndex];if(!page)return;const existing=bookmarked(page);if(existing){Store.deleteAnnotation(existing.id);toast('Bookmark dihapus.');}else{Store.saveAnnotation({id:crypto.randomUUID(),bookId:currentBook.id,type:'bookmark',chapterIndex:features.position().chapterIndex,pageIndex,charOffset:features.position().start,anchor:features.anchorMetadata(features.position().chapterIndex,features.position().start,Math.min(currentBook.chapters[features.position().chapterIndex].text.length,features.position().start+80)),label:'',color:'sapphire',createdAt:new Date().toISOString()});toast('Halaman ditandai.');}updatePage();}
function showOverlay(html){
 popups.close(false,true);
 if(!overlay.firstChild)previousFocus=document.activeElement;
 overlay.innerHTML=`<div class="overlay-backdrop" data-backdrop="true"><section class="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title" tabindex="-1">${html}</section></div>`;
 layoutDialog($('.dialog',overlay));
 const dialog=$('.dialog',overlay);enterSheet(overlay.firstChild);
 document.body.classList.add('sheet-open');requestAnimationFrame(()=>{if(dialog?.isConnected&&!dialog.contains(document.activeElement))dialog.focus({preventScroll:true});});
}
function closeOverlay(immediate=false){
 popups.close(false,immediate);features.closePanel();const layer=overlay.firstChild,focus=previousFocus;
 const cleanup=()=>{if(layer&&overlay.firstChild!==layer){layer.remove();return;}overlay.innerHTML='';document.body.classList.remove('sheet-open');focus?.focus?.({preventScroll:true});previousFocus=null;editingAnnotation=null;noteDraftRange=null;pendingBackup=null;if(deferredEditorReflow){deferredEditorReflow=false;if(currentBook)void reflow().catch(e=>toast(e.message));}};
 return leaveSheet(layer,cleanup,immediate);
}
function dialogHeading(title){const symbol=/reset/i.test(title)?'refresh':/catatan|notes/i.test(title)?'edit':/bookmark/i.test(title)?'bookmark':/tampilan|appearance|theme|tema/i.test(title)?'appearance':/baca nyaring|read aloud/i.test(title)?'speaker':/pencarian|search/i.test(title)?'search':/alat kata|word tools/i.test(title)?'globe':/alat baca|reading tools/i.test(title)?'sliders':/impor|import/i.test(title)?'upload':/perangkat|device|tentang|about/i.test(title)?'device':'bookOpen';return `<div class="dialog-heading"><h2 id="dialog-title">${icon(symbol)}${title}</h2>${actionButton('close','close','Tutup')}</div>`;}
function removeSelection(){customSelection?.clear();selectedRange=null;$('.selection-popover')?.remove();window.getSelection()?.removeAllRanges();}
function showSelectionToolbar(rect){
 $('.selection-popover')?.remove();const el=document.createElement('div');el.className='selection-popover glass';el.setAttribute('role','toolbar');el.setAttribute('aria-label','Highlight pilihan teks');
 el.innerHTML=Object.keys(colors).map(color=>`<button class="color-button color-${color}" data-action="highlight" data-color="${color}" aria-label="Highlight ${color}"></button>`).join('')+`<button class="note-button" data-action="new-note">${icon('edit')}<span>Catatan</span></button><button class="icon-button" data-action="selection-tools" aria-label="Word tools">${icon('globe')}</button>`;
 el.style.left=`${Math.max(8,Math.min(innerWidth-270,rect.left+rect.width/2-128))}px`;el.style.top=`${Math.max(8,Math.min(innerHeight-70,rect.top>75?rect.top-64:rect.bottom+10))}px`;
 el.addEventListener('pointerdown',event=>event.preventDefault());document.body.appendChild(el);
}
customSelection=createTextSelection({document,getRoot:event=>view==='reader'?features.rootFor(event):null,canStart:()=>view==='reader'&&!overlay.firstChild&&!reflowing,
 onChange:selection=>{const page={...pages[pageIndex],chapterIndex:Number(selection.root.dataset.chapterIndex??pages[pageIndex].chapterIndex),start:Number(selection.root.dataset.start||0)};features.stopSpeech();if(!page||!currentBook)return;ignoreClickUntil=performance.now()+650;touchState=null;selectedRange={bookId:currentBook.id,chapterIndex:page.chapterIndex,pageIndex,startOffset:page.start+selection.start,endOffset:page.start+selection.end,selectedText:selection.text,charOffset:page.start+selection.start};showSelectionToolbar(selection.rect);},
 onClear:()=>{if(selectedRange)ignoreClickUntil=performance.now()+350;selectedRange=null;$('.selection-popover')?.remove();}
});
// Native selection is not used by reader highlighting (including touch/long-press).
function selectionChanged(){}

function saveHighlight(color,noteText='',range=selectedRange){if(!range)return;const anchor=features.anchorMetadata(range.chapterIndex,range.startOffset,range.endOffset);const existing=notesFor(currentBook.id).find(a=>a.type==='highlight'&&a.chapterIndex===range.chapterIndex&&a.startOffset===range.startOffset&&a.endOffset===range.endOffset);Store.saveAnnotation({...existing,...range,anchor,id:existing?.id||crypto.randomUUID(),type:'highlight',color,noteText:noteText||existing?.noteText||'',createdAt:existing?.createdAt||new Date().toISOString()});removeSelection();closeOverlay();updatePage();toast(noteText?'Catatan tersimpan.':'Highlight tersimpan.');}
function noteDialog(annotation=null){
 if(annotation?.type==='bookmark'){features.bookmarkDialog(annotation);return;}
 const range=annotation||selectedRange;if(!range)return;noteDraftRange=annotation?null:{...range};noteColor=annotation?.color||'amber';
 const bookmark=annotation?.type==='bookmark';
 showOverlay(`${dialogHeading(bookmark?'Bookmark':'Catatan')}<p class="dialog-caption">${bookmark?'Kembali ke bagian yang kamu simpan.':'Simpan pikiranmu tentang bagian ini.'}</p>${bookmark?'':`<blockquote class="note-quote" data-book-content translate="no">${escapeHTML(annotation?.needsReview&&currentBook?.source==='supabase'?translatePhrase('Original quotation is kept in your annotation export.'):range.selectedText)}</blockquote><div class="note-colors">${Object.keys(colors).map(c=>`<button class="color-button color-${c} ${c===noteColor?'selected':''}" data-action="note-color" data-color="${c}" aria-label="Warna ${c}"></button>`).join('')}</div><form id="note-form"><label class="field-label" for="note-text">Catatanmu</label><textarea id="note-text" class="text-input" maxlength="10000" placeholder="Tulis di sini…">${escapeHTML(annotation?.noteText||'')}</textarea><div class="dialog-actions">${annotation?`${annotation.noteText?`<button class="secondary" type="button" data-action="delete-note" data-id="${annotation.id}">${icon('notes')} Hapus catatan</button>`:''}<button class="icon-button" type="button" data-action="delete-annotation" data-id="${annotation.id}" aria-label="Hapus highlight">${icon('trash')}</button>`:''}<button class="primary" type="submit">${icon('check')}Simpan</button></div></form>`}${bookmark?`<div class="dialog-actions"><button class="secondary" data-action="delete-annotation" data-id="${annotation.id}">Hapus bookmark</button><button class="primary" data-action="jump-annotation" data-id="${annotation.id}">Buka halaman</button></div>`:''}`);
 editingAnnotation=annotation;
}
function contentsBody(){return features.contentsBody();}
function contentsDialog(){features.contents();}
function appearanceDialog(){features.appearance();}
function importDialog(){showOverlay(`${dialogHeading('Impor EPUB')}<p class="dialog-caption">Tambahkan buku dari perangkat ke rak pribadimu.</p><button class="upload-zone" data-action="choose-file" id="upload-zone">${icon('upload')}<span>Pilih berkas EPUB</span><small>DRM-free · maksimal 30 MB</small></button><div class="form-error" id="import-error" role="alert"></div>`);const zone=$('#upload-zone');zone.addEventListener('dragover',e=>{e.preventDefault();zone.classList.add('dragging');});zone.addEventListener('dragleave',()=>zone.classList.remove('dragging'));zone.addEventListener('drop',e=>{e.preventDefault();if(e.dataTransfer.files[0])importFile(e.dataTransfer.files[0]);});}
async function importFile(file){
 const fail=message=>{if($('#import-error'))$('#import-error').textContent=message;else toast(message);};
 if(!/\.epub$/i.test(file.name)){fail('Pilih berkas .epub.');return;}if(file.size>30*1024*1024){fail('Ukuran maksimal 30 MB.');return;}
 if($('#upload-zone'))$('#upload-zone').disabled=true;
 try{const buffer=await file.arrayBuffer(),parsed=await parseEpub(buffer,file.name);const hash=await crypto.subtle.digest('SHA-256',buffer),id='import-'+Array.from(new Uint8Array(hash),v=>v.toString(16).padStart(2,'0')).join('').slice(0,24);
 if(books.some(b=>b.id===id)){closeOverlay();toast('Buku ini sudah ada di rak.');return;}
 const book={...parsed,id,source:'local',chapters:await prepareChapters(parsed.chapters),epubBuffer:buffer,cover:genericCover(parsed.title,parsed.author)};if(!await Store.dbPut('books',book))throw Error('Penyimpanan perangkat penuh atau tidak tersedia.');books.push(book);activeLibraryId=id;
 try{const channel=new BroadcastChannel('lumina-library');channel.postMessage({kind:'book-added',id});channel.close();}catch{}
 closeOverlay();renderLibrary();toast('Buku ditambahkan ke rak.');
 }catch(e){fail(e.message||'Berkas tidak dapat dibuka.');}finally{if($('#upload-zone'))$('#upload-zone').disabled=false;$('#epub-input').value='';}
}
async function download(filename,text){return saveJSON(filename,text);}
async function exportNotes(){if(await download('katakecil-catatan.json',JSON.stringify({exportedAt:new Date().toISOString(),deviceId:Store.deviceId,annotations:Store.annotations.map(a=>({...a,bookTitle:books.find(b=>b.id===a.bookId)?.title||a.bookId}))},null,2)))toast('Catatan diekspor.');}
let pendingBackup=null;
async function previewBackup(file){
 try{
  if(file.size>BACKUP_MAX_BYTES)throw Error('Backup is larger than 8 MB.');
  pendingBackup=parseBackup(await file.text());
  const backup=pendingBackup;
  showOverlay(`${dialogHeading('Pulihkan backup')}<p class="dialog-caption">Backup memuat progres dan catatan. Buku pribadi perlu diimpor ulang.</p><p class="backup-count" role="status"><span>${backup.annotations.length}</span> <span>Catatan</span> · <span>${backup.progress.length}</span> <span>Posisi baca</span></p><p class="settings-caption">Data digabungkan. Catatan dan progres yang lebih baru di perangkat ini dipertahankan.</p>${backup.schemaVersion===2?'<label class="backup-settings-choice"><input type="checkbox" id="restore-preferences" checked> Pulihkan pengaturan tampilan</label>':''}<div class="form-error" id="backup-error" role="alert"></div><div class="dialog-actions"><button class="secondary" data-action="close">Batal</button><button class="primary" data-action="backup-restore">Pulihkan backup</button></div>`);
 }catch(error){pendingBackup=null;toast(error.message||'Invalid KataKecil backup.');}
 finally{$('#backup-input').value='';}
}
async function restoreSelectedBackup(){
 if(!pendingBackup)return;
 const button=$('[data-action="backup-restore"]');if(button)button.disabled=true;
 try{
  const result=await Store.restoreBackup(pendingBackup,{restorePreferences:!!$('#restore-preferences')?.checked});
  pendingBackup=null;applyPreferences();closeOverlay();if(view==='settings')renderSettings();else if(currentBook){features.resolveAnnotations();await reflow();}else renderLibrary();
  toast(p().uiLanguage==='id'?`Dipulihkan: ${result.annotations} catatan, ${result.progress} progres. Dilewati: ${result.skipped}.`:`Restored: ${result.annotations} notes, ${result.progress} positions. Skipped: ${result.skipped}.`);
 }catch(error){const area=$('#backup-error');if(area)area.textContent=error.message;else toast(error.message);if(button)button.disabled=false;}
}
function statusDialog(){showOverlay(`${dialogHeading('Perangkat ini')}<p class="dialog-caption">Progres dan catatan tersimpan di perangkat ini. Buku dari server memerlukan koneksi.</p><div class="status-details"><span>${Store.storageHealthy?'Penyimpanan aktif':'Penyimpanan tidak tersedia'}</span><code>${escapeHTML(Store.deviceId)}</code></div><p class="settings-caption">Menghapus data aplikasi atau browser menghapus data lokal. Simpan backup untuk memindahkannya ke perangkat lain.</p><div class="dialog-actions"><button class="secondary" data-action="backup-export">Simpan backup</button><button class="secondary" data-action="backup-import">Pulihkan backup</button></div>`);}
function aboutDialog(){
 showOverlay(`${dialogHeading('Tentang aplikasi')}<div class="about-brand">${brandMark()}</div><p class="about-description">Ruang tenang untuk koleksi buku pribadi dan cerita berikutnya.</p><dl class="about-details"><div><dt>Versi</dt><dd data-book-content translate="no">${escapeHTML(APP_INFO.version)}</dd></div><div><dt>Platform</dt><dd>${isNativeApp?'Android':'Web'}</dd></div></dl><p class="settings-caption">Progres dan catatan tersimpan di perangkat ini. Buku dari server memerlukan koneksi.</p><div class="about-links"><a class="settings-link" href="https://github.com/arisynn/katakecil" target="_blank" rel="noopener noreferrer"><span class="setting-label">${icon('globe')}GitHub</span>${icon('arrow')}</a><button class="settings-link" data-action="licenses"><span class="setting-label">${icon('notes')}Lisensi open-source</span>${icon('chevron')}</button></div>`);
}
function setAccent(color){if(!/^#[a-f\d]{6}$/i.test(color))return;Store.updatePreferences({accentColor:color});applyPreferences();$$('.accent-swatch').forEach(el=>{el.classList.toggle('selected',el.dataset.value===color);el.setAttribute('aria-pressed',String(el.dataset.value===color));});if($('#accent-custom'))$('#accent-custom').value=color;popups.scan();}
function navigateLibrary(){scrubber.finish();rememberReader(null);persistPosition();void resetNativeScreen().catch(()=>{});features.leave();readingRequest++;layoutRequest++;reflowing=false;closeOverlay(true);removeSelection();renderLibrary();}
async function handleAction(button,event){
 if(!button.closest('.liquid-tabs'))animateIcon(button.querySelector('svg'));
 if(features.action(button))return;
 const action=button.dataset.action,id=button.dataset.id,value=button.dataset.value;
 if(button.dataset.action==='updates'||button.dataset.action.startsWith('updates-')){await updates.action(button.dataset.action);return;}
 switch(action){
  case 'library':navigateLibrary();break;
  case 'loading-previews':showOverlay(`${dialogHeading(p().uiLanguage==='id'?'Animasi loading':'Loading animation')}${loadingPreviews(p().uiLanguage)}`);break;
  case 'about':aboutDialog();break;
  case 'settings':persistPosition();void resetNativeScreen().catch(()=>{});features.leave();readingRequest++;layoutRequest++;closeOverlay(true);removeSelection();renderSettings();break;
  case 'refresh':await loadCatalog();break;
  case 'select-book':selectBook(id);break;
  case 'carousel-prev':case 'carousel-next':{const index=books.findIndex(b=>b.id===activeLibraryId);const next=Math.max(0,Math.min(books.length-1,index+(action==='carousel-next'?1:-1)));if(books[next])selectBook(books[next].id);break;}
  case 'open':await openBook(id);break;
  case 'show-controls':setReaderMode('controls');break;
  case 'toggle-hud':setReaderMode(readerMode==='reading'?'controls':'reading');break;
  case 'fullscreen':await toggleFullscreen();break;
  case 'prev':goToPage(pageIndex-(features.spread()?2:1));break;
  case 'next':goToPage(pageIndex+(features.spread()?2:1));break;
  case 'bookmark':toggleBookmark();break;
  case 'contents':contentsDialog();break;
  case 'appearance':appearanceDialog();break;
  case 'close':closeOverlay();break;
  case 'drawer-tab':drawerTab=value;$$('.tab').forEach(el=>{el.classList.toggle('active',el.dataset.value===value);el.setAttribute('aria-selected',String(el.dataset.value===value));});$('#drawer-content').innerHTML=contentsBody();break;
  case 'chapter':{const index=pages.findIndex(pg=>pg.chapterIndex===Number(button.dataset.index));closeOverlay();goToPage(Math.max(0,index));setReaderMode('reading');break;}
  case 'highlight':saveHighlight(button.dataset.color);break;
  case 'new-note':noteDialog();break;
  case 'note-color':noteColor=button.dataset.color;$$('.note-colors button').forEach(el=>el.classList.toggle('selected',el.dataset.color===noteColor));break;
  case 'edit-annotation':{const annotation=Store.annotations.find(a=>a.id===id);if(annotation&&annotation.bookId===currentBook?.id)noteDialog(annotation);break;}
  case 'delete-annotation':if(!notesFor(currentBook?.id).some(a=>a.id===id))return;Store.deleteAnnotation(id);closeOverlay();updatePage();toast('Dihapus.');break;
  case 'jump-annotation':{const a=Store.annotations.find(a=>a.id===id&&a.bookId===currentBook?.id);if(!a)return;if(a.needsReview){toast('Posisi catatan ini perlu ditinjau setelah pembaruan buku.');return;}closeOverlay();const offset=a.charOffset??a.startOffset??0;if(currentBook?.id===a.bookId){features.jump({chapterIndex:a.chapterIndex,start:offset});setReaderMode('reading');}else await openBook(a.bookId,{chapterIndex:a.chapterIndex,start:offset});break;}
  case 'set-theme':Store.updatePreferences({themeMode:value});applyPreferences();$$('[data-action="set-theme"]').forEach(el=>{el.classList.toggle('active',el.dataset.value===value);el.setAttribute('aria-pressed',String(el.dataset.value===value));});break;
  case 'accent':setAccent(value);break;
  case 'font':Store.updatePreferences({fontFamily:value});applyPreferences();$$('[data-action="font"]').forEach(el=>el.classList.toggle('active',el.dataset.value===value));if(currentBook)await reflow();break;
  case 'import':importDialog();break;
  case 'choose-file':$('#epub-input').click();break;
  case 'export-notes':await exportNotes();break;
  case 'backup-export':persistPosition();if(await download('katakecil-backup.json',JSON.stringify(createBackup({preferences:p(),progress:Store.progress,annotations:Store.annotations}),null,2)))toast('Backup disimpan.');break;
  case 'backup-import':$('#backup-input').click();break;
  case 'backup-restore':await restoreSelectedBackup();break;
  case 'status':statusDialog();break;
  case 'licenses':{const response=await fetch('./vendor/OPEN_SOURCE_ATTRIBUTIONS.md');if(!response.ok)throw Error('Licenses are unavailable.');const text=await response.text();showOverlay(`${dialogHeading('Lisensi open-source')}<pre class="license-text">${escapeHTML(text)}</pre>`);break;}
 }
}
document.addEventListener('click',event=>{
 const button=event.target.closest('[data-action]');if(button){if(performance.now()<ignoreClickUntil&&button.closest('.reader-shell')&&!button.closest('.reader-toolbar,.reader-controls,.search-navigation,.tts-mini'))return;handleAction(button,event).catch(error=>toast(error.message||'Coba lagi.'));return;}
 if(event.target.dataset.backdrop==='true'){closeOverlay();return;}
 if(!currentBook||overlay.firstChild||reflowing||performance.now()<ignoreClickUntil||!window.getSelection()?.isCollapsed)return;
 const mark=event.target.closest('[data-annotation]');if(mark){const a=Store.annotations.find(a=>a.id===mark.dataset.annotation);if(a)noteDialog(a);return;}
 if(!event.target.closest('.reading-page'))return;
 if(pointerStart&&(performance.now()-pointerStart.at>300||Math.hypot(event.clientX-pointerStart.x,event.clientY-pointerStart.y)>12))return;
 if(readerZoom.scale>1.001){setReaderMode('controls');return;}
 if(readerMode==='reading'&&features.mode()==='pages'&&p().tapNavigation!==false&&event.clientX>0){const box=$('#reading-page').getBoundingClientRect(),fraction=(event.clientX-box.left)/(box.width||innerWidth);if(fraction<.22){goToPage(pageIndex-(features.spread()?2:1));return;}if(fraction>.78){goToPage(pageIndex+(features.spread()?2:1));return;}}
 setReaderMode(readerMode==='reading'?'controls':'reading');
});
document.addEventListener('pointerdown',event=>{if(event.pointerType!=='touch')pointerStart={x:event.clientX,y:event.clientY,at:performance.now()};else pointerStart=null;});
document.addEventListener('input',event=>{
 const el=event.target;if(features.input(el))return;if(el.id==='accent-custom')setAccent(el.value);
 if(el.id==='settings-font-size'){Store.updatePreferences({fontSize:Number(el.value)});if($('#font-size-output'))$('#font-size-output').textContent=el.value;if(!currentBook)applyPreferences();}

});
document.addEventListener('change',event=>{const el=event.target;if(features.change(el))return;if(el.id==='app-language'&&['id','en'].includes(el.value)){Store.updatePreferences({uiLanguage:el.value,uiLanguageChosen:true});applyPreferences();}if(el.id==='settings-font-size'){applyPreferences();if(currentBook)reflow().catch(e=>toast(e.message));}if(el.id==='epub-input'&&el.files[0])importFile(el.files[0]);if(el.id==='backup-input'&&el.files[0])void previewBackup(el.files[0]);});
// Keep HTML constraints intact, but present validation feedback in the app's glass toast.
document.addEventListener('invalid',event=>{
 const field=event.target;if(!field.closest?.('.dialog,.app-picker'))return;
 event.preventDefault();const id=p().uiLanguage==='id',v=field.validity;
 const message=v.valueMissing?(id?'Kolom ini wajib diisi.':'This field is required.'):(v.rangeUnderflow||v.rangeOverflow||v.badInput)&&field.min!==''&&field.max!==''?(id?`Masukkan nilai antara ${field.min} dan ${field.max}.`:`Enter a value between ${field.min} and ${field.max}.`):(id?'Periksa nilai kolom ini.':'Check this field’s value.');
 toast(message);field.focus({preventScroll:true});
},true);
document.addEventListener('submit',event=>{if(features.submit(event))return;if(event.target.id!=='note-form')return;event.preventDefault();const note=$('#note-text').value.trim();if(editingAnnotation){Store.saveAnnotation({...editingAnnotation,noteText:note,color:noteColor});closeOverlay();updatePage();toast('Catatan tersimpan.');}else saveHighlight(noteColor,note,noteDraftRange);});
document.addEventListener('selectionchange',()=>{if(selectedRange&&!customSelection.active&&window.getSelection()?.isCollapsed){selectedRange=null;$('.selection-popover')?.remove();}});
document.addEventListener('mouseup',()=>setTimeout(selectionChanged,20));
document.addEventListener('keyup',event=>{if(event.shiftKey||event.key==='Shift')selectionChanged();});
function readerSelection(){if(customSelection.active)return true;const selection=window.getSelection();if(!selection||selection.isCollapsed)return false;const node=selection.anchorNode;return !!(node?.nodeType===1?node:node?.parentElement)?.closest('.page-text');}
// App-wide native copy/selection UI is disabled; our range-based highlighter is separate.
const editingField=target=>target?.closest?.('input,textarea,[contenteditable="true"]');
for(const name of ['copy','cut'])document.addEventListener(name,event=>event.preventDefault(),true);
document.addEventListener('selectstart',event=>{if(!editingField(event.target))event.preventDefault();},true);
document.addEventListener('contextmenu',event=>event.preventDefault(),true);
document.addEventListener('dragstart',event=>{if(!editingField(event.target))event.preventDefault();},true);
// Block viewport gestures everywhere; the reader below handles its own local pinch.
document.addEventListener('touchstart',event=>{if(event.touches.length>1&&event.cancelable)event.preventDefault();},{capture:true,passive:false});
for(const name of ['gesturestart','gesturechange','gestureend'])document.addEventListener(name,event=>event.preventDefault(),{passive:false});
document.addEventListener('wheel',event=>{
 const reading=currentBook&&readerMode==='reading'&&!overlay.firstChild&&event.target.closest?.('.reading-page');
 if(event.ctrlKey||event.metaKey){event.preventDefault();if(reading){readerZoom.zoom(readerZoom.scale*Math.exp(-event.deltaY*.005),{x:event.clientX,y:event.clientY});ignoreClickUntil=performance.now()+400;}}
 else if(reading&&readerZoom.scale>1.001){event.preventDefault();readerZoom.pan(readerZoom.x-event.deltaX,readerZoom.y-event.deltaY);}
},{passive:false});
document.addEventListener('keydown',event=>{
 const input=event.target.closest('input,textarea,select,[contenteditable="true"]');
 if((event.ctrlKey||event.metaKey)&&(['c','x','insert'].includes(event.key.toLowerCase())||(!input&&event.key.toLowerCase()==='a'))){event.preventDefault();return;}
 if((event.ctrlKey||event.metaKey)&&['+','=','-','_','0'].includes(event.key)){event.preventDefault();if(currentBook&&readerMode==='reading'&&!overlay.firstChild&&!input){const box=$('#reading-page').getBoundingClientRect(),point={x:box.left+box.width/2,y:box.top+box.height/2};if(event.key==='0')readerZoom.reset();else readerZoom.zoom(readerZoom.scale*(['-','_'].includes(event.key)?1/1.2:1.2),point);}return;}
 if(event.key==='Escape'){if(overlay.firstChild)closeOverlay();else if(selectedRange)removeSelection();else if(currentBook)setReaderMode(readerMode==='reading'?'controls':'reading');return;}
 if(event.key==='Tab'&&overlay.firstChild){const panel=$('.dialog'),focusable=$$('button:not(:disabled),input,textarea,select,summary,a[href]',panel).filter(el=>{if(el.closest('[hidden]'))return false;for(let details=el.closest('details');details;details=details.parentElement?.closest('details'))if(!details.open&&!details.querySelector(':scope > summary')?.contains(el))return false;return true;});const first=focusable[0],last=focusable.at(-1);if(event.shiftKey&&(document.activeElement===first||document.activeElement===panel)){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}return;}
 if(input||overlay.firstChild||customSelection.active||!window.getSelection()?.isCollapsed)return;
 if(currentBook){if(event.key.toLowerCase()==='h'){event.preventDefault();const root=features.rootFor(event),bounds=wordBounds(root.textContent,0);customSelection.select(bounds.start,bounds.end,root);$('.selection-handle-start')?.focus();return;}if(event.key==='ArrowRight'){event.preventDefault();goToPage(pageIndex+(features.spread()?2:1));}if(event.key==='ArrowLeft'){event.preventDefault();goToPage(pageIndex-(features.spread()?2:1));}if(event.key==='Enter'||event.key===' '){event.preventDefault();setReaderMode(readerMode==='reading'?'controls':'reading');}if(event.key.toLowerCase()==='b')toggleBookmark();}
 else if(view==='library'&&['ArrowRight','ArrowLeft'].includes(event.key)){event.preventDefault();const index=books.findIndex(b=>b.id===activeLibraryId),next=books[Math.max(0,Math.min(books.length-1,index+(event.key==='ArrowRight'?1:-1)))];if(next)selectBook(next.id);}
});
const touchDistance=touches=>Math.hypot(touches[0].clientX-touches[1].clientX,touches[0].clientY-touches[1].clientY);
const touchCenter=touches=>({x:(touches[0].clientX+touches[1].clientX)/2,y:(touches[0].clientY+touches[1].clientY)/2});
document.addEventListener('touchstart',event=>{
 if(!currentBook||overlay.firstChild||customSelection.active||!event.target.closest('.reading-page'))return;
 if(event.touches.length>=2){touchState={kind:'pinch',distance:Math.max(1,touchDistance(event.touches)),zoom:readerZoom.snapshot(touchCenter(event.touches)),fired:false};ignoreClickUntil=performance.now()+600;}
 else if(readerMode==='reading'&&readerZoom.scale>1.001)touchState={kind:'pan',x:event.touches[0].clientX,y:event.touches[0].clientY,px:readerZoom.x,py:readerZoom.y,moved:false};
 else touchState={kind:'single',x:event.touches[0].clientX,y:event.touches[0].clientY,at:performance.now()};
},{passive:true});
document.addEventListener('touchmove',event=>{
 if(!touchState||!currentBook||overlay.firstChild||customSelection.interacting)return;
 if(event.touches.length>=2){
  if(event.cancelable)event.preventDefault();
  if(touchState.kind!=='pinch')touchState={kind:'pinch',distance:Math.max(1,touchDistance(event.touches)),zoom:readerZoom.snapshot(touchCenter(event.touches)),fired:false};
  const ratio=touchDistance(event.touches)/touchState.distance;
  if(touchState.zoom.scale<=1.001&&ratio<.92){touchState.fired=true;setReaderMode('controls');ignoreClickUntil=performance.now()+700;}
  else if(readerMode==='reading'&&!touchState.fired)readerZoom.pinch(touchState.zoom,ratio,touchCenter(event.touches));
 }else if(touchState.kind==='pan'&&event.touches.length===1){const dx=event.touches[0].clientX-touchState.x,dy=event.touches[0].clientY-touchState.y;if(Math.hypot(dx,dy)>9)touchState.moved=true;if(touchState.moved){if(event.cancelable)event.preventDefault();readerZoom.pan(touchState.px+dx,touchState.py+dy);ignoreClickUntil=performance.now()+500;}}
},{passive:false});
document.addEventListener('touchend',event=>{
 setTimeout(selectionChanged,160);if(!touchState||event.touches.length)return;
 const state=touchState;touchState=null;if(customSelection.active||customSelection.interacting)return;if(state.kind==='pinch'||state.kind==='pan'){if(state.kind==='pinch'||state.moved)ignoreClickUntil=performance.now()+500;return;}
 const end=event.changedTouches[0];if(!end)return;
 const dx=end.clientX-state.x,dy=end.clientY-state.y,duration=performance.now()-state.at;
 if(Math.abs(dx)>65&&Math.abs(dx)>Math.abs(dy)*1.6&&window.getSelection()?.isCollapsed){ignoreClickUntil=performance.now()+500;if(features.mode()!=='scroll')goToPage(pageIndex+(dx<0?1:-1)*(features.spread()?2:1));}
 else if(duration>320||Math.abs(dx)>12||Math.abs(dy)>12)ignoreClickUntil=performance.now()+400;
},{passive:true});
document.addEventListener('touchcancel',()=>{touchState=null;ignoreClickUntil=performance.now()+400;},{passive:true});
window.addEventListener('katakecil-storage-failure',()=>toast('Storage is unavailable. Export your notes before closing this tab.'));
window.addEventListener('resize',()=>{scheduleSheetFit(document);clearTimeout(resizeTimer);if(window.visualViewport?.scale>1)return;resizeTimer=setTimeout(()=>{if(currentBook)reflow().catch(e=>toast(e.message));},180);});
matchMedia('(prefers-color-scheme: dark)').addEventListener('change',applyPreferences);
let lastTextPreferences=features.signature();
Store.onSync((kind,payload)=>{
 if(kind==='preferences'){const signature=features.signature(),textChanged=signature!==lastTextPreferences;applyPreferences();if(currentBook&&textChanged){features.stopSpeech();reflow().catch(e=>toast(e.message));}if(view==='settings'&&!overlay.firstChild)renderSettings();}
 else if(kind==='progress'&&currentBook&&(!payload||payload.bookId===currentBook.id)){if(customSelection.active||overlay.firstChild)return;const saved=payload||Store.progress[currentBook.id];if(saved){const i=pages.findIndex(pg=>pg.chapterIndex===saved.chapterIndex&&(saved.charOffset||0)>=pg.start&&(saved.charOffset||0)<pg.end);if(i>=0){pageIndex=i;features.setPosition({chapterIndex:saved.chapterIndex,start:saved.charOffset||0});updatePage();}}}
 else if(kind.includes('annotation')&&currentBook){if(!readerSelection()&&!editingDialog())updatePage();if($('#drawer-content'))$('#drawer-content').innerHTML=contentsBody();}
 else if(view==='library'&&$('#shelf-action'))$('#shelf-action').innerHTML=shelfAction();
});
try{const channel=new BroadcastChannel('lumina-library');channel.onmessage=async()=>{const stored=await Store.dbGetAll('books');for(const book of stored.filter(b=>b.source==='local'))if(!books.some(b=>b.id===book.id))books.push(book);if(view==='library')renderLibrary();};}catch{}
function syncAppTitle(){const title=view==='settings'?translatePhrase('Pengaturan'):view==='loading'?translatePhrase('Membuka buku…'):view==='reader'&&currentBook?currentBook.title:'Library';const next=title+' · KataKecil';if(document.title!==next)document.title=next;}
startUiTranslations(syncAppTitle);
let appActive=document.visibilityState!=='hidden';
function appActivity(active){
 if(appActive===active)return;appActive=active;
 if(!active){persistPosition();features.pauseSpeech();void Store.flush();}
 else {void validatePublication();if(currentBook){void features.resumeScreen().catch(()=>{});void reflow().catch(e=>toast(e.message));}}
}
function canGoBack(){return !!($('.app-picker-backdrop:not([data-sheet-closing])')||overlay.firstChild||selectedRange||view!=='library');}
function appBack(){
 if($('.app-picker-backdrop:not([data-sheet-closing])')){popups.close();return;}
 const focused=document.activeElement;
 if(focused?.matches('input:not([hidden]),textarea,[contenteditable="true"]')){focused.blur();return;}
 if(overlay.firstChild){closeOverlay();return;}
 if(selectedRange){removeSelection();return;}
 if(view!=='library')navigateLibrary();
}
const navigation=installBackNavigation({window,canGoBack,back:appBack,native:isNativeApp});
new window.MutationObserver(()=>navigation.sync()).observe(app.parentElement||document.body,{childList:true,subtree:true});
void listenNativeLifecycle({back:()=>{if(!canGoBack())return false;navigation.back();return true;},active:appActivity}).catch(e=>toast(e.message));
document.addEventListener('visibilitychange',()=>appActivity(document.visibilityState==='visible'));
window.addEventListener('pagehide',()=>{persistPosition();void Store.flush();});
function syncVisibleViewport(){const viewport=window.visualViewport;if(!viewport)return;const style=document.documentElement.style;style.setProperty('--app-visible-height',viewport.height+'px');style.setProperty('--app-visible-top',viewport.offsetTop+'px');scheduleSheetFit(document);}
window.visualViewport?.addEventListener('resize',syncVisibleViewport);
window.visualViewport?.addEventListener('scroll',syncVisibleViewport);
syncVisibleViewport();
async function init(){
 const resume=readLocal(ACTIVE_READER_KEY,null),restoring=resume&&typeof resume.bookId==='string';activeLibraryId=readLocal('lumina_selected_book','');applyPreferences();await Store.hydrate();
 if(restoring)mountOpeningPage();else renderLibrary();await loadCatalog();
 if(restoring&&view==='loading'){if(books.some(book=>book.id===resume.bookId))await openBook(resume.bookId);else{rememberReader(null);renderLibrary();}}
 void updates.check({silent:true});if(!Store.storageHealthy)toast('Penyimpanan perangkat tidak tersedia.');
}
init().catch(()=>{rememberReader(null);catalogState='error';catalogError='Rak belum bisa dibuka. Coba segarkan halaman.';renderLibrary();});
