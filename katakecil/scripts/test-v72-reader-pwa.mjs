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
const handlers={},self={location:{origin:'https://example.test'},addEventListener:(name,fn)=>handlers[name]=fn,skipWaiting:()=>{self.skipped=true;}};
let mode='ok',fetches=[];
vm.runInNewContext(readFileSync('public/sw.js','utf8'),{self,URL,Response,fetch:async(req,options)=>{fetches.push(options);if(mode==='offline')throw Error('Network unavailable');return new Response('live',{status:mode==='404'?404:200});}});
async function navigate(){let response;handlers.fetch({request:{url:'https://example.test/baca/test',method:'GET',mode:'navigate'},respondWith:p=>response=p});return await response;}
assert.equal((await navigate()).status,200);assert.equal(fetches[0].cache,'no-store');mode='404';assert.equal((await navigate()).status,404);mode='offline';let result=await navigate();assert.equal(result.status,503);assert((await result.text()).includes('Koneksi diperlukan'));assert.equal(result.headers.get('cache-control'),'no-store');
let intercepted=false;handlers.fetch({request:{url:'https://example.test/rpc',method:'POST',mode:'cors'},respondWith:()=>intercepted=true});assert.equal(intercepted,false);
assert(!self.skipped);handlers.message({data:{type:'SKIP_WAITING'}});assert(self.skipped);
console.log('V7.2 reader/PWA: canonical 0/12/48/9999, Roman/Chapter headings, internal headings, completion, targeted privacy cleanup, network-only SW, HTTP errors and explicit activation passed.');
