import React from 'react';

type LoadingContext = 'reader' | 'studio' | 'public';
type Props = { context?: LoadingContext; text?: string };

/** No fake percentage or forced delay. Shared design with the pre-React HTML boot state. */
export default function ThemeLoading({ context = 'public', text }: Props) {
  const message = text ?? (context === 'reader' ? 'Menyiapkan halaman cerita…' : context === 'studio' ? 'Menyiapkan Studio…' : 'Menyiapkan KataKecil…');
  const eyebrow = context === 'reader' ? 'RUANG MEMBACA' : context === 'studio' ? 'RUANG PENULIS' : 'KATAKECIL';
  return <div className={`kk-v611-loader kk-v611-loader--${context}`} role="status" aria-live="polite" aria-busy="true" aria-label={message}>
    <div className="kk-v611-loader__content">
      <span className="kk-v611-loader__eyebrow">{eyebrow}</span>
      <div className="kk-v611-loader__symbol" aria-hidden="true"><img src="/brand/app-icon.png" width="58" height="58" alt=""/></div>
      <strong className="kk-v611-loader__brand">KataKecil</strong>
      <p className="kk-v611-loader__tagline">Setiap cerita punya tempat untuk kembali.</p>
      <div className="kk-v611-loader__dots" aria-hidden="true"><span/><span/><span/></div>
      <p className="kk-v611-loader__message">{message}</p>
    </div>
  </div>;
}
