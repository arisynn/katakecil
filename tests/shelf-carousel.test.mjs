import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {shelfMode,wrapIndex,shelfDots,createShelfCarousel} from '../dist/shelf-carousel.js';
function fixture(count){
 const w=new JSDOM('<div id="viewport"><span data-shelf-measure></span>'+Array.from({length:count},(_,i)=>`<article class="shelf-book" data-book-id="b${i}"><button>Book ${i}</button></article>`).join('')+'</div>',{pretendToBeVisual:true}).window;
 const viewport=w.document.querySelector('#viewport');Object.defineProperties(viewport,{clientWidth:{value:390},clientHeight:{value:400}});viewport.firstChild.getBoundingClientRect=()=>({width:220,height:330});
 let changes=0,opens=0;const carousel=createShelfCarousel({viewport,onChange:()=>changes++,onOpen:()=>opens++});
 const pointer=(name,x,y=40,extra={})=>{const e=new w.Event(name,{bubbles:true,cancelable:true});Object.assign(e,{pointerId:1,pointerType:'touch',isPrimary:true,clientX:x,clientY:y,...extra});viewport.dispatchEvent(e);};
 return{w,viewport,carousel,pointer,get changes(){return changes;},get opens(){return opens;},destroy(){carousel.destroy();w.close();}};
}
test('shelf mode and limited circular dots cover empty, small and large collections',()=>{
 assert.deepEqual([0,1,2,4,5,12].map(shelfMode),['single','single','covers','covers','rack','rack']);assert.equal(wrapIndex(-1,5),4);assert.equal(wrapIndex(5,5),0);assert.equal(wrapIndex(0,0),-1);assert.deepEqual(shelfDots(12,0),[10,11,0,1,2]);assert.deepEqual(shelfDots(4,2),[0,1,2,3]);
});
test('one canonical book element wraps in both directions without duplicating identities',()=>{
 for(const count of [0,1,2,4,5,12]){const f=fixture(count);try{f.carousel.prev();assert.equal(f.carousel.index,count?count-1:-1);f.carousel.next();assert.equal(f.carousel.index,count?0:-1);assert.equal(f.viewport.querySelectorAll('.shelf-book').length,count);if(count){const current=f.viewport.querySelector('[aria-current=true]');assert.equal(current.dataset.bookId,'b0');assert.equal(parseFloat(current.style.getPropertyValue('--shelf-x'))+parseFloat(current.style.getPropertyValue('--shelf-item-width'))/2,195);}}finally{f.destroy();}}
});
test('a tap selects an inactive book and a second tap opens the selected book',()=>{
 const f=fixture(5);try{f.viewport.querySelector('[data-book-id=b1] button').click();assert.equal(f.carousel.index,1);assert.equal(f.opens,0);f.viewport.querySelector('[data-book-id=b1] button').click();assert.equal(f.opens,1);}finally{f.destroy();}
});
test('cancelled dragging restores the original book and suppresses its trailing click',()=>{
 const f=fixture(5);try{f.pointer('pointerdown',200);f.pointer('pointermove',80);f.pointer('pointercancel',80);assert.equal(f.carousel.index,0);f.viewport.querySelector('[data-book-id=b0] button').click();assert.equal(f.opens,0);assert.equal(f.viewport.classList.contains('is-dragging'),false);}finally{f.destroy();}
});
test('touch capture transferring from a cover to the viewport preserves the swipe',()=>{
 const f=fixture(5);try{const button=f.viewport.querySelector('[data-book-id=b0] button');f.pointer('pointerdown',200);f.pointer('pointermove',180);const lost=new f.w.Event('lostpointercapture',{bubbles:true});Object.assign(lost,{pointerId:1});button.dispatchEvent(lost);assert.equal(f.viewport.classList.contains('is-dragging'),true);f.pointer('pointermove',100);f.pointer('pointerup',100);assert.notEqual(f.carousel.index,0);button.click();assert.equal(f.opens,0);}finally{f.destroy();}
});
test('losing the viewport capture still cancels a swipe',()=>{
 const f=fixture(5);try{f.pointer('pointerdown',200);f.pointer('pointermove',100);f.pointer('lostpointercapture',100);f.pointer('pointerup',100);assert.equal(f.carousel.index,0);assert.equal(f.viewport.classList.contains('is-dragging'),false);f.viewport.querySelector('[data-book-id=b0] button').click();assert.equal(f.opens,0);}finally{f.destroy();}
});
test('a touch cancelled before dragging does not open a book',()=>{
 const f=fixture(5);try{f.pointer('pointerdown',200);f.pointer('pointercancel',200);f.viewport.querySelector('[data-book-id=b0] button').click();assert.equal(f.opens,0);assert.equal(f.carousel.index,0);}finally{f.destroy();}
});
test('vertical movement and a second touch do not activate a book',()=>{
 const f=fixture(5);try{f.pointer('pointerdown',200);f.pointer('pointermove',202,100);f.pointer('pointerup',202,100);f.viewport.querySelector('[data-book-id=b0] button').click();assert.equal(f.opens,0);f.pointer('pointerdown',200);f.pointer('pointermove',120);f.pointer('pointerdown',100,40,{pointerId:2,isPrimary:false});f.pointer('pointerup',120);assert.equal(f.carousel.index,0);}finally{f.destroy();}
});
test('horizontal swipes advance a bounded number of books and clean up on destroy',()=>{
 for(const count of [4,5,12]){const f=fixture(count);try{f.pointer('pointerdown',200);f.pointer('pointermove',80);f.pointer('pointerup',80);assert.ok(f.carousel.index>=1&&f.carousel.index<=Math.min(3,Math.floor(count/2)),'a fling follows the swipe direction');const index=f.carousel.index;f.carousel.destroy();f.pointer('pointerdown',200);f.pointer('pointermove',80);f.pointer('pointerup',80);assert.equal(f.carousel.index,index);}finally{f.destroy();}}
});
test('a deliberate slow swipe changes covers while a small drag snaps back',()=>{
 const f=fixture(2);try{let now=0;f.w.performance.now=()=>now;f.pointer('pointerdown',200);now=500;f.pointer('pointermove',190);now=700;f.pointer('pointerup',190);assert.equal(f.carousel.index,0);f.pointer('pointerdown',200);now=1500;f.pointer('pointermove',110);now=1700;f.pointer('pointerup',110);assert.equal(f.carousel.index,1);}finally{f.destroy();}
});
