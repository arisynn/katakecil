import {bytes,equalSecret,hash,hmac,validVapid} from './crypto.ts';
export type Subscription={endpoint:string;keys:{p256dh:string;auth:string}};
export type Row={id:string;subscription:Subscription;cursor_at:string;cursor_id:string;lease_id:string;delivered_keys:Record<string,boolean>};
export type Episode={id:string;source:'episode'|'epub';episode_number:number;title:string;release_at:string;book:{id:string;slug:string;title:string;is_published:boolean;deleted_at:string|null}};
export type PushConfig={origin:string;url:string;publicKey:string;privateKey:string;subject:string;dispatchSecret:string;adminKey:string;anonKey:string};
export interface PushRepository{
 healthy():Promise<boolean>;
 register(subscription:Subscription,capabilityHash:string,rateHash:string):Promise<void>;
 remove(endpointHash:string,capabilityHash:string):Promise<void>;
 claim():Promise<{cutoff:string;rows:Row[]}>;
 episodes(row:Row,cutoff:string):Promise<Episode[]>;
 visible(episode:Episode):Promise<boolean>;
 ownsLease(row:Row):Promise<boolean>;
 markSent(row:Row,eventId:string):Promise<void>;
 finish(row:Row,cursor?:{at:string;id:string},expired?:boolean):Promise<void>;
 clean():Promise<void>;
}
export type Payload={eventId:string;title:string;body:string;url:string;tag:string};
export type Sender=(subscription:Subscription,payload:Payload)=>Promise<void>;
const THROUGH='ffffffff-ffff-ffff-ffff-ffffffffffff';
function namedKey(get:(key:string)=>string|undefined,name:string){try{return JSON.parse(get(name)||'{}').default as string|undefined;}catch{return undefined;}}
export async function readConfig(get:(key:string)=>string|undefined):Promise<PushConfig|null>{
 if(get('WEB_PUSH_ENABLED')!=='true')return null;
 const config:PushConfig={origin:get('WEB_PUSH_SITE_ORIGIN')||'',url:get('SUPABASE_URL')||'',publicKey:get('WEB_PUSH_VAPID_PUBLIC_KEY')||'',privateKey:get('WEB_PUSH_VAPID_PRIVATE_KEY')||'',subject:get('WEB_PUSH_SUBJECT')||'',dispatchSecret:get('WEB_PUSH_DISPATCH_SECRET')||'',adminKey:namedKey(get,'SUPABASE_SECRET_KEYS')||get('SUPABASE_SECRET_KEY')||get('SUPABASE_SERVICE_ROLE_KEY')||'',anonKey:get('WEB_PUSH_SUPABASE_PUBLIC_KEY')||namedKey(get,'SUPABASE_PUBLISHABLE_KEYS')||get('SUPABASE_PUBLISHABLE_KEY')||get('SUPABASE_PUBLIC_KEY')||get('SUPABASE_ANON_KEY')||''};
 try{if(new URL(config.origin).origin!==config.origin||new URL(config.origin).protocol!=='https:'||new URL(config.url).protocol!=='https:'||config.dispatchSecret.length<32||!config.adminKey||!config.anonKey||!['https:','mailto:'].includes(new URL(config.subject).protocol)||!await validVapid(config.publicKey,config.privateKey))return null;return config;}catch{return null;}
}
export async function validSubscription(value:unknown):Promise<boolean>{
 const subscription=value as Subscription;
 try{if(!subscription||typeof subscription.endpoint!=='string'||subscription.endpoint.length>4096||typeof subscription.keys?.p256dh!=='string'||typeof subscription.keys?.auth!=='string'||!/^[\w-]{87}$/.test(subscription.keys.p256dh)||!/^[\w-]{22}$/.test(subscription.keys.auth))return false;
  const url=new URL(subscription.endpoint),host=url.hostname,point=bytes(subscription.keys.p256dh);
  if(url.protocol!=='https:'||url.username||url.password||url.port||url.hash||!(host==='fcm.googleapis.com'||host==='web.push.apple.com'||host.endsWith('.push.services.mozilla.com')||host.endsWith('.notify.windows.com'))||bytes(subscription.keys.auth).length!==16||point.length!==65||point[0]!==4)return false;
  await crypto.subtle.importKey('raw',point,{name:'ECDH',namedCurve:'P-256'},false,[]);return true;
 }catch{return false;}
}
export function response(body:unknown,status=200,headers:HeadersInit={}){return Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}});}
async function readBody(request:Request){
 if(!request.headers.get('content-type')?.startsWith('application/json'))throw Error('body');
 const reader=request.body?.getReader();if(!reader)throw Error('body');const chunks:Uint8Array[]=[];let length=0;
 try{while(true){const item=await reader.read();if(item.done)break;length+=item.value.length;if(length>8192){await reader.cancel();throw Error('body');}chunks.push(item.value);}}finally{reader.releaseLock();}
 const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 const value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));if(!value||typeof value!=='object'||Array.isArray(value))throw Error('body');return value as Record<string,unknown>;
}
export async function subscriptionRequest(request:Request,action:'subscribe'|'unsubscribe',config:PushConfig|null,repo?:PushRepository){
 const origin=request.headers.get('origin'),allowed=config?.origin||'https://katakecil.vercel.app';
 const cors:Record<string,string>=origin===allowed?{'Access-Control-Allow-Origin':origin,'Vary':'Origin','Access-Control-Allow-Headers':'apikey, content-type, authorization, x-client-info','Access-Control-Allow-Methods':action==='subscribe'?'GET,POST,OPTIONS':'POST,OPTIONS'}:{'Vary':'Origin'};
 const reply=(body:unknown,status=200)=>response(body,status,cors);
 if(origin!==allowed)return reply({error:'Origin tidak diizinkan.'},403);
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(action==='subscribe'&&request.method==='GET'){
  const available=!!config&&!!repo&&await repo.healthy().catch(()=>false);
  return reply({available,...(available?{publicKey:config!.publicKey}:{}),backend:'supabase-edge'});
 }
 if(request.method!=='POST')return reply({error:'Method not allowed'},405);
 if(!config||!repo)return reply({error:'Notifikasi web belum diaktifkan pengelola.'},503);
 let value:Record<string,unknown>;try{value=await readBody(request);}catch{return reply({error:'Permintaan tidak valid.'},400);}
 const {subscription,capability}=value;
 if(typeof capability!=='string'||!/^[\w-]{43}$/.test(capability)||!await validSubscription(subscription))return reply({error:'Langganan tidak valid.'},400);
 const safe=subscription as Subscription;
 try{
  if(action==='unsubscribe'){await repo.remove(await hash(safe.endpoint),await hash(capability));return reply({ok:true});}
  const ip=request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown';
  const rate=await hmac(config.dispatchSecret,`${Math.floor(Date.now()/3600000)}:${ip}`);
  await repo.register({endpoint:safe.endpoint,keys:{p256dh:safe.keys.p256dh,auth:safe.keys.auth}},await hash(capability),rate);return reply({ok:true});
 }catch(error){const code=(error as {code?:string}).code;return reply({error:code==='P0001'?'Terlalu banyak percobaan. Coba lagi nanti.':code==='42501'?'Langganan perlu dibuat ulang dari browser ini.':'Notifikasi belum dapat disimpan.'},code==='P0001'?429:code==='42501'?409:503);}
}
// PostgreSQL timestamps have microsecond precision; Date alone truncates it.
export function releaseOrder(value:string){const fraction=/\.(\d+)/.exec(value)?.[1]||'';return Date.parse(value)*1000+Number(fraction.padEnd(6,'0').slice(3,6));}
export const eventId=(episode:Episode)=>hash(`${episode.source}:${episode.id}:${new Date(episode.release_at).toISOString().replace('Z',(/\.(\d+)/.exec(episode.release_at)?.[1]||'').padEnd(6,'0').slice(3,6)+'Z')}`);
export async function dispatchRequest(request:Request,config:PushConfig|null,repo?:PushRepository,send?:Sender){
 if(request.method!=='POST')return response({error:'Method not allowed'},405);
 if(!config||!await equalSecret(request.headers.get('authorization')||'',`Bearer ${config.dispatchSecret}`))return response({error:'Unauthorized'},401);
 if(!repo||!send)return response({error:'Dispatch unavailable'},503);
 const started=Date.now();let delivered=0,failed=0,expired=0,skipped=0,sends=0;
 try{const {cutoff,rows}=await repo.claim();let position=0;
  await Promise.all(Array.from({length:Math.min(5,rows.length)},async()=>{
   while(position<rows.length){const row=rows[position++];
    try{
     if(Date.now()-started>85000||sends>=80){await repo.finish(row);continue;}
     const episodes=await repo.episodes(row,cutoff),books=new Map<string,Episode>();let incomplete=false;
     for(const episode of episodes){if(!episode.book?.is_published||episode.book.deleted_at||!Number.isFinite(Date.parse(episode.release_at))||Date.parse(episode.release_at)>Date.parse(cutoff))continue;books.set(episode.book.id,episode);}
     for(const episode of books.values()){
      const id=await eventId(episode);if(row.delivered_keys?.[id]){skipped++;continue;}
      if(Date.now()-started>85000||sends>=80){incomplete=true;break;}
      if(!await repo.ownsLease(row)){incomplete=true;break;}
      if(!await repo.visible(episode))continue;
      sends++;await send(row.subscription,{eventId:id,title:`Bab baru · ${episode.book.title}`.slice(0,140),body:episode.title.slice(0,240),url:`/baca/${encodeURIComponent(episode.book.slug)}?episode=${episode.episode_number}`,tag:`kk-${id}`});
      await repo.markSent(row,id);row.delivered_keys??={};row.delivered_keys[id]=true;delivered++;
     }
     const last=episodes.at(-1);await repo.finish(row,incomplete?undefined:episodes.length===100&&last?{at:last.release_at,id:last.id}:{at:cutoff,id:THROUGH});
    }catch(error){const status=(error as {statusCode?:number}).statusCode;if(status===404||status===410){expired++;await repo.finish(row,undefined,true);}else{failed++;await repo.finish(row);}}
   }
  }));await repo.clean();return response({ok:true,delivered,failed,expired,skipped});
 }catch{return response({error:'Dispatch unavailable'},503);}
}
