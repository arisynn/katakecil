// Only reading metadata crosses devices. EPUB bytes and server manuscripts never enter backups.
export const BACKUP_MAX_BYTES = 8 * 1024 * 1024;
type RecordValue = Record<string, unknown>;
const record = (value: unknown): value is RecordValue => !!value && typeof value === 'object' && !Array.isArray(value);
const text = (value: unknown, max = 200) => typeof value === 'string' && value.length <= max;
const identifier = (value: unknown) => text(value) && /^[a-zA-Z0-9][a-zA-Z0-9_.:-]*$/.test(value as string) && !['__proto__', 'prototype'].includes(value as string) && !Object.hasOwn(Object.prototype, value as string);
const integer = (value: unknown) => Number.isSafeInteger(value) && (value as number) >= 0 && (value as number) <= 100000000;
const date = (value: unknown) => text(value, 40) && Number.isFinite(Date.parse(value as string));
function invalid(): never {throw Error('Invalid KataKecil backup.');}
function anchor(value: unknown): RecordValue {
  if (!record(value) || !text(value.episodeId, 1000) || !text(value.exact, 4000) || !value.exact ||
      !text(value.prefix, 1000) || !text(value.suffix, 1000) || !integer(value.start) || !integer(value.end) || (value.end as number) <= (value.start as number) || (value.end as number) - (value.start as number) !== (value.exact as string).length) invalid();
  if (value.sourceHash !== undefined && !/^[a-f\d]{64}$/.test(String(value.sourceHash))) invalid();
  return {episodeId: value.episodeId, exact: value.exact, prefix: value.prefix, suffix: value.suffix, start: value.start, end: value.end, ...(value.sourceHash ? {sourceHash: value.sourceHash} : {})};
}
function readingRecord(value: unknown, annotation: boolean): RecordValue {
  if (!record(value) || !identifier(value.bookId) || !integer(value.chapterIndex)) invalid();
  const out: RecordValue = {bookId: value.bookId, chapterIndex: value.chapterIndex};
  for (const key of ['charOffset','pageIndex','totalPages','totalChapters','startOffset','endOffset']) {
    if (value[key] !== undefined) {if (!integer(value[key])) invalid();out[key] = value[key];}
  }
  for (const key of ['createdAt','updatedAt']) {
    if (value[key] !== undefined) {if (!date(value[key])) invalid();out[key] = value[key];}
  }
  if (value.anchor !== undefined) out.anchor = anchor(value.anchor);
  for (const key of ['needsReview','legacySourceAnchor']) if (typeof value[key] === 'boolean') out[key] = value[key];
  if (!annotation) {
    if (typeof value.percentage !== 'number' || !Number.isFinite(value.percentage) || value.percentage < 0 || value.percentage > 100) invalid();
    out.percentage = value.percentage;
    if (record(value.tts) && integer(value.tts.chapterIndex) && integer(value.tts.charOffset)) out.tts = {chapterIndex:value.tts.chapterIndex,charOffset:value.tts.charOffset};
    return out;
  }
  if (!identifier(value.id) || !['highlight','bookmark'].includes(String(value.type))) invalid();
  out.id = value.id; out.type = value.type;
  if (!['amber','emerald','sapphire','rose'].includes(String(value.color))) invalid();
  out.color = value.color;
  for (const [key, max] of [['selectedText',4000],['noteText',10000],['label',200]] as const) {
    if (value[key] !== undefined) {if (!text(value[key], max)) invalid();out[key] = value[key];}
  }
  if (value.type === 'highlight' && (!integer(out.startOffset) || !integer(out.endOffset) || (out.endOffset as number) <= (out.startOffset as number))) invalid();
  return out;
}
const preferenceKeys = new Set(['iconPack','loadingStyle','ambientIntensity','glassTransparency','glassBlur','uiLanguage','uiLanguageChosen','uiLanguageDefaultVersion','themeMode','accentColor','fontFamily','fontSize','lineHeight','fontWeight','paragraphSpacing','letterSpacing','paragraphIndent','textAlign','marginHorizontal','marginVertical','readerWidth','readingMode','readerTheme','spreadMode','pageAnimation','contentPosition','brightness','tapNavigation','wakeLock','orientation','customTextColor','customBackgroundColor','speedWpm','ttsRate','ttsVoice','ttsLanguage','globalThemeVersion','comfortDefaultsVersion','paragraphIndentVersion']);
function preferences(value: unknown) {
  if (!record(value)) invalid();
  const out: RecordValue = {};
  for (const [key, item] of Object.entries(value)) {
    if (!preferenceKeys.has(key)) continue;
    if (typeof item === 'boolean' || typeof item === 'number' && Number.isFinite(item) && Math.abs(item) <= 10000 || text(item, 300)) out[key] = item;
    else invalid();
  }
  for (const [key,max] of [['glassTransparency',100],['glassBlur',40],['ambientIntensity',100]] as const) if (key in out && (typeof out[key] !== 'number' || (out[key] as number) < 0 || (out[key] as number) > max)) invalid();
  // UI code assumes these values have specific types, even when imported from another device.
  for (const key of ['fontSize','lineHeight','fontWeight','paragraphSpacing','letterSpacing','paragraphIndent','marginHorizontal','marginVertical','readerWidth','brightness','ttsRate','speedWpm']) if (key in out && typeof out[key] !== 'number') invalid();
  for (const key of ['iconPack','loadingStyle']) if (key in out && typeof out[key] !== 'string') invalid();
  const choices: Record<string, string[]> = {iconPack:['katakecil','lucide'],loadingStyle:['wordmark','pulse','dots'],uiLanguage:['id','en'],themeMode:['light','dark','system','auto-sensor','sepia','paper','green','custom'],fontFamily:['Lora','Plus Jakarta Sans','DM Sans','Georgia','system','monospace'],readingMode:['pages','scroll'],readerTheme:['follow','light','dark','sepia','paper','green','custom'],spreadMode:['single','double'],pageAnimation:['none','fade','slide'],contentPosition:['top','center'],textAlign:['left','justify','center','right'],orientation:['auto','portrait','landscape']};
  for (const [key, allowed] of Object.entries(choices)) if (key in out && !allowed.includes(String(out[key]))) invalid();
  for (const key of ['accentColor','customTextColor','customBackgroundColor']) if (key in out && !/^#[a-f\d]{6}$/i.test(String(out[key]))) invalid();
  return out;
}
export interface ReadingBackup {schemaVersion: number; preferences: RecordValue; progress: RecordValue[]; annotations: RecordValue[]}
export function parseBackup(raw: string): ReadingBackup {
  if (new TextEncoder().encode(raw).byteLength > BACKUP_MAX_BYTES) throw Error('Backup is larger than 8 MB.');
  let value: unknown; try {value = JSON.parse(raw);} catch {invalid();}
  if (!record(value)) invalid();
  const modern = value.format === 'katakecil-backup' && value.schemaVersion === 2;
  // Earlier device-wide and per-book annotation exports are also accepted, without restoring settings.
  const legacy = value.format === undefined && value.schemaVersion !== 2 && Array.isArray(value.annotations) && (date(value.exportedAt) || value.schemaVersion === 1);
  if (!modern && !legacy) invalid();
  if (!Array.isArray(value.annotations) || value.annotations.length > 20000) invalid();
  if (modern && (!Array.isArray(value.progress) || value.progress.length > 5000)) invalid();
  const annotations = value.annotations.map(item => readingRecord(item, true));
  const progress = modern ? (value.progress as unknown[]).map(item => readingRecord(item, false)) : [];
  if (new Set(annotations.map(a => a.id)).size !== annotations.length || new Set(progress.map(p => p.bookId)).size !== progress.length) invalid();
  return {schemaVersion: modern ? 2 : 1, preferences: modern ? preferences(value.preferences) : {}, progress, annotations};
}
export function createBackup(input: {preferences: RecordValue; progress: RecordValue; annotations: unknown[]}) {
  const result = {format:'katakecil-backup', schemaVersion:2, exportedAt:new Date().toISOString(), preferences:preferences(input.preferences), progress:Object.values(input.progress), annotations:input.annotations};
  // Export uses the same allowlist and validation as import, stripping transient/source fields.
  const checked = parseBackup(JSON.stringify(result));
  return {...result, progress:checked.progress, annotations:checked.annotations};
}
