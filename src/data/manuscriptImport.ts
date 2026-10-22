import {supabase} from './supabase';
export type ImportReceipt={request_id:string;book_id:string;batch_id:string;imported_count:number;sections_count:number;publication_mode?:string};
export async function importStatus(id:string):Promise<ImportReceipt|null>{
  if(!supabase)throw Error('Supabase belum dikonfigurasi.');
  const {data,error}=await supabase.rpc('qr_import_status_v72',{p_request_id:id});if(error)throw Error(error.message);return data as ImportReceipt|null;
}
export class ImportRejected extends Error {}
export async function commitImport(id:string,payload:Record<string,unknown>):Promise<ImportReceipt>{
  if(!supabase)throw Error('Supabase belum dikonfigurasi.');
  const {data,error}=await supabase.rpc('qr_import_manuscript_v72',{p_request_id:id,p_payload:payload});
  if(error){if(error.code==='PGRST202'||error.code==='42883')throw new ImportRejected('Impor V7.2 belum aktif. Terapkan migrasi V7.2 terlebih dahulu.');if(error.code)throw new ImportRejected(error.message);throw Error(error.message);}
  if(!data||data.request_id!==id||!data.batch_id)throw Error('Respons penyimpanan belum dapat diverifikasi. Periksa status operasi.');
  return data as ImportReceipt;
}
export const pendingImportKey='kk-pending-import-operation-v72';
export function rememberOperation(id:string){try{sessionStorage.setItem(pendingImportKey,id);}catch{}}
export function forgetOperation(){try{sessionStorage.removeItem(pendingImportKey);}catch{}}
export function pendingOperation(){try{const id=sessionStorage.getItem(pendingImportKey);return id&&/^[a-f0-9-]{36}$/i.test(id)?id:null;}catch{return null;}}

export async function commitPublishingImport(id:string,payload:Record<string,unknown>):Promise<ImportReceipt>{
  if(!supabase)throw Error('Supabase belum dikonfigurasi.');
  const {data,error}=await supabase.rpc('qr_import_manuscript_v75',{p_request_id:id,p_payload:payload});
  if(error){if(error.code==='PGRST202'||error.code==='42883')throw new ImportRejected('Pasang pembaruan database V7.5 untuk penerbitan langsung dari impor.');if(error.code)throw new ImportRejected(error.message);throw Error(error.message);}
  if(!data||data.request_id!==id||!data.batch_id)throw Error('Respons penyimpanan belum dapat diverifikasi. Periksa status operasi.');
  return data as ImportReceipt;
}
