export const MAX_TRANSLATION_BYTES = 450;
async function getJSON(url: string, signal: AbortSignal, fetcher: typeof fetch) {
  const response = await fetcher(url, {signal, credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store', redirect: 'error'});
  if (!response.ok) throw new Error('The service is unavailable or its request limit was reached.');
  const reader = response.body?.getReader();
  if (!reader) return response.json();
  const chunks: Uint8Array[] = []; let length = 0;
  while (true) { const {done, value} = await reader.read(); if (done) break; length += value.length; if (length > 512 * 1024) { await reader.cancel(); throw Error('The service response is too large.'); } chunks.push(value); }
  const bytes = new Uint8Array(length); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return JSON.parse(new TextDecoder().decode(bytes));
}
export async function dictionaryLookup(text: string, language: string, signal: AbortSignal, fetcher: typeof fetch = fetch): Promise<{text: string; source: string; url: string; license: string}> {
  const word = text.trim();
  if (!/^[\p{L}\p{M}'’\-]{1,64}$/u.test(word)) throw new Error('Select a single word to look it up.');
  if (language === 'en') {
    const data = await getJSON('https://api.dictionaryapi.dev/api/v2/entries/en/' + encodeURIComponent(word), signal, fetcher);
    if (!Array.isArray(data) || !data[0]?.meanings) throw new Error('No definition was found for this word.');
    const meanings = data[0].meanings.slice(0, 6).map((m: {partOfSpeech?: string; definitions?: {definition: string}[]}) => [m.partOfSpeech, ...((m.definitions || []).slice(0, 3).map(d => d.definition))].filter(Boolean).join('\n'));
    return {text: meanings.join('\n\n').slice(0, 6000), source: 'Free Dictionary API / Wiktionary', url: 'https://en.wiktionary.org/wiki/' + encodeURIComponent(word), license: String(data[0].license?.name || 'Wiktionary content license')};
  }
  if (language !== 'id') throw new Error('Dictionary lookup supports English and Indonesian.');
  const url = new URL('https://id.wiktionary.org/w/api.php');
  for (const [key, value] of Object.entries({action: 'parse', page: word.toLocaleLowerCase('id'), prop: 'text', format: 'json', origin: '*'})) url.searchParams.set(key, value);
  const data = await getJSON(url.href, signal, fetcher);
  if (data.error || !data.parse?.text?.['*']) throw new Error('No definition was found for this word.');
  // Strip all attributes/resource-bearing tags before parsing; no remote images or frames load.
  const inert = String(data.parse.text['*']).replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '').replace(/<[^>]*>/g, tag => {
    const allowed = tag.match(/^<(\/?)(ol|li|p|br|b|i|em|strong|span)\b[^>]*>$/i);
    return allowed ? '<' + allowed[1] + allowed[2] + '>' : '';
  });
  const dom = new DOMParser().parseFromString(inert, 'text/html');
  dom.querySelectorAll('script,style,.mw-editsection,table,.noprint,.navbox,.toc').forEach(n => n.remove());
  const definitions = Array.from(dom.querySelectorAll('ol > li')).map(n => n.textContent?.trim()).filter(Boolean).slice(0, 12);
  if (!definitions.length) throw new Error('No definition was found for this word.');
  return {text: definitions.join('\n\n').slice(0, 6000), source: 'Wikikamus / Wiktionary', url: 'https://id.wiktionary.org/wiki/' + encodeURIComponent(word), license: 'CC BY-SA 4.0'};
}
export async function translateSelection(text: string, source: string, target: string, signal: AbortSignal, fetcher: typeof fetch = fetch): Promise<{text: string; source: string}> {
  text = text.trim();
  if (!text || new TextEncoder().encode(text).length > MAX_TRANSLATION_BYTES) throw new Error('Select a shorter passage (up to 450 UTF-8 bytes).');
  if (![source, target].every(lang => ['id', 'en', 'es', 'fr', 'de', 'ja', 'ko', 'zh'].includes(lang)) || source === target) throw new Error('Choose two different supported languages.');
  const url = new URL('https://api.mymemory.translated.net/get'); url.searchParams.set('q', text); url.searchParams.set('langpair', source + '|' + target);
  const data = await getJSON(url.href, signal, fetcher);
  if (Number(data.responseStatus) !== 200 || !data.responseData?.translatedText) throw new Error('Translation is unavailable or its free request limit was reached.');
  // Service data is rendered as text, never inserted as executable HTML.
  return {text: String(data.responseData.translatedText).slice(0, 6000), source: 'MyMemory · Translated'};
}
export class ReadingWakeLock {
  private lock: WakeLockSentinel | null = null;
  private pending: Promise<void> | null = null;
  private enabled = false;
  constructor(private getWakeLock: () => WakeLock | undefined = () => navigator.wakeLock, private visible = () => document.visibilityState === 'visible') {}
  get active() { return !!this.lock && !this.lock.released; }
  async set(enabled: boolean): Promise<void> {
    this.enabled = enabled;
    if (!enabled || !this.visible()) { await this.lock?.release(); this.lock = null; return; }
    if (this.active) return;
    if (this.pending) { await this.pending; if (this.enabled && this.visible() && !this.active) return this.set(true); return; }
    const api = this.getWakeLock(); if (!api) throw Error('Screen Wake Lock is not supported by this browser.');
    this.pending = (async () => {
      const lock = await api.request('screen');
      if (!this.enabled || !this.visible()) { await lock.release(); return; }
      this.lock = lock; lock.addEventListener('release', () => { if (this.lock === lock) this.lock = null; });
    })();
    try { await this.pending; } finally { this.pending = null; }
  }
}
