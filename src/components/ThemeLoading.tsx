import React from 'react';

type LoadingContext = 'reader' | 'studio' | 'public';
type Props = { context?: LoadingContext; text?: string };

/** No fake percentage or forced delay. Shared design with the pre-React HTML boot state. */
export default function ThemeLoading({ context = 'public', text }: Props) {
  const message = text ?? (context === 'reader' ? 'Menyiapkan halaman cerita…' : context === 'studio' ? 'Menyiapkan Studio…' : 'Membuka perpustakaan…');
  const eyebrow = context === 'reader' ? 'RUANG MEMBACA' : context === 'studio' ? 'RUANG PENULIS' : 'PERPUSTAKAAN DIGITAL';
  return <div className={`kk-v611-loader kk-v611-loader--${context}`} role="status" aria-live="polite" aria-busy="true" aria-label={message}>
    <div className="kk-v611-loader__content">
      <span className="kk-v611-loader__eyebrow">{eyebrow}</span>
      <div className="kk-v611-loader__symbol" aria-hidden="true">
        <svg viewBox="0 0 64 64" width="64" height="64" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M32 17v31M32 22C25 16 17 16 9 19v28c9-3 17-2 23 3" />
          <path className="kk-v611-loader__turn" d="M32 22c7-6 15-6 23-3v28c-9-3-17-2-23 3" />
        </svg>
      </div>
      <strong className="kk-v611-loader__brand">KataKecil</strong>
      <p className="kk-v611-loader__tagline">Setiap cerita punya tempat untuk kembali.</p>
      <div className="kk-v611-loader__dots" aria-hidden="true"><span/><span/><span/></div>
      <p className="kk-v611-loader__message">{message}</p>
    </div>
  </div>;
}
