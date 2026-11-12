export const readerDefaults = {
  readingMode: 'pages', readerTheme: 'follow', fontWeight: 400, paragraphSpacing: 6,
  letterSpacing: 0, textAlign: 'justify', paragraphIndent: 1.5, marginHorizontal: 24,
  marginVertical: 22, readerWidth: 720, contentPosition: 'top', brightness: 100,
  tapNavigation: true, wakeLock: false, orientation: 'auto', customTextColor: '#28302b',
  customBackgroundColor: '#faf9f5', ttsRate: 1, ttsVoice: '', ttsLanguage: '', speedWpm:250,
};
export type AppPalette = {background: string; text: string; readingBackground?: string; readingText?: string};
export const palettes: Record<string, AppPalette> = {
  light: {background: '#eef2f6', text: '#25313b', readingBackground: '#faf9f5', readingText: '#28302b'},
  dark: {background: '#11161c', text: '#e6edf3', readingBackground: '#191d1b', readingText: '#dddcd4'},
  sepia: {background: '#eee2c8', text: '#4c3b2a'}, paper: {background: '#f1f0e9', text: '#353b36'},
  green: {background: '#dce8d9', text: '#293d30'},
};
export function contrast(a: string, b: string): number {
  const luminance = (hex: string) => {
    if (!/^#[a-f\d]{6}$/i.test(hex)) return 0;
    return [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((s, v, i) => s + v * [.2126, .7152, .0722][i], 0);
  };
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
}
export function readerSettings(input: Record<string, unknown>) {
  const d = {...readerDefaults, ...input};
  const number = (key: string, min: number, max: number, fallback: number) => Math.min(max, Math.max(min, Number.isFinite(Number(d[key as keyof typeof d])) ? Number(d[key as keyof typeof d]) : fallback));
  const choice = (value: unknown, list: string[], fallback: string) => list.includes(String(value)) ? String(value) : fallback;
  return {...d,
    readingMode: choice(d.readingMode, ['pages', 'scroll'], 'pages'),
    readerTheme: choice(d.readerTheme, ['follow', 'light', 'dark', 'sepia', 'paper', 'green', 'custom'], 'follow'),
    fontSize: number('fontSize', 14, 32, 19), lineHeight: number('lineHeight', 1.2, 2.4, 1.6),
    fontWeight: number('fontWeight', 400, 700, 400), paragraphSpacing: number('paragraphSpacing', 0, 32, 6),
    letterSpacing: number('letterSpacing', -.5, 3, 0), paragraphIndent: number('paragraphIndent', 0, 3, 1.5),
    marginHorizontal: number('marginHorizontal', 12, 72, 24), marginVertical: number('marginVertical', 8, 80, 22),
    readerWidth: number('readerWidth', 320, 1100, 720), brightness: number('brightness', 50, 100, 100),
    contentPosition: choice(d.contentPosition, ['top', 'center'], 'top'),
    textAlign: choice(d.textAlign, ['left', 'justify', 'center', 'right'], 'justify'),
    customTextColor: /^#[a-f\d]{6}$/i.test(String(d.customTextColor)) ? String(d.customTextColor) : '#28302b',
    customBackgroundColor: /^#[a-f\d]{6}$/i.test(String(d.customBackgroundColor)) ? String(d.customBackgroundColor) : '#faf9f5',
  };
}
export function spreadEnabled(preferences: Record<string, unknown>, width: number) {
  return preferences.spreadMode === 'double' && preferences.readingMode !== 'scroll' && width >= 1000;
}
export function findPage(pages: {chapterIndex: number; start: number; end: number}[], chapterIndex: number, offset: number): number {
  const index = pages.findIndex(p => p.chapterIndex === chapterIndex && offset >= p.start && offset < p.end);
  if (index >= 0) return index;
  const chapterPages = pages.map((p, i) => ({p, i})).filter(x => x.p.chapterIndex === chapterIndex);
  return chapterPages.at(-1)?.i ?? -1;
}

export function migrateReaderPreferences(settings: Record<string, unknown>) {
  const update: Record<string, unknown> = {readerTheme: 'follow', globalThemeVersion: 1, comfortDefaultsVersion: 1, paragraphIndentVersion: 1};
  // Upgrade the former zero default once; preserve custom widths and later choices.
  if (settings.paragraphIndentVersion !== 1 && (settings.paragraphIndent === undefined || settings.paragraphIndent === 0)) update.paragraphIndent = 1.5;
  if (settings.globalThemeVersion !== 1) {
    const old = String(settings.readerTheme || 'follow');
    update.themeMode = old !== 'follow' && ['light','dark','sepia','paper','green','custom'].includes(old) ? old : settings.themeMode || 'light';
  }
  if (settings.comfortDefaultsVersion !== 1) {
    if (settings.lineHeight === undefined || settings.lineHeight === 1.8) update.lineHeight = 1.6;
    if (settings.paragraphSpacing === undefined || settings.paragraphSpacing === 12) update.paragraphSpacing = 6;
    if (settings.textAlign === undefined || settings.textAlign === 'left') update.textAlign = 'justify';
    if (settings.pageAnimation === undefined || settings.pageAnimation === 'slide') update.pageAnimation = 'fade';
  }
  return update;
}
export function globalPalette(preferences: Record<string, unknown>, systemDark = false) {
  const mode = String(preferences.themeMode || 'light');
  const key = mode === 'system' || mode === 'auto-sensor' ? systemDark ? 'dark' : 'light' : mode;
  const d = readerSettings(preferences);
  let palette: AppPalette = palettes[key] || (key === 'custom' ? {text: d.customTextColor, background: d.customBackgroundColor} : palettes.light);
  if (contrast(palette.text, palette.background) < 4.5) palette = palettes.light;
  const rgb = (hex: string) => [1,3,5].map(i => parseInt(hex.slice(i,i+2),16));
  const background = rgb(palette.background), text = rgb(palette.text);
  const mix = (amount: number) => '#' + background.map((v,i) => Math.round(v * (1-amount) + text[i] * amount).toString(16).padStart(2,'0')).join('');
  const dark = background.reduce((s,v,i) => s + v * [.2126,.7152,.0722][i],0) < 110;
  const readingBackground=palette.readingBackground||palette.background,readingText=palette.readingText||palette.text;
  return {key, ...palette, readingBackground, readingText, dark, variables: {'--bg':palette.background,'--paper':readingBackground,'--text':palette.text,'--surface':mix(.035),'--muted':mix(.64),'--line':mix(.14),'--glass':background.join(',')}};
}
