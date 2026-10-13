import type { Book, EpisodeSummary } from '../../data/library';

export type RecentChapter = {
  book: Book;
  episode: EpisodeSummary;
  publishedAt: number;
};

/** Latest released chapters from public books, no future or draft records. */
export function selectRecentChapters(
  books: Book[], episodes: EpisodeSummary[],
  now = Date.now(), days = 30, limit = 2,
): RecentChapter[] {
  const publicBooks = new Map(books
    .filter(book => book.is_published && !book.deleted_at)
    .map(book => [book.id, book]));
  const since = now - days * 24 * 60 * 60 * 1000;
  return episodes.flatMap(episode => {
    const book = publicBooks.get(episode.book_id);
    const publishedAt = Date.parse(episode.release_at ?? '');
    if (!book || !Number.isFinite(publishedAt) || publishedAt > now || publishedAt < since) return [];
    return [{ book, episode, publishedAt }];
  }).sort((a, b) => b.publishedAt - a.publishedAt || b.episode.episode_number - a.episode.episode_number)
    .slice(0, limit);
}
