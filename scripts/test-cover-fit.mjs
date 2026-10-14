import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {loadTs} from './test-utils/load-ts.mjs';
const {classifyCover, shelfNeedsFill, coverProblem, nearestRatioName} = loadTs(fileURLToPath(new URL('../src/utils/coverFit.ts', import.meta.url)));

const wallpaper = classifyCover(1080, 1920);
assert.equal(wallpaper.kind, 'wallpaper');
assert.equal(wallpaper.label, 'Wallpaper HP');
assert.equal(wallpaper.ratioName, '9:16');
assert.equal(shelfNeedsFill(wallpaper.ratio), true);

const threeFour = classifyCover(1200, 1600);
assert.equal(threeFour.label, 'Sampul 3:4');
assert.equal(shelfNeedsFill(threeFour.ratio), true);

const twoThree = classifyCover(1000, 1500);
assert.equal(twoThree.label, 'Sampul 2:3');
assert.equal(shelfNeedsFill(twoThree.ratio), false);

const poster = classifyCover(1008, 2741);
assert.equal(poster.kind, 'poster');
assert.equal(shelfNeedsFill(poster.ratio), true);

const square = classifyCover(1400, 1400);
assert.equal(square.kind, 'square');
const wide = classifyCover(1792, 1008);
assert.equal(wide.kind, 'wide');
assert.equal(wide.ratioName, '16:9');

assert.match(coverProblem(100, 200), /200 px/);
assert.match(coverProblem(400, 2000), /ekstrem/);
assert.equal(coverProblem(1200, 1600), null);
assert.equal(nearestRatioName(1080, 2340).startsWith('9:'), true);

console.log('PASS cover fit');
