import {isNativeApp} from '../native/platform';
import BrandIcon from '../components/BrandIcon';
import React, { useEffect, useMemo, useState } from 'react';
import type { Book, Episode } from '../data/library';
import { episodeStatus, formatWib } from '../data/library';
import { changeSchedule,pausedEpisodes,scheduleOperation,type ScheduleOperation } from '../data/management';
import {ReleaseDays} from '../features/studio/components/PublicationOptions';
import { getPublicationLogs, getImportBatches, getReleaseRules, type PublicationLog, type ImportBatch } from '../data/publishing';
import { fromWib, makeReleasePlan, monthDays, toWibDate, type PlannedRelease, type ReleaseRule } from '../utils/releasePlanning';
import { navigate } from '../utils/nav';
const WEEK = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
function errMsg(e: unknown) { return e instanceof Error ? e.message : String(e); }
function download(name: string, contents: string, type: string) { if(isNativeApp){void import('../native/export').then(m=>m.shareStudioExport(name,contents)).catch(e=>window.alert(`Ekspor gagal: ${errMsg(e)}`));return;} const blob = new Blob([contents], { type }); const uri = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = uri; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(uri), 1500); }
function stamp(date: string) { return date.slice(0, 10); }
function toYmd(year: number, month: number, day: number) { return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`; }
function nextMonth(y: number, m: number, offset: number) { const d = new Date(Date.UTC(y, m + offset, 1)); return [d.getUTCFullYear(), d.getUTCMonth()] as const; }
export function ScheduleManager({ books, episodes, onChanged }: {
    books: Book[];
    episodes: Episode[];
    onChanged: () => Promise<void>;
}) {
    const [filter, setFilter] = useState('all');
    const [tab, setTab] = useState<'calendar' | 'bulk'>(()=>new URLSearchParams(location.search).has('book')?'bulk':'calendar');
    const nowWib = toWibDate(new Date().toISOString());
    const [month, setMonth] = useState(() => { const [y, m] = nowWib.split('-').map(Number); return [y, m - 1] as [
        number,
        number
    ]; });
    const [chosenDate, setChosenDate] = useState(nowWib);
    const [ruleBook, setRuleBook] = useState(()=>{const id=new URLSearchParams(location.search).get('book');return books.find(b=>b.id===id)?.id??books[0]?.id??'';});
    const [source,setSource]=useState<'schedule'|'resume'|'reschedule'>('schedule');
    const [paused,setPaused]=useState<string[]>([]),[pausedLoading,setPausedLoading]=useState(true);
    const [pendingSchedule,setPendingSchedule]=useState<ScheduleOperation|null>(null);
    const [rules, setRules] = useState<ReleaseRule[]>([]);
    const [weekdays, setWeekdays] = useState<number[]>([4, 0]);
    const [clock, setClock] = useState('19:00');
    const [start, setStart] = useState(nowWib);
    const [count, setCount] = useState(1);
    const [preview, setPreview] = useState<PlannedRelease[]>([]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    useEffect(() => { getReleaseRules().then(setRules).catch(e => setError(`Aturan jadwal belum tersedia: ${errMsg(e)}. Periksa migrasi V3.`)); }, []);
    useEffect(() => { if (!ruleBook && books[0])
        setRuleBook(books[0].id); }, [books, ruleBook]);
    useEffect(() => { const r = rules.find(x => x.book_id === ruleBook); if (r) {
        setWeekdays(r.weekdays);
        setClock(r.time_wib);
    }
    else {
        setWeekdays([4, 0]);
        setClock('19:00');
    } setPreview([]); }, [ruleBook, rules]);
    useEffect(()=>{let active=true;setPausedLoading(true);setPaused([]);if(!ruleBook){setPaused([]);setPausedLoading(false);return;}pausedEpisodes(ruleBook).then(ids=>{if(active)setPaused(ids);}).catch(e=>{if(active)setError(errMsg(e));}).finally(()=>{if(active)setPausedLoading(false);});return ()=>{active=false;};},[ruleBook,episodes]);
    const scheduled = useMemo(() => episodes.filter(e => e.is_enabled && e.release_at).filter(e => filter === 'all' || e.book_id === filter), [episodes, filter]);
    const upcoming = useMemo(() => scheduled.filter(e => episodeStatus(e) === 'Terjadwal').sort((a, b) => Date.parse(a.release_at!) - Date.parse(b.release_at!)), [scheduled]);
    const events = useMemo(() => scheduled.filter(e => toWibDate(e.release_at!) === chosenDate).sort((a, b) => Date.parse(a.release_at!) - Date.parse(b.release_at!)), [scheduled, chosenDate]);
    const slots = useMemo(() => monthDays(month[0], month[1]), [month]);
    const future=episodes.filter(e=>e.book_id===ruleBook&&e.is_enabled&&e.release_at&&Date.parse(e.release_at)>Date.now());
    const candidates=episodes.filter(e=>e.book_id===ruleBook&&(source==='reschedule'?future.some(f=>f.id===e.id):!e.is_enabled&&!e.release_at&&(source==='resume'?paused.includes(e.id):!paused.includes(e.id))));
    const execute=async(op:ScheduleOperation)=>{setBusy(true);setPendingSchedule(op);setError('');setSuccess('');try{const result=await changeSchedule(op);await onChanged();void getReleaseRules().then(setRules).catch(()=>{});setPendingSchedule(null);setPreview([]);setSuccess(`${result.count} bab berhasil ${op.action==='pause'?'dijeda. Bab yang sudah terbit tetap tersedia.':'dijadwalkan sesuai pratinjau.'}`);}catch(e){setError(errMsg(e));}finally{setBusy(false);}};
    const pause=()=>{if(!future.length||!window.confirm(`Jeda ${future.length} bab mendatang? Bab yang sudah terbit tetap tersedia.`))return;void execute(scheduleOperation(ruleBook,'pause',future));};
    const buildPreview = () => { setError(''); setSuccess(''); setPreview([]); try {
        const ids=new Set([...candidates].sort((a,b)=>a.episode_number-b.episode_number).slice(0,count).map(e=>e.id));
        const planningEpisodes=episodes.filter(e=>e.book_id!==ruleBook||ids.has(e.id)||e.is_enabled).map(e=>ids.has(e.id)?{...e,is_enabled:false,release_at:null}:e);
        setPreview(makeReleasePlan({ bookId: ruleBook, episodes:planningEpisodes, weekdays, timeWib: clock, startDate: start, count }));
    }
    catch (e) {
        setError(errMsg(e));
    } };
    const commit = async () => {if(!ruleBook||!preview.length||busy||pendingSchedule)return;
        if(!window.confirm(`Terapkan ${preview.length} jadwal untuk “${books.find(b=>b.id===ruleBook)?.title}”?${source==='reschedule'?' Jadwal mendatang terpilih akan diganti.':' Bab yang sudah terbit tidak diubah.'}`))return;
        await execute(scheduleOperation(ruleBook,source,episodes,preview,weekdays,clock));
    };
    return <><div className="studio-page-head"><span className="studio-kicker">PENERBITAN OTOMATIS · V7.5</span><h1>Kalender <i>rilis.</i></h1><p>Satu kalender untuk seluruh novel. Seluruh tanggal menggunakan WIB (UTC+7).</p></div>
 <div className="v3-switcher"><button className={tab === 'calendar' ? 'active' : ''} onClick={() => setTab('calendar')}><BrandIcon name="calendar" size={16}/> Kalender</button><button className={tab === 'bulk' ? 'active' : ''} onClick={() => setTab('bulk')}><BrandIcon name="sparkle" size={16}/> Jadwal massal</button></div>
 {error && <div className="studio-error" role="alert">{error}</div>}{success && <div className="studio-success" role="status">{success}</div>}{pendingSchedule&&!busy&&<div className="kk-v75-bulk-bar"><p>Status operasi belum dipastikan. Coba lagi menggunakan pilihan yang sama.</p><button className="studio-primary" onClick={()=>void execute(pendingSchedule)}>Coba lagi operasi jadwal</button><button className="studio-light-button" onClick={()=>{setPendingSchedule(null);setPreview([]);void onChanged();}}>Muat ulang dan periksa</button></div>}
 {tab === 'calendar' ? <>
 <label className="studio-label v3-filter">Tampilkan novel<select value={filter} onChange={e => setFilter(e.target.value)}><option value="all">Semua novel</option>{books.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}</select></label>
 <div className="v3-calendar-layout"><section className="studio-panel v3-calendar"><div className="v3-calendar-header"><button aria-label="Bulan sebelumnya" onClick={() => { const [y, m] = nextMonth(month[0], month[1], -1); setMonth([y, m]); }}><BrandIcon name="chevron-left" size={21}/></button><h2>{new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(month[0], month[1], 1)))}</h2><button aria-label="Bulan selanjutnya" onClick={() => { const [y, m] = nextMonth(month[0], month[1], 1); setMonth([y, m]); }}><BrandIcon name="chevron-right" size={21}/></button></div>
 <div className="v3-days">{WEEK.map((d, i) => <span key={i}>{d}</span>)}{slots.map((d, i) => { const iso = d ? toYmd(month[0], month[1], d) : ''; const eventsHere = d ? scheduled.filter(e => toWibDate(e.release_at!) === iso) : []; const active = iso === chosenDate; return <button key={i} disabled={!d} className={`${active ? 'v3-day-active' : ''} ${iso === nowWib ? 'v3-day-today' : ''}`} onClick={() => d && setChosenDate(iso)} aria-label={d ? `${d}, ${eventsHere.length} jadwal` : 'Kosong'}><span>{d ?? ''}</span>{eventsHere.length > 0 && <em>{eventsHere.slice(0, 3).map(e => <i key={e.id} style={{ background: books.findIndex(b => b.id === e.book_id) % 2 ? 'var(--kk-rose)' : 'var(--kk-amber)' }}/>)}</em>}</button>; })}</div>
 <div className="v3-calendar-legend"><span><i /> Jadwal terbit</span><span className="v3-note">Pilih tanggal untuk melihat episode</span></div></section>
 <section className="studio-panel v3-day-detail"><div className="studio-panel-top"><h2>{formatWib(fromWib(chosenDate, '00:00')).split(',')[0]}</h2><BrandIcon name="clock" size={18}/></div>{events.length ? events.map(ep => <button key={ep.id} onClick={() => navigate(`/studio/editor/${ep.id}`)} className="v3-event"><span><strong>Episode {ep.episode_number} · {ep.title}</strong><small>{books.find(b => b.id === ep.book_id)?.title}</small><em>{formatWib(ep.release_at)} · {episodeStatus(ep)}</em></span><BrandIcon name="chevron-right" size={18}/></button>) : <div className="studio-panel-empty"><BrandIcon name="calendar" size={26}/><p>Tidak ada episode terjadwal pada tanggal ini.</p></div>}</section></div>
 <section className="studio-panel"><div className="studio-panel-top"><h2>Publikasi mendatang</h2><span className="v3-counter">{upcoming.length} episode</span></div>{upcoming.length ? upcoming.slice(0, 30).map(e => <button key={e.id} className="v3-event" onClick={() => navigate(`/studio/editor/${e.id}`)}><span><strong>Episode {e.episode_number} · {e.title}</strong><small>{books.find(b => b.id === e.book_id)?.title}</small><em>{formatWib(e.release_at)}</em></span><BrandIcon name="chevron-right" size={18}/></button>) : <p className="studio-muted">Belum ada jadwal mendatang. Episode lama yang sudah terbit tetap tersimpan.</p>}</section></> :
            <div className="v3-plan-layout"><section className="studio-panel"><div className="studio-panel-top"><h2>Atur penerbitan otomatis</h2><BrandIcon name="sliders" size={18}/></div><p className="studio-muted">Pilih bab draf, lanjutkan bab yang dijeda, atau atur ulang bab mendatang. Bab yang sudah terbit tetap tersedia.</p><fieldset className="kk-import-fieldset" disabled={busy||Boolean(pendingSchedule)||pausedLoading}>
 <label className="studio-label">Novel<select value={ruleBook} onChange={e => {setRuleBook(e.target.value);setSource('schedule');setPreview([]);}}>{books.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}</select></label>
 {!books.find(b=>b.id===ruleBook)?.is_published&&<p className="studio-warning">Novel ini masih privat. Aktifkan tampilan publik di pengaturan novel agar bab terjadwal dapat dibaca.</p>}
 <label className="studio-label">Bab yang diatur<select value={source} onChange={e=>{setSource(e.target.value as typeof source);setPreview([]);setCount(1);}}><option value="schedule">Draf belum dijadwalkan</option><option value="resume">Lanjutkan bab dijeda ({paused.length})</option><option value="reschedule">Atur ulang bab mendatang ({future.length})</option></select></label>
 <ReleaseDays days={weekdays} onChange={days=>{setWeekdays(days);setPreview([]);}}/>
 <div className="v3-two-fields"><label className="studio-label">Jam rilis (WIB)<input type="time" value={clock} onChange={e => { setClock(e.target.value); setPreview([]); }}/></label><label className="studio-label">Mulai tanggal<input type="date" value={start} onChange={e => { setStart(e.target.value); setPreview([]); }}/></label></div>
 <label className="studio-label v3-field">Jumlah episode draft<input type="number" min="1" max="1000" value={count} onChange={e => { setCount(Number(e.target.value)); setPreview([]); }}/></label>
 <p className="v3-note">Tersedia {candidates.length} bab untuk pilihan ini. Tanggal terpakai otomatis dilewati.</p>
 <div className="v3-actions"><button type="button" className="studio-light-button" disabled={!candidates.length} onClick={()=>{setCount(candidates.length);setPreview([]);}}>Semua bab ({candidates.length})</button><button className="studio-primary" disabled={busy || !ruleBook || !weekdays.length} onClick={buildPreview}>Pratinjau jadwal <BrandIcon name="arrow-right" size={16}/></button></div></fieldset><button type="button" className="v51-permanent-button" disabled={busy||Boolean(pendingSchedule)||pausedLoading||!future.length} onClick={pause}>Jeda {future.length} bab mendatang</button>
 </section><section className="studio-panel v3-preview-panel"><div className="studio-panel-top"><h2>Pratinjau publikasi</h2><BrandIcon name="calendar" size={18}/></div>{preview.length ? <><p className="studio-warning"><BrandIcon name="shield" size={15}/> Belum diterapkan. Periksa seluruh tanggal sebelum menyimpan.</p><div className="v3-preview-list">{preview.map(p => <div key={p.episode_id} className="v3-event"><span><strong>Episode {p.episode_number} · {p.title}</strong><em>{formatWib(p.release_at)}</em></span><BrandIcon name="check-circle" size={17}/></div>)}</div><button className="studio-primary v3-full" disabled={busy||Boolean(pendingSchedule)||pausedLoading} onClick={() => void commit()}>{busy ? 'Menyimpan…' : `Konfirmasi ${preview.length} jadwal`} <BrandIcon name="arrow-right" size={16}/></button></> : <div className="studio-panel-empty"><BrandIcon name="calendar" size={28}/><p>Pilih pola rilis dan tekan Pratinjau jadwal. Belum ada perubahan database.</p></div>}</section></div>}
 </>;
}
function escapeCsv(value: string | number | null) { const s = String(value ?? ''); return `"${s.replace(/"/g, '""')}"`; }
export function DatabaseManager({ books, episodes, onChanged }: {
    books: Book[];
    episodes: Episode[];
    onChanged: () => Promise<void>;
}) {
    const [book, setBook] = useState('all');
    const [status, setStatus] = useState('all');
    const [term, setTerm] = useState('');
    const [logs, setLogs] = useState<PublicationLog[]>([]);
    const [imports, setImports] = useState<ImportBatch[]>([]);
    const [importError, setImportError] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const reloadLogs = async () => { setLoading(true); setError(''); try {
        setLogs(await getPublicationLogs());
    }
    catch (e) {
        setError(`Riwayat belum tersedia: ${errMsg(e)}. Jalankan migrasi V3.`);
    }
    finally {
        setLoading(false);
    } };
    useEffect(() => { void reloadLogs(); getImportBatches().then(setImports).catch(() => setImportError('Riwayat impor belum tersedia. Jalankan migrasi V4 setelah backup database.')); }, []);
    const filtered = episodes.filter(e => (book === 'all' || e.book_id === book) && (status === 'all' || episodeStatus(e) === status) && (!term || `${e.title} ${e.episode_number} ${e.arc_title}`.toLowerCase().includes(term.toLowerCase())));
    const dumpCsv = () => { const header = ['Novel', 'Episode', 'Judul', 'Arc', 'Status', 'Waktu rilis (UTC)', 'Aktif', 'ID']; const rows = filtered.map(e => [books.find(b => b.id === e.book_id)?.title ?? e.book_id, e.episode_number, e.title, e.arc_title, episodeStatus(e), e.release_at ?? '', e.is_enabled ? 'ya' : 'tidak', e.id]); download(`katakecil-metadata-${stamp(new Date().toISOString())}.csv`, [header, ...rows].map(row => row.map(escapeCsv).join(',')).join('\r\n'), 'text/csv;charset=utf-8'); };
    const dumpJson = () => { if (!window.confirm('Unduh backup naskah lengkap ke perangkat ini? File JSON berisi seluruh isi episode, termasuk draft privat. Simpan di lokasi aman dan jangan unggah ke hosting publik.'))
        return; download(`katakecil-backup-naskah-${stamp(new Date().toISOString())}.json`, JSON.stringify({ exported_at: new Date().toISOString(), books: books.filter(b => book === 'all' || b.id === book), episodes: filtered }, null, 2), 'application/json'); };
    const count = (s: 'Draft' | 'Terbit' | 'Terjadwal') => episodes.filter(e => episodeStatus(e) === s).length;
    return <><div className="studio-page-head"><span className="studio-kicker">PENERBITAN OTOMATIS · V7.5</span><h1>Kelola <i>database.</i></h1><p>Inventaris novel dan episode — tanpa SQL bebas, tanpa tombol hapus massal.</p></div>
 <div className="v3-metrics">{[{ label: 'Novel', number: books.length }, { label: 'Draft', number: count('Draft') }, { label: 'Terjadwal', number: count('Terjadwal') }, { label: 'Terbit', number: count('Terbit') }].map(x => <div key={x.label}><strong>{x.number}</strong><span>{x.label}</span></div>)}</div>
 <section className="studio-panel"><div className="studio-panel-top"><h2>Inventaris episode</h2><BrandIcon name="database" size={19}/></div><div className="v3-search"><BrandIcon name="search" size={18}/><input value={term} onChange={e => setTerm(e.target.value)} placeholder="Cari judul, nomor episode, atau arc…" aria-label="Cari episode"/></div><div className="v3-two-fields v3-database-filters"><label className="studio-label">Novel<select value={book} onChange={e => setBook(e.target.value)}><option value="all">Semua novel</option>{books.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}</select></label><label className="studio-label">Status<select value={status} onChange={e => setStatus(e.target.value)}><option value="all">Semua status</option><option value="Draft">Draft</option><option value="Terjadwal">Terjadwal</option><option value="Terbit">Terbit</option></select></label></div><div className="v3-actions"><button className="studio-light-button" onClick={dumpCsv}><BrandIcon name="download" size={16}/> Ekspor CSV</button><button className="studio-light-button" onClick={dumpJson}><BrandIcon name="download" size={16}/> Backup JSON</button></div><p className="v3-note">CSV hanya metadata. Backup JSON berisi naskah privat dan hanya diunduh atas persetujuanmu.</p><div className="v3-table-heading">{filtered.length} episode ditemukan</div><div className="v3-database-list">{filtered.slice(0, 150).map(e => <button key={e.id} className="v3-event" onClick={() => navigate(`/studio/editor/${e.id}`)}><span><strong>{e.episode_number}. {e.title}</strong><small>{books.find(b => b.id === e.book_id)?.title ?? e.book_id} · {e.arc_title || 'Tanpa arc'}</small><em>{episodeStatus(e)}{e.release_at ? ` · ${formatWib(e.release_at)}` : ''}</em></span><BrandIcon name="chevron-right" size={18}/></button>)}{filtered.length > 150 && <p className="v3-note">150 hasil pertama ditampilkan. Gunakan pencarian/filter untuk mempersempit.</p>}{!filtered.length && <p className="studio-muted">Tidak ada episode sesuai filter.</p>}</div></section>
 <section className="studio-panel"><div className="studio-panel-top"><h2>Riwayat publikasi</h2><button className="studio-text-button" disabled={loading} onClick={() => void reloadLogs()}><BrandIcon name="refresh" size={16}/> Refresh</button></div><p className="studio-muted">Mencatat perubahan status dan waktu rilis setelah migrasi V3. Naskah dan perubahan sebelum V3 tidak dimasukkan ke log.</p>{error && <div className="studio-warning">{error}</div>}{logs.length ? logs.map(log => <div className="v3-event" key={log.id}><span><strong>{log.action.replace('_', ' ')} · {books.find(b => b.id === log.book_id)?.title || log.book_id}</strong><small>{new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' }).format(new Date(log.created_at))} WIB</small><em>{log.new_release_at ? formatWib(log.new_release_at) : 'Kembali ke draft'}</em></span><BrandIcon name="history" size={17}/></div>) : <p className="studio-muted">{loading ? 'Memuat riwayat…' : 'Belum ada perubahan publikasi yang tercatat.'}</p>}</section>
 <section className="studio-panel"><div className="studio-panel-top"><h2>Riwayat impor naskah</h2><button className="studio-text-button" onClick={() => navigate('/studio/impor')}><BrandIcon name="upload" size={16}/> Impor lagi</button></div>
 <p className="studio-muted">Hanya nama berkas, asal novel, tanggal, dan jumlah episode yang dicatat. Isi naskah tidak disimpan dalam riwayat.</p>
 {importError && <p className="studio-warning">{importError}</p>}
 {imports.length ? imports.map(item => <div className="v3-event" key={item.id}><span><strong>{item.source_name} · {item.imported_count} episode{item.sections_count ? ` + ${item.sections_count} halaman buku` : ""}</strong><small>{books.find(b => b.id === item.book_id)?.title ?? item.book_id} · {item.source_format.toUpperCase()}</small><em>{new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' }).format(new Date(item.created_at))} WIB</em></span><BrandIcon name="file" size={17}/></div>) : <p className="studio-muted">Belum ada impor V4 yang tercatat.</p>}</section>
 <div className="v3-actions"><button className="studio-light-button" onClick={() => void onChanged()}><BrandIcon name="refresh" size={16}/> Muat ulang data</button><button className="studio-light-button" onClick={() => navigate('/studio/jadwal')}><BrandIcon name="calendar" size={16}/> Kelola jadwal</button></div>
 <p className="studio-footnote"><BrandIcon name="shield" size={16}/> Semua data berasal dari akun Studio yang diautentikasi. Hak akses tetap dikendalikan RLS Supabase.</p>
 </>;
}
