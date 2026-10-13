import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Bookmark, CalendarClock, ChevronDown, ChevronRight, Clock3, Feather, Search, Sparkles, X } from 'lucide-react';
import { Cover } from '../components/Cover';
import { getPublicLibrary, type Book, type EpisodeSummary } from '../data/library';
import { isConfigured } from '../data/supabase';
import { navigate } from '../utils/nav';
import { useCollection } from '../utils/collection';
import PublicHeader from '../components/public/PublicHeader';
import { useUiTheme } from '../hooks/useUiTheme';
import ThemeLoading from '../components/ThemeLoading';
import { BookmarkButton, BookCard } from '../features/public/components/StoryCard';
import { Action, EmptyLibrary, Heading } from '../features/public/components/LibraryUI';
import FeaturedHeroCarousel from '../features/public/components/FeaturedHeroCarousel';
import { selectRecentlyPublishedStories } from '../features/public/featuredStories';
import { selectRecentChapters } from '../features/public/recentChapters';
import { getPublicUpcomingChapters, formatUpcomingChapter, type UpcomingChapter } from '../data/publicSchedule';
// Preview-only records. These are never inserted into Supabase or exposed as published works.
const demoDate = '2026-10-01T00:00:00.000Z';
const demoData: Array<[
    string,
    string,
    string
]> = [
    ['Senja di Ujung Kota', 'Romansa', 'Tentang dua hati yang selalu bertemu di waktu yang salah, namun tetap memilih untuk tinggal.'],
    ['Langit yang Sama', 'Romansa', 'Satu langit, dua perjalanan, dan hal-hal kecil yang membuat kita kembali.'],
    ['Jejak di Kertas', 'Slice of Life', 'Di antara halaman dan ingatan, ada cerita yang belum selesai.'],
    ['Ruang di Antara', 'Drama', 'Sebuah perjalanan menemukan rumah di antara dua dunia.'],
    ['Sebelum Hujan', 'Romansa', 'Ketika langit berubah warna, ada janji yang masih menunggu.'],
    ['Rumah Kedua', 'Keluarga', 'Pulang tidak selalu berarti kembali ke tempat yang sama.'],
    ['Kisah yang Tertunda', 'Drama', 'Tidak semua perpisahan berarti sebuah akhir.'],
    ['Bunga Terakhir', 'Fantasi', 'Di taman yang terlupakan, satu bunga menyimpan harapan.'],
];
const demoBooks: Book[] = demoData.map(([title, genre, synopsis], i) => ({ id: `v6-demo-${i}`, slug: `v6-demo-${i}`, title, genre, synopsis, cover_url: null, status: 'ongoing', is_published: true, is_featured: i === 0, created_at: demoDate, updated_at: demoDate }));
function useLibrary() {
    const [data, setData] = useState<{
        books: Book[];
        episodes: EpisodeSummary[];
        schedules: UpcomingChapter[];
    }>({ books: [], episodes: [], schedules: [] });
    const [loading, setLoading] = useState(isConfigured);
    const [error, setError] = useState('');
    useEffect(() => {
        let active = true;
        if (!isConfigured) {
            setData({ books: demoBooks, episodes: [], schedules: [] });
            setLoading(false);
            return;
        }
        Promise.all([getPublicLibrary(), getPublicUpcomingChapters()]).then(([library, schedules]) => {
            if (active) setData({ ...library, schedules });
        }).catch(e => { if (active)
            setError(e instanceof Error ? e.message : 'Gagal memuat perpustakaan.'); }).finally(() => { if (active)
            setLoading(false); });
        return () => { active = false; };
    }, []);
    // When the next scheduled release goes live, refresh the public metadata.
    // The reader never receives future chapter bodies or titles.
    useEffect(() => {
        if (!isConfigured || data.schedules.length === 0) return;
        const nextRelease = Math.min(...data.schedules.map(item => Date.parse(item.release_at)));
        if (!Number.isFinite(nextRelease)) return;
        const delay = Math.max(1000, Math.min(nextRelease - Date.now() + 2000, 86_400_000));
        let active = true;
        const timer = window.setTimeout(() => {
            Promise.all([getPublicLibrary(), getPublicUpcomingChapters()])
                .then(([library, schedules]) => {
                    if (active) setData({ ...library, schedules });
                })
                .catch(() => { /* Keep the existing public catalog on transient errors. */ });
        }, delay);
        return () => { active = false; window.clearTimeout(timer); };
    }, [data.schedules]);
    return { ...data, loading, error, demo: !isConfigured };
}
const countFor = (episodes: EpisodeSummary[], book: Book) => episodes.filter(e => e.book_id === book.id).length;
function readProgress(book: Book) {
    try {
        const v = JSON.parse(localStorage.getItem(`kk-secure-progress-${book.id}`) || 'null');
        return v && typeof v.ep === 'number' ? v.ep : null;
    }
    catch {
        return null;
    }
}
function Home({ books, episodes, schedules, demo }: {
    books: Book[];
    episodes: EpisodeSummary[];
    schedules: UpcomingChapter[];
    demo: boolean;
}) {
    // Only real, released stories are allowed in the carousel.
    const latestStories = useMemo(
        () => demo ? [] : selectRecentlyPublishedStories(books, episodes),
        [books, episodes, demo],
    );
    const recentChapters = useMemo(
        () => demo ? [] : selectRecentChapters(books, episodes),
        [books, episodes, demo],
    );
    const availableBooks = books.filter(book => demo || countFor(episodes, book) > 0);
    const continuation = demo ? undefined : availableBooks.find(book => {
        const progress = readProgress(book);
        return progress !== null && episodes.some(
            ep => ep.book_id === book.id && ep.episode_number === progress,
        );
    });
    const episode = continuation ? readProgress(continuation) : null;

    return <main className="v6-home v66-home v68-home">
        <FeaturedHeroCarousel stories={latestStories} schedules={schedules}/>
        <div className="v6-home-sections v68-home-sections">
            {continuation && episode !== null && <section className="v68-continue" aria-label="Lanjut membaca">
                <Heading title="Lanjut Membaca"/>
                <button
                    type="button"
                    className="v68-continue-card"
                    onClick={() => navigate(`/baca/${continuation.slug}?episode=${episode}`)}
                    aria-label={`Lanjutkan ${continuation.title} dari bab ${episode}`}
                >
                    <div className="v68-continue-cover"><Cover book={continuation} eager/></div>
                    <div className="v68-continue-info">
                        <strong>{continuation.title}</strong>
                        <span>Bab {episode} · {countFor(episodes, continuation)} bab tersedia</span>
                    </div>
                    <span className="v68-continue-arrow" aria-hidden="true"><ArrowRight size={19}/></span>
                </button>
            </section>}
            {recentChapters.length > 0 && <section className="v68-new-chapters" aria-label="Bab baru">
                <Heading title="Bab Baru"/>
                <div className="v68-chapter-list">
                    {recentChapters.map(({ book, episode: ep }) => <button
                        key={`${book.id}:${ep.episode_number}`}
                        type="button"
                        className="v68-chapter-item"
                        onClick={() => navigate(`/baca/${book.slug}?episode=${ep.episode_number}`)}
                        aria-label={`Baca ${ep.title} dari ${book.title}`}
                    >
                        <span className="v68-chapter-number" aria-hidden="true">{ep.episode_number === 0 ? 'P' : ep.episode_number}</span>
                        <span className="v68-chapter-copy">
                            <strong>{ep.title}</strong>
                            <small>{book.title} · {new Intl.DateTimeFormat('id-ID', {
                                timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short',
                            }).format(new Date(ep.release_at!))}</small>
                        </span>
                        <ChevronRight size={17} aria-hidden="true"/>
                    </button>)}
                </div>
            </section>}
        </div>
    </main>;
}
function Listing({ books, episodes, demo, collection = false }: {
    books: Book[];
    episodes: EpisodeSummary[];
    demo: boolean;
    collection?: boolean;
}) {
    const params = new URLSearchParams(window.location.search);
    const [q, setQ] = useState(params.get('q') || '');
    const [filter, setFilter] = useState(params.get('genre') || 'Semua');
    const [sort, setSort] = useState('terbaru');
    const input = useRef<HTMLInputElement>(null);
    const { ids } = useCollection();
    useEffect(() => {
        const sync = () => { const next = new URLSearchParams(window.location.search); setQ(next.get('q') || ''); setFilter(next.get('genre') || 'Semua'); if (next.get('focus') === '1')
            requestAnimationFrame(() => input.current?.focus()); };
        sync();
        window.addEventListener('quiet:navigate', sync);
        return () => window.removeEventListener('quiet:navigate', sync);
    }, []);
    const genres = useMemo(() => ['Semua', ...new Set(books.filter(b => !collection || ids.includes(b.id)).map(b => b.genre).filter(Boolean))], [books, collection, ids]);
    const shown = useMemo(() => {
        const term = q.toLocaleLowerCase('id-ID');
        const results = books.filter(b => (!collection || ids.includes(b.id)) && (filter === 'Semua' || b.genre === filter) && `${b.title} ${b.synopsis} ${b.genre}`.toLocaleLowerCase('id-ID').includes(term));
        return [...results].sort((a, b) => sort === 'judul' ? a.title.localeCompare(b.title, 'id') : new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    }, [books, ids, collection, filter, q, sort]);
    if (collection && !books.some(book => ids.includes(book.id))) {
        return <main className="v6-library-page v67-empty-collection">
            <div className="v6-library-intro"><h1>Koleksi</h1><p>Cerita yang kamu simpan untuk dibaca kembali.</p></div>
            <EmptyLibrary collection/>
        </main>;
    }
    return <main className="v6-library-page"><div className="v6-library-intro"><span className="v63-eyebrow">✦ &nbsp; JELAJAHI CERITA</span><h1>{collection ? 'Koleksi' : 'Perpustakaan'}</h1><p>{collection ? 'Cerita yang kamu simpan untuk dibaca kembali.' : 'Ribuan kata, satu tempat untuk kembali.'}</p></div>
    <div className="v6-library-tools"><div className="v6-library-search"><Search size={19}/><input ref={input} type="search" aria-label="Cari cerita, penulis, atau genre" placeholder="Cari cerita, penulis, atau genre..." value={q} onChange={e => setQ(e.target.value)}/>{q && <button aria-label="Hapus pencarian" onClick={() => setQ('')}><X size={16}/></button>}</div><div className="v6-genre-pills">{genres.map(g => <button key={g} className={filter === g ? 'selected' : ''} aria-pressed={filter === g} onClick={() => setFilter(g)}>{g}</button>)}</div><label className="v6-sort">Urutkan <ChevronDown size={13}/><select aria-label="Urutkan cerita" value={sort} onChange={e => setSort(e.target.value)}><option value="terbaru">Terbaru</option><option value="judul">Judul A–Z</option></select></label></div>
    {shown.length ? <div className="v6-library-grid">{shown.map(b => <BookCard key={b.id} book={b} count={countFor(episodes, b)} demo={demo}/>)}</div> : !q && filter === 'Semua' && (!books.length || collection) ? <EmptyLibrary collection={collection}/> : <div className="v6-filter-empty"><Search size={24}/><h2>Tidak ada cerita yang cocok</h2><p>Coba kata kunci atau genre lain.</p><button onClick={() => { setQ(''); setFilter('Semua'); }}>Hapus filter</button></div>}
  </main>;
}
function Detail({ book, episodes, schedules, demo }: {
    book: Book;
    episodes: EpisodeSummary[];
    schedules: UpcomingChapter[];
    demo: boolean;
}) {
    const rows = episodes
        .filter(episode => episode.book_id === book.id)
        .sort((a, b) => a.episode_number - b.episode_number);
    const [showAll, setShowAll] = useState(false);
    const nextChapter = schedules.find(item => item.book_id === book.id);
    const bookStatus = book.status === 'completed' ? 'Tamat'
        : book.status === 'hiatus' ? 'Jeda' : 'Berlangsung';

    return <main className="v6-detail-page">
        <div className="v6-detail-content">
            <Action to="/cerita" className="v6-detail-back">
                <ArrowLeft size={17}/><span>Perpustakaan</span>
            </Action>
            <section className="v6-detail-hero">
                <div className="v6-detail-cover">
                    <Cover book={book} size="large" eager/>
                    <BookmarkButton book={book}/>
                </div>
                <div className="v6-detail-info">
                    <h1>{book.title}</h1>
                    <div className="v6-detail-tags">
                        <span>{book.genre || 'Fiksi'}</span><span>{bookStatus}</span>
                    </div>
                    <div className="v6-detail-numbers">
                        <span><BookOpen size={16}/>{demo ? 'Contoh' : `${rows.length} Bab`}</span>
                        <span><Clock3 size={16}/>{book.status === 'completed' ? 'Selesai' : 'Bersambung'}</span>
                    </div>
                    <p>{book.synopsis || 'Sinopsis belum ditambahkan oleh penulis.'}</p>
                    <div className="v6-detail-actions">
                        {rows.length > 0 && !demo
                            ? <Action className="v6-button v6-button-gold" to={`/baca/${book.slug}`}>
                                Mulai Membaca <ArrowRight size={17}/>
                            </Action>
                            : <span className="v62-unavailable-chapters">Belum ada bab terbit</span>}
                    </div>
                </div>
            </section>
            <div className="v6-detail-bottom">
                <section className="v6-chapters">
                    <div className="v6-chapters-title">
                        <h2>Daftar Bab</h2><span>Urut: Terbaru tersedia</span>
                    </div>
                    {rows.length > 0
                        ? rows.slice(0, showAll ? undefined : 18).map((ep, i) =>
                            <button
                                className="v6-chapter"
                                key={ep.episode_number}
                                onClick={() => navigate(`/baca/${book.slug}?episode=${ep.episode_number}`)}
                            >
                                <span>{i + 1}.</span>
                                <div>
                                    <strong>{ep.title}</strong>
                                    <small>{ep.arc_title || `Bab ${ep.episode_number}`}</small>
                                </div>
                                <span className="v6-chapter-date">
                                    {ep.release_at ? new Date(ep.release_at).toLocaleDateString('id-ID', {
                                        timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short', year: 'numeric',
                                    }) : ''}
                                </span>
                                <ChevronRight size={16}/>
                            </button>)
                        : <div className="v6-no-chapters">
                            {demo
                                ? 'Ini hanya pratinjau visual. Hubungkan Supabase untuk membaca cerita asli.'
                                : 'Bab pertama belum diterbitkan.'}
                        </div>}
                    {rows.length > 18 && !showAll && <button
                        className="v6-show-chapters"
                        onClick={() => setShowAll(true)}
                    >Lihat semua bab <ArrowRight size={16}/></button>}
                </section>
                <aside className="v6-detail-extra">
                    <h2>Informasi</h2>
                    <dl>
                        <dt>Genre</dt><dd>{book.genre || 'Fiksi'}</dd>
                        <dt>Status</dt><dd>{bookStatus}</dd>
                        <dt>Diperbarui</dt>
                        <dd>{new Date(book.updated_at).toLocaleDateString('id-ID', {
                            timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short', year: 'numeric',
                        })}</dd>
                        <dt>Total bab</dt><dd>{demo ? 'Demo' : rows.length}</dd>
                        {nextChapter && <>
                            <dt>Bab berikutnya</dt>
                            <dd className="v68-detail-schedule">
                                <CalendarClock size={15} aria-hidden="true"/>
                                {formatUpcomingChapter(nextChapter)}
                            </dd>
                        </>}
                    </dl>
                    <p>Setiap cerita punya tempat untuk kembali.</p>
                </aside>
            </div>
        </div>
    </main>;
}
function About() {
    return <main className="v6-about v67-about">
        <section className="v67-about-intro">
            <span className="v67-kicker"><Feather size={15}/> MENGENAL KATAKECIL</span>
            <h1>Ruang kecil untuk <em>cerita yang berarti.</em></h1>
            <p>KataKecil adalah perpustakaan cerita pribadi yang dibuat agar setiap kisah punya tempat untuk dibaca, disimpan, dan dikunjungi kembali.</p>
        </section>
        <section className="v67-about-author" aria-label="Tentang penulis">
            <div className="v67-author-avatar" aria-hidden="true">K</div>
            <div><span className="v67-kicker">PENULIS KATAKECIL</span><h2>Karisyono</h2><p>Cerita-cerita di KataKecil ditulis dan dikelola oleh Karisyono. Selamat datang, dan selamat menemukan kisah yang ingin kamu baca.</p></div>
        </section>
        <section className="v67-about-features" aria-label="Apa yang bisa dilakukan di KataKecil">
            <article><BookOpen size={22}/><h3>Baca dengan nyaman</h3><p>Pilih tema terang atau gelap, atur tipografi, dan lanjutkan bacaanmu.</p></article>
            <article><Bookmark size={22}/><h3>Simpan cerita</h3><p>Tandai cerita favoritmu. Koleksi tersimpan pada browser perangkat ini.</p></article>
        </section>
        <Action to="/cerita" className="v67-about-cta">Jelajahi perpustakaan <ArrowRight size={17}/></Action>
    </main>;
}
export default function PublicLibrary({ path }: {
    path: string;
}) {
    const { books, episodes, schedules, loading, error, demo } = useLibrary();
    const { theme } = useUiTheme();
    const { ids: collectionIds } = useCollection();
    const showCollection = books.some(book => collectionIds.includes(book.id));
    const slug = path.startsWith('/cerita/') ? decodeURIComponent(path.split('/')[2] || '') : null;
    const book = slug ? books.find(b => b.slug === slug) : undefined;
    useEffect(() => { document.title = `${book?.title ? `${book.title} · ` : path === '/cerita' ? 'Perpustakaan · ' : path === '/koleksi' ? 'Koleksi · ' : path === '/tentang' ? 'Tentang · ' : ''}KataKecil`; }, [book?.title, path]);
    if (loading)
        return <ThemeLoading context="public" text="Membuka perpustakaan…"/>;
    return <div className={`site-shell v6-public ${slug ? 'v63-public-detail' : ''}`} data-kk-theme={theme}><PublicHeader path={path} showCollection={showCollection}/>
    {demo && <div className="v6-demo-notice"><Sparkles size={14}/> Mode pratinjau: delapan cerita di layar adalah contoh visual, bukan konten terbit.</div>}
    {error && <div className="v6-error" role="alert">{error}</div>}
    {path === '/tentang' ? <About /> : path === '/koleksi' ? <Listing books={books} episodes={episodes} demo={demo} collection/> : slug ? (book ? <Detail book={book} episodes={episodes} schedules={schedules} demo={demo}/> : <div className="v6-missing"><h1>Cerita tidak ditemukan.</h1><Action to="/cerita" className="v6-button v6-button-gold">Kembali ke perpustakaan</Action></div>) : path === '/cerita' ? <Listing books={books} episodes={episodes} demo={demo}/> : <Home books={books} episodes={episodes} schedules={schedules} demo={demo}/>}
  </div>;
}
