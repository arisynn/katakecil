export interface Match { start: number; end: number }
export function findMatches(text: string, query: string, limit = 1000): { matches: Match[]; total: number; truncated: boolean } {
  const matches: Match[] = [];
  query = query.trim();
  if (!query || query.length > 200) return {matches, total: 0, truncated: false};
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(escaped, 'giu');
  let match: RegExpExecArray | null, total = 0;
  while ((match = pattern.exec(text))) { total++; if (matches.length < limit) matches.push({start: match.index, end: match.index + match[0].length}); }
  return {matches, total, truncated: total > matches.length};
}
export function readingStats(text: string, language = 'en') {
  let segmenter: Intl.Segmenter;
  try { segmenter = new Intl.Segmenter(language, {granularity: 'word'}); } catch { segmenter = new Intl.Segmenter('en', {granularity: 'word'}); }
  let words = 0;
  for (const segment of segmenter.segment(text)) if (segment.isWordLike) words++;
  return {words, minutes: words ? Math.max(1, Math.ceil(words / 220)) : 0};
}
export interface Sentence extends Match { text: string }
export function sentences(text: string, language = 'en'): Sentence[] {
  let segmenter: Intl.Segmenter;
  try { segmenter = new Intl.Segmenter(language, {granularity: 'sentence'}); } catch { segmenter = new Intl.Segmenter('en', {granularity: 'sentence'}); }
  const result: Sentence[] = [];
  for (const part of segmenter.segment(text)) {
    // Bound utterances to avoid long-utterance failures on mobile speech engines.
    for (let i = 0; i < part.segment.length;) {
      let end = Math.min(part.segment.length, i + 240);
      if (end < part.segment.length) { const space = part.segment.lastIndexOf(' ', end); if (space > i + 100) end = space + 1; }
      if (/[\uD800-\uDBFF]/.test(part.segment[end - 1] || '') && end < part.segment.length) end--;
      const chunk = part.segment.slice(i, end), leading = chunk.length - chunk.trimStart().length;
      if (chunk.trim()) result.push({start: part.index + i + leading, end: part.index + end, text: chunk.trimStart()});
      i = end;
    }
  }
  return result;
}
