import { supabase } from './supabase';

/** Public-safe metadata. No unpublished title, synopsis or manuscript body. */
export type UpcomingChapter = {
  book_id: string;
  episode_number: number;
  release_at: string;
};

/**
 * This RPC is intentionally optional during rollout. If the additive SQL
 * migration is not deployed yet, the library still works without schedules.
 * The RPC uses server time and exposes only the next enabled release per
 * public book, never unpublished manuscript data.
 */
export async function getPublicUpcomingChapters(): Promise<UpcomingChapter[]> {
  if (!supabase) return [];
  const epub=await supabase.from('qr_epub_schedule').select('book_id,episode_number,release_at').gt('release_at',new Date().toISOString()).order('release_at');
  const { data, error } = await supabase.rpc('qr_public_next_chapters');
  if (error) {
    // A missing optional RPC must not break the public reading experience.
    console.warn('Jadwal bab publik belum tersedia:', error.message);
    return (epub.data||[]) as UpcomingChapter[];
  }
  if (!Array.isArray(data)) return (epub.data||[]) as UpcomingChapter[];
  const now = Date.now();
  return [...data,...(epub.data||[])].filter((row): row is UpcomingChapter =>
    row !== null && typeof row === 'object' &&
    typeof row.book_id === 'string' &&
    Number.isSafeInteger(row.episode_number) && row.episode_number >= 0 &&
    typeof row.release_at === 'string' &&
    Number.isFinite(Date.parse(row.release_at)) && Date.parse(row.release_at) > now,
  );
}

export function formatUpcomingChapter(chapter: UpcomingChapter): string {
  const when = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date(chapter.release_at));
  const chapterName = chapter.episode_number === 0 ? 'Prolog' : `Bab ${chapter.episode_number}`;
  return `${chapterName} · ${when} WIB`;
}
