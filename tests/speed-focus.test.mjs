import {test} from 'node:test';
import assert from 'node:assert/strict';
import {focusParts,speedWordDelay} from '../dist/advanced-reader.js';

test('focus uses letters rather than surrounding punctuation and preserves the original token',()=>{
 for(const word of ['I','“Perempuan,”','membaca','123,','e\u0301lan','👩‍👩‍👧‍👦','?!']){
  const parts=focusParts(word);assert.equal(parts.before+parts.pivot+parts.after,word);
  assert.equal([...new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(parts.pivot)].length,1);
 }
 assert.deepEqual(focusParts('“Perempuan,”'),{before:'“Pe',pivot:'r',after:'empuan,”'});
 assert.deepEqual(focusParts('e\u0301'),{before:'',pivot:'e\u0301',after:''});
});
test('focus does not select punctuation when a token contains letters',()=>{
 for(const word of ['(A)','“satu.”','--123--'])assert.match(focusParts(word).pivot,/[\p{L}\p{N}]/u);
 assert.deepEqual(focusParts(''),{before:'',pivot:'',after:''});
});
test('RSVP timing accounts for long words, punctuation and paragraphs while respecting the rate',()=>{
 assert.equal(speedWordDelay('word',' ',250),240);
 assert.ok(speedWordDelay('ketidakberkesinambungan',' ',250)>240);
 assert.ok(speedWordDelay('word.',' ',250)>speedWordDelay('word,',' ',250));
 assert.ok(speedWordDelay('word','\n\n',250)>speedWordDelay('word.',' ',250));
 assert.equal(speedWordDelay('word',' ',999),100);
 assert.equal(speedWordDelay('word',' ',NaN),240);
});
