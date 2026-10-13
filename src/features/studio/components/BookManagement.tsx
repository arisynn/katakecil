import React, { useEffect, useState } from 'react';
import { ArrowLeft, Check, ChevronRight, FilePlus2, ImagePlus, Library, Plus, Save, Send, Trash2, UploadCloud } from 'lucide-react';
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
    return <><div className="studio-page-head studio-head-with-action"><div><span className="studio-kicker">KELOLA SEMUA KARYA</span><h1>Rak <i>ceritamu.</i></h1><p>Kelola novel, sampul, dan episode dalam satu tempat.</p></div>{books.length > 0 && <button onClick={onCreate} className="studio-primary"><Plus size={17}/> Novel baru</button>}</div>
 {books.length ? <div className="studio-manage-list">{books.map(b => <B key={b.id} to={`/studio/cerita/${b.id}`} className="studio-manage-item"><Cover book={b} size="mini"/><span><strong>{b.title}</strong><small>{b.genre} · {episodes.filter(e => e.book_id === b.id).length} episode</small><em>{b.is_published ? 'Tayang di perpustakaan' : 'Draft (privat)'} · {BOOK_STATUS[b.status]}</em></span><ChevronRight size={20}/></B>)}</div> : <div className="studio-big-empty"><Library size={30}/><h2>Sebuah dunia menunggu ditulis.</h2><p>Mulailah dengan membuat novel pertama.</p><button onClick={onCreate} className="studio-primary"><Plus size={18}/> Buat novel</button></div>}
 </>;
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
            if (upload) {
                if (!['image/jpeg', 'image/png', 'image/webp'].includes(upload.type))
                    throw new Error('Gunakan gambar JPG, PNG, atau WebP.');
                if (upload.size > 5242880)
                    throw new Error('Maksimum sampul 5 MB.');
                const ext = upload.type === 'image/png' ? 'png' : upload.type === 'image/webp' ? 'webp' : 'jpg';
                const name = `${id}/${Date.now()}.${ext}`;
                const { error } = await supabase.storage.from('story-covers').upload(name, upload, { contentType: upload.type, upsert: false });
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
 </div><div className="studio-cover-fields"><span className="studio-label-text">Sampul cerita</span><div className="studio-cover-preview"><Cover book={{ id: slug || 'new', title: title || 'Judul ceritamu', genre, cover_url: previewUrl || cover }} size="large"/></div><label className="studio-upload"><ImagePlus size={18}/>{upload ? upload.name : 'Pilih sampul dari HP'}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => setUpload(e.target.files?.[0] || null)}/></label><p className="studio-small-muted">JPG, PNG, WebP · maks. 5 MB</p><label className="studio-label">Atau URL sampul<input value={cover} onChange={e => setCover(e.target.value)} type="url" placeholder="https://..."/></label></div></div>
 {error && <div className="studio-error" role="alert">{error}</div>}<button className="studio-primary" disabled={busy || !slug || !title.trim()} type="submit"><Save size={17}/>{busy ? 'Menyimpan…' : existing ? 'Simpan perubahan' : 'Buat novel'}</button></form>;
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
    const blankDrafts = drafts.filter(e => !e.content_md.trim());
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
    return <><B to="/studio/cerita" className="studio-backlink"><ArrowLeft size={16}/> Semua karya</B><div className="studio-page-head studio-head-with-action"><div><span className="studio-kicker">KELOLA NOVEL</span><h1>{book.title}</h1><p>{local.length} episode · {book.is_published ? 'Tayang di perpustakaan' : 'Draft (privat)'}</p></div><button onClick={onNew} className="studio-primary"><Plus size={16}/> Episode baru</button></div>
 <div className="studio-detail-tabs"><a href="#bulk-publish">Penerbitan cepat</a><a href="#episodes">Daftar episode</a><a href="#book-sections">Halaman buku</a><a href="#settings">Pengaturan novel</a></div>
 <section className="studio-panel kk-bulk-panel" id="bulk-publish" aria-label="Penerbitan episode sekaligus">
   <div className="studio-panel-top"><h2>Terbitkan sekaligus</h2><Send size={19}/></div>
   <p className="studio-muted">{drafts.length} draft dari {local.length} episode. Terbitkan seluruh draft novel tamat tanpa membuka editor satu per satu. Episode terjadwal tetap mengikuti jadwalnya.</p>
   {blankDrafts.length > 0 && <p className="studio-warning" role="alert">Ada {blankDrafts.length} draft tanpa isi. Lengkapi semuanya sebelum terbit massal.</p>}
   {publishError && <div className="studio-error" role="alert">{publishError}</div>}
   {publishNotice && <div className="studio-success" role="status">{publishNotice}</div>}
   <div className="kk-bulk-actions">
     <button type="button" className="studio-light-button" disabled={publishing || !drafts.length || !!blankDrafts.length} onClick={() => void publish(false)}><Send size={16}/> {publishing ? 'Menerbitkan…' : `Terbitkan semua ${drafts.length} draft`}</button>
     <button type="button" className="studio-primary" disabled={publishing || !local.length || !!blankDrafts.length} onClick={() => void publish(true)}><Check size={16}/> {publishing ? 'Memproses…' : 'Tandai Tamat & Terbitkan Draft'}</button>
   </div>
   <small className="studio-muted">Hanya setelah konfirmasi. Jika proses gagal, transaksi database membatalkan seluruh perubahan.</small>
 </section>
 <section className="studio-panel" id="episodes"><div className="studio-panel-top"><h2>Daftar episode</h2><B to={`/studio/impor?book=${encodeURIComponent(book.id)}`} className="studio-text-button"><UploadCloud size={16}/> Impor EPUB / MD</B></div>
 
 {local.length ? <div className="studio-episode-stack">{local.map(ep => <B key={ep.id} to={`/studio/editor/${ep.id}`} className="studio-episode-item"><span className="studio-episode-index">{String(ep.episode_number).padStart(2, '0')}</span><span className="studio-episode-text"><strong>{ep.title}</strong><small>{ep.arc_title || 'Tanpa arc'}{ep.is_finale ? ' · Finale' : ''}{episodeStatus(ep) === 'Terjadwal' ? ` · ${formatWib(ep.release_at)}` : ''}</small></span><Pill episode={ep}/><ChevronRight size={17}/></B>)}</div> : <p className="studio-muted">Belum ada episode. Buat episode baru atau impor EPUB/Markdown melalui Smart Import Studio.</p>}
 {!local.some(e => e.episode_number === 0) && <button onClick={onNewZero} className="studio-light-button"><FilePlus2 size={16}/> Buat Episode 0</button>}</section>
 <BookSections bookId={book.id}/><div id="settings"><BookForm existing={book} onSaved={onUpdate}/></div><section className="studio-panel v5-danger-zone"><h2>Pengelolaan novel</h2><p className="studio-muted">Pindahkan novel ke Sampah (bukan hapus permanen). Novel langsung menjadi privat, sedangkan semua episode dan halaman tetap tersimpan.</p><button type="button" className="studio-danger-lite" onClick={() => void onDelete()}><Trash2 size={16}/> Pindahkan novel ke Sampah</button></section></>;
}

