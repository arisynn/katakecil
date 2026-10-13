/** V6.4: exactly two persistent themes shared by public, Studio and Reader. */
export type GlobalTheme = 'light' | 'dark';
export const APP_THEME_KEY = 'appThemePreference';
export const LEGACY_APP_THEME_KEY = 'katakecil_ui_theme_v53';
export const LEGACY_READER_THEME_KEY = 'katakecil_reader_theme_preference_v62';
export const READER_SETTINGS_KEY = 'quiet_reader_settings';

export function isGlobalTheme(value: unknown): value is GlobalTheme {
  return value === 'light' || value === 'dark';
}

/** Pure migration policy; existing site choice beats old reader-only settings. */
export function chooseGlobalTheme(
  app: string | null,
  legacyApp: string | null,
  legacyReader: string | null,
  legacySettings: string | null,
  systemDark: boolean,
): GlobalTheme {
  if (isGlobalTheme(app)) return app;
  if (app === 'system') return systemDark ? 'dark' : 'light';
  if (isGlobalTheme(legacyApp)) return legacyApp;
  const reader = legacyReader && legacyReader !== 'follow' ? legacyReader : legacySettings;
  if (reader === 'night' || reader === 'black') return 'dark';
  if (reader === 'white' || reader === 'sepia' || reader === 'calm') return 'light';
  return systemDark ? 'dark' : 'light';
}

export function readGlobalTheme(): GlobalTheme {
  if (typeof window === 'undefined') return 'light';
  const dark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  try {
    const app = window.localStorage.getItem(APP_THEME_KEY);
    const legacyApp = window.localStorage.getItem(LEGACY_APP_THEME_KEY);
    const legacyReader = window.localStorage.getItem(LEGACY_READER_THEME_KEY);
    let legacySettings: string | null = null;
    try { legacySettings = JSON.parse(window.localStorage.getItem(READER_SETTINGS_KEY) || 'null')?.theme ?? null; }
    catch { /* Malformed settings must not block boot. */ }
    const theme = chooseGlobalTheme(app, legacyApp, legacyReader, legacySettings, dark);
    // Once migrated, OS changes no longer silently alter an explicitly selected theme.
    if (app !== theme) window.localStorage.setItem(APP_THEME_KEY, theme);
    return theme;
  } catch { return dark ? 'dark' : 'light'; }
}

export function saveGlobalTheme(theme: GlobalTheme): void {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(APP_THEME_KEY, theme); } catch { /* Storage may be blocked. */ }
  window.dispatchEvent(new Event('katakecil:theme-change'));
}

export function readerModeFor(theme: GlobalTheme): 'white' | 'night' {
  return theme === 'dark' ? 'night' : 'white';
}
