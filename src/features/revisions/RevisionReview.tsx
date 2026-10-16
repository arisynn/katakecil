import {useEffect,useMemo,useRef,useState} from 'react';
import BrandIcon from '../../components/BrandIcon';
import {getAuthorEpisode,formatWib,type Episode} from '../../data/library';
import {listRevisions,readRevision,type Revision} from './api';
import {manuscriptOf,suggestMerge,type Manuscript,type SaveReason} from './session';
import {diffLines} from './diff';
type Props={mode:'history'|'conflict';episodeId:string;base:Manuscript;local:Manuscript;
 onApply:(doc:Manuscript,reason:SaveReason,server:Episode)=>Promise<void>;
 onCheckpoint:()=>Promise<void>;onClose:()=>void;};
const reasonLabel=(s:string)=>({automatic:'Otomatis',checkpoint:'Checkpoint',restore:'Sebelum pemulihan',resolve:'Sebelum penyelesaian konflik'}[s]||s);
function FullText({label,doc}:{label:string;doc:Manuscript}){
 const [open,setOpen]=useState(false);
 return <details onToggle={e=>setOpen(e.currentTarget.open)}><summary>{label}</summary>{open&&<div className="kk-revision-full"><strong>{doc.title||'Tanpa judul'}</strong><small>{doc.arc||'Tanpa arc'}</small><pre>{doc.body||'(Kosong)'}</pre></div>}</details>;
}
function DiffView({before,after}:{before:string;after:string}){
 const lines=useMemo(()=>diffLines(before,after),[before,after]);
 const changes=lines.filter(l=>l.kind!=='equal'),visible=changes.slice(0,120);
 const unit=lines.some(l=>l.block)?'blok':'baris';
 return <section className="kk-revision-diff" aria-label="Perbedaan isi">
  <p>{changes.length?`${lines.filter(l=>l.kind==='remove').length} ${unit} dihapus · ${lines.filter(l=>l.kind==='add').length} ${unit} ditambahkan`:'Isi sama dengan versi server.'}</p>
  {visible.length>0&&<div className="kk-revision-lines">{visible.map((l,i)=><div key={i} data-change={l.kind}><span>{l.kind==='remove'?'−':'+'}</span><pre>{l.text.slice(0,4000)||' '}{l.text.length>4000?'…':''}</pre></div>)}</div>}
  {(changes.length>120||visible.some(l=>l.text.length>4000))&&<small>Ringkasan dibatasi 120 baris perubahan dan 4.000 karakter per baris. Seluruh isi tetap tersedia di teks lengkap dan kolom hasil tinjauan.</small>}
 </section>;
}
export default function RevisionReview({mode,episodeId,base,local,onApply,onCheckpoint,onClose}:Props){
 const dialog=useRef<HTMLDialogElement>(null),sequence=useRef(0),alive=useRef(true),initial=useRef(true),edited=useRef(false);
 const [server,setServer]=useState<Episode|null>(null),[rows,setRows]=useState<Revision[]>([]),[selected,setSelected]=useState<Revision|null>(null);
 const [result,setResult]=useState<Manuscript>(local),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[reviewed,setReviewed]=useState(false);
 useEffect(()=>{alive.current=true;const node=dialog.current;node?.showModal();return()=>{alive.current=false;sequence.current++;node?.close();};},[]);
 const reload=async()=>{
  const n=++sequence.current;setLoading(true);setError('');setSelected(null);setReviewed(false);
  try{
   const remote=await getAuthorEpisode(episodeId);const history=mode==='history'?await listRevisions(episodeId):[];
   if(!alive.current||n!==sequence.current)return;
   setServer(remote);setRows(history);if(mode==='conflict'&&initial.current)setResult(suggestMerge(base,local,manuscriptOf(remote)));initial.current=false;
  }catch(e){if(alive.current&&n===sequence.current)setError((e as Error).message);}
  finally{if(alive.current&&n===sequence.current)setLoading(false);}
 };
 useEffect(()=>{void reload();},[episodeId,mode]);
 const close=()=>{if(!busy&&(!edited.current||window.confirm('Tutup tinjauan dan buang perubahan yang belum diterapkan di panel ini?')))onClose();};
 const pick=async(row:Revision)=>{
  if(edited.current&&!window.confirm('Ganti hasil tinjauan dengan revisi lain? Perubahan di panel ini akan diganti.'))return;
  edited.current=false;
  const n=++sequence.current;setLoading(true);setError('');setReviewed(false);setSelected(null);
  try{const revision=await readRevision(episodeId,row.id);if(alive.current&&n===sequence.current){setSelected(revision);setResult({title:revision.title,arc:revision.arc_title,body:revision.content_md??''});}}
  catch(e){if(alive.current&&n===sequence.current)setError((e as Error).message);}
  finally{if(alive.current&&n===sequence.current)setLoading(false);}
 };
 const apply=async()=>{
  if(!server||!reviewed)return;
  if(!window.confirm(mode==='history'?'Pulihkan hasil tinjauan ini? Versi server sebelumnya disimpan dalam riwayat. Status dan jadwal rilis tetap berlaku.':'Simpan hasil tinjauan konflik ini? Versi server sebelumnya disimpan dalam riwayat.'))return;
  setBusy(true);setError('');
  try{await onApply(result,mode==='history'?'restore':'resolve',server);onClose();}
  catch(e){if(alive.current){setError((e as Error).message);setReviewed(false);}}
  finally{if(alive.current)setBusy(false);}
 };
 const checkpoint=async()=>{setBusy(true);setError('');try{await onCheckpoint();await reload();}catch(e){if(alive.current)setError((e as Error).message);}finally{if(alive.current)setBusy(false);}};
 return <dialog ref={dialog} className="kk-revision-dialog" aria-labelledby="kk-revision-title" onCancel={e=>{e.preventDefault();close();}}>
  <header><div><span className="studio-kicker">PRIVAT · TERSIMPAN DI SERVER</span><h2 id="kk-revision-title">{mode==='history'?'Riwayat revisi':'Tinjau konflik bab'}</h2></div><button type="button" className="v69-icon-button" aria-label="Tutup riwayat dan konflik" disabled={busy} onClick={close}><BrandIcon name="close" size={20}/></button></header>
  <p>{mode==='history'?'Maksimal 30 revisi per bab. Titik otomatis sekitar setiap 5 menit ketika isi berubah; checkpoint dapat dibuat kapan saja. Revisi tertua digantikan saat batas tercapai.':'Bab berubah di tab lain. Bandingkan versi dasar, server, dan perubahanmu. Usulan hanya mengambil perubahan server untuk bidang yang belum kamu ubah; isi yang bertabrakan perlu digabungkan sendiri.'}</p>
  {error&&<p role="alert" className="studio-error">{error}</p>}
  <div className="kk-revision-tools"><button className="studio-light-button" type="button" disabled={busy||loading} onClick={()=>void reload()}><BrandIcon name="refresh" size={16}/> Muat ulang versi server</button>{mode==='history'&&<button className="studio-light-button" type="button" disabled={busy||loading} onClick={()=>void checkpoint()}><BrandIcon name="save" size={16}/> Buat checkpoint</button>}</div>
  {loading&&<p role="status">Memuat revisi…</p>}
  {server&&<p className="kk-revision-server">Server: versi {server.editor_version??0} · {formatWib(server.updated_at)}</p>}
  {mode==='history'&&<ul className="kk-revision-list" aria-label="Daftar revisi">{rows.map(row=><li key={row.id}><button type="button" disabled={busy||loading} aria-pressed={selected?.id===row.id} onClick={()=>void pick(row)}><strong>{row.title||'Tanpa judul'}</strong><span>{formatWib(row.captured_at)} · {reasonLabel(row.reason)} · {(row.content_bytes/1024).toFixed(1)} KB</span></button></li>)}</ul>}
  {!loading&&mode==='history'&&!rows.length&&!error&&<p>Belum ada revisi. Buat checkpoint untuk menyimpan titik pemulihan pertama.</p>}
  {server&&(mode==='conflict'||selected)&&<fieldset disabled={busy||loading} className="kk-revision-review">
   <div className="kk-revision-sources">{mode==='conflict'&&<><FullText label="Versi dasar editor" doc={base}/><FullText label="Perubahan lokalmu" doc={local}/></>}<FullText label="Versi server lengkap" doc={manuscriptOf(server)}/>{selected&&<FullText label="Revisi yang dipilih" doc={{title:selected.title,arc:selected.arc_title,body:selected.content_md??''}}/>}</div>
   <h3>Hasil tinjauan</h3>
   {mode==='conflict'&&<div className="kk-revision-tools"><button type="button" className="studio-light-button" onClick={()=>{edited.current=true;setResult({...local});setReviewed(false);}}>Pakai perubahan lokal</button><button type="button" className="studio-light-button" onClick={()=>{edited.current=true;setResult(manuscriptOf(server));setReviewed(false);}}>Pakai versi server</button></div>}
   <label>Judul hasil tinjauan<input aria-label="Judul hasil tinjauan" maxLength={180} value={result.title} onChange={e=>{edited.current=true;setResult({...result,title:e.target.value});setReviewed(false);}}/></label>
   <label>Arc hasil tinjauan<input aria-label="Arc hasil tinjauan" maxLength={180} value={result.arc} onChange={e=>{edited.current=true;setResult({...result,arc:e.target.value});setReviewed(false);}}/></label>
   <label>Isi hasil tinjauan<textarea aria-label="Isi hasil tinjauan" value={result.body} onChange={e=>{edited.current=true;setResult({...result,body:e.target.value});setReviewed(false);}}/></label>
   <DiffView before={server.content_md} after={result.body}/>
   {server.title!==result.title&&<p>Judul: <del>{server.title}</del> → <ins>{result.title||'(Judul otomatis)'}</ins></p>}
   {server.arc_title!==result.arc&&<p>Arc: <del>{server.arc_title||'(Kosong)'}</del> → <ins>{result.arc||'(Kosong)'}</ins></p>}
   <label className="kk-revision-confirm"><input type="checkbox" checked={reviewed} onChange={e=>setReviewed(e.target.checked)}/> Saya sudah meninjau hasil ini</label>
   <p>Status publikasi dan jadwal tidak diubah. Jika bab sudah terbit, hasil yang disimpan langsung terlihat oleh pembaca.</p>
   <button type="button" className="studio-primary" disabled={!reviewed||busy||loading} onClick={()=>void apply()}><BrandIcon name="restore" size={17}/>{busy?'Menyimpan…':mode==='history'?'Pulihkan hasil tinjauan':'Simpan hasil tinjauan'}</button>
  </fieldset>}
 </dialog>;
}
