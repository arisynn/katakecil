export const SECURE_READER_URL = 'https://hrbcwymdqigtfmpmsdsi.supabase.co/functions/v1/katakecil-reader';
export interface CatalogBook { id: string; title: string; author: string; language: string; version: string; url: string; cover: string; source: string; sectionIds: string[] }
export function normalizePublishedCatalog(manifest: {books?: unknown}, base = SECURE_READER_URL): CatalogBook[] {
  if (!Array.isArray(manifest.books)) throw new Error('Invalid published catalog.');
  const ids = new Set<string>();
  return manifest.books.map((b: Record<string, unknown>) => {
    if (typeof b.id !== 'string' || !/^[a-z0-9][a-z0-9_-]{0,119}$/.test(b.id) || ids.has(b.id) || typeof b.title !== 'string' || !b.title || typeof b.revision !== 'string' || !/^[a-f\d]{64}$/.test(b.revision) || !Array.isArray(b.section_ids) || !b.section_ids.every(id => typeof id === 'string' && /^[a-f\d-]{36}$/i.test(id)) || new Set(b.section_ids).size !== b.section_ids.length) throw new Error('Invalid published book metadata.');
    ids.add(b.id);
    const url = new URL(base); url.searchParams.set('action', 'epub'); url.searchParams.set('book', b.id); url.searchParams.set('revision', b.revision);
    let cover = String(b.cover_url || '');
    if (cover && !/^data:image\/(png|jpeg|webp|gif);base64,[a-z\d+/=]+$/i.test(cover)) { try { const c = new URL(cover, base); cover = c.protocol === 'https:' ? c.href : ''; } catch { cover = ''; } }
    return {id: b.id, title: b.title, author: String(b.author || ''), language: String(b.language || 'id'), version: b.revision, sectionIds: b.section_ids as string[], url: url.href, cover, source: 'supabase'};
  }).filter(book => book.sectionIds.length > 0);
}
export async function fetchPublishedBook(book: CatalogBook, fetcher: typeof fetch = fetch): Promise<ArrayBuffer> {
  const response = await fetcher(book.url, {credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store', signal: AbortSignal.timeout(30000), redirect: 'error'});
  if (!response.ok) throw new Error(response.status === 409 ? 'Book changed. Refresh the library and open it again.' : 'Published content is unavailable. Please retry online.');
  if (response.headers.get('X-KataKecil-Revision') !== book.version || !response.headers.get('content-type')?.includes('application/epub+zip')) throw new Error('Publication revision could not be verified.');
  if (Number(response.headers.get('content-length')) > 30 * 1024 * 1024) throw new Error('Publication is too large.');
  const reader = response.body?.getReader();
  if (!reader) { const bytes = await response.arrayBuffer(); if (bytes.byteLength > 30 * 1024 * 1024) throw new Error('Publication is too large.'); return bytes; }
  const chunks: Uint8Array[] = []; let length = 0;
  while (true) { const {value, done} = await reader.read(); if (done) break; length += value.length; if (length > 30 * 1024 * 1024) { await reader.cancel(); throw new Error('Publication is too large.'); } chunks.push(value); }
  const bytes = new Uint8Array(length); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return bytes.buffer;
}
