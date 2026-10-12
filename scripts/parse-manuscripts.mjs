/**
 * Parse one or more PRIVATE Markdown arc files into a global episode sequence.
 * This module has no Supabase dependency and never ships to the browser.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';

const ARC_HEADING = /^#{1,3}\s+(ARC\s+.+|BAGIAN\s+.+)\s*$/i;
const EPISODE_HEADING = /^#{2,4}\s+((?:Episode|Bab|Chapter)\s+0*(\d+))(?=$|[\s:—–.\-])\s*(.*?)\s*$/i;
const collator = new Intl.Collator('id', { numeric: true, sensitivity: 'base' });

function romanNumber(value) {
  if (!/^[IVXLCDM]+$/i.test(value)) return null;
  const table = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  let result = 0;
  const tokens = value.toUpperCase();
  for (let i = 0; i < tokens.length; i++) {
    const current = table[tokens[i]];
    const next = table[tokens[i + 1]] ?? 0;
    result += current < next ? -current : current;
  }
  return result;
}

function arcOrder(file) {
  const name = basename(file).replace(/\.md$/i, '');
  const match = name.match(/(?:^|[\s_.-])arc[\s_.-]*([0-9]+|[ivxlcdm]+)(?:$|[\s_.-])/i);
  if (!match) return null;
  if (/^\d+$/.test(match[1])) return Number(match[1]);
  return romanNumber(match[1]);
}

export function listArcFiles(directory) {
  const absolute = resolve(directory);
  if (!statSync(absolute).isDirectory()) throw new Error(`Bukan direktori: ${absolute}`);
  const names = readdirSync(absolute, { withFileTypes: true })
    .filter(e => e.isFile() && !e.name.startsWith('.') && /\.md$/i.test(e.name) && !/^readme\.md$/i.test(e.name))
    .map(e => e.name);
  if (!names.length) throw new Error(`Tidak ada file arc .md dalam folder ${absolute}`);
  names.sort((a, b) => {
    const aa = arcOrder(a), bb = arcOrder(b);
    if (aa !== null && bb !== null && aa !== bb) return aa - bb;
    if (aa !== null && bb === null) return -1;
    if (aa === null && bb !== null) return 1;
    return collator.compare(a, b);
  });
  const orders = names.map(arcOrder).filter(v => v !== null);
  if (new Set(orders).size !== orders.length) {
    throw new Error('Ada nomor arc duplikat di nama file. Gunakan arc-01.md, arc-02.md, dst.');
  }
  return names.map(name => join(absolute, name));
}

export function parseArcFile(markdown, sourceName) {
  const normalized = markdown.replace(/\r\n?/g, '\n').replace(/^\uFEFF/, '');
  const lines = normalized.split('\n');
  const matchedArc = basename(sourceName).match(/(?:^|[_.\s-])arc[_.\s-]*([ivxlcdm]+|\d+)/i);
  let arc = matchedArc ? `ARC ${matchedArc[1].toUpperCase()}` : basename(sourceName).replace(/\.md$/i, '');
  let current = null;
  let group = 0;
  const episodes = [];
  const finish = () => {
    if (!current) return;
    const content_md = current.body.join('\n').trim();
    if (!content_md) throw new Error(`${sourceName}: isi kosong pada ${current.originalTitle}`);
    episodes.push({
      localNumber: current.localNumber,
      originalTitle: current.originalTitle,
      titleTail: current.titleTail,
      prefix: current.prefix,
      arc_title: current.arc,
      content_md,
      group: current.group,
      file: sourceName,
    });
    current = null;
  };
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const arcMatch = line.trim().match(ARC_HEADING);
    if (arcMatch) {
      finish();
      arc = arcMatch[1].trim();
      group++;
      continue;
    }
    const episodeMatch = line.trim().match(EPISODE_HEADING);
    if (episodeMatch) {
      finish();
      const localNumber = Number(episodeMatch[2]);
      if (!Number.isSafeInteger(localNumber) || localNumber < 1) throw new Error(`${sourceName}:${index + 1}: nomor episode tidak valid.`);
      current = {
        localNumber,
        originalTitle: `${episodeMatch[1]}${episodeMatch[3] ? ` ${episodeMatch[3]}` : ''}`,
        titleTail: episodeMatch[3].trim(),
        prefix: episodeMatch[1].match(/^(Episode|Bab|Chapter)/i)[1],
        arc, group, body: [],
      };
      continue;
    }
    if (current) current.body.push(line);
  }
  finish();
  if (!episodes.length) {
    throw new Error(`${sourceName}: tidak ada heading episode. Gunakan '### Episode 1 — Judul' atau '### Bab 1 — Judul'.`);
  }
  return episodes;
}

export function combineArcFiles(sources) {
  if (!sources.length) throw new Error('Tidak ada sumber naskah.');
  const combined = [];
  let previousGroup = null;
  let previousLocalNumber = 0;
  let firstLocalNumber = 0;
  for (const {name, text} of sources) {
    const parsed = parseArcFile(text, name);
    for (const ep of parsed) {
      const groupKey = `${name}::${ep.group}`;
      if (groupKey !== previousGroup) {
        previousGroup = groupKey;
        previousLocalNumber = ep.localNumber - 1;
        firstLocalNumber = ep.localNumber;
        // A new arc may number episodes from 1, or continue global episode numbering.
        if (firstLocalNumber !== 1 && firstLocalNumber !== combined.length + 1) {
          throw new Error(`${name}: arc dimulai dari nomor ${firstLocalNumber}, seharusnya 1 atau ${combined.length + 1}. Periksa urutan nama file.`);
        }
      }
      if (ep.localNumber !== previousLocalNumber + 1) {
        throw new Error(`${name}: penomoran dalam satu arc tidak berurutan, setelah ${previousLocalNumber} ditemukan ${ep.localNumber}.`);
      }
      previousLocalNumber = ep.localNumber;
      const globalNumber = combined.length + 1;
      const suffix = ep.titleTail.replace(/^[\s:—–.\-]+/, '').trim();
      const title = `${ep.prefix} ${globalNumber}${suffix ? ` — ${suffix}` : ''}`;
      combined.push({
        episode_number: globalNumber,
        title,
        arc_title: ep.arc_title,
        content_md: ep.content_md,
        source_file: name,
        source_episode_number: ep.localNumber,
      });
    }
  }
  return combined;
}

export function readManuscripts({file, dir}) {
  if (file && dir) throw new Error('Gunakan salah satu dari --dir atau --file, bukan keduanya.');
  if (!file && !dir) throw new Error('Gunakan --dir ../naskah-pribadi atau --file path/arc-01.md.');
  const filenames = file ? [resolve(file)] : listArcFiles(dir);
  const sources = filenames.map(name => ({name: basename(name), text: readFileSync(name, 'utf8')}));
  return { files: filenames, episodes: combineArcFiles(sources) };
}
