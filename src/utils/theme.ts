import type { ThemeColors, ThemeMode, ReadingSettings } from '../types/reader';

export const THEMES: Record<ThemeMode, ThemeColors> = {
  white: { name: 'white', label: 'Kertas', bg: '#FAFAF8', pageBg: '#FAFAF8', text: '#232824', secondaryText: '#7A8079', border: '#E5E8E2', barBg: 'rgba(250,250,248,.97)', accent: '#496C58', accentHover: '#36523F', hoverBg: '#F0F2ED', cardBg: '#F0F2ED', selectionBg: '#DCE8DD' },
  sepia: { name: 'sepia', label: 'Hangat', bg: '#F5F0E7', pageBg: '#F5F0E7', text: '#3B342C', secondaryText: '#8D8171', border: '#E5DCD0', barBg: 'rgba(245,240,231,.97)', accent: '#746249', accentHover: '#5D4C37', hoverBg: '#EBE2D5', cardBg: '#EBE2D5', selectionBg: '#E2D3B9' },
  night: { name: 'night', label: 'Senja', bg: '#202623', pageBg: '#202623', text: '#DCE1DA', secondaryText: '#9CA99F', border: '#36413A', barBg: 'rgba(32,38,35,.97)', accent: '#ACC5AC', accentHover: '#BDD4B9', hoverBg: '#2C3530', cardBg: '#2C3530', selectionBg: '#425C4C' },
  black: { name: 'black', label: 'OLED', bg: '#080909', pageBg: '#080909', text: '#E1E3E0', secondaryText: '#898D88', border: '#242824', barBg: 'rgba(8,9,9,.97)', accent: '#BBC9B5', accentHover: '#D6DED0', hoverBg: '#181B18', cardBg: '#181B18', selectionBg: '#314236' },
};

export const DEFAULT_SETTINGS: ReadingSettings = {
  theme: 'sepia',
  fontFamily: 'literata',
  fontSize: 100,
  lineHeight: 'normal',
  marginWidth: 'normal',
  textAlign: 'left',
  spreadMode: 'single',
};
