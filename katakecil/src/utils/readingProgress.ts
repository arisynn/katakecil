/** Metadata only: never persist story text or manuscript fragments. */
export type StoredReadingProgress = { ep: number; offset: number; updatedAt: number | null };

/** Accepts the old {ep, part, offset} shape and the V7 timestamped shape. */
export function parseReadingProgress(value: unknown): StoredReadingProgress | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  if (!Number.isSafeInteger(row.ep) || (row.ep as number) < 0) return null;
  if (row.part !== undefined && row.part !== 0) return null;
  if (typeof row.offset !== 'number' || !Number.isFinite(row.offset) || row.offset < 0) return null;
  const updatedAt = typeof row.updatedAt === 'number' && Number.isFinite(row.updatedAt) && row.updatedAt > 0
    ? row.updatedAt : null;
  return { ep: row.ep as number, offset: row.offset, updatedAt };
}

export function newestReadingProgress<T extends { id: string }>(
  books: readonly T[],
  episodes: readonly { book_id: string; episode_number: number }[],
  getProgress: (book: T) => StoredReadingProgress | null,
): { book: T; progress: StoredReadingProgress } | null {
  const released = new Set(episodes.map(ep => `${ep.book_id}:${ep.episode_number}`));
  let latest: { book: T; progress: StoredReadingProgress } | null = null;
  for (const book of books) {
    const progress = getProgress(book);
    if (!progress || !released.has(`${book.id}:${progress.ep}`)) continue;
    if (!latest || (progress.updatedAt ?? 0) > (latest.progress.updatedAt ?? 0)) latest = { book, progress };
  }
  return latest;
}
