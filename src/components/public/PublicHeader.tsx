import React,{useEffect,useRef,useState} from 'react';
import {BookOpen, Feather, House, UserRound} from 'lucide-react';
import ThemeToggle from '../ThemeToggle';
import type {UiTheme,AppThemePreference} from '../../hooks/useUiTheme';
import {navigate} from '../../utils/nav';

const links=[
  {to:'/',label:'Beranda',icon:House},
  {to:'/cerita',label:'Perpustakaan',icon:BookOpen},
  {to:'/tentang',label:'Penulis',icon:UserRound},
];
export default function PublicHeader({path,theme,preference,onPreferenceChange}: {
  path:string;theme:UiTheme;preference:AppThemePreference;onPreferenceChange:(next:AppThemePreference)=>void;
}) {
  const [hidden,setHidden]=useState(false);
  const lastScroll=useRef(0);
  useEffect(()=>{
    let raf=0;
    const onScroll=()=>{
      if(raf)return;
      raf=requestAnimationFrame(()=>{
        raf=0;
        const current=Math.max(0,window.scrollY);
        const delta=current-lastScroll.current;
        if(current<72||delta< -7)setHidden(false);
        else if(current>140&&delta>7)setHidden(true);
        lastScroll.current=current;
      });
    };
    window.addEventListener('scroll',onScroll,{passive:true});
    return()=>{window.removeEventListener('scroll',onScroll);cancelAnimationFrame(raf)};
  },[]);
  useEffect(()=>setHidden(false),[path]);
  const active=(to:string)=>path===to||(to==='/cerita'&&path.startsWith('/cerita/'));
  return <>
    <header className={`site-header kk-public-header ${hidden?'kk-header-hidden':''}`}><div className="site-header-inner">
      <button type="button" className="site-brand" onClick={()=>navigate('/')} aria-label="KataKecil — Beranda">
        <span className="brand-mark"><Feather size={20}/></span><span>KataKecil<span className="brand-dot">.</span></span>
      </button>
      <nav className="site-nav kk-desktop-nav" aria-label="Navigasi pembaca">
        {links.map(link=><button key={link.to} type="button" onClick={()=>navigate(link.to)} className={`nav-item ${active(link.to)?'v53-nav-current':''}`} aria-current={active(link.to)?'page':undefined}>{link.label==='Penulis'?'Tentang Penulis':link.label}</button>)}
      </nav>
      <div className="site-nav-right">
        <button type="button" className="site-studio-link" onClick={()=>navigate('/studio')} aria-label="Masuk ke Studio Penulis">
          Studio Penulis
        </button>
        <ThemeToggle theme={theme} preference={preference} onPreferenceChange={onPreferenceChange}/>
      </div>
    </div></header>
    <nav className="kk-public-bottom-nav" aria-label="Navigasi publik mobile">
      {links.map(link=><button key={link.to} type="button" className={active(link.to)?'kk-public-active':''} aria-current={active(link.to)?'page':undefined} onClick={()=>navigate(link.to)}><link.icon size={20}/><span>{link.label}</span></button>)}
    </nav>
  </>;
}
