import {supabase} from './supabase';
export type BulkPublishResult = {book_id:string;book_title:string;published_count:number;completed:boolean};
/** Only execute after author confirms the exact preview count. SQL re-checks the count
 *  under row locks to avoid publishing a newer draft that was not reviewed. */
export async function bulkPublishDrafts(bookId:string,expectedDrafts:number,markCompleted:boolean):Promise<BulkPublishResult> {
  if(!supabase)throw Error('Supabase belum dikonfigurasi.');
  if(!/^[a-z0-9][a-z0-9_-]{0,95}$/.test(bookId) || !Number.isInteger(expectedDrafts)||expectedDrafts<0)
    throw Error('Identitas novel atau jumlah draft tidak valid.');
  const {data,error}=await supabase.rpc('qr_bulk_publish_drafts',{
    p_book_id:bookId,p_expected_drafts:expectedDrafts,p_mark_completed:markCompleted,
  });
  if(error){
    if(error.code==='PGRST202'||error.code==='42883') throw Error('Migrasi Supabase V5.4 belum diterapkan. Jalankan migrasi bulk publish terlebih dahulu.');
    throw Error(error.message);
  }
  if(!data||data.book_id!==bookId||Number(data.published_count)!==expectedDrafts||Boolean(data.completed)!==markCompleted)
    throw Error('Status publikasi belum dapat diverifikasi. Muat ulang Studio sebelum mencoba lagi.');
  return data as BulkPublishResult;
}
