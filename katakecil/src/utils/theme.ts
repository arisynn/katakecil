import type { ThemeColors, ThemeMode, ReadingSettings } from '../types/reader';

/** Visual reading surfaces are derived exclusively from the global theme. */
import { SAPPHIRE_PALETTE } from '../design/sapphirePalette';
const light = SAPPHIRE_PALETTE.light;
const dark = SAPPHIRE_PALETTE.dark;

export const THEMES: Record<ThemeMode, ThemeColors> = {
  white: { name:'white',label:'Terang',bg:light.background,pageBg:light.surface,text:light.text,secondaryText:light.muted,border:light.border,barBg:'var(--kk-overlay)',accent:light.accent,accentHover:light.accentHover,hoverBg:light.raised,cardBg:light.raised,selectionBg:light.selection },
  night: { name:'night',label:'Gelap',bg:dark.background,pageBg:dark.surface,text:dark.text,secondaryText:dark.muted,border:dark.border,barBg:'var(--kk-overlay)',accent:dark.accent,accentHover:dark.accentHover,hoverBg:dark.raised,cardBg:dark.raised,selectionBg:dark.selection },
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
