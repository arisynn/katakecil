/** V6.6: publication-driven carousel, unique recommendations and protected routes. */
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import * as nodeModule from 'node:module';

const read = file => readFileSync(file, 'utf8');
const featurePath = 'src/features/public/featuredStories.ts';
const feature = read(featurePath);
const home = read('src/pages/PublicLibrary.tsx');
const carousel = read('src/features/public/components/FeaturedHeroCarousel.tsx');
const css = read('src/design/v66-featured-carousel.css');
const app = read('src/App.tsx');
const pkg = JSON.parse(read('package.json'));

// Execute pure selection logic without installing dependencies or contacting Supabase.
const js = typeof nodeModule.stripTypeScriptTypes === 'function'
  ? nodeModule.stripTypeScriptTypes(feature, { mode: 'strip' })
  : (await import('typescript')).transpileModule(feature, {
      compilerOptions: { module: 99, target: 9 },
    }).outputText;
const { selectRecentlyPublishedStories: select } = await import(
  `data:text/javascript;base64,${Buffer.from(js).toString('base64')}`
);

const today = Date.now();
const iso = delta => new Date(today + delta).toISOString();
const makeBook = (id, extra = {}) => ({
  id, title: id, slug: id, is_published: true, is_featured: false,
  deleted_at: null, ...extra,
});
const makeEpisode = (book_id, release_at) => ({ book_id, release_at });
const books = [
  makeBook('old'), makeBook('new'), makeBook('future'),
  makeBook('draft', { is_published: false }),
  makeBook('trashed', { deleted_at: iso(-10000) }),
  makeBook('no-chapters'),
];
const episodes = [
  makeEpisode('old', iso(-90000)),
  makeEpisode('new', iso(-30000)),
  makeEpisode('new', iso(-20000)),
  makeEpisode('future', iso(30000)),
  makeEpisode('draft', iso(-10000)),
  makeEpisode('trashed', iso(-10000)),
  makeEpisode('no-chapters', null),
];
const featured = select(books, episodes);
assert.deepEqual(featured.map(item => item.book.id), ['new', 'old']);
assert.equal(featured[0].chapterCount, 2);
assert.equal(select(books, episodes, 1).length, 1);
const manyBooks = Array.from({ length: 8 }, (_, index) => makeBook(`book-${index}`));
const manyEpisodes = manyBooks.map((book, index) => makeEpisode(book.id, iso(-10000 - index)));
assert.equal(select(manyBooks, manyEpisodes).length, 5, 'Hero is capped at five stories');
assert.equal(select([], episodes).length, 0);
assert.equal(select(books, [], 5).length, 0);
assert.ok(select(books, episodes).every(item => item.publishedAt <= Date.now()));

// The homepage must not invent hero slides, duplicate a featured book, or hijack Reader.
assert.match(home, /demo \? \[\] : selectRecentlyPublishedStories/);
assert.match(home, /selectRecentChapters\(books, episodes\)/);
assert.match(home, /<FeaturedHeroCarousel stories=\{latestStories\}/);
assert.match(home, /episode !== null/);
assert.match(home, /params\.get\('genre'\)/);
assert.match(home, /params\.get\('genre'\)/);
assert.match(carousel, /if \(!stories\.length\) return <DefaultHero/);
assert.match(carousel, /window\.matchMedia\('\(prefers-reduced-motion: reduce\)'\)/);
assert.match(carousel, /AUTO_ADVANCE_MS = 6000/);
assert.match(carousel, /SWIPE_THRESHOLD_PX = 45/);
assert.match(carousel, /trackStories = stories\.length > 1/);
assert.match(carousel, /onTransitionEnd=/);
assert.match(carousel, /document\.hidden/);
assert.match(carousel, /onTouchStart=\{onTouchStart\}/);
assert.match(carousel, /aria-label=\{`Mulai membaca \$\{book\.title\}`\}/);
assert.match(carousel, /<Cover book=\{story\.book\}/);
assert.match(read('src/components/Cover.tsx'), /book\.cover_url/);
assert.match(css, /touch-action: pan-y/);
assert.match(css, /translate|transition: transform/);
assert.match(css, /prefers-reduced-motion: reduce/);
assert.match(css, /safe-area-inset-bottom/);
assert.match(css, /\[data-kk-theme='light'\]/);
assert.match(app, /import '\.\/design\/v66-featured-carousel\.css'/);
assert.ok(existsSync('src/SecureReaderApp.tsx'));
assert.ok(['6.6.0','6.7.0','6.8.0','6.8.1', '6.9.0','6.10.0'].includes(pkg.version));
console.log('PASS V6.6: published-only sorting, fallback, responsive carousel, theme, accessibility and Reader isolation.');
