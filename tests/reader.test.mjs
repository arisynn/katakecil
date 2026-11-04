import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {runInNewContext} from 'node:vm';
import {createRequire} from 'node:module';
import {indexedDB,IDBKeyRange} from 'fake-indexeddb';
const dom=new JSDOM('<html><head><meta name="theme-color"></head><body><div id="app"></div><div id="overlay-root"></div><div id="toast"></div><input type="file" id="epub-input"></body></html>',{url:'https://reader.example/',runScripts:'outside-only',pretendToBeVisual:true});
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
let catalogFails=false;
globalThis.fetch=async(url)=>{
 const address=new URL(String(url),'https://reader.example/');
 if(address.hostname==='hrbcwymdqigtfmpmsdsi.supabase.co'&&address.pathname.endsWith('lumina-library')){if(catalogFails)throw Error('offline');return Response.json({books:fixtureBooks});}
 if(address.hostname==='library.test')return Response.json({url:'https://hrbcwymdqigtfmpmsdsi.supabase.co/storage/v1/object/sign/test/alice.epub'});
 if(address.hostname==='hrbcwymdqigtfmpmsdsi.supabase.co'&&address.pathname.startsWith('/storage/'))return new Response(await readFile(new URL('./fixtures/epubs/alice.epub',import.meta.url)));
 try{return new Response(await readFile(new URL('../dist'+address.pathname,import.meta.url)));}catch{return new Response('missing',{status:404});}
};
const {parseEpub,paginate}=await import('../dist/epub.js');
const parsedBooks=new Map();
const wait=(ms=25)=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(check,description){for(let i=0;i<200;i++){if(check())return;await wait();}assert.fail('Timed out: '+description);}
const $=selector=>w.document.querySelector(selector);
function click(selector){const el=$(selector);assert.ok(el,'Missing element: '+selector);el.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));}
function input(selector,value){const el=$(selector);assert.ok(el,'Missing input: '+selector);el.value=value;el.dispatchEvent(new w.Event('input',{bubbles:true}));}
function selectWords(start=20,length=55){const el=$('.page-text');const walker=w.document.createTreeWalker(el,w.NodeFilter.SHOW_TEXT);let node,remaining=start;while(node=walker.nextNode()){if(remaining+length<=node.textContent.length)break;remaining=Math.max(0,remaining-node.textContent.length);}assert.ok(node,'Readable text node');const range=w.document.createRange();range.setStart(node,remaining);range.setEnd(node,remaining+length);const selection=w.getSelection();selection.removeAllRanges();selection.addRange(range);w.document.dispatchEvent(new w.MouseEvent('mouseup',{bubbles:true}));return selection.toString();}

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
 const store=await import('../dist/store.js');
 await store.openDatabase();
 store.updatePreferences({glassBlur:34});
 assert.equal(JSON.parse(localStorage.getItem('lumina_device_settings')).glassBlur,34);
 assert.match(store.deviceId,/^[0-9a-f-]{36}$/);
 store.saveProgress({bookId:'alice',chapterIndex:2,pageIndex:3,totalPages:12,charOffset:150,percentage:25});
 await wait();
 assert.equal((await store.dbGetAll('progress'))[0].charOffset,150);
 const annotation={id:'test-annotation',bookId:'alice',type:'highlight',chapterIndex:0,startOffset:20,endOffset:40,selectedText:'test',createdAt:new Date().toISOString(),color:'amber'};
 store.saveAnnotation(annotation);await wait();assert.ok((await store.dbGetAll('annotations')).some(a=>a.id===annotation.id));
 store.deleteAnnotation(annotation.id);await wait();assert.equal((await store.dbGetAll('annotations')).length,0);
 const remote=new MockBroadcastChannel('lumina-local-sync');remote.postMessage({kind:'preferences',payload:{...store.preferences,glassBlur:17}});await wait();assert.equal(store.preferences.glassBlur,17);
 remote.close();
 store.updatePreferences({...store.DEFAULTS});
 store.saveProgress({bookId:'alice',chapterIndex:0,pageIndex:0,totalPages:12,charOffset:0,percentage:0});
});

test('personal carousel, reader controls, highlights, copy blocking, and settings work together',async()=>{
 const store=await import('../dist/store.js');
 await import('../dist/app.js');
 await until(()=>$('.shelf-book'),'Supabase collection loaded');
 assert.equal(w.document.querySelectorAll('.shelf-book').length,3);
 assert.equal(w.document.querySelectorAll('.bottom-tab').length,2);
 assert.equal($('[data-action="import"]'),null,'no upload action in Library');
 assert.equal($('.sidebar'),null);assert.equal($('.hero'),null);
 click('[data-action="carousel-next"]');assert.match($('.shelf-book.is-current').dataset.bookId,/garis/);
 click('[data-action="select-book"][data-id="masa-panen-google-play-ready-1"]');
 click('.read-button');await until(()=>$('.page-text')&&$('.reader-loading')?.classList.contains('hidden'),'reader paginated');
 assert.equal($('.reader-shell').dataset.mode,'reading');assert.equal($('.bottom-tabs'),null);
 assert.match($('.page-text').textContent,/Alice was beginning/);
 const page=$('#reading-page'),text=$('.page-text').textContent;
 click('[data-action="show-controls"]');assert.equal($('.reader-shell').dataset.mode,'controls');assert.equal($('#reading-page'),page);assert.equal($('.page-text').textContent,text);
 click('.page-text');assert.equal($('.reader-shell').dataset.mode,'reading');assert.equal($('#reading-page'),page);
 click('[data-action="show-controls"]');click('[data-action="next"]');const second=$('.page-text').textContent;assert.notEqual(second,text);click('[data-action="prev"]');
 const range=$('#page-scrubber');input('#page-scrubber','2');assert.equal($('#page-scrubber'),range);range.dispatchEvent(new w.Event('change',{bubbles:true}));assert.equal(store.progress[fixtureBooks[0].id].pageIndex,2);input('#page-scrubber','0');$('#page-scrubber').dispatchEvent(new w.Event('change',{bubbles:true}));
 const quote=selectWords();await until(()=>$('.selection-popover'),'highlight toolbar');
 const copy=new w.Event('copy',{bubbles:true,cancelable:true});$('.page-text').dispatchEvent(copy);assert.ok(copy.defaultPrevented,'copy is blocked for reader selection');assert.equal(w.getSelection().toString(),quote,'selection survives copy prevention');
 const context=new w.MouseEvent('contextmenu',{bubbles:true,cancelable:true});$('.page-text').dispatchEvent(context);assert.ok(context.defaultPrevented);
 click('[data-action="highlight"][data-color="emerald"]');assert.equal($('mark').textContent,quote);
 selectWords(100,35);await until(()=>$('.selection-popover'),'second selection');click('[data-action="new-note"]');input('#note-text','Bagian yang ingin kusimpan.');
 const noteCopy=new w.Event('copy',{bubbles:true,cancelable:true});$('#note-text').dispatchEvent(noteCopy);assert.equal(noteCopy.defaultPrevented,false,'copy remains available in the note editor');
 $('#note-form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));assert.ok(store.annotations.some(a=>a.noteText==='Bagian yang ingin kusimpan.'));
 click('[data-action="bookmark"]');assert.ok(store.annotations.some(a=>a.bookId===fixtureBooks[0].id&&a.type==='bookmark'));
 click('[data-action="appearance"]');const anchor=store.progress[fixtureBooks[0].id].charOffset;input('#settings-font-size','24');$('#settings-font-size').dispatchEvent(new w.Event('change',{bubbles:true}));await until(()=>$('.reader-loading')?.classList.contains('hidden'),'font reflow');assert.ok($('mark'));assert.equal(store.progress[fixtureBooks[0].id].charOffset,anchor);click('[data-action="close"]');
 click('[data-action="contents"]');assert.equal(w.document.querySelectorAll('.toc-item').length,12);click('[data-action="chapter"][data-index="2"]');assert.equal(store.progress[fixtureBooks[0].id].chapterIndex,2);assert.equal($('.reader-shell').dataset.mode,'reading');
 // A two-finger gesture must open controls without also advancing a page.
 const beforePinch=store.progress[fixtureBooks[0].id].charOffset;
 const touch=(name,touches,changed=touches)=>{const e=new w.Event(name,{bubbles:true,cancelable:true});Object.defineProperties(e,{touches:{value:touches},changedTouches:{value:changed}});$('.page-text').dispatchEvent(e);return e;};
 touch('touchstart',[{clientX:40,clientY:200},{clientX:240,clientY:200}]);const pinch=touch('touchmove',[{clientX:85,clientY:200},{clientX:195,clientY:200}]);assert.ok(pinch.defaultPrevented);assert.equal($('.reader-shell').dataset.mode,'controls');touch('touchend',[],[{clientX:85,clientY:200}]);assert.equal(store.progress[fixtureBooks[0].id].charOffset,beforePinch);
 await wait(550);click('[data-action="library"]');click('[data-action="settings"]');assert.equal($('.advanced-settings').open,false);assert.ok($('[data-action="import"]').closest('details'));
 click('[data-action="accent"][data-value="#82669c"]');assert.equal(w.document.documentElement.style.getPropertyValue('--accent'),'#82669c');assert.equal(JSON.parse(localStorage.getItem('lumina_device_settings')).accentColor,'#82669c');
 input('#accent-custom','#dfb142');assert.equal(store.preferences.accentColor,'#dfb142');
 click('[data-action="set-theme"][data-value="dark"]');assert.equal(w.document.body.dataset.theme,'dark');
 click('[data-action="import"]');assert.ok($('#upload-zone'));click('[data-action="close"]');
 click('[data-action="library"]');catalogFails=true;click('[data-action="refresh"]');await until(()=>$('.offline-label'),'offline catalog recovery');assert.equal(w.document.querySelectorAll('.shelf-book').length,3);catalogFails=false;
});

test('catalog normalization accepts production data and rejects duplicate IDs and unsafe URLs',async()=>{
 const {normalizeCatalog}=await import('../dist/app.js');
 assert.equal(normalizeCatalog({books:fixtureBooks}).length,3);
 assert.throws(()=>normalizeCatalog({books:[fixtureBooks[0],fixtureBooks[0]]}),/lengkap/i);
 assert.throws(()=>normalizeCatalog({books:[{id:'bad',title:'bad',url:'javascript:alert(1)'}]}),/valid/);
});
