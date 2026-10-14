/** Local-only collection presentation. Never stores reader manuscripts. */
export type CollectionFilter = 'semua' | 'dibaca' | 'belum';

/** Last saved first; do not mutate the Supabase result array. */
export function sortSavedStories<T extends { id: string }>(books: readonly T[], savedIds: readonly string[]): T[] {
  const order = new Map(savedIds.map((id, index) => [id, index]));
  return [...books].sort((a, b) => (order.get(b.id) ?? -1) - (order.get(a.id) ?? -1));
}

export function filterSavedStories<T>(books: readonly T[], filter: CollectionFilter, getProgress: (book: T) => number | null): T[] {
  if (filter === 'semua') return [...books];
  return books.filter(book => (getProgress(book) !== null) === (filter === 'dibaca'));
}
