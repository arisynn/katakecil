import {useState} from 'react';
import {isNativeApp} from '../../../native/platform';
import NotificationSettings from '../../notifications/NotificationSettings';
import type { User } from '@supabase/supabase-js';
import BrandIcon from '../../../components/BrandIcon';
import { Cover } from '../../covers/AuthorCover';
import { episodeStatus, formatWib, type Book, type Episode } from '../../../data/library';
import { B, authorName } from './StudioShared';

export function Dashboard({ books, episodes, user }: {
  books: Book[];
  episodes: Episode[];
  user: User;
}) {
  const drafts = episodes.filter(ep => episodeStatus(ep) === 'Draft');
  const published = episodes.filter(ep => episodeStatus(ep) === 'Terbit');
  const scheduled = episodes.filter(ep => episodeStatus(ep) === 'Terjadwal')
    .sort((a, b) => new Date(a.release_at!).getTime() - new Date(b.release_at!).getTime());
  const lastEdited = [...drafts].sort((a, b) =>
    new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0];
  const currentBook = books.find(book => book.id === lastEdited?.book_id);
  const name = authorName(user);
  const mostRecent = [...books].sort((a, b) =>
    new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()).slice(0, 4);

  return <div className="v69-dashboard v72-dashboard">
    <header className="studio-page-head v69-welcome">
      <span className="studio-kicker">KATAKECIL · STUDIO PENULIS</span>
      <h1>Halo, {name}.</h1>
      <p>Ruang tenang untuk melanjutkan cerita.</p>
    </header>

    {lastEdited && currentBook ? <section className="v69-resume v72-resume" aria-label="Lanjutkan menulis">
      <div className="v69-resume-kicker"><BrandIcon name="file-pen" size={17}/> LANJUTKAN MENULIS</div>
      <h2>{lastEdited.title || `Bab ${lastEdited.episode_number}`}</h2>
      <p>{currentBook.title} · {lastEdited.episode_number === 0 ? 'Prolog' : `Bab ${lastEdited.episode_number}`} · Draft</p>
      <small className="kk-v71-resume-timestamp">Terakhir diedit: {formatWib(lastEdited.updated_at)}</small>
      <B to={`/studio/editor/${lastEdited.id}`} className="studio-primary">
        Buka editor <BrandIcon name="arrow-right" size={17}/>
      </B>
    </section> : <section className="v69-resume v72-resume v69-resume-empty">
      <div className="v69-resume-kicker"><BrandIcon name="pen" size={17}/> RUANG KARYA</div>
      <h2>{books.length ? 'Tidak ada draft yang menunggu.' : 'Cerita pertamamu menunggu.'}</h2>
      <p>{books.length ? 'Buka daftar karya untuk membuat bab baru.' : 'Buat karya baru, lalu tulis bab pertamamu.'}</p>
      <B to={books.length ? '/studio/cerita' : '/studio/cerita/baru'} className="studio-primary">
        {books.length ? 'Buka Karya' : 'Buat Karya'} <BrandIcon name="arrow-right" size={17}/>
      </B>
    </section>}

    <nav className="v72-quick-actions" aria-label="Tindakan cepat Studio">
      <B to="/studio/impor"><BrandIcon name="upload" size={17}/> Impor naskah</B>
      <B to="/studio/jadwal"><BrandIcon name="calendar" size={17}/> Atur jadwal</B>
    </nav>

    <section className="v69-dashboard-stats v72-dashboard-stats" aria-label="Ringkasan status bab">
      <div><span>Draft</span><strong>{drafts.length}</strong><BrandIcon name="file-pen" size={17}/></div>
      <div><span>Terjadwal</span><strong>{scheduled.length}</strong><BrandIcon name="calendar" size={17}/></div>
      <div><span>Terbit</span><strong>{published.length}</strong><BrandIcon name="check-circle" size={17}/></div>
    </section>

    <div className="v72-dashboard-grid">
      <section className="studio-panel v69-work-list v72-work-list">
        <div className="studio-panel-top">
          <h2>Karya Saya</h2>
          {books.length > 0 && <B to="/studio/cerita" className="studio-text-button">Lihat semua <BrandIcon name="chevron-right" size={16}/></B>}
        </div>
        {mostRecent.length ? mostRecent.map(book => <B
          key={book.id} to={`/studio/cerita/${book.id}`} className="studio-book-row">
          <Cover book={book} size="mini"/>
          <span className="studio-book-text"><strong>{book.title}</strong>
            <small>{episodes.filter(ep => ep.book_id === book.id).length} bab · {book.is_published ? 'Publik' : 'Privat'}</small>
          </span><BrandIcon name="chevron-right" size={17}/>
        </B>) : <p className="studio-muted">Belum ada karya. Mulai dari tombol Buat Karya di atas.</p>}
      </section>


    </div>
    <p className="studio-footnote"><BrandIcon name="shield" size={15}/> Studio privat · Akun {user.email}</p>
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
      <div><span>Novel</span><strong>{books.length}</strong><BrandIcon name="books" size={19}/></div>
      <div><span>Terbit</span><strong>{published}</strong><BrandIcon name="check-circle" size={19}/></div>
      <div><span>Terjadwal</span><strong>{scheduled}</strong><BrandIcon name="calendar" size={19}/></div>
      <div><span>Draft</span><strong>{drafts}</strong><BrandIcon name="file-pen" size={19}/></div>
    </div>
    <section className="studio-panel"><h2>Status per karya</h2>
      {books.length ? books.map(book => <B key={book.id}
        to={`/studio/cerita/${book.id}`} className="studio-manage-item">
        <Cover book={book} size="mini"/>
        <span><strong>{book.title}</strong><small>
          {episodes.filter(ep => ep.book_id === book.id && episodeStatus(ep) === 'Terbit').length} bab terbit dari {episodes.filter(ep => ep.book_id === book.id).length} bab
        </small></span><BrandIcon name="chevron-right" size={17}/>
      </B>) : <p className="studio-muted">Belum ada data karya.</p>}
    </section>
  </div>;
}

export function StudioSettings() {
  const [notifications,setNotifications]=useState(false);
  return <><div className="studio-page-head"><span className="studio-kicker">PREFERENSI & KEAMANAN</span>
    <h1>Pengaturan</h1><p>Preferensi tampilan dan informasi akses Studio.</p>
  </div><div className="writer-settings-grid" aria-label="Pengaturan Studio">
    <section className="studio-panel"><h2><BrandIcon name="download" size={20}/> Aplikasi</h2><p>{isNativeApp?'KataKecil sudah terpasang di perangkatmu.':'Baca cerita melalui aplikasi KataKecil untuk Android.'} Membaca dan menyimpan memerlukan internet.</p><div className="writer-action-row">{!isNativeApp?<button type="button" className="studio-light-button" onClick={()=>window.dispatchEvent(new Event('kk:install'))}>Unduh APK Android</button>:<button type="button" className="studio-light-button" onClick={()=>window.dispatchEvent(new Event('kk:check-update'))}>Periksa pembaruan</button>}</div></section>
    <section className="studio-panel"><h2><BrandIcon name="settings" size={20}/> Preferensi</h2><p>Tema Terang dan Gelap di bilah atas berlaku untuk Library, Studio, dan halaman membaca.</p>{isNativeApp&&<><p>Atur pengingat membaca dan kabar bab baru sesuai pilihanmu.</p><button type="button" className="studio-light-button" onClick={()=>setNotifications(true)}>Atur notifikasi</button></>}</section>
    <section className="studio-panel"><h2><BrandIcon name="shield" size={20}/> Keamanan</h2><p>Studio hanya dapat dibuka oleh akun penulis yang terdaftar.</p><p>Ekspor data, jadwal, dan Sampah tetap tersedia melalui menu Studio.</p></section>
  </div>{notifications&&<NotificationSettings onClose={()=>setNotifications(false)}/>}</>;
}
