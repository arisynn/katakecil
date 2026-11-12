import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {indexedDB} from 'fake-indexeddb';
const dom=new JSDOM('',{url:'https://backup.example/'}),w=dom.window;
Object.assign(globalThis,{window:w,localStorage:w.localStorage,indexedDB,BroadcastChannel:class{postMessage(){}close(){}}});
const store=await import('../dist/store.js?v=22');
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

test('comfort reset restores text and layout while keeping app, theme, speech and reading data',()=>{
 store.updatePreferences({themeMode:'dark',fontSize:30,brightness:60,readingMode:'scroll',ttsRate:1.8,uiLanguage:'id',accentColor:'#123456',glassTransparency:62,glassBlur:34,ambientIntensity:35,obsoletePreference:true});
 store.saveAnnotation({...bookmark('reset-kept-note'),type:'highlight',noteText:'Keep this note',selectedText:'A passage',startOffset:0,endOffset:9});store.saveProgress({bookId:'reset-kept-book',chapterIndex:2,charOffset:44,percentage:31});
 const identity=store.deviceId,notes=JSON.stringify(store.annotations),progress=JSON.stringify(store.progress);store.resetReadingPreferences();
 for(const key of ['fontSize','brightness','readingMode','fontWeight','paragraphSpacing','marginHorizontal','orientation','wakeLock'])assert.deepEqual(store.preferences[key],store.DEFAULTS[key],key);
 for(const [key,value]of Object.entries({themeMode:'dark',uiLanguage:'id',accentColor:'#123456',ttsRate:1.8,glassTransparency:62,glassBlur:34,ambientIntensity:35}))assert.equal(store.preferences[key],value,key);
 assert.equal(store.preferences.obsoletePreference,true);assert.equal(store.preferences.deviceId,identity);assert.equal(JSON.stringify(store.annotations),notes);assert.equal(JSON.stringify(store.progress),progress);assert.deepEqual(JSON.parse(localStorage.getItem('lumina_device_settings')),store.preferences);
 const prefs=JSON.stringify(store.preferences),setItem=w.Storage.prototype.setItem;try{w.Storage.prototype.setItem=()=>{throw Error('Storage blocked');};assert.throws(()=>store.resetReadingPreferences(),/could not be saved/);assert.equal(JSON.stringify(store.preferences),prefs);}finally{w.Storage.prototype.setItem=setItem;}
});
