import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {indexedDB} from 'fake-indexeddb';
const w=new JSDOM('',{url:'https://local.example/'}).window;
Object.assign(globalThis,{window:w,localStorage:w.localStorage,indexedDB});
Object.defineProperty(globalThis,'BroadcastChannel',{value:undefined,configurable:true});
const store=await import('../dist/store.js?v=24');
test('local cover changes are durable and cannot change a server book',async()=>{
 await store.dbPut('books',{id:'local-one',source:'local',title:'Local',chapters:[{text:'Kept text.'}],epubBuffer:new Uint8Array([1,2,3]).buffer});
 await store.dbPut('books',{id:'server-one',source:'supabase',title:'Server'});
 const cover='data:image/jpeg;base64,AQID';const result=await store.setLocalBookCover('local-one',cover);
 assert.equal(result.coverCustom,true);assert.equal(result.chapters[0].text,'Kept text.');assert.equal(new Uint8Array(result.epubBuffer).length,3);
 assert.equal((await store.dbGetAll('books')).find(b=>b.id==='local-one').cover,cover);
 assert.equal(await store.setLocalBookCover('server-one',cover),false);assert.equal(await store.setLocalBookCover('missing',cover),false);assert.equal(await store.setLocalBookCover('local-one','https://untrusted.example/image'),false);
});
test('removing only a local EPUB retains its progress and annotations for re-import',async()=>{
 store.saveProgress({bookId:'local-one',chapterIndex:0,charOffset:4,percentage:30});store.saveAnnotation({id:'local-note',bookId:'local-one',type:'bookmark',chapterIndex:0,charOffset:4,color:'amber'});await store.flush();
 assert.equal(await store.deleteLocalBook('server-one'),false);assert.equal(await store.deleteLocalBook('local-one'),true);
 assert.equal((await store.dbGetAll('books')).some(b=>b.id==='local-one'),false);assert.equal((await store.dbGetAll('books')).some(b=>b.id==='server-one'),true);
 assert.equal(store.progress['local-one'].charOffset,4);assert.ok(store.annotations.some(a=>a.id==='local-note'));assert.ok((await store.dbGetAll('progress')).some(p=>p.bookId==='local-one'));assert.ok((await store.dbGetAll('annotations')).some(a=>a.id==='local-note'));
});
