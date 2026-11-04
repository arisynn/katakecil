import {parseEpub,PARSER_REVISION} from './epub.js?v=4';
import {relocateAnchor} from './anchors.js?v=4';
import {paginateToFit} from './pagination.js?v=4';
import {CATALOG_URL,CATALOG_CACHE_KEY} from './config.js';
import {$,$$,escapeHTML,icon,actionButton,brandMark} from './ui.js?v=6';
import * as Store from './store.js?v=6';
import {setUiLanguage,startUiTranslations,translatePhrase} from './i18n.js?v=6';
import {createTextSelection,wordBounds} from './text-selection.js?v=4';
const app=$('#app'),overlay=$('#overlay-root');
const colors={amber:'#e7ca7e',emerald:'#a4c9ae',sapphire:'#acc7e6',rose:'#e4b3c3'};
const accents=[['#54756c','Sage'],['#4269a5','Biru'],['#82669c','Ungu'],['#a15e73','Rose'],['#a07732','Amber'],['#58616e','Graphite']];
let books=[],catalogState='loading',catalogError='',catalogOffline=false,view='library';
let activeLibraryId='',carouselObserver=null,carouselTimer;
let currentBook=null,pages=[],pageIndex=0,readerMode='reading',readingRequest=0,layoutRequest=0;
let selectedRange=null,editingAnnotation=null,noteColor='amber',drawerTab='contents',previousFocus=null;
let customSelection;
let toastTimer,resizeTimer,ignoreClickUntil=0,pointerStart=null,touchState=null,reflowing=false;
const percentage=id=>Math.round(Store.progress[id]?.percentage||0);
const notesFor=id=>Store.annotations.filter(a=>a.bookId===id);
const p=()=>Store.preferences;
const selectedBook=()=>books.find(b=>b.id===activeLibraryId)||books[0];
function toast(message){const el=$('#toast');el.textContent=message;el.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('visible'),3000);}
function theme(){if(p().themeMode==='system'||p().themeMode==='auto-sensor')return matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';return p().themeMode;}
function applyPreferences(){
 setUiLanguage(p().uiLanguage||'id');lastTextPreferences=JSON.stringify([p().fontFamily,p().fontSize,p().lineHeight]);
 document.body.dataset.theme=theme();
 const s=document.documentElement.style,accent=/^#[a-f\d]{6}$/i.test(p().accentColor)?p().accentColor:'#54756c';
 s.setProperty('--accent',accent);const rgb=[1,3,5].map(i=>parseInt(accent.slice(i,i+2),16));s.setProperty('--accent-rgb',rgb.join(','));
 const luminance=rgb.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);
 s.setProperty('--accent-ink',luminance>.35?'#151918':'#ffffff');
 s.setProperty('--reader-font',['DM Sans','Plus Jakarta Sans'].includes(p().fontFamily)?'system-ui,sans-serif':"'Lora',Georgia,serif");
 s.setProperty('--reader-size',`${Math.max(14,Math.min(28,p().fontSize))}px`);s.setProperty('--reader-line',String(Math.max(1.4,Math.min(2,p().lineHeight))));
 $('meta[name="theme-color"]').content=theme()==='dark'?'#171918':'#f6f6f3';
}
function shell(content,tab='library'){
 return `<main class="personal-shell ${tab==='library'?'library-shell':'settings-shell'}">${content}</main><nav class="bottom-tabs glass" aria-label="Navigasi utama"><button data-action="library" class="bottom-tab ${tab==='library'?'active':''}" ${tab==='library'?'aria-current="page"':''}>${icon('bookOpen')}<span>Library</span></button><button data-action="settings" class="bottom-tab ${tab==='settings'?'active':''}" ${tab==='settings'?'aria-current="page"':''}>${icon('sliders')}<span>Pengaturan</span></button></nav>`;
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
 if(catalogState==='loading')return `<div class="library-loading" role="status"><div class="skeleton-cover"></div><p>Menyiapkan rak buku…</p></div>`;
 if(!books.length)return `<div class="empty-state">${icon('bookOpen')}<h2>${catalogState==='error'?'Rak belum bisa dibuka':'Rak masih kosong'}</h2><p>${escapeHTML(catalogError||'Koleksi buku akan muncul di sini.')}</p><button class="secondary" data-action="refresh">Coba lagi</button></div>`;
 return `<section class="shelf" aria-label="Koleksi buku"><div class="book-carousel" id="book-carousel" tabindex="0" aria-label="Geser untuk memilih buku">${books.map(bookCard).join('')}</div><div class="shelf-navigation"><button class="icon-button" data-action="carousel-prev" aria-label="Buku sebelumnya">${icon('left')}</button><div class="shelf-dots" role="group" aria-label="Pilih buku">${books.map((b,i)=>`<button data-action="select-book" data-id="${escapeHTML(b.id)}" aria-label="Buku ${i+1}: ${escapeHTML(b.title)}" aria-pressed="${b.id===activeLibraryId}" class="shelf-dot ${b.id===activeLibraryId?'active':''}"><span></span></button>`).join('')}</div><button class="icon-button" data-action="carousel-next" aria-label="Buku selanjutnya">${icon('chevron')}</button></div><div class="shelf-action" id="shelf-action">${shelfAction()}</div>${catalogOffline?'<p class="offline-label">Menampilkan koleksi tersimpan · <button data-action="refresh">Coba lagi</button></p>':''}</section>`;
}
function shelfAction(){const b=selectedBook();if(!b)return '';const saved=Store.progress[b.id];return `<p class="reading-status">${saved?percentage(b.id)===100?'Selesai dibaca':`${percentage(b.id)}% dibaca`:'Belum dibaca'}</p><button class="primary read-button" data-action="open" data-id="${escapeHTML(b.id)}">${saved?'Lanjutkan membaca':'Baca buku'} ${icon('arrow')}</button>`;}
function renderLibrary(){
 disconnectCarousel();view='library';currentBook=null;document.body.classList.remove('is-reading');document.body.classList.add('is-library');document.title='Library · KataKecil';
 if(!books.some(b=>b.id===activeLibraryId))activeLibraryId=books[0]?.id||'';
 app.innerHTML=shell(`<header class="library-header"><div class="library-heading"><div class="settings-brand">${brandMark()}<span>KataKecil</span></div><h1>Library<span class="book-count">${books.length||''}</span></h1></div>${actionButton('refresh','refresh','Segarkan koleksi')}</header>${libraryBody()}`);
 connectCarousel();
}
function disconnectCarousel(){carouselObserver?.disconnect();clearTimeout(carouselTimer);}
function connectCarousel(){const el=$('#book-carousel');if(!el)return;el.addEventListener('scroll',()=>{clearTimeout(carouselTimer);carouselTimer=setTimeout(()=>{
 const center=el.getBoundingClientRect().left+el.clientWidth/2;let best=null,distance=Infinity;
 $$('.shelf-book',el).forEach(card=>{const r=card.getBoundingClientRect(),d=Math.abs(r.left+r.width/2-center);if(d<distance){best=card;distance=d;}});if(best)selectBook(best.dataset.bookId,false);
 },90);},{passive:true});requestAnimationFrame(()=>scrollToSelected(false));}
function scrollToSelected(smooth=true){const el=$('#book-carousel'),card=$$('.shelf-book').find(c=>c.dataset.bookId===activeLibraryId);if(!el||!card)return;const left=card.offsetLeft-(el.clientWidth-card.offsetWidth)/2;if(el.scrollTo)el.scrollTo({left,behavior:smooth&&!matchMedia('(prefers-reduced-motion: reduce)').matches?'smooth':'instant'});else el.scrollLeft=left;}
function selectBook(id,scroll=true){if(!books.some(b=>b.id===id))return;activeLibraryId=id;Store.writeLocal('lumina_selected_book',id);$$('.shelf-book').forEach(c=>c.classList.toggle('is-current',c.dataset.bookId===id));$$('.shelf-dot').forEach(c=>{c.classList.toggle('active',c.dataset.id===id);c.setAttribute('aria-pressed',String(c.dataset.id===id));});if($('#shelf-action'))$('#shelf-action').innerHTML=shelfAction();if(scroll)scrollToSelected();}
function renderSettings(){
 disconnectCarousel();view='settings';currentBook=null;document.body.classList.remove('is-reading','is-library');document.title='Pengaturan · KataKecil';
 app.innerHTML=shell(`<header class="settings-header"><div class="settings-brand">${brandMark()}<span>KataKecil</span></div><h1>Pengaturan</h1></header><section class="settings-group"><h2>${icon('globe')} Bahasa</h2><div class="settings-surface"><div class="setting-row"><label class="setting-label" for="app-language">${icon('globe')}Bahasa aplikasi</label><select id="app-language" class="language-select" aria-label="Bahasa aplikasi"><option value="id" ${p().uiLanguage!=='en'?'selected':''}>Bahasa Indonesia</option><option value="en" ${p().uiLanguage==='en'?'selected':''}>English</option></select></div></div><p class="settings-caption">Hanya mengubah bahasa aplikasi, bukan isi buku.</p></section><section class="settings-group"><h2>${icon('appearance')} Tampilan</h2><div class="settings-surface"><div class="setting-row"><span class="setting-label">${icon('sun')}Tema</span><div class="segmented">${[['light','Terang'],['dark','Gelap'],['system','Sistem']].map(([v,l])=>`<button data-action="set-theme" data-value="${v}" class="${p().themeMode===v?'active':''}" aria-pressed="${p().themeMode===v}">${icon(v==='light'?'sun':v==='dark'?'moon':v==='system'?'device':'type')}<span>${l}</span></button>`).join('')}</div></div><div class="setting-row accent-row"><span class="setting-label">${icon('palette')}Warna aksen</span><div class="accent-options">${accents.map(([color,name])=>`<button class="accent-swatch ${p().accentColor===color?'selected':''}" style="--swatch:${color}" data-action="accent" data-value="${color}" aria-label="Aksen ${name}" aria-pressed="${p().accentColor===color}">${icon('check')}</button>`).join('')}<label class="custom-accent" title="Pilih warna sendiri">${icon('plus')}<input type="color" id="accent-custom" aria-label="Warna aksen pilihan" value="${p().accentColor}"></label></div></div></div></section><section class="settings-group"><h2>${icon('bookOpen')} Membaca</h2><div class="settings-surface"><div class="setting-row"><span class="setting-label">${icon('type')}Huruf</span><div class="segmented">${[['Lora','Serif'],['Plus Jakarta Sans','Sans']].map(([v,l])=>`<button data-action="font" data-value="${v}" class="${p().fontFamily===v?'active':''}">${icon(v==='light'?'sun':v==='dark'?'moon':v==='system'?'device':'type')}<span>${l}</span></button>`).join('')}</div></div><div class="setting-row font-range"><label for="settings-font-size"><span class="setting-label">${icon('textSize')}Ukuran teks</span><output id="font-size-output">${p().fontSize}</output></label><input type="range" id="settings-font-size" min="14" max="28" step="1" value="${p().fontSize}" aria-label="Ukuran teks"></div></div><p class="settings-caption">Seleksi kalimat untuk highlight. Aksi salin teks buku dinonaktifkan.</p></section><section class="settings-group"><details class="advanced-settings"><summary><span class="setting-label">${icon('sliders')}Lanjutan</span>${icon('chevron')}</summary><div class="settings-surface"><button class="settings-link" data-action="import">Impor EPUB dari perangkat ${icon('upload')}</button><button class="settings-link" data-action="export-notes">Ekspor catatan ${icon('download')}</button><button class="settings-link" data-action="status">Penyimpanan perangkat ${icon('shield')}</button></div></details></section><p class="settings-footnote">Progres dan catatan tersimpan di perangkat ini.</p>`,'settings');
}
async function fetchLimited(url,type='buffer'){
 const target=new URL(url,location.href);if(!['https:','http:'].includes(target.protocol))throw Error('Alamat buku tidak valid.');
 const response=await fetch(target,{signal:AbortSignal.timeout(30000),credentials:'omit',referrerPolicy:'no-referrer'});
 if(!response.ok)throw Error(response.status===409?'Buku diperbarui. Segarkan koleksi dan buka lagi.':'Koneksi ke koleksi buku gagal. Coba lagi.');
 const limit=30*1024*1024;if(Number(response.headers.get('content-length'))>limit)throw Error('Berkas lebih besar dari 30 MB.');
 if(!response.body)return type==='json'?response.json():response.arrayBuffer();
 const reader=response.body.getReader(),chunks=[];let length=0;
 while(true){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>limit){await reader.cancel();throw Error('Berkas lebih besar dari 30 MB.');}chunks.push(value);}
 const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 return type==='json'?JSON.parse(new TextDecoder().decode(bytes)):bytes.buffer;
}
export function normalizeCatalog(manifest,base=CATALOG_URL){
 if(!Array.isArray(manifest.books))throw Error('Format koleksi tidak valid.');const ids=new Set();
 return manifest.books.map(b=>{
  if(!b.id||typeof b.id!=='string'||ids.has(b.id)||typeof b.title!=='string'||typeof b.url!=='string'||!b.title||!b.url)throw Error('Data buku tidak lengkap.');ids.add(b.id);
  const url=new URL(b.url,base);if(!['https:','http:'].includes(url.protocol))throw Error('Alamat buku tidak valid.');
  let cover=b.cover||b.cover_url||'';if(cover&&!/^data:image\/(png|jpeg|webp|gif);base64,[a-z\d+/=]+$/i.test(cover)){const c=new URL(cover,base);cover=['https:','http:'].includes(c.protocol)?c.href:'';}
  return {id:b.id,title:String(b.title),author:String(b.author||''),language:b.language||'id',version:String(b.version||b.revision||'1'),url:url.href,cover,source:'supabase'};
 });
}
async function loadCatalog(){
 catalogState='loading';catalogError='';if(view==='library')renderLibrary();
 try{const manifest=await fetchLimited(CATALOG_URL,'json');const fresh=normalizeCatalog(manifest);const stored=await Store.dbGetAll('books');books=fresh.map(b=>{const cached=stored.find(s=>s.id===b.id&&s.version===b.version&&s.source==='supabase');return cached?{...cached,...b}:b;});books.push(...stored.filter(b=>b.source==='local'));Store.writeLocal(CATALOG_CACHE_KEY,fresh);catalogState='ready';catalogOffline=false;
 }catch(error){const cached=readLocal(CATALOG_CACHE_KEY,[]),stored=await Store.dbGetAll('books');books=cached.map(b=>({...stored.find(s=>s.id===b.id&&s.version===b.version),...b}));books.push(...stored.filter(b=>b.source==='local'));catalogState=books.length?'ready':'error';catalogOffline=books.length>0;catalogError='Periksa koneksi internet, lalu coba lagi.';}
 if(view==='library')renderLibrary();
}
function readLocal(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}}
async function ensureBook(id){
 let book=books.find(b=>b.id===id);if(!book)throw Error('Buku tidak tersedia.');if(book.chapters&&book.parsedRevision===PARSER_REVISION)return book;
 if(book.source==='local'&&!book.epubBuffer){book={...book,parsedRevision:PARSER_REVISION,chapters:book.chapters.map(ch=>({...ch,title:/^Section\s*\d+$/i.test(ch.title)?'':ch.title.replace(/^(?:bab|chapter|episode|bagian)\s*(?:\d+|[ivxlcdm]+)[\s.:—–-]*/i,'')}))};return book;}
 let url=book.url;if(book.source==='supabase'){const signed=await fetchLimited(url,'json');if(!signed.url||new URL(signed.url).origin!==new URL(CATALOG_URL).origin)throw Error('Buku belum bisa dibuka.');url=signed.url;}
 const parsed=await parseEpub(book.epubBuffer||await fetchLimited(url),book.title);
 if(book.chapters)migrateSavedAnchors(book.id,book.chapters,parsed.chapters);
 book={...book,...parsed,title:book.title,author:book.author,chapters:parsed.chapters,parsedRevision:PARSER_REVISION};books=books.map(b=>b.id===id?book:b);await Store.dbPut('books',book);return book;
}
function pageMarkup(page,index,measurement=false){
 const chapter=currentBook.chapters[page.chapterIndex];
 return `<div class="page-inner"><div class="page-heading" data-book-content translate="no" ${page.start!==0||(!chapter.title&&!chapter.chapterLabel)?'hidden':''}>${chapter.chapterLabel?`<p class="chapter-label">${escapeHTML(chapter.chapterLabel)}</p>`:''}<h1 ${!chapter.title?'hidden':''}>${escapeHTML(chapter.title)}</h1></div><div class="page-text" data-book-content translate="no" tabindex="0" aria-label="Isi halaman. Tekan H untuk mulai highlight." lang="${escapeHTML(currentBook.language||'id')}" ${measurement?'':`data-page="${index}"`}>${measurement?'':markedText(page)}</div><div class="page-number" aria-label="Nomor halaman">${measurement?'':index+1}</div></div>`;
}
function mountReader(){
 disconnectCarousel();document.body.classList.remove('is-library');document.body.classList.add('is-reading');view='reader';readerMode='reading';document.title=`${currentBook.title} · KataKecil`;
 app.innerHTML=`<main class="reader-shell" data-mode="reading"><header class="reader-toolbar glass" inert aria-hidden="true"><button class="icon-button" data-action="library" aria-label="Kembali ke Library">${icon('back')}</button><span class="reader-title" data-book-content translate="no">${escapeHTML(currentBook.title)}</span><button class="icon-button" data-action="bookmark" aria-label="Bookmark halaman">${icon('bookmark')}</button></header><div class="reader-stage"><article class="reading-page" id="reading-page" aria-label="Halaman buku">${pageMarkup({chapterIndex:0,start:0,end:0},0,true)}</article></div><button class="reader-menu-trigger" data-action="show-controls" aria-label="Buka menu baca">${icon('more')}</button><footer class="reader-controls glass" inert aria-hidden="true"><div class="reader-tool-actions"><button data-action="contents">${icon('list')}<span>Daftar isi</span></button><button data-action="appearance">${icon('type')}<span>Tampilan</span></button><button data-action="fullscreen" aria-label="Masuk layar penuh" aria-pressed="false">${icon('expand')}<span>Layar penuh</span></button></div><div class="scrubber-row"><button class="icon-button" data-action="prev" aria-label="Halaman sebelumnya">${icon('left')}</button><label><span class="sr-only">Posisi baca</span><input type="range" id="page-scrubber" min="0" max="1" value="0" aria-label="Posisi baca"></label><button class="icon-button" data-action="next" aria-label="Halaman berikutnya">${icon('chevron')}</button></div><div class="reader-progress"><span id="page-counter"></span><span id="reading-percent"></span></div></footer><div class="reader-loading" role="status"><div class="spinner"></div><span>Menata halaman…</span></div></main>`;
}
function migrateSavedAnchors(bookId,oldChapters,newChapters){
 const saved=Store.progress[bookId];if(saved){const moved=relocateAnchor(oldChapters,newChapters,saved.chapterIndex,saved.charOffset||0);Store.saveProgress({...saved,...moved,anchorBeforeV3:saved.anchorBeforeV3||{chapterIndex:saved.chapterIndex,charOffset:saved.charOffset},parserRevision:PARSER_REVISION});}
 for(const annotation of [...Store.annotations].filter(a=>a.bookId===bookId)){const moved=relocateAnchor(oldChapters,newChapters,annotation.chapterIndex,annotation.charOffset??annotation.startOffset??0,annotation.selectedText||'');const original=annotation.anchorBeforeV3||{chapterIndex:annotation.chapterIndex,charOffset:annotation.charOffset,startOffset:annotation.startOffset,endOffset:annotation.endOffset};Store.saveAnnotation(moved?{...annotation,...moved,...(annotation.type==='highlight'?{startOffset:moved.charOffset,endOffset:moved.charOffset+annotation.selectedText.length}:{}),needsReview:false,anchorBeforeV3:original,parserRevision:PARSER_REVISION}:{...annotation,needsReview:true,anchorBeforeV3:original,parserRevision:PARSER_REVISION});}
}
function fullscreenElement(){return document.fullscreenElement||document.webkitFullscreenElement;}
function syncFullscreenButton(){const button=$('[data-action="fullscreen"]');if(!button)return;const active=!!fullscreenElement();button.innerHTML=icon(active?'collapse':'expand')+`<span>${active?'Keluar layar penuh':'Layar penuh'}</span>`;button.setAttribute('aria-label',active?'Keluar layar penuh':'Masuk layar penuh');button.setAttribute('aria-pressed',String(active));}
async function toggleFullscreen(){
 try{if(fullscreenElement()){const exit=document.exitFullscreen||document.webkitExitFullscreen;if(!exit)throw Error();await exit.call(document);}
 else{const root=document.documentElement,request=root.requestFullscreen||root.webkitRequestFullscreen;if(!request){toast('Layar penuh belum didukung browser ini.');return;}await request.call(root);setReaderMode('reading');}
 syncFullscreenButton();
 }catch{toast('Browser tidak mengizinkan layar penuh.');}
}
for(const event of ['fullscreenchange','webkitfullscreenchange'])document.addEventListener(event,()=>{syncFullscreenButton();clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(currentBook)reflow().catch(e=>toast(e.message));},100);});
async function reflow(anchor=null){
 if(!currentBook)return;const request=++layoutRequest;reflowing=true;anchor=anchor||pages[pageIndex]||{chapterIndex:0,start:0};
 const pageEl=$('#reading-page');if(!pageEl||!currentBook)return;
 $('.reader-loading')?.classList.remove('hidden');
 if(document.fonts?.ready)await document.fonts.ready;
 if(request!==layoutRequest||!currentBook)return;
 const measure=document.createElement('article');measure.className='reading-page page-measure';measure.style.width=(pageEl.offsetWidth||innerWidth)+'px';measure.style.height=(pageEl.offsetHeight||innerHeight)+'px';measure.setAttribute('aria-hidden','true');document.body.appendChild(measure);
 let lastChapter=-1,lastFirst=null,textEl;const chapterSource=currentBook.chapters;
 const fits=(text,chapterIndex,first)=>{
  if(chapterIndex!==lastChapter||first!==lastFirst){measure.innerHTML=pageMarkup({chapterIndex,start:first?0:1,end:0},0,true);lastChapter=chapterIndex;lastFirst=first;textEl=$('.page-text',measure);}
  textEl.textContent=text;
  if(measure.offsetHeight>0)return textEl.clientHeight>0&&textEl.scrollHeight<=textEl.clientHeight;
  // Non-layout environments (DOM tests) only; real browsers always use measured height.
  const width=Math.min(innerWidth-48,720),lines=Math.max(1,Math.floor((innerHeight-100-(first&&chapterSource[chapterIndex].title?80:0))/(p().fontSize*p().lineHeight)));
  return text.length<=Math.max(1,Math.floor(width/(p().fontSize*.53))*lines);
 };
 try{
  const result=await paginateToFit(chapterSource,fits,()=>new Promise(resolve=>requestAnimationFrame(resolve)),()=>request!==layoutRequest||currentBook?.chapters!==chapterSource);
  if(!result||request!==layoutRequest)return;
  pages=result;const offset=anchor.start??anchor.charOffset??0;let index=pages.findIndex(pg=>pg.chapterIndex===anchor.chapterIndex&&offset>=pg.start&&offset<pg.end);pageIndex=index>=0?index:Math.max(0,Math.min(pageIndex,pages.length-1));
  updatePage();persistPosition();syncFullscreenButton();
 }finally{measure.remove();if(request===layoutRequest){reflowing=false;$('.reader-loading')?.classList.add('hidden');}}
}
async function openBook(id,anchor=null){
 const request=++readingRequest;closeOverlay();removeSelection();toast('Membuka buku…');
 try{const book=await ensureBook(id);if(request!==readingRequest)return;currentBook=book;pages=[];pageIndex=0;const saved=Store.progress[id];mountReader();await reflow(anchor||{chapterIndex:saved?.chapterIndex||0,start:saved?.charOffset||0});if(request!==readingRequest)return;$('#toast').classList.remove('visible');if(!Store.storageHealthy)toast('Penyimpanan perangkat tidak tersedia. Progres mungkin tidak tersimpan.');}
 catch(error){if(request===readingRequest){reflowing=false;if(currentBook){setReaderMode('controls');$('.reader-loading')?.classList.add('hidden');}toast(error.message||'Buku belum bisa dibuka.');}}
}
function bookmarked(page){if(!page||!currentBook)return null;return notesFor(currentBook.id).find(a=>!a.needsReview&&a.type==='bookmark'&&a.chapterIndex===page.chapterIndex&&(a.charOffset||0)>=page.start&&(a.charOffset||0)<page.end);}
function markedText(page){
 const relevant=notesFor(currentBook.id).filter(a=>!a.needsReview&&a.type==='highlight'&&a.chapterIndex===page.chapterIndex&&a.startOffset<page.end&&a.endOffset>page.start);
 const cuts=[...new Set([page.start,page.end,...relevant.flatMap(a=>[Math.max(page.start,a.startOffset),Math.min(page.end,a.endOffset)])])].sort((a,b)=>a-b);
 return cuts.slice(0,-1).map((start,i)=>{const end=cuts[i+1],a=relevant.find(a=>a.startOffset<=start&&a.endOffset>=end),text=escapeHTML(currentBook.chapters[page.chapterIndex].text.slice(start,end));return a?`<mark class="mark-${a.color}" data-annotation="${a.id}" title="${escapeHTML(a.noteText||'Buka highlight')}">${text}</mark>`:text;}).join('');
}
function updatePage(animate=false){
 if(!pages[pageIndex]||!currentBook)return;removeSelection();
 const page=$('#reading-page');page.innerHTML=pageMarkup(pages[pageIndex],pageIndex);page.setAttribute('aria-label',`Halaman ${pageIndex+1} dari ${pages.length}`);
 if(animate){page.classList.remove('page-changing');void page.offsetWidth;page.classList.add('page-changing');}
 const range=$('#page-scrubber');range.max=pages.length-1;range.value=pageIndex;range.setAttribute('aria-valuetext',`Halaman ${pageIndex+1} dari ${pages.length}`);
 $('#page-counter').textContent=`${pageIndex+1} / ${pages.length}`;$('#reading-percent').textContent=`${readingPercentage()}%`;
 const mark=$('.reader-toolbar [data-action="bookmark"]');mark.classList.toggle('active',!!bookmarked(pages[pageIndex]));mark.setAttribute('aria-pressed',String(!!bookmarked(pages[pageIndex])));
 $('[data-action="prev"]').disabled=pageIndex===0;$('[data-action="next"]').disabled=pageIndex===pages.length-1;
}
function readingPercentage(){return pages.length===1||pageIndex===pages.length-1?100:Math.round(pageIndex/Math.max(1,pages.length-1)*100);}
function persistPosition(){const page=pages[pageIndex];if(!page||!currentBook)return;Store.saveProgress({bookId:currentBook.id,chapterIndex:page.chapterIndex,pageIndex,totalPages:pages.length,totalChapters:currentBook.chapters.length,percentage:readingPercentage(),charOffset:page.start,epubCfi:null});}
function goToPage(index){if(!currentBook||reflowing)return;removeSelection();pageIndex=Math.max(0,Math.min(pages.length-1,Number(index)));updatePage(true);persistPosition();}
function setReaderMode(mode){if(!currentBook)return;readerMode=mode;const shell=$('.reader-shell');shell.dataset.mode=mode;const page=$('#reading-page'),bar=$('.reader-toolbar'),controls=$('.reader-controls');if(mode==='controls'&&page&&bar&&controls){const height=page.offsetHeight||innerHeight,top=(bar.offsetTop||12)+(bar.offsetHeight||50)+14,bottom=(controls.offsetTop||height-145)-14,scale=Math.min(.9,Math.max(.3,(bottom-top)/height));shell.style.setProperty('--preview-scale',String(scale));shell.style.setProperty('--preview-offset',((top+bottom)/2-height/2)+'px');}$$('.reader-toolbar,.reader-controls').forEach(el=>{el.inert=mode==='reading';el.setAttribute('aria-hidden',String(mode==='reading'));});if(mode==='reading'&&document.activeElement?.closest('.reader-controls,.reader-toolbar'))document.activeElement.blur();}
function toggleBookmark(){const page=pages[pageIndex];if(!page)return;const existing=bookmarked(page);if(existing){Store.deleteAnnotation(existing.id);toast('Bookmark dihapus.');}else{Store.saveAnnotation({id:crypto.randomUUID(),bookId:currentBook.id,type:'bookmark',chapterIndex:page.chapterIndex,pageIndex,charOffset:page.start,color:'sapphire',createdAt:new Date().toISOString()});toast('Halaman ditandai.');}updatePage();}
function showOverlay(html){
 if(!overlay.firstChild)previousFocus=document.activeElement;
 overlay.innerHTML=`<div class="overlay-backdrop" data-backdrop="true"><section class="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title" tabindex="-1">${html}</section></div>`;
 document.body.classList.add('sheet-open');requestAnimationFrame(()=>$('.dialog',overlay)?.focus());
}
function closeOverlay(){overlay.innerHTML='';document.body.classList.remove('sheet-open');previousFocus?.focus?.();previousFocus=null;editingAnnotation=null;}
function dialogHeading(title){const symbol=/catatan/i.test(title)?'edit':/bookmark/i.test(title)?'bookmark':/tampilan/i.test(title)?'appearance':/impor/i.test(title)?'upload':/perangkat/i.test(title)?'device':'bookOpen';return `<div class="dialog-heading"><h2 id="dialog-title">${icon(symbol)}${title}</h2>${actionButton('close','close','Tutup')}</div>`;}
function removeSelection(){customSelection?.clear();selectedRange=null;$('.selection-popover')?.remove();window.getSelection()?.removeAllRanges();}
function showSelectionToolbar(rect){
 $('.selection-popover')?.remove();const el=document.createElement('div');el.className='selection-popover glass';el.setAttribute('role','toolbar');el.setAttribute('aria-label','Highlight pilihan teks');
 el.innerHTML=Object.keys(colors).map(color=>`<button class="color-button color-${color}" data-action="highlight" data-color="${color}" aria-label="Highlight ${color}"></button>`).join('')+`<button class="note-button" data-action="new-note">${icon('edit')}<span>Catatan</span></button>`;
 el.style.left=`${Math.max(8,Math.min(innerWidth-270,rect.left+rect.width/2-128))}px`;el.style.top=`${Math.max(8,Math.min(innerHeight-70,rect.top>75?rect.top-64:rect.bottom+10))}px`;
 el.addEventListener('pointerdown',event=>event.preventDefault());document.body.appendChild(el);
}
customSelection=createTextSelection({document,getRoot:()=>view==='reader'?$('.page-text'):null,canStart:()=>view==='reader'&&!overlay.firstChild&&!reflowing,
 onChange:selection=>{const page=pages[pageIndex];if(!page||!currentBook)return;ignoreClickUntil=performance.now()+650;touchState=null;selectedRange={bookId:currentBook.id,chapterIndex:page.chapterIndex,pageIndex,startOffset:page.start+selection.start,endOffset:page.start+selection.end,selectedText:selection.text,charOffset:page.start+selection.start};showSelectionToolbar(selection.rect);},
 onClear:()=>{if(selectedRange)ignoreClickUntil=performance.now()+350;selectedRange=null;$('.selection-popover')?.remove();}
});
// Native selection is not used by reader highlighting (including touch/long-press).
function selectionChanged(){}

function saveHighlight(color,noteText=''){if(!selectedRange)return;Store.saveAnnotation({...selectedRange,id:crypto.randomUUID(),type:'highlight',color,noteText,createdAt:new Date().toISOString()});removeSelection();closeOverlay();updatePage();toast(noteText?'Catatan tersimpan.':'Highlight tersimpan.');}
function noteDialog(annotation=null){
 const range=annotation||selectedRange;if(!range)return;noteColor=annotation?.color||'amber';
 const bookmark=annotation?.type==='bookmark';
 showOverlay(`${dialogHeading(bookmark?'Bookmark':'Catatan')}<p class="dialog-caption">${bookmark?'Kembali ke bagian yang kamu simpan.':'Simpan pikiranmu tentang bagian ini.'}</p>${bookmark?'':`<blockquote class="note-quote" data-book-content translate="no">${escapeHTML(range.selectedText)}</blockquote><div class="note-colors">${Object.keys(colors).map(c=>`<button class="color-button color-${c} ${c===noteColor?'selected':''}" data-action="note-color" data-color="${c}" aria-label="Warna ${c}"></button>`).join('')}</div><form id="note-form"><label class="field-label" for="note-text">Catatanmu</label><textarea id="note-text" class="text-input" maxlength="10000" placeholder="Tulis di sini…">${escapeHTML(annotation?.noteText||'')}</textarea><div class="dialog-actions">${annotation?`<button class="secondary" type="button" data-action="delete-annotation" data-id="${annotation.id}">${icon('trash')} Hapus</button>`:''}<button class="primary" type="submit">${icon('check')}Simpan</button></div></form>`}${bookmark?`<div class="dialog-actions"><button class="secondary" data-action="delete-annotation" data-id="${annotation.id}">Hapus bookmark</button><button class="primary" data-action="jump-annotation" data-id="${annotation.id}">Buka halaman</button></div>`:''}`);
 editingAnnotation=annotation;
}
function contentsBody(){
 if(drawerTab==='contents')return `<nav class="toc-list" aria-label="Daftar isi">${currentBook.chapters.map((c,i)=>`<button class="toc-item ${pages[pageIndex]?.chapterIndex===i?'active':''}" data-action="chapter" data-index="${i}"><span>${String(i+1).padStart(2,'0')}</span><span data-book-content translate="no">${escapeHTML(c.title||c.navigationTitle||'Informasi buku')}</span></button>`).join('')}</nav>`;
 const entries=notesFor(currentBook.id).filter(a=>drawerTab==='bookmarks'?a.type==='bookmark':a.type==='highlight');
 return entries.length?entries.map(a=>`<article class="saved-passage" style="--mark:${colors[a.color]}">${a.type==='bookmark'?`<p data-book-content translate="no">${escapeHTML(currentBook.chapters[a.chapterIndex]?.title||'Bookmark')}</p>`:`<blockquote data-book-content translate="no">${escapeHTML(a.selectedText)}</blockquote>`}${a.needsReview?'<p class="unresolved-note">Posisi catatan perlu ditinjau setelah pembaruan buku.</p>':''}${a.noteText?`<p class="note-text" data-book-content translate="no">${escapeHTML(a.noteText)}</p>`:''}<div class="passage-actions"><button data-action="jump-annotation" data-id="${a.id}">Buka bagian</button><button class="icon-button" data-action="edit-annotation" data-id="${a.id}" aria-label="Edit catatan">${icon('edit')}</button></div></article>`).join(''):`<div class="empty-state small"><p>${drawerTab==='bookmarks'?'Belum ada bookmark.':'Belum ada highlight atau catatan.'}</p></div>`;
}
function contentsDialog(){if(!currentBook)return;setReaderMode('controls');showOverlay(`${dialogHeading('Buku ini')}<div class="tabs" role="tablist">${[['contents','Daftar isi'],['highlights','Catatan'],['bookmarks','Bookmark']].map(([key,title])=>`<button class="tab ${drawerTab===key?'active':''}" data-action="drawer-tab" data-value="${key}" role="tab" aria-selected="${drawerTab===key}">${icon(key==='contents'?'list':key==='highlights'?'notes':'bookmark')}${title}</button>`).join('')}</div><div id="drawer-content">${contentsBody()}</div>`);}
function appearanceDialog(){setReaderMode('controls');showOverlay(`${dialogHeading('Tampilan baca')}<div class="settings-surface"><div class="setting-row"><span class="setting-label">${icon('sun')}Tema</span><div class="segmented">${[['light','Terang'],['dark','Gelap'],['system','Sistem']].map(([v,l])=>`<button data-action="set-theme" data-value="${v}" class="${p().themeMode===v?'active':''}">${icon(v==='light'?'sun':v==='dark'?'moon':v==='system'?'device':'type')}<span>${l}</span></button>`).join('')}</div></div><div class="setting-row font-range"><label for="settings-font-size"><span class="setting-label">${icon('textSize')}Ukuran teks</span><output id="font-size-output">${p().fontSize}</output></label><input type="range" id="settings-font-size" min="14" max="28" step="1" value="${p().fontSize}" aria-label="Ukuran teks"></div><div class="setting-row"><span class="setting-label">${icon('type')}Huruf</span><div class="segmented">${[['Lora','Serif'],['Plus Jakarta Sans','Sans']].map(([v,l])=>`<button data-action="font" data-value="${v}" class="${p().fontFamily===v?'active':''}">${icon(v==='light'?'sun':v==='dark'?'moon':v==='system'?'device':'type')}<span>${l}</span></button>`).join('')}</div></div></div>`);}
function importDialog(){showOverlay(`${dialogHeading('Impor EPUB')}<p class="dialog-caption">Tambahkan buku dari perangkat ke rak pribadimu.</p><button class="upload-zone" data-action="choose-file" id="upload-zone">${icon('upload')}<span>Pilih berkas EPUB</span><small>DRM-free · maksimal 30 MB</small></button><div class="form-error" id="import-error" role="alert"></div>`);const zone=$('#upload-zone');zone.addEventListener('dragover',e=>{e.preventDefault();zone.classList.add('dragging');});zone.addEventListener('dragleave',()=>zone.classList.remove('dragging'));zone.addEventListener('drop',e=>{e.preventDefault();if(e.dataTransfer.files[0])importFile(e.dataTransfer.files[0]);});}
async function importFile(file){
 const fail=message=>{if($('#import-error'))$('#import-error').textContent=message;else toast(message);};
 if(!/\.epub$/i.test(file.name)){fail('Pilih berkas .epub.');return;}if(file.size>30*1024*1024){fail('Ukuran maksimal 30 MB.');return;}
 if($('#upload-zone'))$('#upload-zone').disabled=true;
 try{const buffer=await file.arrayBuffer(),parsed=await parseEpub(buffer,file.name);const hash=await crypto.subtle.digest('SHA-256',buffer),id='import-'+Array.from(new Uint8Array(hash),v=>v.toString(16).padStart(2,'0')).join('').slice(0,24);
 if(books.some(b=>b.id===id)){closeOverlay();toast('Buku ini sudah ada di rak.');return;}
 const book={...parsed,id,source:'local',epubBuffer:buffer,cover:genericCover(parsed.title,parsed.author)};if(!await Store.dbPut('books',book))throw Error('Penyimpanan perangkat penuh atau tidak tersedia.');books.push(book);activeLibraryId=id;
 try{const channel=new BroadcastChannel('lumina-library');channel.postMessage({kind:'book-added',id});channel.close();}catch{}
 closeOverlay();renderLibrary();toast('Buku ditambahkan ke rak.');
 }catch(e){fail(e.message||'Berkas tidak dapat dibuka.');}finally{if($('#upload-zone'))$('#upload-zone').disabled=false;$('#epub-input').value='';}
}
function download(filename,text){const url=URL.createObjectURL(new Blob([text],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function exportNotes(){download('katakecil-catatan.json',JSON.stringify({exportedAt:new Date().toISOString(),deviceId:Store.deviceId,annotations:Store.annotations.map(a=>({...a,bookTitle:books.find(b=>b.id===a.bookId)?.title||a.bookId}))},null,2));toast('Catatan diekspor.');}
function statusDialog(){showOverlay(`${dialogHeading('Perangkat ini')}<p class="dialog-caption">Progres, catatan, dan buku yang sudah dibuka tersimpan di browser ini.</p><div class="status-details"><span>${Store.storageHealthy?'Penyimpanan aktif':'Penyimpanan tidak tersedia'}</span><code>${escapeHTML(Store.deviceId)}</code></div><p class="settings-caption">Menghapus data browser juga menghapus data lokal. Ekspor catatan untuk menyimpan salinannya.</p><div class="dialog-actions"><button class="secondary" data-action="export-notes">Ekspor catatan</button></div>`);}
function setAccent(color){if(!/^#[a-f\d]{6}$/i.test(color))return;Store.updatePreferences({accentColor:color});applyPreferences();$$('.accent-swatch').forEach(el=>{el.classList.toggle('selected',el.dataset.value===color);el.setAttribute('aria-pressed',String(el.dataset.value===color));});if($('#accent-custom'))$('#accent-custom').value=color;}
function navigateLibrary(){readingRequest++;layoutRequest++;reflowing=false;closeOverlay();removeSelection();renderLibrary();}
async function handleAction(button,event){
 const action=button.dataset.action,id=button.dataset.id,value=button.dataset.value;
 switch(action){
  case 'library':navigateLibrary();break;
  case 'settings':readingRequest++;layoutRequest++;closeOverlay();removeSelection();renderSettings();break;
  case 'refresh':await loadCatalog();break;
  case 'select-book':selectBook(id);break;
  case 'carousel-prev':case 'carousel-next':{const index=books.findIndex(b=>b.id===activeLibraryId);const next=Math.max(0,Math.min(books.length-1,index+(action==='carousel-next'?1:-1)));if(books[next])selectBook(books[next].id);break;}
  case 'open':await openBook(id);break;
  case 'show-controls':setReaderMode('controls');break;
  case 'toggle-hud':setReaderMode(readerMode==='reading'?'controls':'reading');break;
  case 'fullscreen':await toggleFullscreen();break;
  case 'prev':goToPage(pageIndex-1);break;
  case 'next':goToPage(pageIndex+1);break;
  case 'bookmark':toggleBookmark();break;
  case 'contents':contentsDialog();break;
  case 'appearance':appearanceDialog();break;
  case 'close':closeOverlay();break;
  case 'drawer-tab':drawerTab=value;$$('.tab').forEach(el=>{el.classList.toggle('active',el.dataset.value===value);el.setAttribute('aria-selected',String(el.dataset.value===value));});$('#drawer-content').innerHTML=contentsBody();break;
  case 'chapter':{const index=pages.findIndex(pg=>pg.chapterIndex===Number(button.dataset.index));closeOverlay();goToPage(Math.max(0,index));setReaderMode('reading');break;}
  case 'highlight':saveHighlight(button.dataset.color);break;
  case 'new-note':noteDialog();break;
  case 'note-color':noteColor=button.dataset.color;$$('.note-colors button').forEach(el=>el.classList.toggle('selected',el.dataset.color===noteColor));break;
  case 'edit-annotation':{const annotation=Store.annotations.find(a=>a.id===id);if(annotation)noteDialog(annotation);break;}
  case 'delete-annotation':Store.deleteAnnotation(id);closeOverlay();updatePage();toast('Dihapus.');break;
  case 'jump-annotation':{const a=Store.annotations.find(a=>a.id===id);if(!a)return;if(a.needsReview){toast('Posisi catatan ini perlu ditinjau setelah pembaruan buku.');return;}closeOverlay();const offset=a.charOffset??a.startOffset??0;if(currentBook?.id===a.bookId){goToPage(pages.findIndex(pg=>pg.chapterIndex===a.chapterIndex&&offset>=pg.start&&offset<pg.end));setReaderMode('reading');}else await openBook(a.bookId,{chapterIndex:a.chapterIndex,start:offset});break;}
  case 'set-theme':Store.updatePreferences({themeMode:value});applyPreferences();$$('[data-action="set-theme"]').forEach(el=>{el.classList.toggle('active',el.dataset.value===value);el.setAttribute('aria-pressed',String(el.dataset.value===value));});break;
  case 'accent':setAccent(value);break;
  case 'font':Store.updatePreferences({fontFamily:value});applyPreferences();$$('[data-action="font"]').forEach(el=>el.classList.toggle('active',el.dataset.value===value));if(currentBook)await reflow();break;
  case 'import':importDialog();break;
  case 'choose-file':$('#epub-input').click();break;
  case 'export-notes':exportNotes();break;
  case 'status':statusDialog();break;
 }
}
document.addEventListener('click',event=>{
 const button=event.target.closest('[data-action]');if(button){if(performance.now()<ignoreClickUntil&&button.closest('.reader-shell')&&!button.closest('.reader-toolbar,.reader-controls'))return;handleAction(button,event).catch(error=>toast(error.message||'Coba lagi.'));return;}
 if(event.target.dataset.backdrop==='true'){closeOverlay();return;}
 if(!currentBook||overlay.firstChild||reflowing||performance.now()<ignoreClickUntil||!window.getSelection()?.isCollapsed)return;
 const mark=event.target.closest('[data-annotation]');if(mark){const a=Store.annotations.find(a=>a.id===mark.dataset.annotation);if(a)noteDialog(a);return;}
 if(!event.target.closest('.reading-page'))return;
 if(pointerStart&&(performance.now()-pointerStart.at>300||Math.hypot(event.clientX-pointerStart.x,event.clientY-pointerStart.y)>12))return;
 setReaderMode(readerMode==='reading'?'controls':'reading');
});
document.addEventListener('pointerdown',event=>{if(event.pointerType!=='touch')pointerStart={x:event.clientX,y:event.clientY,at:performance.now()};else pointerStart=null;});
document.addEventListener('input',event=>{
 const el=event.target;if(el.id==='accent-custom')setAccent(el.value);
 if(el.id==='settings-font-size'){Store.updatePreferences({fontSize:Number(el.value)});if($('#font-size-output'))$('#font-size-output').textContent=el.value;if(!currentBook)applyPreferences();}
 if(el.id==='page-scrubber'){$('#page-counter').textContent=`${Number(el.value)+1} / ${pages.length}`;el.setAttribute('aria-valuetext',`Halaman ${Number(el.value)+1} dari ${pages.length}`);}
});
document.addEventListener('change',event=>{const el=event.target;if(el.id==='app-language'&&['id','en'].includes(el.value)){Store.updatePreferences({uiLanguage:el.value});applyPreferences();}if(el.id==='settings-font-size'){applyPreferences();if(currentBook)reflow().catch(e=>toast(e.message));}if(el.id==='page-scrubber')goToPage(el.value);if(el.id==='epub-input'&&el.files[0])importFile(el.files[0]);});
document.addEventListener('submit',event=>{if(event.target.id!=='note-form')return;event.preventDefault();const note=$('#note-text').value.trim();if(editingAnnotation){Store.saveAnnotation({...editingAnnotation,noteText:note,color:noteColor});closeOverlay();updatePage();toast('Catatan tersimpan.');}else saveHighlight(noteColor,note);});
document.addEventListener('selectionchange',()=>{if(selectedRange&&!customSelection.active&&window.getSelection()?.isCollapsed){selectedRange=null;$('.selection-popover')?.remove();}});
document.addEventListener('mouseup',()=>setTimeout(selectionChanged,20));
document.addEventListener('keyup',event=>{if(event.shiftKey||event.key==='Shift')selectionChanged();});
function readerSelection(){if(customSelection.active)return true;const selection=window.getSelection();if(!selection||selection.isCollapsed)return false;const node=selection.anchorNode;return !!(node?.nodeType===1?node:node?.parentElement)?.closest('.page-text');}
for(const name of ['copy','cut'])document.addEventListener(name,event=>{if(readerSelection()&&!event.target.closest?.('input,textarea'))event.preventDefault();});
document.addEventListener('contextmenu',event=>{if(event.target.closest('.page-text')){event.preventDefault();selectionChanged();}});
document.addEventListener('dragstart',event=>{if(event.target.closest('.page-text'))event.preventDefault();});
document.addEventListener('keydown',event=>{
 const input=event.target.closest('input,textarea,select,[contenteditable="true"]');
 if((event.ctrlKey||event.metaKey)&&['c','x','insert'].includes(event.key.toLowerCase())&&readerSelection()&&!input){event.preventDefault();return;}
 if(event.key==='Escape'){if(overlay.firstChild)closeOverlay();else if(selectedRange)removeSelection();else if(currentBook)setReaderMode(readerMode==='reading'?'controls':'reading');return;}
 if(event.key==='Tab'&&overlay.firstChild){const panel=$('.dialog'),focusable=$$('button:not(:disabled),input,textarea,select,a[href]',panel).filter(el=>!el.closest('[hidden]'));const first=focusable[0],last=focusable.at(-1);if(event.shiftKey&&(document.activeElement===first||document.activeElement===panel)){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}return;}
 if(input||overlay.firstChild||customSelection.active||!window.getSelection()?.isCollapsed)return;
 if(currentBook){if(event.key.toLowerCase()==='h'){event.preventDefault();const bounds=wordBounds($('.page-text').textContent,0);customSelection.select(bounds.start,bounds.end);$('.selection-handle-start')?.focus();return;}if(event.key==='ArrowRight'){event.preventDefault();goToPage(pageIndex+1);}if(event.key==='ArrowLeft'){event.preventDefault();goToPage(pageIndex-1);}if(event.key==='Enter'||event.key===' '){event.preventDefault();setReaderMode(readerMode==='reading'?'controls':'reading');}if(event.key.toLowerCase()==='b')toggleBookmark();}
 else if(view==='library'&&['ArrowRight','ArrowLeft'].includes(event.key)){event.preventDefault();const index=books.findIndex(b=>b.id===activeLibraryId),next=books[Math.max(0,Math.min(books.length-1,index+(event.key==='ArrowRight'?1:-1)))];if(next)selectBook(next.id);}
});
const touchDistance=touches=>Math.hypot(touches[0].clientX-touches[1].clientX,touches[0].clientY-touches[1].clientY);
document.addEventListener('touchstart',event=>{
 if(!currentBook||overlay.firstChild||customSelection.active||!event.target.closest('.reading-page'))return;
 if(event.touches.length>=2){touchState={kind:'pinch',distance:touchDistance(event.touches),fired:false};ignoreClickUntil=performance.now()+600;}
 else touchState={kind:'single',x:event.touches[0].clientX,y:event.touches[0].clientY,at:performance.now()};
},{passive:true});
document.addEventListener('touchmove',event=>{
 if(!touchState||!currentBook)return;
 if(event.touches.length>=2){if(touchState.kind!=='pinch')touchState={kind:'pinch',distance:touchDistance(event.touches),fired:false};if(touchDistance(event.touches)<touchState.distance*.92){if(event.cancelable)event.preventDefault();touchState.fired=true;setReaderMode('controls');ignoreClickUntil=performance.now()+700;}}
},{passive:false});
document.addEventListener('touchend',event=>{
 setTimeout(selectionChanged,160);if(!touchState||event.touches.length)return;
 const state=touchState;touchState=null;if(customSelection.active||customSelection.interacting)return;if(state.kind==='pinch'){ignoreClickUntil=performance.now()+500;return;}
 const end=event.changedTouches[0];if(!end)return;
 const dx=end.clientX-state.x,dy=end.clientY-state.y,duration=performance.now()-state.at;
 if(Math.abs(dx)>65&&Math.abs(dx)>Math.abs(dy)*1.6&&window.getSelection()?.isCollapsed){ignoreClickUntil=performance.now()+500;goToPage(pageIndex+(dx<0?1:-1));}
 else if(duration>320||Math.abs(dx)>12||Math.abs(dy)>12)ignoreClickUntil=performance.now()+400;
},{passive:true});
document.addEventListener('touchcancel',()=>{touchState=null;ignoreClickUntil=performance.now()+400;},{passive:true});
window.addEventListener('resize',()=>{clearTimeout(resizeTimer);if(window.visualViewport?.scale>1)return;resizeTimer=setTimeout(()=>{if(currentBook)reflow().catch(e=>toast(e.message));},180);});
matchMedia('(prefers-color-scheme: dark)').addEventListener('change',applyPreferences);
let lastTextPreferences=JSON.stringify([p().fontFamily,p().fontSize,p().lineHeight]);
Store.onSync((kind,payload)=>{
 if(kind==='preferences'){const signature=JSON.stringify([p().fontFamily,p().fontSize,p().lineHeight]),textChanged=signature!==lastTextPreferences;applyPreferences();if(currentBook&&textChanged)reflow().catch(e=>toast(e.message));if(view==='settings'&&!overlay.firstChild)renderSettings();}
 else if(kind==='progress'&&currentBook&&(!payload||payload.bookId===currentBook.id)){const saved=payload||Store.progress[currentBook.id];if(saved){const i=pages.findIndex(pg=>pg.chapterIndex===saved.chapterIndex&&(saved.charOffset||0)>=pg.start&&(saved.charOffset||0)<pg.end);if(i>=0){pageIndex=i;updatePage();}}}
 else if(kind.includes('annotation')&&currentBook){if(!readerSelection())updatePage();if($('#drawer-content'))$('#drawer-content').innerHTML=contentsBody();}
 else if(view==='library'&&$('#shelf-action'))$('#shelf-action').innerHTML=shelfAction();
});
try{const channel=new BroadcastChannel('lumina-library');channel.onmessage=async()=>{const stored=await Store.dbGetAll('books');for(const book of stored.filter(b=>b.source==='local'))if(!books.some(b=>b.id===book.id))books.push(book);if(view==='library')renderLibrary();};}catch{}
function syncAppTitle(){const title=view==='settings'?translatePhrase('Pengaturan'):view==='reader'&&currentBook?currentBook.title:'Library';const next=title+' · KataKecil';if(document.title!==next)document.title=next;}
startUiTranslations(syncAppTitle);
async function init(){activeLibraryId=readLocal('lumina_selected_book','');applyPreferences();await Store.hydrate();renderLibrary();await loadCatalog();if(!Store.storageHealthy)toast('Penyimpanan perangkat tidak tersedia.');}
init().catch(()=>{catalogState='error';catalogError='Rak belum bisa dibuka. Coba segarkan halaman.';renderLibrary();});
