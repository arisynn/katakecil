import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft, Bookmark, BookmarkCheck, BookOpen, ChevronLeft, ChevronRight, Maximize2, Minimize2, MoreHorizontal,
  Search, Undo2, X,
} from 'lucide-react';
import type { ThemeColors } from '../types/reader';

interface Props {
  title: string;
  chapterTitle: string;
  theme: ThemeColors;
  page: number;
  total: number;
  isBookmarked: boolean;
  fullscreen: boolean;
  canReturn: boolean;
  onContents: () => void;
  onSettings: () => void;
  onSearch: () => void;
  onBookmark: () => void;
  onFullscreen: () => void;
  onReturn: () => void;
  onExit: () => void;
  onClose: () => void;
  onPage: (page: number) => void;
  onPrevChapter: () => void;
  onNextChapter: () => void;
  prevChapter: boolean;
  nextChapter: boolean;
  progressScope?: 'chapter' | 'story';
}

/** Controls are presentation-only. SecureReaderApp owns navigation and persistence. */
export function ReaderControls({
  title, chapterTitle, theme, page, total, isBookmarked, fullscreen,
  canReturn, onContents, onSettings, onSearch, onBookmark, onFullscreen,
  onReturn, onExit, onClose, onPage, onPrevChapter, onNextChapter,
  prevChapter, nextChapter, progressScope = 'chapter',
}: Props) {
  const [moreOpen, setMoreOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const percent = Math.round(page / Math.max(1, total) * 100);

  useEffect(() => {
    if (!moreOpen) return;
    const onPointer = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMoreOpen(false);
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.stopPropagation(); setMoreOpen(false); }
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onEscape, true);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onEscape, true);
    };
  }, [moreOpen]);

  const runMenuAction = (action: () => void) => {
    setMoreOpen(false);
    action();
  };

  return <>
    <header className="reader-control-header v610-control-header" style={{ background: theme.barBg, borderColor: theme.border, color: theme.text }}>
      <div className="control-inner v610-control-inner">
        <button type="button" className="control-icon v610-exit" onClick={onExit} aria-label="Kembali ke detail cerita" title="Kembali ke cerita">
          <ArrowLeft size={20} />
        </button>
        <div className="control-titles">
          <span className="control-title">{title}</span>
          <span className="control-subtitle" style={{ color: theme.secondaryText }}>{chapterTitle}</span>
        </div>
        <button type="button" className="control-icon" onClick={onBookmark} aria-label={isBookmarked ? 'Hapus penanda' : 'Simpan penanda'} title="Penanda">
          {isBookmarked ? <BookmarkCheck size={20} fill="currentColor" /> : <Bookmark size={20} />}
        </button>
        <button type="button" className="control-icon" onClick={onContents} aria-label="Daftar isi dan penanda" title="Daftar isi">
          <BookOpen size={20} />
        </button>
        <button type="button" className="control-typography" onClick={onSettings} aria-label="Pengaturan membaca" title="Pengaturan membaca">Aa</button>
        <div className="v610-more-wrap" ref={menuRef}>
          <button type="button" className="control-icon" aria-label="Opsi pembaca lainnya" aria-expanded={moreOpen} aria-haspopup="menu" onClick={() => setMoreOpen(open => !open)}>
            <MoreHorizontal size={21} />
          </button>
          {moreOpen && <div className="v610-more-menu" role="menu" style={{ background: theme.barBg, borderColor: theme.border, color: theme.text }}>
            <button type="button" role="menuitem" onClick={() => runMenuAction(onSearch)}><Search size={18} /> Cari teks dalam bab</button>
            {canReturn && <button type="button" role="menuitem" onClick={() => runMenuAction(onReturn)}><Undo2 size={18} /> Kembali ke posisi tadi</button>}
            <button type="button" role="menuitem" onClick={() => runMenuAction(onFullscreen)}>
              {fullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
              {fullscreen ? 'Keluar layar penuh' : 'Layar penuh'}
            </button>
            <button type="button" role="menuitem" onClick={() => runMenuAction(onClose)}><X size={18} /> Sembunyikan kontrol</button>
          </div>}
        </div>
      </div>
    </header>
    <footer className="reader-control-footer v610-control-footer" style={{ background: theme.barBg, borderColor: theme.border, color: theme.text }}>
      <div className="footer-inner v610-footer-inner">
        <div className="v610-progress-label">
          <span className="v610-footer-chapter" title={chapterTitle}>{chapterTitle}</span>
          <span className="v610-progress-percent">{percent}% {progressScope === 'chapter' ? 'bab ini' : 'naskah'}</span>
        </div>
        <div className="v610-progress-row">
          <span className="v610-page-label">{page} / {total}</span>
          <input
            type="range" min={1} max={Math.max(1, total)} value={page}
            onChange={event => onPage(Number(event.target.value))}
            aria-label={`Posisi halaman, ${page} dari ${total}`}
            style={{ accentColor: theme.accent }}
          />
          <span className="v610-page-suffix">halaman</span>
        </div>
        {(prevChapter || nextChapter) && <div className="v610-chapter-nav" aria-label="Navigasi bab">
          <button type="button" disabled={!prevChapter} onClick={onPrevChapter} aria-label="Buka bab sebelumnya"><ChevronLeft size={17} /> Bab sebelumnya</button>
          <span aria-hidden="true">BAB</span>
          <button type="button" disabled={!nextChapter} onClick={onNextChapter} aria-label="Buka bab berikutnya">Bab berikutnya <ChevronRight size={17} /></button>
        </div>}
      </div>
    </footer>
  </>;
}
