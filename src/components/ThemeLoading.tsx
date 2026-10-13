import React from 'react';
import { BookOpen } from 'lucide-react';

type LoadingContext = 'reader' | 'studio' | 'public';
type Props = { context?: LoadingContext; text?: string };

/** Visual-only loading state. Progress is indeterminate: no simulated percentage or delay. */
export default function ThemeLoading({ context = 'public', text }: Props) {
  const message = text ?? (context === 'reader' ? 'Menyiapkan halaman cerita…' : context === 'studio' ? 'Menyiapkan Studio…' : 'Membuka perpustakaan…');
  return <div className={`kk-theme-loading kk-v6-loading kk-v6-loading--${context}`} role="status" aria-live="polite" aria-busy="true" aria-label={message}>
    <div className="kk-v6-loading__ambient" aria-hidden="true" />
    <div className="kk-v6-loading__content">
      <div className="kk-v6-loading__mark" aria-hidden="true"><BookOpen size={37} strokeWidth={1.45} /></div>
      <strong className="kk-v6-loading__brand">KataKecil</strong>
      <p className="kk-v6-loading__tagline">Setiap cerita punya tempat untuk kembali.</p>
      <div className="kk-v6-loading__track" aria-hidden="true"><span /></div>
      <p className="kk-v6-loading__message">{message}</p>
    </div>
  </div>;
}
