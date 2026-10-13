import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { ArrowLeft, ArrowRight, BookOpen, CalendarDays, Check, ChevronRight, CircleAlert, Clock3, CloudUpload, FilePenLine, FilePlus2, Feather, FolderOpen, House, ImagePlus, LayoutDashboard, Library, LockKeyhole, LogOut, Menu, Plus, Save, Send, Settings2, ShieldCheck, Smartphone, Trash2, UploadCloud, Database, X, BarChart3, BookMarked, PenTool, Bold, Italic, Heading2, List, Quote, Eye, Bell, CircleHelp } from 'lucide-react';
import ReaderApp from '../ReaderApp';
import { Cover } from '../components/Cover';
import { formatWib, getStudioLibrary, episodeStatus, slugify, type Book, type Episode } from '../data/library';
import { isConfigured, supabase } from '../data/supabase';
import { navigate } from '../utils/nav';
import { DatabaseManager, ScheduleManager } from './StudioManagement';
import ManuscriptImporter from './ManuscriptImporter';
import BookSections from './BookSections';
import TrashManager from './TrashManager';
import {trashItem} from '../data/trash';
import { toWibInput } from '../utils/releasePlanning';
import { useUiTheme, type UiTheme, type AppThemePreference } from '../hooks/useUiTheme';
import ThemeToggle from '../components/ThemeToggle';
import ThemeLoading from '../components/ThemeLoading';
import {bulkPublishDrafts} from '../data/bulkPublishing';

const BOOK_STATUS: Record<Book['status'], string>={ongoing:'Berlangsung', completed:'Tamat', hiatus:'Jeda'};
function B({children,to,className='',disabled=false}:{children:React.ReactNode;to?:string;className?:string;disabled?:boolean}){
 return <button disabled={disabled} className={className} onClick={()=>to&&navigate(to)}>{children}</button>;
}
const errMsg = (e:unknown)=>e instanceof Error?e.message:String(e);
function Busy({text='Memuat Studio...'}:{text?:string}){return <ThemeLoading context="studio" text={text}/>;}
function Login({onSuccess,theme,preference,onPreferenceChange}:{onSuccess:()=>void;theme:UiTheme;preference:AppThemePreference;onPreferenceChange:(next:AppThemePreference)=>void}){
  const [email,setEmail]=useState('');const [password,setPassword]=useState('');const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  const submit=async(e:React.FormEvent)=>{e.preventDefault();if(!supabase)return;setBusy(true);setError('');try{const {error}=await supabase.auth.signInWithPassword({email,password});if(error)throw error;onSuccess();}catch(e){setError(errMsg(e));}finally{setBusy(false);}};
  return <div className="studio-login-wrap" data-kk-theme={theme}><div className="v62-login-theme"><ThemeToggle theme={theme} preference={preference} onPreferenceChange={onPreferenceChange}/></div><B to="/" className="studio-backlink"><ArrowLeft size={17}/> Kembali ke perpustakaan</B><form className="studio-login" onSubmit={submit}><div className="studio-login-icon"><Feather size={29}/></div><span className="studio-kicker">RUANG PRIBADI PENULIS</span><h1>Selamat datang<br/><i>di Studio.</i></h1><p>Masuk untuk menulis, menyimpan draft, dan mengatur penerbitan ceritamu.</p>
   <label>Email<input type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="email@contoh.com"/></label><label>Kata sandi<input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••"/></label>
   {error&&<div className="studio-error" role="alert">{error}</div>}<button className="studio-primary" disabled={busy} type="submit">{busy?'Masuk…':'Masuk ke Studio'} <ArrowRight size={17}/></button><small><LockKeyhole size={13}/> Hanya akun penulis yang diizinkan.</small></form></div>;
}
function Nav({path,displayName,theme,preference,onPreferenceChange}:{path:string;displayName:string;theme:UiTheme;preference:AppThemePreference;onPreferenceChange:(next:AppThemePreference)=>void}) {
 const [more,setMore]=useState(false);
 const primary=[{p:'/studio',label:'Dashboard',icon:LayoutDashboard},{p:'/studio/cerita',label:'Karya',icon:Library},{p:'/studio/analytics',label:'Analytics',icon:BarChart3},{p:'/studio/settings',label:'Pengaturan',icon:Settings2}];
 const secondary=[{p:'/studio/impor',label:'Impor Naskah',icon:UploadCloud},{p:'/studio/jadwal',label:'Jadwal Terbit',icon:CalendarDays},{p:'/studio/database',label:'Database',icon:Database},{p:'/studio/sampah',label:'Sampah',icon:Trash2}];
 useEffect(()=>setMore(false),[path]);
 useEffect(()=>{if(!more)return;const onKey=(e:KeyboardEvent)=>{if(e.key==='Escape')setMore(false)};document.addEventListener('keydown',onKey);return()=>document.removeEventListener('keydown',onKey)},[more]);
 const active=(p:string)=>p==='/studio'?path===p:path.startsWith(p);
 return <><aside className="studio-sidebar v6-studio-sidebar">
  <div className="studio-logo"><span><Feather size={20}/></span><span>KataKecil<small>Studio</small></span></div>
  <div className="studio-sidebar-label">RUANG KARYA</div>
  <div className="studio-side-nav">{primary.map(tab=><B key={tab.p} to={tab.p} className={`studio-nav-link ${active(tab.p)?'studio-nav-active':''}`}><tab.icon size={18}/>{tab.label}</B>)}</div>
  <div className="studio-sidebar-label v6-sidebar-secondary">ALAT PENULIS</div>
  <div className="studio-side-nav">{secondary.map(tab=><B key={tab.p} to={tab.p} className={`studio-nav-link ${active(tab.p)?'studio-nav-active':''}`}><tab.icon size={18}/>{tab.label}</B>)}</div>
  <div className="studio-sidebar-bottom"><B to="/" className="studio-nav-link"><BookOpen size={18}/>Lihat website <ArrowRight size={15}/></B><div className="v6-studio-profile"><span>{displayName.charAt(0).toUpperCase()}</span><div><strong>{displayName}</strong><small>Pemilik Studio</small></div></div></div>
 </aside>
 <div className="studio-mobile-top"><div className="studio-logo"><span><Feather size={18}/></span><span className="kk-studio-wordmark">KataKecil <small>Studio</small></span></div><div className="studio-mobile-actions"><ThemeToggle theme={theme} preference={preference} onPreferenceChange={onPreferenceChange}/><button aria-label="Buka alat Studio" onClick={()=>setMore(v=>!v)}><Menu size={20}/></button></div></div>
 <nav className="studio-bottom-nav" aria-label="Navigasi Studio mobile">{primary.map(tab=><B key={tab.p} to={tab.p} className={active(tab.p)?'studio-bottom-active':''}><tab.icon size={20}/><span>{tab.label}</span></B>)}</nav>
 {more&&<div className="v53-more-backdrop" role="presentation" onClick={()=>setMore(false)}><section role="dialog" aria-modal="true" aria-label="Alat Studio" className="v53-more-sheet" onClick={e=>e.stopPropagation()}><div className="v53-more-head"><strong>Alat Studio</strong><button onClick={()=>setMore(false)} aria-label="Tutup menu"><X size={20}/></button></div>{secondary.map(tab=><B key={tab.p} to={tab.p} className="v53-more-link"><tab.icon size={19}/>{tab.label}<ChevronRight size={18}/></B>)}<B to="/" className="v53-more-link"><BookOpen size={19}/>Website publik<ChevronRight size={18}/></B><button className="v53-more-link" onClick={()=>void supabase?.auth.signOut()}><LogOut size={19}/>Keluar akun</button></section></div>}
 </>;
}
function Pill({episode}:{episode:Episode}){const status=episodeStatus(episode);return <span className={`studio-pill ${status==='Terbit'?'pill-live':status==='Terjadwal'?'pill-scheduled':'pill-draft'}`}>{status}</span>}
function authorName(user:User):string {
 const meta=user.user_metadata as Record<string,unknown> | undefined;
 const name=meta?.display_name||meta?.full_name||meta?.name||user.email?.split('@')[0];
 return typeof name==='string'&&name.trim()?name.trim():'Penulis';
}
function Dashboard({books,episodes,user}:{books:Book[];episodes:Episode[];user:User}){
 const draft=episodes.filter(e=>episodeStatus(e)==='Draft');
 const live=episodes.filter(e=>episodeStatus(e)==='Terbit');
 const scheduled=episodes.filter(e=>episodeStatus(e)==='Terjadwal').sort((a,b)=>new Date(a.release_at!).getTime()-new Date(b.release_at!).getTime());
 const recent=[...draft].sort((a,b)=>new Date(b.updated_at).getTime()-new Date(a.updated_at).getTime())[0];
 const recentBook=books.find(b=>b.id===recent?.book_id);
 const name=authorName(user);
 return <div className="v6-studio-dashboard">
  <div className="studio-page-head v6-dashboard-welcome"><span className="studio-kicker">DASHBOARD / RUANG KARYA</span><h1>Halo, {name} <span className="v6-wave">✦</span></h1><p>Selamat datang kembali di studio kamu.</p></div>
  <div className="studio-stats v6-studio-metrics"><div><span>Total Cerita</span><strong>{books.length}</strong><Library size={19}/></div><div><span>Total Bab</span><strong>{episodes.length}</strong><BookOpen size={19}/></div><div><span>Draft</span><strong>{draft.length}</strong><FilePenLine size={19}/></div><div><span>Bab Terbit</span><strong>{live.length}</strong><Check size={19}/></div></div>
  <div className="v6-quick-actions"><h2>Quick Actions</h2><div><B to="/studio/cerita/baru" className="v6-quick-gold"><Plus size={18}/>Cerita Baru</B><B to="/studio/impor" className="v6-quick-blue"><UploadCloud size={18}/>Impor Naskah</B><B to="/studio/jadwal" className="v6-quick-violet"><CalendarDays size={17}/>Jadwal</B></div></div>
  <section className="studio-panel studio-my-books v6-active-books"><div className="studio-panel-top"><h2>Karya Aktif</h2><B to="/studio/cerita" className="studio-text-button">Lihat Semua <ArrowRight size={15}/></B></div>{books.length?<div className="studio-books-scroll">{books.slice(0,4).map(b=><B key={b.id} to={`/studio/cerita/${b.id}`} className="studio-book-row"><Cover book={b} size="mini"/><span className="studio-book-text"><strong>{b.title}</strong><small>{episodes.filter(e=>e.book_id===b.id).length} Bab · {b.is_published?'Publik':'Privat'}</small></span><ChevronRight size={17}/></B>)}</div>:<div className="v6-studio-empty"><picture><source media="(max-width: 600px)" srcSet="/assets/v6/empty-library-mobile.webp" type="image/webp"/><img src="/assets/v6/empty-library.webp" alt="Buku terbuka di meja" loading="lazy" decoding="async"/></picture><h3>Belum ada karya di Studio</h3><p>Mulai menulis cerita pertamamu.</p><B to="/studio/cerita/baru" className="studio-primary"><Plus size={16}/>Cerita Baru</B></div>}</section>
  <div className="studio-dashboard-grid v6-studio-activity"><section className="studio-panel studio-continue"><div className="studio-panel-top"><h2>Lanjutkan Menulis</h2><FilePenLine size={18}/></div>{recent&&recentBook?<><h3>{recent.title}</h3><p className="studio-muted">{recentBook.title} · Bab {recent.episode_number}</p><B to={`/studio/editor/${recent.id}`} className="studio-primary">Buka editor <ArrowRight size={17}/></B></>:<p className="studio-muted">Tidak ada draft yang sedang dikerjakan.</p>}</section><section className="studio-panel"><div className="studio-panel-top"><h2>Publikasi Mendatang</h2><CalendarDays size={18}/></div>{scheduled[0]?<><h3>{scheduled[0].title}</h3><p className="studio-muted">{formatWib(scheduled[0].release_at)}</p></>:<p className="studio-muted">Belum ada jadwal publikasi.</p>}</section></div>
  <p className="studio-footnote"><ShieldCheck size={15}/> Studio privat · Masuk sebagai {user.email}</p>
 </div>;
}
function Analytics({books,episodes}:{books:Book[];episodes:Episode[]}){
 const published=episodes.filter(e=>episodeStatus(e)==='Terbit').length;
 const scheduled=episodes.filter(e=>episodeStatus(e)==='Terjadwal').length;
 const drafts=episodes.filter(e=>episodeStatus(e)==='Draft').length;
 return <><div className="studio-page-head"><span className="studio-kicker">DATA PUBLIKASI NYATA</span><h1>Analytics</h1><p>Ringkasan karya dan status penerbitan berdasarkan database Studio. Statistik pembaca tidak ditampilkan karena belum tersedia.</p></div><div className="studio-stats v6-studio-metrics"><div><span>Novel</span><strong>{books.length}</strong><Library size={19}/></div><div><span>Terbit</span><strong>{published}</strong><Check size={19}/></div><div><span>Terjadwal</span><strong>{scheduled}</strong><CalendarDays size={19}/></div><div><span>Draft</span><strong>{drafts}</strong><FilePenLine size={19}/></div></div><section className="studio-panel"><h2>Status per karya</h2>{books.length?books.map(book=><B key={book.id} to={`/studio/cerita/${book.id}`} className="studio-manage-item"><Cover book={book} size="mini"/><span><strong>{book.title}</strong><small>{episodes.filter(e=>e.book_id===book.id&&episodeStatus(e)==='Terbit').length} bab terbit dari {episodes.filter(e=>e.book_id===book.id).length} bab</small></span><ChevronRight size={17}/></B>):<p className="studio-muted">Belum ada data karya.</p>}</section></>;
}
function StudioSettings(){
 return <><div className="studio-page-head"><span className="studio-kicker">PREFERENSI & KEAMANAN</span><h1>Pengaturan</h1><p>Preferensi aplikasi dan informasi akses Studio.</p></div><section className="studio-panel v6-settings-panel"><h2>Tampilan</h2><p>Gunakan pemilih tema di bilah atas untuk memilih Ikuti Perangkat, Terang, atau Gelap. Tema Reader dapat diatur secara independen oleh pembaca.</p><h2>Keamanan Studio</h2><p>Hanya akun dengan keanggotaan penulis yang dapat mengakses pengelolaan cerita. Alat database dan sampah tersedia pada navigasi Studio.</p></section></>;
}
function Books({books,episodes,onCreate}:{books:Book[];episodes:Episode[];onCreate:()=>void}){
 return <><div className="studio-page-head studio-head-with-action"><div><span className="studio-kicker">KELOLA SEMUA KARYA</span><h1>Rak <i>ceritamu.</i></h1><p>Kelola novel, sampul, dan episode dalam satu tempat.</p></div>{books.length>0&&<button onClick={onCreate} className="studio-primary"><Plus size={17}/> Novel baru</button>}</div>
 {books.length?<div className="studio-manage-list">{books.map(b=><B key={b.id} to={`/studio/cerita/${b.id}`} className="studio-manage-item"><Cover book={b} size="mini"/><span><strong>{b.title}</strong><small>{b.genre} · {episodes.filter(e=>e.book_id===b.id).length} episode</small><em>{b.is_published?'Tayang di perpustakaan':'Draft (privat)'} · {BOOK_STATUS[b.status]}</em></span><ChevronRight size={20}/></B>)}</div>:<div className="studio-big-empty"><Library size={30}/><h2>Sebuah dunia menunggu ditulis.</h2><p>Mulailah dengan membuat novel pertama.</p><button onClick={onCreate} className="studio-primary"><Plus size={18}/> Buat novel</button></div>}
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
function BookDetails({book,episodes,onNew,onNewZero,onUpdate,onDelete,onChanged}:{book:Book;episodes:Episode[];onNew:()=>void;onNewZero:()=>void;onUpdate:(value:Book)=>void;onDelete:()=>Promise<void>;onChanged:()=>Promise<void>}){
 const local=episodes.filter(e=>e.book_id===book.id).sort((a,b)=>a.episode_number-b.episode_number);
 const drafts=local.filter(e=>episodeStatus(e)==='Draft');
 const blankDrafts=drafts.filter(e=>!e.content_md.trim());
 const [publishing,setPublishing]=useState(false);
 const [publishError,setPublishError]=useState('');
 const [publishNotice,setPublishNotice]=useState('');
 const publish=async(markCompleted:boolean)=>{
   if(publishing)return;
   const count=drafts.length;
   const question=markCompleted
     ? `Tandai “${book.title}” sebagai TAMAT dan terbitkan ${count} episode draft sekarang?\n\nNovel akan tampil di perpustakaan. Jadwal episode yang sudah terbit/terjadwal tidak diubah. Episode terakhir diberi tanda Finale.`
     : `Terbitkan SEMUA ${count} episode draft “${book.title}” sekarang?\n\nNovel akan ditampilkan di perpustakaan. Episode yang sudah terbit/terjadwal tidak diubah.`;
   if(!window.confirm(question))return;
   setPublishing(true);setPublishError('');setPublishNotice('');
   try{
     const result=await bulkPublishDrafts(book.id,count,markCompleted);
     await onChanged();
     setPublishNotice(`${result.published_count} episode berhasil diterbitkan${markCompleted?' dan cerita ditandai Tamat':''}.`);
   }catch(e){setPublishError(errMsg(e));}
   finally{setPublishing(false);}
 };
 return <><B to="/studio/cerita" className="studio-backlink"><ArrowLeft size={16}/> Semua karya</B><div className="studio-page-head studio-head-with-action"><div><span className="studio-kicker">KELOLA NOVEL</span><h1>{book.title}</h1><p>{local.length} episode · {book.is_published?'Tayang di perpustakaan':'Draft (privat)'}</p></div><button onClick={onNew} className="studio-primary"><Plus size={16}/> Episode baru</button></div>
 <div className="studio-detail-tabs"><a href="#bulk-publish">Penerbitan cepat</a><a href="#episodes">Daftar episode</a><a href="#book-sections">Halaman buku</a><a href="#settings">Pengaturan novel</a></div>
 <section className="studio-panel kk-bulk-panel" id="bulk-publish" aria-label="Penerbitan episode sekaligus">
   <div className="studio-panel-top"><h2>Terbitkan sekaligus</h2><Send size={19}/></div>
   <p className="studio-muted">{drafts.length} draft dari {local.length} episode. Terbitkan seluruh draft novel tamat tanpa membuka editor satu per satu. Episode terjadwal tetap mengikuti jadwalnya.</p>
   {blankDrafts.length>0&&<p className="studio-warning" role="alert">Ada {blankDrafts.length} draft tanpa isi. Lengkapi semuanya sebelum terbit massal.</p>}
   {publishError&&<div className="studio-error" role="alert">{publishError}</div>}
   {publishNotice&&<div className="studio-success" role="status">{publishNotice}</div>}
   <div className="kk-bulk-actions">
     <button type="button" className="studio-light-button" disabled={publishing||!drafts.length||!!blankDrafts.length} onClick={()=>void publish(false)}><Send size={16}/> {publishing?'Menerbitkan…':`Terbitkan semua ${drafts.length} draft`}</button>
     <button type="button" className="studio-primary" disabled={publishing||!local.length||!!blankDrafts.length} onClick={()=>void publish(true)}><Check size={16}/> {publishing?'Memproses…':'Tandai Tamat & Terbitkan Draft'}</button>
   </div>
   <small className="studio-muted">Hanya setelah konfirmasi. Jika proses gagal, transaksi database membatalkan seluruh perubahan.</small>
 </section>
 <section className="studio-panel" id="episodes"><div className="studio-panel-top"><h2>Daftar episode</h2><B to={`/studio/impor?book=${encodeURIComponent(book.id)}`} className="studio-text-button"><UploadCloud size={16}/> Impor EPUB / MD</B></div>
 
 {local.length?<div className="studio-episode-stack">{local.map(ep=><B key={ep.id} to={`/studio/editor/${ep.id}`} className="studio-episode-item"><span className="studio-episode-index">{String(ep.episode_number).padStart(2,'0')}</span><span className="studio-episode-text"><strong>{ep.title}</strong><small>{ep.arc_title||'Tanpa arc'}{ep.is_finale?' · Finale':''}{episodeStatus(ep)==='Terjadwal'?` · ${formatWib(ep.release_at)}`:''}</small></span><Pill episode={ep}/><ChevronRight size={17}/></B>)}</div>:<p className="studio-muted">Belum ada episode. Buat episode baru atau impor EPUB/Markdown melalui Smart Import Studio.</p>}
 {!local.some(e=>e.episode_number===0)&&<button onClick={onNewZero} className="studio-light-button"><FilePlus2 size={16}/> Buat Episode 0</button>}</section>
 <BookSections bookId={book.id}/><div id="settings"><BookForm existing={book} onSaved={onUpdate}/></div><section className="studio-panel v5-danger-zone"><h2>Pengelolaan novel</h2><p className="studio-muted">Pindahkan novel ke Sampah (bukan hapus permanen). Novel langsung menjadi privat, sedangkan semua episode dan halaman tetap tersimpan.</p><button type="button" className="studio-danger-lite" onClick={()=>void onDelete()}><Trash2 size={16}/> Pindahkan novel ke Sampah</button></section></>;
}
function Editor({ep,book,onUpdate,onDelete}:{ep:Episode;book:Book;onUpdate:(value:Episode)=>void;onDelete:()=>Promise<void>}){
 const manuscriptRef=useRef<HTMLTextAreaElement>(null);const [title,setTitle]=useState(ep.title);const [arc,setArc]=useState(ep.arc_title);const [body,setBody]=useState(ep.content_md);const [status,setStatus]=useState('Tersimpan');const [error,setError]=useState('');const [schedule,setSchedule]=useState(toWibInput(ep.release_at));const [preview,setPreview]=useState(false);const [publishing,setPublishing]=useState(false);
 const lastSaved=useRef({title:ep.title,arc:ep.arc_title,body:ep.content_md});const queue=useRef<Promise<void>>(Promise.resolve());const mounted=useRef(true);
 useEffect(()=>()=>{mounted.current=false;},[]);
 const dirty=title!==lastSaved.current.title||arc!==lastSaved.current.arc||body!==lastSaved.current.body;
 const save=useCallback(async()=>{if(!supabase)return;const snapshot={title,arc,body};if(snapshot.title===lastSaved.current.title&&snapshot.arc===lastSaved.current.arc&&snapshot.body===lastSaved.current.body)return queue.current;
  setStatus('Menyimpan…');const action=async()=>{const {data,error}=await supabase!.from('qr_episodes').update({title:snapshot.title.trim()||`Episode ${ep.episode_number}`,arc_title:snapshot.arc,content_md:snapshot.body}).eq('id',ep.id).select('id,book_id,episode_number,arc_title,title,release_at,is_enabled,created_at,updated_at').single();if(error)throw error;lastSaved.current=snapshot;onUpdate({...data,content_md:snapshot.body,is_finale:ep.is_finale} as Episode);if(mounted.current)setStatus('Tersimpan');};
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
  const {data,error}=await supabase.from('qr_episodes').update({release_at,is_enabled}).eq('id',ep.id).select('id,book_id,episode_number,arc_title,title,release_at,is_enabled,created_at,updated_at').single();if(error)throw error;onUpdate({...data,content_md:body,is_finale:ep.is_finale} as Episode);setStatus(mode==='now'?'Diterbitkan':mode==='schedule'?'Terjadwal':'Menjadi draft');
 }catch(e){setError(errMsg(e));}finally{setPublishing(false);}};
 const importOne=async(file?:File)=>{if(!file)return;if(file.size>2_000_000){setError('File Markdown maksimal 2 MB.');return;}setBody(await file.text());setStatus('Belum disimpan');};
 const insertMarkdown=(before:string,after='',placeholder='teks')=>{
   const node=manuscriptRef.current;if(!node)return;
   const start=node.selectionStart,end=node.selectionEnd;
   const selection=body.slice(start,end)||placeholder;
   const next=body.slice(0,start)+before+selection+after+body.slice(end);
   setBody(next);
   requestAnimationFrame(()=>{node.focus();node.setSelectionRange(start+before.length,start+before.length+selection.length);});
 };
 const makePreview=()=>({id:`preview-${ep.id}`,title:book.title,path:'',content:`# ${book.title}\n\n${arc?`## ${arc}\n\n`:''}### ${title||`Episode ${ep.episode_number}`}\n\n${body||'Belum ada isi episode.'}`});
 if(preview)return <ReaderApp key={`${ep.id}-preview`} bookId={`preview-${ep.id}`} bookTitle={book.title} onExit={()=>setPreview(false)} previewStory={makePreview()}/>;
 return <><B to={`/studio/cerita/${book.id}`} className="studio-backlink"><ArrowLeft size={16}/> {book.title}</B>
 <div className="studio-editor-title v6-editor-heading"><div><span className="studio-kicker">{book.title} / BAB {ep.episode_number}</span><h1>{title||`Bab ${ep.episode_number}`}</h1><p>{dirty?'Ada perubahan yang belum disimpan':status} · {episodeStatus(ep)}</p></div><div className="v6-editor-head-actions"><button className="studio-light-button" onClick={()=>setPreview(true)}><Eye size={17}/> Pratinjau</button></div></div>
 <div className="studio-editor-layout"><section className="studio-panel studio-editor-panel"><div className="studio-editor-topline"><span><span className={`save-dot ${dirty?'save-unsaved':''}`}/>{status}</span><span><Pill episode={ep}/></span></div>
 <label className="studio-label">Judul episode<input className="studio-title-input" maxLength={180} value={title} onChange={e=>setTitle(e.target.value)} placeholder="Judul episodenya"/></label><label className="studio-label">Arc / bagian<input value={arc} onChange={e=>setArc(e.target.value)} placeholder="Opsional, mis. Arc I"/></label>
 <div className="studio-editor-toolbar v6-editor-format"><div className="v6-format-actions"><button type="button" title="Tebal" aria-label="Tebal" onClick={()=>insertMarkdown('**','**')}><Bold size={16}/></button><button type="button" title="Miring" aria-label="Miring" onClick={()=>insertMarkdown('*','*')}><Italic size={16}/></button><button type="button" title="Judul" aria-label="Judul" onClick={()=>insertMarkdown('## ')}><Heading2 size={17}/></button><button type="button" title="Daftar" aria-label="Daftar" onClick={()=>insertMarkdown('- ')}><List size={17}/></button><button type="button" title="Kutipan" aria-label="Kutipan" onClick={()=>insertMarkdown('> ')}><Quote size={17}/></button></div><label><UploadCloud size={16}/> Impor .md<input type="file" accept=".md,.txt,text/markdown,text/plain" onChange={e=>{void importOne(e.target.files?.[0]);e.target.value='';}}/></label></div>
 <textarea ref={manuscriptRef} className="studio-manuscript" aria-label="Isi episode dalam Markdown" spellCheck={true} placeholder="Mulai ceritamu di sini…" value={body} onChange={e=>setBody(e.target.value)}/>
 <div className="studio-editor-bottom"><span>{body.trim()?body.trim().split(/\s+/).length:0} kata</span><div><button onClick={()=>void save()} className="studio-light-button"><Save size={16}/> Simpan</button></div></div>
 </section><aside className="studio-panel studio-publish-panel"><div className="studio-panel-top"><h2>Publikasi</h2><Send size={19}/></div><p className="studio-muted">Status: <strong>{episodeStatus(ep)}</strong></p>
 {episodeStatus(ep)==='Terbit'&&<p className="studio-warning">Episode ini sudah publik. Perubahan isi yang disimpan akan langsung dapat dibaca.</p>}
 {!book.is_published&&<p className="studio-warning">Novel ini masih privat. Walaupun episode diterbitkan, pembaca tidak dapat membukanya sebelum novel ditampilkan.</p>}
 <label className="studio-label">Tanggal & jam rilis (WIB)<input type="datetime-local" value={schedule} onChange={e=>setSchedule(e.target.value)}/></label><button disabled={publishing||!body.trim()} onClick={()=>void updateRelease('schedule')} className="studio-light-button"><CalendarDays size={17}/> Jadwalkan</button>
 <button disabled={publishing||!body.trim()} onClick={()=>{if(window.confirm('Terbitkan episode ini sekarang? Semua pembaca dapat mengaksesnya jika novel sudah publik.'))void updateRelease('now');}} className="studio-primary"><Send size={16}/> Terbitkan sekarang</button>
 {episodeStatus(ep)!=='Draft'&&<button disabled={publishing} className="studio-danger-lite" onClick={()=>{if(window.confirm('Tarik episode ini dari publik dan jadikan draft?'))void updateRelease('draft');}}><LockKeyhole size={16}/> Tarik ke draft</button>}
 <p className="studio-publish-hint"><ShieldCheck size={15}/> Draft dan naskah terjadwal dilindungi kebijakan database.</p><button className="studio-danger-lite" disabled={publishing||dirty} onClick={()=>void onDelete()}><Trash2 size={16}/> Pindahkan episode ke Sampah</button>{dirty&&<p className="studio-muted">Simpan perubahan dulu sebelum memindahkan episode ke Sampah.</p>}</aside></div>
 {error&&<div className="studio-error" role="alert">{error}</div>}
 <div className="studio-editor-mobile-actions"><button className="studio-light-button" onClick={()=>setPreview(true)}><BookOpen size={18}/> Pratinjau</button><button className="studio-primary" onClick={()=>void save()}><Save size={18}/> Simpan</button><button className="studio-primary" disabled={publishing||!body.trim()} onClick={()=>{if(window.confirm('Terbitkan bab ini sekarang?'))void updateRelease('now')}}><Send size={17}/> Publikasikan</button></div>
 </>;
}
function Schedule({books,episodes}:{books:Book[];episodes:Episode[]}){
 const upcoming=episodes.filter(e=>episodeStatus(e)==='Terjadwal').sort((a,b)=>new Date(a.release_at!).getTime()-new Date(b.release_at!).getTime());
 return <><div className="studio-page-head"><span className="studio-kicker">KALENDER PUBLIKASI</span><h1>Jadwal <i>terbit.</i></h1><p>Semua waktu ditampilkan dalam WIB (UTC+7).</p></div><div className="studio-panel studio-schedule"><div className="studio-panel-top"><h2>Episode berikutnya</h2><CalendarDays size={19}/></div>{upcoming.length?upcoming.map(ep=><B to={`/studio/editor/${ep.id}`} key={ep.id} className="studio-schedule-row"><div className="studio-schedule-icon"><CalendarDays size={21}/></div><div><strong>{ep.title}</strong><small>{books.find(b=>b.id===ep.book_id)?.title}</small><em>{formatWib(ep.release_at)}</em></div><ChevronRight size={18}/></B>):<div className="studio-panel-empty"><Clock3 size={32}/><p>Belum ada jadwal terbit. Buka editor episode dan pilih waktu rilis.</p></div>}</div></>;
}
export default function Studio({path}:{path:string}) {
 const {theme,preference,setPreference}=useUiTheme();
 const userIdRef=useRef<string|null>(null);
 const [user,setUser]=useState<User|null>(null);const [authorized,setAuthorized]=useState(false);const [authLoading,setAuthLoading]=useState(true);const [books,setBooks]=useState<Book[]>([]);const [episodes,setEpisodes]=useState<Episode[]>([]);const [loading,setLoading]=useState(true);const [error,setError]=useState('');
 const refresh=useCallback(async()=>{try{const result=await getStudioLibrary();setBooks(result.books);setEpisodes(result.episodes);setError('');}catch(e){setError(errMsg(e));}finally{setLoading(false);}},[]);
 // Do not remount the Studio on tab navigation or refresh credentials every time
 // Chrome Android opens its document picker. Auth is verified on entry/sign-in;
 // token refreshes do not replace the file importer or its File object.
 const checkAuth=useCallback(async()=>{
  if(!supabase){setAuthLoading(false);return;}
  try{
   const {data,error}=await supabase.auth.getUser();
   if(error||!data.user){setUser(null);setAuthorized(false);return;}
   const {data:member,error:memberErr}=await supabase.from('qr_author_members').select('user_id').eq('user_id',data.user.id).maybeSingle();
   if(memberErr){setError(`Gagal memeriksa izin penulis: ${memberErr.message}`);setAuthorized(false);return;}
   userIdRef.current=data.user.id;setUser(data.user);setAuthorized(Boolean(member));
  }catch(e){setError(`Pemeriksaan akun gagal: ${errMsg(e)}`);setAuthorized(false);}
  finally{setAuthLoading(false);}
 },[]);
 useEffect(()=>{
  let mounted=true;
  void checkAuth();
  const {data}=supabase?.auth.onAuthStateChange((event)=>{
   if(!mounted)return;
   if(event==='SIGNED_OUT'){userIdRef.current=null;setUser(null);setAuthorized(false);setAuthLoading(false);}
   else if(event==='SIGNED_IN' && userIdRef.current===null){
    // Defer async auth calls outside Supabase's synchronous callback.
    window.setTimeout(()=>{if(mounted)void checkAuth();},0);
   }
   // INITIAL_SESSION and TOKEN_REFRESHED must not reset the mobile importer.
  })??{data:null};
  return()=>{mounted=false;data?.subscription.unsubscribe();};
 },[checkAuth]);
 useEffect(()=>{if(authorized){setLoading(true);void refresh();}},[authorized,refresh]);
 const onUpdateBook=(b:Book)=>{setBooks(prev=>[b,...prev.filter(x=>x.id!==b.id)]);navigate(`/studio/cerita/${b.id}`);};
 const onUpdateEpisode=useCallback((e:Episode)=>setEpisodes(prev=>prev.map(x=>x.id===e.id?e:x)),[]);
 const moveToTrash=async(kind:'book'|'episode',id:string,title:string)=>{
  const confirmText=kind==='book'?window.prompt(`Memindahkan novel ke Sampah membuatnya privat. Ketik judul tepat untuk mengonfirmasi: ${title}`):null;
  if(kind==='book'&&confirmText!==title)return;
  if(kind==='episode'&&!window.confirm(`Pindahkan episode “${title}” ke Sampah? Jadwalnya akan dibatalkan agar tidak terbit tanpa sengaja.`))return;
  try{await trashItem(kind,id);await refresh();navigate(kind==='book'?'/studio/cerita':'/studio/sampah');}
  catch(e){setError(`Gagal memindahkan ke Sampah: ${errMsg(e)}`);}
 };
 const createEpisode=async(bookId:string,requestedZero=false)=>{if(!supabase)return;setError('');try{const local=episodes.filter(e=>e.book_id===bookId);if(requestedZero&&local.some(e=>e.episode_number===0))throw Error('Episode 0 sudah ada.');const number=requestedZero?0:local.reduce((a,e)=>Math.max(a,e.episode_number),0)+1;
   const {data,error}=await supabase.from('qr_episodes').insert({book_id:bookId,episode_number:number,title:`Episode ${number}`,arc_title:'',content_md:'',release_at:null,is_enabled:false}).select('id,book_id,episode_number,arc_title,title,release_at,is_enabled,created_at,updated_at').single();if(error)throw error;setEpisodes(prev=>[...prev,{...data,content_md:''} as Episode]);navigate(`/studio/editor/${data.id}`);
 }catch(e){setError(errMsg(e));}};
 if(!isConfigured)return <div className="studio-unavailable"><Feather size={36}/><h1>Hubungkan Studio ke Supabase</h1><p>Untuk mengaktifkan login dan publikasi, isi variabel VITE_SUPABASE_URL dan VITE_SUPABASE_PUBLISHABLE_KEY, lalu jalankan migrasi V2 dan daftarkan akun penulis.</p><B to="/" className="studio-primary">Kembali ke perpustakaan</B></div>;
 if(authLoading)return <Busy text="Memverifikasi akses Studio…"/>;
 if(!user)return <Login theme={theme} preference={preference} onPreferenceChange={setPreference} onSuccess={()=>void checkAuth()}/>;
 if(!authorized)return <div className="studio-unavailable"><LockKeyhole size={35}/><h1>Akun belum memiliki izin penulis</h1><p>Masuk dengan akun yang sudah terdaftar di tabel qr_author_members. Keanggotaan harus diberikan oleh admin database, bukan lewat browser.</p>{error&&<p className="studio-error">{error}</p>}<button className="studio-light-button" onClick={()=>void supabase?.auth.signOut()}>Keluar akun</button></div>;
 const sections=path.split('/').filter(Boolean);const book=sections[1]==='cerita'&&sections[2]&&sections[2]!=='baru'?books.find(b=>b.id===decodeURIComponent(sections[2])):undefined;
 const editorEpisode=sections[1]==='editor'?episodes.find(e=>e.id===sections[2]):undefined;
 const displayName=authorName(user);
 return <div className="studio-app v6-studio-app" data-kk-theme={theme}><Nav path={path} displayName={displayName} theme={theme} preference={preference} onPreferenceChange={setPreference}/><div className="studio-page"><div className="studio-toolbar"><span>KataKecil <strong>Studio</strong></span><div><ThemeToggle theme={theme} preference={preference} onPreferenceChange={setPreference}/><span className="studio-auth-indicator"><span/>{displayName}</span><button onClick={()=>void supabase?.auth.signOut()} title="Keluar" aria-label="Keluar akun"><LogOut size={18}/></button></div></div>
 <main className="studio-content">{error&&<div className="studio-error" role="alert">{error}</div>}{loading?<Busy/>:sections[1]==='impor'?<ManuscriptImporter books={books} episodes={episodes} onChanged={refresh}/>:sections[1]==='jadwal'?<ScheduleManager books={books} episodes={episodes} onChanged={refresh}/>:sections[1]==='database'?<DatabaseManager books={books} episodes={episodes} onChanged={refresh}/>:sections[1]==='sampah'?<TrashManager onChanged={refresh}/>:sections[1]==='editor'?(editorEpisode?<Editor key={editorEpisode.id} ep={editorEpisode} book={books.find(b=>b.id===editorEpisode.book_id)!} onUpdate={onUpdateEpisode} onDelete={()=>moveToTrash('episode',editorEpisode.id,editorEpisode.title)}/>:<p>Episode tidak ditemukan.</p>):sections[1]==='cerita'&&sections[2]==='baru'?<><B className="studio-backlink" to="/studio/cerita"><ArrowLeft size={16}/> Kembali ke karya</B><BookForm onSaved={onUpdateBook}/></>:sections[1]==='cerita'&&sections[2]?(book?<BookDetails key={book.id} book={book} episodes={episodes} onNew={()=>void createEpisode(book.id)} onNewZero={()=>void createEpisode(book.id,true)} onUpdate={onUpdateBook} onDelete={()=>moveToTrash('book',book.id,book.title)} onChanged={refresh}/>:<p>Novel tidak ditemukan.</p>):sections[1]==='cerita'?<Books books={books} episodes={episodes} onCreate={()=>navigate('/studio/cerita/baru')}/>:sections[1]==='analytics'?<Analytics books={books} episodes={episodes}/>:sections[1]==='settings'?<StudioSettings/>:<Dashboard books={books} episodes={episodes} user={user}/>}
 </main></div></div>;
}
