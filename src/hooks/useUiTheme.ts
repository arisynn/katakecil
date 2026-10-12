import { useEffect, useState } from 'react';

export type UiTheme = 'light' | 'dark';
export type AppThemePreference = 'system' | UiTheme;
export const APP_THEME_KEY = 'appThemePreference';
const LEGACY_KEY = 'katakecil_ui_theme_v53';

export function getThemePreference(): AppThemePreference {
  if (typeof window === 'undefined') return 'system';
  try {
    const saved = localStorage.getItem(APP_THEME_KEY);
    if (saved === 'system' || saved === 'light' || saved === 'dark') return saved;
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy === 'light' || legacy === 'dark') return legacy;
  } catch { /* Private browsing must still work. */ }
  return 'system';
}
export function resolveAppTheme(preference: AppThemePreference): UiTheme {
  return preference === 'system'
    ? (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : preference;
}
export function useUiTheme() {
  const [preference, updatePreference] = useState<AppThemePreference>(getThemePreference);
  const [theme, setTheme] = useState<UiTheme>(() => resolveAppTheme(getThemePreference()));
  const setPreference = (next: AppThemePreference) => {
    try { localStorage.setItem(APP_THEME_KEY, next); localStorage.removeItem(LEGACY_KEY); } catch { /* ephemeral */ }
    updatePreference(next);
    window.dispatchEvent(new Event('katakecil:theme-change'));
  };
  const toggleTheme = () => setPreference(theme === 'dark' ? 'light' : 'dark');
  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    const sync = () => {
      const next = getThemePreference();
      updatePreference(next);
      setTheme(resolveAppTheme(next));
    };
    sync();
    media?.addEventListener('change', sync);
    window.addEventListener('storage', sync);
    window.addEventListener('katakecil:theme-change', sync);
    return () => {
      media?.removeEventListener('change', sync);
      window.removeEventListener('storage', sync);
      window.removeEventListener('katakecil:theme-change', sync);
    };
  }, []);
  useEffect(() => {
    document.documentElement.dataset.appTheme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#08192D' : '#F5F9FD');
  }, [theme]);
  return { theme, preference, setPreference, toggleTheme };
}
