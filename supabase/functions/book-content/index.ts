import {createClient} from '@supabase/supabase-js';
// @ts-types="../_shared/studio-content.d.mts"
import {contentRequest,readEpubConfig} from '../_shared/studio-content.mjs';
function named(name:string){try{return JSON.parse(Deno.env.get(name)||'{}').default||'';}catch{return '';}}
Deno.serve(async(request:Request)=>{
 const publicKey=named('SUPABASE_PUBLISHABLE_KEYS')||Deno.env.get('SUPABASE_PUBLISHABLE_KEY')||Deno.env.get('SUPABASE_ANON_KEY')||'';
 const secretKey=named('SUPABASE_SECRET_KEYS')||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
 const config=readEpubConfig({SUPABASE_URL:Deno.env.get('SUPABASE_URL'),SUPABASE_PUBLIC_KEY:publicKey,SUPABASE_SERVICE_ROLE_KEY:secretKey,EPUB_SITE_ORIGIN:Deno.env.get('WEB_PUSH_SITE_ORIGIN')||'https://katakecil.vercel.app'});
 const origin=request.headers.get('origin');
 const headers:Record<string,string>={'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Headers':'apikey, authorization, content-type, x-client-info','Access-Control-Allow-Methods':'GET, POST, OPTIONS','Vary':'Origin'};
 if(config&&origin&&[config.origin,'https://localhost'].includes(origin))headers['Access-Control-Allow-Origin']=origin;
 const reply=(status:number,error:string)=>Response.json({error},{status,headers});
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(!['GET','POST'].includes(request.method))return reply(405,'Gunakan POST atau GET.');
 if(!config)return reply(503,'Layanan baca belum dikonfigurasi.');
 if(origin&&![config.origin,'https://localhost'].includes(origin))return reply(403,'Origin tidak diizinkan.');
 let id:string|null=null;
 if(request.method==='POST'){
  if(Number(request.headers.get('content-length'))>1024)return reply(413,'Permintaan terlalu besar.');
  try{
   const reader=request.body?.getReader();if(!reader)throw Error();
   const chunks:Uint8Array[]=[];let size=0;
   try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>1024){await reader.cancel();return reply(413,'Permintaan terlalu besar.');}chunks.push(value);}}finally{reader.releaseLock();}
   const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
   const body=JSON.parse(new TextDecoder().decode(bytes));if(typeof body?.id!=='string')throw Error();id=body.id;
  }catch{return reply(400,'Identitas bagian tidak valid.');}
 }else id=new URL(request.url).searchParams.get('id');
 if(!id||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))return reply(400,'Identitas bagian tidak valid.');
 const salt=Deno.env.get('READER_RATE_SALT');if(!salt)return reply(503,'Pembatasan akses belum dikonfigurasi.');
 const db=createClient(config.url,config.secretKey,{auth:{persistSession:false,autoRefreshToken:false}});
 const ip=request.headers.get('cf-connecting-ip')||request.headers.get('x-real-ip')||request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown';
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(salt+':'+ip+':'+(request.headers.get('user-agent')||'')));
 const visitor=Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,'0')).join('');
 const budget=await db.rpc('qr_consume_read_budget',{p_visitor:visitor});if(budget.error)return reply(503,'Pembatasan akses belum tersedia.');if(budget.data!==true)return reply(429,'Terlalu banyak permintaan. Coba lagi nanti.');
 const url=new URL(request.url);url.searchParams.set('id',id);
 const response=await contentRequest(new Request(url,{headers:origin?{origin}:{}}),config);
 const merged=new Headers(response.headers);for(const [key,value]of Object.entries(headers))merged.set(key,value);
 return new Response(response.body,{status:response.status,headers:merged});
});
