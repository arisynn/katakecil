import {createHash} from 'node:crypto';
import {DOMParser,DOMImplementation,XMLSerializer} from '@xmldom/xmldom';
import {createClient} from '@supabase/supabase-js';
import {openEpub,type EpubDom} from '../../src/features/epub/archive.ts';

export type EpubConfig={url:string;publicKey:string;secretKey:string;origin:string};
export function readEpubConfig(env=process.env):EpubConfig|null{
 const {SUPABASE_URL:url,SUPABASE_PUBLIC_KEY:publicKey,SUPABASE_SERVICE_ROLE_KEY:secretKey}=env;
 const origin=env.EPUB_SITE_ORIGIN||env.WEB_PUSH_SITE_ORIGIN||'https://katakecil.vercel.app';
 try{if(!url||!publicKey||!secretKey||new URL(url).protocol!=='https:'||new URL(origin).protocol!=='https:')return null;return {url,publicKey,secretKey,origin:new URL(origin).origin};}catch{return null;}
}
export const serverDom:EpubDom={
 parse:source=>new DOMParser({onError:()=>{throw Error('XML EPUB rusak.');}}).parseFromString(source,'application/xml') as unknown as Document,
 create:()=>{const doc=new DOMImplementation().createDocument(null,'html',null),body=doc.createElement('body');doc.documentElement.appendChild(body);Object.defineProperty(doc,'body',{value:body});return doc as unknown as Document;},
 serialize:body=>Array.from(body.childNodes).map(node=>new XMLSerializer().serializeToString(node as never)).join(''),
 imageUrl:async blob=>`data:${blob.type};base64,${Buffer.from(await blob.arrayBuffer()).toString('base64')}`,
 revoke:()=>{},
};
export type PublicRelease={id:string;book_id:string;section_index:number;episode_number:number;title:string;is_enabled:boolean;release_at:string;book:{id:string;is_published:boolean;deleted_at:string|null}};
export function epubRepository(config:EpubConfig){
 const options={auth:{persistSession:false,autoRefreshToken:false}};
 const reader=createClient(config.url,config.publicKey,options),admin=createClient(config.url,config.secretKey,options);
 return {
  async release(id:string){const {data,error}=await reader.from('qr_epub_releases').select('id,book_id,section_index,episode_number,title,is_enabled,release_at,book:qr_books!inner(id,is_published,deleted_at)').eq('id',id).eq('is_enabled',true).lte('release_at',new Date().toISOString()).eq('book.is_published',true).is('book.deleted_at',null).maybeSingle();if(error)throw Error('Metadata unavailable');return data as unknown as PublicRelease|null;},
  async source(bookId:string){const {data,error}=await admin.from('qr_book_epubs').select('object_path,sha256,byte_size').eq('book_id',bookId).single();if(error)throw Error('Source unavailable');return data as {object_path:string;sha256:string;byte_size:number};},
  async file(path:string){const {data,error}=await admin.storage.from('book-epubs').download(path);if(error||!data)throw Error('Storage unavailable');return data;},
 };
}
type Repository=ReturnType<typeof epubRepository>;
const visible=(row:PublicRelease|null)=>Boolean(row&&row.is_enabled&&Number.isFinite(Date.parse(row.release_at))&&Date.parse(row.release_at)<=Date.now()&&row.book?.is_published&&!row.book.deleted_at);
export async function epubEpisodeRequest(request:Request,config:EpubConfig|null,provided?:Repository){
 const origin=request.headers.get('origin'),allowed=origin&&config&&[config.origin,'https://localhost'].includes(origin);
 const headers:Record<string,string>={'Cache-Control':'no-store, max-age=0','X-Content-Type-Options':'nosniff','Vary':'Origin'};
 if(allowed)headers['Access-Control-Allow-Origin']=origin!;
 const reply=(status:number,body:unknown)=>Response.json(body,{status,headers});
 if(!config)return reply(503,{error:'EPUB service is not configured'});
 if(origin&&!allowed)return reply(403,{error:'Origin not allowed'});
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Methods':'GET,OPTIONS'}});
 if(request.method!=='GET')return reply(405,{error:'Method not allowed'});
 const id=new URL(request.url).searchParams.get('id');if(!id||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))return reply(400,{error:'Invalid episode'});
 try{
  const repo=provided||epubRepository(config),release=await repo.release(id);if(!visible(release))return reply(404,{error:'Episode unavailable'});
  const source=await repo.source(release!.book_id),file=await repo.file(source.object_path);
  if(file.size!==source.byte_size||file.size>18_000_000||createHash('sha256').update(Buffer.from(await file.arrayBuffer())).digest('hex')!==source.sha256)throw Error('EPUB integrity mismatch');
  const archive=await openEpub(file,serverDom),rendered=await archive.renderSection(release!.section_index);
  try{
   const current=await repo.release(id),currentSource=await repo.source(release!.book_id);
   if(!visible(current)||current!.section_index!==release!.section_index||current!.book_id!==release!.book_id||currentSource.sha256!==source.sha256||currentSource.object_path!==source.object_path)return reply(404,{error:'Episode unavailable'});
   const body={html:rendered.html,sourceVersion:source.sha256};if(Buffer.byteLength(JSON.stringify(body))>3_800_000)return reply(413,{error:'Episode too large'});
   return reply(200,body);
  }finally{rendered.dispose();}
 }catch{return reply(503,{error:'Episode temporarily unavailable'});}
}
