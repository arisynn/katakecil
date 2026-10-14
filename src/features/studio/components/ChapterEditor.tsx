import BrandIcon from '../../../components/BrandIcon';
import { useCallback, useEffect, useRef, useState } from 'react';
import ReaderApp from '../../../ReaderApp';
import {useLeaveGuard} from '../../../hooks/useLeaveGuard';
import { supabase } from '../../../data/supabase';
import { episodeStatus, type Book, type Episode } from '../../../data/library';
import { toWibInput } from '../../../utils/releasePlanning';
import { navigate } from '../../../utils/nav';
import { Pill, errMsg } from './StudioShared';

type Manuscript = { title: string; arc: string; body: string };
const same = (a: Manuscript, b: Manuscript) =>
  a.title === b.title && a.arc === b.arc && a.body === b.body;

export default function ChapterEditor({ ep, book, onUpdate, onDelete }: {
  ep: Episode;
  book: Book;
  onUpdate: (value: Episode) => void;
  onDelete: () => Promise<void>;
}) {
  const version=useRef(ep.updated_at);
  const manuscriptRef = useRef<HTMLTextAreaElement>(null);
  const [title, setTitle] = useState(ep.title);
  const [arc, setArc] = useState(ep.arc_title);
  const [body, setBody] = useState(ep.content_md);
  const [status, setStatus] = useState('Tersimpan');
  const [error, setError] = useState('');
  const [schedule, setSchedule] = useState(toWibInput(ep.release_at));
  const [preview, setPreview] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const lastSaved = useRef<Manuscript>({ title: ep.title, arc: ep.arc_title, body: ep.content_md });
  const current = useRef<Manuscript>({ title, arc, body });
  current.current = { title, arc, body };
  const queue = useRef<Promise<void>>(Promise.resolve());
  const lastSaveFailed = useRef(false);
  const mounted = useRef(true);
  const dirty = !same(current.current, lastSaved.current);
  const wordCount = body.trim() ? body.trim().split(/\s+/u).length : 0;
  const isLive = episodeStatus(ep) === 'Terbit';

  useEffect(() => {mounted.current=true;return()=>{ mounted.current = false; };}, []);

  const save = useCallback(async (): Promise<boolean> => {
    if (!supabase) return false;
    const snapshot = { ...current.current };
    if (same(snapshot, lastSaved.current)) {
      try { await queue.current; return same(current.current, lastSaved.current); }
      catch { return false; }
    }
    lastSaveFailed.current = false;
    setStatus('Menyimpan…');
    const action = async () => {
      const { data, error: dbError } = await supabase!.from('qr_episodes')
        .update({
          title: snapshot.title.trim() || `Episode ${ep.episode_number}`,
          arc_title: snapshot.arc,
          content_md: snapshot.body,
        })
        .eq('id', ep.id).eq('updated_at',version.current).is('deleted_at',null)
        .select('id,book_id,episode_number,arc_title,title,release_at,is_enabled,created_at,updated_at')
        .single();
      if(dbError)throw Error(dbError.code==='PGRST116'?'Bab berubah di tab lain atau dipindahkan ke Sampah. Salin perubahan lokal sebelum memuat ulang; isi terbaru tidak ditimpa.':dbError.message);
      version.current=data.updated_at;
      lastSaved.current = snapshot;
      onUpdate({ ...data, content_md: snapshot.body, is_finale: ep.is_finale } as Episode);
      if (mounted.current) {
        setError('');
        setStatus(same(current.current, snapshot) ? 'Tersimpan' : 'Belum disimpan');
      }
    };
    const run = queue.current.catch(() => undefined).then(action);
    queue.current = run;
    try { await run; return same(current.current, lastSaved.current); }
    catch (caught) {
      lastSaveFailed.current = true;
      if (mounted.current) {
        setError(`Gagal menyimpan naskah: ${errMsg(caught)}`);
        setStatus('Gagal menyimpan');
      }
      return false;
    }
  }, [ep.id, ep.episode_number, ep.is_finale, onUpdate]);

  const latestSave = useRef(save);
  latestSave.current = save;
  const flush = useCallback(async () => {
    // A change can arrive while a previous snapshot is in flight.
    for (let attempt = 0; attempt < 3; attempt += 1) {
      if (await latestSave.current()) return true;
      if (lastSaveFailed.current) break;
    }
    return same(current.current, lastSaved.current);
  }, []);
  const latestFlush = useRef(flush);
  latestFlush.current = flush;

  useEffect(() => {
    if (!dirty) return;
    const timer = window.setTimeout(() => { void save(); }, 1700);
    return () => window.clearTimeout(timer);
  }, [dirty, title, arc, body, save]);

  useLeaveGuard(dirty || publishing, async () => {
    if(publishing)return false;
    return await latestFlush.current();
  });

  const updateRelease = async (mode: 'now' | 'schedule' | 'draft') => {
    if (!supabase || publishing) return;
    setPublishing(true);
    setError('');
    try {
      if (!(await latestFlush.current()))
        throw new Error('Naskah belum berhasil disimpan. Periksa koneksi dan coba lagi.');
      let release_at: string | null = null;
      let is_enabled = false;
      if (mode === 'now') {
        release_at = new Date().toISOString();
        is_enabled = true;
      }
      if (mode === 'schedule') {
        if (!schedule) throw new Error('Pilih tanggal dan jam rilis terlebih dahulu.');
        const when = new Date(`${schedule}:00+07:00`);
        if (Number.isNaN(when.getTime()) || when.getTime() <= Date.now())
          throw new Error('Jadwal harus berada di masa depan (WIB).');
        release_at = when.toISOString();
        is_enabled = true;
        if (ep.is_enabled && ep.release_at && ep.release_at !== release_at &&
          !window.confirm('Ganti jadwal publikasi yang sudah ada?')) return;
      }
      const confirmation = mode === 'now'
        ? `Terbitkan “${title || `Episode ${ep.episode_number}`}” sekarang? ${book.is_published ? 'Pembaca dapat langsung mengaksesnya.' : 'Novel masih privat.'}`
        : mode === 'schedule'
          ? `Jadwalkan bab ini untuk ${schedule.replace('T', ' ')} WIB?`
          : 'Tarik bab ini dari publik dan kembalikan menjadi draft?';
      if (!window.confirm(confirmation)) return;
      const { data, error: dbError } = await supabase.from('qr_episodes')
        .update({ release_at, is_enabled }).eq('id', ep.id).eq('updated_at',version.current).is('deleted_at',null)
        .select('id,book_id,episode_number,arc_title,title,release_at,is_enabled,created_at,updated_at')
        .single();
      if(dbError)throw Error(dbError.code==='PGRST116'?'Bab berubah di tab lain atau dipindahkan ke Sampah. Salin perubahan lokal sebelum memuat ulang; isi terbaru tidak ditimpa.':dbError.message);
      version.current=data.updated_at;
      onUpdate({ ...data, content_md: current.current.body, is_finale: ep.is_finale } as Episode);
      setStatus(mode === 'now' ? 'Diterbitkan' : mode === 'schedule' ? 'Terjadwal' : 'Menjadi draft');
      setReviewOpen(false);
    } catch (caught) { setError(errMsg(caught)); }
    finally { setPublishing(false); }
  };

  const importOne = async (file?: File) => {
    if (!file) return;
    if (file.size > 2_000_000) { setError('File Markdown maksimal 2 MB.'); return; }
    try {
      const imported = await file.text();
      if (body.trim() && !window.confirm('Ganti seluruh isi bab dengan berkas ini? Isi yang belum disimpan akan diganti.')) return;
      setBody(imported);
      setStatus('Belum disimpan');
    } catch (caught) { setError(errMsg(caught)); }
  };
  const insertMarkdown = (before: string, after = '', placeholder = 'teks') => {
    const node = manuscriptRef.current;
    if (!node) return;
    const start = node.selectionStart;
    const end = node.selectionEnd;
    const selection = body.slice(start, end) || placeholder;
    setBody(body.slice(0, start) + before + selection + after + body.slice(end));
    setStatus('Belum disimpan');
    requestAnimationFrame(() => {
      node.focus();
      node.setSelectionRange(start + before.length, start + before.length + selection.length);
    });
  };
  const makePreview = () => ({
    id: `preview-${ep.id}`,
    title: book.title,
    path: '',
    content: body,
    episodeNumbers: [ep.episode_number],
    previewEpisode: {episodeNumber:ep.episode_number,title:title||`Episode ${ep.episode_number}`,arc,content:body||'Belum ada isi episode.'},
  });
  if (preview) return <ReaderApp key={`${ep.id}-preview`} bookId={`preview-${ep.id}`}
    bookTitle={book.title} episodeNumber={ep.episode_number} onExit={() => setPreview(false)} previewStory={makePreview()}/>;

  return <div className={`v69-writing-shell ${focusMode ? 'v69-focus-mode' : ''}`}>
    <div className="v69-editor-top">
      <button className="v69-icon-button" type="button" aria-label="Kembali ke karya"
        onClick={() => navigate(`/studio/cerita/${book.id}`)}><BrandIcon name="arrow-left" size={20}/></button>
      <div className="v69-editor-heading"><span>{book.title} · BAB {ep.episode_number}</span>
        <strong aria-live="polite" className={status === 'Gagal menyimpan' ? 'v69-save-error' : ''}>
          {dirty && status === 'Tersimpan' ? 'Belum disimpan' : status}
        </strong>
      </div>
      <div className="v69-editor-actions">
        {status === 'Gagal menyimpan' && <button type="button" className="kk-v71-save-retry" aria-label="Coba simpan ulang" onClick={() => void latestFlush.current()}><BrandIcon name="rotate" size={16}/><span>Coba simpan</span></button>}
        <button type="button" className="v69-icon-button" title="Pratinjau" aria-label="Pratinjau"
          onClick={() => setPreview(true)}><BrandIcon name="eye" size={19}/></button>
        <button type="button" className="v69-icon-button" title="Mode fokus" aria-label={focusMode ? 'Keluar mode fokus' : 'Mode fokus'}
          aria-pressed={focusMode} onClick={() => { setFocusMode(value => !value); setReviewOpen(false); }}><BrandIcon name="focus" size={19}/></button>
      </div>
    </div>

    {error && <div className="studio-error kk-v71-editor-alert" role="alert">{error}</div>}
    {isLive && <p className="v69-live-notice" role="note">Bab ini sudah terbit. Perubahan yang tersimpan akan langsung terlihat oleh pembaca.</p>}
    <div className="v69-editor-layout">
      <section className="v69-writing-paper" aria-label="Kanvas menulis">
        <span className="v69-chapter-kicker">BAB {ep.episode_number}</span>
        <label className="v69-visually-hidden" htmlFor="v69-chapter-title">Judul bab</label>
        <input id="v69-chapter-title" className="v69-chapter-title" maxLength={180}
          value={title} onChange={event => { setTitle(event.target.value); setStatus('Belum disimpan'); }}
          placeholder="Judul bab"/>
        <label className="v69-visually-hidden" htmlFor="v69-chapter-arc">Arc / bagian (opsional)</label>
        <input id="v69-chapter-arc" className="v69-chapter-arc" maxLength={180}
          value={arc} onChange={event => { setArc(event.target.value); setStatus('Belum disimpan'); }}
          placeholder="Arc / bagian (opsional)"/>
        <div className="v69-editor-toolbar" role="toolbar" aria-label="Format Markdown">
          <button type="button" title="Tebal" aria-label="Tebal" onClick={() => insertMarkdown('**', '**')}><BrandIcon name="bold" size={17}/></button>
          <button type="button" title="Miring" aria-label="Miring" onClick={() => insertMarkdown('*', '*')}><BrandIcon name="italic" size={17}/></button>
          <button type="button" title="Judul bagian" aria-label="Judul bagian" onClick={() => insertMarkdown('## ')}><BrandIcon name="heading" size={18}/></button>
          <button type="button" title="Daftar" aria-label="Daftar" onClick={() => insertMarkdown('- ')}><BrandIcon name="list" size={17}/></button>
          <button type="button" title="Kutipan" aria-label="Kutipan" onClick={() => insertMarkdown('> ')}><BrandIcon name="quote" size={17}/></button>
        </div>
        <textarea ref={manuscriptRef} className="studio-manuscript v69-manuscript"
          aria-label="Isi bab dalam Markdown" spellCheck
          placeholder="Mulai menulis kisahmu di sini…"
          value={body} onChange={event => { setBody(event.target.value); setStatus('Belum disimpan'); }}/>
        <div className="v69-writing-footer">
          <span>{wordCount.toLocaleString('id-ID')} kata</span>
          <span role="status"><BrandIcon name={status === 'Gagal menyimpan' ? 'alert' : 'check-circle'} size={15}/>{status === 'Gagal menyimpan' ? status : dirty && status !== 'Menyimpan…' ? 'Belum disimpan · Autosave aktif' : status}</span>
        </div>
        <details className="v69-editor-extra"><summary>Alat tambahan</summary>
          <label className="v69-import-file"><BrandIcon name="upload" size={16}/> Impor Markdown / TXT
            <input type="file" accept=".md,.txt,text/markdown,text/plain"
              onChange={event => { void importOne(event.target.files?.[0]); event.target.value = ''; }}/>
          </label>
          <p>Impor ke bab ini akan mengganti isi sebelumnya setelah konfirmasi.</p>
        </details>
      </section>

      {!focusMode && <aside className="v69-editor-workflow" aria-label="Pemeriksaan dan publikasi">
        <div className="v69-editor-workflow-intro">
          <span className="studio-kicker">ALUR PENULIS</span>
          <h2>Menulis dulu. Terbitkan nanti.</h2>
          <p>Perubahan tersimpan otomatis. Periksa naskah sebelum pembaca melihatnya.</p>
        </div>
        <div className="v69-editor-workflow-status"><Pill episode={ep}/>
          <span>{dirty ? 'Ada perubahan lokal' : status}</span>
        </div>
        {status === 'Gagal menyimpan' && <button type="button" className="studio-light-button"
          onClick={() => void latestFlush.current()}><BrandIcon name="rotate" size={16}/> Coba simpan lagi</button>}
        <button type="button" className="studio-primary v69-finish-writing"
          onClick={() => setReviewOpen(value => !value)} aria-expanded={reviewOpen}>
          {reviewOpen ? 'Tutup Pemeriksaan' : 'Selesai Menulis'} <BrandIcon name="arrow-right" size={17}/>
        </button>
        {reviewOpen && <div className="v69-publish-review">
          <h3>Periksa sebelum terbit</h3>
          <ul>
            <li><BrandIcon name="check-circle" size={17}/> Judul {title.trim() ? 'sudah diisi' : 'belum diisi'}</li>
            <li><BrandIcon name="check-circle" size={17}/> {wordCount} kata dalam naskah</li>
            <li><BrandIcon name="eye" size={17}/> Periksa dialog, alur, dan typo melalui pratinjau</li>
          </ul>
          {isLive && <p className="studio-warning">Bab ini sudah publik. Perubahan isi yang tersimpan langsung terlihat oleh pembaca.</p>}
          {!book.is_published && <p className="studio-warning">Novel masih privat. Pembaca belum dapat mengakses bab yang diterbitkan.</p>}
          <label className="studio-label">Tanggal & jam rilis (WIB)
            <input type="datetime-local" value={schedule} onChange={event => setSchedule(event.target.value)}/>
          </label>
          <button type="button" className="studio-light-button" disabled={publishing || !body.trim()}
            onClick={() => void updateRelease('schedule')}><BrandIcon name="calendar" size={17}/> Jadwalkan</button>
          <button type="button" className="studio-primary" disabled={publishing || !body.trim()}
            onClick={() => void updateRelease('now')}><BrandIcon name="send" size={17}/> Terbitkan sekarang</button>
          <p className="studio-publish-hint"><BrandIcon name="shield" size={15}/> Tidak ada publikasi tanpa konfirmasi.</p>
        </div>}
        <details className="v69-editor-danger"><summary>Pengelolaan bab</summary>
          {episodeStatus(ep) !== 'Draft' && <button type="button" className="studio-danger-lite"
            disabled={publishing} onClick={() => void updateRelease('draft')}>
            <BrandIcon name="lock" size={16}/> Tarik ke draft
          </button>}
          <button type="button" className="studio-danger-lite" disabled={publishing || dirty}
            onClick={() => void onDelete()}><BrandIcon name="delete" size={16}/> Pindahkan ke Sampah</button>
          {dirty && <small>Simpan perubahan sebelum memindahkan bab ke Sampah.</small>}
        </details>
      </aside>}
    </div>
  </div>;
}
