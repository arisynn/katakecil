export interface EpubCover {bytes:Uint8Array;mime:'image/webp'|'image/jpeg'|'image/png';extension:string}
const limit=3*1024*1024;
export async function readCover(value:string|null|undefined,projectUrl:string,fetcher:typeof fetch=fetch):Promise<EpubCover|null>{
 if(!value)return null;
 let bytes:Uint8Array,mime:string;
 const embedded=value.match(/^data:(image\/(?:webp|jpeg|png));base64,([a-z\d+/=]+)$/i);
 if(embedded){if(embedded[2].length>limit*4/3+8)return null;mime=embedded[1].toLowerCase();bytes=Uint8Array.from(atob(embedded[2]),c=>c.charCodeAt(0));}
 else{
  let target:URL;try{target=new URL(value);}catch{return null;}
  const project=new URL(projectUrl);
  if(target.protocol!=='https:'||target.username||target.password||!(target.origin===project.origin&&target.pathname.startsWith('/storage/v1/object/public/kk-covers/')||target.origin==='https://katakecil.vercel.app'&&target.pathname.startsWith('/assets/covers/')))return null;
  const response=await fetcher(target.href,{credentials:'omit',redirect:'error',signal:AbortSignal.timeout(10000)});
  if(!response.ok||Number(response.headers.get('content-length'))>limit)return null;
  mime=response.headers.get('content-type')?.split(';')[0].trim().toLowerCase()||'';
  const stream=response.body?.getReader();if(!stream)return null;const chunks:Uint8Array[]=[];let size=0;
  while(true){const {done,value}=await stream.read();if(done)break;size+=value.length;if(size>limit){await stream.cancel();return null;}chunks.push(value);}
  bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 }
 if(!bytes.length||bytes.length>limit||!['image/webp','image/jpeg','image/png'].includes(mime))return null;
 return {bytes,mime:mime as EpubCover['mime'],extension:mime==='image/jpeg'?'jpg':mime.slice(6)};
}
