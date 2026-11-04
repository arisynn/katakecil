import {test} from 'node:test';
import assert from 'node:assert/strict';
import {relocateAnchor} from '../dist/anchors.js';
test('saved text anchors follow their source chapter after title and imprint pages disappear',()=>{
 const old=[{href:'title.xhtml',text:'Novel title'},{href:'imprint.xhtml',text:'Edition info'},{href:'chapter1.xhtml',text:'Bab 1\n\nA sentence to keep. More words.'}];
 const fresh=[{href:'chapter1.xhtml',text:'A sentence to keep. More words.'}];
 assert.deepEqual(relocateAnchor(old,fresh,2,7,'A sentence to keep.'),{chapterIndex:0,charOffset:0});
 assert.deepEqual(relocateAnchor(old,fresh,1,0),{chapterIndex:0,charOffset:0});
 assert.equal(relocateAnchor(old,fresh,2,7,'This quote no longer exists.'),null);
});
test('ambiguous repeated highlights are retained for review rather than attached to the wrong passage',()=>{
 const old=[{href:'a',text:'same words'}];const fresh=[{href:'a',text:'same words same words'}];
 assert.equal(relocateAnchor(old,fresh,0,0,'same words'),null);
});
