import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import {planPublication,matchUpdates,importChapterFile,importPublisherEpub} from '../dist/publisher-import.js';
const dom=new JSDOM('',{url:'https://katakecil.test'});globalThis.DOMParser=dom.window.DOMParser;globalThis.document=dom.window.document;
const zip={exports:{}};runInNewContext(await readFile(new URL('../dist/vendor/jszip.min.js',import.meta.url),'utf8'),{module:zip,exports:zip.exports,setTimeout,clearTimeout,setImmediate,Uint8Array,ArrayBuffer,Buffer,Promise});globalThis.JSZip=zip.exports;
const book={id:'test',title:'Test',author:'Author',status:'ongoing',is_published:true};
const old=[{id:'00000000-0000-4000-8000-000000000001',title:'Original',content_html:'<h1 id="chapter-1-title">Original</h1><p>Old.</p>',release_at:'2026-01-01T00:00:00Z',is_enabled:true}];
const incoming=(title='New')=>({title,label:'',content_html:'<h1>'+title+'</h1><p>Story.</p>',kind:'episode',target:'new'});
const options={first:1,interval:2,start:'2027-02-01T12:00:00Z',now:Date.parse('2027-01-01T00:00:00Z')};
test('ongoing imports preserve old identities/dates while scheduling only added episodes',()=>{
 const result=planPublication(book,old,[incoming('Two'),incoming('Three'),incoming('Four')],options);
 assert.equal(result.sections[0].id,old[0].id);assert.equal(result.sections[0].release_at,old[0].release_at);assert.equal(result.sections[0].content_html,old[0].content_html);
 assert.deepEqual(result.sections.slice(1).map(s=>s.release_at),['2027-01-01T00:00:00.000Z','2027-02-01T12:00:00.000Z','2027-02-03T12:00:00.000Z']);assert.equal(new Set(result.sections.map(s=>s.id)).size,4);
});
test('completed import releases every episode together and arc pages follow their first episode',()=>{
 const result=planPublication({...book,status:'completed'},old,[incoming()],options);assert.ok(result.sections.every(s=>s.release_at==='2027-01-01T00:00:00.000Z'));
 const page={...incoming('Arc II — New'),kind:'page'},ongoing=planPublication(book,old,[page,incoming()],{...options,first:0});assert.equal(ongoing.sections[1].release_at,ongoing.sections[2].release_at);assert.equal(ongoing.sections[2].release_at,'2027-02-01T12:00:00.000Z');
});
test('number/title matching preserves a replacement ID and refuses ambiguous or repeated targets',()=>{
 const part={...incoming('Bab 1'),label:'BAB 1'},matched=matchUpdates([part],old);assert.equal(matched[0].target,old[0].id);const result=planPublication(book,old,matched,options);assert.equal(result.sections.length,1);assert.equal(result.sections[0].id,old[0].id);assert.equal(result.sections[0].title,'Original');assert.match(result.sections[0].content_html,/BAB 1 — Original/);
 assert.equal(matchUpdates([{...part,label:'BAB I'}],old)[0].target,old[0].id);
 assert.equal(matchUpdates([incoming('Original')],[...old,{...old[0],id:'00000000-0000-4000-8000-000000000002'}])[0].target,'?');assert.throws(()=>planPublication(book,old,[matched[0],matched[0]],options),/same chapter/);
});
test('TXT and Markdown imports split chapter headings, retain emphasis and do not split scene subheadings',async()=>{
 const txt=await importChapterFile({name:'update.txt',size:100,text:async()=> 'Bab 2 — Two\n\nBody two.\n\nBab 3 — Three\n\nBody three.'});assert.equal(txt.length,2);assert.equal(txt[0].label,'BAB 2');
 const md=await importChapterFile({name:'update.md',size:100,text:async()=> '# Bab 2 — Two\n\nA **bold** passage.\n\n## A scene\n\nStill the same chapter.'});assert.equal(md.length,1);assert.match(md[0].content_html,/<strong>bold<\/strong>/);assert.match(md[0].content_html,/Still the same chapter/);
});
test('one-file multi-chapter EPUBs import as separately scheduled chapters with original emphasis',async()=>{
 const zip=new JSZip();zip.file('mimetype','application/epub+zip');zip.file('META-INF/container.xml','<container><rootfile full-path="book.opf"/></container>');zip.file('book.opf','<package xmlns:dc="urn:dc"><metadata><dc:title>Novel</dc:title><dc:creator>Writer</dc:creator><dc:language>id</dc:language></metadata><manifest><item id="body" href="body.xhtml" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="body"/></spine></package>');zip.file('body.xhtml','<html><body><h1>Bab 1 — One</h1><p>A <em>quiet</em> day.</p><h1>Bab 2 — Two</h1><p>Another day.</p></body></html>');const bytes=await zip.generateAsync({type:'uint8array'});
 const parsed=await importPublisherEpub({name:'novel.epub',size:bytes.length,arrayBuffer:async()=>bytes});assert.equal(parsed.parts.length,2);assert.match(parsed.parts[0].content_html,/<em>quiet<\/em>/);assert.ok(!parsed.parts[0].content_html.includes('Another day'));assert.ok(!parsed.parts[1].content_html.includes('quiet'));
});
test('JSON export downloads without requesting the disallowed Web Share permission',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 const {saveJSON}=await import('../dist/platform.js?v=3');let shared=0,downloaded='',blob;
 Object.defineProperty(globalThis,'navigator',{value:{canShare:()=>true,share:()=>{shared++;throw new DOMException('Permission denied','NotAllowedError');}},configurable:true});
 const create=URL.createObjectURL;URL.createObjectURL=value=>{blob=value;return 'blob:test';};const revoke=URL.revokeObjectURL;URL.revokeObjectURL=()=>{};
 document.addEventListener('click',event=>{if(event.target.matches('a[download]')){downloaded=event.target.download;event.preventDefault();}});
 try{assert.equal(await saveJSON('backup.json','{"ok":true}'),true);assert.equal(shared,0);assert.equal(downloaded,'backup.json');assert.equal(await blob.text(),'{"ok":true}');}finally{t.mock.timers.tick(30000);URL.createObjectURL=create;URL.revokeObjectURL=revoke;}
});
