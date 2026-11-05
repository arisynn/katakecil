import { createClient } from '@supabase/supabase-js';
import { EDITION_VERSION } from './completed.ts';
import { parseEdition } from './edition.ts';
import { createDelivery, sha256 as digest, type Book, type Chapter } from './delivery.ts';

const named = (name: string) => {
  try {
    return JSON.parse(Deno.env.get(name) || '{}').default || '';
  } catch {
    return '';
  }
};
const url = Deno.env.get('SUPABASE_URL')!;
const publicKey=named('SUPABASE_PUBLISHABLE_KEYS')||Deno.env.get('SUPABASE_ANON_KEY')!;
const secret = named('SUPABASE_SECRET_KEYS') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const options = { auth: { persistSession: false, autoRefreshToken: false } };
// User Authorization is never used for publisher privileges here. All access is published-only.
const admin = createClient(url, secret, options);
// Public metadata uses RLS and database now(), even though HTML reads use the server role.
const reader = createClient(url,publicKey,options);
async function catalog(bookId?:string) {
  const query = reader
    .from('kk_books')
    .select('id,title,author,synopsis,cover_url,language,status,updated_at').eq('is_published',true)
    .order('title');
  const { data: books, error } = await (bookId?query.eq('id',bookId):query);
  if (error) throw error;
  const results = [];
  for (const book of books || []) {
    const [{ data: sections, error: e1 }, { data: schedule, error: e2 }] = await Promise.all([
      reader
        .from('kk_sections')
        .select('id,position,updated_at')
        .eq('book_id', book.id).eq('is_enabled',true).lte('release_at',new Date().toISOString())
        .order('position')
        .limit(600),
      reader
        .from('kk_release_schedule')
        .select('release_at')
        .eq('book_id', book.id).eq('is_enabled',true)
        .gt('release_at', new Date().toISOString())
        .order('release_at')
        .limit(1),
    ]);
    if (e1 || e2) throw e1 || e2;
    const revision = await digest(JSON.stringify([EDITION_VERSION, book, sections]));
    results.push({
      ...book,
      revision,
      section_ids: (sections || []).map((s) => s.id),
      next_release_at: schedule?.[0]?.release_at || null,
    });
  }
  return results;
}

// A small server-only LRU avoids reparsing an edition on every page turn. It never bypasses
// the fresh publication checks before/after delivery and is never exposed as an archive.
const editions=new Map<string,Chapter[]>();
async function edition(book:Book):Promise<Chapter[]>{
 const cached=editions.get(book.revision);if(cached){editions.delete(book.revision);editions.set(book.revision,cached);return cached;}
 const {data:sections,error}=await admin.from('kk_sections').select('id,title,content_html').eq('book_id',book.id).in('id',book.section_ids).eq('is_enabled',true).lte('release_at',new Date().toISOString()).order('position').limit(600);
 if(error||!sections||JSON.stringify(sections.map(s=>s.id))!==JSON.stringify(book.section_ids))throw Error('Publication changed');
 if(sections.reduce((n,s)=>n+s.content_html.length,0)>16000000)throw Error('Edition too large');
 const chapters=await parseEdition(book,sections);
 editions.set(book.revision,chapters);while(editions.size>2)editions.delete(editions.keys().next().value!);
 return chapters;
}
const handle=createDelivery({catalog,edition,
 // The ingress must overwrite X-Forwarded-For. Treat this as a best-effort network signal,
 // not an authenticated identity. Global and session quotas still apply when it changes.
 visitor:request=>digest(secret+':'+new Date().toISOString().slice(0,10)+':'+(request.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim()||'unknown')),
 budget:async input=>{const {data,error}=await admin.rpc('kk_reader_gate',{p_kind:input.kind,p_visitor:input.visitor,p_session:input.session,p_book:input.book,p_revision:input.revision,p_cost:input.cost,p_episode:input.episode,p_lease:input.lease});if(error||!data)throw Error('Budget unavailable');return data;}
});
Deno.serve(handle);
