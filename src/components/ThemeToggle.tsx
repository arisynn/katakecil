import React from 'react';
import BrandIcon from './BrandIcon';
import type { UiTheme, AppThemePreference } from '../hooks/useUiTheme';

/** One button, one action: switch the global theme immediately. */
export default function ThemeToggle({ theme, onPreferenceChange }: {
  theme: UiTheme;
  preference?: AppThemePreference;
  onPreferenceChange: (next: AppThemePreference) => void;
}) {
  const next = theme === 'dark' ? 'light' : 'dark';
  return <div className="kk-theme-picker">
    <button type="button" className="v53-theme-toggle" onClick={() => onPreferenceChange(next)}
      aria-label={`Aktifkan mode ${next === 'dark' ? 'gelap' : 'terang'}`}
      title={`Mode ${theme === 'dark' ? 'gelap' : 'terang'} · ubah ke ${next === 'dark' ? 'gelap' : 'terang'}`}>
      <BrandIcon name={theme === 'dark' ? 'moon' : 'sun'} size={19}/>
    </button>
  </div>;
}
