import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {loadTs} from './test-utils/load-ts.mjs';
const {readerHeading}=loadTs('src/utils/readerHeading.ts');
const {chapterFromEpisode}=loadTs('src/utils/episodeChapter.ts');
for(const [n,title] of [[0,'Prolog'],[12,'Bab XII — Malam'],[48,'Chapter 48: Kota'],[9999,'Bab 9999 — Akhir']]){
 const ch=chapterFromEpisode(n,title,'Arc II','First paragraph.\n\n## Heading internal\n\nSecond paragraph.');assert.equal(ch.displayNumber,n);assert(ch.plainText.includes('Second paragraph.'));assert.equal(ch.arc,'Arc II');
}
assert.deepEqual(readerHeading('Bab XII — Malam',12),{eyebrow:'BAB 12',title:'Malam'});
assert.deepEqual(readerHeading('Chapter 48: Kota',48),{eyebrow:'BAB 48',title:'Kota'});
assert.equal(readerHeading('Bab 9 — Delapan',8).title,'Bab 9 — Delapan','Conflicting numbers must not be silently stripped');
const {matchesStoryStatus}=loadTs('src/features/public/storyFilters.ts');assert(matchesStoryStatus('ongoing','Berlangsung'));assert(!matchesStoryStatus('hiatus','Berlangsung'));assert(matchesStoryStatus('completed','Tamat'));
const {normalizeCompletedEpisodes}=loadTs('src/utils/readerCompletion.ts');assert.deepEqual(normalizeCompletedEpisodes([0,12,12,-1,'bad']),[0,12]);
const store=new Map([['quiet_reader_bookmarks_preview-abc','private sentinel'],['quiet_reader_anchor_preview-abc','offset'],['quiet_reader_bookmarks_book-1','metadata'],['other_app','keep']]);
globalThis.localStorage={get length(){return store.size;},key:i=>[...store.keys()][i],removeItem:k=>store.delete(k)};
loadTs('src/utils/privacy.ts').cleanPreviewStorage();assert.equal(store.size,2);assert(store.has('other_app'));delete globalThis.localStorage;
const handlers={},notifications=[];
const self={location:{origin:'https://example.test'},addEventListener:(name,fn)=>handlers[name]=fn,skipWaiting:()=>{self.skipped=true;},clients:{claim:async()=>{},matchAll:async()=>[],openWindow:async url=>{self.opened=url;}},registration:{showNotification:async(title,data)=>notifications.push({title,...data})}};
vm.runInNewContext(readFileSync('public/sw.js','utf8'),{self,URL});
assert.equal(handlers.fetch,undefined,'Notification worker must not intercept or cache pages');
handlers.install();assert(self.skipped);let work;
handlers.push({data:{json:()=>({title:'Bab baru',body:'Judul publik',url:'/baca/book?episode=2'})},waitUntil:p=>work=p});await work;
assert.equal(notifications[0].data.path,'/baca/book?episode=2');
handlers.push({data:{json:()=>({url:'https://evil.test/attack'})},waitUntil:p=>work=p});await work;assert.equal(notifications[1].data.path,'/');
handlers.notificationclick({notification:{close(){},data:{path:'/baca/book?episode=2'}},waitUntil:p=>work=p});await work;assert.equal(self.opened,'https://example.test/baca/book?episode=2');
assert(!readFileSync('index.html','utf8').includes('rel="manifest"'));
console.log('PASS reader/privacy; notification-only SW, safe notification routes, no fetch caching or PWA manifest.');
