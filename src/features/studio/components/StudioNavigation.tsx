import {useEffect,useRef,useState,type ReactNode} from 'react';
import {mayLeave,navigate} from '../../../utils/nav';
import {supabase} from '../../../data/supabase';
import ThemeToggle from '../../../components/ThemeToggle';
import BrandIcon,{type BrandIconName} from '../../../components/BrandIcon';
import BrandLogo from '../../../components/BrandLogo';
import type {AppThemePreference,UiTheme} from '../../../hooks/useUiTheme';

const tools:{to:string;label:string;icon:BrandIconName}[]=[
 {to:'/studio/settings',label:'Pengaturan',icon:'settings'},
 {to:'/studio/analytics',label:'Statistik karya',icon:'chart'},
 {to:'/studio/database',label:'Ekspor & data',icon:'database'},
 {to:'/studio/sampah',label:'Sampah',icon:'delete'},
];
export function StudioToolsMenu({path}:{path:string;mobile?:boolean}){
 const [open,setOpen]=useState(false);const root=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null);
 useEffect(()=>setOpen(false),[path]);
 useEffect(()=>{
  if(!open)return;
  const nodes=()=>[...root.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')||[]];nodes()[0]?.focus();
  const key=(e:KeyboardEvent)=>{
   if(e.key==='Escape'){setOpen(false);trigger.current?.focus();}
   if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();const items=nodes(),index=items.indexOf(document.activeElement as HTMLButtonElement);items[e.key==='Home'?0:e.key==='End'?items.length-1:(index+(e.key==='ArrowDown'?1:-1)+items.length)%items.length]?.focus();}
  };
  const outside=(e:PointerEvent)=>{if(!root.current?.contains(e.target as Node))setOpen(false);};
  document.addEventListener('keydown',key);document.addEventListener('pointerdown',outside);
  return()=>{document.removeEventListener('keydown',key);document.removeEventListener('pointerdown',outside);};
 },[open]);
 return <div className="writer-menu-root" ref={root}><button ref={trigger} type="button" className="writer-menu-trigger" aria-label={open?'Tutup menu Studio':'Buka menu Studio'} aria-haspopup="menu" aria-expanded={open} onClick={()=>setOpen(v=>!v)}><BrandIcon name="menu" size={21}/></button>
  {open&&<div className="writer-menu" role="menu" aria-label="Menu Studio"><span className="writer-eyebrow">ALAT PENULIS</span>{tools.map(tool=><button type="button" role="menuitem" key={tool.to} onClick={()=>{setOpen(false);navigate(tool.to);}}><BrandIcon name={tool.icon} size={17}/>{tool.label}</button>)}<hr/><button type="button" role="menuitem" onClick={()=>{setOpen(false);navigate('/');}}><BrandIcon name="book-open" size={17}/>Kembali ke Library</button><button type="button" role="menuitem" onClick={()=>void(async()=>{if(await mayLeave())await supabase?.auth.signOut();})()}><BrandIcon name="logout" size={17}/>Keluar akun</button></div>}
 </div>;
}
export default function StudioShell({path,displayName,theme,preference,onPreferenceChange,children}:{path:string;displayName:string;theme:UiTheme;preference:AppThemePreference;onPreferenceChange:(next:AppThemePreference)=>void;children:ReactNode}){
 const tabs=[{to:'/studio/cerita',label:'Karya',icon:'books'},{to:'/studio/impor',label:'Impor',icon:'upload'},{to:'/studio/jadwal',label:'Jadwal',icon:'calendar'}] as const;
 const active=(to:string)=>path===to||path.startsWith(to+'/')||(to==='/studio/cerita'&&(path==='/studio'||path.startsWith('/studio/editor/')));
 return <div className="writer-shell"><header className="writer-header"><div className="writer-header-inner"><button type="button" className="writer-brand" aria-label="Kembali ke karya Studio" onClick={()=>navigate('/studio')}><BrandLogo/><span className="writer-brand-label">STUDIO</span></button><div className="writer-header-actions"><span className="writer-account">{displayName}</span><ThemeToggle theme={theme} preference={preference} onPreferenceChange={onPreferenceChange}/><StudioToolsMenu path={path}/></div></div><nav className="writer-navigation" aria-label="Navigasi Studio">{tabs.map(tab=><button type="button" key={tab.to} aria-current={active(tab.to)?'page':undefined} onClick={()=>navigate(tab.to)}><BrandIcon name={tab.icon} size={17}/>{tab.label}</button>)}</nav></header><main className={`writer-content${path.startsWith('/studio/editor/')?' writer-content--editor':''}`}>{children}</main><footer className="writer-footer">Ruang pribadi untuk cerita yang sedang bertumbuh.</footer></div>;
}
