// KataKecil V4.2: public, rate-limited, small-segment reader.
// Deploy with `--no-verify-jwt`: the publication policy is verified server-side.
// No service keys are returned to the browser. No persistent content caching.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'private, no-store, max-age=0',
  'X-Content-Type-Options': 'nosniff',
};
const MAX_BODY = 1024;
const MAX_CHARS = 1800;
function respond(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: CORS });
}
// Keep markdown paragraphs intact when possible; oversize paragraphs are split
// on whitespace to keep each API response strictly bounded.
export function chunkMarkdown(raw: string, limit = MAX_CHARS): string[] {
  const normalized = raw.replace(/\r\n?/g, '\n').trim();
  if (!normalized) return [];
  const paragraphs = normalized.split(/\n\s*\n/).filter(Boolean);
  const units: {text:string; newParagraph:boolean}[] = [];
  for (const paragraph of paragraphs) {
    if (paragraph.length <= limit) { units.push({text:paragraph,newParagraph:true}); continue; }
    let rest = paragraph;
    let first = true;
    while (rest.length > limit) {
      let cut = rest.lastIndexOf(' ', limit);
      if (cut < Math.floor(limit / 2)) cut = limit;
      units.push({text:rest.slice(0,cut),newParagraph:first});
      rest = rest.slice(cut).trimStart();
      first = false;
    }
    if (rest) units.push({text:rest,newParagraph:first});
  }
  const chunks: string[] = [];
  let part = '';
  for (const unit of units) {
    const separator = part && unit.newParagraph ? '\n\n' : '';
    if (part && part.length + separator.length + unit.text.length > limit) {
      chunks.push(part); part = '';
    }
    part += (part && unit.newParagraph ? '\n\n' : '') + unit.text;
  }
  if (part) chunks.push(part);
  return chunks;
}
async function hashVisitor(value: string, salt: string) {
  const bytes = new TextEncoder().encode(`${salt}:${value}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2,'0')).join('');
}
Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (request.method !== 'POST') return respond(405, { error: 'Method not allowed' });
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serverKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const salt = Deno.env.get('READER_RATE_SALT');
  if (!supabaseUrl || !serverKey || !salt) return respond(503, { error: 'Secure Reader belum siap di server.' });
  // Only the requestor-selected chunk is returned; never return entire episodes.
  let input: {bookId?: unknown; episodeNumber?: unknown; part?: unknown};
  try {
    if (Number(request.headers.get('content-length') || 0) > MAX_BODY) return respond(413, { error: 'Request terlalu besar.' });
    const body = await request.text();
    if (body.length > MAX_BODY) return respond(413, { error: 'Request terlalu besar.' });
    input = JSON.parse(body);
  } catch { return respond(400, { error: 'Format permintaan tidak benar.' }); }
  const bookId = input.bookId;
  const episodeNumber = input.episodeNumber;
  const part = input.part;
  if (typeof bookId !== 'string' || !/^[a-z0-9][a-z0-9_-]{0,95}$/i.test(bookId) ||
    !Number.isInteger(episodeNumber) || Number(episodeNumber) < 1 || Number(episodeNumber) > 100000 ||
    !Number.isInteger(part) || Number(part) < 0 || Number(part) > 100000) {
    return respond(400, { error: 'Parameter bacaan tidak valid.' });
  }
  const client = createClient(supabaseUrl, serverKey, { auth: { persistSession:false, autoRefreshToken:false } });
  try {
    // This is a best-effort application-level limiter, not a replacement for CDN/WAF.
    const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-real-ip') ||
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const visitor = await hashVisitor(`${ip}:${request.headers.get('user-agent') || ''}`, salt);
    const {data:allow,error:limitError} = await client.rpc('qr_consume_read_budget', {p_visitor:visitor});
    if (limitError) return respond(503, { error:'Pemeriksaan batas akses gagal.' });
    if (!allow) return respond(429, { error:'Terlalu banyak permintaan. Coba lagi sebentar.' });

    // Check both the book and the episode. Service-role access bypasses RLS,
    // so checks MUST be explicit and time-based on the server.
    const {data:book,error:bookError} = await client.from('qr_books')
      .select('id').eq('id',bookId).eq('is_published',true).maybeSingle();
    if (bookError || !book) return respond(404, { error:'Cerita tidak tersedia.' });
    const {data:episode,error:epError} = await client.from('qr_episodes')
      .select('episode_number,title,arc_title,content_md,release_at,is_enabled')
      .eq('book_id',bookId).eq('episode_number',Number(episodeNumber)).eq('is_enabled',true)
      .lte('release_at',new Date().toISOString()).maybeSingle();
    if (epError || !episode || !episode.release_at || !episode.is_enabled || new Date(episode.release_at).getTime()>Date.now()) {
      return respond(404, { error:'Episode belum tersedia.' });
    }
    const chunks = chunkMarkdown(episode.content_md);
    if (Number(part) >= chunks.length) return respond(404, { error:'Bagian tidak ditemukan.' });
    return respond(200, {
      episodeNumber:episode.episode_number, title:episode.title, arc:episode.arc_title,
      part:Number(part), totalParts:chunks.length, content:chunks[Number(part)],
    });
  } catch {
    // No database details, credentials, or manuscript text in error responses.
    return respond(500, { error:'Gagal mengambil bagian bacaan.' });
  }
});
