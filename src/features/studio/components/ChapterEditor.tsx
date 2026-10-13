import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Bold, BookOpen, CalendarDays, Eye, Heading2, Italic, List, LockKeyhole, Quote, Save, Send, ShieldCheck, Trash2, UploadCloud } from 'lucide-react';
import ReaderApp from '../../../ReaderApp';
import { supabase } from '../../../data/supabase';
import { episodeStatus, type Book, type Episode } from '../../../data/library';
import { toWibInput } from '../../../utils/releasePlanning';
import { B, Pill, errMsg } from './StudioShared';
export default function ChapterEditor({ ep, book, onUpdate, onDelete }: {
    ep: Episode;
    book: Book;
    onUpdate: (value: Episode) => void;
    onDelete: () => Promise<void>;
}) {
    const manuscriptRef = useRef<HTMLTextAreaElement>(null);
    const [title, setTitle] = useState(ep.title);
    const [arc, setArc] = useState(ep.arc_title);
    const [body, setBody] = useState(ep.content_md);
    const [status, setStatus] = useState('Tersimpan');
    const [error, setError] = useState('');
    const [schedule, setSchedule] = useState(toWibInput(ep.release_at));
    const [preview, setPreview] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const lastSaved = useRef({ title: ep.title, arc: ep.arc_title, body: ep.content_md });
    const queue = useRef<Promise<void>>(Promise.resolve());
    const mounted = useRef(true);
    useEffect(() => () => { mounted.current = false; }, []);
    const dirty = title !== lastSaved.current.title || arc !== lastSaved.current.arc || body !== lastSaved.current.body;
    const save = useCallback(async () => {
        if (!supabase)
            return;
        const snapshot = { title, arc, body };
        if (snapshot.title === lastSaved.current.title && snapshot.arc === lastSaved.current.arc && snapshot.body === lastSaved.current.body)
            return queue.current;
        setStatus('Menyimpan…');
        const action = async () => { const { data, error } = await supabase!.from('qr_episodes').update({ title: snapshot.title.trim() || `Episode ${ep.episode_number}`, arc_title: snapshot.arc, content_md: snapshot.body }).eq('id', ep.id).select('id,book_id,episode_number,arc_title,title,release_at,is_enabled,created_at,updated_at').single(); if (error)
            throw error; lastSaved.current = snapshot; onUpdate({ ...data, content_md: snapshot.body, is_finale: ep.is_finale } as Episode); if (mounted.current)
            setStatus('Tersimpan'); };
        const run = queue.current.catch(() => { }).then(action);
        queue.current = run;
        try {
            await run;
        }
        catch (e) {
            if (mounted.current) {
                setError(errMsg(e));
                setStatus('Gagal menyimpan');
            }
        }
        ;
    }, [title, arc, body, ep.id, ep.episode_number, onUpdate]);
    const latestSave = useRef(save);
    latestSave.current = save;
    // Flush unsaved changes when navigating away inside the SPA as well.
    useEffect(() => () => { void latestSave.current(); }, []);
    useEffect(() => { if (!dirty)
        return; const timer = setTimeout(() => { void save(); }, 1700); return () => clearTimeout(timer); }, [dirty, save, title, arc, body]);
    const updateRelease = async (mode: 'now' | 'schedule' | 'draft') => {
        if (!supabase)
            return;
        setPublishing(true);
        setError('');
        try {
            await save();
            await queue.current;
            let release_at: string | null = null;
            let is_enabled = false;
            if (mode === 'now') {
                release_at = new Date().toISOString();
                is_enabled = true;
            }
            if (mode === 'schedule') {
                if (!schedule)
                    throw new Error('Pilih tanggal dan jam rilis terlebih dahulu.');
                const when = new Date(`${schedule}:00+07:00`);
                if (Number.isNaN(when.getTime()) || when.getTime() <= Date.now())
                    throw new Error('Jadwal harus di masa depan (WIB).');
                release_at = when.toISOString();
                is_enabled = true;
                if (ep.is_enabled && ep.release_at && ep.release_at !== release_at && !window.confirm('Episode ini sudah memiliki jadwal. Yakin ingin mengganti tanggal rilis lama?'))
                    return;
            }
            const { data, error } = await supabase.from('qr_episodes').update({ release_at, is_enabled }).eq('id', ep.id).select('id,book_id,episode_number,arc_title,title,release_at,is_enabled,created_at,updated_at').single();
            if (error)
                throw error;
            onUpdate({ ...data, content_md: body, is_finale: ep.is_finale } as Episode);
            setStatus(mode === 'now' ? 'Diterbitkan' : mode === 'schedule' ? 'Terjadwal' : 'Menjadi draft');
        }
        catch (e) {
            setError(errMsg(e));
        }
        finally {
            setPublishing(false);
        }
    };
    const importOne = async (file?: File) => { if (!file)
        return; if (file.size > 2000000) {
        setError('File Markdown maksimal 2 MB.');
        return;
    } setBody(await file.text()); setStatus('Belum disimpan'); };
    const insertMarkdown = (before: string, after = '', placeholder = 'teks') => {
        const node = manuscriptRef.current;
        if (!node)
            return;
        const start = node.selectionStart, end = node.selectionEnd;
        const selection = body.slice(start, end) || placeholder;
        const next = body.slice(0, start) + before + selection + after + body.slice(end);
        setBody(next);
        requestAnimationFrame(() => { node.focus(); node.setSelectionRange(start + before.length, start + before.length + selection.length); });
    };
    const makePreview = () => ({ id: `preview-${ep.id}`, title: book.title, path: '', content: `# ${book.title}\n\n${arc ? `## ${arc}\n\n` : ''}### ${title || `Episode ${ep.episode_number}`}\n\n${body || 'Belum ada isi episode.'}` });
    if (preview)
        return <ReaderApp key={`${ep.id}-preview`} bookId={`preview-${ep.id}`} bookTitle={book.title} onExit={() => setPreview(false)} previewStory={makePreview()}/>;
    return <><B to={`/studio/cerita/${book.id}`} className="studio-backlink"><ArrowLeft size={16}/> {book.title}</B>
 <div className="studio-editor-title v6-editor-heading"><div><span className="studio-kicker">{book.title} / BAB {ep.episode_number}</span><h1>{title || `Bab ${ep.episode_number}`}</h1><p>{dirty ? 'Ada perubahan yang belum disimpan' : status} · {episodeStatus(ep)}</p></div><div className="v6-editor-head-actions"><button className="studio-light-button" onClick={() => setPreview(true)}><Eye size={17}/> Pratinjau</button></div></div>
 <div className="studio-editor-layout"><section className="studio-panel studio-editor-panel"><div className="studio-editor-topline"><span><span className={`save-dot ${dirty ? 'save-unsaved' : ''}`}/>{status}</span><span><Pill episode={ep}/></span></div>
 <label className="studio-label">Judul episode<input className="studio-title-input" maxLength={180} value={title} onChange={e => setTitle(e.target.value)} placeholder="Judul episodenya"/></label><label className="studio-label">Arc / bagian<input value={arc} onChange={e => setArc(e.target.value)} placeholder="Opsional, mis. Arc I"/></label>
 <div className="studio-editor-toolbar v6-editor-format"><div className="v6-format-actions"><button type="button" title="Tebal" aria-label="Tebal" onClick={() => insertMarkdown('**', '**')}><Bold size={16}/></button><button type="button" title="Miring" aria-label="Miring" onClick={() => insertMarkdown('*', '*')}><Italic size={16}/></button><button type="button" title="Judul" aria-label="Judul" onClick={() => insertMarkdown('## ')}><Heading2 size={17}/></button><button type="button" title="Daftar" aria-label="Daftar" onClick={() => insertMarkdown('- ')}><List size={17}/></button><button type="button" title="Kutipan" aria-label="Kutipan" onClick={() => insertMarkdown('> ')}><Quote size={17}/></button></div><label><UploadCloud size={16}/> Impor .md<input type="file" accept=".md,.txt,text/markdown,text/plain" onChange={e => { void importOne(e.target.files?.[0]); e.target.value = ''; }}/></label></div>
 <textarea ref={manuscriptRef} className="studio-manuscript" aria-label="Isi episode dalam Markdown" spellCheck={true} placeholder="Mulai ceritamu di sini…" value={body} onChange={e => setBody(e.target.value)}/>
 <div className="studio-editor-bottom"><span>{body.trim() ? body.trim().split(/\s+/).length : 0} kata</span><div><button onClick={() => void save()} className="studio-light-button"><Save size={16}/> Simpan</button></div></div>
 </section><aside className="studio-panel studio-publish-panel"><div className="studio-panel-top"><h2>Publikasi</h2><Send size={19}/></div><p className="studio-muted">Status: <strong>{episodeStatus(ep)}</strong></p>
 {episodeStatus(ep) === 'Terbit' && <p className="studio-warning">Episode ini sudah publik. Perubahan isi yang disimpan akan langsung dapat dibaca.</p>}
 {!book.is_published && <p className="studio-warning">Novel ini masih privat. Walaupun episode diterbitkan, pembaca tidak dapat membukanya sebelum novel ditampilkan.</p>}
 <label className="studio-label">Tanggal & jam rilis (WIB)<input type="datetime-local" value={schedule} onChange={e => setSchedule(e.target.value)}/></label><button disabled={publishing || !body.trim()} onClick={() => void updateRelease('schedule')} className="studio-light-button"><CalendarDays size={17}/> Jadwalkan</button>
 <button disabled={publishing || !body.trim()} onClick={() => { if (window.confirm('Terbitkan episode ini sekarang? Semua pembaca dapat mengaksesnya jika novel sudah publik.'))
        void updateRelease('now'); }} className="studio-primary"><Send size={16}/> Terbitkan sekarang</button>
 {episodeStatus(ep) !== 'Draft' && <button disabled={publishing} className="studio-danger-lite" onClick={() => { if (window.confirm('Tarik episode ini dari publik dan jadikan draft?'))
        void updateRelease('draft'); }}><LockKeyhole size={16}/> Tarik ke draft</button>}
 <p className="studio-publish-hint"><ShieldCheck size={15}/> Draft dan naskah terjadwal dilindungi kebijakan database.</p><button className="studio-danger-lite" disabled={publishing || dirty} onClick={() => void onDelete()}><Trash2 size={16}/> Pindahkan episode ke Sampah</button>{dirty && <p className="studio-muted">Simpan perubahan dulu sebelum memindahkan episode ke Sampah.</p>}</aside></div>
 {error && <div className="studio-error" role="alert">{error}</div>}
 <div className="studio-editor-mobile-actions"><button className="studio-light-button" onClick={() => setPreview(true)}><BookOpen size={18}/> Pratinjau</button><button className="studio-primary" onClick={() => void save()}><Save size={18}/> Simpan</button><button className="studio-primary" disabled={publishing || !body.trim()} onClick={() => { if (window.confirm('Terbitkan bab ini sekarang?'))
        void updateRelease('now'); }}><Send size={17}/> Publikasikan</button></div>
 </>;
}
