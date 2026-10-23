import BrandIcon from '../../../components/BrandIcon';
import React, { useMemo, useRef, useState } from 'react';
import { Cover } from '../../covers/AuthorCover';
import CoverManager from '../../covers/CoverManager';
import {CoverEditor} from '../../covers/CoverEditor';
import {newCoverOperation,saveCover,type CoverUploadOperation} from '../../covers/api';
import type {PreparedCover} from '../../covers/model';
import BookSections from '../../../pages/BookSections';
import EpubStudio from '../../epub/EpubStudio';
import { episodeStatus, formatWib, slugify, type Book, type Episode } from '../../../data/library';
import { supabase } from '../../../data/supabase';
import { bulkPublishDrafts } from '../../../data/bulkPublishing';
import { B, Pill, errMsg } from './StudioShared';
import ManagementDialog from './ManagementDialog';
import {useLeaveGuard} from '../../../hooks/useLeaveGuard';
import {mayLeave} from '../../../utils/nav';
import type {ManagementOperation} from '../../../data/management';

const BOOK_STATUS: Record<Book['status'], string> = { ongoing: 'Berlangsung', completed: 'Tamat', hiatus: 'Jeda' };

export function Books({ books, episodes, onCreate, onChanged }: {
  books: Book[];
  episodes: Episode[];
  onCreate: () => void;
  onChanged: () => Promise<void>;
}) {
  const stats=useMemo(()=>{const map=new Map<string,{Terbit:number;Terjadwal:number;Draft:number}>();for(const ep of episodes){const counts=map.get(ep.book_id)??{Terbit:0,Terjadwal:0,Draft:0};counts[episodeStatus(ep)]++;map.set(ep.book_id,counts);}return map;},[episodes]);
  const [selected,setSelected]=useState<string[]>([]),[pending,setPending]=useState<ManagementOperation|null>(null),[message,setMessage]=useState('');
  const selectBooks=(ids:string[])=>{const items=books.filter(b=>ids.includes(b.id)).map(b=>({kind:'book' as const,id:b.id,title:b.title}));if(items.length)setPending({id:crypto.randomUUID(),action:'trash',items});};
  const [query, setQuery] = useState('');
  const [visibility, setVisibility] = useState<'Semua' | 'Publik' | 'Privat'>('Semua');
  const filtered = books.filter(book =>
    (visibility === 'Semua' || book.is_published === (visibility === 'Publik')) &&
    `${book.title} ${book.genre}`.toLocaleLowerCase('id-ID')
      .includes(query.trim().toLocaleLowerCase('id-ID')));
  const reset = () => { setQuery(''); setVisibility('Semua'); };
  return <div className="writer-works">
    <header className="writer-page-heading"><div><span className="writer-eyebrow">RUANG MENULIS</span><h1>Karya.</h1><p>Naskah, bab, dan jadwal di satu tempat.</p></div><button type="button" className="studio-primary" onClick={onCreate}><BrandIcon name="plus" size={17}/> Cerita baru</button></header>
    {books.length>0&&<div className="writer-works-tools"><label className="writer-search"><BrandIcon name="search" size={17}/><input type="search" aria-label="Cari karya" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Cari judul atau genre…"/></label><label className="writer-filter"><span>Visibilitas</span><select aria-label="Filter visibilitas karya" value={visibility} onChange={e=>setVisibility(e.target.value as typeof visibility)}>{(['Semua','Publik','Privat'] as const).map(value=><option key={value}>{value}</option>)}</select></label></div>}
    {message&&<p role="status" className="studio-success">{message}</p>}
    {filtered.length?<div className="writer-book-grid">{filtered.map(book=>{
      const lastDraft=episodes.filter(ep=>ep.book_id===book.id&&episodeStatus(ep)==='Draft').sort((a,b)=>Date.parse(b.updated_at)-Date.parse(a.updated_at))[0];
      return <article className="writer-book-card" key={book.id}>
        <B to={`/studio/cerita/${book.id}`} className="writer-book-open"><div className="writer-book-cover"><Cover book={book} size="mini"/></div><span className="writer-book-copy"><span className="writer-book-status">{book.is_published?'Publik':'Privat'} · {BOOK_STATUS[book.status]}</span><strong>{book.title}</strong><small>{book.epub?`EPUB utuh · ${book.epub.toc.length} bagian`:`${episodes.filter(ep=>ep.book_id===book.id).length} bab · ${stats.get(book.id)?.Draft??0} draft`}</small></span><BrandIcon name="chevron-right" size={17}/></B>
        {lastDraft&&<B to={`/studio/editor/${lastDraft.id}`} className="writer-resume"><BrandIcon name="file-pen" size={16}/><span>Lanjutkan <strong>{lastDraft.title||`Bab ${lastDraft.episode_number}`}</strong></span><BrandIcon name="arrow-right" size={16}/></B>}
      </article>;
    })}</div>:books.length?<div className="writer-empty"><h2>Belum ada karya yang cocok.</h2><button type="button" className="studio-light-button" onClick={reset}>Reset pencarian</button></div>:<div className="writer-empty"><BrandIcon name="book-open" size={34}/><h2>Sebuah dunia menunggu ditulis.</h2><p>Mulai dari judul. Bab pertamamu menyusul.</p><button type="button" className="studio-primary" onClick={onCreate}>Buat cerita pertama</button></div>}
    {books.length>0&&<details className="writer-management"><summary>Kelola beberapa karya</summary><p>Pilih karya yang ingin dipindahkan ke Sampah. Konfirmasi tetap diperlukan.</p><div className="writer-selection-list">{filtered.map(book=><label key={book.id}><input type="checkbox" aria-label={`Pilih novel ${book.title}`} checked={selected.includes(book.id)} onChange={e=>setSelected(prev=>e.target.checked?[...prev,book.id]:prev.filter(id=>id!==book.id))}/>{book.title}</label>)}</div><div className="writer-action-row"><button type="button" className="studio-light-button" onClick={()=>setSelected(filtered.map(b=>b.id))}>Pilih hasil filter ({filtered.length})</button><button type="button" className="studio-light-button" onClick={()=>setSelected([])} disabled={!selected.length}>Batal pilih</button><button type="button" className="studio-danger-lite" disabled={!selected.length} onClick={()=>selectBooks(selected)}>Hapus terpilih ({selected.length})</button><button type="button" className="studio-danger-lite" onClick={()=>selectBooks(books.map(b=>b.id))}>Hapus semua novel ({books.length})</button></div></details>}
    {pending&&<ManagementDialog operation={pending} description={`${pending.items.length} novel beserta ${episodes.filter(e=>pending.items.some(b=>b.id===e.book_id)).length} bab akan disembunyikan dari publik.`} onClose={()=>{setPending(null);void onChanged();}} onDone={async notice=>{setPending(null);setSelected([]);setMessage(notice);await onChanged();}}/>}
  </div>;
}

export function BookForm({existing,onSaved}:{existing?:Book;onSaved:(book:Book)=>void}) {
 const [title,setTitle]=useState(existing?.title||''),[synopsis,setSynopsis]=useState(existing?.synopsis||''),[genre,setGenre]=useState(existing?.genre||'Fiksi');
 const [status,setStatus]=useState<Book['status']>(existing?.status||'ongoing'),[published,setPublished]=useState(existing?.is_published||false);
 const featured=existing?.is_featured||false;
 const [cover,setCover]=useState(existing?.cover_url||''),[prepared,setPrepared]=useState<PreparedCover|null>(null),[preparing,setPreparing]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[stage,setStage]=useState('');
 const created=useRef<Book|null>(null),newId=useRef<string>(''),coverOperation=useRef<CoverUploadOperation|null>(null);
 const slug=existing?.slug||slugify(title);
 const snapshot=JSON.stringify({title,synopsis,genre,status,published,featured,cover,prepared:prepared?.name||''});
 const savedSnapshot=useRef(snapshot);
 useLeaveGuard(busy||snapshot!==savedSnapshot.current,()=>snapshot===savedSnapshot.current||(!busy&&window.confirm('Tinggalkan pengaturan yang belum disimpan?')));

 const save=async(e:React.FormEvent)=>{
  e.preventDefault();if(!supabase||busy)return;setBusy(true);setError('');
  try{
   if(!title.trim()||!slug)throw Error('Isi judul terlebih dahulu.');
   if(cover&&!existing?.cover_manifest&&!prepared){let parsedURL:URL;try{parsedURL=new URL(cover);}catch{throw Error('URL sampul tidak valid.');}if(parsedURL.protocol!=='https:')throw Error('Gunakan URL sampul HTTPS.');}
   const current=existing||created.current;
   newId.current||=`${slug.slice(0,58)}-${crypto.randomUUID().slice(0,8)}`;
   const id=current?.id||newId.current;
   const values={id,title:title.trim(),slug,synopsis:synopsis.trim(),genre:genre.trim()||'Fiksi',status,is_published:published,is_featured:featured,...(!existing?.cover_manifest?{cover_url:cover||null}:{})};
   const q=current?supabase.from('qr_books').update(values).eq('id',id):supabase.from('qr_books').insert(values);
   let {data,error:saveError}=await q.select().single();
   if(saveError?.code==='23505'&&!current){const recovered=await supabase.from('qr_books').select('*').eq('id',id).maybeSingle();if(recovered.data){data=recovered.data;saveError=null;}}
   if(saveError)throw saveError;created.current=data as Book;
   if(prepared&&!existing){coverOperation.current??=await newCoverOperation(id,prepared);const asset=await saveCover(coverOperation.current,new AbortController().signal,setStage);data={...data,studio_cover_path:asset.manifest?.card[0]?.path};}
   savedSnapshot.current=snapshot;
   onSaved({...data,...(existing?.epub?{epub:existing.epub,reading_format:'epub'}:{}),...(existing?.cover_manifest?{cover_manifest:existing.cover_manifest,cover_version:existing.cover_version}:{})} as Book);
  }catch(e){setError(`${errMsg(e)}${created.current&&!existing?' Karya sudah dibuat; coba simpan lagi untuk melanjutkan sampul tanpa membuat karya kedua.':''}`);}finally{setBusy(false);setStage('');}
 };
 return <><form onSubmit={save} className="studio-panel studio-book-form"><h2>{existing?'Pengaturan novel':'Novel baru'}</h2><div className="studio-form-grid"><div className="studio-fieldset">
  <label className="studio-label">Judul cerita<input required maxLength={140} value={title} onChange={e=>setTitle(e.target.value)} placeholder="Judul novelmu"/></label>
  <label className="studio-label">Alamat cerita (otomatis)<input readOnly value={slug} placeholder="judul-novel"/></label>
  <label className="studio-label">Sinopsis<textarea rows={5} maxLength={2500} value={synopsis} onChange={e=>setSynopsis(e.target.value)} placeholder="Apa yang akan ditemukan pembaca di dalam cerita ini?"/></label>
  <div className="studio-form-pair"><label className="studio-label">Genre<input maxLength={70} value={genre} onChange={e=>setGenre(e.target.value)}/></label><label className="studio-label">Status cerita<select value={status} onChange={e=>setStatus(e.target.value as Book['status'])}><option value="ongoing">Berlangsung</option><option value="completed">Tamat</option><option value="hiatus">Jeda</option></select></label></div>
  <label className="studio-check"><input type="checkbox" checked={published} onChange={e=>setPublished(e.target.checked)}/><span><strong>Tampilkan novel di perpustakaan</strong><small>Episode tetap tersembunyi sampai tanggal rilisnya.</small></span></label>
 </div><div className="studio-cover-fields">{!existing&&<CoverEditor value={prepared} onChange={v=>{setPrepared(v);if(v)setCover('');coverOperation.current=null;}} title={title||'Judul ceritamu'} disabled={busy} onBusy={setPreparing}/>}<label className="studio-label">{existing?.cover_manifest?'Sampul aktif dikelola di bawah':'Atau URL sampul'}<input type="url" value={existing?.cover_manifest?existing.cover_url||'':cover} readOnly={Boolean(existing?.cover_manifest)} disabled={Boolean(prepared)} onChange={e=>setCover(e.target.value)} placeholder="https://..."/></label>{!existing&&prepared&&<p className="studio-muted">Sampul disimpan privat. Terbitkan dari pengaturan karya setelah novel dibuat.</p>}</div></div>
 {error&&<div className="studio-error" role="alert">{error}</div>}{stage&&<p role="status">{stage}</p>}<button className="studio-primary" disabled={busy||preparing||!slug||!title.trim()} type="submit"><BrandIcon name="save" size={17}/>{busy?'Menyimpan…':existing?'Simpan perubahan':'Buat novel'}</button></form>{existing&&<CoverManager key={existing.id} book={existing} onChanged={onSaved}/>}</>;
}

export function BookDetails({ book, episodes, onNew, onNewZero, onUpdate, onDelete, onChanged }: {
    book: Book;
    episodes: Episode[];
    onNew: () => void;
    onNewZero: () => void;
    onUpdate: (value: Book) => void;
    onDelete: () => Promise<void>;
    onChanged: () => Promise<void>;
}) {
    const local = episodes.filter(e => e.book_id === book.id).sort((a, b) => a.episode_number - b.episode_number);
    const drafts = local.filter(e => episodeStatus(e) === 'Draft');
    const blankDrafts = drafts.filter(e => (e.content_length ?? e.content_md.trim().length) === 0);
    const [search, setSearch] = useState('');
    const [tab,setTab]=useState<'chapters'|'pages'|'settings'>('chapters');
    const [filter, setFilter] = useState<'Semua' | 'Draft' | 'Terjadwal' | 'Terbit'>('Semua');
    const visible = local.filter(ep => (filter === 'Semua' || episodeStatus(ep) === filter) &&
        `${ep.episode_number} ${ep.title} ${ep.arc_title}`.toLocaleLowerCase('id-ID')
            .includes(search.trim().toLocaleLowerCase('id-ID')));
    const [publishing, setPublishing] = useState(false);
    const [publishError, setPublishError] = useState('');
    const [publishNotice, setPublishNotice] = useState('');
    const publish = async (markCompleted: boolean) => {
        if (publishing)
            return;
        const count = drafts.length;
        const question = markCompleted
            ? `Tandai “${book.title}” sebagai TAMAT dan terbitkan ${count} episode draft sekarang?\n\nNovel akan tampil di perpustakaan. Jadwal episode yang sudah terbit/terjadwal tidak diubah. Episode terakhir diberi tanda Finale.`
            : `Terbitkan SEMUA ${count} episode draft “${book.title}” sekarang?\n\nNovel akan ditampilkan di perpustakaan. Episode yang sudah terbit/terjadwal tidak diubah.`;
        if (!window.confirm(question))
            return;
        setPublishing(true);
        setPublishError('');
        setPublishNotice('');
        try {
            const result = await bulkPublishDrafts(book.id, count, markCompleted);
            await onChanged();
            setPublishNotice(`${result.published_count} episode berhasil diterbitkan${markCompleted ? ' dan cerita ditandai Tamat' : ''}.`);
        }
        catch (e) {
            setPublishError(errMsg(e));
        }
        finally {
            setPublishing(false);
        }
    };
    if(book.epub)return <><B to="/studio/cerita" className="studio-backlink">← Semua karya</B><header className="writer-page-heading"><div><span className="writer-eyebrow">KELOLA EPUB</span><h1>{book.title}</h1></div></header><EpubStudio book={book} asset={book.epub} onChanged={onChanged}/><details className="studio-panel"><summary>Pengaturan buku & sampul</summary><BookForm existing={book} onSaved={onUpdate}/></details><section className="studio-panel"><button className="studio-danger-lite" onClick={()=>void onDelete()}>Pindahkan buku ke Sampah</button></section></>;
    return <><B to="/studio/cerita" className="studio-backlink"><BrandIcon name="arrow-left" size={16}/> Semua karya</B><div className="studio-page-head studio-head-with-action"><div><span className="studio-kicker">KELOLA NOVEL</span><h1>{book.title}</h1><p>{local.length} episode · {book.is_published ? 'Tayang di perpustakaan' : 'Draft (privat)'}</p></div><button onClick={onNew} className="studio-primary"><BrandIcon name="plus" size={16}/> Episode baru</button></div>
 <div className="writer-book-tabs" role="tablist" aria-label="Bagian pengelolaan karya">{([['chapters','Bab'],['pages','Halaman buku'],['settings','Pengaturan']] as const).map(([value,label])=><button type="button" role="tab" id={`writer-tab-${value}`} aria-controls={`writer-panel-${value}`} aria-selected={tab===value} tabIndex={tab===value?0:-1} key={value} onKeyDown={event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const nodes=[...event.currentTarget.parentElement!.querySelectorAll<HTMLButtonElement>('[role=tab]')],index=nodes.indexOf(event.currentTarget);const next=nodes[event.key==='Home'?0:event.key==='End'?nodes.length-1:(index+(event.key==='ArrowRight'?1:-1)+nodes.length)%nodes.length];next.focus();next.click();}} onClick={()=>void(async()=>{if(await mayLeave())setTab(value);})()}>{label}</button>)}</div>
 {tab==='chapters'&&<div role="tabpanel" id="writer-panel-chapters" aria-labelledby="writer-tab-chapters">
 <section className="studio-panel v69-chapter-manager" id="episodes"><div className="studio-panel-top"><h2>Daftar Bab</h2><B to={`/studio/impor?book=${encodeURIComponent(book.id)}`} className="studio-text-button"><BrandIcon name="upload" size={16}/> Impor EPUB / MD</B></div>
 
 {local.length > 0 && <div className="v69-chapter-filters">
   <label className="v69-search-field"><BrandIcon name="search" size={17}/>
     <span className="v69-visually-hidden">Cari bab</span>
     <input type="search" placeholder="Cari nomor atau judul bab…" value={search}
       onChange={event => setSearch(event.target.value)}/>
   </label>
   <div className="v69-status-filter" role="group" aria-label="Filter status bab">
     {(['Semua', 'Draft', 'Terjadwal', 'Terbit'] as const).map(value =>
       <button type="button" key={value} aria-pressed={filter === value}
         className={filter === value ? 'is-active' : ''} onClick={() => setFilter(value)}>{value}</button>)}
   </div>
 </div>}
 {local.length > 0 && <p className="kk-v71-chapter-count" role="status">Menampilkan {visible.length} dari {local.length} bab</p>}
 {visible.length ? <div className="studio-episode-stack">{visible.map(ep => <B key={ep.id} to={`/studio/editor/${ep.id}`} className="studio-episode-item"><span className="studio-episode-index">{ep.episode_number === 0 ? 'P' : String(ep.episode_number).padStart(2, '0')}</span><span className="studio-episode-text"><strong>{ep.title}</strong><small>{ep.arc_title || 'Tanpa arc'}{ep.is_finale ? ' · Finale' : ''}{episodeStatus(ep) === 'Terjadwal' ? ` · ${formatWib(ep.release_at)}` : ''}</small></span><Pill episode={ep}/><BrandIcon name="chevron-right" size={17}/></B>)}</div> : local.length ? <div className="kk-v71-studio-no-results" role="status"><p>Tidak ada bab yang cocok dengan filter.</p><button type="button" className="studio-light-button" onClick={() => { setSearch(''); setFilter('Semua'); }}>Reset filter bab</button></div> : <p className="studio-muted">Belum ada bab. Buat bab baru atau impor naskah melalui Upload.</p>}
 {!local.some(e => e.episode_number === 0) && <button onClick={onNewZero} className="studio-light-button"><BrandIcon name="file-plus" size={16}/> Buat Episode 0</button>}</section>
 <details className="studio-panel kk-bulk-panel v69-bulk-details" id="bulk-publish" aria-label="Penerbitan episode sekaligus">
   <summary><BrandIcon name="send" size={18}/> Terbitkan banyak bab sekaligus</summary>
   <p className="studio-muted">{drafts.length} draft dari {local.length} episode. Terbitkan seluruh draft novel tamat tanpa membuka editor satu per satu. Episode terjadwal tetap mengikuti jadwalnya.</p>
   {blankDrafts.length > 0 && <p className="studio-warning" role="alert">Ada {blankDrafts.length} draft tanpa isi. Lengkapi semuanya sebelum terbit massal.</p>}
   {publishError && <div className="studio-error" role="alert">{publishError}</div>}
   {publishNotice && <div className="studio-success" role="status">{publishNotice}</div>}
   <div className="kk-bulk-actions">
     <button type="button" className="studio-light-button" disabled={publishing || !drafts.length || !!blankDrafts.length} onClick={() => void publish(false)}><BrandIcon name="send" size={16}/> {publishing ? 'Menerbitkan…' : `Terbitkan semua ${drafts.length} draft`}</button>
     <button type="button" className="studio-primary" disabled={publishing || !local.length || !!blankDrafts.length} onClick={() => void publish(true)}><BrandIcon name="check" size={16}/> {publishing ? 'Memproses…' : 'Tandai Tamat & Terbitkan Draft'}</button>
   </div>
   <small className="studio-muted">Hanya setelah konfirmasi. Jika proses gagal, transaksi database membatalkan seluruh perubahan.</small>
 </details>
 </div>}
 {tab==='pages'&&<div role="tabpanel" id="writer-panel-pages" aria-labelledby="writer-tab-pages"><BookSections bookId={book.id}/></div>}
 {tab==='settings'&&<div role="tabpanel" id="writer-panel-settings" aria-labelledby="writer-tab-settings"><div id="settings"><BookForm key={book.id} existing={book} onSaved={onUpdate}/></div><section className="studio-panel v5-danger-zone"><h2>Pengelolaan novel</h2><p className="studio-muted">Pindahkan novel ke Sampah (bukan hapus permanen). Novel langsung menjadi privat, sedangkan semua episode dan halaman tetap tersimpan.</p><button type="button" className="studio-danger-lite" onClick={() => void onDelete()}><BrandIcon name="delete" size={16}/> Pindahkan novel ke Sampah</button></section></div>}</>;
}

