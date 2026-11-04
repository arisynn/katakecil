import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {runInNewContext} from 'node:vm';
import {createRequire} from 'node:module';
import {indexedDB,IDBKeyRange} from 'fake-indexeddb';
const dom=new JSDOM('<html><head><meta name="theme-color"></head><body><div id="app"></div><div id="overlay-root"></div><div id="toast"></div><input type="file" id="epub-input"><input type="file" id="backup-input" hidden></body></html>',{url:'https://reader.example/',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window;
const zipModule={exports:{}};
runInNewContext(await readFile(new URL('../dist/vendor/jszip.min.js',import.meta.url),'utf8'),{module:zipModule,exports:zipModule.exports,require:createRequire(import.meta.url),setTimeout,clearTimeout,setImmediate,Buffer,Uint8Array,ArrayBuffer,Promise});
const channels=new Map();
class MockBroadcastChannel {
 constructor(name){this.name=name;this.onmessage=null;if(!channels.has(name))channels.set(name,new Set());channels.get(name).add(this);}
 postMessage(data){for(const channel of channels.get(this.name))if(channel!==this)queueMicrotask(()=>channel.onmessage?.({data}));}
 close(){channels.get(this.name).delete(this);}
}
for(const key of ['document','DOMParser','localStorage','navigator','HTMLElement','Node','Range','Event','MouseEvent'])Object.defineProperty(globalThis,key,{value:w[key],configurable:true});
Object.assign(globalThis,{window:w,JSZip:zipModule.exports,indexedDB,IDBKeyRange,BroadcastChannel:MockBroadcastChannel,innerWidth:1440,innerHeight:900,location:w.location,requestAnimationFrame:w.requestAnimationFrame.bind(w),matchMedia:()=>({matches:false,addEventListener(){}})});
w.scrollTo=()=>{};
w.matchMedia=globalThis.matchMedia;
w.Range.prototype.getBoundingClientRect=()=>({left:300,top:220,bottom:250,width:150,height:30});
const fixtureBooks=[
 {id:'masa-panen-google-play-ready-1',title:'Masa Panen',author:'Karisyono',url:'https://library.test/?action=epub&book=masa',source:'supabase',version:'one'},
 {id:'garis-yang-kita-teruskan-karisyono-final-45-bab',title:'Garis yang Kita Teruskan',author:'Karisyono',url:'https://library.test/?action=epub&book=garis',source:'supabase',version:'one'},
 {id:'kk-uji-terminal-internal',title:'Buku kecil',author:'Kata Kecil',url:'https://library.test/?action=epub&book=kecil',source:'supabase',version:'one'}
];
const sectionIds=Array.from({length:12},(_,i)=>'00000000-0000-4000-8000-'+String(i+1).padStart(12,'0'));
for(const [i,book] of fixtureBooks.entries()){book.revision=String(i+1).repeat(64);book.version=book.revision;book.section_ids=i===1?[sectionIds[0]]:sectionIds;}
let catalogFails=false,publishedAlice;
globalThis.fetch=async(url)=>{
 const address=new URL(String(url),'https://reader.example/');
 if(address.hostname==='hrbcwymdqigtfmpmsdsi.supabase.co'&&address.pathname.endsWith('katakecil-reader')){
  if(catalogFails)throw Error('offline');if(address.searchParams.get('action')==='catalog')return Response.json({books:fixtureBooks});
  const book=fixtureBooks.find(b=>b.id===address.searchParams.get('book'));if(!book)return new Response('unpublished',{status:404});
  let bytes;
  if(book.id.includes('garis'))bytes=await tinyEpub([{name:'section-'+sectionIds[0]+'.xhtml',html:'<h1>Bab 1 — Bahasa yang Tetap</h1><p>Ini cerita berbahasa Indonesia. Buku tetap dalam bahasa aslinya.</p>'}]);
  else{if(!publishedAlice){const parsed=await parseEpub(await readFile(new URL('./fixtures/epubs/alice.epub',import.meta.url)));publishedAlice=await tinyEpub(parsed.chapters.map((c,i)=>({name:'section-'+sectionIds[i]+'.xhtml',html:'<h1>'+c.chapterLabel+' — '+c.title+'</h1><p>'+c.text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('\n\n','</p><p>')+'</p>'})));}bytes=publishedAlice;}
  return new Response(bytes,{headers:{'Content-Type':'application/epub+zip','X-KataKecil-Revision':book.revision}});
 }
 try{return new Response(await readFile(new URL('../dist'+address.pathname,import.meta.url)));}catch{return new Response('missing',{status:404});}
};
const {parseEpub,paginate}=await import('../dist/epub.js');
const parsedBooks=new Map();
const wait=(ms=25)=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(check,description){for(let i=0;i<200;i++){if(check())return;await wait();}assert.fail('Timed out: '+description);}
const $=selector=>w.document.querySelector(selector);
function click(selector){const el=$(selector);assert.ok(el,'Missing element: '+selector);el.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));}
function input(selector,value){const el=$(selector);assert.ok(el,'Missing input: '+selector);el.value=value;el.dispatchEvent(new w.Event('input',{bubbles:true}));}
function selectWords(start=20,length=55,rootSelector='.page-text'){const root=$(rootSelector),quote=root.textContent.slice(start,start+length);w.document.caretRangeFromPoint=x=>{
 const walker=w.document.createTreeWalker(root,w.NodeFilter.SHOW_TEXT);let node,left=Math.max(0,Math.min(root.textContent.length,x)),last;while(node=walker.nextNode()){last=node;if(left<=node.textContent.length)break;left-=node.textContent.length;}node=node||last;const range=w.document.createRange();range.setStart(node,Math.min(left,node.textContent.length));range.collapse(true);return range;};
 const pointer=(name,x)=>{const event=new w.MouseEvent(name,{bubbles:true,cancelable:true,clientX:x,clientY:250,button:0});Object.defineProperties(event,{pointerId:{value:1},pointerType:{value:'mouse'}});root.dispatchEvent(event);};pointer('pointerdown',start);pointer('pointermove',start+length);pointer('pointerup',start+length);return quote;}


test('all bundled EPUBs contain real chapters and pagination preserves every character',async()=>{
 const expected={alice:12,pride:40,frankenstein:20,sherlock:12,treasure:30,time:12};
 for(const id of Object.keys(expected)){
  const bytes=await readFile(new URL(`./fixtures/epubs/${id}.epub`,import.meta.url));
  const book=await parseEpub(bytes);
  parsedBooks.set(id,book);
  assert.ok(book.chapters.length>=expected[id],`${id}: expected at least ${expected[id]} chapters, got ${book.chapters.length}`);
  assert.ok(book.title&&book.author);
  const pages=paginate(book.chapters,1500);
  book.chapters.forEach((chapter,index)=>{const fragments=pages.filter(p=>p.chapterIndex===index);assert.equal(fragments.map(p=>p.text).join(''),chapter.text,`${id}: chapter ${index} retains every character`);assert.equal(fragments[0].start,0);assert.equal(fragments.at(-1).end,chapter.text.length);});
  console.log(`${id}: ${book.chapters.length} chapters, ${pages.length} pages; opening: ${book.chapters[0].title}`);
 }
 assert.match(parsedBooks.get('alice').chapters[0].text,/Alice was beginning to get very tired/);
 assert.match(parsedBooks.get('pride').chapters[0].text,/truth universally acknowledged/i);
 for(const book of parsedBooks.values())assert.ok(!book.chapters.some(c=>/END OF THE PROJECT GUTENBERG|FULL PROJECT GUTENBERG/.test(c.text)),'license boilerplate stays outside reading text');
});

test('malformed and encrypted files fail without executing markup',async()=>{
 await assert.rejects(()=>parseEpub(new Uint8Array([1,2,3])));
 const zip=new JSZip();zip.file('META-INF/encryption.xml','<encryption/>');
 const encrypted=await zip.generateAsync({type:'uint8array'});await assert.rejects(()=>parseEpub(encrypted),/Encrypted/);
});

test('local persistence and BroadcastChannel apply preferences, annotations, and progress',async()=>{
 const store=await import('../dist/store.js?v=14');
 await store.openDatabase();
 store.updatePreferences({glassBlur:34});
 assert.equal(JSON.parse(localStorage.getItem('lumina_device_settings')).glassBlur,34);
 assert.match(store.deviceId,/^[0-9a-f-]{36}$/);
 store.saveProgress({bookId:'alice',chapterIndex:2,pageIndex:3,totalPages:12,charOffset:150,percentage:25});
 await wait();
 assert.equal((await store.dbGetAll('progress'))[0].charOffset,150);
 const annotation={id:'test-annotation',bookId:'alice',type:'highlight',chapterIndex:0,startOffset:20,endOffset:40,selectedText:'test',createdAt:new Date().toISOString(),color:'amber'};
 store.saveAnnotation(annotation);await wait();assert.ok((await store.dbGetAll('annotations')).some(a=>a.id===annotation.id));
 store.deleteAnnotation(annotation.id);await wait();assert.equal((await store.dbGetAll('annotations')).filter(a=>!a.deleted).length,0);
 const remote=new MockBroadcastChannel('lumina-local-sync');remote.postMessage({kind:'preferences',payload:{...store.preferences,glassBlur:17}});await wait();assert.equal(store.preferences.glassBlur,17);
 remote.close();
 store.updatePreferences({...store.DEFAULTS,uiLanguage:'id',uiLanguageChosen:true});
 store.saveProgress({bookId:'alice',chapterIndex:0,pageIndex:0,totalPages:12,charOffset:0,percentage:0});
});

test('personal carousel, reader controls, highlights, copy blocking, and settings work together',async()=>{
 const store=await import('../dist/store.js?v=14');
 const legacyChapters=[{href:'title.xhtml',title:'Title',text:'Edition info'},...parsedBooks.get('alice').chapters];
 await store.dbPut('books',{...fixtureBooks[0],parsedRevision:2,chapters:legacyChapters});
 store.saveProgress({bookId:fixtureBooks[0].id,chapterIndex:1,charOffset:0,pageIndex:0,totalPages:100,percentage:0});
 store.saveAnnotation({id:'legacy-bookmark',bookId:fixtureBooks[0].id,type:'bookmark',chapterIndex:2,charOffset:0,createdAt:new Date().toISOString(),color:'sapphire'});
 await import('../dist/app.js');
 await until(()=>$('.shelf-book'),'Supabase collection loaded');
 assert.equal(w.document.querySelectorAll('.shelf-book').length,3);
 assert.equal($('.bottom-tabs'),null);assert.equal($('[data-action="library"]'),null,'Library has no redundant self-navigation');assert.ok($('.library-header-actions [data-action="settings"]'));assert.ok($('.library-header-actions [data-action="refresh"]'));
 assert.equal($('[data-action="import"]'),null,'no upload action in Library');
 assert.equal($('.sidebar'),null);assert.equal($('.hero'),null);assert.equal($('.brand-mark'),null);assert.equal($('.book-count'),null);assert.equal($('.library-header h1').textContent,'Library');assert.ok($('.header-brand-space'));assert.ok(!$('.library-header').textContent.includes('KataKecil'));assert.ok($('.library-shell'));assert.equal($('.book-title'),null,'cover captions are hidden');assert.equal($('.book-author'),null);
 click('[data-action="carousel-next"]');assert.match($('.shelf-book.is-current').dataset.bookId,/garis/);
 click('[data-action="select-book"][data-id="masa-panen-google-play-ready-1"]');
 click('.read-button');assert.ok($('.reader-shell[data-mode=loading]'),'opening starts on its own loading page');assert.equal($('#toast').classList.contains('visible'),false,'opening never uses a toast');await until(()=>$('.page-text')&&$('.reader-loading')?.classList.contains('hidden'),'reader paginated');
 assert.equal($('.reader-shell').dataset.mode,'reading');assert.equal(JSON.parse(localStorage.getItem('katakecil_active_reader')).bookId,fixtureBooks[0].id);assert.equal($('.bottom-tabs'),null);assert.equal(store.progress[fixtureBooks[0].id].chapterIndex,0,'old cache position migrates past removed title page');assert.equal(store.annotations.find(a=>a.id==='legacy-bookmark').chapterIndex,1);assert.equal((await store.dbGetAll('books')).find(b=>b.id===fixtureBooks[0].id),undefined,'server manuscripts are not cached in IndexedDB');
 assert.match($('.page-text').textContent,/Alice was beginning/);assert.match($('.chapter-label').textContent,/BAB I/,'chapter marker comes from the source EPUB');assert.ok(!$('.reading-page').textContent.includes('Section '));
 const page=$('#reading-page'),text=$('.page-text').textContent;
 let requests=0,exits=0;Object.defineProperty(w.document,'fullscreenElement',{value:null,writable:true,configurable:true});w.document.documentElement.requestFullscreen=async()=>{requests++;w.document.fullscreenElement=w.document.documentElement;};w.document.exitFullscreen=async()=>{exits++;w.document.fullscreenElement=null;};
 click('[data-action="show-controls"]');assert.equal($('.reader-shell').dataset.mode,'controls');assert.equal($('#reading-page'),page);assert.equal($('.page-text').textContent,text);
 click('.page-text');assert.equal($('.reader-shell').dataset.mode,'reading');assert.equal($('#reading-page'),page);
 click('[data-action="show-controls"]');click('[data-action="fullscreen"]');await wait();assert.equal(requests,1,'fullscreen action calls the browser API');assert.equal($('.reader-shell').dataset.mode,'reading');click('[data-action="show-controls"]');click('[data-action="fullscreen"]');await wait();assert.equal(exits,1);assert.equal($('.reader-shell').dataset.mode,'controls');const requestFullscreen=w.document.documentElement.requestFullscreen;delete w.document.documentElement.requestFullscreen;click('[data-action="fullscreen"]');await wait();assert.equal($('.reader-shell').dataset.mode,'controls','unsupported fullscreen does not silently close the menu');w.document.documentElement.requestFullscreen=requestFullscreen;click('[data-action="next"]');const second=$('.page-text').textContent;assert.notEqual(second,text);click('[data-action="prev"]');
 const range=$('#page-scrubber');input('#page-scrubber','2');assert.equal($('#page-scrubber'),range);range.dispatchEvent(new w.Event('change',{bubbles:true}));assert.equal(store.progress[fixtureBooks[0].id].pageIndex,2);input('#page-scrubber','0');$('#page-scrubber').dispatchEvent(new w.Event('change',{bubbles:true}));
 $('.page-text').dispatchEvent(new w.KeyboardEvent('keydown',{key:'h',bubbles:true,cancelable:true}));assert.ok($('.selection-handle-start'));assert.equal(w.document.activeElement,$('.selection-handle-start'));$('.selection-handle-start').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));assert.equal($('.custom-selection-layer'),null);
 const quote=selectWords();await until(()=>$('.selection-popover'),'highlight toolbar');
 const copy=new w.Event('copy',{bubbles:true,cancelable:true});$('.page-text').dispatchEvent(copy);assert.ok(copy.defaultPrevented,'copy is blocked for reader selection');assert.equal(w.getSelection().rangeCount,0,'highlighting does not create native selection or Google search triggers');assert.equal(w.document.querySelectorAll('.selection-handle').length,2);
 const context=new w.MouseEvent('contextmenu',{bubbles:true,cancelable:true});$('.page-text').dispatchEvent(context);assert.ok(context.defaultPrevented);
 click('[data-action="highlight"][data-color="emerald"]');assert.equal($('mark').textContent,quote);
 selectWords(100,35);await until(()=>$('.selection-popover'),'second selection');click('[data-action="new-note"]');input('#note-text','Bagian yang ingin kusimpan.');
 const noteEditor=$('#note-text'),readerText=$('.page-text');noteEditor.focus();await wait(40);assert.equal(w.document.activeElement,noteEditor,'opening a sheet cannot steal focus from its editor');w.dispatchEvent(new w.Event('resize'));await wait(250);assert.equal(w.document.activeElement,noteEditor);assert.equal($('.page-text'),readerText,'keyboard resize must not repaginate the reader while editing');assert.equal(noteEditor.value,'Bagian yang ingin kusimpan.');
 const noteCopy=new w.Event('copy',{bubbles:true,cancelable:true});$('#note-text').dispatchEvent(noteCopy);assert.equal(noteCopy.defaultPrevented,true,'copy is blocked throughout the app, including notes');
 $('#note-form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));assert.ok(store.annotations.some(a=>a.noteText==='Bagian yang ingin kusimpan.'));
 click('[data-action="bookmark"]');assert.ok(store.annotations.some(a=>a.bookId===fixtureBooks[0].id&&a.type==='bookmark'));
 click('[data-action="appearance"]');const anchor=store.progress[fixtureBooks[0].id].charOffset;input('[data-reader-pref="fontSize"]','24');$('[data-reader-pref="fontSize"]').dispatchEvent(new w.Event('change',{bubbles:true}));await until(()=>$('.reader-loading')?.classList.contains('hidden'),'font reflow');assert.ok($('mark'));assert.equal(store.progress[fixtureBooks[0].id].charOffset,anchor);click('[data-action="close"]');
 click('[data-action="contents"]');assert.equal(w.document.querySelectorAll('.toc-item').length,12);click('[data-action="chapter"][data-index="2"]');assert.equal(store.progress[fixtureBooks[0].id].chapterIndex,2);assert.equal($('.reader-shell').dataset.mode,'reading');
 // A two-finger gesture must open controls without also advancing a page.
 const beforePinch=store.progress[fixtureBooks[0].id].charOffset;
 const touch=(name,touches,changed=touches)=>{const e=new w.Event(name,{bubbles:true,cancelable:true});Object.defineProperties(e,{touches:{value:touches},changedTouches:{value:changed}});$('.page-text').dispatchEvent(e);return e;};
 const fontBeforeZoom=store.preferences.fontSize;
 touch('touchstart',[{clientX:40,clientY:200},{clientX:240,clientY:200}]);touch('touchmove',[{clientX:0,clientY:200},{clientX:300,clientY:200}]);assert.equal($('#reading-page').style.getPropertyValue('--reading-zoom'),'1.5');assert.ok($('#reading-page').hasAttribute('data-zoomed'));assert.equal(store.preferences.fontSize,fontBeforeZoom);assert.equal(store.progress[fixtureBooks[0].id].charOffset,beforePinch);touch('touchend',[],[{clientX:0,clientY:200}]);$('.page-text').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal($('#reading-page').style.getPropertyValue('--reading-zoom'),'1');$('.page-text').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
 touch('touchstart',[{clientX:40,clientY:200},{clientX:240,clientY:200}]);const pinch=touch('touchmove',[{clientX:85,clientY:200},{clientX:195,clientY:200}]);assert.ok(pinch.defaultPrevented);assert.equal($('.reader-shell').dataset.mode,'controls');touch('touchend',[],[{clientX:85,clientY:200}]);assert.equal(store.progress[fixtureBooks[0].id].charOffset,beforePinch);
 await wait(550);click('[data-action="library"]');click('[data-action="settings"]');assert.equal($('.advanced-settings').open,false);assert.ok($('[data-action="import"]').closest('details'));assert.ok($('.setting-label svg'),'settings rows have icons');assert.ok($('[data-action=about]').closest('.advanced-settings'),'About belongs inside Advanced');assert.equal(w.document.querySelectorAll('.settings-content>.settings-group').length,3);assert.equal(JSON.parse(localStorage.getItem('katakecil_active_reader')),null);for(const name of ['copy','cut','contextmenu','selectstart']){const event=new w.Event(name,{bubbles:true,cancelable:true});$('.settings-header h1').dispatchEvent(event);assert.equal(event.defaultPrevented,true,name+' is blocked on app labels');}
 click('[data-action="accent"][data-value="#82669c"]');assert.equal(w.document.documentElement.style.getPropertyValue('--accent'),'#82669c');assert.equal(JSON.parse(localStorage.getItem('lumina_device_settings')).accentColor,'#82669c');
 input('#accent-custom','#dfb142');assert.equal(store.preferences.accentColor,'#dfb142');
 click('[data-action="global-theme"]');click('[data-action="app-theme-preset"][data-value="dark"]');assert.equal(w.document.body.dataset.theme,'dark');click('[data-action="close"]');
 click('[data-action="import"]');assert.ok($('#upload-zone'));click('[data-action="close"]');
 click('[data-action="library"]');catalogFails=true;click('.read-button');assert.ok($('.reader-shell[data-mode=loading]'));await until(()=>$('.library-header')&&$('#toast').classList.contains('visible'),'failed opening returns to Library with error feedback');click('[data-action="refresh"]');await until(()=>$('.offline-label'),'offline catalog recovery');assert.equal(w.document.querySelectorAll('.shelf-book').length,3);catalogFails=false;
});

test('catalog normalization accepts production data and rejects duplicate IDs and unsafe URLs',async()=>{
 const {normalizeCatalog}=await import('../dist/app.js');
 assert.equal(normalizeCatalog({books:fixtureBooks}).length,3);
 assert.throws(()=>normalizeCatalog({books:[fixtureBooks[0],fixtureBooks[0]]}),/Invalid/);
 assert.throws(()=>normalizeCatalog({books:[{id:'bad',title:'bad',url:'javascript:alert(1)'}]}),/valid/);
});

async function tinyEpub(files){
 const zip=new JSZip();zip.file('mimetype','application/epub+zip');zip.file('META-INF/container.xml','<container><rootfiles><rootfile full-path="OPS/book.opf"/></rootfiles></container>');
 const items=files.map((f,i)=>`<item id="s${i}" href="${f.name}" media-type="application/xhtml+xml"/>`).join('');
 zip.file('OPS/book.opf',`<package xmlns:dc="http://purl.org/dc/elements/1.1/"><metadata><dc:title>Test book</dc:title><dc:creator>Writer</dc:creator><dc:language>id</dc:language></metadata><manifest>${items}</manifest><spine>${files.map((f,i)=>`<itemref idref="s${i}"/>`).join('')}</spine></package>`);
 for(const f of files)zip.file('OPS/'+f.name,'<html><body>'+f.html+'</body></html>');return zip.generateAsync({type:'uint8array'});
}
test('chapter names are extracted once from nested spans and numbered paragraph headings',async()=>{
 const bytes=await tinyEpub([
  {name:'title.xhtml',html:'<h1>Test book</h1><p>Author</p>'},
  {name:'imprint.xhtml',html:'<p>Edition 2026</p>'},
  {name:'first.xhtml',html:'<h1><span class="chapter-no">Episode 3</span><span class="chapter-name">Kelereng Putih</span></h1><p>Paragraf pertama yang sebenarnya.</p>'},
  {name:'second.xhtml',html:'<p><strong>Bab 4 — Sesudah Tepuk Tangan</strong></p><p>Paragraf berikutnya.</p>'},
  {name:'third.xhtml',html:'<p>Bab 5</p><h1>Kursi yang Tersisa</h1><p>Teks cerita di bawah judul.</p>'},
  {name:'fourth.xhtml',html:'<p>Bagian ini masih bagian cerita, bukan judul.</p><p>Kalimat tanpa judul buatan.</p>'},
  {name:'fifth.xhtml',html:'<h2 id="chapter-11-title">Hari yang Tidak Istimewa</h2><p>Nomor bab ada pada identitas judul.</p>'},
  {name:'sixth.xhtml',html:'<h2 id="random-12-title">Judul Biasa</h2><p>Nomor sembarang bukan nomor bab.</p>'}
 ]);
 const book=await parseEpub(bytes);assert.equal(book.chapters.length,6);
 assert.deepEqual(book.chapters.map(c=>c.title),['Kelereng Putih','Sesudah Tepuk Tangan','Kursi yang Tersisa','','Hari yang Tidak Istimewa','Judul Biasa']);assert.deepEqual(book.chapters.map(c=>c.chapterLabel),['EPISODE 3','BAB 4','BAB 5','','BAB 11','']);
 assert.equal(book.chapters[0].text,'Paragraf pertama yang sebenarnya.');
 assert.equal(book.chapters[1].text,'Paragraf berikutnya.');
 assert.equal(book.chapters[2].text,'Teks cerita di bawah judul.');
 assert.ok(!JSON.stringify(book.chapters).includes('Section '));assert.match(book.chapters[3].text,/Bagian ini masih bagian cerita/);
});


test('language setting persists and synchronizes while reader text and reading positions remain intact',async()=>{
 const store=await import('../dist/store.js?v=14');const device=store.deviceId;const previousNotes=JSON.stringify(store.annotations);
 click('[data-action="settings"]');assert.ok($('.settings-header [data-action="library"]'),'Settings has a back action');assert.equal($('.bottom-tabs'),null);assert.equal($('#app-language').value,'id');$('#app-language').value='en';$('#app-language').dispatchEvent(new w.Event('change',{bubbles:true}));await wait();
 assert.equal(w.document.documentElement.lang,'en');assert.equal($('.settings-header h1').textContent,'Settings');assert.match($('.settings-shell').textContent,/App language/);assert.ok(!$('.settings-shell').textContent.includes('Books stay in their original language'));assert.equal($('.settings-shell .settings-caption'),null);assert.equal(JSON.parse(localStorage.getItem('lumina_device_settings')).uiLanguage,'en');assert.equal(store.deviceId,device);assert.equal(JSON.stringify(store.annotations),previousNotes);
 click('[data-action="library"]');await wait();assert.equal($('.bottom-tabs'),null);assert.equal($('.library-header-actions [data-action="settings"]').getAttribute('aria-label'),'Settings');click('[data-action="settings"]');await wait();assert.equal($('#app-language').value,'en');assert.equal($('.settings-header h1').textContent,'Settings');
 click('[data-action="library"]');click('[data-action="open"][data-id="garis-yang-kita-teruskan-karisyono-final-45-bab"]');await until(()=>$('.page-text')&&$('.reader-loading')?.classList.contains('hidden'),'Indonesian book opened in English UI');await wait();
 const root=$('.page-text'),chapter=$('.page-heading h1').textContent,source=root.textContent,position=JSON.stringify(store.progress['garis-yang-kita-teruskan-karisyono-final-45-bab']);
 assert.match(source,/Ini cerita berbahasa Indonesia/);assert.equal(root.lang,'id');assert.equal($('.chapter-label').textContent,'BAB 1');assert.equal(chapter,'Bahasa yang Tetap');assert.equal($('[data-action="contents"]').textContent.trim(),'Contents');assert.equal($('[data-action="appearance"]').textContent.trim(),'Appearance');assert.equal($('[data-action="fullscreen"]').textContent.trim(),'Full screen');
 const remote=new MockBroadcastChannel('lumina-local-sync');remote.postMessage({kind:'preferences',payload:{...store.preferences,uiLanguage:'id'}});await wait();assert.equal(w.document.documentElement.lang,'id');assert.equal($('.page-text'),root,'language changes keep the page mounted');assert.equal(root.textContent,source);assert.equal($('.page-heading h1').textContent,chapter);assert.equal($('.chapter-label').textContent,'BAB 1');assert.equal(JSON.stringify(store.progress['garis-yang-kita-teruskan-karisyono-final-45-bab']),position);assert.equal($('[data-action="contents"]').textContent.trim(),'Daftar isi');remote.close();
});

test('advanced reader integrates display, scroll, spread, page jumps, search, annotations and selected-text tools',async()=>{
 const store=await import('../dist/store.js?v=14');const bookId=fixtureBooks[0].id;
 click('[data-action="library"]');click('[data-action="settings"]');$('#app-language').value='en';$('#app-language').dispatchEvent(new w.Event('change',{bubbles:true}));
 click('[data-action="library"]');click('[data-action="open"][data-id="'+bookId+'"]');await until(()=>$('.reader-loading')?.classList.contains('hidden'),'advanced reader opened');
 const otherProgress=JSON.stringify(store.progress[fixtureBooks[1].id]);
 const changePref=async(key,value)=>{let el=$('[data-reader-pref="'+key+'"]');if(!el){const layout=['readingMode','spreadMode','pageAnimation','marginHorizontal','marginVertical','readerWidth','contentPosition','brightness','orientation','tapNavigation','wakeLock'].includes(key);click('[data-action="appearance-tab"][data-value="'+(layout?'layout':'text')+'"]');el=$('[data-reader-pref="'+key+'"]');}assert.ok(el,key);if(el.type==='checkbox')el.checked=value;else el.value=String(value);el.dispatchEvent(new w.Event('input',{bubbles:true}));el.dispatchEvent(new w.Event('change',{bubbles:true}));await until(()=>$('.reader-loading')?.classList.contains('hidden'),'preference '+key+' reflow');};
 click('[data-action="show-controls"]');click('[data-action="reader-tools"]');
 const beforeInvalidJump=store.progress[bookId].charOffset,invalidForm=$('#page-jump-form');$('#page-jump').value='0';invalidForm.requestSubmit();assert.equal($('#page-jump-form'),invalidForm,'invalid navigation keeps its sheet');assert.equal(store.progress[bookId].charOffset,beforeInvalidJump);assert.match($('#toast').textContent,/Enter a value between/);assert.equal(w.document.activeElement,$('#page-jump'));
 $('#page-jump').value='3';$('#page-jump-form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));assert.equal(store.progress[bookId].pageIndex,2);const originalOffset=store.progress[bookId].charOffset;assert.ok(originalOffset>0);
 click('[data-action="appearance"]');await changePref('fontSize',22);assert.equal(store.progress[bookId].charOffset,originalOffset,'a nonzero source anchor survives reflow');
 for(const [key,value,css] of [['fontWeight',600,'--reader-weight'],['lineHeight',1.6,'--reader-line'],['paragraphSpacing',8,'--paragraph-space'],['letterSpacing',.4,'--letter-space'],['paragraphIndent',1,'--paragraph-indent'],['marginHorizontal',20,'--reader-inset-x'],['marginVertical',18,'--reader-inset-y'],['readerWidth',680,'--reader-width']]){await changePref(key,value);assert.ok(w.document.documentElement.style.getPropertyValue(css).startsWith(String(value)),key+' affects actual CSS');assert.equal(store.progress[bookId].charOffset,originalOffset);}
 await changePref('textAlign','justify');assert.equal(w.document.documentElement.style.getPropertyValue('--reader-align'),'justify');
 click('[data-action="appearance-tab"][data-value="theme"]');click('[data-action="app-theme-preset"][data-value="sepia"]');assert.equal(store.preferences.themeMode,'sepia');assert.equal(store.preferences.readerTheme,'follow');assert.equal(w.document.body.style.getPropertyValue('--paper'),'#eee2c8');
 click('[data-action="app-theme-preset"][data-value="custom"]');$('#reader-ink').value='#ffffff';$('#reader-ink').dispatchEvent(new w.Event('input',{bubbles:true}));$('#reader-paper').value='#ffffff';$('#reader-paper').dispatchEvent(new w.Event('input',{bubbles:true}));assert.equal($('[data-action="apply-reader-theme"]').disabled,true,'unreadable custom contrast cannot be applied');assert.ok($('.global-theme-chip[data-value="custom"]').classList.contains('active'));
 await changePref('readingMode','scroll');assert.equal($('.reader-shell').dataset.readingMode,'scroll');assert.equal(store.progress[bookId].charOffset,originalOffset);
 click('[data-action="close"]');click('[data-action="reader-tools"]');$('#page-jump').value='4';$('#page-jump-form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));const scrollOffset=store.progress[bookId].charOffset;assert.ok(scrollOffset>0);assert.notEqual(scrollOffset,originalOffset,'direct navigation moves the scroll anchor');
 click('[data-action="appearance"]');await changePref('fontSize',23);assert.equal(store.progress[bookId].charOffset,scrollOffset);await changePref('readingMode','pages');assert.equal(store.progress[bookId].charOffset,scrollOffset);await changePref('spreadMode','double');click('[data-action="close"]');assert.equal(w.document.querySelectorAll('.spread-leaf').length,2);
 // The second leaf uses its own source offsets without ever creating a native Selection.
 const secondRoot=$('.spread-leaf:nth-child(2) .page-text'),secondStart=Number(secondRoot.dataset.start),secondChapter=Number(secondRoot.dataset.chapterIndex);
 const quote=selectWords(10,32,'.spread-leaf:nth-child(2) .page-text');click('[data-action="highlight"][data-color="rose"]');const highlight=store.annotations.find(a=>a.selectedText===quote&&a.color==='rose');assert.ok(highlight);assert.equal(highlight.startOffset,secondStart+10);assert.equal(highlight.chapterIndex,secondChapter);assert.ok(highlight.anchor.prefix);assert.equal(w.getSelection().rangeCount,0);
 click('[data-action="contents"]');click('[data-action="reader-tab"][data-value="highlights"]');assert.ok($('.saved-passage'));$('#annotation-color').value='rose';$('#annotation-color').dispatchEvent(new w.Event('change',{bubbles:true}));assert.ok($('#drawer-content').textContent.includes(quote));$('#annotation-color').value='sapphire';$('#annotation-color').dispatchEvent(new w.Event('change',{bubbles:true}));assert.equal($('.saved-passage'),null);
 click('[data-action="reader-tab"][data-value="notes"]');assert.ok($('#drawer-content').textContent.includes('No saved items'));click('[data-action="close"]');
 click('[data-action="bookmark"]');const bookmark=store.annotations.find(a=>a.bookId===bookId&&a.type==='bookmark'&&a.charOffset===store.progress[bookId].charOffset);assert.ok(bookmark);
 click('[data-action="contents"]');click('[data-action="reader-tab"][data-value="bookmarks"]');click('[data-action="edit-annotation"][data-id="'+bookmark.id+'"]');$('#bookmark-label').value='A quiet moment';$('#bookmark-label-form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));assert.equal(store.annotations.find(a=>a.id===bookmark.id).label,'A quiet moment');
 click('[data-action="contents"]');click('[data-action="reader-tab"][data-value="highlights"]');$('#annotation-color').value='all';$('#annotation-color').dispatchEvent(new w.Event('change',{bubbles:true}));click('[data-action="edit-annotation"][data-id="'+highlight.id+'"]');$('#note-text').value='Keep the thought with this highlight.';$('#note-form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));assert.equal(store.annotations.find(a=>a.id===highlight.id).noteText,'Keep the thought with this highlight.');
 click('[data-action="contents"]');click('[data-action="reader-tab"][data-value="notes"]');click('[data-action="delete-note"][data-id="'+highlight.id+'"]');assert.equal(store.annotations.find(a=>a.id===highlight.id).noteText,'');assert.ok(store.annotations.find(a=>a.id===highlight.id),'removing a note preserves its highlight');

 click('[data-action="reader-tools"]');click('[data-action="reader-search"]');$('#reader-search-query').value='Alice';$('#search-episode').value='0';$('#reader-search-form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));assert.ok($('#search-results').textContent.includes('results'));assert.ok($('.search-result'));click('[data-action="search-result"][data-index="0"]');assert.ok($('.search-match'));assert.ok($('.search-navigation'));assert.equal(store.progress[bookId].chapterIndex,0);click('[data-action="search-next"]');assert.ok($('.search-match.is-current'));click('[data-action="clear-search"]');assert.equal($('.search-match'),null);
 // No lookup request happens until an explicit button action.
 const originalFetch=globalThis.fetch,lookupCalls=[];globalThis.fetch=async(url,options)=>{if(String(url).includes('dictionaryapi.dev')){lookupCalls.push(String(url));return Response.json([{meanings:[{partOfSpeech:'noun',definitions:[{definition:'<script>text only</script>'}]}]}]);}if(String(url).includes('mymemory.translated.net')){lookupCalls.push(String(url));return Response.json({responseStatus:200,responseData:{translatedText:'Only the selected word.'}});}return originalFetch(url,options);};
 $('.page-text').dispatchEvent(new w.KeyboardEvent('keydown',{key:'h',bubbles:true,cancelable:true}));click('[data-action="selection-tools"]');assert.equal(lookupCalls.length,0);$('#lookup-source').value='en';click('[data-action="lookup-definition"]');await until(()=>lookupCalls.length===1&&$('#lookup-result').getAttribute('aria-busy')==='false','definition loaded');assert.equal($('#lookup-result script'),null);assert.ok($('#lookup-result').textContent.includes('<script>text only</script>'));$('#lookup-source').value='id';$('#lookup-target').value='en';click('[data-action="lookup-translate"]');await until(()=>lookupCalls.length===2&&$('#lookup-result').getAttribute('aria-busy')==='false','translation loaded');assert.equal(new URL(lookupCalls[1]).searchParams.get('q'),$('.note-quote').textContent);click('[data-action="close"]');globalThis.fetch=originalFetch;
 const resumeOffset=store.progress[bookId].charOffset;click('[data-action="library"]');click('[data-action="open"][data-id="'+bookId+'"]');await until(()=>$('.reader-loading')?.classList.contains('hidden'),'reopen advanced reader');assert.equal(store.progress[bookId].charOffset,resumeOffset);assert.equal(store.preferences.fontWeight,600);assert.ok(store.annotations.find(a=>a.id===highlight.id));assert.equal(JSON.stringify(store.progress[fixtureBooks[1].id]),otherProgress,'another story’s position is unchanged');
 for(const width of [320,375,390,430,768,1440]){globalThis.innerWidth=width;w.innerWidth=width;w.dispatchEvent(new w.Event('resize'));await wait(220);await until(()=>$('.reader-loading')?.classList.contains('hidden'),'simulated '+width+'px layout');assert.equal($('.reader-shell').dataset.spread,String(width>=1000));assert.ok($('.page-text').textContent.trim());assert.equal(store.progress[bookId].charOffset,resumeOffset);}
 globalThis.innerWidth=730;globalThis.innerHeight=360;w.innerWidth=730;w.innerHeight=360;w.dispatchEvent(new w.Event('resize'));await wait(220);await until(()=>$('.reader-loading')?.classList.contains('hidden'),'simulated landscape reflow');assert.equal($('.reader-shell').dataset.spread,'false');assert.equal(store.progress[bookId].charOffset,resumeOffset);click('[data-action="library"]');
});

test('shared web UI previews and restores a backup, and browser Back closes its sheet before Settings',async()=>{
 const store=await import('../dist/store.js?v=14'),identity=store.deviceId;
 click('[data-action="settings"]');await wait(40);
 const note={id:'backup-ui-note',bookId:fixtureBooks[0].id,type:'bookmark',color:'sapphire',chapterIndex:0,charOffset:0,label:'From another device',createdAt:'2026-11-01T00:00:00.000Z',updatedAt:'2026-11-01T00:00:00.000Z'};
 const raw=JSON.stringify({format:'katakecil-backup',schemaVersion:2,preferences:{fontSize:20},progress:[],annotations:[note]});
 const choose=()=>{Object.defineProperty($('#backup-input'),'files',{configurable:true,value:[{name:'backup.json',size:raw.length,text:async()=>raw}]});$('#backup-input').dispatchEvent(new w.Event('change',{bubbles:true}));};
 choose();await until(()=>$('[data-action="backup-restore"]'),'backup preview');assert.equal(store.annotations.some(a=>a.id===note.id),false,'preview does not modify data');
 w.history.back();await until(()=>!$('.dialog'),'Back dismisses backup preview');assert.ok($('.settings-shell'));
 choose();await until(()=>$('[data-action="backup-restore"]'),'backup preview again');click('[data-action="backup-restore"]');await until(()=>!$('.dialog'),'restore completed');
 assert.ok(store.annotations.find(a=>a.id===note.id));assert.equal(store.preferences.fontSize,20);assert.equal(store.deviceId,identity);
 w.history.back();await until(()=>$('.library-shell'),'Back returns to Library');
});

test('notes recover after LocalStorage mirror failure and deleted notes never resurrect on hydration',async()=>{
 const store=await import('../dist/store.js?v=14'),oldSet=w.Storage.prototype.setItem;
 w.Storage.prototype.setItem=function(key,value){if(key==='lumina_annotations')throw Error('QuotaExceededError');return oldSet.call(this,key,value);};
 const note={id:'quota-note',bookId:'test-book-only',type:'highlight',selectedText:'a small quote',chapterIndex:0,startOffset:0,endOffset:13,noteText:'Recover this note',color:'amber',createdAt:new Date().toISOString()};
 assert.equal(store.saveAnnotation(note),false);await wait(40);const recovered=await import('../dist/store.js?quota-recovery');await recovered.hydrate();assert.ok(recovered.annotations.some(a=>a.id===note.id),'a new module instance recovers the note from IndexedDB');await store.hydrate();
 const saved={...store.annotations.find(a=>a.id===note.id)};store.deleteAnnotation(note.id);await wait(40);w.Storage.prototype.setItem=oldSet;localStorage.setItem('lumina_annotations',JSON.stringify([...store.annotations,saved]));
 const reloaded=await import('../dist/store.js?quota-deletion');await reloaded.hydrate();assert.equal(reloaded.annotations.find(a=>a.id===note.id),undefined);assert.ok((await store.dbGetAll('annotations')).some(a=>a.id===note.id&&a.deleted));
});

test('a failure of both storage mechanisms produces a visible recovery warning',async()=>{
 const store=await import('../dist/store.js?closed-database'),db=await store.openDatabase(),oldSet=w.Storage.prototype.setItem;db.close();
 w.Storage.prototype.setItem=function(key,value){if(key==='lumina_annotations')throw Error('QuotaExceededError');return oldSet.call(this,key,value);};
 let warnings=0;w.addEventListener('katakecil-storage-failure',()=>warnings++);
 store.saveAnnotation({id:'both-storage-failed',bookId:'test-only',type:'highlight',selectedText:'small quote'});await wait(40);w.Storage.prototype.setItem=oldSet;
 assert.equal(warnings,1);assert.match($('#toast').textContent,/Storage is unavailable|Penyimpanan tidak tersedia/);
});

test('arc markers group chapters without adding title-only arc pages or changing text',async()=>{
 const book=await parseEpub(await tinyEpub([
  {name:'arc-one.xhtml',html:'<h1 id="arc-01-title">Kursi yang Tersisa</h1>'},
  {name:'one.xhtml',html:'<h2 id="chapter-01-title">Pertemuan</h2><p>Teks pertama.</p>'},
  {name:'two.xhtml',html:'<h2 id="chapter-02-title">Percakapan</h2><p>Teks kedua.</p>'},
  {name:'arc-two.xhtml',html:'<h1 id="arc-02-title">Bahasa untuk Dua Orang</h1>'},
  {name:'three.xhtml',html:'<h2 id="chapter-03-title">Berikutnya</h2><p>Teks ketiga.</p>'}
 ]));
 assert.equal(book.chapters.length,3);assert.deepEqual(book.chapters.map(c=>c.text),['Teks pertama.','Teks kedua.','Teks ketiga.']);assert.deepEqual(book.chapters.map(c=>c.chapterLabel),['BAB 1','BAB 2','BAB 3']);assert.deepEqual(book.chapters.map(c=>c.arc.label),['ARC 1','ARC 1','ARC 2']);assert.equal(book.chapters[0].arc.id,book.chapters[1].arc.id);assert.notEqual(book.chapters[1].arc.id,book.chapters[2].arc.id);assert.equal(book.chapters[2].arc.title,'Bahasa untuk Dua Orang');assert.deepEqual(book.chapters.map(c=>c.href),['OPS/one.xhtml','OPS/two.xhtml','OPS/three.xhtml']);
});
