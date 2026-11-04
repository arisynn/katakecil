export const readerDefaults = {
  readingMode: 'pages', readerTheme: 'follow', fontWeight: 400, paragraphSpacing: 12,
  letterSpacing: 0, textAlign: 'left', paragraphIndent: 0, marginHorizontal: 24,
  marginVertical: 22, readerWidth: 720, contentPosition: 'top', brightness: 100,
  tapNavigation: true, wakeLock: false, orientation: 'auto', customTextColor: '#28302b',
  customBackgroundColor: '#faf9f5', ttsRate: 1, ttsVoice: '', ttsLanguage: '',
};
export const palettes: Record<string, {background: string; text: string}> = {
  light: {background: '#faf9f5', text: '#28302b'}, dark: {background: '#191d1b', text: '#dddcd4'},
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
    fontSize: number('fontSize', 14, 32, 19), lineHeight: number('lineHeight', 1.2, 2.4, 1.8),
    fontWeight: number('fontWeight', 400, 700, 400), paragraphSpacing: number('paragraphSpacing', 0, 32, 12),
    letterSpacing: number('letterSpacing', -.5, 3, 0), paragraphIndent: number('paragraphIndent', 0, 3, 0),
    marginHorizontal: number('marginHorizontal', 12, 72, 24), marginVertical: number('marginVertical', 8, 80, 22),
    readerWidth: number('readerWidth', 320, 1100, 720), brightness: number('brightness', 50, 100, 100),
    contentPosition: choice(d.contentPosition, ['top', 'center'], 'top'),
    textAlign: choice(d.textAlign, ['left', 'justify', 'center', 'right'], 'left'),
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
