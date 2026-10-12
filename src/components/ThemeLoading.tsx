import React from 'react';
export default function ThemeLoading({context='public',text}: {context?:'reader'|'studio'|'public';text?:string}) {
  const title=context==='reader'?'Menyiapkan halaman…':context==='studio'?'Menyiapkan Studio…':'Membuka cerita…';
  return <div className="kk-theme-loading" role="status" aria-live="polite" aria-label={text||title}>
    <div className="kk-loading-mark" aria-hidden="true">K<span>.</span></div>
    <strong>KataKecil</strong>
    <p>{text||title}</p>
    <div className="kk-loading-line" aria-hidden="true"/>
  </div>;
}
