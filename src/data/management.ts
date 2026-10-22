import {supabase} from './supabase';
import type {Episode} from './library';
import type {PlannedRelease} from '../utils/releasePlanning';
export type BulkItem={kind:'book'|'episode'|'section';id:string;title:string};
export type ManagementOperation={id:string;action:'trash'|'restore'|'delete';items:BulkItem[]};
async function rpc(name:string,args:Record<string,unknown>){
  if(!supabase)throw Error('Supabase belum dikonfigurasi.');
  const {data,error}=await supabase.rpc(name,args);
  if(error)throw Error(error.code==='PGRST202'||error.code==='42883'?'Pasang pembaruan database V7.5 sebelum menggunakan fitur ini.':error.message);
  if(!data)throw Error('Hasil operasi belum dapat diverifikasi. Coba lagi dengan pilihan yang sama.');
  return data;
}
export async function manageItems(op:ManagementOperation):Promise<{count:number;cleanup_queued:boolean}>{
  return rpc('qr_manage_items_v75',{p_request_id:op.id,p_action:op.action,p_items:op.items});
}
export type ScheduleOperation={id:string;bookId:string;action:'schedule'|'pause'|'resume'|'reschedule';items:{episode_id:string;release_at:string|null;expected_release_at:string|null;expected_enabled:boolean}[];weekdays?:number[];time?:string};
export function scheduleOperation(bookId:string,action:ScheduleOperation['action'],episodes:Episode[],plan:PlannedRelease[]=[],weekdays?:number[],time?:string):ScheduleOperation {
  const targets=action==='pause'?episodes:plan.map(p=>episodes.find(e=>e.id===p.episode_id)!);
  if(targets.some(e=>!e))throw Error('Daftar bab berubah. Muat ulang jadwal.');
  return {id:crypto.randomUUID(),bookId,action,weekdays,time,items:targets.map(e=>({episode_id:e.id,release_at:action==='pause'?null:plan.find(p=>p.episode_id===e.id)!.release_at,expected_release_at:e.release_at,expected_enabled:e.is_enabled}))};
}
export async function changeSchedule(op:ScheduleOperation):Promise<{count:number}>{return rpc('qr_schedule_change_v75',{p_request_id:op.id,p_book_id:op.bookId,p_action:op.action,p_items:op.items,p_weekdays:op.weekdays??null,p_time:op.time??null});}
export async function pausedEpisodes(bookId:string):Promise<string[]>{return rpc('qr_paused_episodes_v75',{p_book_id:bookId});}
