import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { ArrowLeft, ArrowRight, Feather, LockKeyhole } from 'lucide-react';
import { getStudioLibrary, type Book, type Episode } from '../data/library';
import { isConfigured, supabase } from '../data/supabase';
import { navigate } from '../utils/nav';
import { DatabaseManager, ScheduleManager } from './StudioManagement';
import ManuscriptImporter from './ManuscriptImporter';
import TrashManager from './TrashManager';
import AnnouncementManager from '../features/studio/components/AnnouncementManager';
import { trashItem } from '../data/trash';
import { useUiTheme, type UiTheme, type AppThemePreference } from '../hooks/useUiTheme';
import ThemeToggle from '../components/ThemeToggle';
import ThemeLoading from '../components/ThemeLoading';
import StudioNavigation, { StudioToolsMenu } from '../features/studio/components/StudioNavigation';
import ChapterEditor from '../features/studio/components/ChapterEditor';
import { Dashboard, Analytics, StudioSettings } from '../features/studio/components/StudioOverview';
import { B, authorName, errMsg } from '../features/studio/components/StudioShared';
import { Books, BookForm, BookDetails } from '../features/studio/components/BookManagement';
function Busy({ text = 'Memuat Studio...' }: {
    text?: string;
}) { return <ThemeLoading context="studio" text={text}/>; }
function Login({ onSuccess, theme, preference, onPreferenceChange }: {
    onSuccess: () => void;
    theme: UiTheme;
    preference: AppThemePreference;
    onPreferenceChange: (next: AppThemePreference) => void;
}) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const submit = async (e: React.FormEvent) => { e.preventDefault(); if (!supabase)
        return; setBusy(true); setError(''); try {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error)
            throw error;
        onSuccess();
    }
    catch (e) {
        setError(errMsg(e));
    }
    finally {
        setBusy(false);
    } };
    return <div className="studio-login-wrap" data-kk-theme={theme}><div className="v62-login-theme"><ThemeToggle theme={theme} preference={preference} onPreferenceChange={onPreferenceChange}/></div><B to="/" className="studio-backlink"><ArrowLeft size={17}/> Kembali ke Beranda</B><form className="studio-login" onSubmit={submit}><div className="studio-login-icon"><img src="/brand/katakecil-mark.svg" width="33" height="33" alt=""/></div><span className="studio-kicker">RUANG PRIBADI PENULIS</span><h1>Selamat datang<br /><i>di Studio.</i></h1><p>Masuk untuk menulis, menyimpan draft, dan mengatur penerbitan ceritamu.</p>
   <label>Email<input type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} placeholder="email@contoh.com"/></label><label>Kata sandi<input type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"/></label>
   {error && <div className="studio-error" role="alert">{error}</div>}<button className="studio-primary" disabled={busy} type="submit">{busy ? 'Masuk…' : 'Masuk ke Studio'} <ArrowRight size={17}/></button><small><LockKeyhole size={13}/> Hanya akun penulis yang diizinkan.</small></form></div>;
}
export default function Studio({ path }: {
    path: string;
}) {
    const { theme, preference, setPreference } = useUiTheme();
    const userIdRef = useRef<string | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [authorized, setAuthorized] = useState(false);
    const [authLoading, setAuthLoading] = useState(true);
    const [books, setBooks] = useState<Book[]>([]);
    const [episodes, setEpisodes] = useState<Episode[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const refresh = useCallback(async () => { try {
        const result = await getStudioLibrary();
        setBooks(result.books);
        setEpisodes(result.episodes);
        setError('');
    }
    catch (e) {
        setError(errMsg(e));
    }
    finally {
        setLoading(false);
    } }, []);
    // Do not remount the Studio on tab navigation or refresh credentials every time
    // Chrome Android opens its document picker. Auth is verified on entry/sign-in;
    // token refreshes do not replace the file importer or its File object.
    const checkAuth = useCallback(async () => {
        if (!supabase) {
            setAuthLoading(false);
            return;
        }
        try {
            const { data, error } = await supabase.auth.getUser();
            if (error || !data.user) {
                setUser(null);
                setAuthorized(false);
                return;
            }
            const { data: member, error: memberErr } = await supabase.from('qr_author_members').select('user_id').eq('user_id', data.user.id).maybeSingle();
            if (memberErr) {
                setError(`Gagal memeriksa izin penulis: ${memberErr.message}`);
                setAuthorized(false);
                return;
            }
            userIdRef.current = data.user.id;
            setUser(data.user);
            setAuthorized(Boolean(member));
        }
        catch (e) {
            setError(`Pemeriksaan akun gagal: ${errMsg(e)}`);
            setAuthorized(false);
        }
        finally {
            setAuthLoading(false);
        }
    }, []);
    useEffect(() => {
        let mounted = true;
        void checkAuth();
        const { data } = supabase?.auth.onAuthStateChange((event) => {
            if (!mounted)
                return;
            if (event === 'SIGNED_OUT') {
                userIdRef.current = null;
                setUser(null);
                setAuthorized(false);
                setAuthLoading(false);
            }
            else if (event === 'SIGNED_IN' && userIdRef.current === null) {
                // Defer async auth calls outside Supabase's synchronous callback.
                window.setTimeout(() => { if (mounted)
                    void checkAuth(); }, 0);
            }
            // INITIAL_SESSION and TOKEN_REFRESHED must not reset the mobile importer.
        }) ?? { data: null };
        return () => { mounted = false; data?.subscription.unsubscribe(); };
    }, [checkAuth]);
    useEffect(() => { if (authorized) {
        setLoading(true);
        void refresh();
    } }, [authorized, refresh]);
    const onUpdateBook = (b: Book) => { setBooks(prev => [b, ...prev.filter(x => x.id !== b.id)]); navigate(`/studio/cerita/${b.id}`); };
    const onUpdateEpisode = useCallback((e: Episode) => setEpisodes(prev => prev.map(x => x.id === e.id ? e : x)), []);
    const moveToTrash = async (kind: 'book' | 'episode', id: string, title: string) => {
        const confirmText = kind === 'book' ? window.prompt(`Memindahkan novel ke Sampah membuatnya privat. Ketik judul tepat untuk mengonfirmasi: ${title}`) : null;
        if (kind === 'book' && confirmText !== title)
            return;
        if (kind === 'episode' && !window.confirm(`Pindahkan episode “${title}” ke Sampah? Jadwalnya akan dibatalkan agar tidak terbit tanpa sengaja.`))
            return;
        try {
            await trashItem(kind, id);
            await refresh();
            navigate(kind === 'book' ? '/studio/cerita' : '/studio/sampah');
        }
        catch (e) {
            setError(`Gagal memindahkan ke Sampah: ${errMsg(e)}`);
        }
    };
    const createEpisode = async (bookId: string, requestedZero = false) => {
        if (!supabase)
            return;
        setError('');
        try {
            const local = episodes.filter(e => e.book_id === bookId);
            if (requestedZero && local.some(e => e.episode_number === 0))
                throw Error('Episode 0 sudah ada.');
            const number = requestedZero ? 0 : local.reduce((a, e) => Math.max(a, e.episode_number), 0) + 1;
            const { data, error } = await supabase.from('qr_episodes').insert({ book_id: bookId, episode_number: number, title: `Episode ${number}`, arc_title: '', content_md: '', release_at: null, is_enabled: false }).select('id,book_id,episode_number,arc_title,title,release_at,is_enabled,created_at,updated_at').single();
            if (error)
                throw error;
            setEpisodes(prev => [...prev, { ...data, content_md: '' } as Episode]);
            navigate(`/studio/editor/${data.id}`);
        }
        catch (e) {
            setError(errMsg(e));
        }
    };
    if (!isConfigured)
        return <div className="studio-unavailable"><Feather size={36}/><h1>Hubungkan Studio ke Supabase</h1><p>Untuk mengaktifkan login dan publikasi, isi variabel VITE_SUPABASE_URL dan VITE_SUPABASE_PUBLISHABLE_KEY, lalu jalankan migrasi V2 dan daftarkan akun penulis.</p><B to="/" className="studio-primary">Kembali ke Beranda</B></div>;
    if (authLoading)
        return <Busy text="Memverifikasi akses Studio…"/>;
    if (!user)
        return <Login theme={theme} preference={preference} onPreferenceChange={setPreference} onSuccess={() => void checkAuth()}/>;
    if (!authorized)
        return <div className="studio-unavailable"><LockKeyhole size={35}/><h1>Akun belum memiliki izin penulis</h1><p>Masuk dengan akun yang sudah terdaftar di tabel qr_author_members. Keanggotaan harus diberikan oleh admin database, bukan lewat browser.</p>{error && <p className="studio-error">{error}</p>}<button className="studio-light-button" onClick={() => void supabase?.auth.signOut()}>Keluar akun</button></div>;
    const sections = path.split('/').filter(Boolean);
    const book = sections[1] === 'cerita' && sections[2] && sections[2] !== 'baru' ? books.find(b => b.id === decodeURIComponent(sections[2])) : undefined;
    const editorEpisode = sections[1] === 'editor' ? episodes.find(e => e.id === sections[2]) : undefined;
    const displayName = authorName(user);
    return <div className="studio-app v6-studio-app" data-kk-theme={theme}><StudioNavigation path={path} displayName={displayName} theme={theme} preference={preference} onPreferenceChange={setPreference}/><div className="studio-page"><div className="studio-toolbar"><span>KataKecil <strong>Studio</strong></span><div><ThemeToggle theme={theme} preference={preference} onPreferenceChange={setPreference}/><span className="studio-auth-indicator"><span />{displayName}</span><StudioToolsMenu path={path}/></div></div>
 <main className="studio-content">{error && <div className="studio-error" role="alert">{error}</div>}{loading ? <Busy /> : sections[1] === 'impor' ? <ManuscriptImporter books={books} episodes={episodes} onChanged={refresh}/> : sections[1] === 'jadwal' ? <ScheduleManager books={books} episodes={episodes} onChanged={refresh}/> : sections[1] === 'database' ? <DatabaseManager books={books} episodes={episodes} onChanged={refresh}/> : sections[1] === 'sampah' ? <TrashManager onChanged={refresh}/> : sections[1] === 'pengumuman' ? <AnnouncementManager books={books}/> : sections[1] === 'editor' ? (editorEpisode ? <ChapterEditor key={editorEpisode.id} ep={editorEpisode} book={books.find(b => b.id === editorEpisode.book_id)!} onUpdate={onUpdateEpisode} onDelete={() => moveToTrash('episode', editorEpisode.id, editorEpisode.title)}/> : <p>Episode tidak ditemukan.</p>) : sections[1] === 'cerita' && sections[2] === 'baru' ? <><B className="studio-backlink" to="/studio/cerita"><ArrowLeft size={16}/> Kembali ke karya</B><BookForm onSaved={onUpdateBook}/></> : sections[1] === 'cerita' && sections[2] ? (book ? <BookDetails key={book.id} book={book} episodes={episodes} onNew={() => void createEpisode(book.id)} onNewZero={() => void createEpisode(book.id, true)} onUpdate={onUpdateBook} onDelete={() => moveToTrash('book', book.id, book.title)} onChanged={refresh}/> : <p>Novel tidak ditemukan.</p>) : sections[1] === 'cerita' ? <Books books={books} episodes={episodes} onCreate={() => navigate('/studio/cerita/baru')}/> : sections[1] === 'analytics' ? <Analytics books={books} episodes={episodes}/> : sections[1] === 'settings' ? <StudioSettings /> : <Dashboard books={books} episodes={episodes} user={user}/>}
 </main></div></div>;
}
