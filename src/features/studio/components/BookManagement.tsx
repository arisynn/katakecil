import BrandIcon from '../../../components/BrandIcon';
import React, { useEffect, useState } from 'react';
import { Cover } from '../../../components/Cover';
import BookSections from '../../../pages/BookSections';
import { episodeStatus, formatWib, slugify, type Book, type Episode } from '../../../data/library';
import { supabase } from '../../../data/supabase';
import { bulkPublishDrafts } from '../../../data/bulkPublishing';
import { B, Pill, errMsg } from './StudioShared';

const BOOK_STATUS: Record<Book['status'], string> = { ongoing: 'Berlangsung', completed: 'Tamat', hiatus: 'Jeda' };

export function Books({ books, episodes, onCreate }: {
  books: Book[];
  episodes: Episode[];
  onCreate: () => void;
}) {
  const [query, setQuery] = useState('');
  const [visibility, setVisibility] = useState<'Semua' | 'Publik' | 'Privat'>('Semua');
  const filtered = books.filter(book =>
    (visibility === 'Semua' || book.is_published === (visibility === 'Publik')) &&
    `${book.title} ${book.genre}`.toLocaleLowerCase('id-ID')
      .includes(query.trim().toLocaleLowerCase('id-ID')));
  const reset = () => { setQuery(''); setVisibility('Semua'); };
  return <div className="v69-books-page">
    <div className="studio-page-head studio-head-with-action">
      <div><span className="studio-kicker">PERPUSTAKAAN PENULIS</span>
        <h1>Karya Saya</h1><p>Semua cerita, bab, dan jadwal dalam satu tempat.</p></div>
      {books.length > 0 && <button onClick={onCreate} className="studio-primary">
        <BrandIcon name="plus" size={17}/> Karya Baru
      </button>}
    </div>
    {books.length > 0 && <div className="kk-v71-books-toolbar">
      <label className="v69-search-field">
        <BrandIcon name="search" size={18}/><span className="v69-visually-hidden">Cari karya</span>
        <input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Cari judul atau genre…"/>
      </label>
      <div className="kk-v71-books-filter" role="group" aria-label="Filter visibilitas karya">
        {(['Semua', 'Publik', 'Privat'] as const).map(value => <button type="button" key={value}
          aria-pressed={visibility === value} className={visibility === value ? 'is-active' : ''}
          onClick={() => setVisibility(value)}>{value}</button>)}
      </div>
      <span className="kk-v71-books-count" role="status">{filtered.length} dari {books.length} karya</span>
    </div>}
    {filtered.length ? <div className="studio-manage-list">
      {filtered.map(book => <B key={book.id} to={`/studio/cerita/${book.id}`}
        className="studio-manage-item">
        <Cover book={book} size="mini"/>
        <span><strong>{book.title}</strong>
          <small>{book.genre} · {episodes.filter(ep => ep.book_id === book.id).length} bab</small>
          <em>{book.is_published ? 'Publik' : 'Privat'} · {BOOK_STATUS[book.status]}</em>
        </span><BrandIcon name="chevron-right" size={20}/>
      </B>)}
    </div> : books.length ? <div className="kk-v71-studio-no-results" role="status"><p>Tidak ada karya yang cocok dengan pencarian atau filter.</p><button type="button" className="studio-light-button" onClick={reset}>Tampilkan semua karya</button></div>
      : <div className="studio-big-empty"><BrandIcon name="books" size={30}/>
          <h2>Sebuah dunia menunggu ditulis.</h2><p>Mulai dengan membuat karya pertama.</p>
          <button onClick={onCreate} className="studio-primary"><BrandIcon name="plus" size={18}/> Buat Karya</button>
        </div>}
  </div>;
}

export function BookForm({ existing, onSaved }: {
    existing?: Book;
    onSaved: (book: Book) => void;
}) {
    const [title, setTitle] = useState(existing?.title || '');
    const [synopsis, setSynopsis] = useState(existing?.synopsis || '');
    const [genre, setGenre] = useState(existing?.genre || 'Fiksi');
    const [status, setStatus] = useState<Book['status']>(existing?.status || 'ongoing');
    const [published, setPublished] = useState(existing?.is_published || false);
    const [featured, setFeatured] = useState(existing?.is_featured || false);
    const [cover, setCover] = useState(existing?.cover_url || '');
    const [upload, setUpload] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState('');
    const [privatePreview,setPrivatePreview]=useState('');
    const [publishPrivate,setPublishPrivate]=useState(false);
    useEffect(()=>{let active=true,url='';if(existing?.private_cover_path&&supabase)void supabase.storage.from('story-covers-private').download(existing.private_cover_path).then(({data})=>{if(data&&active){url=URL.createObjectURL(data);setPrivatePreview(url);}});return()=>{active=false;if(url)URL.revokeObjectURL(url);};},[existing?.private_cover_path]);
    useEffect(() => { if (!upload) {
        setPreviewUrl('');
        return;
    } const url = URL.createObjectURL(upload); setPreviewUrl(url); return () => URL.revokeObjectURL(url); }, [upload]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const slug = existing?.slug || slugify(title);
    const save = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supabase)
            return;
        setBusy(true);
        setError('');
        try {
            if (!title.trim() || !slug)
                throw new Error('Isi judul terlebih dahulu.');
            let cover_url = cover || null;
            const id = existing?.id || slug;
            let selectedCover:Blob|null=upload;
            if(publishPrivate&&existing?.private_cover_path&&!upload){const {data,error}=await supabase.storage.from('story-covers-private').download(existing.private_cover_path);if(error)throw error;selectedCover=data;}
            if (selectedCover) {
                if(!window.confirm('Sampul ini akan disalin ke penyimpanan publik dan dapat diakses lewat URL. Lanjutkan?')){setBusy(false);return;}
                const bitmap=await createImageBitmap(selectedCover);const valid=bitmap.width>0&&bitmap.height>0&&bitmap.width<=8000&&bitmap.height<=8000;bitmap.close();if(!valid)throw Error('Dimensi sampul tidak valid.');
                if (!['image/jpeg', 'image/png', 'image/webp'].includes(selectedCover.type))
                    throw new Error('Gunakan gambar JPG, PNG, atau WebP.');
                if (selectedCover.size > 5242880)
                    throw new Error('Maksimum sampul 5 MB.');
                const ext = selectedCover.type === 'image/png' ? 'png' : selectedCover.type === 'image/webp' ? 'webp' : 'jpg';
                const name = `${id}/${Date.now()}.${ext}`;
                const { error } = await supabase.storage.from('story-covers').upload(name, selectedCover, { contentType: selectedCover.type, upsert: false });
                if (error)
                    throw error;
                cover_url = supabase.storage.from('story-covers').getPublicUrl(name).data.publicUrl;
            }
            const values = { title: title.trim(), slug, id, synopsis: synopsis.trim(), genre: genre.trim() || 'Fiksi', status, is_published: published, is_featured: featured, cover_url };
            const q = existing ? supabase.from('qr_books').update(values).eq('id', existing.id) : supabase.from('qr_books').insert(values);
            const { data, error } = await q.select().single();
            if (error)
                throw error;
            onSaved(data as Book);
        }
        catch (e) {
            setError(errMsg(e));
        }
        finally {
            setBusy(false);
        }
    };
    return <form onSubmit={save} className="studio-panel studio-book-form"><h2>{existing ? 'Pengaturan novel' : 'Novel baru'}</h2><div className="studio-form-grid"><div className="studio-fieldset">
  <label className="studio-label">Judul cerita<input required maxLength={140} value={title} onChange={e => setTitle(e.target.value)} placeholder="Judul novelmu"/></label>
  <label className="studio-label">Alamat cerita (otomatis)<input readOnly value={slug} placeholder="judul-novel"/></label>
  <label className="studio-label">Sinopsis<textarea rows={5} maxLength={2500} value={synopsis} onChange={e => setSynopsis(e.target.value)} placeholder="Apa yang akan ditemukan pembaca di dalam cerita ini?"/></label>
  <div className="studio-form-pair"><label className="studio-label">Genre<input maxLength={70} value={genre} onChange={e => setGenre(e.target.value)}/></label><label className="studio-label">Status cerita<select value={status} onChange={e => setStatus(e.target.value as Book['status'])}><option value="ongoing">Berlangsung</option><option value="completed">Tamat</option><option value="hiatus">Jeda</option></select></label></div>
  <label className="studio-check"><input type="checkbox" checked={published} onChange={e => setPublished(e.target.checked)}/><span><strong>Tampilkan novel di perpustakaan</strong><small>Episode tetap tersembunyi sampai tanggal rilisnya.</small></span></label>
  <label className="studio-check"><input type="checkbox" checked={featured} onChange={e => setFeatured(e.target.checked)}/><span><strong>Jadikan cerita unggulan</strong><small>Prioritaskan di bagian utama beranda.</small></span></label>
 </div><div className="studio-cover-fields"><span className="studio-label-text">Sampul cerita</span><div className="studio-cover-preview"><Cover book={{ id: slug || 'new', title: title || 'Judul ceritamu', genre, cover_url: previewUrl || cover || privatePreview }} size="large"/></div><label className="studio-upload"><BrandIcon name="image-plus" size={18}/>{upload ? upload.name : 'Pilih sampul dari HP'}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => setUpload(e.target.files?.[0] || null)}/></label><p className="studio-small-muted">JPG, PNG, WebP · maks. 5 MB. Upload melalui pengaturan ini membuat sampul publik setelah konfirmasi.</p>{existing?.private_cover_path&&<label className="studio-check"><input type="checkbox" checked={publishPrivate} onChange={e=>setPublishPrivate(e.target.checked)}/><span>Publikasikan salinan sampul privat dari impor</span></label>}<label className="studio-label">Atau URL sampul<input value={cover} onChange={e => setCover(e.target.value)} type="url" placeholder="https://..."/></label></div></div>
 {error && <div className="studio-error" role="alert">{error}</div>}<button className="studio-primary" disabled={busy || !slug || !title.trim()} type="submit"><BrandIcon name="save" size={17}/>{busy ? 'Menyimpan…' : existing ? 'Simpan perubahan' : 'Buat novel'}</button></form>;
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
    return <><B to="/studio/cerita" className="studio-backlink"><BrandIcon name="arrow-left" size={16}/> Semua karya</B><div className="studio-page-head studio-head-with-action"><div><span className="studio-kicker">KELOLA NOVEL</span><h1>{book.title}</h1><p>{local.length} episode · {book.is_published ? 'Tayang di perpustakaan' : 'Draft (privat)'}</p></div><button onClick={onNew} className="studio-primary"><BrandIcon name="plus" size={16}/> Episode baru</button></div>
 <div className="studio-detail-tabs"><a href="#episodes">Daftar bab</a><a href="#book-sections">Halaman buku</a><a href="#bulk-publish">Terbit massal</a><a href="#settings">Pengaturan karya</a></div>
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
 <BookSections bookId={book.id}/><div id="settings"><BookForm existing={book} onSaved={onUpdate}/></div><section className="studio-panel v5-danger-zone"><h2>Pengelolaan novel</h2><p className="studio-muted">Pindahkan novel ke Sampah (bukan hapus permanen). Novel langsung menjadi privat, sedangkan semua episode dan halaman tetap tersimpan.</p><button type="button" className="studio-danger-lite" onClick={() => void onDelete()}><BrandIcon name="delete" size={16}/> Pindahkan novel ke Sampah</button></section></>;
}

