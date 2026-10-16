import {supabase} from '../../data/supabase';
import type {Episode} from '../../data/library';
import {EditorConflict,type SaveOperation} from './session';
export type Revision={id:string;captured_at:string;source_updated_at:string;source_version:number;reason:string;title:string;arc_title:string;content_bytes:number;content_hash:string;content_md?:string};
function check(error:{code?:string;message:string}|null){
 if(!error)return;
 if(error.code==='40001')throw new EditorConflict(error.message);
 if(error.code==='PGRST202'||error.code==='42883')throw Error('Riwayat revisi belum aktif di server. Pasang migrasi V7.4 lalu muat ulang Studio.');
 throw Error(error.message);
}
export async function saveEpisode(id:string,op:SaveOperation):Promise<Episode>{
 if(!supabase)throw Error('Supabase belum dikonfigurasi.');
 const {data,error}=await supabase.rpc('qr_episode_save_v74',{p_episode_id:id,p_request_id:op.id,p_expected_version:op.expected,p_document:op.document,p_reason:op.reason});check(error);
 if(!data||!Number.isSafeInteger(data.editor_version))throw Error('Respons simpan tidak lengkap; coba simpan lagi.');return data as Episode;
}
export async function listRevisions(id:string):Promise<Revision[]>{
 if(!supabase)throw Error('Supabase belum dikonfigurasi.');
 const {data,error}=await supabase.rpc('qr_episode_revisions_v74',{p_episode_id:id});check(error);return data??[];
}
export async function readRevision(id:string,revision:string):Promise<Revision>{
 if(!supabase)throw Error('Supabase belum dikonfigurasi.');
 const {data,error}=await supabase.rpc('qr_episode_revision_v74',{p_episode_id:id,p_revision_id:revision});check(error);return data;
}
