import type { ThemeMode } from '../types/reader';
import type { UiTheme } from '../hooks/useUiTheme';

export type ReaderThemePreference = 'follow' | ThemeMode;
export const READER_THEME_KEY = 'katakecil_reader_theme_preference_v62';
const VALID: readonly ThemeMode[] = ['white','night','sepia','calm','black'];
export function getReaderThemePreference(): ReaderThemePreference {
  if (typeof window === 'undefined') return 'follow';
  try {
    const saved = localStorage.getItem(READER_THEME_KEY);
    if (saved === 'follow' || VALID.includes(saved as ThemeMode)) return saved as ReaderThemePreference;
    // V6.1 had no explicit follow mode. Honor any saved reader theme instead of resetting it.
    const old = localStorage.getItem('quiet_reader_settings');
    if (old) {
      const theme = (JSON.parse(old) as {theme?:unknown}).theme;
      if (VALID.includes(theme as ThemeMode)) return theme as ThemeMode;
    }
  } catch { /* Private browsing and malformed old data must not prevent reading. */ }
  return 'follow';
}
export function resolveReaderTheme(pref: ReaderThemePreference, appTheme: UiTheme): ThemeMode {
  return pref === 'follow' ? (appTheme === 'dark' ? 'night' : 'white') : pref;
}
export function setReaderThemePreference(next: ReaderThemePreference): void {
  try { localStorage.setItem(READER_THEME_KEY, next); } catch { /* ephemeral */ }
  window.dispatchEvent(new Event('katakecil:reader-theme-change'));
}
