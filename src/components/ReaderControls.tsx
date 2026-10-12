import React from 'react';
import { ArrowLeft, House, Bookmark, BookmarkCheck, List, Search, Maximize2, Minimize2, Undo2, ChevronLeft, ChevronRight } from 'lucide-react';
import type { ThemeColors } from '../types/reader';

interface Props {
  title: string; chapterTitle: string; theme: ThemeColors; page: number; total: number;
  isBookmarked: boolean; fullscreen: boolean; canReturn: boolean;
  onContents: () => void; onSettings: () => void; onSearch: () => void;
  onBookmark: () => void; onFullscreen: () => void; onReturn: () => void;
  onExit: () => void; onClose: () => void; onPage: (page: number) => void;
  onPrevChapter: () => void; onNextChapter: () => void; prevChapter: boolean; nextChapter: boolean;
}
export function ReaderControls({ title, chapterTitle, theme, page, total, isBookmarked, fullscreen, canReturn, onContents, onSettings, onSearch, onBookmark, onFullscreen, onReturn, onClose, onPage, onPrevChapter, onNextChapter, prevChapter, nextChapter, onExit }: Props) {
  const percent = Math.round(page / Math.max(total, 1) * 100);
  return <>
    <header className="reader-control-header" style={{ background: theme.barBg, borderColor: theme.border, color: theme.text }}>
      <div className="control-inner">
        <button className="control-icon" onClick={onClose} aria-label="Tutup menu pembaca"><ArrowLeft size={19}/></button>
        <button className="control-icon reader-exit" title="Kembali ke detail cerita" aria-label="Keluar dari pembaca" onClick={onExit}><House size={18}/></button>
        <div className="control-titles"><span className="control-title">{title}</span><span className="control-subtitle" style={{ color: theme.secondaryText }}>{chapterTitle}</span></div>
        {canReturn && <button className="control-icon" title="Kembali ke posisi sebelumnya" onClick={onReturn}><Undo2 size={19}/></button>}
        <button className="control-icon" title="Penanda buku" aria-label={isBookmarked ? 'Hapus penanda' : 'Simpan penanda'} onClick={onBookmark}>{isBookmarked ? <BookmarkCheck size={19} fill="currentColor"/> : <Bookmark size={19}/>}</button>
        <button className="control-icon" title="Cari" aria-label="Cari teks" onClick={onSearch}><Search size={19}/></button>
        <button className="control-icon" title="Daftar isi" aria-label="Daftar isi" onClick={onContents}><List size={19}/></button>
        <button className="control-typography" title="Pengaturan tampilan" aria-label="Pengaturan tampilan" onClick={onSettings}>Aa</button>
        <button className="control-icon hidden-on-phone" title="Layar penuh" aria-label="Layar penuh" onClick={onFullscreen}>{fullscreen ? <Minimize2 size={18}/> : <Maximize2 size={18}/>}</button>
      </div>
    </header>
    <footer className="reader-control-footer" style={{ background: theme.barBg, borderColor: theme.border, color: theme.text }}>
      <div className="footer-inner">
        <div className="footer-summary"><span className="footer-chapter" style={{ color: theme.secondaryText }}>{chapterTitle}</span><span className="footer-percent" style={{ color: theme.secondaryText }}>{percent}%</span></div>
        <div className="footer-scrubber">
          <button className="control-icon" title="Episode sebelumnya" disabled={!prevChapter} onClick={onPrevChapter}><ChevronLeft size={19}/></button>
          <input aria-label="Geser ke halaman tertentu" type="range" min={1} max={Math.max(1, total)} value={page} onChange={e => onPage(Number(e.target.value))} style={{ accentColor: theme.accent }}/>
          <button className="control-icon" title="Episode berikutnya" disabled={!nextChapter} onClick={onNextChapter}><ChevronRight size={19}/></button>
        </div>
        <div className="footer-page-count" style={{ color: theme.secondaryText }}>{page} / {total} halaman</div>
      </div>
    </footer>
  </>;
}
