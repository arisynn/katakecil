import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft, Bookmark, BookmarkCheck, BookOpen, ChevronLeft, ChevronRight, Maximize2, Minimize2, Menu,
  Search, Settings2, Undo2, X, CheckCircle2, CircleCheck,
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
  estimatedMinutesRemaining?: number | null;
  chapterCompleted?: boolean;
  onToggleChapterCompleted?: () => void;
}

/** Controls are presentation-only. SecureReaderApp owns navigation and persistence. */
export function ReaderControls({
  title, chapterTitle, theme, page, total, isBookmarked, fullscreen,
  canReturn, onContents, onSettings, onSearch, onBookmark, onFullscreen,
  onReturn, onExit, onClose, onPage, onPrevChapter, onNextChapter,
  prevChapter, nextChapter, progressScope = 'chapter',
  estimatedMinutesRemaining = null, chapterCompleted = false, onToggleChapterCompleted,
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
        <div className="v610-more-wrap" ref={menuRef}>
          <button type="button" className="control-icon" aria-label="Opsi pembaca lainnya" aria-expanded={moreOpen} aria-haspopup="menu" onClick={() => setMoreOpen(open => !open)}>
            <Menu size={21} />
          </button>
          {moreOpen && <div className="v610-more-menu" role="menu" style={{ background: theme.barBg, borderColor: theme.border, color: theme.text }}>
            <button type="button" role="menuitem" aria-label="Daftar isi dan penanda" onClick={() => runMenuAction(onContents)}><BookOpen size={18} /> Daftar isi dan penanda</button>
            <button type="button" role="menuitem" onClick={() => runMenuAction(onSettings)}><Settings2 size={18} /> Pengaturan membaca</button>
            <button type="button" role="menuitem" onClick={() => runMenuAction(onSearch)}><Search size={18} /> Cari teks dalam bab</button>
            {canReturn && <button type="button" role="menuitem" onClick={() => runMenuAction(onReturn)}><Undo2 size={18} /> Kembali ke posisi tadi</button>}
            <div className="v610-chapter-nav" role="group" aria-label="Navigasi bab">
              <button type="button" role="menuitem" disabled={!prevChapter} onClick={() => runMenuAction(onPrevChapter)}><ChevronLeft size={18} /> Bab sebelumnya</button>
              <button type="button" role="menuitem" disabled={!nextChapter} onClick={() => runMenuAction(onNextChapter)}>Bab berikutnya <ChevronRight size={18} /></button>
            </div>
            {onToggleChapterCompleted && <button type="button" role="menuitem" onClick={() => runMenuAction(onToggleChapterCompleted)}>
              {chapterCompleted ? <CircleCheck size={18} /> : <CheckCircle2 size={18} />}
              {chapterCompleted ? 'Batalkan tanda selesai' : 'Tandai bab selesai'}
            </button>}
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
          <button type="button" className="v611-page-step" onClick={() => onPage(page - 1)} disabled={page <= 1} aria-label="Halaman sebelumnya"><ChevronLeft size={20}/></button>
          <input
            type="range" min={1} max={Math.max(1, total)} value={page}
            onChange={event => onPage(Number(event.target.value))}
            aria-label={`Posisi halaman, ${page} dari ${total}`}
            style={{ accentColor: theme.accent }}
          />
          <button type="button" className="v611-page-step" onClick={() => onPage(page + 1)} disabled={page >= total} aria-label="Halaman berikutnya"><ChevronRight size={20}/></button>
        </div>
        <div className="v611-page-summary v74-reading-summary" aria-live="off">
          <span>{page} / {total}</span>
          {chapterCompleted ? <span className="v74-reading-insight"><CircleCheck size={13} aria-hidden="true" /> Bab selesai</span>
            : estimatedMinutesRemaining !== null ? <span className="v74-reading-insight">{estimatedMinutesRemaining > 0 ? `±${estimatedMinutesRemaining} menit lagi` : 'Halaman terakhir'}</span> : null}
        </div>
      </div>
    </footer>
  </>;
}
