/** Operator-only cleanup. Dry-run by default; secret keys never belong in Vite. */
import {createClient} from '@supabase/supabase-js';
import {pathToFileURL} from 'node:url';
const check=({data,error})=>{if(error)throw Error(error.message);return data;};
export async function cleanupDeletedCovers(db,{apply=false,report=console.log}={}){
 const jobs=check(await db.rpc('qr_deleted_cover_cleanup_v75'));
 for(const job of jobs){
  const id=job.book_id;if(!/^[a-z0-9][a-z0-9_-]{0,95}$/i.test(id))throw Error('Identitas novel tidak aman.');
  const live=check(await db.from('qr_books').select('id').eq('id',id).limit(1));
  if(live.length)throw Error('Novel masih ada; berkas tidak dihapus.');
  let count=0;
  for(const bucket of ['story-covers-v73-private','story-covers-v73','story-covers-private','story-covers']){
   // Traverse only the exact book directory. Pagination handles more than 100 folders/files.
   const storage=db.storage.from(bucket),paths=[];
   async function walk(prefix,depth){
    if(depth>3)throw Error('Struktur sampul tidak dikenal; pembersihan dihentikan.');
    for(let offset=0;;offset+=100){
     const response=await storage.list(prefix,{limit:100,offset,sortBy:{column:'name',order:'asc'}});
     if(response.error&&/bucket.*not found/i.test(response.error.message))return;
     const rows=check(response)||[];
     for(const row of rows){
      if(!row.name||row.name==='.'||row.name==='..'||/[\/\\]/.test(row.name))throw Error('Nama objek tidak aman.');
      const path=`${prefix}/${row.name}`;
      if(row.id)paths.push(path);else await walk(path,depth+1);
     }
     if(rows.length<100)break;
    }
   }
   await walk(id,0);
   count+=paths.length;
   report(JSON.stringify({mode:apply?'apply':'dry-run',book:id,bucket,objects:paths.length}));
   if(apply)for(let i=0;i<paths.length;i+=100)check(await storage.remove(paths.slice(i,i+100)));
  }
  // Mark complete only after every bucket succeeds. A failed run can be retried safely.
  if(apply)check(await db.rpc('qr_deleted_cover_cleanup_v75',{p_done:id}));
  report(JSON.stringify({book:id,objects:count,completed:apply}));
 }
 return jobs.length;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)throw Error('Isi SUPABASE_URL dan SUPABASE_SECRET_KEY di lingkungan operator.');
 const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 await cleanupDeletedCovers(db,{apply:process.argv.includes('--apply')});
}
