import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {indexedDB} from 'fake-indexeddb';
const dom=new JSDOM('',{url:'https://backup.example/'}),w=dom.window;
Object.assign(globalThis,{window:w,localStorage:w.localStorage,indexedDB,BroadcastChannel:class{postMessage(){}close(){}}});
const store=await import('../dist/store.js?v=12');
const old='2026-11-01T00:00:00.000Z',recent='2026-11-04T00:00:00.000Z';
const bookmark=(id,at=old)=>({id,bookId:'book-one',chapterIndex:0,charOffset:0,type:'bookmark',color:'sapphire',label:'Return here',createdAt:at,updatedAt:at});
test('restore merges new notes, keeps newer local data and tombstones, and retains the device identity',async()=>{
 const local=bookmark('newer-local',recent),removed={...bookmark('deleted-note',recent),deleted:true};
 await store.dbPut('annotations',local);await store.dbPut('annotations',removed);await store.hydrate();
 const identity=store.deviceId;
 const result=await store.restoreBackup({annotations:[bookmark('newer-local'),bookmark('deleted-note'),bookmark('imported')],progress:[{bookId:'book-one',chapterIndex:0,percentage:25,updatedAt:old}],preferences:{fontSize:22,deviceId:'foreign-device'}},{restorePreferences:true});
 assert.deepEqual(result,{annotations:1,progress:1,skipped:2});
 assert.equal(store.annotations.find(a=>a.id==='newer-local').updatedAt,recent);
 assert.equal(store.annotations.some(a=>a.id==='deleted-note'),false);
 assert.equal(store.annotations.some(a=>a.id==='imported'),true);
 assert.equal(store.preferences.fontSize,22);assert.equal(store.preferences.deviceId,identity);assert.equal(store.progress['book-one'].percentage,25);
 const again=await store.restoreBackup({annotations:[bookmark('imported')],progress:[],preferences:{}});assert.equal(again.annotations,0);assert.equal(again.skipped,1);
 assert.ok((await store.dbGetAll('annotations')).find(a=>a.id==='deleted-note').deleted);
});
test('cross-book annotation ID collisions reject the complete import before writes',async()=>{
 const before=JSON.stringify(store.annotations);
 await assert.rejects(()=>store.restoreBackup({annotations:[bookmark('would-be-new'),{...bookmark('imported'),bookId:'another-book'}],progress:[],preferences:{}}),/another book/);
 assert.equal(JSON.stringify(store.annotations),before);assert.equal((await store.dbGetAll('annotations')).some(a=>a.id==='would-be-new'),false);
});
