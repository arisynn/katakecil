import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { ArrowLeft, ArrowRight, BookOpen, CalendarDays, Check, ChevronRight, CircleAlert, Clock3, CloudUpload, FilePenLine, FilePlus2, Feather, FolderOpen, House, ImagePlus, LayoutDashboard, Library, LockKeyhole, LogOut, Menu, Plus, Save, Send, Settings2, ShieldCheck, Smartphone, Trash2, UploadCloud, Database, X } from 'lucide-react';
import ReaderApp from '../ReaderApp';
import { Cover } from '../components/Cover';
import { formatWib, getStudioLibrary, episodeStatus, slugify, type Book, type Episode } from '../data/library';
import { isConfigured, supabase } from '../data/supabase';
import { navigate } from '../utils/nav';
import { DatabaseManager, ScheduleManager } from './StudioManagement';
import ManuscriptImporter from './ManuscriptImporter';
import { toWibInput } from '../utils/releasePlanning';

const BOOK_STATUS: Record<Book['status'], string>={ongoing:'Berlangsung', completed:'Tamat', hiatus:'Jeda'};
function B({children,to,className='',disabled=false}:{children:React.ReactNode;to?:string;className?:string;disabled?:boolean}){
 return <button disabled={disabled} className={className} onClick={()=>to&&navigate(to)}>{children}</button>;
}
const errMsg = (e:unknown)=>e instanceof Error?e.message:String(e);
function Busy({text='Memuat Studio...'}:{text?:string}){return <div className="studio-busy"><div className="loading-orb"/><p>{text}</p></div>;}
function Login({onSuccess}:{onSuccess:()=>void}){
  const [email,setEmail]=useState('');const [password,setPassword]=useState('');const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  const submit=async(e:React.FormEvent)=>{e.preventDefault();if(!supabase)return;setBusy(true);setError('');try{const {error}=await supabase.auth.signInWithPassword({email,password});if(error)throw error;onSuccess();}catch(e){setError(errMsg(e));}finally{setBusy(false);}};
  return <div className="studio-login-wrap"><B to="/" className="studio-backlink"><ArrowLeft size={17}/> Kembali ke perpustakaan</B><form className="studio-login" onSubmit={submit}><div className="studio-login-icon"><Feather size={29}/></div><span className="studio-kicker">RUANG PRIBADI PENULIS</span><h1>Selamat datang<br/><i>di Studio.</i></h1><p>Masuk untuk menulis, menyimpan draft, dan mengatur penerbitan ceritamu.</p>
   <label>Email<input type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="email@contoh.com"/></label><label>Kata sandi<input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••"/></label>
   {error&&<div className="studio-error" role="alert">{error}</div>}<button className="studio-primary" disabled={busy} type="submit">{busy?'Masuk…':'Masuk ke Studio'} <ArrowRight size={17}/></button><small><LockKeyhole size={13}/> Hanya akun penulis yang diizinkan.</small></form></div>;
}
function Nav({path}:{path:string}) {
 const [menu,setMenu]=useState(false);
 const tabs=[{p:'/studio',label:'Beranda',icon:House},{p:'/studio/cerita',label:'Karya',icon:Library},{p:'/studio/impor',label:'Impor',icon:UploadCloud},{p:'/studio/jadwal',label:'Jadwal',icon:CalendarDays},{p:'/studio/database',label:'Data',icon:Database}];
 const active=(p:string)=>p==='/studio'?path===p:path.startsWith(p);
 return <><aside className={`studio-sidebar ${menu?'studio-sidebar-visible':''}`}>
  <B to="/" className="studio-logo"><span><Feather size={20}/></span>KataKecil.</B><div className="studio-sidebar-label">RUANG PENULIS</div><div className="studio-side-nav">{tabs.map(tab=><B key={tab.p} to={tab.p} className={`studio-nav-link ${active(tab.p)?'studio-nav-active':''}`}><tab.icon size={18}/>{tab.label}{active(tab.p)&&<span className="studio-nav-active-dot"/>}</B>)}</div>
  <div className="studio-sidebar-bottom"><B to="/" className="studio-nav-link"><BookOpen size={18}/>Lihat website <ArrowRight size={15}/></B></div>
 </aside><div className="studio-mobile-top"><B to="/studio" className="studio-logo"><span><Feather size={18}/></span>Studio KataKecil.</B><div className="studio-mobile-actions"><button className="studio-menu-icon" onClick={()=>void supabase?.auth.signOut()} aria-label="Keluar dari Studio"><LogOut size={20}/></button><button className="studio-menu-icon" onClick={()=>setMenu(!menu)} aria-label={menu?"Tutup navigasi":"Buka navigasi"}>{menu?<X size={20}/>:<Menu size={20}/>}</button></div></div>
  <nav className="studio-bottom-nav" aria-label="Navigasi Studio">{tabs.map(tab=><B key={tab.p} to={tab.p} className={active(tab.p)?'studio-bottom-active':''}><tab.icon size={21}/><span>{tab.label}</span></B>)}</nav>
 </>;
}
function Pill({episode}:{episode:Episode}){const status=episodeStatus(episode);return <span className={`studio-pill ${status==='Terbit'?'pill-live':status==='Terjadwal'?'pill-scheduled':'pill-draft'}`}>{status}</span>}
function Dashboard({books,episodes,user}:{books:Book[];episodes:Episode[];user:User}){
 const draft=episodes.filter(e=>episodeStatus(e)==='Draft');const live=episodes.filter(e=>episodeStatus(e)==='Terbit');const scheduled=episodes.filter(e=>episodeStatus(e)==='Terjadwal').sort((a,b)=>new Date(a.release_at!).getTime()-new Date(b.release_at!).getTime());
 const recent=draft.sort((a,b)=>new Date(b.updated_at).getTime()-new Date(a.updated_at).getTime())[0];const recentBook=books.find(b=>b.id===recent?.book_id);
 return <><div className="studio-page-head"><span className="studio-kicker">STUDIO PENULIS</span><h1>Halo, <i>penulis.</i></h1><p>Semua ceritamu, dalam satu ruang yang tenang.</p></div>
 <div className="studio-stats"><div><strong>{books.length.toString().padStart(2,'0')}</strong><span>Novel</span><Library size={19}/></div><div><strong>{draft.length.toString().padStart(2,'0')}</strong><span>Draft</span><FilePenLine size={19}/></div><div><strong>{live.length.toString().padStart(2,'0')}</strong><span>Terbit</span><BookOpen size={19}/></div></div>
 <div className="studio-dashboard-grid"><section className="studio-panel studio-continue"><div className="studio-panel-top"><h2>Lanjutkan menulis</h2><FilePenLine size={19}/></div>
 {recent&&recentBook?<><p className="studio-panel-eyebrow">DRAFT TERAKHIR</p><h3>Episode {recent.episode_number} — {recent.title}</h3><p className="studio-muted">{recentBook.title}</p><B to={`/studio/editor/${recent.id}`} className="studio-primary">Buka editor <ArrowRight size={18}/></B></>:<><div className="studio-panel-empty"><Feather size={27}/><p>Belum ada draft. Mulai dari ide pertamamu.</p></div><B to="/studio/impor" className="studio-primary">Impor naskah <ArrowRight size={17}/></B></>}
 </section><section className="studio-panel"><div className="studio-panel-top"><h2>Publikasi berikutnya</h2><CalendarDays size={19}/></div>
 {scheduled[0]?<><p className="studio-panel-eyebrow">TERJADWAL</p><h3>{scheduled[0].title}</h3><p className="studio-muted">{books.find(b=>b.id===scheduled[0].book_id)?.title}</p><div className="studio-date-bubble"><Clock3 size={16}/>{formatWib(scheduled[0].release_at)}</div></>:<div className="studio-panel-empty"><CalendarDays size={28}/><p>Belum ada episode yang dijadwalkan.</p></div>}
 <B to="/studio/jadwal" className="studio-light-button">Lihat jadwal <ArrowRight size={16}/></B></section></div>
 <section className="studio-panel studio-my-books"><div className="studio-panel-top"><h2>Karyamu</h2><B to="/studio/cerita" className="studio-text-button">Lihat semua <ArrowRight size={15}/></B></div>{books.length?<div className="studio-books-scroll">{books.slice(0,4).map(b=><B key={b.id} to={`/studio/cerita/${b.id}`} className="studio-book-row"><Cover book={b} size="mini"/><span className="studio-book-text"><strong>{b.title}</strong><small>{episodes.filter(e=>e.book_id===b.id).length} episode · {b.is_published?'Ditampilkan':'Privat'}</small></span><ChevronRight size={18}/></B>)}</div>:<p className="studio-muted">Belum ada karya. Buat novel baru melalui menu Karya.</p>}</section>
 <p className="studio-footnote"><ShieldCheck size={15}/> Masuk sebagai {user.email}. Naskah yang belum dirilis hanya dapat diakses penulis.</p>
 </>;
}
function Books({books,episodes,onCreate}:{books:Book[];episodes:Episode[];onCreate:()=>void}){
 return <><div className="studio-page-head studio-head-with-action"><div><span className="studio-kicker">KELOLA SEMUA KARYA</span><h1>Rak <i>ceritamu.</i></h1><p>Kelola novel, sampul, dan episode dalam satu tempat.</p></div><button onClick={onCreate} className="studio-primary"><Plus size={17}/> Novel baru</button></div>
 {books.length?<div className="studio-manage-list">{books.map(b=><B key={b.id} to={`/studio/cerita/${b.id}`} className="studio-manage-item"><Cover book={b} size="mini"/><span><strong>{b.title}</strong><small>{b.genre} · {episodes.filter(e=>e.book_id===b.id).length} episode</small><em>{b.is_published?'Tayang di perpustakaan':'Disimpan privat'} · {BOOK_STATUS[b.status]}</em></span><ChevronRight size={20}/></B>)}</div>:<div className="studio-big-empty"><Library size={30}/><h2>Sebuah dunia menunggu ditulis.</h2><p>Mulailah dengan membuat novel pertama.</p><button onClick={onCreate} className="studio-primary"><Plus size={18}/> Buat novel</button></div>}
 </>;
}
function BookForm({existing,onSaved}:{existing?:Book;onSaved:(book:Book)=>void}){
 const [title,setTitle]=useState(existing?.title||'');const [synopsis,setSynopsis]=useState(existing?.synopsis||'');const [genre,setGenre]=useState(existing?.genre||'Fiksi');const [status,setStatus]=useState<Book['status']>(existing?.status||'ongoing');const [published,setPublished]=useState(existing?.is_published||false);const [featured,setFeatured]=useState(existing?.is_featured||false);const [cover,setCover]=useState(existing?.cover_url||'');
 const [upload,setUpload]=useState<File|null>(null);const [previewUrl,setPreviewUrl]=useState('');
 useEffect(()=>{if(!upload){setPreviewUrl('');return;}const url=URL.createObjectURL(upload);setPreviewUrl(url);return()=>URL.revokeObjectURL(url);},[upload]);
 const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 const slug=existing?.slug||slugify(title);const save=async(e:React.FormEvent)=>{e.preventDefault();if(!supabase)return;setBusy(true);setError('');try{
   if(!title.trim()||!slug)throw new Error('Isi judul terlebih dahulu.');
   let cover_url=cover||null;const id=existing?.id||slug;
   if(upload){if(!['image/jpeg','image/png','image/webp'].includes(upload.type))throw new Error('Gunakan gambar JPG, PNG, atau WebP.');if(upload.size>5_242_880)throw new Error('Maksimum sampul 5 MB.');const ext=upload.type==='image/png'?'png':upload.type==='image/webp'?'webp':'jpg';const name=`${id}/${Date.now()}.${ext}`;
    const {error}=await supabase.storage.from('story-covers').upload(name,upload,{contentType:upload.type,upsert:false});if(error)throw error;cover_url=supabase.storage.from('story-covers').getPublicUrl(name).data.publicUrl;
   }
   const values={title:title.trim(),slug,id,synopsis:synopsis.trim(),genre:genre.trim()||'Fiksi',status,is_published:published,is_featured:featured,cover_url};
   const q=existing?supabase.from('qr_books').update(values).eq('id',existing.id):supabase.from('qr_books').insert(values);
   const {data,error}=await q.select().single();if(error)throw error;onSaved(data as Book);
 }catch(e){setError(errMsg(e));}finally{setBusy(false);}};
 return <form onSubmit={save} className="studio-panel studio-book-form"><h2>{existing?'Pengaturan novel':'Novel baru'}</h2><div className="studio-form-grid"><div className="studio-fieldset">
  <label className="studio-label">Judul cerita<input required maxLength={140} value={title} onChange={e=>setTitle(e.target.value)} placeholder="Judul novelmu"/></label>
  <label className="studio-label">Alamat cerita (otomatis)<input readOnly value={slug} placeholder="judul-novel"/></label>
  <label className="studio-label">Sinopsis<textarea rows={5} maxLength={2500} value={synopsis} onChange={e=>setSynopsis(e.target.value)} placeholder="Apa yang akan ditemukan pembaca di dalam cerita ini?"/></label>
  <div className="studio-form-pair"><label className="studio-label">Genre<input maxLength={70} value={genre} onChange={e=>setGenre(e.target.value)}/></label><label className="studio-label">Status cerita<select value={status} onChange={e=>setStatus(e.target.value as Book['status'])}><option value="ongoing">Berlangsung</option><option value="completed">Tamat</option><option value="hiatus">Jeda</option></select></label></div>
  <label className="studio-check"><input type="checkbox" checked={published} onChange={e=>setPublished(e.target.checked)}/><span><strong>Tampilkan novel di perpustakaan</strong><small>Episode tetap tersembunyi sampai tanggal rilisnya.</small></span></label>
  <label className="studio-check"><input type="checkbox" checked={featured} onChange={e=>setFeatured(e.target.checked)}/><span><strong>Jadikan cerita unggulan</strong><small>Prioritaskan di bagian utama beranda.</small></span></label>
 </div><div className="studio-cover-fields"><span className="studio-label-text">Sampul cerita</span><div className="studio-cover-preview"><Cover book={{id:slug||'new',title:title||'Judul ceritamu',genre,cover_url:previewUrl||cover}} size="large"/></div><label className="studio-upload"><ImagePlus size={18}/>{upload?upload.name:'Pilih sampul dari HP'}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>setUpload(e.target.files?.[0]||null)}/></label><p className="studio-small-muted">JPG, PNG, WebP · maks. 5 MB</p><label className="studio-label">Atau URL sampul<input value={cover} onChange={e=>setCover(e.target.value)} type="url" placeholder="https://..."/></label></div></div>
 {error&&<div className="studio-error" role="alert">{error}</div>}<button className="studio-primary" disabled={busy||!slug||!title.trim()} type="submit"><Save size={17}/>{busy?'Menyimpan…':existing?'Simpan perubahan':'Buat novel'}</button></form>;
}
function BookDetails({book,episodes,onNew,onUpdate}:{book:Book;episodes:Episode[];onNew:()=>void;onUpdate:(value:Book)=>void}){
 const local=episodes.filter(e=>e.book_id===book.id).sort((a,b)=>a.episode_number-b.episode_number);
 return <><B to="/studio/cerita" className="studio-backlink"><ArrowLeft size={16}/> Semua karya</B><div className="studio-page-head studio-head-with-action"><div><span className="studio-kicker">KELOLA NOVEL</span><h1>{book.title}</h1><p>{local.length} episode · {book.is_published?'Tayang di perpustakaan':'Privat'}</p></div><button onClick={onNew} className="studio-primary"><Plus size={16}/> Episode baru</button></div>
 <div className="studio-detail-tabs"><a href="#episodes">Daftar episode</a><a href="#settings">Pengaturan novel</a></div>
 <section className="studio-panel" id="episodes"><div className="studio-panel-top"><h2>Daftar episode</h2><B to={`/studio/impor?book=${encodeURIComponent(book.id)}`} className="studio-text-button"><UploadCloud size={16}/> Impor EPUB / MD</B></div>
 
 {local.length?<div className="studio-episode-stack">{local.map(ep=><B key={ep.id} to={`/studio/editor/${ep.id}`} className="studio-episode-item"><span className="studio-episode-index">{String(ep.episode_number).padStart(2,'0')}</span><span className="studio-episode-text"><strong>{ep.title}</strong><small>{ep.arc_title||'Tanpa arc'}{episodeStatus(ep)==='Terjadwal'?` · ${formatWib(ep.release_at)}`:''}</small></span><Pill episode={ep}/><ChevronRight size={17}/></B>)}</div>:<p className="studio-muted">Belum ada episode. Buat episode baru atau impor EPUB/Markdown melalui Smart Import Studio.</p>}
 <button onClick={onNew} className="studio-light-button"><FilePlus2 size={16}/> Tambah episode</button></section>
 <div id="settings"><BookForm existing={book} onSaved={onUpdate}/></div></>;
}
function Editor({ep,book,onUpdate}:{ep:Episode;book:Book;onUpdate:(value:Episode)=>void}){
 const [title,setTitle]=useState(ep.title);const [arc,setArc]=useState(ep.arc_title);const [body,setBody]=useState(ep.content_md);const [status,setStatus]=useState('Tersimpan');const [error,setError]=useState('');const [schedule,setSchedule]=useState(toWibInput(ep.release_at));const [preview,setPreview]=useState(false);const [publishing,setPublishing]=useState(false);
 const lastSaved=useRef({title:ep.title,arc:ep.arc_title,body:ep.content_md});const queue=useRef<Promise<void>>(Promise.resolve());const mounted=useRef(true);
 useEffect(()=>()=>{mounted.current=false;},[]);
 const dirty=title!==lastSaved.current.title||arc!==lastSaved.current.arc||body!==lastSaved.current.body;
 const save=useCallback(async()=>{if(!supabase)return;const snapshot={title,arc,body};if(snapshot.title===lastSaved.current.title&&snapshot.arc===lastSaved.current.arc&&snapshot.body===lastSaved.current.body)return queue.current;
  setStatus('Menyimpan…');const action=async()=>{const {data,error}=await supabase!.from('qr_episodes').update({title:snapshot.title.trim()||`Episode ${ep.episode_number}`,arc_title:snapshot.arc,content_md:snapshot.body}).eq('id',ep.id).select().single();if(error)throw error;lastSaved.current=snapshot;onUpdate(data as Episode);if(mounted.current)setStatus('Tersimpan');};
  const run=queue.current.catch(()=>{}).then(action);queue.current=run;try{await run;}catch(e){if(mounted.current){setError(errMsg(e));setStatus('Gagal menyimpan');}};
 },[title,arc,body,ep.id,ep.episode_number,onUpdate]);
 const latestSave=useRef(save);
 latestSave.current=save;
 // Flush unsaved changes when navigating away inside the SPA as well.
 useEffect(()=>()=>{void latestSave.current();},[]);
 useEffect(()=>{if(!dirty)return;const timer=setTimeout(()=>{void save();},1700);return()=>clearTimeout(timer);},[dirty,save,title,arc,body]);
 const updateRelease=async(mode:'now'|'schedule'|'draft')=>{if(!supabase)return;setPublishing(true);setError('');try{await save();await queue.current;
  let release_at:string|null=null;let is_enabled=false;
  if(mode==='now'){release_at=new Date().toISOString();is_enabled=true;}
  if(mode==='schedule'){if(!schedule)throw new Error('Pilih tanggal dan jam rilis terlebih dahulu.');const when=new Date(`${schedule}:00+07:00`);if(Number.isNaN(when.getTime())||when.getTime()<=Date.now())throw new Error('Jadwal harus di masa depan (WIB).');release_at=when.toISOString();is_enabled=true;if(ep.is_enabled&&ep.release_at&&ep.release_at!==release_at&&!window.confirm('Episode ini sudah memiliki jadwal. Yakin ingin mengganti tanggal rilis lama?'))return;}
  const {data,error}=await supabase.from('qr_episodes').update({release_at,is_enabled}).eq('id',ep.id).select().single();if(error)throw error;onUpdate(data as Episode);setStatus(mode==='now'?'Diterbitkan':mode==='schedule'?'Terjadwal':'Menjadi draft');
 }catch(e){setError(errMsg(e));}finally{setPublishing(false);}};
 const importOne=async(file?:File)=>{if(!file)return;if(file.size>2_000_000){setError('File Markdown maksimal 2 MB.');return;}setBody(await file.text());setStatus('Belum disimpan');};
 const makePreview=()=>({id:`preview-${ep.id}`,title:book.title,path:'',content:`# ${book.title}\n\n${arc?`## ${arc}\n\n`:''}### ${title||`Episode ${ep.episode_number}`}\n\n${body||'Belum ada isi episode.'}`});
 if(preview)return <ReaderApp key={`${ep.id}-preview`} bookId={`preview-${ep.id}`} bookTitle={book.title} onExit={()=>setPreview(false)} previewStory={makePreview()}/>;
 return <><B to={`/studio/cerita/${book.id}`} className="studio-backlink"><ArrowLeft size={16}/> {book.title}</B>
 <div className="studio-editor-title"><span className="studio-kicker">EPISODE {String(ep.episode_number).padStart(2,'0')}</span><h1>Tulis <i>ceritamu.</i></h1><p>{ep.arc_title||'Buat naskah senyaman mungkin.'}</p></div>
 <div className="studio-editor-layout"><section className="studio-panel studio-editor-panel"><div className="studio-editor-topline"><span><span className={`save-dot ${dirty?'save-unsaved':''}`}/>{status}</span><span><Pill episode={ep}/></span></div>
 <label className="studio-label">Judul episode<input className="studio-title-input" maxLength={180} value={title} onChange={e=>setTitle(e.target.value)} placeholder="Judul episodenya"/></label><label className="studio-label">Arc / bagian<input value={arc} onChange={e=>setArc(e.target.value)} placeholder="Opsional, mis. Arc I"/></label>
 <div className="studio-editor-toolbar"><span><FilePenLine size={16}/> Markdown</span><label><UploadCloud size={16}/> Impor .md<input type="file" accept=".md,.txt,text/markdown,text/plain" onChange={e=>{void importOne(e.target.files?.[0]);e.target.value='';}}/></label></div>
 <textarea className="studio-manuscript" aria-label="Isi episode dalam Markdown" spellCheck={true} placeholder="Mulai ceritamu di sini…" value={body} onChange={e=>setBody(e.target.value)}/>
 <div className="studio-editor-bottom"><span>{body.trim()?body.trim().split(/\s+/).length:0} kata</span><div><button onClick={()=>void save()} className="studio-light-button"><Save size={16}/> Simpan</button><button onClick={()=>setPreview(true)} className="studio-light-button"><BookOpen size={16}/> Pratinjau reader</button></div></div>
 </section><aside className="studio-panel studio-publish-panel"><div className="studio-panel-top"><h2>Publikasi</h2><Send size={19}/></div><p className="studio-muted">Status: <strong>{episodeStatus(ep)}</strong></p>
 {episodeStatus(ep)==='Terbit'&&<p className="studio-warning">Episode ini sudah publik. Perubahan isi yang disimpan akan langsung dapat dibaca.</p>}
 {!book.is_published&&<p className="studio-warning">Novel ini masih privat. Walaupun episode diterbitkan, pembaca tidak dapat membukanya sebelum novel ditampilkan.</p>}
 <label className="studio-label">Tanggal & jam rilis (WIB)<input type="datetime-local" value={schedule} onChange={e=>setSchedule(e.target.value)}/></label><button disabled={publishing||!body.trim()} onClick={()=>void updateRelease('schedule')} className="studio-light-button"><CalendarDays size={17}/> Jadwalkan</button>
 <button disabled={publishing||!body.trim()} onClick={()=>{if(window.confirm('Terbitkan episode ini sekarang? Semua pembaca dapat mengaksesnya jika novel sudah publik.'))void updateRelease('now');}} className="studio-primary"><Send size={16}/> Terbitkan sekarang</button>
 {episodeStatus(ep)!=='Draft'&&<button disabled={publishing} className="studio-danger-lite" onClick={()=>{if(window.confirm('Tarik episode ini dari publik dan jadikan draft?'))void updateRelease('draft');}}><LockKeyhole size={16}/> Tarik ke draft</button>}
 <p className="studio-publish-hint"><ShieldCheck size={15}/> Draft dan naskah terjadwal dilindungi kebijakan database.</p></aside></div>
 {error&&<div className="studio-error" role="alert">{error}</div>}
 <div className="studio-editor-mobile-actions"><button className="studio-light-button" onClick={()=>setPreview(true)}><BookOpen size={18}/> Pratinjau</button><button className="studio-primary" onClick={()=>void save()}><Save size={18}/> Simpan</button></div>
 </>;
}
function Schedule({books,episodes}:{books:Book[];episodes:Episode[]}){
 const upcoming=episodes.filter(e=>episodeStatus(e)==='Terjadwal').sort((a,b)=>new Date(a.release_at!).getTime()-new Date(b.release_at!).getTime());
 return <><div className="studio-page-head"><span className="studio-kicker">KALENDER PUBLIKASI</span><h1>Jadwal <i>terbit.</i></h1><p>Semua waktu ditampilkan dalam WIB (UTC+7).</p></div><div className="studio-panel studio-schedule"><div className="studio-panel-top"><h2>Episode berikutnya</h2><CalendarDays size={19}/></div>{upcoming.length?upcoming.map(ep=><B to={`/studio/editor/${ep.id}`} key={ep.id} className="studio-schedule-row"><div className="studio-schedule-icon"><CalendarDays size={21}/></div><div><strong>{ep.title}</strong><small>{books.find(b=>b.id===ep.book_id)?.title}</small><em>{formatWib(ep.release_at)}</em></div><ChevronRight size={18}/></B>):<div className="studio-panel-empty"><Clock3 size={32}/><p>Belum ada jadwal terbit. Buka editor episode dan pilih waktu rilis.</p></div>}</div></>;
}
export default function Studio({path}:{path:string}) {
 const [user,setUser]=useState<User|null>(null);const [authorized,setAuthorized]=useState(false);const [authLoading,setAuthLoading]=useState(true);const [books,setBooks]=useState<Book[]>([]);const [episodes,setEpisodes]=useState<Episode[]>([]);const [loading,setLoading]=useState(true);const [error,setError]=useState('');
 const refresh=useCallback(async()=>{try{const result=await getStudioLibrary();setBooks(result.books);setEpisodes(result.episodes);setError('');}catch(e){setError(errMsg(e));}finally{setLoading(false);}},[]);
 const checkAuth=useCallback(async()=>{if(!supabase){setAuthLoading(false);return;}setAuthLoading(true);try{const {data,error}=await supabase.auth.getUser();if(error||!data.user){setUser(null);setAuthorized(false);return;}setUser(data.user);
  const {data:member,error:memberErr}=await supabase.from('qr_author_members').select('user_id').eq('user_id',data.user.id).maybeSingle();if(memberErr){setError(`Gagal memeriksa izin penulis: ${memberErr.message}`);setAuthorized(false);}else{setAuthorized(Boolean(member));}
 }finally{setAuthLoading(false);}},[]);
 useEffect(()=>{void checkAuth();const {data}=supabase?.auth.onAuthStateChange(()=>{void checkAuth();})??{data:null};return()=>data?.subscription.unsubscribe();},[checkAuth]);
 useEffect(()=>{if(authorized){setLoading(true);void refresh();}},[authorized,refresh]);
 const onUpdateBook=(b:Book)=>{setBooks(prev=>[b,...prev.filter(x=>x.id!==b.id)]);navigate(`/studio/cerita/${b.id}`);};
 const onUpdateEpisode=useCallback((e:Episode)=>setEpisodes(prev=>prev.map(x=>x.id===e.id?e:x)),[]);
 const createEpisode=async(bookId:string)=>{if(!supabase)return;setError('');try{const number=episodes.filter(e=>e.book_id===bookId).reduce((a,e)=>Math.max(a,e.episode_number),0)+1;
   const {data,error}=await supabase.from('qr_episodes').insert({book_id:bookId,episode_number:number,title:`Episode ${number}`,arc_title:'',content_md:'',release_at:null,is_enabled:false}).select().single();if(error)throw error;setEpisodes(prev=>[...prev,data as Episode]);navigate(`/studio/editor/${data.id}`);
 }catch(e){setError(errMsg(e));}};
 if(!isConfigured)return <div className="studio-unavailable"><Feather size={36}/><h1>Hubungkan Studio ke Supabase</h1><p>Untuk mengaktifkan login dan publikasi, isi variabel VITE_SUPABASE_URL dan VITE_SUPABASE_PUBLISHABLE_KEY, lalu jalankan migrasi V2 dan daftarkan akun penulis.</p><B to="/" className="studio-primary">Kembali ke perpustakaan</B></div>;
 if(authLoading)return <Busy text="Memverifikasi akses penulis…"/>;
 if(!user)return <Login onSuccess={()=>void checkAuth()}/>;
 if(!authorized)return <div className="studio-unavailable"><LockKeyhole size={35}/><h1>Akun belum memiliki izin penulis</h1><p>Masuk dengan akun yang sudah terdaftar di tabel qr_author_members. Keanggotaan harus diberikan oleh admin database, bukan lewat browser.</p>{error&&<p className="studio-error">{error}</p>}<button className="studio-light-button" onClick={()=>void supabase?.auth.signOut()}>Keluar akun</button></div>;
 const sections=path.split('/').filter(Boolean);const book=sections[1]==='cerita'&&sections[2]&&sections[2]!=='baru'?books.find(b=>b.id===decodeURIComponent(sections[2])):undefined;
 const editorEpisode=sections[1]==='editor'?episodes.find(e=>e.id===sections[2]):undefined;
 return <div className="studio-app"><Nav path={path}/><div className="studio-page"><div className="studio-toolbar"><span>Ruang menulis yang tenang</span><div><span className="studio-auth-indicator"><span/>Penulis</span><button onClick={()=>void supabase?.auth.signOut()} title="Keluar" aria-label="Keluar akun"><LogOut size={18}/></button></div></div>
 <main className="studio-content">{error&&<div className="studio-error" role="alert">{error}</div>}{loading?<Busy/>:sections[1]==='impor'?<ManuscriptImporter books={books} episodes={episodes} onChanged={refresh}/>:sections[1]==='jadwal'?<ScheduleManager books={books} episodes={episodes} onChanged={refresh}/>:sections[1]==='database'?<DatabaseManager books={books} episodes={episodes} onChanged={refresh}/>:sections[1]==='editor'?(editorEpisode?<Editor key={editorEpisode.id} ep={editorEpisode} book={books.find(b=>b.id===editorEpisode.book_id)!} onUpdate={onUpdateEpisode}/>:<p>Episode tidak ditemukan.</p>):sections[1]==='cerita'&&sections[2]==='baru'?<><B className="studio-backlink" to="/studio/cerita"><ArrowLeft size={16}/> Kembali ke karya</B><BookForm onSaved={onUpdateBook}/></>:sections[1]==='cerita'&&sections[2]?(book?<BookDetails key={book.id} book={book} episodes={episodes} onNew={()=>void createEpisode(book.id)} onUpdate={onUpdateBook}/>:<p>Novel tidak ditemukan.</p>):sections[1]==='cerita'?<Books books={books} episodes={episodes} onCreate={()=>navigate('/studio/cerita/baru')}/>:<Dashboard books={books} episodes={episodes} user={user}/>}
 </main></div></div>;
}
