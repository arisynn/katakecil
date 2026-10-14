import BrandIcon from '../components/BrandIcon';
import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import DiscoveryNotices from '../features/public/components/DiscoveryNotices';
import { selectRecentChapters } from '../features/public/recentChapters';
import { filterSavedStories, sortSavedStories, type CollectionFilter } from '../features/public/collectionFilters';
import { getPublicUpcomingChapters, formatUpcomingChapter, type UpcomingChapter } from '../data/publicSchedule';
import { getPublicAnnouncements, type PublicAnnouncement } from '../data/announcements';
import { newestReadingProgress, parseReadingProgress } from '../utils/readingProgress';
import { readerHeading } from '../utils/readerHeading';
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
        announcements: PublicAnnouncement[];
    }>({ books: [], episodes: [], schedules: [], announcements: [] });
    const [loading, setLoading] = useState(isConfigured);
    const [error, setError] = useState('');
    useEffect(() => {
        let active = true;
        if (!isConfigured) {
            setData({ books: demoBooks, episodes: [], schedules: [], announcements: [] });
            setLoading(false);
            return;
        }
        Promise.all([getPublicLibrary(), getPublicUpcomingChapters(), getPublicAnnouncements()]).then(([library, schedules, announcements]) => {
            if (active) setData({ ...library, schedules, announcements });
        }).catch(e => { if (active)
            setError(e instanceof Error ? e.message : 'Gagal memuat perpustakaan.'); }).finally(() => { if (active)
            setLoading(false); });
        return () => { active = false; };
    }, []);
    // When a chapter or notice visibility boundary passes, refresh public metadata.
    // The reader never receives future chapter bodies or titles.
    useEffect(() => {
        if (!isConfigured) return;
        const now = Date.now();
        const boundaries = [
          ...data.schedules.map(item => Date.parse(item.release_at)),
          ...data.announcements.flatMap(item => item.ends_at ? [Date.parse(item.ends_at)] : []),
        ].filter(date => Number.isFinite(date) && date > now);
        // A periodic refresh also catches announcements scheduled after initial load.
        const nextRelease = boundaries.length ? Math.min(...boundaries) : now + 600_000;
        if (!Number.isFinite(nextRelease)) return;
        const delay = Math.max(1000, Math.min(nextRelease - Date.now() + 2000, 600_000));
        let active = true;
        const timer = window.setTimeout(() => {
            Promise.all([getPublicLibrary(), getPublicUpcomingChapters(), getPublicAnnouncements()])
                .then(([library, schedules, announcements]) => {
                    if (active) setData({ ...library, schedules, announcements });
                })
                .catch(() => { /* Keep the existing public catalog on transient errors. */ });
        }, delay);
        return () => { active = false; window.clearTimeout(timer); };
    }, [data.schedules, data.announcements]);
    return { ...data, loading, error, demo: !isConfigured };
}
const countFor = (episodes: EpisodeSummary[], book: Book) => episodes.filter(e => e.book_id === book.id).length;
function readProgress(book: Book) {
    try {
        const v = JSON.parse(localStorage.getItem(`kk-secure-progress-${book.id}`) || 'null');
        return parseReadingProgress(v);
    }
    catch {
        return null;
    }
}
function Home({ books, episodes, demo }: {
    books: Book[]; episodes: EpisodeSummary[]; schedules: UpcomingChapter[]; demo: boolean;
}) {
    const recentChapters = useMemo(() => demo ? [] : selectRecentChapters(books, episodes), [books, episodes, demo]);
    const published = useMemo(() => demo ? books : books.filter(book => countFor(episodes, book) > 0), [books, episodes, demo]);
    const featured = useMemo(() => {
        const picks = published.filter(book => book.is_featured);
        return [...picks, ...published.filter(book => !book.is_featured)].slice(0, 8);
    }, [published]);
    const latest = demo ? null : newestReadingProgress(published, episodes, readProgress);
    const continuation = latest?.book;
    const episode = latest?.progress.ep ?? null;
    return <main className="kk-v7-home" aria-label="Beranda KataKecil">
      <div className="kk-v7-home-inner">
        <div className="kk-v7-home-intro"><span className="kk-v7-kicker">CERITA KECIL, MAKNA BESAR</span><h1>Selamat datang di KataKecil.</h1><p>Cerita yang bisa kamu bawa ke mana saja.</p></div>
        {continuation && episode !== null && <section className="kk-v7-home-section" aria-label="Lanjut membaca">
          <Heading title="Lanjut Membaca"/>
          <button className="v68-continue-card" type="button" onClick={()=>navigate(`/baca/${continuation.slug}`)} aria-label={`Lanjutkan ${continuation.title} dari bab ${episode}`}>
            <div className="v68-continue-cover"><Cover book={continuation} eager/></div>
            <div className="v68-continue-info"><strong>{continuation.title}</strong><span>Bab {episode} · {countFor(episodes, continuation)} bab tersedia</span></div>
            <span className="v68-continue-arrow" aria-hidden="true"><BrandIcon name="arrow-right" size={19}/></span>
          </button>
        </section>}
        {featured.length>0 && <section className="kk-v7-home-section" aria-label="Cerita pilihan">
          <Heading title="Cerita Pilihan" to="/temukan"/>
          <div className="kk-v7-featured-rail">{featured.map(book=><BookCard key={book.id} book={book} count={countFor(episodes,book)} demo={demo}/>)}</div>
        </section>}
        {recentChapters.length>0 && <section className="kk-v7-home-section" aria-label="Bab baru">
          <Heading title="Bab Baru"/>
          <div className="v68-chapter-list">{recentChapters.slice(0,2).map(({book,episode:ep})=><button key={`${book.id}:${ep.episode_number}`} type="button" className="v68-chapter-item" onClick={()=>navigate(`/baca/${book.slug}?episode=${ep.episode_number}`)}>
            <span className="v68-chapter-number" aria-hidden="true">{ep.episode_number===0?'P':ep.episode_number}</span>
            <span className="v68-chapter-copy"><strong>{ep.title}</strong><small>{book.title} · {new Intl.DateTimeFormat('id-ID',{timeZone:'Asia/Jakarta',day:'numeric',month:'short'}).format(new Date(ep.release_at!))}</small></span>
            <BrandIcon name="chevron-right" size={17} aria-hidden="true"/>
          </button>)}</div>
        </section>}
        {featured.length===0 && <EmptyLibrary/>}
      </div>
    </main>;
}
function Listing({ books, episodes, schedules, announcements = [], demo, collection = false }: {
    books: Book[]; episodes: EpisodeSummary[]; schedules: UpcomingChapter[]; announcements?: PublicAnnouncement[]; demo: boolean; collection?: boolean;
}) {
    const params = new URLSearchParams(window.location.search);
    const [q, setQ] = useState(params.get('q') || '');
    const [filter, setFilter] = useState(params.get('genre') || 'Semua');
    const [status, setStatus] = useState('Semua');
    const [sort, setSort] = useState('terbaru');
    const [collectionFilter, setCollectionFilter] = useState<CollectionFilter>('semua');
    const input = useRef<HTMLInputElement>(null);
    const { ids, toggle } = useCollection();
    useEffect(() => {
      const sync=()=>{const next=new URLSearchParams(window.location.search);setQ(next.get('q')||'');setFilter(next.get('genre')||'Semua');if(next.get('focus')==='1')requestAnimationFrame(()=>input.current?.focus());};
      sync();window.addEventListener('quiet:navigate',sync);return()=>window.removeEventListener('quiet:navigate',sync);
    }, []);
    const eligible = useMemo(()=>books.filter(book=>(collection||demo||countFor(episodes,book)>0)&&(!collection||ids.includes(book.id))),[books,episodes,collection,ids,demo]);
    const genres = useMemo(()=>['Semua',...new Set(eligible.map(book=>book.genre).filter(Boolean))],[eligible]);
    const shown = useMemo(()=>{
      const term=q.trim().toLocaleLowerCase('id-ID');
      return eligible.filter(book=>(filter==='Semua'||book.genre===filter)&&(status==='Semua'||(status==='Tamat'?book.status==='completed':book.status!=='completed'))&&`${book.title} ${book.synopsis} ${book.genre}`.toLocaleLowerCase('id-ID').includes(term))
        .sort((a,b)=>sort==='judul'?a.title.localeCompare(b.title,'id-ID'):new Date(b.updated_at).getTime()-new Date(a.updated_at).getTime());
    },[eligible,filter,status,q,sort]);
    const savedStories = collection ? sortSavedStories(eligible, ids) : [];
    const filteredSaved = filterSavedStories(savedStories, collectionFilter, book => readProgress(book)?.ep ?? null);
    if(collection) return <main className="kk-v7-collection kk-v7-page">
      <div className="kk-v7-page-heading"><span className="kk-v7-kicker">RAK PRIBADIMU</span><h1>Koleksi Saya</h1><p>Cerita yang kamu simpan, tetap ada di perangkat ini.</p></div>
      {savedStories.length===0?<EmptyLibrary collection/>:<>
        <div className="kk-v7-collection-toolbar" role="group" aria-label="Filter koleksi">
          {([['semua','Semua'],['dibaca','Ada Progres'],['belum','Belum Dibaca']] as const).map(([value,label])=><button
            type="button" key={value} aria-pressed={collectionFilter===value}
            className={collectionFilter===value?'active':''} onClick={()=>setCollectionFilter(value)}>{label}</button>)}
        </div>
        {filteredSaved.length===0?<div className="kk-v7-collection-filter-empty" role="status">
          <p>Belum ada cerita dalam kategori ini.</p>
          <button type="button" onClick={()=>setCollectionFilter('semua')}>Tampilkan semua koleksi</button>
        </div>:<div className="kk-v7-collection-list">{filteredSaved.map(book=>{const progress=readProgress(book);return <article className="kk-v7-collection-item" key={book.id}>
          <button className="kk-v7-collection-open" type="button" onClick={()=>navigate(`/cerita/${book.slug}`)} aria-label={`Lihat ${book.title}`}><div className="kk-v7-collection-cover"><Cover book={book}/></div><span className="kk-v7-collection-info"><strong>{book.title}</strong><small>{progress!==null?`Terakhir dibaca: Bab ${progress.ep}`:`${countFor(episodes,book)} bab tersedia`}</small><span>Lihat cerita <BrandIcon name="chevron-right" size={15}/></span></span></button>
          <button type="button" className="kk-v7-collection-remove" onClick={()=>toggle(book.id)} aria-label={`Hapus ${book.title} dari Koleksi`} title="Hapus dari Koleksi"><BrandIcon name="bookmark-check" size={18}/></button>
        </article>})}</div>}
      </>}
    </main>;
    return <main className="kk-v7-discover kk-v7-page">
      <div className="kk-v7-page-heading"><span className="kk-v7-kicker">RUANG UNTUK MENEMUKAN</span><h1>Temukan</h1><p>Jelajahi cerita dan kabar terbaru dari Karisyono.</p></div>
      {!demo && <DiscoveryNotices books={books} episodes={episodes} schedules={schedules} announcements={announcements}/>}
      <div className="kk-v7-discover-tools"><div className="v6-library-search"><BrandIcon name="search" size={19}/><input ref={input} type="search" aria-label="Cari judul atau genre" placeholder="Cari judul atau genre..." value={q} onChange={e=>setQ(e.target.value)}/>{q&&<button type="button" aria-label="Hapus pencarian" onClick={()=>setQ('')}><BrandIcon name="close" size={16}/></button>}</div>
        <div className="kk-v7-filter-row" role="group" aria-label="Status cerita">{['Semua','Tamat','Berlangsung'].map(value=><button type="button" key={value} aria-pressed={status===value} className={status===value?'active':''} onClick={()=>setStatus(value)}>{value}</button>)}</div>
        {genres.length>1&&<div className="v6-genre-pills">{genres.map(value=><button type="button" key={value} className={filter===value?'selected':''} aria-pressed={filter===value} onClick={()=>setFilter(value)}>{value}</button>)}</div>}
        <label className="kk-v7-sort">Urutkan <BrandIcon name="chevron-down" size={14}/><select aria-label="Urutkan cerita" value={sort} onChange={e=>setSort(e.target.value)}><option value="terbaru">Terbaru</option><option value="judul">Judul A–Z</option></select></label>
      </div>
      <div className="kk-v7-discover-title"><h2>Jelajahi Cerita</h2><span>{shown.length} cerita</span></div>
      {shown.length?<div className="kk-v7-discover-grid">{shown.map(book=><BookCard key={book.id} book={book} count={countFor(episodes,book)} demo={demo}/>)}</div>:eligible.length===0?<EmptyLibrary/>:<div className="kk-v7-no-results"><BrandIcon name="search" size={24}/><h2>Belum ada cerita yang cocok</h2><p>Coba kata kunci atau filter lain.</p><button type="button" onClick={()=>{setQ('');setFilter('Semua');setStatus('Semua');}}>Reset filter</button></div>}
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
    const progress = readProgress(book);
    const resumeChapter = progress && rows.some(ep => ep.episode_number === progress.ep) ? progress.ep : null;
    const bookStatus = book.status === 'completed' ? 'Tamat'
        : book.status === 'hiatus' ? 'Jeda' : 'Berlangsung';

    return <main className="v6-detail-page">
        <div className="v6-detail-content">
            <Action to="/temukan" className="v6-detail-back">
                <BrandIcon name="arrow-left" size={17}/><span>Temukan</span>
            </Action>
            <section className="v6-detail-hero">
                <div className="v6-detail-cover">
                    <Cover book={book} size="large" eager/>
                </div>
                <div className="v6-detail-info">
                    <h1>{book.title}</h1>
                    <div className="v6-detail-tags">
                        <span>{book.genre || 'Fiksi'}</span><span>{bookStatus}</span>
                    </div>
                    <div className="v6-detail-numbers">
                        <span><BrandIcon name="book-open" size={16}/>{demo ? 'Contoh' : `${rows.length} Bab`}</span>
                        <span><BrandIcon name="clock" size={16}/>{book.status === 'completed' ? 'Selesai' : 'Bersambung'}</span>
                    </div>
                    <p>{book.synopsis || 'Sinopsis belum ditambahkan oleh penulis.'}</p>
                    <div className="v6-detail-actions">
                        {rows.length > 0 && !demo
                            ? <Action className="v6-button v6-button-gold" to={`/baca/${book.slug}`}>
                                {resumeChapter !== null ? 'Lanjutkan Membaca' : 'Mulai Membaca'} <BrandIcon name="arrow-right" size={17}/>
                            </Action>
                            : <span className="v62-unavailable-chapters">Belum ada bab terbit</span>}
                      {!demo && <BookmarkButton book={book}/>}
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
                                    <strong>{readerHeading(ep.title, ep.episode_number).title || `Bab ${ep.episode_number}`}</strong>
                                    <small>{readerHeading(ep.title, ep.episode_number).eyebrow}</small>
                                </div>
                                <span className="v6-chapter-date">
                                    {ep.release_at ? new Date(ep.release_at).toLocaleDateString('id-ID', {
                                        timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short', year: 'numeric',
                                    }) : ''}
                                </span>
                                <BrandIcon name="chevron-right" size={16}/>
                            </button>)
                        : <div className="v6-no-chapters">
                            {demo
                                ? 'Ini hanya pratinjau visual. Hubungkan Supabase untuk membaca cerita asli.'
                                : 'Bab pertama belum diterbitkan.'}
                        </div>}
                    {rows.length > 18 && !showAll && <button
                        className="v6-show-chapters"
                        onClick={() => setShowAll(true)}
                    >Lihat semua bab <BrandIcon name="arrow-right" size={16}/></button>}
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
                                <BrandIcon name="calendar-clock" size={15} aria-hidden="true"/>
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
            <span className="v67-kicker"><BrandIcon name="pen" size={15}/> MENGENAL KATAKECIL</span>
            <h1>Ruang kecil untuk <em>cerita yang berarti.</em></h1>
            <p>KataKecil adalah perpustakaan cerita pribadi yang dibuat agar setiap kisah punya tempat untuk dibaca, disimpan, dan dikunjungi kembali.</p>
        </section>
        <section className="v67-about-author" aria-label="Tentang penulis">
            <div className="v67-author-avatar" aria-hidden="true">K</div>
            <div><span className="v67-kicker">PENULIS KATAKECIL</span><h2>Karisyono</h2><p>Cerita-cerita di KataKecil ditulis dan dikelola oleh Karisyono. Selamat datang, dan selamat menemukan kisah yang ingin kamu baca.</p></div>
        </section>
        <section className="v67-about-features" aria-label="Apa yang bisa dilakukan di KataKecil">
            <article><BrandIcon name="book-open" size={22}/><h3>Baca dengan nyaman</h3><p>Pilih tema terang atau gelap, atur tipografi, dan lanjutkan bacaanmu.</p></article>
            <article><BrandIcon name="bookmark" size={22}/><h3>Simpan cerita</h3><p>Tandai cerita favoritmu. Koleksi tersimpan pada browser perangkat ini.</p></article>
        </section>
        <Action to="/temukan" className="v67-about-cta">Temukan cerita <BrandIcon name="arrow-right" size={17}/></Action>
    </main>;
}
export default function PublicLibrary({ path }: {
    path: string;
}) {
    const { books, episodes, schedules, announcements, loading, error, demo } = useLibrary();
    const { theme } = useUiTheme();
    const slug = path.startsWith('/cerita/') ? decodeURIComponent(path.split('/')[2] || '') : null;
    const book = slug ? books.find(b => b.slug === slug) : undefined;
    useEffect(() => { document.title = `${book?.title ? `${book.title} · ` : (path === '/temukan' || path === '/cerita') ? 'Temukan · ' : path === '/koleksi' ? 'Koleksi · ' : path === '/tentang' ? 'Tentang · ' : ''}KataKecil`; }, [book?.title, path]);
    if (loading)
        return <ThemeLoading context="public" text="Menyiapkan KataKecil…"/>;
    return <div className={`site-shell v6-public ${slug ? 'v63-public-detail' : ''}`} data-kk-theme={theme}><PublicHeader path={path}/>
    {demo && <div className="v6-demo-notice"><BrandIcon name="sparkle" size={14}/> Mode pratinjau: delapan cerita di layar adalah contoh visual, bukan konten terbit.</div>}
    {error && <div className="v6-error" role="alert">{error}</div>}
    {path === '/tentang' ? <About /> : path === '/koleksi' ? <Listing books={books} episodes={episodes} schedules={schedules} announcements={announcements} demo={demo} collection/> : slug ? (book ? <Detail book={book} episodes={episodes} schedules={schedules} demo={demo}/> : <div className="v6-missing"><h1>Cerita tidak ditemukan.</h1><Action to="/temukan" className="v6-button v6-button-gold">Kembali ke Temukan</Action></div>) : (path === '/cerita' || path === '/temukan') ? <Listing books={books} episodes={episodes} schedules={schedules} announcements={announcements} demo={demo}/> : <Home books={books} episodes={episodes} schedules={schedules} demo={demo}/>}
  </div>;
}
