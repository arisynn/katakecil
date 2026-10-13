import type { ThemeColors, ThemeMode, ReadingSettings } from '../types/reader';

export const THEMES: Record<ThemeMode, ThemeColors> = {
  white: { name:'white',label:'Paper',bg:'#F2E6D6',pageBg:'#FFF5E6',text:'#243447',secondaryText:'#63758A',border:'#DBE4E7',barBg:'rgba(252,252,248,.97)',accent:'#5B7FA6',accentHover:'#47698E',hoverBg:'#EBF0F1',cardBg:'#EDF2F0',selectionBg:'#D7E5EC' },
  sepia: { name:'sepia',label:'Sepia',bg:'#F3E8D0',pageBg:'#FAF1DF',text:'#3E3528',secondaryText:'#7C6B53',border:'#E3D2B5',barBg:'rgba(250,241,223,.97)',accent:'#846B49',accentHover:'#655136',hoverBg:'#EFE2CA',cardBg:'#F0E4CF',selectionBg:'#E5D2AD' },
  night: { name:'night',label:'Malam',bg:'#08192D',pageBg:'#102A43',text:'#E6EEF8',secondaryText:'#ABC2D9',border:'#274763',barBg:'rgba(16,42,67,.97)',accent:'#75A9D6',accentHover:'#A0CAEB',hoverBg:'#1B3B57',cardBg:'#1A3852',selectionBg:'#294C6E' },
  calm: { name:'calm',label:'Calm',bg:'#C8DAD4',pageBg:'#E5F0E9',text:'#284C4B',secondaryText:'#62817B',border:'#B3D0C7',barBg:'rgba(229,240,233,.97)',accent:'#3F7D75',accentHover:'#326A62',hoverBg:'#D4E6DE',cardBg:'#D7E7DF',selectionBg:'#C1D9CF' },
  black: { name:'black',label:'OLED Dark',bg:'#05080D',pageBg:'#0B111A',text:'#EAF2FF',secondaryText:'#B0BCCB',border:'#243243',barBg:'rgba(11,17,26,.97)',accent:'#8FB8DE',accentHover:'#B7D5F2',hoverBg:'#182534',cardBg:'#152231',selectionBg:'#24435F' },
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
