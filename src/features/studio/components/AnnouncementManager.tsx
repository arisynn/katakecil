import BrandIcon from '../../../components/BrandIcon';
import React, { useCallback, useEffect, useState } from 'react';
import type { Book } from '../../../data/library';
import {
  deleteAnnouncement, getStudioAnnouncements, saveAnnouncement,
  type AnnouncementInput, type StudioAnnouncement,
} from '../../../data/announcements';
import { navigate } from '../../../utils/nav';

function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}
function toIso(local: string): string | null {
  if (!local) return null;
  const date = new Date(local);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}
function newDraft(): AnnouncementInput {
  return {
    title: '', body: '', book_id: null, status: 'draft',
    starts_at: new Date().toISOString(), ends_at: null,
  };
}
function announcementState(item: StudioAnnouncement, now = Date.now()): string {
  if (item.status === 'draft') return 'Draft';
  if (Date.parse(item.starts_at) > now) return 'Terjadwal';
  if (item.ends_at && Date.parse(item.ends_at) <= now) return 'Berakhir';
  return 'Tayang';
}
const timeLabel = (iso: string) => new Intl.DateTimeFormat('id-ID', {
  timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short', year: 'numeric',
  hour: '2-digit', minute: '2-digit', hour12: false,
}).format(new Date(iso)) + ' WIB';

export default function AnnouncementManager({ books }: { books: Book[] }) {
  const [items, setItems] = useState<StudioAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const [draft, setDraft] = useState<AnnouncementInput>(newDraft);
  const [startInput, setStartInput] = useState(() => toLocalInput(new Date().toISOString()));
  const [endInput, setEndInput] = useState('');
  const load = useCallback(async () => {
    try { setItems(await getStudioAnnouncements()); setError(''); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const edit = (item?: StudioAnnouncement) => {
    const next = item ? {
      title: item.title, body: item.body, book_id: item.book_id,
      status: item.status, starts_at: item.starts_at, ends_at: item.ends_at,
    } : newDraft();
    setDraft(next);
    setStartInput(toLocalInput(next.starts_at));
    setEndInput(toLocalInput(next.ends_at));
    setEditing(item?.id ?? 'new');
    setError(''); setMessage('');
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const start = toIso(startInput);
    if (!start) { setError('Tanggal mulai tidak valid.'); return; }
    if (endInput && !toIso(endInput)) { setError('Tanggal selesai tidak valid.'); return; }
    setBusy(true); setError(''); setMessage('');
    try {
      await saveAnnouncement({ ...draft, starts_at: start, ends_at: toIso(endInput) }, editing === 'new' ? undefined : editing ?? undefined);
      setEditing(null);
      await load();
      setMessage('Pengumuman berhasil disimpan.');
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  };
  const remove = async (item: StudioAnnouncement) => {
    if (!window.confirm(`Hapus pengumuman “${item.title}”? Tindakan ini tidak bisa dibatalkan.`)) return;
    setBusy(true); setError(''); setMessage('');
    try { await deleteAnnouncement(item.id); if (editing === item.id) setEditing(null); await load(); setMessage('Pengumuman dihapus.'); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  };
  return <div className="kk-v73-announcements">
    <header className="studio-page-head kk-v73-head">
      <span className="studio-kicker">KABAR DARI PENULIS</span>
      <h1>Pengumuman</h1>
      <p>Kelola pesan yang tampil di carousel Temukan. Hanya pengumuman terbit dalam rentang tanggal aktif yang bisa dilihat pembaca.</p>
      <button className="studio-primary" type="button" onClick={() => edit()} disabled={busy}>
        <BrandIcon name="plus" size={18}/> Pengumuman Baru
      </button>
    </header>
    {error && <div role="alert" className="studio-error">{error}{error.includes('qr_announcements') && <p>Jalankan migrasi V7 Alpha.3 di Supabase terlebih dahulu.</p>}</div>}
    {message && <p className="studio-success" role="status">{message}</p>}
    {editing !== null && <form className="kk-v73-editor" onSubmit={event => void save(event)}>
      <div className="kk-v73-editor-title">
        <h2>{editing === 'new' ? 'Buat Pengumuman' : 'Edit Pengumuman'}</h2>
        <button type="button" className="studio-light-button" onClick={() => setEditing(null)} disabled={busy}><BrandIcon name="arrow-left" size={16}/> Batal</button>
      </div>
      <label>Judul <small>maksimal 120 karakter</small>
        <input required maxLength={120} value={draft.title} onChange={event => setDraft(prev => ({ ...prev, title: event.target.value }))} placeholder="Misalnya: Bab terbaru sudah terbit"/>
      </label>
      <label>Pesan singkat <small>{draft.body.length}/320</small>
        <textarea maxLength={320} rows={3} value={draft.body} onChange={event => setDraft(prev => ({ ...prev, body: event.target.value }))} placeholder="Tulis informasi untuk pembaca…"/>
      </label>
      <label>Tautkan cerita (opsional)
        <select value={draft.book_id ?? ''} onChange={event => setDraft(prev => ({ ...prev, book_id: event.target.value || null }))}>
          <option value="">Tanpa tautan</option>
          {books.filter(book => book.is_published && !book.deleted_at).map(book => <option key={book.id} value={book.id}>{book.title}</option>)}
        </select>
      </label>
      <div className="kk-v73-dates">
        <label>Mulai tampil <input type="datetime-local" required value={startInput} onChange={event => setStartInput(event.target.value)}/></label>
        <label>Berakhir (opsional) <input type="datetime-local" value={endInput} min={startInput} onChange={event => setEndInput(event.target.value)}/></label>
      </div>
      <p className="kk-v73-hint"><BrandIcon name="calendar-clock" size={15}/> Jadwal dimasukkan sesuai zona waktu perangkatmu. Waktu ditampilkan sebagai WIB pada daftar.</p>
      <label>Status
        <select value={draft.status} onChange={event => setDraft(prev => ({ ...prev, status: event.target.value as AnnouncementInput['status'] }))}>
          <option value="draft">Draft — hanya terlihat di Studio</option>
          <option value="published">Terbit — tampil sesuai jadwal</option>
        </select>
      </label>
      <div className="kk-v73-actions"><button className="studio-primary" type="submit" disabled={busy}><BrandIcon name="save" size={17}/>{busy ? 'Menyimpan…' : 'Simpan Pengumuman'}</button></div>
    </form>}
    <section className="kk-v73-list" aria-label="Daftar pengumuman">
      <h2>Daftar Pengumuman</h2>
      {loading ? <p className="studio-muted">Memuat pengumuman…</p> : items.length === 0 ? <div className="kk-v73-list-empty"><BrandIcon name="megaphone" size={28}/><p>Belum ada pengumuman. Buat pengumuman pertama untuk pembaca.</p></div> :
        items.map(item => <article className="kk-v73-item" key={item.id}>
          <div className="kk-v73-item-main"><span className="kk-v73-status">{announcementState(item)}</span><h3>{item.title}</h3>
            {item.body && <p>{item.body}</p>}
            <small>Mulai {timeLabel(item.starts_at)}{item.ends_at ? ` · Selesai ${timeLabel(item.ends_at)}` : ''}</small>
          </div>
          <div className="kk-v73-item-actions">
            <button type="button" className="studio-light-button" onClick={() => edit(item)} disabled={busy}>Edit</button>
            <button type="button" className="studio-danger-lite" onClick={() => void remove(item)} disabled={busy} aria-label={`Hapus pengumuman ${item.title}`}><BrandIcon name="delete" size={16}/></button>
          </div>
        </article>)}
    </section>
    <button type="button" className="studio-text-button" onClick={() => navigate('/temukan')}>Lihat halaman Temukan</button>
  </div>;
}
