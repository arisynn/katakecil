import {supabase,abortableStorage} from '../../data/supabase';
import {COVER_LIMITS,type CoverAsset,type PreparedCover,type PublicCoverManifest} from './model';
export const COVER_PRIVATE='story-covers-v73-private';
const digest=async(blob:Blob)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer()))).map(n=>n.toString(16).padStart(2,'0')).join('');
function client(){if(!supabase)throw Error('Supabase belum dikonfigurasi.');return supabase;}
function explain(error:any){return /does not exist|schema cache|PGRST202|PGRST205/i.test(error?.message||'')?'Fitur sampul membutuhkan pemasangan pembaruan server V7.3. Sampul lama tetap tersedia.':error?.message||'Koneksi gagal. Coba kembali.';}
export type CoverUploadOperation={id:string;payload:Record<string,unknown>;prepared:PreparedCover;actor:string;publishOnImport?:boolean;expectedImportVersion?:number;importPublicationId?:string};
export async function newCoverOperation(bookId:string,value:PreparedCover):Promise<CoverUploadOperation>{
 const db=client();const {data,error}=await db.auth.getUser();if(error||!data.user)throw Error('Sesi berakhir. Masuk kembali.');
 const [sourceHash,normalizedHash]=await Promise.all([digest(value.original),digest(value.normalized)]);
 return {id:crypto.randomUUID(),actor:data.user.id,prepared:value,payload:{book_id:bookId,source_name:value.name,source_bytes:value.original.size,source_mime:value.info.mime,source_hash:sourceHash,normalized_hash:normalizedHash,width:value.width,height:value.height,settings:value.settings}};
}
async function invoke(body:Record<string,unknown>){const {data,error}=await client().functions.invoke('cover-assets',{body});if(error){let message=explain(error);try{const response=await (error as any).context?.json();if(response?.error)message=response.error;}catch{}throw Error(message);}if(data?.error)throw Error(data.error);return data;}
async function assertActor(actor:string){const {data,error}=await client().auth.getUser();if(error||data.user?.id!==actor)throw Error('Sesi penulis berubah. Masuk kembali sebelum melanjutkan.');}
async function uploadImmutable(path:string,blob:Blob,mime:string,signal:AbortSignal){
 signal.throwIfAborted();const db=client();const {error}=await abortableStorage(signal).from(COVER_PRIVATE).upload(path,blob,{contentType:mime,cacheControl:'0',upsert:false});signal.throwIfAborted();
 if(!error)return;if(String((error as any).statusCode)!=='409'&&!/already exists|duplicate/i.test(error.message))throw Error(explain(error));
 const {data:old,error:readError}=await db.storage.from(COVER_PRIVATE).download(path);if(readError||!old||await digest(old)!==await digest(blob))throw Error('Berkas berbeda dari upload sebelumnya. Pilih gambar kembali.');
}
export async function saveCover(operation:CoverUploadOperation,signal:AbortSignal,progress:(s:string)=>void):Promise<CoverAsset>{
 await assertActor(operation.actor);signal.throwIfAborted();progress('Menyiapkan penyimpanan privat…');
 const {data:asset,error}=await client().rpc('qr_cover_begin_v73',{p_id:operation.id,p_payload:operation.payload});if(error)throw Error(explain(error));
 if(asset.status==='ready'||asset.status==='published')return asset;
 progress('Mengunggah berkas asli secara privat…');await uploadImmutable(asset.source_path,operation.prepared.original,operation.prepared.info.mime,signal);
 progress('Mengunggah gambar yang dioptimalkan…');await uploadImmutable(asset.normalized_path,operation.prepared.normalized,'image/png',signal);
 await assertActor(operation.actor);signal.throwIfAborted();progress('Memeriksa gambar dan menyiapkan ukuran sampul…');
 const result=await invoke({action:'prepare',asset_id:operation.id});signal.throwIfAborted();return result.asset;
}
export async function publishCover(assetId:string,expectedVersion:number,requestId:string){return invoke({action:'publish',asset_id:assetId,expected_version:expectedVersion,request_id:requestId}) as Promise<{version:number;manifest:PublicCoverManifest;book_id:string;asset_id:string}>;}
export async function listCovers(bookId:string):Promise<CoverAsset[]>{const {data,error}=await client().from('qr_cover_assets').select('*').eq('book_id',bookId).in('status',['ready','published']).order('created_at',{ascending:false}).limit(30);if(error)throw Error(explain(error));return data||[];}
export async function downloadCover(path:string,legacy=false){const {data,error}=await client().storage.from(legacy?'story-covers-private':COVER_PRIVATE).download(path);if(error||!data)throw Error('Sampul privat belum dapat dimuat. Coba lagi.');if(data.size>COVER_LIMITS.bytes)throw Error('Sampul terlalu besar.');return data;}
export async function currentCover(bookId:string){const {data,error}=await client().from('qr_book_covers').select('version,manifest,asset_id').eq('book_id',bookId).maybeSingle();if(error)throw Error(explain(error));return data as {version:number;manifest:PublicCoverManifest;asset_id:string}|null;}
