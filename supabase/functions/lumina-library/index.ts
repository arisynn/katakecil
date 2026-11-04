// Public reading is limited to these three owner-approved EPUB objects.
// The source bucket remains private; no keys or arbitrary object paths leave this function.
export const ALLOWED = [
  {id:'masa-panen-google-play-ready-1', title:'Masa Panen', author:'Karisyono', path:'masa-panen-google-play-ready-1/847ce17620c2c93df4c5eb4b0a334f8c704b820eb66897d4422442e8663b5b82.epub'},
  {id:'garis-yang-kita-teruskan-karisyono-final-45-bab', title:'Garis yang Kita Teruskan', author:'Karisyono', path:'garis-yang-kita-teruskan-karisyono-final-45-bab/2888b2cd556d5854433000c48e6496a86fb329e5b611b57287af97c2bbb9b244.epub'},
  {id:'kk-uji-terminal-internal', title:'Ruang Kecil', author:'Kata Kecil', path:'kk-uji-terminal-internal/6f95260d1e9d0b327ec9f3866f3a3a868f29147e27c69b225ad1436bc6da53d5.epub'}
];
const headers = {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET, OPTIONS','Access-Control-Allow-Headers':'content-type','Content-Type':'application/json','X-Content-Type-Options':'nosniff','Cache-Control':'no-store'};
const json=(body:unknown,status=200)=>Response.json(body,{status,headers});
export async function handle(request:Request, env:{url:string,key:string}, fetcher:typeof fetch=fetch) {
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(request.method!=='GET')return json({error:'Method not allowed'},405);
  const target=new URL(request.url),action=target.searchParams.get('action')||'catalog';
  if(!['catalog','epub'].includes(action))return json({error:'Unknown action'},400);
  const entry=ALLOWED.find(b=>b.id===target.searchParams.get('book'));
  if(action==='epub'&&!entry)return json({error:'Book not available'},404);
  if(!env.url||!env.key)return json({error:'Library unavailable'},503);
  const auth:Record<string,string>={apikey:env.key,'Content-Type':'application/json'};
  if(!env.key.startsWith('sb_secret_'))auth.Authorization='Bearer '+env.key;
  try {
    if(action==='catalog') {
      const ids=ALLOWED.map(b=>b.id).join(',');
      const response=await fetcher(`${env.url}/rest/v1/kk_books?select=id,title,author,cover_url,language,updated_at&id=in.(${ids})`,{headers:auth,signal:AbortSignal.timeout(15000)});
      if(!response.ok)throw Error('metadata');
      const metadata=await response.json();
      return json({source:'supabase',books:ALLOWED.map(b=>{
        const details=metadata.find((m:{id:string})=>m.id===b.id);
        const url=new URL(env.url+'/functions/v1/lumina-library');url.searchParams.set('action','epub');url.searchParams.set('book',b.id);
        return {id:b.id,title:details?.title||b.title,author:details?.author||b.author,language:details?.language||'id',cover:details?.cover_url||null,url:url.href,version:b.path.split('/').pop(),source:'supabase'};
      })});
    }
    const path=entry!.path.split('/').map(encodeURIComponent).join('/');
    const response=await fetcher(`${env.url}/storage/v1/object/sign/kk-sources/${path}`,{method:'POST',headers:auth,body:JSON.stringify({expiresIn:600}),signal:AbortSignal.timeout(15000)});
    if(!response.ok)throw Error('sign');
    const data=await response.json();
    const signed=data.signedURL||data.signedUrl;
    if(!signed)throw Error('sign');
    return json({url:new URL('/storage/v1'+signed,env.url).href});
  }catch{return json({error:'Library temporarily unavailable'},503);}
}
if(import.meta.main){
  const named=()=>{try{return JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}').default||'';}catch{return '';}};
  Deno.serve(request=>handle(request,{url:Deno.env.get('SUPABASE_URL')||'',key:named()||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||''}));
}
