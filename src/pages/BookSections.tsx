import BrandIcon from '../components/BrandIcon';
import React, { useEffect, useRef, useState } from 'react';
import {useLeaveGuard} from '../hooks/useLeaveGuard';
import {mayLeave} from '../utils/nav';
import { loadBookSections, saveBookSection, type BookSection } from '../data/bookSections';
import { trashItem } from '../data/trash';
const errorMessage = (error: unknown) => error instanceof Error ? error.message : String(error);
export default function BookSections({ bookId }: {
    bookId: string;
}) {
    const [items, setItems] = useState<BookSection[]>([]);
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<BookSection | null>(null);
    const [title, setTitle] = useState('Kata Pengantar');
    const [body, setBody] = useState('');
    const [type, setType] = useState<'frontmatter' | 'arc'>('frontmatter');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const baseline=useRef('');
    const snapshot=JSON.stringify({title,body,type});
    useLeaveGuard(busy||(open&&snapshot!==baseline.current),()=>!busy&&(!open||snapshot===baseline.current||window.confirm('Tinggalkan halaman buku yang belum disimpan?')));
    const reload = async () => { setItems(await loadBookSections(bookId)); };
    useEffect(() => { let live = true; loadBookSections(bookId).then(items => { if (live)
        setItems(items); }).catch(e => { if (live)
        setError(`Halaman buku belum dapat dimuat: ${errorMessage(e)}. Pastikan migrasi V5 sudah terpasang.`); }); return () => { live = false; }; }, [bookId]);
    const edit = async (item?: BookSection) => { if(!(await mayLeave()))return;baseline.current=JSON.stringify({title:item?.title??'Kata Pengantar',body:item?.content_md??'',type:item?.section_type??'frontmatter'});setEditing(item ?? null); setTitle(item?.title ?? 'Kata Pengantar'); setBody(item?.content_md ?? ''); setType(item?.section_type ?? 'frontmatter'); setError(''); setOpen(true); };
    const save = async () => {
        setBusy(true);
        setError('');
        setMessage('');
        try {
            await saveBookSection({ id: editing?.id, book_id: bookId, title, content_md: body, section_type: type });
            await reload();
            baseline.current=snapshot;
            setOpen(false);
            setMessage('Halaman buku berhasil disimpan.');
        }
        catch (e) {
            setError(errorMessage(e));
        }
        finally {
            setBusy(false);
        }
    };
    const remove = async (item: BookSection) => {
        if (!window.confirm(`Pindahkan halaman “${item.title}” ke Sampah? Kamu masih bisa memulihkannya.`))
            return;
        setBusy(true);
        setError('');
        try {
            await trashItem('section', item.id);
            await reload();
            setMessage('Halaman dipindahkan ke Sampah.');
        }
        catch (e) {
            setError(errorMessage(e));
        }
        finally {
            setBusy(false);
        }
    };
    return <section className="studio-panel v5-book-sections" id="book-sections">
  <div className="studio-panel-top"><h2>Halaman buku</h2><button className="studio-light-button" onClick={() => edit()}><BrandIcon name="file-plus" size={16}/> Tambah halaman</button></div>
  <p className="studio-muted">Simpan kata pengantar, dedikasi, atau catatan penulis terpisah dari episode. Semua halaman baru bersifat privat di Studio.</p>
  {error && <p className="studio-error" role="alert">{error}</p>}{message && <p className="studio-success" role="status">{message}</p>}
  {items.length ? <div className="v5-section-list">{items.map(item => <div key={item.id} className="v5-section-row"><BrandIcon name="book-text" size={19}/><span><strong>{item.title}</strong><small>{item.section_type === 'arc' ? 'Pemisah bagian' : 'Materi depan'} · {item.content_md.trim().split(/\s+/).length} kata</small></span><button className="studio-light-button" onClick={() => edit(item)}>Edit</button><button className="studio-danger-lite" disabled={busy} onClick={() => void remove(item)} aria-label={`Hapus ${item.title}`}>Hapus</button></div>)}</div> : <p className="studio-muted">Belum ada halaman tambahan. Kamu bisa menambahkannya di sini atau melalui impor EPUB.</p>}
  {open && <div className="v5-section-editor"><div className="studio-panel-top"><h3>{editing ? 'Edit halaman' : 'Halaman baru'}</h3><button className="studio-light-button" disabled={busy} onClick={() => void mayLeave().then(allowed=>{if(allowed)setOpen(false);})} aria-label="Tutup editor"><BrandIcon name="close" size={17}/></button></div>
   <label className="studio-label">Jenis halaman<select value={type} onChange={e => setType(e.target.value as 'frontmatter' | 'arc')}><option value="frontmatter">Halaman awal / catatan</option><option value="arc">Pemisah bagian</option></select></label>
   <label className="studio-label">Judul<input maxLength={180} value={title} onChange={e => setTitle(e.target.value)}/></label>
   <label className="studio-label">Isi Markdown<textarea aria-label="Isi Markdown" rows={9} value={body} onChange={e => setBody(e.target.value)} placeholder="Tulis kata pengantar atau dedikasi di sini…"/></label>
   <button className="studio-primary" disabled={busy || !title.trim() || !body.trim()} onClick={() => void save()}><BrandIcon name="save" size={16}/>{busy ? 'Menyimpan…' : 'Simpan halaman'}</button>
  </div>}
 </section>;
}
