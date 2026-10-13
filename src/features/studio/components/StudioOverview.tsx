import React from 'react';
import type { User } from '@supabase/supabase-js';
import { ArrowRight, BookOpen, CalendarDays, Check, ChevronRight, FilePenLine, Library, Plus, ShieldCheck, UploadCloud } from 'lucide-react';
import { Cover } from '../../../components/Cover';
import { formatWib, episodeStatus, type Book, type Episode } from '../../../data/library';
import { B, authorName } from './StudioShared';
export function Dashboard({ books, episodes, user }: {
    books: Book[];
    episodes: Episode[];
    user: User;
}) {
    const draft = episodes.filter(e => episodeStatus(e) === 'Draft');
    const live = episodes.filter(e => episodeStatus(e) === 'Terbit');
    const scheduled = episodes.filter(e => episodeStatus(e) === 'Terjadwal').sort((a, b) => new Date(a.release_at!).getTime() - new Date(b.release_at!).getTime());
    const recent = [...draft].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0];
    const recentBook = books.find(b => b.id === recent?.book_id);
    const name = authorName(user);
    return <div className="v6-studio-dashboard">
  <div className="studio-page-head v6-dashboard-welcome"><span className="studio-kicker">DASHBOARD / RUANG KARYA</span><h1>Halo, {name} <span className="v6-wave">✦</span></h1><p>Selamat datang kembali di studio kamu.</p></div>
  <div className="studio-stats v6-studio-metrics"><div><span>Total Cerita</span><strong>{books.length}</strong><Library size={19}/></div><div><span>Total Bab</span><strong>{episodes.length}</strong><BookOpen size={19}/></div><div><span>Draft</span><strong>{draft.length}</strong><FilePenLine size={19}/></div><div><span>Bab Terbit</span><strong>{live.length}</strong><Check size={19}/></div></div>
  <div className="v6-quick-actions"><h2>Quick Actions</h2><div><B to="/studio/cerita/baru" className="v6-quick-gold"><Plus size={18}/>Cerita Baru</B><B to="/studio/impor" className="v6-quick-blue"><UploadCloud size={18}/>Impor Naskah</B><B to="/studio/jadwal" className="v6-quick-violet"><CalendarDays size={17}/>Jadwal</B></div></div>
  <section className="studio-panel studio-my-books v6-active-books"><div className="studio-panel-top"><h2>Karya Aktif</h2><B to="/studio/cerita" className="studio-text-button">Lihat Semua <ArrowRight size={15}/></B></div>{books.length ? <div className="studio-books-scroll">{books.slice(0, 4).map(b => <B key={b.id} to={`/studio/cerita/${b.id}`} className="studio-book-row"><Cover book={b} size="mini"/><span className="studio-book-text"><strong>{b.title}</strong><small>{episodes.filter(e => e.book_id === b.id).length} Bab · {b.is_published ? 'Publik' : 'Privat'}</small></span><ChevronRight size={17}/></B>)}</div> : <div className="v6-studio-empty"><picture><source media="(max-width: 600px)" srcSet="/assets/v6/empty-library-mobile.webp" type="image/webp"/><img src="/assets/v6/empty-library.webp" alt="Buku terbuka di meja" loading="lazy" decoding="async"/></picture><h3>Belum ada karya di Studio</h3><p>Mulai menulis cerita pertamamu.</p><B to="/studio/cerita/baru" className="studio-primary"><Plus size={16}/>Cerita Baru</B></div>}</section>
  <div className="studio-dashboard-grid v6-studio-activity"><section className="studio-panel studio-continue"><div className="studio-panel-top"><h2>Lanjutkan Menulis</h2><FilePenLine size={18}/></div>{recent && recentBook ? <><h3>{recent.title}</h3><p className="studio-muted">{recentBook.title} · Bab {recent.episode_number}</p><B to={`/studio/editor/${recent.id}`} className="studio-primary">Buka editor <ArrowRight size={17}/></B></> : <p className="studio-muted">Tidak ada draft yang sedang dikerjakan.</p>}</section><section className="studio-panel"><div className="studio-panel-top"><h2>Publikasi Mendatang</h2><CalendarDays size={18}/></div>{scheduled[0] ? <><h3>{scheduled[0].title}</h3><p className="studio-muted">{formatWib(scheduled[0].release_at)}</p></> : <p className="studio-muted">Belum ada jadwal publikasi.</p>}</section></div>
  <p className="studio-footnote"><ShieldCheck size={15}/> Studio privat · Masuk sebagai {user.email}</p>
 </div>;
}
export function Analytics({ books, episodes }: {
    books: Book[];
    episodes: Episode[];
}) {
    const published = episodes.filter(e => episodeStatus(e) === 'Terbit').length;
    const scheduled = episodes.filter(e => episodeStatus(e) === 'Terjadwal').length;
    const drafts = episodes.filter(e => episodeStatus(e) === 'Draft').length;
    return <><div className="studio-page-head"><span className="studio-kicker">DATA PUBLIKASI NYATA</span><h1>Analytics</h1><p>Ringkasan karya dan status penerbitan berdasarkan database Studio. Statistik pembaca tidak ditampilkan karena belum tersedia.</p></div><div className="studio-stats v6-studio-metrics"><div><span>Novel</span><strong>{books.length}</strong><Library size={19}/></div><div><span>Terbit</span><strong>{published}</strong><Check size={19}/></div><div><span>Terjadwal</span><strong>{scheduled}</strong><CalendarDays size={19}/></div><div><span>Draft</span><strong>{drafts}</strong><FilePenLine size={19}/></div></div><section className="studio-panel"><h2>Status per karya</h2>{books.length ? books.map(book => <B key={book.id} to={`/studio/cerita/${book.id}`} className="studio-manage-item"><Cover book={book} size="mini"/><span><strong>{book.title}</strong><small>{episodes.filter(e => e.book_id === book.id && episodeStatus(e) === 'Terbit').length} bab terbit dari {episodes.filter(e => e.book_id === book.id).length} bab</small></span><ChevronRight size={17}/></B>) : <p className="studio-muted">Belum ada data karya.</p>}</section></>;
}
export function StudioSettings() {
    return <><div className="studio-page-head"><span className="studio-kicker">PREFERENSI & KEAMANAN</span><h1>Pengaturan</h1><p>Preferensi aplikasi dan informasi akses Studio.</p></div><section className="studio-panel v6-settings-panel"><h2>Tampilan</h2><p>Gunakan tombol tema di bilah atas untuk beralih antara Terang dan Gelap. Pilihan ini juga berlaku untuk Beranda, Perpustakaan, Reader, dan Daftar Bab.</p><h2>Keamanan Studio</h2><p>Hanya akun dengan keanggotaan penulis yang dapat mengakses pengelolaan cerita. Alat database dan sampah tersedia pada navigasi Studio.</p></section></>;
}
