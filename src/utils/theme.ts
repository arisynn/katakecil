import type { ThemeColors, ThemeMode, ReadingSettings } from '../types/reader';

/** Visual reading surfaces are derived exclusively from the global theme. */
export const THEMES: Record<ThemeMode, ThemeColors> = {
  white: { name:'white',label:'Terang',bg:'#F8F4EE',pageBg:'#FFFCF7',text:'#302C29',secondaryText:'#786D63',border:'#D5C9BC',barBg:'rgba(255,252,247,.96)',accent:'#805321',accentHover:'#6B4319',hoverBg:'#F0E8DE',cardBg:'#F0E8DE',selectionBg:'#E8D5B6' },
  night: { name:'night',label:'Gelap',bg:'#0D1729',pageBg:'#15243B',text:'#F6EFE5',secondaryText:'#B6C4D6',border:'#3A4D66',barBg:'rgba(21,36,59,.96)',accent:'#F0C98B',accentHover:'#FFE0AC',hoverBg:'#21344E',cardBg:'#21344E',selectionBg:'#3A4D66' },
};

export const DEFAULT_SETTINGS: ReadingSettings = {
  theme: 'white',
  fontFamily: 'literata',
  fontSize: 100,
  lineHeight: 'normal',
  marginWidth: 'normal',
  textAlign: 'left',
  spreadMode: 'single',
};
