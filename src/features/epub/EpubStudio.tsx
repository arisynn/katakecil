import {lazy,Suspense,useEffect,useMemo,useState} from 'react';
import type {Book} from '../../data/library';
import {supabase} from '../../data/supabase';
import {useLeaveGuard} from '../../hooks/useLeaveGuard';
import {getEpubReleases,type BookEpub,type EpubRelease} from './api';
import EpubUpload from './EpubUpload';
import {createEpubPreviewSource} from './readerSource';
const SecureReaderApp=lazy(()=>import('../../SecureReaderApp'));
const errorText=(e:unknown)=>e instanceof Error?e.message:e&&typeof e==='object'&&'message'in e?String(e.message):String(e);
function ReleaseRow({release,onSaved}:{release:EpubRelease;onSaved:()=>Promise<void>}){
 const originalMode=!release.is_enabled||!release.release_at?'draft':Date.parse(release.release_at)>Date.now()?'schedule':'now';
 const originalWhen=release.release_at?new Date(Date.parse(release.release_at)+7*3600000).toISOString().slice(0,16):'';
 const [mode,setMode]=useState<'draft'|'now'|'schedule'>(!release.is_enabled||!release.release_at?'draft':Date.parse(release.release_at)>Date.now()?'schedule':'now');
 const [when,setWhen]=useState(()=>release.release_at?new Date(Date.parse(release.release_at)+7*3600000).toISOString().slice(0,16):''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const dirty=mode!==originalMode||mode==='schedule'&&when!==originalWhen;
 useLeaveGuard(busy||dirty,()=>!busy&&(!dirty||window.confirm('Tinggalkan pengaturan penerbitan EPUB yang belum disimpan?')));
 const save=async()=>{
  if(!supabase||busy)return;setBusy(true);setError('');
  try{const date=mode==='draft'?null:mode==='now'?(release.is_enabled&&release.release_at&&Date.parse(release.release_at)<=Date.now()?release.release_at:new Date().toISOString()):new Date(when+'+07:00').toISOString();if(mode==='schedule'&&(!when||Date.parse(date!)<=Date.now()))throw Error('Pilih jadwal WIB di masa depan.');
   const {data,error}=await supabase.from('qr_epub_releases').update({is_enabled:mode!=='draft',release_at:date}).eq('id',release.id).select('id');if(error)throw error;if(!data?.length)throw Error('Episode telah berubah. Muat ulang.');await onSaved();
  }catch(e){setError(errorText(e));}finally{setBusy(false);}
 };
 return <div className="epub-release-row"><span className="epub-release-number">{release.episode_number}</span><strong>{release.title}</strong><div className="epub-release-controls"><select aria-label={`Status episode ${release.episode_number}`} value={mode} disabled={busy} onChange={e=>setMode(e.target.value as typeof mode)}><option value="draft">Draf</option><option value="now">Terbit</option><option value="schedule">Terjadwal</option></select>{mode==='schedule'&&<label>WIB<input type="datetime-local" aria-label={`Jadwal episode ${release.episode_number} WIB`} value={when} onChange={e=>setWhen(e.target.value)} disabled={busy}/></label>}<button type="button" className="studio-light-button" disabled={busy} onClick={()=>void save()}>{busy?'…':'Simpan'}</button></div>{error&&<p className="studio-error" role="alert">{error}</p>}</div>;
}
export default function EpubStudio({book,asset,onChanged}:{book:Book;asset:BookEpub;onChanged:()=>Promise<void>}){
 const [replacing,setReplacing]=useState(false),[preview,setPreview]=useState(false),[releases,setReleases]=useState<EpubRelease[]>([]),[error,setError]=useState(''),[query,setQuery]=useState(''),[limit,setLimit]=useState(50);
 const previewSource=useMemo(()=>preview?createEpubPreviewSource(asset):undefined,[preview,asset.object_path,asset.sha256]);
 const refresh=async()=>{try{setReleases(await getEpubReleases(book.id,true));setError('');}catch(e){setError(errorText(e));}};
 useEffect(()=>{void refresh();},[book.id,asset.object_path]);
 useEffect(()=>{if(!preview)return;const close=(event:KeyboardEvent)=>{if(event.key==='Escape'&&!event.defaultPrevented&&document.querySelector('.epub-preview .quiet-app')?.getAttribute('data-reader-view')==='reading')setPreview(false);};document.addEventListener('keydown',close);return()=>document.removeEventListener('keydown',close);},[preview]);
 if(preview)return <div className="epub-preview" role="dialog" aria-modal="true" aria-label="Pratinjau EPUB privat"><button className="epub-preview-close" onClick={()=>setPreview(false)}>Tutup pratinjau</button><Suspense fallback={<p>Menyiapkan EPUB…</p>}><SecureReaderApp bookId={book.id} bookTitle={book.title} source={previewSource} onExit={()=>setPreview(false)}/></Suspense></div>;
 const filtered=releases.filter(row=>`${row.episode_number} ${row.title}`.toLocaleLowerCase('id').includes(query.toLocaleLowerCase('id')));
 return <section className="studio-panel epub-studio"><div className="studio-panel-top"><h2>EPUB utuh · terbit per episode</h2><span>{releases.filter(row=>row.is_enabled&&row.release_at&&Date.parse(row.release_at)<=Date.now()).length} terbit</span></div><div className="epub-file-summary"><strong>{asset.file_name}</strong><span>{(asset.byte_size/1_000_000).toFixed(1)} MB · {asset.toc.length} bagian internal</span></div><p>File asli tetap privat. Atur tiap episode di bawah; pembaca hanya menerima bagian yang sudah terbit.{!book.is_published?' Buku masih privat; ubah visibilitas di Pengaturan agar episode terbit tampil di Library.':''}</p>
  {error&&<p className="studio-error" role="alert">{error} <button onClick={()=>void refresh()}>Coba lagi</button></p>}<div className="writer-action-row"><button className="studio-primary" onClick={()=>setPreview(true)}>Pratinjau EPUB privat</button><button className="studio-light-button" onClick={()=>setReplacing(value=>!value)}>{replacing?'Batal ganti':'Ganti berkas'}</button></div>
  {replacing&&<EpubUpload book={book} asset={asset} onChanged={async()=>{setReplacing(false);await onChanged();await refresh();}}/>}
  <div className="epub-release-heading"><h3>Penerbitan episode</h3><label><input type="search" aria-label="Cari bagian EPUB" placeholder="Cari bagian…" value={query} onChange={e=>{setQuery(e.target.value);setLimit(50);}}/></label></div>
  <div className="epub-release-list">{filtered.slice(0,limit).map(release=><ReleaseRow key={release.id+release.is_enabled+release.release_at} release={release} onSaved={async()=>{await refresh();}}/>)}</div>{filtered.length>limit&&<button className="studio-light-button" onClick={()=>setLimit(n=>n+50)}>Bagian berikutnya</button>}
 </section>;
}
