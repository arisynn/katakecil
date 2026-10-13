import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight, BarChart3, BookOpen, CalendarDays, ChevronRight, Database,
  Feather, Library, LogOut, Menu, Settings2, Trash2, UploadCloud,
  LayoutDashboard,
} from 'lucide-react';
import { supabase } from '../../../data/supabase';
import ThemeToggle from '../../../components/ThemeToggle';
import type { AppThemePreference, UiTheme } from '../../../hooks/useUiTheme';
import { B } from './StudioShared';

const primary = [
  { p: '/studio', label: 'Dashboard', icon: LayoutDashboard },
  { p: '/studio/cerita', label: 'Karya', icon: Library },
  { p: '/studio/analytics', label: 'Analytics', icon: BarChart3 },
  { p: '/studio/impor', label: 'Upload', icon: UploadCloud },
];
const secondary = [
  { p: '/studio/settings', label: 'Pengaturan', icon: Settings2 },
  { p: '/studio/jadwal', label: 'Jadwal Terbit', icon: CalendarDays },
  { p: '/studio/database', label: 'Database', icon: Database },
  { p: '/studio/sampah', label: 'Sampah', icon: Trash2 },
];
const isActive = (path: string, target: string) =>
  target === '/studio' ? path === target : path.startsWith(target);

export function StudioToolsMenu({ path, mobile = false }: { path: string; mobile?: boolean }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const onPointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [open]);

  return <div ref={root} className={`v69-tools ${mobile ? 'v69-tools-mobile' : 'v69-tools-desktop'}`}>
    <button
      type="button"
      className={`v69-tools-trigger ${secondary.some(tab => isActive(path, tab.p)) ? 'is-active' : ''}`}
      aria-label={open ? 'Tutup alat Studio' : 'Buka alat Studio'}
      aria-expanded={open}
      aria-controls={mobile ? "v67-studio-more" : "v69-studio-more-desktop"}
      aria-haspopup="true"
      onClick={() => setOpen(value => !value)}
    >
      <Menu size={20}/>{!mobile && <span>Alat Studio</span>}
    </button>
    {open && <div id={mobile ? "v67-studio-more" : "v69-studio-more-desktop"} className="v69-tools-popover" role="group" aria-label="Alat Studio">
      <span className="v69-tools-caption">ALAT PENULIS</span>
      {secondary.map(tab => <div role="none" key={tab.p}>
        <B to={tab.p} className={`v69-tools-link ${isActive(path, tab.p) ? 'is-active' : ''}`}>
          <tab.icon size={18}/><span>{tab.label}</span><ChevronRight size={15}/>
        </B>
      </div>)}
      <div className="v69-tools-divider"/>
      <B to="/" className="v69-tools-link"><BookOpen size={18}/><span>Lihat Website</span><ArrowRight size={15}/></B>
      <button type="button" className="v69-tools-link" onClick={() => void supabase?.auth.signOut()}>
        <LogOut size={18}/><span>Keluar Akun</span>
      </button>
    </div>}
  </div>;
}

export default function StudioNavigation({ path, displayName, theme, preference, onPreferenceChange }: {
  path: string;
  displayName: string;
  theme: UiTheme;
  preference: AppThemePreference;
  onPreferenceChange: (next: AppThemePreference) => void;
}) {
  return <>
    <aside className="studio-sidebar v6-studio-sidebar v69-sidebar">
      <div className="studio-logo"><span><Feather size={20}/></span><span>KataKecil<small>Studio</small></span></div>
      <div className="studio-sidebar-label">RUANG MENULIS</div>
      <nav className="studio-side-nav" aria-label="Navigasi utama Studio">
        {primary.map(tab => <B key={tab.p} to={tab.p}
          className={`studio-nav-link ${isActive(path, tab.p) ? 'studio-nav-active' : ''}`}>
          <tab.icon size={18}/>{tab.label}
        </B>)}
      </nav>
      <div className="studio-sidebar-bottom">
        <div className="v6-studio-profile"><span>{displayName.charAt(0).toUpperCase()}</span>
          <div><strong>{displayName}</strong><small>Pemilik Studio</small></div>
        </div>
      </div>
    </aside>
    <div className="studio-mobile-top">
      <div className="studio-logo"><span><Feather size={18}/></span>
        <span className="kk-studio-wordmark">KataKecil <small>Studio</small></span>
      </div>
      <div className="studio-mobile-actions">
        <ThemeToggle theme={theme} preference={preference} onPreferenceChange={onPreferenceChange}/>
        <StudioToolsMenu path={path} mobile/>
      </div>
    </div>
    <nav className="studio-bottom-nav" aria-label="Navigasi Studio mobile">
      {primary.map(tab => <B key={tab.p} to={tab.p}
        className={isActive(path, tab.p) ? 'studio-bottom-active' : ''}>
        <tab.icon size={20}/><span>{tab.label}</span>
      </B>)}
    </nav>
  </>;
}
