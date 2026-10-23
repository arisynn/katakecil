import {createClient} from '@supabase/supabase-js';
import {hash} from './crypto.ts';
import {releaseOrder} from './core.ts';
import type {Episode,PushConfig,PushRepository,Row} from './core.ts';
export function repository(config:PushConfig):PushRepository{
 const options={auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input:RequestInfo|URL,init?:RequestInit)=>fetch(input,{...init,signal:AbortSignal.timeout(10000),cache:'no-store'})}};
 const admin=createClient(config.url,config.adminKey,options),reader=createClient(config.url,config.anonKey,options);
 const rpc=async(name:string,args:Record<string,unknown>)=>{const {data,error}=await admin.rpc(name,args);if(error)throw Object.assign(Error('Push storage unavailable'),{code:error.code});return data;};
 const table=(episode:Episode)=>episode.source==='epub'?'qr_epub_releases':'qr_episodes';
 return {
  async healthy(){const {error}=await admin.from('qr_web_push_subscriptions').select('id,delivered_keys').limit(0);return !error;},
  async register(subscription,capabilityHash,rateHash){await rpc('qr_web_push_register',{p_endpoint_hash:await hash(subscription.endpoint),p_subscription:subscription,p_capability_hash:capabilityHash,p_rate_hash:rateHash});},
  async remove(endpointHash,capabilityHash){const {error}=await admin.from('qr_web_push_subscriptions').delete().eq('endpoint_hash',endpointHash).eq('capability_hash',capabilityHash);if(error)throw Error('Unsubscribe unavailable');},
  async claim(){return await rpc('qr_web_push_claim_edge',{p_limit:50}) as {cutoff:string;rows:Row[]};},
  async episodes(row,cutoff){
   const query=(name:string)=>{let request=reader.from(name).select('id,episode_number,title,release_at,book:qr_books!inner(id,slug,title,is_published,deleted_at)').eq('is_enabled',true);if(name==='qr_episodes')request=request.is('deleted_at',null);return request.eq('book.is_published',true).is('book.deleted_at',null).lte('release_at',cutoff).or(`release_at.gt.${row.cursor_at},and(release_at.eq.${row.cursor_at},id.gt.${row.cursor_id})`).order('release_at').order('id').limit(100);};
   const [regular,epub]=await Promise.all([query('qr_episodes'),query('qr_epub_releases')]);if(regular.error||epub.error&&!['42P01','PGRST205'].includes(epub.error.code))throw Error('Released metadata unavailable');
   return [...(regular.data||[]).map(row=>({...row,source:'episode' as const})),...(epub.data||[]).map(row=>({...row,source:'epub' as const}))].sort((a,b)=>releaseOrder(a.release_at)-releaseOrder(b.release_at)||a.id.localeCompare(b.id)).slice(0,100) as unknown as Episode[];
  },
  async visible(episode){let query=reader.from(table(episode)).select('id,book:qr_books!inner(is_published,deleted_at)').eq('id',episode.id).eq('is_enabled',true).eq('release_at',episode.release_at).lte('release_at',new Date().toISOString()).eq('book.is_published',true).is('book.deleted_at',null);if(episode.source==='episode')query=query.is('deleted_at',null);const {data,error}=await query.maybeSingle();if(error)throw Error('Release recheck unavailable');return Boolean(data);},
  async ownsLease(row){return Boolean(await rpc('qr_web_push_lease_alive',{p_id:row.id,p_lease:row.lease_id}));},
  async markSent(row,eventId){if(!await rpc('qr_web_push_mark_sent',{p_id:row.id,p_lease:row.lease_id,p_event:eventId}))throw Error('Push lease expired');},
  async finish(row,cursor,expired=false){await rpc('qr_web_push_finish_edge',{p_id:row.id,p_lease:row.lease_id,p_cursor_at:cursor?.at||null,p_cursor_id:cursor?.id||null,p_expired:expired});},
  async clean(){const {error}=await admin.from('qr_web_push_limits').delete().lt('expires_at',new Date().toISOString());if(error)throw Error('Push limit cleanup unavailable');},
 };
}
