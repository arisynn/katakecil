import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {installPageScrubber} from '../dist/page-scrubber.js';
function scene(){
 const dom=new JSDOM('<input id="page-scrubber" type="range" min="0" max="20" value="3">',{pretendToBeVisual:true}),w=dom.window,el=w.document.querySelector('input');
 let index=3,stops=0,saves=0,active=false;const renders=[],frames=new Map();let seq=0;
 w.requestAnimationFrame=fn=>{frames.set(++seq,fn);return seq;};w.cancelAnimationFrame=id=>frames.delete(id);
 const api=installPageScrubber(w.document,{enabled:()=>true,snapshot:()=>({index,offset:77}),begin:()=>stops++,preview:(i,origin)=>{index=i;el.value=i;renders.push({i,origin});},save:()=>saves++,active:value=>active=value});
 const event=name=>el.dispatchEvent(new w.Event(name,{bubbles:true,cancelable:true}));
 return{w,el,event,api,renders,flush(){for(const [id,fn] of frames){frames.delete(id);fn();}},get state(){return{index,stops,saves,active};}};
}
test('scrubbing paints the latest page per frame, retains the input and saves exactly once on release',()=>{
 const s=scene();s.event('pointerdown');s.el.value=8;s.event('input');s.el.value=12;s.event('input');assert.equal(s.renders.length,0);s.flush();assert.equal(s.state.index,12);assert.equal(s.state.saves,0);assert.equal(s.state.stops,1);assert.equal(s.w.document.querySelector('input'),s.el);
 s.el.value=17;s.event('input');s.event('pointerup');s.event('change');assert.deepEqual(s.state,{index:17,stops:1,saves:1,active:false});s.flush();assert.equal(s.state.index,17);s.api.destroy();s.w.close();
});
test('pointer cancellation and Escape restore the original page and anchor without persisting',()=>{
 const s=scene();for(const cancel of ['pointercancel','Escape']){s.event('pointerdown');s.el.value=10;s.event('input');s.flush();if(cancel==='Escape')s.el.dispatchEvent(new s.w.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));else s.event(cancel);assert.equal(s.state.index,3);assert.equal(s.renders.at(-1).origin.offset,77);assert.equal(s.state.saves,0);assert.equal(s.state.active,false);}s.api.destroy();s.w.close();
});
test('native change before pointerup commits once; keyboard-only changes commit their current page',()=>{
 const s=scene();s.event('pointerdown');s.el.value=9;s.event('input');s.event('change');s.event('pointerup');assert.equal(s.state.saves,1);s.el.value=10;s.event('input');s.event('change');assert.equal(s.state.index,10);assert.equal(s.state.saves,2);s.api.destroy();s.w.close();
});
