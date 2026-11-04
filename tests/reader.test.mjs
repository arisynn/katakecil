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
globalThis.fetch=async(url)=>{const path=new URL(String(url),'https://reader.example/').pathname;try{const bytes=await readFile(new URL('../dist'+path,import.meta.url));return new Response(bytes);}catch{return new Response('missing',{status:404});}};
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
  const bytes=await readFile(new URL(`../dist/books/${id}.epub`,import.meta.url));
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

test('library, real reading, notes, bookmarks, appearance, search, and navigation work together',async()=>{
 const store=await import('../dist/store.js');
 await import('../dist/app.js');
 await until(()=>$('.book-card'),'library loaded');
 assert.equal(w.document.querySelectorAll('.book-card').length,6);
 input('#book-search','Austen');assert.equal(w.document.querySelectorAll('.book-card').length,1);assert.match($('.book-title').textContent,/Pride/);
 input('#book-search','');
 click('[data-action="open"][data-id="alice"]');
 await until(()=>$('.page-text'),'Alice reader opened');
 assert.match($('.page-text').textContent,/Alice was beginning/);
 const initial=$('.page-text').textContent;
 w.document.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));
 assert.notEqual($('.page-text').textContent,initial);assert.equal(store.progress.alice.pageIndex,1);
 click('[data-action="prev"]');assert.equal(store.progress.alice.pageIndex,0);
 const scrubber=$('#page-scrubber');input('#page-scrubber','3');assert.equal($('#page-scrubber'),scrubber,'dragging keeps the range mounted');scrubber.dispatchEvent(new w.Event('change',{bubbles:true}));assert.equal(store.progress.alice.pageIndex,3);input('#page-scrubber','0');$('#page-scrubber').dispatchEvent(new w.Event('change',{bubbles:true}));
 const quote=selectWords();await until(()=>$('.selection-popover'),'selection toolbar');
 click('[data-action="highlight"][data-color="emerald"]');
 assert.equal($('mark').textContent,quote);assert.equal(store.annotations.length,1);
 selectWords(90,45);await until(()=>$('.selection-popover'),'second selection');click('[data-action="new-note"]');
 input('#note-text','A wonderfully curious beginning.');$('#note-form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
 assert.equal(store.annotations.length,2);assert.ok(store.annotations.some(a=>a.noteText==='A wonderfully curious beginning.'));
 click('.reader-actions [data-action="bookmark"]');assert.ok(store.annotations.some(a=>a.type==='bookmark'));
 click('[data-action="appearance"]');input('#setting-glassBlur','31');assert.equal(w.document.documentElement.style.getPropertyValue('--glass-blur'),'31px');
 input('#setting-fontSize','24');assert.equal(w.document.documentElement.style.getPropertyValue('--reader-size'),'24px');assert.ok($('mark'),'highlights survive reflow');
 click('[data-action="set-theme"][data-value="auto-sensor"]');input('#setting-lux','10');assert.equal(w.document.body.dataset.theme,'dark');input('#setting-lux','300');assert.equal(w.document.body.dataset.theme,'light');
 click('[data-action="set-spread"][data-value="double"]');assert.equal(w.document.querySelectorAll('.reading-page').length,2);
 click('[data-action="set-spread"][data-value="single"]');click('[data-action="close"]');
 const remoteProgress={...store.progress.alice,chapterIndex:3,charOffset:0,pageIndex:50,updatedAt:new Date().toISOString()};localStorage.setItem('lumina_reading_progress',JSON.stringify({alice:remoteProgress}));w.dispatchEvent(new w.StorageEvent('storage',{key:'lumina_reading_progress',newValue:localStorage.getItem('lumina_reading_progress')}));assert.match($('.reading-page h1').textContent,/Rabbit Sends/i,'storage-event fallback updates the active reader');
 click('[data-action="contents"]');assert.ok(w.document.querySelectorAll('.toc-item').length>=12);click('[data-action="chapter"][data-index="2"]');assert.equal(store.progress.alice.chapterIndex,2);
 click('[data-action="library"]');click('[data-action="notes"]');assert.equal(w.document.querySelectorAll('.annotation-card').length,3);
 click('[data-action="jump-annotation"]');await until(()=>$('.page-text'),'annotation navigation');assert.ok($('mark'),'jump restores annotated passage');
 click('[data-action="library"]');click('[data-action="import"]');input('#book-url','https://reader.example/books/pride.epub');$('#url-form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await until(()=>!$('.dialog'),'public EPUB import');assert.equal(w.document.querySelectorAll('.book-card').length,7);
 assert.ok((await store.dbGetAll('books')).some(book=>book.id.startsWith('import-')&&book.chapters.length>40));
 click('[data-action="status"]');assert.match($('.device-id').textContent,/^[0-9a-f-]{36}$/);click('[data-action="close"]');
 const record=JSON.parse(localStorage.getItem('lumina_reading_progress')).alice;assert.equal(record.chapterIndex,0);assert.ok(record.updatedAt);
});
