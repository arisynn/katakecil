import { useEffect, useState } from 'react';

export type UiTheme = 'light' | 'dark';
const key = 'katakecil_ui_theme_v53'; // Deliberately separate from Reader settings.
function getInitial(): UiTheme {
  if (typeof window === 'undefined') return 'light';
  try {
    const value = window.localStorage.getItem(key);
    if (value === 'light' || value === 'dark') return value;
  } catch { /* Storage can be unavailable in private browsing. */ }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
export function useUiTheme() {
  const [theme, setTheme] = useState<UiTheme>(getInitial);
  const toggleTheme = () => setTheme(previous => {
    const next = previous === 'dark' ? 'light' : 'dark';
    try { window.localStorage.setItem(key, next); } catch { /* Nonpersistent fallback */ }
    return next;
  });
  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!media) return;
    const onChange = (event: MediaQueryListEvent) => {
      try { if (window.localStorage.getItem(key)) return; } catch { /* Follow system */ }
      setTheme(event.matches ? 'dark' : 'light');
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);
  return { theme, toggleTheme };
}
