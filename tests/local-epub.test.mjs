import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import {JSDOM} from 'jsdom';
import {parseEpub,extractEpubCover} from '../dist/epub.js';
import {resolveAnchor,SpeedReader,speedWords} from '../dist/advanced-reader.js';
const window=new JSDOM('').window;globalThis.DOMParser=window.DOMParser;
const vendor={exports:{}};runInNewContext(await readFile(new URL('../dist/vendor/jszip.min.js',import.meta.url),'utf8'),{module:vendor,exports:vendor.exports,setTimeout,clearTimeout,setImmediate,Uint8Array,ArrayBuffer,Buffer,Promise});globalThis.JSZip=vendor.exports;
const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aN1sAAAAASUVORK5CYII=';
async function fixture({metadata='',extra='',guide='',nav='',body='<h1>Opening</h1><p>First story paragraph.</p>'}={}){
 const zip=new JSZip();zip.file('META-INF/container.xml','<container><rootfile full-path="OPS/book.opf"/></container>');
 zip.file('OPS/book.opf',`<package xmlns:dc="urn:dc"><metadata><dc:title>Local Book</dc:title><dc:creator>Writer</dc:creator>${metadata}</metadata><manifest><item id="story" href="story.xhtml" media-type="application/xhtml+xml"/><item id="nav" href="nav.xhtml" properties="nav" media-type="application/xhtml+xml"/>${extra}</manifest><spine><itemref idref="story"/></spine>${guide}</package>`);
 zip.file('OPS/story.xhtml','<html><body>'+body+'</body></html>');zip.file('OPS/nav.xhtml','<html><body><nav epub:type="toc">'+nav+'</nav></body></html>');zip.file('OPS/images/front.png',png,{base64:true});zip.file('OPS/cover.xhtml','<html><body><svg><image xlink:href="images/front.png"/></svg></body></html>');return zip.generateAsync({type:'uint8array'});
}
test('local covers resolve EPUB 3, EPUB 2 metadata and guide wrappers without network access',async()=>{
 const item='<item id="image" href="images/front.png" media-type="image/png"';
 for(const options of [{extra:item+' properties="cover-image"/>'},{metadata:'<meta name="cover" content="image"/>',extra:item+'/>'},{guide:'<guide><reference type="cover" href="cover.xhtml"/></guide>'}]){
  const bytes=await fixture(options);assert.equal(await extractEpubCover(bytes),'data:image/png;base64,'+png);assert.equal((await parseEpub(bytes,'Book',{includeCover:true})).cover,'data:image/png;base64,'+png);
 }
 const bad=await fixture({extra:'<item id="image" href="https://untrusted.test/front.png" properties="cover-image" media-type="image/png"/>'});assert.equal(await extractEpubCover(bad),'');
});
test('TOC fragments split one file, retain subheadings and preserve explicit episode labels',async()=>{
 const bytes=await fixture({body:'<h1 id="one">Episode 0 — Before</h1><p>One.</p><h2>Ordinary subheading</h2><p>Two.</p><h1 id="two">Bab II — After</h1><p>Three.</p>',nav:'<ol><li><span>Part I — Start</span><ol><li><a href="story.xhtml#one">Episode 0 — Before</a></li></ol></li><li><span>Part II — End</span><ol><li><a href="story.xhtml#two">Bab II — After</a></li></ol></li></ol>'});
 const book=await parseEpub(bytes);assert.equal(book.chapters.length,2);assert.deepEqual(book.chapters.map(c=>c.href),['OPS/story.xhtml#one','OPS/story.xhtml#two']);assert.deepEqual(book.chapters.map(c=>c.chapterLabel),['EPISODE 0','BAB II']);assert.match(book.chapters[0].text,/Ordinary subheading/);assert.deepEqual(book.chapters.map(c=>c.arc.label),['ARC I','ARC II']);
 const server=await parseEpub(bytes,'Book',{preserveSourceHref:true});assert.ok(server.chapters.every(c=>c.href==='OPS/story.xhtml'));
 assert.deepEqual(resolveAnchor(book.chapters,{episodeId:'OPS/story.xhtml',exact:'Three.',prefix:'',suffix:'',start:0,end:6}),{chapterIndex:1,start:0,end:6});
});
test('narrative before the first heading is retained and single-file identities remain compatible',async()=>{
 const book=await parseEpub(await fixture({body:'<p>Keep this opening.</p><h1 id="prolog">Prolog</h1><p>The beginning.</p><h1 id="end">Epilog</h1><p>The end.</p>'}));assert.equal(book.chapters.length,3);assert.equal(book.chapters[0].text,'Keep this opening.');
 const single=await parseEpub(await fixture());assert.equal(single.chapters[0].href,'OPS/story.xhtml');
});
test('RSVP retains UTF-16 offsets and cancels a queued episode when closed',async()=>{
 assert.deepEqual(speedWords('😀 Halo, dunia!').map(w=>[w.text,w.start,w.end]),[['😀',0,2],['Halo,',3,8],['dunia!',9,15]]);
 let nextResolve;const painted=[];const engine=new SpeedReader({word:(w,ch)=>painted.push([ch,w.start]),change:()=>{},next:()=>new Promise(r=>nextResolve=r),error:e=>{throw e;}});
 engine.open({chapterIndex:2,text:'one two',start:4},999);assert.equal(engine.wpm,600);assert.equal(engine.index,1);engine.play();await new Promise(r=>setTimeout(r,130));assert.equal(engine.state,'loading');engine.stop();nextResolve({chapterIndex:3,text:'three',start:0});await Promise.resolve();assert.equal(engine.words.length,0);assert.equal(engine.state,'paused');
});
test('RSVP pauses during an episode load and keeps the newly loaded position paused',async()=>{
 let nextResolve;const engine=new SpeedReader({word:()=>{},change:()=>{},next:()=>new Promise(r=>nextResolve=r),error:e=>{throw e;}});engine.open({chapterIndex:0,text:'one',start:0},600);engine.play();await new Promise(r=>setTimeout(r,130));engine.pause();nextResolve({chapterIndex:1,text:'two words',start:0});await Promise.resolve();assert.equal(engine.state,'paused');assert.equal(engine.episode.chapterIndex,1);engine.stop();
});

test('TOC targets on section containers and standalone anchors retain narrative paragraphs',async()=>{
 const bytes=await fixture({body:'<section id="opening"><h1>Prolog</h1><p>First words.</p></section><a id="last"></a><p>Last words.</p>',nav:'<ol><li><a href="story.xhtml#opening">Prolog</a></li><li><a href="story.xhtml#last">Epilog</a></li></ol>'});const book=await parseEpub(bytes);assert.deepEqual(book.chapters.map(c=>c.text),['First words.','Last words.']);assert.deepEqual(book.chapters.map(c=>c.href),['OPS/story.xhtml#opening','OPS/story.xhtml#last']);
});
