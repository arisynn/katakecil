import React, { useEffect, useState } from 'react';
import { BookOpen, Feather, Menu, X } from 'lucide-react';
import ThemeToggle from '../ThemeToggle';
import type { UiTheme } from '../../hooks/useUiTheme';
import { navigate } from '../../utils/nav';

const links = [
  {to:'/', label:'Beranda'},
  {to:'/cerita', label:'Perpustakaan'},
  {to:'/tentang', label:'Tentang Penulis'},
];
export default function PublicHeader({path, theme, onToggle}: {path:string;theme:UiTheme;onToggle:()=>void}) {
  const [menu, setMenu] = useState(false);
  useEffect(()=>setMenu(false),[path]);
  useEffect(()=>{
    if (!menu) return;
    const onKey=(event: KeyboardEvent)=>{if(event.key==='Escape')setMenu(false);};
    document.addEventListener('keydown',onKey);
    return ()=>document.removeEventListener('keydown',onKey);
  },[menu]);
  const go=(to:string)=>{setMenu(false);navigate(to);};
  return <header className="site-header"><div className="site-header-inner">
    <button type="button" className="site-brand" onClick={()=>go('/')} aria-label="KataKecil — Beranda">
      <span className="brand-mark"><Feather size={20}/></span><span>KataKecil<span className="brand-dot">.</span></span>
    </button>
    <nav id="public-navigation" className={menu?'site-nav site-nav-open':'site-nav'} aria-label="Navigasi pembaca">
      {links.map(link=><button key={link.to} type="button" onClick={()=>go(link.to)}
        className={`nav-item ${path===link.to||link.to==='/cerita'&&path.startsWith('/cerita/')?'v53-nav-current':''}`}
        aria-current={path===link.to?'page':undefined}>{link.label}</button>)}
    </nav>
    <div className="site-nav-right"><span className="v53-desktop-header-spacer" aria-hidden="true"/><ThemeToggle theme={theme} onToggle={onToggle}/>
      <button type="button" aria-controls="public-navigation" aria-expanded={menu}
        aria-label={menu?'Tutup menu pembaca':'Buka menu pembaca'} className="mobile-menu-toggle"
        onClick={()=>setMenu(previous=>!previous)}>{menu?<X size={22}/>:<Menu size={22}/>}</button>
    </div>
  </div></header>;
}
