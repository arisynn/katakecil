import type { ThemeColors, ThemeMode, ReadingSettings } from '../types/reader';

export const THEMES: Record<ThemeMode, ThemeColors> = {
  white: { name:'white',label:'Mist Paper',bg:'#F5F7F4',pageBg:'#FCFCF8',text:'#243447',secondaryText:'#63758A',border:'rgba(219,228,231,0.7)',barBg:'rgba(246,249,252,0.82)',accent:'#5B7FA6',accentHover:'#47698E',hoverBg:'rgba(235,240,241,0.7)',cardBg:'rgba(237,242,240,0.65)',selectionBg:'#D7E5EC' },
  sepia: { name:'sepia',label:'Sepia Classic',bg:'#F3E8D0',pageBg:'#FAF1DF',text:'#3E3528',secondaryText:'#7C6B53',border:'rgba(227,210,181,0.7)',barBg:'rgba(250,241,223,0.84)',accent:'#846B49',accentHover:'#655136',hoverBg:'rgba(239,226,202,0.7)',cardBg:'rgba(240,228,207,0.65)',selectionBg:'#E5D2AD' },
  night: { name:'night',label:'Night Blue',bg:'#08192D',pageBg:'#102A43',text:'#E6EEF8',secondaryText:'#ABC2D9',border:'rgba(39,71,99,0.6)',barBg:'rgba(16,42,67,0.82)',accent:'#75A9D6',accentHover:'#A0CAEB',hoverBg:'rgba(27,59,87,0.7)',cardBg:'rgba(26,56,82,0.65)',selectionBg:'#294C6E' },
  black: { name:'black',label:'OLED Dark',bg:'#05080D',pageBg:'#0B111A',text:'#EAF2FF',secondaryText:'#B0BCCB',border:'rgba(36,50,67,0.6)',barBg:'rgba(11,17,26,0.85)',accent:'#8FB8DE',accentHover:'#B7D5F2',hoverBg:'rgba(24,37,52,0.7)',cardBg:'rgba(21,34,49,0.65)',selectionBg:'#24435F' },
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
