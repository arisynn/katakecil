import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createDelivery} from '../supabase/functions/katakecil-reader/delivery.ts';
import {handle as legacy} from '../supabase/functions/lumina-library/index.ts';
import {handle as maintenance} from '../supabase/maintenance/reader-unavailable.ts';
import {PublishedReader,normalizePublishedCatalog,makeAnchor,resolveAnchor,ReadAloud} from '../dist/advanced-reader.js';
import {paginateToFit} from '../dist/pagination.js';
const revision='a'.repeat(64),uuid='00000000-0000-4000-8000-000000000001';
const book={id:'one',title:'Book',author:'Writer',language:'id',revision,section_ids:[uuid]},href='OEBPS/section-'+uuid+'.xhtml';
const text=('A paragraph 🙂 with repeatable content. '.repeat(30)+'\n\n').repeat(9);
const chapter={href,title:'First',text,contentHash:'b'.repeat(64)};
const url='https://example.supabase.co/functions/v1/katakecil-reader';
function fixture(){
 let available=true,allowed=true,after=false;const calls=[];
 const deps={catalog:async()=>available?[book]:[],edition:async()=>{if(after)available=false;return [chapter];},visitor:async()=> 'c'.repeat(64),budget:async input=>{calls.push(input);return{allowed,reason:'rate',retry_after:12};}};
 const handle=createDelivery(deps);
 const request=(action,token='',query='')=>new Request(`${url}?action=${action}&book=one&revision=${revision}${query}`,{method:action==='session'?'POST':'GET',headers:token?{'x-reader-session':token}:{}});
 return{handle,request,calls,setAllowed:value=>allowed=value,withdrawDuring:()=>after=true};
}
test('legacy endpoints never return bytes, redirects or signed URLs',async()=>{
 for(const action of ['catalog','epub']){const r=await legacy(new Request(url+'?action='+action));assert.equal(r.status,410);assert.ok(!JSON.stringify(await r.json()).includes('url'));}
 const f=fixture();assert.equal((await f.handle(f.request('epub'))).status,410);
 const unavailable=maintenance(new Request(url+'?action=epub'));assert.equal(unavailable.status,503);assert.equal((await unavailable.json()).url,undefined);
});
test('server sends metadata only, charges whole-episode volume, rechecks access, and fails closed',async()=>{
 const f=fixture();assert.equal((await f.handle(f.request('episode','','&chapter=0'))).status,401);
 const r=await f.handle(f.request('session'));const token=(await r.json()).session;assert.match(token,/^rs_[a-f0-9]{64}$/);
 const m=await f.handle(f.request('manifest',token));const meta=await m.json();assert.equal(meta.chapters[0].text,undefined);assert.equal(meta.chapters[0].length,text.length);
 const p=await f.handle(f.request('episode',token,'&chapter=0'));const data=await p.json();assert.equal(p.status,200);assert.ok(data.text===text);assert.equal(f.calls.find(c=>c.kind==='deliver').cost,data.text.length);assert.match(p.headers.get('cache-control'),/no-store/);
 f.setAllowed(false);const limited=await f.handle(f.request('episode',token,'&chapter=0'));assert.equal(limited.status,429);assert.equal(limited.headers.get('retry-after'),'12');
 const race=fixture();race.withdrawDuring();assert.equal((await race.handle(race.request('episode',token,'&chapter=0'))).status,404);
});
test('client fetches only the requested episode and keeps absolute anchors',async()=>{
 const f=fixture(),requests=[];const fetcher=async(address,options)=>{requests.push(String(address));return f.handle(new Request(address,options));};
 const meta=normalizePublishedCatalog({books:[book]},url)[0],client=new PublishedReader(meta,fetcher);await client.open();assert.equal(requests.length,2);assert.equal(client.chapters[0].text,'');
 await client.load(0);assert.equal(requests.length,3);const ch=client.chapters[0];assert.equal(ch.text,text);assert.ok(requests.at(-1).includes('action=episode'));assert.ok(!requests.at(-1).includes('offset='));
 const a=makeAnchor(ch,20,70);assert.equal(a.exact,text.slice(20,70));assert.deepEqual(resolveAnchor([ch],a),{chapterIndex:0,start:20,end:70});
 const pages=await paginateToFit(client.chapters,(t)=>t.length<=900);assert.equal(pages[0].start,0);assert.equal(pages.map(p=>p.text).join(''),text);
 client.clear();assert.equal(ch.text,'');
});
test('TTS requests the next episode only after the current paragraph queue completes',async()=>{
 const spoken=[],pending=[];let loads=0;
 const chapters=[{text:'First paragraph.'},{text:''}];
 const driver={init:async()=>{},voices:()=>[{lang:'en-US',voiceURI:'local',localService:true}],speak:o=>{spoken.push(o.text);o.start();return new Promise(r=>pending.push(r));},pause(){},resume(){},cancel(){}};
 const speech=new ReadAloud({change(){},paragraph(){},error:e=>assert.fail(e),next:async pos=>{if(pos.chapterIndex===1)return null;loads++;chapters[0].text='';chapters[1].text='Next paragraph.';return{chapterIndex:1,charOffset:0};}},driver);
 await speech.play(chapters,{chapterIndex:0,charOffset:0},{language:'en',rate:1});assert.equal(loads,0);assert.deepEqual(spoken,['First paragraph.']);pending.shift()();await new Promise(r=>setImmediate(r));assert.equal(loads,1);assert.deepEqual(spoken,['First paragraph.','Next paragraph.']);speech.stop();
});
