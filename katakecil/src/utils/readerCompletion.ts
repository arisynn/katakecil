/** V7 Alpha.4 — completion metadata only. Never persist protected episode text. */
export const completionStorageKey = (bookId: string): string => `kk-reader-completed-v1-${bookId}`;

export function normalizeCompletedEpisodes(input: unknown): number[] {
  if (!Array.isArray(input)) return [];
  const safe = new Set<number>();
  for (const value of input.slice(0, 10000)) {
    if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= 9999) safe.add(value);
  }
  return [...safe].sort((a, b) => a - b);
}

export function toggleCompletedEpisode(completed: readonly number[], episode: number): number[] {
  const previous = normalizeCompletedEpisodes(completed);
  if (!Number.isSafeInteger(episode) || episode < 0 || episode > 9999) return previous;
  return previous.includes(episode) ? previous.filter(n => n !== episode) : normalizeCompletedEpisodes([...previous, episode]);
}

/** Approximation based on the released chapter's word count, not reading telemetry. */
export function estimateRemainingMinutes(wordCount: number, page: number, totalPages: number, wordsPerMinute = 220): number | null {
  if (!Number.isFinite(wordCount) || wordCount <= 0 || !Number.isFinite(totalPages) || totalPages <= 0 ||
      !Number.isFinite(page) || !Number.isFinite(wordsPerMinute) || wordsPerMinute <= 0) return null;
  const remainingRatio = Math.max(0, Math.min(1, (totalPages - Math.max(1, page)) / totalPages));
  return remainingRatio === 0 ? 0 : Math.max(1, Math.ceil(wordCount * remainingRatio / wordsPerMinute));
}
