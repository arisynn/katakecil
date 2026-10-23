import React from 'react';
import { ChapterText } from './ChapterText';
import type { Chapter, ReadingSettings, ThemeColors } from '../types/reader';

export interface ReaderGeometry { leafWidth: number; bodyWidth: number; bodyHeight: number; pageHeight: number; paddingX: number; paddingTop: number; paddingBottom: number; footerHeight: number; footerGap: number }

interface ReaderPageProps {
  chapter: Chapter;
  columnIndex: number;
  pageNumber: number;
  totalPages: number;
  settings: ReadingSettings;
  theme: ThemeColors;
  geometry: ReaderGeometry;
  hideIntro?: boolean;
}

export function textStyles(settings: ReadingSettings): React.CSSProperties {
  const family = {
    literata: "'Literata', Georgia, serif",
    merriweather: "'Merriweather', Georgia, serif",
    sans: "'Plus Jakarta Sans', system-ui, sans-serif",
    mono: "ui-monospace, SFMono-Regular, monospace",
  }[settings.fontFamily];
  return {
    fontFamily: family,
    fontSize: `clamp(${(16 * settings.fontSize / 100).toFixed(2)}px, calc(${(15 * settings.fontSize / 100).toFixed(2)}px + ${(0.5 * settings.fontSize / 100).toFixed(2)}vw), ${(19 * settings.fontSize / 100).toFixed(2)}px)`,
    lineHeight: { compact: 1.48, normal: 1.7, loose: 1.92 }[settings.lineHeight],
    textAlign: settings.textAlign,
    overflowWrap: 'break-word',
  };
}

export function ReaderPage({ chapter, columnIndex, pageNumber, totalPages, settings, theme, geometry, hideIntro=false }: ReaderPageProps) {
  return <article className="reader-leaf v6-reader-leaf" data-reader-theme={settings.theme} style={{ width: geometry.leafWidth, height: geometry.pageHeight, backgroundColor: theme.pageBg, color: theme.text, paddingInline: geometry.paddingX, paddingTop: geometry.paddingTop, paddingBottom: geometry.paddingBottom }} aria-label={`Halaman ${pageNumber} dari ${totalPages}`}>
    <div className="reader-text-viewport" style={{ width: geometry.bodyWidth, height: geometry.bodyHeight }}>
      <div className="reader-columns" style={{ ...textStyles(settings), '--reader-body-height': `${geometry.bodyHeight}px`, width: geometry.bodyWidth, height: geometry.bodyHeight, columnWidth: geometry.bodyWidth, transform: `translate3d(-${columnIndex * geometry.bodyWidth}px, 0, 0)` } as React.CSSProperties}>
        <ChapterText chapter={chapter} hideIntro={hideIntro}/>
      </div>
    </div>
    <footer className="reader-folio reader-folio-bottom" style={{ color: theme.secondaryText, height: geometry.footerHeight, marginTop: geometry.footerGap }} aria-label={`Halaman ${pageNumber} dari ${totalPages}`}>
      <span className="folio-counter tabular-nums">{pageNumber} / {totalPages}</span>
    </footer>
  </article>;
}
