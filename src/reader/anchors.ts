import { fromTextPosition, toTextPosition } from 'dom-anchor-text-quote';
export interface Chapter { text: string; href?: string; title?: string; chapterLabel?: string; navigationTitle?: string; arc?: {id: string; label: string; title: string}; contentHash?: string }
export interface TextAnchor { episodeId: string; exact: string; prefix: string; suffix: string; start: number; end: number; sourceHash?: string }
// The package's position functions only read textContent. No native Selection is created.
export function makeAnchor(chapter: Chapter, start: number, end: number): TextAnchor {
  start = Math.max(0, Math.min(chapter.text.length, Math.trunc(start)));
  end = Math.max(start, Math.min(chapter.text.length, Math.trunc(end)));
  if (end === start || end - start > 4000) throw new Error('Select between 1 and 4,000 characters.');
  const quote = fromTextPosition({ textContent: chapter.text }, { start, end });
  return { episodeId: chapter.href || '', ...quote, start, end, ...(chapter.contentHash ? {sourceHash: chapter.contentHash} : {}) };
}
export function resolveAnchor(chapters: Chapter[], anchor: TextAnchor): { chapterIndex: number; start: number; end: number } | null {
  if (!anchor.exact || anchor.exact.length > 4000 || !anchor.episodeId) return null;
  const candidates = chapters.map((chapter, chapterIndex) => ({ chapter, chapterIndex })).filter(x => x.chapter.href === anchor.episodeId);
  if (candidates.length !== 1) return null; // Never move a quote to a different episode.
  const { chapter, chapterIndex } = candidates[0];
  const text = chapter.text, exact = anchor.exact;
  const context = (start: number) => (!anchor.prefix || text.slice(Math.max(0, start - anchor.prefix.length), start) === anchor.prefix) && (!anchor.suffix || text.slice(start + exact.length, start + exact.length + anchor.suffix.length) === anchor.suffix);
  if (anchor.sourceHash && chapter.contentHash === anchor.sourceHash && text.slice(anchor.start, anchor.end) === exact && context(anchor.start)) return {chapterIndex, start: anchor.start, end: anchor.end};
  const matches: number[] = [];
  let offset = text.indexOf(exact);
  while (offset !== -1) { matches.push(offset); offset = text.indexOf(exact, offset + 1); }
  const contextual = matches.filter(context);
  // Context wins over stale offsets. Ambiguous repeated text remains explicitly unresolved.
  const unique = contextual.length === 1 ? contextual[0] : matches.length === 1 ? matches[0] : null;
  if (unique === null) return null;
  const located = toTextPosition({ textContent: text }, anchor, { hint: unique });
  // Do not silently reattach fuzzy text to a different sentence after an edit.
  if (!located || text.slice(located.start, located.end) !== exact) return null;
  return { chapterIndex, start: unique, end: unique + exact.length };
}

// One-time migration from the old raw EPUB cache. Only an exact, unique contextual quote may cross old file names.
export function migrateLegacyAnchor(chapters: Chapter[], anchor: TextAnchor) {
 const matches: {chapterIndex: number; start: number; end: number}[] = [];
 for (const [chapterIndex, chapter] of chapters.entries()) {
  let start = chapter.text.indexOf(anchor.exact);
  while (start >= 0) {
   const prefix = chapter.text.slice(Math.max(0, start - anchor.prefix.length), start);
   const suffix = chapter.text.slice(start + anchor.exact.length, start + anchor.exact.length + anchor.suffix.length);
   if ((!anchor.prefix || prefix === anchor.prefix) && (!anchor.suffix || suffix === anchor.suffix)) matches.push({chapterIndex, start, end: start + anchor.exact.length});
   start = chapter.text.indexOf(anchor.exact, start + 1);
  }
 }
 return matches.length === 1 ? matches[0] : null;
}

export async function prepareChapters<T extends Chapter>(chapters: T[]): Promise<(T & {contentHash: string})[]> {
 return Promise.all(chapters.map(async chapter => {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(chapter.text));
  return {...chapter, contentHash: Array.from(new Uint8Array(hash), value => value.toString(16).padStart(2, '0')).join('')};
 }));
}
