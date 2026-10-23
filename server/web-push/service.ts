import {createClient} from '@supabase/supabase-js';
import {createHash,createHmac,createECDH,ECDH,timingSafeEqual} from 'node:crypto';
import webPush from 'web-push';

export type Subscription={endpoint:string;keys:{p256dh:string;auth:string}};
type Row={id:string;subscription:Subscription;cursor_at:string;cursor_id:string;lease_id:string};
export const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
const THROUGH_TIMESTAMP='ffffffff-ffff-ffff-ffff-ffffffffffff';
export function validSubscription(value:unknown):value is Subscription{
 const s=value as Subscription;
 try{
  if(!s||typeof s.endpoint!=='string'||s.endpoint.length>4096)return false;
  const u=new URL(s.endpoint),host=u.hostname;
  const point=Buffer.from(s.keys?.p256dh||'','base64url');
  if(point.length!==65||point[0]!==4)return false;
  ECDH.convertKey(point,'prime256v1',undefined,undefined,'uncompressed');
  const provider=host==='fcm.googleapis.com'||host==='web.push.apple.com'||host.endsWith('.push.services.mozilla.com')||host.endsWith('.notify.windows.com');
  return provider&&u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&!u.hash&&typeof s.keys?.p256dh==='string'&&typeof s.keys?.auth==='string'&&/^[\w-]+$/.test(s.keys.p256dh)&&/^[\w-]+$/.test(s.keys.auth)&&Buffer.from(s.keys.p256dh,'base64url').length===65&&Buffer.from(s.keys.p256dh,'base64url')[0]===4&&Buffer.from(s.keys.auth,'base64url').length===16;
 }catch{return false;}
}
export function readConfig(env:NodeJS.ProcessEnv=process.env){
 const required=['WEB_PUSH_SITE_ORIGIN','WEB_PUSH_VAPID_PUBLIC_KEY','WEB_PUSH_VAPID_PRIVATE_KEY','WEB_PUSH_SUBJECT','WEB_PUSH_DISPATCH_SECRET','SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','SUPABASE_PUBLIC_KEY'];
 if(env.WEB_PUSH_ENABLED!=='true'||required.some(key=>!env[key]))return null;
 try{
  const site=new URL(env.WEB_PUSH_SITE_ORIGIN!);if(site.protocol!=='https:'||site.origin!==env.WEB_PUSH_SITE_ORIGIN||env.WEB_PUSH_DISPATCH_SECRET!.length<32||new URL(env.SUPABASE_URL!).protocol!=='https:')return null;
  const key=createECDH('prime256v1');key.setPrivateKey(Buffer.from(env.WEB_PUSH_VAPID_PRIVATE_KEY!,'base64url'));
  if(key.getPublicKey().toString('base64url')!==env.WEB_PUSH_VAPID_PUBLIC_KEY||!['mailto:','https:'].includes(new URL(env.WEB_PUSH_SUBJECT!).protocol))return null;
 }catch{return null;}
 return {origin:env.WEB_PUSH_SITE_ORIGIN!,publicKey:env.WEB_PUSH_VAPID_PUBLIC_KEY!,privateKey:env.WEB_PUSH_VAPID_PRIVATE_KEY!,subject:env.WEB_PUSH_SUBJECT!,dispatchSecret:env.WEB_PUSH_DISPATCH_SECRET!,url:env.SUPABASE_URL!,adminKey:env.SUPABASE_SERVICE_ROLE_KEY!,anonKey:env.SUPABASE_PUBLIC_KEY!};
}
export type PushConfig=NonNullable<ReturnType<typeof readConfig>>;
export function authorized(header:string|null,secret:string){const expected=Buffer.from(`Bearer ${secret}`),actual=Buffer.from(header||'');return actual.length===expected.length&&timingSafeEqual(actual,expected);}
export function json(value:unknown,status=200){return Response.json(value,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});}
export async function readBody(request:Request):Promise<Record<string,unknown>>{
 if(!request.headers.get('content-type')?.startsWith('application/json'))throw Error('body');
 const reader=request.body?.getReader();if(!reader)throw Error('body');let size=0;const pieces:Uint8Array[]=[];
 try{while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>8192){await reader.cancel();throw Error('body');}pieces.push(value);}}finally{reader.releaseLock();}
 const value=JSON.parse(Buffer.concat(pieces).toString());if(!value||Array.isArray(value)||typeof value!=='object')throw Error('body');return value;
}
export function repository(config:PushConfig){
 const options={auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input:RequestInfo|URL,init?:RequestInit)=>fetch(input,{...init,signal:AbortSignal.timeout(10000),cache:'no-store'})}};
 const admin=createClient(config.url,config.adminKey,options),publicDb=createClient(config.url,config.anonKey,options);
 return {
  async register(subscription:Subscription,capability:string,rate:string){
   const {data,error}=await admin.rpc('qr_web_push_register',{p_endpoint_hash:hash(subscription.endpoint),p_subscription:subscription,p_capability_hash:hash(capability),p_rate_hash:rate});
   if(error)throw Object.assign(Error('registration'),{code:error.code});return data;
  },
  async remove(endpoint:string,capability:string){const {error}=await admin.from('qr_web_push_subscriptions').delete().eq('endpoint_hash',hash(endpoint)).eq('capability_hash',hash(capability));if(error)throw Error('remove');},
  async claim(){const {data,error}=await admin.rpc('qr_web_push_claim',{p_limit:50});if(error)throw Error('claim');return data as Row[];},
  async episodes(row:Row,cutoff:string){
   // Public client/RLS plus explicit public/released filters. No manuscript bodies.
   const {data,error}=await publicDb.from('qr_episodes').select('id,episode_number,title,release_at,book:qr_books!inner(id,slug,title,is_published,deleted_at)').eq('is_enabled',true).is('deleted_at',null).eq('book.is_published',true).is('book.deleted_at',null).lte('release_at',cutoff).or(`release_at.gt.${row.cursor_at},and(release_at.eq.${row.cursor_at},id.gt.${row.cursor_id})`).order('release_at').order('id').limit(100);
   if(error)throw Error('episodes');return data as unknown as PublicEpisode[];
  },
  async finish(row:Row,cursor?:{at:string;id:string},expired=false){
   const query=expired?admin.from('qr_web_push_subscriptions').delete():admin.from('qr_web_push_subscriptions').update({lease_id:null,lease_until:null,updated_at:new Date().toISOString(),...(cursor?{cursor_at:cursor.at,cursor_id:cursor.id}:{})});
   const {error}=await query.eq('id',row.id).eq('lease_id',row.lease_id);if(error)throw Error('finish');
  },
  async clean(){const {error}=await admin.from('qr_web_push_limits').delete().lt('expires_at',new Date().toISOString());if(error)throw Error('cleanup');},
 };
}
type PublicEpisode={id:string;episode_number:number;title:string;release_at:string;book:{id:string;slug:string;title:string;is_published:boolean;deleted_at:string|null}};
export type PushRepository=ReturnType<typeof repository>;
type Sender=(subscription:Subscription,payload:string)=>Promise<unknown>;
export function sender(config:PushConfig):Sender{return (subscription,payload)=>webPush.sendNotification(subscription,payload,{TTL:86400,urgency:'normal',timeout:7000,vapidDetails:{subject:config.subject,publicKey:config.publicKey,privateKey:config.privateKey}});}

export async function subscriptionRequest(request:Request,config:PushConfig|null,db?:PushRepository){
 if(request.method==='GET')return json({available:!!config,...(config?{publicKey:config.publicKey}:{})});
 if(request.method!=='POST')return json({error:'Method not allowed'},405);
 if(!config)return json({error:'Notifikasi web belum diaktifkan pengelola.'},503);
 if(request.headers.get('origin')!==config.origin)return json({error:'Forbidden'},403);
 let body:Record<string,unknown>;try{body=await readBody(request);}catch{return json({error:'Permintaan tidak valid.'},400);}
 const {action,subscription,capability}=body;
 if(!['subscribe','unsubscribe'].includes(String(action))||!validSubscription(subscription)||typeof capability!=='string'||!/^[-\w]{43}$/.test(capability))return json({error:'Langganan tidak valid.'},400);
 try{
  db??=repository(config);
  if(action==='unsubscribe'){await db.remove(subscription.endpoint,capability);return json({ok:true});}
  const ip=request.headers.get('x-vercel-forwarded-for')||request.headers.get('x-forwarded-for')?.split(',')[0]||'unknown';
  const rate=createHmac('sha256',config.dispatchSecret).update(`${Math.floor(Date.now()/3600000)}:${ip}`).digest('hex');
  await db.register({endpoint:subscription.endpoint,keys:{p256dh:subscription.keys.p256dh,auth:subscription.keys.auth}},capability,rate);
  return json({ok:true});
 }catch(error){const code=(error as {code?:string}).code;if(code==='P0001')return json({error:'Terlalu banyak percobaan. Coba lagi nanti.'},429);if(code==='42501')return json({error:'Langganan perlu dibuat ulang dari browser ini.'},409);console.error('web-push subscription unavailable');return json({error:'Notifikasi belum dapat disimpan. Coba lagi nanti.'},503);}
}

export async function dispatchRequest(request:Request,config:PushConfig|null,db?:PushRepository,send?:Sender){
 if(request.method!=='POST')return json({error:'Method not allowed'},405);
 if(!config||!authorized(request.headers.get('authorization'),config.dispatchSecret))return json({error:'Unauthorized'},401);
 db??=repository(config);send??=sender(config);
 const repo=db,push=send,cutoff=new Date().toISOString(),started=Date.now();let delivered=0,failed=0,expired=0;
 try{
  const claimed=await repo.claim();let position=0;
  await Promise.all(Array.from({length:Math.min(5,claimed.length)},async()=>{
   while(position<claimed.length){const row=claimed[position++];
    if(Date.now()-started>145000){await repo.finish(row);continue;}
    try{
     const episodes=await repo.episodes(row,cutoff),books=new Map<string,PublicEpisode>();
     for(const ep of episodes){if(!ep.book?.is_published||ep.book.deleted_at||Date.parse(ep.release_at)>Date.parse(cutoff))continue;books.set(ep.book.id,ep);}
     for(const ep of books.values()){
      await push(row.subscription,JSON.stringify({title:`Bab baru · ${ep.book.title}`.slice(0,140),body:ep.title.slice(0,240),url:`/baca/${encodeURIComponent(ep.book.slug)}?episode=${ep.episode_number}`,tag:`chapter-${ep.id}`}));delivered++;
     }
     const last=episodes.at(-1);await repo.finish(row,episodes.length===100&&last?{at:last.release_at,id:last.id}:{at:cutoff,id:THROUGH_TIMESTAMP});
    }catch(error){const status=(error as {statusCode?:number}).statusCode;if(status===404||status===410){expired++;await repo.finish(row,undefined,true);}else{failed++;await repo.finish(row);}}
   }
  }));
  await repo.clean();return json({ok:true,delivered,failed,expired});
 }catch{console.error('web-push dispatch unavailable');return json({error:'Dispatch unavailable'},503);}
}
