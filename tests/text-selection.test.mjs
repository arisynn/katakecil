import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createTextSelection,textRange,wordBounds} from '../dist/text-selection.js';
const pause=ms=>new Promise(r=>setTimeout(r,ms));
function setup(){
 const w=new JSDOM('<div class="page-text">Alpha <mark>beta</mark> gamma.</div>',{pretendToBeVisual:true}).window,doc=w.document,root=doc.querySelector('.page-text');
 w.Range.prototype.getBoundingClientRect=()=>({left:10,top:20,right:90,bottom:40,width:80,height:20});
 doc.caretRangeFromPoint=x=>textRange(root,Math.max(0,Math.min(root.textContent.length,x)),Math.max(0,Math.min(root.textContent.length,x)));
 const updates=[];const control=createTextSelection({document:doc,getRoot:()=>root,onChange:s=>updates.push(s),delay:15});
 const pointer=(name,x,type='mouse',target=root)=>{const e=new w.MouseEvent(name,{bubbles:true,cancelable:true,clientX:x,clientY:25,button:0});Object.defineProperties(e,{pointerId:{value:1},pointerType:{value:type}});target.dispatchEvent(e);return e;};
 return{w,doc,root,updates,control,pointer};
}
test('custom drag highlights text across marks without creating a native Selection',()=>{
 const {w,doc,root,updates,control,pointer}=setup();
 pointer('pointerdown',2);pointer('pointermove',14);pointer('pointerup',14);
 assert.equal(updates.at(-1).text,root.textContent.slice(2,14));assert.equal(w.getSelection().rangeCount,0);assert.equal(doc.querySelectorAll('.selection-handle').length,2);
 const end=doc.querySelector('[data-endpoint="end"]');end.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true,cancelable:true}));assert.equal(updates.at(-1).end,15);assert.equal(doc.querySelector('[data-endpoint="end"]'),end,'drag handles remain mounted while updating');
 const native=new w.Event('selectstart',{bubbles:true,cancelable:true});root.dispatchEvent(native);assert.ok(native.defaultPrevented);
 const context=new w.MouseEvent('contextmenu',{bubbles:true,cancelable:true});root.dispatchEvent(context);assert.ok(context.defaultPrevented);
 control.clear();assert.equal(doc.querySelector('.custom-selection-layer'),null);
});
test('touch long-press selects a word; a swipe or second finger cancels pending selection',async()=>{
 const {w,doc,updates,control,pointer}=setup();
 pointer('pointerdown',7,'touch');await pause(25);pointer('pointerup',7,'touch');assert.equal(updates.at(-1).text,'beta');assert.equal(w.getSelection().rangeCount,0);control.clear();
 const count=updates.length;pointer('pointerdown',1,'touch');pointer('pointermove',30,'touch');await pause(25);assert.equal(updates.length,count);
 pointer('pointerdown',1,'touch');const pinch=new w.Event('touchstart',{bubbles:true});Object.defineProperty(pinch,'touches',{value:[{},{}]});doc.dispatchEvent(pinch);await pause(25);assert.equal(updates.length,count);control.clear();
});
test('word boundaries and DOM text offsets preserve punctuation and UTF-16 anchor positions',()=>{
 assert.deepEqual(wordBounds('Kalimat baik.',10),{start:8,end:12});const {root}=setup();assert.equal(textRange(root,4,12).toString(),root.textContent.slice(4,12));
});
