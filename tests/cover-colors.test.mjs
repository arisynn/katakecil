import {test} from 'node:test';
import assert from 'node:assert/strict';
import {dominantCoverColor} from '../dist/cover-colors.js';
test('cover tint follows the dominant visible color, ignoring transparent pixels',()=>{
 assert.deepEqual(dominantCoverColor(new Uint8ClampedArray([202,30,42,255,204,28,40,255,20,50,200,255,0,0,0,0])),[203,29,41]);
 assert.equal(dominantCoverColor(new Uint8ClampedArray([255,0,0,0])),null);
});
