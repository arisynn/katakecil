// Compatibility gateway for old KataKecil clients. Prepared locally; NOT deployed.
// Published content is authorized by the existing katakecil-reader endpoint.
// No Storage signatures, service-role keys, draft data or source EPUB objects are used.
export const ALLOWED = [
 {id:'masa-panen-google-play-ready-1'},
 {id:'garis-yang-kita-teruskan-karisyono-final-45-bab'},
 {id:'contoh-katakecil'},
];
const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET, OPTIONS','Access-Control-Allow-Headers':'content-type','X-Content-Type-Options':'nosniff','Cache-Control':'no-store'};
const json=(body:unknown,status=200)=>Response.json(body,{status,headers});
interface PublishedBook {id:string; title:string; revision:string; section_ids:string[]; cover_url?:string; author?:string; language?:string}
export async function handle(request:Request,env:{url:string},fetcher:typeof fetch=fetch){
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(request.method!=='GET')return json({error:'Method not allowed'},405);
 const target=new URL(request.url),action=target.searchParams.get('action')||'catalog',id=target.searchParams.get('book');
 if(!['catalog','epub'].includes(action))return json({error:'Unknown action'},400);
 if(action==='epub'&&!ALLOWED.some(b=>b.id===id))return json({error:'Book not available'},404);
 try{
  const base=new URL(env.url);if(base.protocol!=='https:')throw Error('config');
  const endpoint=new URL('/functions/v1/katakecil-reader',base),catalog=new URL(endpoint);catalog.searchParams.set('action','catalog');
  const response=await fetcher(catalog.href,{credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer',redirect:'error',signal:AbortSignal.timeout(15000)});
  if(!response.ok)return json({error:'Published reading service unavailable'},response.status===429?429:503);
  const data=await response.json();if(!Array.isArray(data.books))throw Error('catalog');
  const books:PublishedBook[]=data.books.filter((b:PublishedBook)=>ALLOWED.some(a=>a.id===b.id)&&Array.isArray(b.section_ids)&&b.section_ids.length>0&&/^[a-f\d]{64}$/.test(b.revision));
  if(action==='epub'){
   const book=books.find(b=>b.id===id);if(!book)return json({error:'Book not available'},404);
   const revision=target.searchParams.get('revision');if(revision&&revision!==book.revision)return json({error:'Publication changed'},409);
   endpoint.searchParams.set('action','epub');endpoint.searchParams.set('book',book.id);endpoint.searchParams.set('revision',book.revision);
   return json({url:endpoint.href,revision:book.revision});
  }
  return json({books:books.map(b=>{const url=new URL('/functions/v1/lumina-library',base);url.searchParams.set('action','epub');url.searchParams.set('book',b.id);url.searchParams.set('revision',b.revision);return{id:b.id,title:b.title,author:b.author||'',language:b.language||'id',cover:b.cover_url||null,version:b.revision,revision:b.revision,section_ids:b.section_ids,url:url.href,source:'supabase'};})});
 }catch{return json({error:'Library temporarily unavailable'},503);}
}
if(import.meta.main)Deno.serve(request=>handle(request,{url:Deno.env.get('SUPABASE_URL')||''}));
