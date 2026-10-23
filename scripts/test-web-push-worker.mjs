import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {indexedDB} from 'fake-indexeddb';
const source=readFileSync('public/sw.js','utf8');let shown=[],fail=false,clock=Date.now();
const load=()=>{
 const events={},self={location:{origin:'https://reader.example.test'},addEventListener:(name,handler)=>events[name]=handler,skipWaiting(){},clients:{claim:async()=>{},matchAll:async()=>[],openWindow:async()=>{}},registration:{getNotifications:async({tag})=>shown.filter(row=>row.tag===tag),showNotification:async(title,options)=>{if(fail)throw Error('Synthetic display failure');shown.push({title,...options});}}};
 class ClockDate extends Date{static now(){return clock;}}
 vm.runInNewContext(source,{self,indexedDB,URL,Date:ClockDate});assert.equal(events.fetch,undefined);return events;
};
const push=async(events,payload)=>{let work;events.push({data:{json:()=>payload},waitUntil:promise=>work=promise});await work;};
const first={eventId:'a'.repeat(64),title:'Bab baru',body:'Public chapter',url:'/baca/book?episode=2'};let events=load();
await Promise.all([push(events,first),push(events,first),push(events,first)]);assert.equal(shown.length,1,'Concurrent pushes must claim one receipt');assert.equal(shown[0].renotify,false);
shown=[];events=load();await push(events,first);assert.equal(shown.length,0,'Restart and dismissed notification must still be deduplicated');
const second={...first,eventId:'b'.repeat(64),url:'https://evil.test/attack'};fail=true;await assert.rejects(push(events,second));fail=false;await push(events,second);assert.equal(shown.length,1,'Display failure rolls the receipt back for retry');assert.equal(shown[0].data.path,'/');
clock+=8*86400000;await push(events,{...first,eventId:'c'.repeat(64)});
const request=indexedDB.open('katakecil-push-receipts',1);const db=await new Promise((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
const records=await new Promise(resolve=>{const request=db.transaction('seen').objectStore('seen').getAll();request.onsuccess=()=>resolve(request.result);});db.close();assert.equal(records.length,1);assert.deepEqual(Object.keys(records[0]).sort(),['at','id']);
console.log('PASS Web Push worker: atomic IndexedDB receipts, concurrent duplicate suppression, persistence across worker restart and notification dismissal, retry after display failure, bounded metadata cleanup, safe routes, renotify=false, and no page/content caching.');
