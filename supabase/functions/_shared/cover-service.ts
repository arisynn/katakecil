import {COVER_LIMITS,type CoverAsset,type CoverManifest,type PublicCoverManifest} from './cover-model.ts';
import {inspectImage} from './cover-inspect.ts';
import {renderCover} from './cover-render.ts';
export const COVER_PRIVATE='story-covers-v73-private',COVER_PUBLIC='story-covers-v73';
const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'};
const reply=(status:number,value:unknown)=>new Response(JSON.stringify(value),{status,headers});
const uuid=(s:unknown):s is string=>typeof s==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(s);
export const imageHash=async(b:Uint8Array)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b as Uint8Array<ArrayBuffer>))).map(n=>n.toString(16).padStart(2,'0')).join('');
async function readJSON(req:Request){
 const reader=req.body?.getReader();if(!reader)throw Error('Permintaan kosong.');const chunks:Uint8Array[]=[];let n=0;
 try{while(true){const {value,done}=await reader.read();if(done)break;n+=value.length;if(n>4096){await reader.cancel();throw Error('Permintaan terlalu besar.');}chunks.push(value);}}finally{reader.releaseLock();}
 const bytes=new Uint8Array(n);let i=0;for(const part of chunks){bytes.set(part,i);i+=part.length;}return JSON.parse(new TextDecoder().decode(bytes));
}
async function rpc(db:any,name:string,args:Record<string,unknown>){const {data,error}=await db.rpc(name,args);if(error)throw error;return data;}
async function download(db:any,bucket:string,path:string,max:number){
 const {data,error}=await db.storage.from(bucket).download(path);if(error||!data)throw Error('Berkas sampul belum lengkap. Coba unggah kembali.');
 if(data.size>max)throw Error('Ukuran sampul melampaui batas.');return new Uint8Array(await data.arrayBuffer());
}
async function putImmutable(db:any,bucket:string,path:string,bytes:Uint8Array){
 const {error}=await db.storage.from(bucket).upload(path,bytes,{contentType:'image/webp',cacheControl:bucket===COVER_PUBLIC?'31536000':'0',upsert:false});
 if(!error)return;
 // A lost upload acknowledgement is safe to retry; never overwrite an existing object.
 if(String(error.statusCode||error.status)!=='409'&&!/already exists|duplicate/i.test(error.message||''))throw error;
 const stored=await download(db,bucket,path,2097152);if(await imageHash(stored)!==await imageHash(bytes))throw Error('Objek sampul berbeda dari operasi sebelumnya.');
}
export function createCoverHandler(db:any,ImageClass:any){return async(req:Request):Promise<Response>=>{
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});if(req.method!=='POST')return reply(405,{error:'Gunakan POST.'});
 const jwt=req.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];if(!jwt)return reply(401,{error:'Masuk sebagai penulis terlebih dahulu.'});
 let actor:string;
 try{const {data,error}=await db.auth.getUser(jwt);if(error||!data.user)return reply(401,{error:'Sesi berakhir. Masuk kembali.'});actor=data.user.id;
 const {data:member,error:memberError}=await db.from('qr_author_members').select('user_id').eq('user_id',actor).maybeSingle();if(memberError||!member)return reply(403,{error:'Tidak memiliki izin penulis.'});}catch{return reply(503,{error:'Pemeriksaan sesi belum tersedia. Coba lagi.'});}
 let input:any;try{input=await readJSON(req);if(!input||!uuid(input.asset_id)||!['prepare','publish'].includes(input.action))throw Error('Permintaan sampul tidak valid.');}catch(e){return reply(400,{error:e instanceof Error?e.message:'Permintaan tidak valid.'});}
 let lease:string|undefined;
 try{
  if(input.action==='prepare'){
   lease=crypto.randomUUID();const asset=await rpc(db,'qr_cover_lease_v73',{p_id:input.asset_id,p_actor:actor,p_token:lease});
   if(asset.status==='ready'||asset.status==='published')return reply(200,{asset});
   const source=await download(db,COVER_PRIVATE,asset.source_path,COVER_LIMITS.bytes);const info=inspectImage(source);
   if(info.mime!==asset.source_mime||source.length!==asset.source_bytes||await imageHash(source)!==asset.source_hash)throw Error('Berkas asli tidak sesuai metadata upload.');
   const normalized=await download(db,COVER_PRIVATE,asset.normalized_path,COVER_LIMITS.normalizedBytes);
   if(await imageHash(normalized)!==asset.normalized_hash)throw Error('Gambar yang disiapkan tidak sesuai operasi upload.');
   const normalizedInfo=inspectImage(normalized);if(normalizedInfo.width!==asset.width||normalizedInfo.height!==asset.height)throw Error('Dimensi preview tidak sesuai.');
   const outputs=await renderCover(normalized,asset.settings,ImageClass);
   const manifest:CoverManifest={version:asset.id,mode:asset.settings.mode,card:[],detail:null as any};
   for(const output of outputs){const path=`${asset.book_id}/${asset.id}/${output.name}`;await putImmutable(db,COVER_PRIVATE,path,output.bytes);const variant={path,width:output.width,height:output.height,bytes:output.bytes.length,mime:output.mime};if(output.kind==='card')manifest.card.push(variant);else manifest.detail=variant;}
   const complete=await rpc(db,'qr_cover_finish_v73',{p_id:asset.id,p_actor:actor,p_token:lease,p_manifest:manifest});lease=undefined;
   return reply(200,{asset:complete});
  }
  if(!uuid(input.request_id)||!Number.isSafeInteger(input.expected_version)||input.expected_version<0)return reply(400,{error:'Identitas publikasi tidak valid.'});
  const publication=await rpc(db,'qr_cover_publish_begin_v73',{p_id:input.request_id,p_asset:input.asset_id,p_actor:actor,p_expected:input.expected_version});
  if(publication.result)return reply(200,publication.result);
  const {data:asset,error:assetError}=await db.from('qr_cover_assets').select('*').eq('id',input.asset_id).single();if(assetError||!asset?.manifest)throw Error('Sampul belum siap.');
  const manifest:PublicCoverManifest={version:input.request_id,mode:asset.settings.mode,card:[],detail:null as any};
  const variants=[...asset.manifest.card,asset.manifest.detail];
  for(const [i,variant] of variants.entries()){
   if(typeof variant.path!=='string'||!variant.path.startsWith(`${asset.book_id}/${asset.id}/`)||!/^card-\d+\.webp$|^detail\.webp$/.test(variant.path.split('/').pop()))throw Error('Varian sampul tidak valid.');
   const path=`${asset.book_id}/${input.request_id}/${variant.path.split('/').pop()}`;
   const bytes=await download(db,COVER_PRIVATE,variant.path,2097152);await putImmutable(db,COVER_PUBLIC,path,bytes);
   const item={url:db.storage.from(COVER_PUBLIC).getPublicUrl(path).data.publicUrl,width:variant.width,height:variant.height,bytes:variant.bytes,mime:variant.mime};
   if(i===variants.length-1)manifest.detail=item;else manifest.card.push(item);
  }
  return reply(200,await rpc(db,'qr_cover_publish_finish_v73',{p_id:input.request_id,p_actor:actor,p_manifest:manifest}));
 }catch(error:any){
  if(lease)await db.from('qr_cover_assets').update({lease_token:null,lease_until:null}).eq('id',input.asset_id).eq('lease_token',lease).eq('status','pending');
  // A lost commit response is ambiguous: never delete immutable public copies here.
  // Receipts make retries safe; the scoped cleanup tool handles expired abandoned attempts.
  const code=error?.code;return reply(code==='42501'?403:code==='40001'?409:code==='55P03'?409:422,{error:error?.message||'Sampul belum tersimpan. Coba lagi.',code:code||'COVER_FAILED'});
 }
};}
