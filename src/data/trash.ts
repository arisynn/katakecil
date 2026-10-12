import {supabase} from './supabase';
export type TrashRecord={id:string;title:string;deleted_at:string;book_id?:string;episode_number?:number};
export type TrashIndex={books:TrashRecord[];episodes:TrashRecord[];sections:TrashRecord[]};
export async function loadTrash():Promise<TrashIndex>{
 if(!supabase)throw Error('Supabase belum dikonfigurasi.');
 const {data,error}=await supabase.rpc('qr_get_trash');
 if(error)throw error;
 return {books:Array.isArray(data?.books)?data.books:[],episodes:Array.isArray(data?.episodes)?data.episodes:[],sections:Array.isArray(data?.sections)?data.sections:[]};
}
export async function trashItem(kind:'book'|'episode'|'section',id:string){
 if(!supabase)throw Error('Supabase belum dikonfigurasi.');
 const {error}=await supabase.rpc('qr_trash_item',{p_kind:kind,p_id:id});
 if(error)throw error;
}
export async function restoreItem(kind:'book'|'episode'|'section',id:string){
 if(!supabase)throw Error('Supabase belum dikonfigurasi.');
 const {error}=await supabase.rpc('qr_restore_item',{p_kind:kind,p_id:id});
 if(error)throw error;
}
