import React from 'react';
import { readerHeading } from '../utils/readerHeading';

export type ReaderLoadPhase = 'fetch' | 'layout' | 'error' | 'empty';

interface Props {
  phase: ReaderLoadPhase;
  storyTitle?: string;
  episodeNumber?: number;
  episodeTitle?: string;
  message?: string;
  onRetry?: () => void;
}

/** Loading lives OUTSIDE reader-book, so no watermark or fake page appears. */
export function ReaderEpisodeLoading({ phase, storyTitle, episodeNumber, episodeTitle, message, onRetry }: Props) {
  const headingMeta = episodeNumber !== undefined ? readerHeading(episodeTitle || '', episodeNumber) : null;
  const isBusy = phase === 'fetch' || phase === 'layout';
  const heading = phase === 'fetch' ? 'Menyiapkan bab…' : phase === 'layout' ? 'Menata halaman…' :
    phase === 'error' ? 'Bab belum dapat dibuka' : 'Belum ada bab tersedia';
  const detail = message ?? (phase === 'fetch' ? 'Sedang mengambil cerita untukmu.' :
    phase === 'layout' ? 'Menyesuaikan teks dengan ukuran layar.' :
    phase === 'error' ? 'Periksa koneksi, lalu coba kembali.' : 'Cerita akan muncul setelah diterbitkan.');
  return <div className="kk-reader-load" role={isBusy ? 'status' : 'alert'} aria-live="polite" aria-busy={isBusy}>
    <div className="kk-reader-load__content">
      {storyTitle && <p className="kk-reader-load__eyebrow">{storyTitle}</p>}
      {headingMeta && <div className="v74-loading-chapter" aria-label={headingMeta.title ? `${headingMeta.eyebrow}: ${headingMeta.title}` : headingMeta.eyebrow}>
        <span>{headingMeta.eyebrow}</span>
        {headingMeta.title && <strong>{headingMeta.title}</strong>}
      </div>}
      <div className="kk-reader-load__symbol" aria-hidden="true">
        <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M32 18v29M32 22c-7-5-15-6-23-3v27c9-3 17-2 23 3"/>
          <path className={isBusy ? 'kk-reader-load__page' : ''} d="M32 22c7-5 15-6 23-3v27c-9-3-17-2-23 3"/>
        </svg>
      </div>
      <h2 className="kk-reader-load__title">{heading}</h2>
      <p className="kk-reader-load__detail">{detail}</p>
      {isBusy ? <div className="kk-reader-load__activity" aria-hidden="true"><span/><span/><span/></div> :
        onRetry && phase === 'error' ? <button className="kk-reader-load__retry" type="button" onClick={onRetry}>Coba lagi</button> : null}
    </div>
  </div>;
}
