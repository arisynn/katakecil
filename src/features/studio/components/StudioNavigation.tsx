import React, { useEffect, useState } from 'react';
import { ArrowRight, BarChart3, BookOpen, CalendarDays, ChevronRight, Database, Feather, LayoutDashboard, Library, LogOut, Menu, Settings2, Trash2, UploadCloud, X } from 'lucide-react';
import { supabase } from '../../../data/supabase';
import ThemeToggle from '../../../components/ThemeToggle';
import type { AppThemePreference, UiTheme } from '../../../hooks/useUiTheme';
import { B } from './StudioShared';
export default function StudioNavigation({ path, displayName, theme, preference, onPreferenceChange }: {
    path: string;
    displayName: string;
    theme: UiTheme;
    preference: AppThemePreference;
    onPreferenceChange: (next: AppThemePreference) => void;
}) {
    const [more, setMore] = useState(false);
    const primary = [{ p: '/studio', label: 'Dashboard', icon: LayoutDashboard }, { p: '/studio/cerita', label: 'Karya', icon: Library }, { p: '/studio/analytics', label: 'Analytics', icon: BarChart3 }, { p: '/studio/settings', label: 'Pengaturan', icon: Settings2 }];
    const secondary = [{ p: '/studio/impor', label: 'Impor Naskah', icon: UploadCloud }, { p: '/studio/jadwal', label: 'Jadwal Terbit', icon: CalendarDays }, { p: '/studio/database', label: 'Database', icon: Database }, { p: '/studio/sampah', label: 'Sampah', icon: Trash2 }];
    useEffect(() => setMore(false), [path]);
    useEffect(() => { if (!more)
        return; const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape')
        setMore(false); }; document.addEventListener('keydown', onKey); return () => document.removeEventListener('keydown', onKey); }, [more]);
    const active = (p: string) => p === '/studio' ? path === p : path.startsWith(p);
    return <><aside className="studio-sidebar v6-studio-sidebar">
  <div className="studio-logo"><span><Feather size={20}/></span><span>KataKecil<small>Studio</small></span></div>
  <div className="studio-sidebar-label">RUANG KARYA</div>
  <div className="studio-side-nav">{primary.map(tab => <B key={tab.p} to={tab.p} className={`studio-nav-link ${active(tab.p) ? 'studio-nav-active' : ''}`}><tab.icon size={18}/>{tab.label}</B>)}</div>
  <div className="studio-sidebar-label v6-sidebar-secondary">ALAT PENULIS</div>
  <div className="studio-side-nav">{secondary.map(tab => <B key={tab.p} to={tab.p} className={`studio-nav-link ${active(tab.p) ? 'studio-nav-active' : ''}`}><tab.icon size={18}/>{tab.label}</B>)}</div>
  <div className="studio-sidebar-bottom"><B to="/" className="studio-nav-link"><BookOpen size={18}/>Lihat website <ArrowRight size={15}/></B><div className="v6-studio-profile"><span>{displayName.charAt(0).toUpperCase()}</span><div><strong>{displayName}</strong><small>Pemilik Studio</small></div></div></div>
 </aside>
 <div className="studio-mobile-top"><div className="studio-logo"><span><Feather size={18}/></span><span className="kk-studio-wordmark">KataKecil <small>Studio</small></span></div><div className="studio-mobile-actions"><ThemeToggle theme={theme} preference={preference} onPreferenceChange={onPreferenceChange}/><button aria-label="Buka alat Studio" onClick={() => setMore(v => !v)}><Menu size={20}/></button></div></div>
 <nav className="studio-bottom-nav" aria-label="Navigasi Studio mobile">{primary.map(tab => <B key={tab.p} to={tab.p} className={active(tab.p) ? 'studio-bottom-active' : ''}><tab.icon size={20}/><span>{tab.label}</span></B>)}</nav>
 {more && <div className="v53-more-backdrop" role="presentation" onClick={() => setMore(false)}><section role="dialog" aria-modal="true" aria-label="Alat Studio" className="v53-more-sheet" onClick={e => e.stopPropagation()}><div className="v53-more-head"><strong>Alat Studio</strong><button onClick={() => setMore(false)} aria-label="Tutup menu"><X size={20}/></button></div>{secondary.map(tab => <B key={tab.p} to={tab.p} className="v53-more-link"><tab.icon size={19}/>{tab.label}<ChevronRight size={18}/></B>)}<B to="/" className="v53-more-link"><BookOpen size={19}/>Website publik<ChevronRight size={18}/></B><button className="v53-more-link" onClick={() => void supabase?.auth.signOut()}><LogOut size={19}/>Keluar akun</button></section></div>}
 </>;
}
