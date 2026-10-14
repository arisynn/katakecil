/** KataKecil V4.5 - public, server-validated reading endpoint.
 * GETTING READY: deploy independently BEFORE switching public Reader.
 * verify_jwt=false is required for anonymous callers using publishable keys.
 * This endpoint deliberately never accepts a client-supplied publication status.
 * Important: server-side secrets are NEVER included in Vite or exposed to browsers.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'private, no-store, max-age=0',
  'X-Content-Type-Options': 'nosniff',
};
const reply = (status:number, body:unknown) => new Response(JSON.stringify(body),{status,headers:HEADERS});
function getServerKey():string|undefined {
  try {
    const secret=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}');
    if(typeof secret.default==='string'&&secret.default)return secret.default;
  } catch { /* legacy fallback */ }
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||undefined;
}
async function visitorHash(value:string,salt:string):Promise<string> {
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(salt+':'+value));
  return [...new Uint8Array(digest)].map(n=>n.toString(16).padStart(2,'0')).join('');
}
type Input={bookId?:unknown;action?:unknown;episodeNumber?:unknown};
Deno.serve(async (req:Request)=>{
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:HEADERS});
  if(req.method!=='POST')return reply(405,{error:'Gunakan POST.'});
  const url=Deno.env.get('SUPABASE_URL');
  const secret=getServerKey();
  const salt=Deno.env.get('READER_RATE_SALT');
  if(!url||!secret||!salt)return reply(503,{error:'Layanan membaca belum dikonfigurasi.'});
  let input:Input;
  try {
    if(Number(req.headers.get('content-length')||0)>1024)return reply(413,{error:'Permintaan terlalu besar.'});
    const raw=await req.text();
    if(raw.length>1024)return reply(413,{error:'Permintaan terlalu besar.'});
    input=JSON.parse(raw);
    if(!input||typeof input!=='object'||Array.isArray(input))throw Error('invalid JSON object');
  } catch {return reply(400,{error:'Body JSON tidak valid.'});}
  const bookId=input.bookId;
  if(typeof bookId!=='string'||!/^[a-z0-9][a-z0-9_-]{0,95}$/i.test(bookId))
    return reply(400,{error:'Identitas novel tidak valid.'});
  const isIndex=input.action==='index';
  if(input.action!==undefined&&!isIndex)return reply(400,{error:'Aksi membaca tidak dikenal.'});
  if(isIndex ? input.episodeNumber!==undefined :
    (!Number.isInteger(input.episodeNumber)||Number(input.episodeNumber)<0||Number(input.episodeNumber)>9999))
    return reply(400,{error:'Identitas episode tidak valid.'});

  const db=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
  try {
    // The platform/proxy network identifier is a best-effort abuse signal,
    // NOT an authorization factor. Supplement with gateway/WAF limits in production.
    const ip=req.headers.get('cf-connecting-ip')||req.headers.get('x-real-ip')||
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown';
    const visitor=await visitorHash(ip+':'+(req.headers.get('user-agent')||''),salt);
    const budget=await db.rpc('qr_consume_read_budget',{p_visitor:visitor});
    if(budget.error)return reply(503,{error:'Pembatasan akses belum tersedia.'});
    if(budget.data!==true)return reply(429,{error:'Terlalu banyak permintaan. Coba lagi nanti.'});
    const {data:book,error:bookError}=await db.from('qr_books').select('id')
      .eq('id',bookId).eq('is_published',true).is('deleted_at',null).maybeSingle();
    if(bookError)return reply(503,{error:'Status publikasi tidak bisa diperiksa.'});
    if(!book)return reply(404,{error:'Novel tidak tersedia.'});
    const now=new Date().toISOString();
    if(isIndex){
      const {data,error}=await db.from('qr_episodes')
        .select('episode_number,title,arc_title,release_at')
        .eq('book_id',bookId).eq('is_enabled',true).is('deleted_at',null).lte('release_at',now)
        .order('episode_number',{ascending:true}).limit(10000);
      if(error)return reply(503,{error:'Indeks episode tidak tersedia.'});
      return reply(200,{type:'index',episodes:data||[]});
    }
    const {data:episode,error}=await db.from('qr_episodes')
      .select('episode_number,title,arc_title,content_md,release_at,is_enabled')
      .eq('book_id',bookId).eq('episode_number',Number(input.episodeNumber))
      .eq('is_enabled',true).is('deleted_at',null).lte('release_at',now).maybeSingle();
    if(error)return reply(503,{error:'Episode tidak dapat diperiksa.'});
    if(!episode||!episode.release_at||!episode.is_enabled||
      new Date(episode.release_at).getTime()>Date.now())return reply(404,{error:'Episode belum tersedia.'});
    if(typeof episode.content_md!=='string'||!episode.content_md.trim()||
      episode.content_md.length>1_000_000)return reply(422,{error:'Format naskah tidak valid.'});
    return reply(200,{
      episodeNumber:episode.episode_number,
      title:episode.title,arc:episode.arc_title,content:episode.content_md,
    });
  } catch {
    // Never return SQL details, secrets or narrative text inside error responses.
    return reply(500,{error:'Tidak dapat memuat bacaan.'});
  }
});
