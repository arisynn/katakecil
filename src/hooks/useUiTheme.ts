import { useEffect, useState } from 'react';
import { APP_THEME_KEY, readGlobalTheme, readerModeFor, saveGlobalTheme, type GlobalTheme } from '../utils/globalTheme';

export type UiTheme = GlobalTheme;
export type AppThemePreference = GlobalTheme;
export { APP_THEME_KEY };
export const themeMetaColors = { light: '#F8F4EE', dark: '#0D1729' } as const;

export function getThemePreference(): AppThemePreference { return readGlobalTheme(); }
export function resolveAppTheme(preference: AppThemePreference): UiTheme { return preference; }

/** All instances observe the same storage key and event, including the secure reader. */
export function useUiTheme() {
  const [theme, setTheme] = useState<UiTheme>(readGlobalTheme);
  const setPreference = (next: AppThemePreference) => {
    setTheme(next);
    document.documentElement.dataset.appTheme = next;
    document.documentElement.dataset.readerTheme = readerModeFor(next);
    saveGlobalTheme(next);
  };
  const toggleTheme = () => setPreference(theme === 'dark' ? 'light' : 'dark');
  useEffect(() => {
    const sync = () => setTheme(readGlobalTheme());
    sync();
    window.addEventListener('storage', sync);
    window.addEventListener('katakecil:theme-change', sync);
    return () => { window.removeEventListener('storage', sync); window.removeEventListener('katakecil:theme-change', sync); };
  }, []);
  useEffect(() => {
    document.documentElement.dataset.appTheme = theme;
    document.documentElement.dataset.readerTheme = readerModeFor(theme);
    const metaColor = window.location.pathname.startsWith('/baca/')
      ? (theme === 'dark' ? '#15243B' : '#FFFCF7') : themeMetaColors[theme];
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', metaColor);
  }, [theme]);
  return { theme, preference: theme, setPreference, toggleTheme };
}
