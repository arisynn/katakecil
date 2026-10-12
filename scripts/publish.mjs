import {readFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
const bookId='peta-jalan-pulang';
const url=process.env.SUPABASE_URL;
const secret=process.env.SUPABASE_SECRET_KEY;
const apply=process.argv.includes('--apply');
if (apply && (!url || !secret)) throw Error('Set SUPABASE_URL dan SUPABASE_SECRET_KEY secara lokal, jangan pakai VITE_ untuk secret.');
const dir=resolve('naskah-pribadi');
const rows=[];
for(let arc=2;arc<=4;arc++){
 const content=readFileSync(join(dir,`ARC_${String(arc).padStart(2,'0')}.md`),'utf8').replace(/\r\n?/g,'\n');
 const arcTitle=content.match(/^## (ARC[^\n]+)$/m)?.[1];
 if(!arcTitle)throw Error(`Missing arc heading ${arc}`);
 const headings=[...content.matchAll(/^### Episode (\d+)\s+[—–-]\s+([^\n]+)$/gm)];
 if(!headings.length)throw Error(`No episodes in Arc ${arc}`);
 for(let i=0;i<headings.length;i++){
  const h=headings[i],n=Number(h[1]), body=content.slice(h.index+h[0].length,i+1<headings.length?headings[i+1].index:content.length).trim();
  if(!body||body.length<100)throw Error(`Bad text for episode ${n}`);
  rows.push({book_id:bookId,episode_number:n,arc_title:arcTitle,title:`Episode ${n} — ${h[2].trim()}`,content_md:body});
 }
}
rows.sort((a,b)=>a.episode_number-b.episode_number);
if(rows.length!==27||rows.some((x,i)=>x.episode_number!==i+10))throw Error('Episode expected 10..36 exactly');
console.log(`Validated ${rows.length} complete episodes from Arc II–IV.`);
if(!apply){console.log('DRY RUN ONLY: run with --apply after checking the source.');process.exit(0)}
let publishEpisode;

try {
  const {createClient} = await import('@supabase/supabase-js');
  const db = createClient(url, secret, {auth: {autoRefreshToken: false, persistSession: false}});
  publishEpisode = async (row) => {
    const {data: existing, error: readError} = await db.from('qr_episodes').select('release_at,is_enabled').eq('book_id', bookId).eq('episode_number', row.episode_number).single();
    if (readError || !existing?.release_at) throw Error(`Missing existing publication schedule for ${row.episode_number}: ${readError?.message || 'missing date'}`);
    if (Date.parse(existing.release_at) <= Date.now()) throw Error(`Episode ${row.episode_number} date already passed; stopped to avoid immediate unexpected release.`);
    const {data, error} = await db.from('qr_episodes').update({...row, is_enabled: true, updated_at: new Date().toISOString()}).eq('book_id', bookId).eq('episode_number', row.episode_number).select('episode_number,release_at,content_md').single();
    if (error) throw Error(`Import stopped at episode ${row.episode_number}: ${error.message}`);
    return {existing, data};
  };
} catch {
  // Fallback to native fetch for zero-dependency execution (e.g. Android storage without node_modules)
  const baseUrl = url.replace(/\/$/, '');
  const headers = {
    apikey: secret,
    Authorization: `Bearer ${secret}`,
    Accept: 'application/vnd.pgrst.object+json'
  };
  publishEpisode = async (row) => {
    const readRes = await fetch(`${baseUrl}/rest/v1/qr_episodes?book_id=eq.${encodeURIComponent(bookId)}&episode_number=eq.${row.episode_number}&select=release_at,is_enabled`, {headers});
    if (!readRes.ok) throw Error(`Missing schedule for episode ${row.episode_number}: ${await readRes.text()}`);
    const existing = await readRes.json();
    if (!existing?.release_at) throw Error(`Missing release_at for episode ${row.episode_number}`);
    if (Date.parse(existing.release_at) <= Date.now()) throw Error(`Episode ${row.episode_number} date already passed; stopped to avoid immediate unexpected release.`);
    
    const patchRes = await fetch(`${baseUrl}/rest/v1/qr_episodes?book_id=eq.${encodeURIComponent(bookId)}&episode_number=eq.${row.episode_number}&select=episode_number,release_at,content_md`, {
      method: 'PATCH',
      headers: {...headers, 'Content-Type': 'application/json', Prefer: 'return=representation'},
      body: JSON.stringify({...row, is_enabled: true, updated_at: new Date().toISOString()})
    });
    if (!patchRes.ok) throw Error(`Import stopped at episode ${row.episode_number}: ${await patchRes.text()}`);
    const data = await patchRes.json();
    return {existing, data};
  };
}

for(const row of rows){
 const {existing, data} = await publishEpisode(row);
 const expected=createHash('sha256').update(row.content_md).digest('hex');
 const actual=createHash('sha256').update(data.content_md).digest('hex');
 if(actual!==expected)throw Error(`Hash mismatch episode ${row.episode_number}`);
 console.log(`Episode ${row.episode_number} saved and verified, original release ${existing.release_at}`);
}
console.log('All 27 episodes imported; scheduled publication policy remains active.');
