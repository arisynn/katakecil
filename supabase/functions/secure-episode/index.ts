/** KataKecil V4.3 – one published episode per request, never a whole book.
 * Deployed with verify_jwt=false for anonymous readers. Authorization is enforced
 * here against publication metadata; author draft editing uses a separate RPC.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';
const HEADERS = {
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods':'POST, OPTIONS',
  'Content-Type':'application/json; charset=utf-8',
  'Cache-Control':'private, no-store, max-age=0',
  'X-Content-Type-Options':'nosniff',
};
const reply=(code:number,result:unknown)=>new Response(JSON.stringify(result),{status:code,headers:HEADERS});
function getServerKey():string|undefined {
  const legacy=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if(legacy)return legacy;
  try {
    const keys=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}');
    return typeof keys.default==='string'?keys.default:undefined;
  }catch{return undefined;}
}
async function visitorHash(raw:string,salt:string):Promise<string>{
  const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(salt+':'+raw));
  return [...new Uint8Array(hash)].map(n=>n.toString(16).padStart(2,'0')).join('');
}
Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:HEADERS});
  if(req.method!=='POST')return reply(405,{error:'Hanya permintaan POST yang diizinkan.'});
  const url=Deno.env.get('SUPABASE_URL'),key=getServerKey(),salt=Deno.env.get('READER_RATE_SALT');
  if(!url||!key||!salt)return reply(503,{error:'Konfigurasi Secure Episode belum lengkap.'});
  let input:Record<string,unknown>;
  try {
    if(Number(req.headers.get('content-length')||0)>1024)return reply(413,{error:'Request terlalu besar.'});
    const body=await req.text();if(body.length>1024)return reply(413,{error:'Request terlalu besar.'});
    input=JSON.parse(body);
    if(!input||typeof input!=='object'||Array.isArray(input))throw Error('invalid');
  }catch{return reply(400,{error:'Body JSON tidak valid.'});}
  const {bookId,episodeNumber}=input;
  // Episode 0 is a valid, explicit chapter identifier.
  if(typeof bookId!=='string'||!/^[a-z0-9][a-z0-9_-]{0,95}$/i.test(bookId)
      ||!Number.isInteger(episodeNumber)||Number(episodeNumber)<0||Number(episodeNumber)>9999)
    return reply(400,{error:'Identitas buku atau nomor episode tidak valid.'});
  const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  try {
    const ip=req.headers.get('cf-connecting-ip')||req.headers.get('x-real-ip')
      ||req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown';
    const visitor=await visitorHash(ip+':'+(req.headers.get('user-agent')||''),salt);
    const {data:allowed,error:budgetError}=await db.rpc('qr_consume_read_budget',{p_visitor:visitor});
    if(budgetError)return reply(503,{error:'Pemeriksaan batas akses gagal.'});
    if(!allowed)return reply(429,{error:'Terlalu banyak permintaan. Coba lagi nanti.'});
    const {data:book,error:bookError}=await db.from('qr_books').select('id')
      .eq('id',bookId).eq('is_published',true).maybeSingle();
    if(bookError||!book)return reply(404,{error:'Novel belum tersedia.'});
    const {data:episode,error:episodeError}=await db.from('qr_episodes')
      .select('episode_number,title,arc_title,content_md,release_at,is_enabled')
      .eq('book_id',bookId).eq('episode_number',Number(episodeNumber))
      .eq('is_enabled',true).lte('release_at',new Date().toISOString()).maybeSingle();
    if(episodeError||!episode||!episode.release_at||!episode.is_enabled
      ||new Date(episode.release_at).getTime()>Date.now())return reply(404,{error:'Episode belum terbit.'});
    if(!episode.content_md||episode.content_md.length>1_000_000)return reply(422,{error:'Naskah episode tidak dapat ditampilkan.'});
    return reply(200,{
      episodeNumber:episode.episode_number,title:episode.title,
      arc:episode.arc_title,content:episode.content_md,
    });
  }catch{return reply(500,{error:'Server tidak bisa memuat episode.'});}
});
