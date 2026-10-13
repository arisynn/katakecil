import type { ThemeColors, ThemeMode, ReadingSettings } from '../types/reader';

/** Visual reading surfaces are derived exclusively from the global theme. */
export const THEMES: Record<ThemeMode, ThemeColors> = {
  white: { name:'white',label:'Terang',bg:'#F4F8FD',pageBg:'#FFFFFF',text:'#172C48',secondaryText:'#506781',border:'#D5E3F2',barBg:'rgba(255,255,255,.97)',accent:'#235DB4',accentHover:'#19498F',hoverBg:'#E9F2FC',cardBg:'#E9F2FC',selectionBg:'#D5E8FF' },
  night: { name:'night',label:'Gelap',bg:'#081425',pageBg:'#10243D',text:'#EFF6FF',secondaryText:'#B2C5DA',border:'#294665',barBg:'rgba(16,36,61,.97)',accent:'#9BC9FF',accentHover:'#C4E1FF',hoverBg:'#173251',cardBg:'#173251',selectionBg:'#294665' },
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
