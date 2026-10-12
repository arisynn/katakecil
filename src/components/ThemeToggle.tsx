import React from 'react';
import { Moon, Sun } from 'lucide-react';
import type { UiTheme } from '../hooks/useUiTheme';

export default function ThemeToggle({theme, onToggle}: {theme:UiTheme; onToggle:()=>void}) {
  return <button type="button" className="v53-theme-toggle" onClick={onToggle}
    title={theme === 'dark' ? 'Aktifkan mode terang' : 'Aktifkan mode malam'}
    aria-label={theme === 'dark' ? 'Aktifkan mode terang' : 'Aktifkan mode malam'}>
    {theme === 'dark' ? <Sun size={20} strokeWidth={1.8}/> : <Moon size={20} strokeWidth={1.8}/>}
  </button>;
}
