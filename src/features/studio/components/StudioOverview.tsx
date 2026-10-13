import type { User } from '@supabase/supabase-js';
import {
  ArrowRight, CalendarDays, Check, ChevronRight, FilePenLine,
  Library, ShieldCheck,
} from 'lucide-react';
import { Cover } from '../../../components/Cover';
import { episodeStatus, formatWib, type Book, type Episode } from '../../../data/library';
import { B, authorName } from './StudioShared';

export function Dashboard({ books, episodes, user }: {
  books: Book[];
  episodes: Episode[];
  user: User;
}) {
  const drafts = episodes.filter(ep => episodeStatus(ep) === 'Draft');
  const published = episodes.filter(ep => episodeStatus(ep) === 'Terbit');
  const scheduled = episodes
    .filter(ep => episodeStatus(ep) === 'Terjadwal')
    .sort((a, b) => new Date(a.release_at!).getTime() - new Date(b.release_at!).getTime());
  const lastEdited = [...drafts].sort((a, b) =>
    new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0];
  const currentBook = books.find(book => book.id === lastEdited?.book_id);
  const name = authorName(user);

  return <div className="v69-dashboard">
    <header className="studio-page-head v69-welcome">
      <span className="studio-kicker">RUANG MENULIS</span>
      <h1>Halo, {name}.</h1>
      <p>Lanjutkan kisahmu dari tempat terakhir.</p>
    </header>

    {lastEdited && currentBook ? <section className="v69-resume" aria-label="Lanjutkan menulis">
      <div className="v69-resume-kicker"><FilePenLine size={17}/> LANJUTKAN MENULIS</div>
      <h2>{lastEdited.title || `Bab ${lastEdited.episode_number}`}</h2>
      <p>{currentBook.title} · Bab {lastEdited.episode_number} · Draft</p>
      <B to={`/studio/editor/${lastEdited.id}`} className="studio-primary">
        Buka editor <ArrowRight size={17}/>
      </B>
    </section> : <section className="v69-resume v69-resume-empty">
      <div className="v69-resume-kicker"><FilePenLine size={17}/> MULAI BERKARYA</div>
      <h2>{books.length ? 'Semua draft sudah ditangani.' : 'Cerita pertamamu menunggu.'}</h2>
      <p>{books.length ? 'Pilih karya untuk membuat bab berikutnya.' : 'Buat karya baru dan mulai menulis.'}</p>
      <B to={books.length ? '/studio/cerita' : '/studio/cerita/baru'} className="studio-primary">
        {books.length ? 'Buka Karya' : 'Buat Karya'} <ArrowRight size={17}/>
      </B>
    </section>}

    <section className="v69-dashboard-stats" aria-label="Ringkasan status episode">
      <div><span>Draft</span><strong>{drafts.length}</strong><FilePenLine size={17}/></div>
      <div><span>Terjadwal</span><strong>{scheduled.length}</strong><CalendarDays size={17}/></div>
      <div><span>Terbit</span><strong>{published.length}</strong><Check size={17}/></div>
    </section>

    <section className="studio-panel v69-work-list">
      <div className="studio-panel-top">
        <h2>Karya Saya</h2>
        {books.length > 0 && <B to="/studio/cerita" className="studio-text-button">Lihat semua <ChevronRight size={16}/></B>}
      </div>
      {books.length ? books.slice(0, 4).map(book => <B
        key={book.id} to={`/studio/cerita/${book.id}`} className="studio-book-row">
        <Cover book={book} size="mini"/>
        <span className="studio-book-text"><strong>{book.title}</strong>
          <small>{episodes.filter(ep => ep.book_id === book.id).length} bab · {book.is_published ? 'Publik' : 'Privat'}</small>
        </span><ChevronRight size={17}/>
      </B>) : <p className="studio-muted">Belum ada karya. Mulai dari tombol Buat Karya di atas.</p>}
    </section>

    {scheduled[0] && <section className="studio-panel v69-next-release">
      <div className="studio-panel-top"><h2>Publikasi Terdekat</h2><CalendarDays size={18}/></div>
      <B to={`/studio/editor/${scheduled[0].id}`} className="v69-next-release-link">
        <span><strong>{scheduled[0].title}</strong>
          <small>{formatWib(scheduled[0].release_at)}</small></span>
        <ChevronRight size={18}/>
      </B>
    </section>}
    <p className="studio-footnote"><ShieldCheck size={15}/> Studio privat · Akun {user.email}</p>
  </div>;
}

export function Analytics({ books, episodes }: { books: Book[]; episodes: Episode[] }) {
  const published = episodes.filter(ep => episodeStatus(ep) === 'Terbit').length;
  const scheduled = episodes.filter(ep => episodeStatus(ep) === 'Terjadwal').length;
  const drafts = episodes.filter(ep => episodeStatus(ep) === 'Draft').length;
  return <div className="v69-analytics">
    <div className="studio-page-head"><span className="studio-kicker">DATA PUBLIKASI</span>
      <h1>Analytics</h1>
      <p>Statistik dari database Studio. Data pembaca tidak ditampilkan jika belum tersedia.</p>
    </div>
    <div className="studio-stats v6-studio-metrics">
      <div><span>Novel</span><strong>{books.length}</strong><Library size={19}/></div>
      <div><span>Terbit</span><strong>{published}</strong><Check size={19}/></div>
      <div><span>Terjadwal</span><strong>{scheduled}</strong><CalendarDays size={19}/></div>
      <div><span>Draft</span><strong>{drafts}</strong><FilePenLine size={19}/></div>
    </div>
    <section className="studio-panel"><h2>Status per karya</h2>
      {books.length ? books.map(book => <B key={book.id}
        to={`/studio/cerita/${book.id}`} className="studio-manage-item">
        <Cover book={book} size="mini"/>
        <span><strong>{book.title}</strong><small>
          {episodes.filter(ep => ep.book_id === book.id && episodeStatus(ep) === 'Terbit').length} bab terbit dari {episodes.filter(ep => ep.book_id === book.id).length} bab
        </small></span><ChevronRight size={17}/>
      </B>) : <p className="studio-muted">Belum ada data karya.</p>}
    </section>
  </div>;
}

export function StudioSettings() {
  return <><div className="studio-page-head"><span className="studio-kicker">PREFERENSI & KEAMANAN</span>
    <h1>Pengaturan</h1><p>Preferensi tampilan dan informasi akses Studio.</p>
  </div><section className="studio-panel v6-settings-panel">
    <h2>Tampilan</h2><p>Tema Terang dan Gelap di bilah atas berlaku untuk seluruh KataKecil, termasuk Reader.</p>
    <h2>Keamanan Studio</h2><p>Hanya akun yang terdaftar sebagai penulis yang dapat mengelola cerita.
      Alat database, jadwal, dan sampah tersedia melalui menu Alat Studio.</p>
  </section></>;
}
