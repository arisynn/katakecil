import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
const require=createRequire(import.meta.url);
const ts=require('typescript');

// Self-contained V4.5 mock. A full Vite build still requires the whole repository.
const source=readFileSync('supabase/functions/secure-episode/index.ts','utf8');
const transformed=ts.transpileModule(source.replace(/^import\s+\{\s*createClient\s*\}\s+from\s+.*;\s*$/m,''),{
  compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS},
});
let handler;
let mode='ok';
const fullContent='A long published episode body. '+('Narrative line. '.repeat(30));
const episodes=[{episode_number:0,title:'Prolog',arc_title:'Bab Pembuka',release_at:'2026-01-01T00:00:00Z'},
                {episode_number:1,title:'Bab I',arc_title:'Awal',release_at:'2026-02-01T00:00:00Z'}];
const client={
  rpc:async(name,arg)=>{
    assert.equal(name,'qr_consume_read_budget');
    assert.match(arg.p_visitor,/^[a-f0-9]{64}$/);
    return {data:mode!=='limited',error:mode==='rate-db-error'?{message:'db'}:null};
  },
  from(table){return {
    select(_columns){this.columns=_columns;return this;},
    eq(){return this;},is(){return this;},lte(){return this;},order(){return this;},limit(){return this;},
    async maybeSingle(){
      if(table==='qr_books')return {data:mode==='private'?null:{id:'novel'},error:null};
      if(mode==='unreleased')return {data:null,error:null};
      return {data:{episode_number:0,title:'Prolog',arc_title:'Bab Pembuka',release_at:
        mode==='future'?'2099-01-01T00:00:00Z':'2026-01-01T00:00:00Z',is_enabled:true,content_md:fullContent},error:null};
    },
    then(onFulfilled,onRejected){
      // supabase-js's PostgREST builder is thenable for index responses.
      assert.equal(table,'qr_episodes');
      assert.ok(!this.columns.includes('content_md'),'Index must NEVER select narrative');
      return Promise.resolve({data:episodes,error:null}).then(onFulfilled,onRejected);
    },
  };},
};
const env={SUPABASE_URL:'https://example.invalid',SUPABASE_SECRET_KEYS:'{"default":"secret-placeholder"}',READER_RATE_SALT:'local-nonproduction-salt'};
const context={exports:{},Deno:{env:{get:k=>env[k]},serve:fn=>{handler=fn;}},
  crypto:webcrypto,createClient:()=>client,Response,Request,TextEncoder,Uint8Array,console};
vm.runInNewContext(transformed.outputText,context);
async function request(body,method='POST'){
  return handler(new Request('https://example.invalid/functions/v1/secure-episode',{
    method,headers:{'content-type':'application/json'},body:method==='POST'?JSON.stringify(body):undefined,
  }));
}
let r=await request({bookId:'novel',action:'index'});
assert.equal(r.status,200);
let data=await r.json();
assert.equal(data.type,'index');
assert.equal(data.episodes.length,2);
assert.equal(JSON.stringify(data).includes(fullContent),false);
assert.equal(r.headers.get('Cache-Control'),'private, no-store, max-age=0');
r=await request({bookId:'novel',episodeNumber:0});
assert.equal(r.status,200);data=await r.json();
assert.equal(data.episodeNumber,0);
assert.equal(data.content,fullContent);
assert.equal((await request({bookId:'novel',episodeNumber:-1})).status,400);
assert.equal((await request({bookId:'novel',action:'index',episodeNumber:0})).status,400);
assert.equal((await request({bookId:'novel',action:'delete'})).status,400);
assert.equal((await request({bookId:'bad slash',episodeNumber:1})).status,400);
assert.equal((await request({bookId:'novel',episodeNumber:0},'GET')).status,405);
assert.equal((await handler(new Request('https://example.invalid',{method:'OPTIONS'}))).status,204);
mode='private';assert.equal((await request({bookId:'novel',episodeNumber:0})).status,404);
mode='unreleased';assert.equal((await request({bookId:'novel',episodeNumber:0})).status,404);
mode='future';assert.equal((await request({bookId:'novel',episodeNumber:0})).status,404);
mode='limited';assert.equal((await request({bookId:'novel',episodeNumber:0})).status,429);
mode='rate-db-error';assert.equal((await request({bookId:'novel',episodeNumber:0})).status,503);

const clientSource=readFileSync('src/data/secureReader.ts','utf8');
assert.match(clientSource,/body:\{bookId,action:'index'\}/);
assert.match(clientSource,/body:\{bookId,episodeNumber\}/);
assert.ok(!/localStorage\.setItem\([^,]+,\s*data\.content/.test(clientSource));
const gate=readFileSync('supabase/REVIEW_ONLY_stage2_metadata_grants.sql','utf8');
assert.match(gate,/REVOKE SELECT ON TABLE public\.qr_episodes FROM PUBLIC, anon, authenticated/);
assert.match(gate,/GRANT SELECT \(/);
assert.ok(!/GRANT SELECT\s*\(\s*content_md/.test(gate));
const readerSource=readFileSync('src/SecureReaderApp.tsx','utf8');
assert.match(readerSource,/readLocal\('quiet_reader_settings'/);
assert.match(readerSource,/loadReaderEpisode\(bookId,ep\)/);
console.log('PASS V4.5: publication safeguards, index privacy, episode 0, limits, API contract, no-store and metadata-grant staging.');
