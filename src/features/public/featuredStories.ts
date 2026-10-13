import type { Book, EpisodeSummary } from '../../data/library';

export type FeaturedStory = {
  book: Book;
  chapterCount: number;
  publishedAt: number;
};

/**
 * Only public, non-deleted books with at least one released chapter may
 * appear in the homepage hero. Sort by real chapter publication timestamps,
 * not by draft edits to the book record.
 */
export function selectRecentlyPublishedStories(
  books: Book[],
  episodes: EpisodeSummary[],
  limit = 5,
): FeaturedStory[] {
  const publishedByBook = new Map<string, { count: number; latest: number }>();
  const now = Date.now();

  for (const episode of episodes) {
    if (!episode.release_at) continue;
    const releasedAt = Date.parse(episode.release_at);
    if (!Number.isFinite(releasedAt) || releasedAt > now) continue;

    const previous = publishedByBook.get(episode.book_id);
    publishedByBook.set(episode.book_id, {
      count: (previous?.count ?? 0) + 1,
      latest: Math.max(previous?.latest ?? 0, releasedAt),
    });
  }

  return books
    .filter(book => book.is_published && !book.deleted_at && publishedByBook.has(book.id))
    .map(book => {
      const published = publishedByBook.get(book.id)!;
      return { book, chapterCount: published.count, publishedAt: published.latest };
    })
    .sort((a, b) => b.publishedAt - a.publishedAt || a.book.title.localeCompare(b.book.title, 'id'))
    .slice(0, Math.max(0, Math.min(5, limit)));
}
