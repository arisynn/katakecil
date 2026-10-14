import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../../data/supabase';
import ThemeToggle from '../../../components/ThemeToggle';
import BrandIcon, { type BrandIconName } from '../../../components/BrandIcon';
import BrandLogo from '../../../components/BrandLogo';
import type { AppThemePreference, UiTheme } from '../../../hooks/useUiTheme';
import { B } from './StudioShared';

type StudioTab = { p: string; label: string; icon: BrandIconName };
const primary: StudioTab[] = [
  { p: '/studio', label: 'Dashboard', icon: 'dashboard' },
  { p: '/studio/cerita', label: 'Karya', icon: 'books' },
  { p: '/studio/analytics', label: 'Analytics', icon: 'chart' },
  { p: '/studio/impor', label: 'Upload', icon: 'upload' },
];
const secondary: StudioTab[] = [
  { p: '/studio/settings', label: 'Pengaturan', icon: 'settings' },
  { p: '/studio/jadwal', label: 'Jadwal Terbit', icon: 'calendar' },
  { p: '/studio/pengumuman', label: 'Pengumuman', icon: 'megaphone' },
  { p: '/studio/database', label: 'Database', icon: 'database' },
  { p: '/studio/sampah', label: 'Sampah', icon: 'delete' },
];
const isActive = (path: string, target: string) => {
  if (target === '/studio') return path === '/studio';
  if (target === '/studio/cerita') return path.startsWith(target) || path.startsWith('/studio/editor/');
  return path === target || path.startsWith(`${target}/`);
};

export function StudioToolsMenu({ path, mobile = false }: { path: string; mobile?: boolean }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); trigger.current?.focus(); }
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

  const id = mobile ? 'v72-studio-tools-mobile' : 'v72-studio-tools-desktop';
  return <div ref={root} className={`v69-tools ${mobile ? 'v69-tools-mobile' : 'v69-tools-desktop'}`}>
    <button ref={trigger} type="button"
      className={`v69-tools-trigger ${secondary.some(tab => isActive(path, tab.p)) ? 'is-active' : ''}`}
      aria-label={open ? 'Tutup alat Studio' : 'Buka alat Studio'}
      aria-expanded={open} aria-controls={id} aria-haspopup="true"
      onClick={() => setOpen(value => !value)}>
      <BrandIcon name="menu" size={20}/>{!mobile && <span>Alat Studio</span>}
    </button>
    {open && <div id={id} className="v69-tools-popover" role="group" aria-label="Alat Studio">
      <span className="v69-tools-caption">ALAT PENULIS</span>
      {secondary.map(tab => <B key={tab.p} to={tab.p}
        aria-current={isActive(path, tab.p) ? 'page' : undefined}
        className={`v69-tools-link ${isActive(path, tab.p) ? 'is-active' : ''}`}>
        <BrandIcon name={tab.icon} size={18}/><span>{tab.label}</span><BrandIcon name="chevron-right" size={15}/>
      </B>)}
      <div className="v69-tools-divider"/>
      <B to="/" className="v69-tools-link"><BrandIcon name="book-open" size={18}/><span>Lihat Website</span><BrandIcon name="arrow-right" size={15}/></B>
      <button type="button" className="v69-tools-link" onClick={() => void supabase?.auth.signOut()}>
        <BrandIcon name="logout" size={18}/><span>Keluar Akun</span>
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
      <div className="studio-logo"><BrandLogo/><small>Studio</small></div>
      <div className="studio-sidebar-label">RUANG MENULIS</div>
      <nav className="studio-side-nav" aria-label="Navigasi utama Studio">
        {primary.map(tab => <B key={tab.p} to={tab.p}
          aria-current={isActive(path, tab.p) ? 'page' : undefined}
          className={`studio-nav-link ${isActive(path, tab.p) ? 'studio-nav-active' : ''}`}>
          <BrandIcon name={tab.icon} size={19}/>{tab.label}
        </B>)}
      </nav>
      <div className="studio-sidebar-bottom">
        <div className="v6-studio-profile"><span>{displayName.charAt(0).toUpperCase()}</span>
          <div><strong>{displayName}</strong><small>Pemilik Studio</small></div>
        </div>
      </div>
    </aside>
    <div className="studio-mobile-top">
      <div className="studio-logo"><BrandLogo/><small>Studio</small></div>
      <div className="studio-mobile-actions">
        <ThemeToggle theme={theme} preference={preference} onPreferenceChange={onPreferenceChange}/>
        <StudioToolsMenu path={path} mobile/>
      </div>
    </div>
    <nav className="studio-bottom-nav" aria-label="Navigasi Studio mobile">
      {primary.map(tab => <B key={tab.p} to={tab.p}
        aria-current={isActive(path, tab.p) ? 'page' : undefined}
        className={isActive(path, tab.p) ? 'studio-bottom-active' : ''}>
        <BrandIcon name={tab.icon} size={21}/><span>{tab.label}</span>
      </B>)}
    </nav>
  </>;
}
