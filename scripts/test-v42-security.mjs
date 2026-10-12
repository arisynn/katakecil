// Deterministic local tests for the Edge function with a mocked Supabase client.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import ts from 'typescript';
import { webcrypto } from 'node:crypto';
const source=fs.readFileSync('supabase/functions/secure-reader/index.ts','utf8');
const output=ts.transpileModule(source.replace(/^import \{ createClient \} from .*;\s*$/m,''),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
let handler;let mode='ok';let getRows=0;
const releasedEpisode={episode_number:3,title:'Contoh',arc_title:'Arc I',content_md:'Episode ini sedang terbit.\n\n'+('Ini paragraf yang aman. '.repeat(500)),is_enabled:true,release_at:'2026-10-01T00:00:00Z'};
const client={
 rpc: async()=>({data:mode!=='limited',error:null}),
 from:(table)=>{
  const query={
   select(){return this;},eq(){return this;},lte(){return this;},
   async maybeSingle(){getRows++;if(table==='qr_books')return {data:mode==='private'?null:{id:'contoh'},error:null};
    return {data:mode==='unreleased'?null:releasedEpisode,error:null};}
  };return query;
 }
};
const context={exports:{},Deno:{env:{get(name){return {SUPABASE_URL:'https://local.invalid',SUPABASE_SERVICE_ROLE_KEY:'private',READER_RATE_SALT:'salt'}[name];}},serve(fn){handler=fn;}},createClient(){return client;},Response,TextEncoder,Uint8Array,crypto:webcrypto,console};
vm.runInNewContext(output,context);
const chunk=context.exports.chunkMarkdown;
for(const data of ['Normal.','A\n\nB','a'.repeat(7400),'Hai '.repeat(3000)]){
 const chunks=chunk(data);
 assert.ok(chunks.length>0&&chunks.every(x=>x.length<=1800),'chunk size');
}
const call=async(body,method='POST')=>handler(new Request('https://local.invalid/secure-reader',{method,headers:{'content-type':'application/json','user-agent':'unit-test'},...(method==='POST'?{body:JSON.stringify(body)}:{})}));
const good={bookId:'contoh',episodeNumber:3,part:0};
let r=await call(good);assert.equal(r.status,200);let result=await r.json();assert.ok(result.content.length<=1800);assert.ok(result.totalParts>1);assert.equal(r.headers.get('Cache-Control'),'private, no-store, max-age=0');
mode='private';assert.equal((await call(good)).status,404);
mode='unreleased';assert.equal((await call(good)).status,404);
mode='limited';assert.equal((await call(good)).status,429);
mode='ok';assert.equal((await call({...good,part:999})).status,404);
assert.equal((await call({...good,bookId:'../../etc'})).status,400);
assert.equal((await call({...good,episodeNumber:0})).status,400);
assert.equal((await call({},'OPTIONS')).status,204);
console.log('V4.2 Secure Reader tests passed (chunks, released-only, unpublished, rate-limit, bounds, CORS, no-store).');
