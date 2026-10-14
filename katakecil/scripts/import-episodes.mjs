/**
 * Private publisher. One .md PER ARC; each file may contain many episodes.
 * The browser bundle never loads these files. Default is DRY RUN.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, basename, join } from 'node:path';
import process from 'node:process';
import { parseStartWib, createReleaseSlots } from './schedule.mjs';

function die(message) { console.error(`Error: ${message}`); process.exit(1); }
function parseArgs(args) {
  const options = { bookId: 'peta-jalan-pulang', apply: false, confirmPastRelease: false };
  const allowed = { '--dir':'dir', '--file':'file', '--book-id':'bookId', '--start':'start' };
  for (let i = 0; i < args.length; ++i) {
    const arg = args[i];
    if (arg === '--apply') options.apply = true;
    else if (arg === '--confirm-past-release') options.confirmPastRelease = true;
    else if (allowed[arg]) options[allowed[arg]] = args[++i] ?? die(`Nilai untuk ${arg} tidak ada.`);
    else die(`Argumen tidak dikenal: ${arg}`);
  }
  if (!!options.file === !!options.dir) die('Pilih salah satu: --dir ../naskah-pribadi ATAU --file path/ARC_01.md');
  if (!/^[a-z0-9][a-z0-9-]*$/.test(options.bookId)) die('--book-id hanya boleh huruf kecil, angka, dan tanda hubung');
  if (options.start) {
    try { options.startMs = parseStartWib(options.start); }
    catch (error) { die(error.message); }
  }
  return options;
}

function sourceFiles(options) {
  if (options.file) return [resolve(options.file)];
  let names;
  try { names = readdirSync(resolve(options.dir), { withFileTypes: true })
      .filter(x=>x.isFile() && /\.md$/i.test(x.name))
      .map(x=>x.name)
      .sort(new Intl.Collator('id', { numeric:true, sensitivity:'base' }).compare); }
  catch (e) { die(`Gagal membaca folder: ${e.message}`); }
  if (!names.length) die('Folder belum memiliki berkas .md. Salin template ARC_01.md.example menjadi ARC_01.md, lalu isi naskahnya.');
  return names.map(n=>join(resolve(options.dir),n));
}

/** Accept ### Episode 1, ### Bab 1, and ## Episode 1; arc headings ## ARC I. */
function parseArcMarkdown(markdown, filename) {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  let arcTitle = basename(filename).replace(/\.md$/i,'').replace(/[_-]+/g,' ').trim();
  let current = null;
  const episodes = [];
  const finish = () => {
    if (!current) return;
    const content = current.body.join('\n').trim();
    if (!content) die(`Episode kosong pada ${basename(filename)}: ${current.rawTitle}`);
    if (/\[ISI EPISODE\s+\d+\s+DI SINI\]/i.test(content))
      die(`Masih ada teks template pada ${basename(filename)}: ${current.rawTitle}`);
    episodes.push({ localNumber: current.localNumber, title: current.rawTitle, arc_title: current.arcTitle, content_md: content });
    current = null;
  };
  for (const line of lines) {
    const arcHeading = line.match(/^#{1,2}\s+(ARC\b[^\n]*)\s*$/i);
    if (arcHeading) { finish(); arcTitle = arcHeading[1].trim(); continue; }
    const episodeHeading = line.match(/^#{2,3}\s+((?:Episode|Bab|Chapter)\s+(\d+)\b[^\n]*)\s*$/i);
    if (episodeHeading) {
      finish();
      current = { rawTitle: episodeHeading[1].trim(), localNumber: Number(episodeHeading[2]), arcTitle, body: [] };
      continue;
    }
    if (current) current.body.push(line);
  }
  finish();
  if (!episodes.length) die(`Tidak menemukan heading episode di ${basename(filename)}. Gunakan '### Episode 1 — Judul'.`);
  for (let i=1; i<episodes.length; i++) {
    if (episodes[i].localNumber !== episodes[i-1].localNumber+1)
      die(`Nomor episode dalam ${basename(filename)} harus urut tanpa ada yang terlewat.`);
  }
  return episodes;
}

function parseAll(files) {
  const episodes = [];
  for (const file of files) {
    let markdown;
    try { markdown = readFileSync(file,'utf8'); }
    catch (e) { die(`Gagal membaca ${file}: ${e.message}`); }
    const part = parseArcMarkdown(markdown, file);
    console.log(`  ${basename(file)} : ${part.length} episode`);
    for (const item of part) {
      const episode_number = episodes.length + 1;
      // Renumber display headings globally when an arc restarts from Episode 1.
      const title = item.title.replace(/^((?:Episode|Bab|Chapter)\s+)\d+(\b)/i, (_, label, suffix) => `${label}${episode_number}${suffix}`);
      episodes.push({ episode_number, arc_title: item.arc_title, title, content_md: item.content_md });
    }
  }
  return episodes;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const files = sourceFiles(options);
  console.log(`\nFolder/berkas: ${files.length} sumber`);
  const episodes = parseAll(files);
  const slots = options.startMs === undefined ? [] : createReleaseSlots(options.startMs, episodes.length);
  const rows = episodes.map((episode, index) => ({
    book_id: options.bookId,
    ...episode,
    release_at: slots[index] ?? null,
    is_enabled: options.startMs !== undefined,
    updated_at: new Date().toISOString(),
  }));
  console.log(`\nBuku: ${options.bookId} | TOTAL ${rows.length} episode`);
  console.log(options.startMs === undefined ? 'SEMUA TERSEMBUNYI: belum ada jadwal.' : 'TERJADWAL: Kamis dan Minggu, 19.00 WIB.');
  for (const row of rows) {
    const when = row.release_at ? new Intl.DateTimeFormat('id-ID', {timeZone:'Asia/Jakarta',dateStyle:'medium',timeStyle:'short'}).format(new Date(row.release_at)) + ' WIB' : 'belum dijadwalkan';
    console.log(`${String(row.episode_number).padStart(3,'0')} | ${when} | ${row.title}`);
  }
  const past = rows.filter(r=>r.release_at && Date.parse(r.release_at)<=Date.now()).length;
  if (past && !options.confirmPastRelease) die(`${past} episode akan terlihat SEKARANG. Jika disengaja gunakan --confirm-past-release.`);
  if (!options.apply) { console.log('\nDRY RUN: data belum diunggah. Pakai --apply saat sudah siap.'); return; }
  const url = process.env.SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) die('Butuh SUPABASE_URL + SUPABASE_SECRET_KEY di terminal privat. JANGAN pakai VITE_* untuk secret.');
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } });
  for (let i=0; i<rows.length; i+=20) {
    const batch = rows.slice(i,i+20);
    const { error } = await supabase.from('qr_episodes').upsert(batch,{onConflict:'book_id,episode_number'});
    if (error) die(`Gagal impor episode ${i+1}–${i+batch.length}: ${error.message}`);
  }
  console.log(`Berhasil impor ${rows.length} episode. Hanya yang memenuhi policy RLS dapat dibaca publik.`);
}
main().catch(e=>die(e instanceof Error ? e.message : String(e)));
