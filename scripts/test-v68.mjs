/** V6.8: minimal homepage, scheduled-release safety and global sapphire palette. */
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import ts from 'typescript';
import { createHash } from 'node:crypto';
const read = path => readFileSync(path, 'utf8');
const home = read('src/pages/PublicLibrary.tsx');
const carousel = read('src/features/public/components/FeaturedHeroCarousel.tsx');
const rpc = read('supabase/migrations/20261013010000_public_next_chapter_schedule_v68.sql');
const css = read('src/design/v68-minimal-home.css');
const data = read('src/data/publicSchedule.ts');

// Static API contract: future manuscripts stay behind RLS, public RPC is metadata only.
assert.match(rpc, /security definer/);
assert.match(rpc, /set search_path = ''/);
assert.match(rpc, /returns table \(book_id text, episode_number integer, release_at timestamptz\)/);
assert.match(rpc, /b\.is_published = true/);
assert.match(rpc, /b\.deleted_at is null/);
assert.match(rpc, /e\.is_enabled = true/);
assert.match(rpc, /e\.deleted_at is null/);
assert.match(rpc, /e\.release_at > now\(\)/);
assert.match(rpc, /grant execute .* to anon, authenticated/);
assert.doesNotMatch(rpc, /select\s+e\.\*/i);
assert.doesNotMatch(rpc, /\bcontent_md\b\s*,/i);
assert.match(data, /supabase\.rpc\('qr_public_next_chapters'\)/);
assert.match(data, /timeZone: 'Asia\/Jakarta'/);
assert.match(data, /return \[\]/);

// Homepage is only carousel + compact continuation + two recent chapters.
assert.match(home, /v68-continue-card/);
assert.match(home, /v68-new-chapters/);
assert.doesNotMatch(home, /v68-genre-pills/);
assert.doesNotMatch(home, /Jelajahi Genre/);
assert.doesNotMatch(home, /<footer className="v6-footer"/);
assert.match(home, /selectRecentChapters\(books, episodes\)/);
assert.match(home, /continuation && episode !== null/);
assert.doesNotMatch(home, /<section className="v6-featured"/);
assert.doesNotMatch(home, /<section className="v6-newest"/);
assert.doesNotMatch(home, /<section className="v66-discover"/);
assert.match(home, /<FeaturedHeroCarousel stories=\{latestStories\} schedules=\{schedules\}/);
assert.match(home, /formatUpcomingChapter\(nextChapter\)/);
assert.match(carousel, /nextChapter &&/);
assert.match(carousel, /formatUpcomingChapter\(nextChapter\)/);
assert.match(css, /var\(--kk-surface\)/);
assert.match(css, /var\(--kk-amber\)/);
assert.doesNotMatch(css, /#[0-9a-fA-F]{6}/);
assert.ok(existsSync('src/SecureReaderApp.tsx'));

// Pure selector is tested with released, draft, future, old and unpublished records.
const moduleText = ts.transpileModule(read('src/features/public/recentChapters.ts'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { selectRecentChapters } = await import(`data:text/javascript;base64,${Buffer.from(moduleText).toString('base64')}`);
const now = Date.parse('2026-10-13T13:00:00Z');
const book = (id, published = true, deleted_at = null) => ({ id, slug:id, title:id, is_published:published, deleted_at });
const ep = (book_id, episode_number, days) => ({ book_id, episode_number, title:`Chapter ${episode_number}`, release_at: new Date(now + days*86400000).toISOString() });
const items = selectRecentChapters(
  [book('public'), book('private', false), book('trash', true, '2026-10-01')],
  [ep('public',1,-1), ep('public',2,-2), ep('public',3,2), ep('public',4,-35), ep('private',1,-1), ep('trash',1,-1)],
  now,
);
assert.deepEqual(items.map(item=>item.episode.episode_number), [1,2]);
assert.equal(selectRecentChapters([book('public')],[ep('public',1,-1)],now,30,0).length,0);
assert.deepEqual(selectRecentChapters([book('public')], [ep('public',1,-1), ep('public',2,-2), ep('public',3,-3)], now).map(item => item.episode.episode_number), [1,2], 'Homepage must show at most two chapters');

// Reader files match the reviewed V6.10 baseline; data access matches V6.7.
const hashes = {
  'src/SecureReaderApp.tsx': '6b23f072091dcf6042ed46d7e5f61103a09722eab6066d9bb2d640eeab3a688e',
  'src/ReaderApp.tsx': 'a45caed8e3b8f0e2b0859b7c54a0ac71d1fc995b0e3a3d94769600e1fb9076c2',
  'src/data/secureReader.ts': 'be24f095ddf3e0ede40e6884d6fb291ddb529c51bb11dadd4a74cc61d94051c3',
  'src/data/supabase.ts': '61f6c88dc1dd9599e11fa33898d531a1a43f647bdb2e780654eba753c3b0f0c3',
};
for (const [file, expected] of Object.entries(hashes)) {
  assert.equal(createHash('sha256').update(readFileSync(file)).digest('hex'), expected);
}
console.log('PASS V6.8.1: carousel, compact continuation, two chapters, no genre section, current Reader baseline validated.');
