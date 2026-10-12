import { supabase } from './supabase';
import type { StoryFile } from '../types/reader';

export const legacyBookId = import.meta.env.VITE_BOOK_ID || 'peta-jalan-pulang';
export const legacyBookTitle = import.meta.env.VITE_BOOK_TITLE || 'Peta Jalan Pulang';
type Episode = { episode_number: number; title: string; arc_title: string; content_md: string; updated_at: string };
export function emptyStory(bookId = legacyBookId, title = legacyBookTitle): StoryFile {
  return { id: bookId, path: '', title, content: '' };
}
async function selectPublished(bookId: string, fields: string) {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi. Isi variabel VITE_SUPABASE_URL dan VITE_SUPABASE_PUBLISHABLE_KEY.');
  const { data, error } = await supabase.from('qr_episodes').select(fields).eq('book_id', bookId).eq('is_enabled', true).lte('release_at', new Date().toISOString()).order('episode_number');
  if (error) throw new Error(`Gagal memuat episode: ${error.message}`);
  // RLS only returns enabled, released episodes to readers.
  return data ?? [];
}
export async function fetchPublishedFingerprint(bookId: string): Promise<string> {
  return JSON.stringify(await selectPublished(bookId, 'episode_number,updated_at'));
}
export async function loadPublishedStory(bookId: string, title: string): Promise<{ story: StoryFile; fingerprint: string }> {
  const rows = await selectPublished(bookId, 'episode_number,title,arc_title,content_md,updated_at') as Episode[];
  let lastArc = '';
  const parts = [`# ${title}`];
  for (const row of rows) {
    const arc = row.arc_title || '';
    if (arc && arc !== lastArc) parts.push(`## ${arc}`);
    lastArc = arc;
    parts.push(`### ${row.title}`, row.content_md);
  }
  return {
    story: { id: bookId, title, path: '', content: parts.join('\n\n'), episodeNumbers: rows.map(r => r.episode_number) },
    fingerprint: JSON.stringify(rows.map(r => ({ episode_number: r.episode_number, updated_at: r.updated_at }))),
  };
}
