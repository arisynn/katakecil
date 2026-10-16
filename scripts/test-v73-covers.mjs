import {CoverRaster} from './test-utils/cover-codec.mjs';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {Image} from './test-utils/image-fixture.mjs';
import JSZip from 'jszip';
import {loadTs} from './test-utils/load-ts.mjs';
const {DEFAULT_COVER,cropRect,fitSize}=loadTs('src/features/covers/model.ts');
const {inspectImage}=loadTs('src/features/covers/inspect.ts');
const {renderCover}=loadTs('supabase/functions/_shared/cover-render.ts');
const {createCoverHandler,imageHash,COVER_PRIVATE,COVER_PUBLIC}=loadTs('supabase/functions/_shared/cover-service.ts');
const {parseZip}=loadTs('src/features/import/zip.ts');
for(const [w,h] of [[300,450],[900,1600],[900,1200],[800,800],[1600,900],[200,1000],[1000,200]]){
 const im=new Image(w,h);im.fill(0x235db4ff);const png=await im.encode();
 assert.deepEqual([inspectImage(png).width,inspectImage(png).height],[w,h]);
 const outputs=await renderCover(png,DEFAULT_COVER,CoverRaster);assert(outputs.every(o=>o.width<=w&&o.height<=h));
 for(const o of outputs){const info=inspectImage(o.bytes);assert.equal(info.mime,'image/webp');assert.deepEqual([info.width,info.height],[o.width,o.height]);}
 const cropped=await renderCover(png,{...DEFAULT_COVER,mode:'crop',x:1,y:0,zoom:1.4},CoverRaster);
 assert(cropped.filter(x=>x.kind==='card').every(o=>Math.abs(o.width/o.height-2/3)<.015));
 assert.deepEqual(cropped.find(o=>o.kind==='detail').width,w);
}
assert.deepEqual(fitSize(100,150,720),{width:100,height:150});
assert.equal(cropRect(900,1600,{...DEFAULT_COVER,mode:'crop',y:1}).y,250);
assert.throws(()=>inspectImage(new Uint8Array([1,2,3])),/bukan/);
const originalImage=new Image(300,400);originalImage.fill(0x3578c8ff);const original=await originalImage.encode();
const huge=new Uint8Array(original);new DataView(huge.buffer).setUint32(16,8000);new DataView(huge.buffer).setUint32(20,8000);assert.throws(()=>inspectImage(huge),/megapiksel/);
const broken=new Uint8Array(original).subarray(0,original.length-15);assert.throws(()=>inspectImage(broken),/lengkap|rusak/);
const z=new JSZip();z.file('001.md','# Bab 1\nSynthetic chapter body.');z.file('cover.png',original);z.file('sampul-alternatif.png',original);z.file('illustrations/scene.png',original);z.file('fake.jpg',new Uint8Array([1,2,3]));
const parsed=(await parseZip(await z.generateAsync({type:'uint8array'}),'covers.zip')).parsed;
assert.equal(parsed.covers.length,3);assert(parsed.covers[0].score>parsed.covers[2].score);assert(parsed.chapters.filter(c=>c.include).every(c=>c.content_md));assert(parsed.warnings.some(w=>w.includes('fake.jpg')));
const db=new PGlite();
const baseline=readFileSync('scripts/test-v72-database.mjs','utf8').match(/await db.exec\(`([\s\S]*?)`\);/)[1];
await db.exec(baseline);
await db.exec(readFileSync('supabase/migrations/20261014085124_v72_online_pwa_smart_import.sql','utf8'));
await db.exec(readFileSync('supabase/migrations/20261015080323_v73_smart_covers.sql','utf8'));
const actor='00000000-0000-4000-8000-000000000001',outsider='00000000-0000-4000-8000-000000000002',assetId='00000000-0000-4000-8000-000000000731';
await db.exec(`grant select on qr_books to anon,authenticated;alter table qr_books enable row level security;
create policy released on qr_books for select to anon,authenticated using(is_published and deleted_at is null);
create policy writer on qr_books for select to authenticated using(exists(select 1 from qr_author_members where user_id=(select auth.uid())));
insert into qr_books(id,slug,title,genre,status,is_published,is_featured) values('qa','qa','Synthetic','Fiksi','ongoing',false,false);`);
const payload={book_id:'qa',source_name:'synthetic.png',source_mime:'image/png',source_bytes:original.length,source_hash:await imageHash(original),normalized_hash:await imageHash(original),width:300,height:400,settings:DEFAULT_COVER};
const rpc=async(name,args)=>{
 const entries=Object.entries(args);const q=`select public.${name}(${entries.map(([key],i)=>`${key}=>$${i+1}`).join(',')}) as value`;
 return (await db.query(q,entries.map(([,v])=>typeof v==='object'&&v!==null?JSON.stringify(v):v))).rows[0].value;
};
await db.query("select set_config('test.uid',$1,false)",[actor]);await db.exec('set role authenticated');
let asset=await rpc('qr_cover_begin_v73',{p_id:assetId,p_payload:payload});assert.deepEqual(await rpc('qr_cover_begin_v73',{p_id:assetId,p_payload:payload}),asset);
await assert.rejects(rpc('qr_cover_begin_v73',{p_id:assetId,p_payload:{...payload,source_name:'changed.png'}}),/berbeda/);
await assert.rejects(rpc('qr_cover_lease_v73',{p_id:assetId,p_actor:actor,p_token:crypto.randomUUID()}),/permission denied/);
await assert.rejects(db.query("insert into qr_book_covers(book_id)values('qa')"),/permission denied/);
await db.query("insert into storage.objects(bucket_id,name)values($1,$2)",[COVER_PRIVATE,asset.source_path]);
await assert.rejects(db.query("insert into storage.objects(bucket_id,name)values($1,$2)",[COVER_PUBLIC,'qa/fake.webp']),/policy/);
await assert.rejects(db.query("insert into storage.objects(bucket_id,name)values($1,$2)",[COVER_PRIVATE,'qa/other/original.png']),/policy/);
await db.exec('reset role');await db.query("select set_config('test.uid',$1,false)",[outsider]);await db.exec('set role authenticated');
assert.equal((await db.query('select * from qr_cover_assets')).rows.length,0);
await assert.rejects(rpc('qr_cover_begin_v73',{p_id:crypto.randomUUID(),p_payload:payload}),/izin penulis/);
await db.exec('reset role;set role anon');await assert.rejects(db.query('select * from qr_cover_assets'),/permission denied/);assert.equal((await db.query('select * from qr_book_covers')).rows.length,0);
await db.exec('reset role');
const token=crypto.randomUUID();await rpc('qr_cover_lease_v73',{p_id:assetId,p_actor:actor,p_token:token});
await assert.rejects(rpc('qr_cover_lease_v73',{p_id:assetId,p_actor:actor,p_token:crypto.randomUUID()}),/masih diproses/);
await db.query('update qr_cover_assets set lease_until=null,lease_token=null where id=$1',[assetId]);
// Real handler, SQL lifecycle, image codec and immutable storage adapter together.
const objects=new Map([[`${COVER_PRIVATE}/${asset.source_path}`,original],[`${COVER_PRIVATE}/${asset.normalized_path}`,original]]);
let uploadFail=false;
function table(name){let action='select',values=null,filters=[];
 const q={select(){return q;},update(v){action='update';values=v;return q;},eq(k,v){filters.push([k,v]);return q;},async single(){return run(true);},async maybeSingle(){return run(true);},then(resolve,reject){return run(false).then(resolve,reject);}};
 async function run(one){try{let params=[];let sql;if(action==='update'){sql=`update public.${name} set ${Object.entries(values).map(([k,v])=>{params.push(v);return `${k}=$${params.length}`;}).join(',')} `;}else sql=`select * from public.${name} `;
 sql+='where '+filters.map(([k,v])=>{params.push(v);return `${k}=$${params.length}`;}).join(' and ');const r=await db.query(sql,params);return{data:one?r.rows[0]:r.rows,error:null};}catch(error){return{data:null,error};}}
 return q;
}
const adapter={auth:{async getUser(jwt){return {data:{user:jwt==='author-token'?{id:actor}:jwt==='outsider-token'?{id:outsider}:null},error:null};}},from:table,async rpc(n,a){try{return{data:await rpc(n,a),error:null};}catch(error){return{data:null,error};}},storage:{from(bucket){return{
 async download(path){const value=objects.get(`${bucket}/${path}`);return value?{data:new Blob([value]),error:null}:{data:null,error:Error('not found')};},
 async upload(path,bytes){if(uploadFail&&bucket===COVER_PUBLIC){uploadFail=false;return{error:Error('Simulated copy failure')};}const key=`${bucket}/${path}`;if(objects.has(key))return{error:{statusCode:409,message:'already exists'}};objects.set(key,bytes);return{error:null};},getPublicUrl(path){return{data:{publicUrl:`https://synthetic.supabase.co/storage/v1/object/public/${bucket}/${path}`}};}
 };}}};
const handler=createCoverHandler(adapter,CoverRaster);
const call=async(body,jwt='author-token')=>{const r=await handler(new Request('https://test/cover-assets',{method:'POST',headers:{authorization:`Bearer ${jwt}`},body:JSON.stringify(body)}));return{status:r.status,data:await r.json()};};
assert.equal((await call({action:'prepare',asset_id:assetId},'invalid')).status,401);
assert.equal((await call({action:'prepare',asset_id:assetId},'outsider-token')).status,403);
let prepared=await call({action:'prepare',asset_id:assetId});assert.equal(prepared.status,200,JSON.stringify(prepared));asset=prepared.data.asset;assert.equal(asset.status,'ready');assert(asset.manifest.card.length>=1);
assert(!Array.from(objects.keys()).some(p=>p.startsWith(COVER_PUBLIC+'/')),'private preparation must never create public copies');
assert.equal((await call({action:'prepare',asset_id:assetId})).data.asset.id,assetId);
const reqId='00000000-0000-4000-8000-000000000732',publish={action:'publish',asset_id:assetId,request_id:reqId,expected_version:0};
uploadFail=true;assert.equal((await call(publish)).status,422);assert.equal((await db.query('select cover_url from qr_books')).rows[0].cover_url,null);
const result=await call(publish);assert.equal(result.status,200,JSON.stringify(result));assert.equal(result.data.version,1);assert.deepEqual((await call(publish)).data,result.data);
assert(!JSON.stringify(result.data.manifest).includes('original'));assert(!JSON.stringify(result.data.manifest).includes('normalized'));assert(!JSON.stringify(result.data.manifest).includes('story-covers-v73-private'));
assert.equal((await db.query('select count(*)::int as n from qr_cover_publications')).rows[0].n,1);
const stale=await call({...publish,request_id:crypto.randomUUID()});assert.equal(stale.status,409);
assert.equal((await db.query('select version from qr_book_covers')).rows[0].version,1);
await db.exec('set role anon');assert.equal((await db.query('select * from qr_book_covers')).rows.length,0,'private book cover must stay hidden');
await db.exec('reset role;update qr_books set is_published=true;set role anon');assert.equal((await db.query('select * from qr_book_covers')).rows.length,1);
await db.exec('reset role;update qr_books set deleted_at=now();set role anon');assert.equal((await db.query('select * from qr_book_covers')).rows.length,0);
await db.exec('reset role');await db.query('update qr_books set deleted_at=null');
const expiredRequest='00000000-0000-4000-8000-000000000733';
await rpc('qr_cover_publish_begin_v73',{p_id:expiredRequest,p_asset:assetId,p_actor:actor,p_expected:1});
await db.query('update qr_cover_publications set abandoned=true where id=$1',[expiredRequest]);
await assert.rejects(rpc('qr_cover_publish_begin_v73',{p_id:expiredRequest,p_asset:assetId,p_actor:actor,p_expected:1}),/kedaluwarsa/);
await assert.rejects(rpc('qr_cover_publish_finish_v73',{p_id:expiredRequest,p_actor:actor,p_manifest:result.data.manifest}),/kedaluwarsa/);
assert.equal((await db.query('select version from qr_book_covers')).rows[0].version,1,'cleanup tombstones must prevent stale commits');
await db.close();
console.log('V7.3 covers: seven aspect ratios, contain/crop dimensions, no upscaling, PNG/WebP validation, candidate selection, SQL replay/RLS/grants/lease conflicts, private preparation, copy failure, publish retry and stale-version rejection passed.');
