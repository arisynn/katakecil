import {supabase} from './supabase';
import type {ReleaseRule,PlannedRelease} from '../utils/releasePlanning';

export type PublicationLog={id:number;episode_id:string;book_id:string;actor_id:string|null;action:string;old_release_at:string|null;new_release_at:string|null;old_enabled:boolean;new_enabled:boolean;created_at:string};
export async function getReleaseRules():Promise<ReleaseRule[]>{
  if(!supabase)throw Error('Supabase belum dikonfigurasi.');
  const {data,error}=await supabase.from('qr_release_rules').select('book_id,weekdays,time_wib,is_active,updated_at');
  if(error)throw error;
  return (data??[]).map(r=>({...r,time_wib:String(r.time_wib).slice(0,5)})) as ReleaseRule[];
}
export async function saveReleaseRule(rule:ReleaseRule){
  if(!supabase)throw Error('Supabase belum dikonfigurasi.');
  const {error}=await supabase.from('qr_release_rules').upsert({book_id:rule.book_id,weekdays:rule.weekdays,time_wib:rule.time_wib,is_active:rule.is_active},{onConflict:'book_id'});
  if(error)throw error;
}
export async function applyReleasePlan(bookId:string,plan:PlannedRelease[]):Promise<number>{
  if(!supabase)throw Error('Supabase belum dikonfigurasi.');
  const {data,error}=await supabase.rpc('qr_apply_release_plan',{p_book_id:bookId,p_plan:plan.map(({episode_id,release_at})=>({episode_id,release_at}))});
  if(error)throw error;
  return Number(data);
}
export async function getPublicationLogs(limit=60):Promise<PublicationLog[]>{
  if(!supabase)throw Error('Supabase belum dikonfigurasi.');
  const {data,error}=await supabase.from('qr_publication_logs').select('id,episode_id,book_id,actor_id,action,old_release_at,new_release_at,old_enabled,new_enabled,created_at').order('created_at',{ascending:false}).limit(limit);
  if(error)throw error;
  return (data??[]) as PublicationLog[];
}

export type ImportBatch={id:string;book_id:string;source_name:string;source_format:'epub'|'md'|'txt';detected_title:string;imported_count:number;sections_count?:number;created_at:string};
export async function getImportBatches(limit=40):Promise<ImportBatch[]>{
  if(!supabase)throw Error('Supabase belum dikonfigurasi.');
  const {data,error}=await supabase.from('qr_import_batches').select('id,book_id,source_name,source_format,detected_title,imported_count,sections_count,created_at').order('created_at',{ascending:false}).limit(limit);
  if(error)throw error;
  return (data??[]) as ImportBatch[];
}
