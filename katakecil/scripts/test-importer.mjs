import { strict as assert } from 'node:assert';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createReleaseSlots, parseStartWib } from './schedule.mjs';

const root = mkdtempSync(join(tmpdir(), 'quiet-reader-tests-'));
const arcs = join(root,'arcs');
mkdirSync(arcs);
const a = Array.from({length:9}, (_,i)=>`### Episode ${i+1} — Contoh ${i+1}\n\nKalimat asli ${i+1}.`).join('\n\n');
const b = Array.from({length:2}, (_,i)=>`### Bab ${i+1} — Bab Baru ${i+1}\n\nNaskah kedua ${i+1}.`).join('\n\n');
writeFileSync(join(arcs,'ARC_01.md'),`# BUKU\n\n## ARC I — AWAL\n\n${a}\n`);
writeFileSync(join(arcs,'ARC_02.md'),`# BUKU\n\n## ARC II — LANJUTAN\n\n${b}\n`);
function run(args) {return spawnSync(process.execPath, ['scripts/import-episodes.mjs',...args], {encoding:'utf8'});}
try {
  const dry = run(['--dir',arcs]);
  assert.equal(dry.status,0,dry.stderr);
  assert.match(dry.stdout,/ARC_01\.md : 9 episode/);
  assert.match(dry.stdout,/ARC_02\.md : 2 episode/);
  assert.match(dry.stdout,/TOTAL 11 episode/);
  assert.match(dry.stdout,/010 \| belum dijadwalkan \| Bab 10 — Bab Baru 1/);
  assert.match(dry.stdout,/DRY RUN/);
  const scheduled = run(['--dir',arcs,'--start','2026-10-15']);
  assert.equal(scheduled.status,0,scheduled.stderr);
  assert.match(scheduled.stdout,/TERJADWAL: Kamis dan Minggu, 19\.00 WIB/);
  const isoSlots = createReleaseSlots(parseStartWib('2026-10-15T19:00:00+07:00'), 5);
  assert.deepEqual(isoSlots, [
    '2026-10-15T12:00:00.000Z',
    '2026-10-18T12:00:00.000Z',
    '2026-10-22T12:00:00.000Z',
    '2026-10-25T12:00:00.000Z',
    '2026-10-29T12:00:00.000Z',
  ]);
  assert.deepEqual(createReleaseSlots(parseStartWib('2026-10-18'), 3), [
    '2026-10-18T12:00:00.000Z', '2026-10-22T12:00:00.000Z', '2026-10-25T12:00:00.000Z',
  ]);
  for (const invalid of ['2026-10-12','2026-10-16','2026-02-30','2026-10-15T20:00:00+07:00']) {
    assert.throws(()=>parseStartWib(invalid), Error);
  }
  assert.match(scheduled.stdout,/11 episode/);
  const bad = run(['--file',join(arcs,'MISSING.md')]);
  assert.notEqual(bad.status,0);
  const empty = run(['--dir',root]);
  assert.notEqual(empty.status,0);
  console.log('PASS: 9+2 episode, penomoran lintas arc, jadwal Kamis dan Minggu pukul 19.00 WIB, gagal aman pada sumber tidak valid.');
} finally {
  rmSync(root,{recursive:true,force:true});
}
