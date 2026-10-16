/** Server/operator tool. Default is a dry run; never embed its key in Vite. */
import {createClient} from '@supabase/supabase-js';
const apply=process.argv.includes('--apply');
const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!key)throw Error('Set SUPABASE_URL dan SUPABASE_SECRET_KEY pada lingkungan operator. Jalankan tanpa --apply untuk inventaris saja.');
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const cutoff=new Date(Date.now()-7*86400000).toISOString();
const check=({data,error})=>{if(error)throw error;return data;};
const assets=check(await db.from('qr_cover_assets').select('id,book_id,status,created_at').in('status',['pending','abandoned']).lt('created_at',cutoff).limit(200));
const attempts=check(await db.from('qr_cover_publications').select('id,book_id,asset_id,created_at').is('result',null).lt('created_at',cutoff).limit(200));
console.log(JSON.stringify({mode:apply?'apply':'dry-run',cutoff,expiredUploads:assets,uncommittedPublications:attempts},null,2));
if(!apply)process.exit(0);
const validBook=s=>/^[a-z0-9][a-z0-9_-]{0,95}$/i.test(s),validId=s=>/^[a-f0-9-]{36}$/i.test(s);
async function removePrefix(bucket,book,id){
 if(!validBook(book)||!validId(id))throw Error('Identitas tidak aman; dihentikan.');
 const prefix=`${book}/${id}`;
 const files=check(await db.storage.from(bucket).list(prefix,{limit:1000}));if(files.length>=1000)throw Error('Jumlah objek tidak wajar; dihentikan.');
 if(files.some(f=>!f.id||!/^(?:original\.(?:jpg|png|webp)|normalized\.png|card-\d+\.webp|detail\.webp)$/.test(f.name)))throw Error('Objek tak dikenal ditemukan; tidak dihapus.');
 if(files.length)check(await db.storage.from(bucket).remove(files.map(f=>`${prefix}/${f.name}`)));
}
for(const asset of assets){
 const referenced=check(await db.from('qr_book_covers').select('book_id').eq('asset_id',asset.id).limit(1));
 const committed=check(await db.from('qr_cover_publications').select('id').eq('asset_id',asset.id).not('result','is',null).limit(1));
 if(referenced.length||committed.length)continue;
 // Stale pending assets cannot obtain a processing lease after two days. Mark before deletion.
 const claimed=check(await db.from('qr_cover_assets').update({status:'abandoned'}).eq('id',asset.id).in('status',['pending','abandoned']).lt('created_at',cutoff).or(`lease_until.is.null,lease_until.lt.${new Date().toISOString()}`).select('id'));
 if(!claimed.length)continue;
 await removePrefix('story-covers-v73-private',asset.book_id,asset.id);
 check(await db.from('qr_cover_assets').delete().eq('id',asset.id).eq('status','abandoned'));
 console.log(`Removed expired private upload ${asset.id}`);
}
for(const attempt of attempts){
 // UPDATE competes with the final commit row lock: a committed request is never claimed.
 const claimed=check(await db.from('qr_cover_publications').update({abandoned:true}).eq('id',attempt.id).is('result',null).select('id'));
 if(!claimed.length)continue;
 await removePrefix('story-covers-v73',attempt.book_id,attempt.id);
 // Keep a tombstone: that request ID cannot restart after its copies were removed.
 console.log(`Removed uncommitted public copies ${attempt.id}`);
}
console.log('Pembersihan selesai. Versi siap, sampul aktif, dan riwayat publikasi tersimpan tetap dipertahankan.');
