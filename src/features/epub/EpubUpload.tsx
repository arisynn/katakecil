import {useEffect,useRef,useState} from 'react';
import type {Book} from '../../data/library';
import {slugify} from '../../data/library';
import {supabase} from '../../data/supabase';
import {useLeaveGuard} from '../../hooks/useLeaveGuard';
import {navigate} from '../../utils/nav';
import {openEpub,type EpubMetadata} from './archive';
import {EPUB_BUCKET,epubHash,type BookEpub} from './api';

export default function EpubUpload({book,asset,initialFile,onChanged,onCancel}:{book?:Book;asset?:BookEpub|null;initialFile?:File;onChanged:()=>Promise<void>;onCancel?:()=>void}){
 const [file,setFile]=useState<File|null>(null),[metadata,setMetadata]=useState<EpubMetadata|null>(null),[title,setTitle]=useState(book?.title||''),[synopsis,setSynopsis]=useState(''),[genre,setGenre]=useState('Fiksi');
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[stage,setStage]=useState('');
 const operation=useRef<{bookId:string;path:string;sha:string}|null>(null),picking=useRef(0),mounted=useRef(true),completed=useRef(false);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;picking.current++;};},[]);
 useLeaveGuard(busy||Boolean(file),()=>completed.current||(!busy&&(!file||window.confirm('Tinggalkan EPUB yang belum disimpan?'))));
 const pick=async(next?:File)=>{
  if(!next)return;const sequence=++picking.current;completed.current=false;setBusy(true);setError('');setFile(null);setMetadata(null);setStage('Memeriksa metadata EPUB…');operation.current=null;
  try{const archive=await openEpub(next);if(sequence!==picking.current)return;setFile(next);setMetadata(archive.metadata);if(!book)setTitle(archive.metadata.title);setStage('EPUB tetap satu berkas. Tidak ada pecahan naskah yang disimpan.');}
  catch(e){if(sequence===picking.current){setError(e instanceof Error?e.message:String(e));setStage('');}}
  finally{if(sequence===picking.current)setBusy(false);}
 };
 useEffect(()=>{if(initialFile)void pick(initialFile);},[initialFile]);
 const save=async()=>{
  if(!file||!metadata||!supabase||busy)return;setBusy(true);setError('');
  try{
   if(!title.trim())throw Error('Isi judul buku.');
   // Detect missing migration before creating a book or uploading bytes.
   const ready=await supabase.from('qr_book_epubs').select('book_id').limit(1);if(ready.error)throw Error('Mode EPUB utuh belum diaktifkan di backend. Terapkan migrasi EPUB dari paket source terlebih dahulu.');
   if(!operation.current){const bookId=book?.id||`${slugify(title).slice(0,55)||'buku'}-${crypto.randomUUID().slice(0,12)}`;operation.current={bookId,path:`${bookId}/${crypto.randomUUID()}.epub`,sha:await epubHash(file)};}
   const op=operation.current;
   if(!book){
    const existing=await supabase.from('qr_books').select('id').eq('id',op.bookId).maybeSingle();if(existing.error)throw existing.error;
    if(!existing.data){const inserted=await supabase.from('qr_books').insert({id:op.bookId,slug:op.bookId,title:title.trim(),synopsis:synopsis.trim(),genre:genre.trim()||'Fiksi',status:'ongoing',is_published:false,is_featured:false});if(inserted.error)throw inserted.error;}
   }
   setStage('Mengunggah berkas EPUB asli…');
   // Recovery after a lost response uses the same immutable path. Never overwrite.
   const uploaded=await supabase.storage.from(EPUB_BUCKET).upload(op.path,file,{contentType:'application/epub+zip',upsert:false,cacheControl:'0'});
   if(uploaded.error){const check=await supabase.storage.from(EPUB_BUCKET).download(op.path);if(check.error||!check.data||await epubHash(check.data)!==op.sha)throw uploaded.error;}
   const row:BookEpub={book_id:op.bookId,object_path:op.path,sha256:op.sha,file_name:file.name.slice(0,200),byte_size:file.size,toc:metadata.toc,creator:metadata.creator,language:metadata.language};
   setStage('Menyimpan buku EPUB privat…');
   const result=await supabase.rpc('qr_save_epub',{p_file:row,p_expected_path:asset?.object_path||null});if(result.error)throw result.error;
   completed.current=true;setFile(null);setMetadata(null);setStage('EPUB utuh tersimpan privat. Atur penerbitan tiap episode di halaman buku.');await onChanged();navigate(`/studio/cerita/${op.bookId}`);
  }catch(e){setError(e instanceof Error?e.message:typeof e==='object'&&e&&'message'in e?String(e.message):String(e));}
  finally{if(mounted.current)setBusy(false);}
 };
 return <section className="studio-panel epub-upload" aria-label="Unggah EPUB utuh"><div className="studio-panel-top"><h2>{asset?'Ganti EPUB utuh':'Buku EPUB utuh'}</h2>{onCancel&&<button disabled={busy} type="button" className="studio-light-button" onClick={()=>{if(!file||window.confirm('Batalkan EPUB ini?'))onCancel();}}>Kembali</button>}</div>
  <p>Satu berkas asli. Tiap bagian daftar isi dapat diterbitkan sendiri tanpa menyimpan pecahan naskah.</p>
  <label className="studio-label">Berkas EPUB · maksimal 18 MB<input type="file" name="epub" accept=".epub,application/epub+zip" disabled={busy} onChange={event=>{void pick(event.target.files?.[0]);event.target.value='';}}/></label>
  {error&&<p role="alert" className="studio-error">{error}</p>}{stage&&<p role="status">{stage}</p>}
  {metadata&&<><div className="epub-file-summary"><strong>{file?.name}</strong><span>{((file?.size||0)/1_000_000).toFixed(1)} MB · {metadata.toc.length} bagian untuk penerbitan</span></div>{!book&&<div className="epub-metadata-fields"><label className="studio-label">Judul buku<input maxLength={180} value={title} onChange={e=>setTitle(e.target.value)} disabled={busy}/></label><label className="studio-label">Genre<input maxLength={70} value={genre} onChange={e=>setGenre(e.target.value)} disabled={busy}/></label><label className="studio-label">Sinopsis<textarea maxLength={10000} value={synopsis} onChange={e=>setSynopsis(e.target.value)} disabled={busy}/></label></div>}
   <details><summary>Daftar isi · {metadata.toc.length}</summary><ol className="epub-upload-toc">{metadata.toc.map((item,index)=><li key={index}>{item.title}</li>)}</ol></details><p className="studio-muted">Semua episode mulai sebagai draf. Sampul dan penerbitan diatur setelah penyimpanan.{asset?' Mengganti EPUB mereset daftar episode dan jadwalnya menjadi draf; file asli sebelumnya tetap privat.':''}</p><button type="button" className="studio-primary" disabled={busy||!title.trim()} onClick={()=>{if(!asset||window.confirm('Ganti EPUB dan reset semua metadata episode serta jadwal menjadi draf?'))void save();}}>{busy?'Menyimpan…':asset?'Simpan EPUB pengganti privat':'Simpan EPUB utuh privat'}</button></>}
 </section>;
}
