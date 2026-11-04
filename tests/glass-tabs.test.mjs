import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {installGlassTabs} from '../dist/glass-tabs.js';
test('one noninteractive lens tracks existing tabs through state, locale and resize changes',async()=>{
 const w=new JSDOM('<body><nav class="appearance-tabs"><button class="active" aria-selected="true">Text</button><button aria-selected="false">Layout</button><button aria-selected="false">Theme</button></nav></body>',{pretendToBeVisual:true}).window;
 const callbacks=[];w.requestAnimationFrame=fn=>{callbacks.push(fn);return callbacks.length;};w.cancelAnimationFrame=()=>{};let resize;w.ResizeObserver=class{constructor(callback){resize=callback;}observe(){}unobserve(){}disconnect(){}};
 const nav=w.document.querySelector('nav'),buttons=[...nav.children];let width=100;nav.getBoundingClientRect=()=>({left:10,top:20,width:width*3});for(const [i,button]of buttons.entries())button.getBoundingClientRect=()=>({left:10+i*width,top:24,width,height:36});const flush=async()=>{await Promise.resolve();for(let i=0;i<5&&callbacks.length;i++){const batch=callbacks.splice(0);for(const fn of batch)fn();await Promise.resolve();}};
 const controller=installGlassTabs(w.document);await flush();const lens=nav.querySelector('.glass-tab-lens');assert.equal(nav.querySelectorAll('button').length,3);assert.equal(lens.getAttribute('aria-hidden'),'true');assert.equal(nav.style.getPropertyValue('--lens-w'),'100px');assert.equal(nav.style.getPropertyValue('--lens-x'),'0px');
 buttons[0].classList.remove('active');buttons[0].setAttribute('aria-selected','false');buttons[2].classList.add('active');buttons[2].setAttribute('aria-selected','true');await flush();assert.equal(nav.querySelector('.glass-tab-lens'),lens);assert.equal(nav.style.getPropertyValue('--lens-x'),'200px');
 buttons[0].textContent='Teks';w.document.documentElement.lang='id';width=80;resize();await flush();assert.equal(nav.style.getPropertyValue('--lens-w'),'80px');assert.equal(nav.querySelectorAll('.glass-tab-lens').length,1);
 nav.remove();await flush();controller.destroy();assert.equal(nav.querySelector('.glass-tab-lens'),null);w.close();
});

function dragScene(){
 const w=new JSDOM('<body><nav class="appearance-tabs"><button class="active" aria-selected="true">Text</button><button aria-selected="false">Layout</button><button aria-selected="false">Theme</button></nav></body>',{pretendToBeVisual:true}).window;
 const frames=[];w.requestAnimationFrame=fn=>{frames.push(fn);return frames.length;};w.cancelAnimationFrame=()=>{};
 const nav=w.document.querySelector('nav'),buttons=[...nav.children],actions=[],captured=new Set();
 nav.getBoundingClientRect=()=>({left:10,top:20,width:300,height:44});nav.setPointerCapture=id=>captured.add(id);nav.hasPointerCapture=id=>captured.has(id);nav.releasePointerCapture=id=>captured.delete(id);
 buttons.forEach((button,i)=>button.getBoundingClientRect=()=>({left:10+i*100,right:110+i*100,top:24,bottom:60,width:100,height:36}));
 nav.addEventListener('click',event=>{const button=event.target.closest('button');if(!button)return;actions.push(button.textContent);for(const b of buttons){b.classList.toggle('active',b===button);b.setAttribute('aria-selected',String(b===button));}});
 const controller=installGlassTabs(w.document),flush=async()=>{await Promise.resolve();for(let i=0;i<8&&frames.length;i++){for(const fn of frames.splice(0))fn();await Promise.resolve();}};
 const pointer=(target,type,x,y=40,extra={})=>{const event=new w.MouseEvent(type,{bubbles:true,cancelable:true,button:0,clientX:x,clientY:y});for(const [key,value]of Object.entries({pointerId:1,isPrimary:true,...extra}))Object.defineProperty(event,key,{value});target.dispatchEvent(event);return event;};
 return{w,nav,buttons,actions,controller,flush,pointer,captured};
}
test('drag follows the pointer with bounded velocity stretch and selects once immediately on release',async()=>{
 const s=dragScene();await s.flush();assert.equal(s.w.document.querySelectorAll('#kk-liquid-refraction-svg').length,1);assert.ok(s.w.document.querySelector('#kk-lens-refract feDisplacementMap'));
 s.pointer(s.buttons[0],'pointerdown',60,40,{timeStamp:10});const move=s.pointer(s.w.document,'pointermove',255,40,{timeStamp:30});assert.equal(move.defaultPrevented,true);assert.equal(s.nav.dataset.lensDragging,'true');assert.equal(s.actions.length,0,'content changes only on release');assert.ok(parseFloat(s.nav.style.getPropertyValue('--lens-x'))>150);const stretch=Number(s.nav.style.getPropertyValue('--lens-stretch-x'));assert.ok(stretch>=1.04&&stretch<=1.16);assert.ok(s.captured.has(1));
 s.pointer(s.w.document,'pointerup',260);assert.deepEqual(s.actions,['Theme'],'release commits without waiting for animation or a timer');assert.equal(s.nav.dataset.lensDragging,undefined);assert.equal(s.nav.style.getPropertyValue('--lens-stretch-x'),'');assert.equal(s.captured.size,0);await s.flush();assert.equal(s.nav.style.getPropertyValue('--lens-x'),'200px');
 const nativeClick=new s.w.MouseEvent('click',{bubbles:true,cancelable:true,detail:1});s.nav.dispatchEvent(nativeClick);assert.equal(nativeClick.defaultPrevented,true);assert.equal(s.actions.length,1,'native click following the drag cannot duplicate the selection');
 s.pointer(s.buttons[1],'pointerdown',160);s.pointer(s.buttons[1],'pointerup',160);s.buttons[1].dispatchEvent(new s.w.MouseEvent('click',{bubbles:true,detail:1}));assert.deepEqual(s.actions,['Theme','Layout'],'the next ordinary tap is not swallowed');await s.flush();assert.equal(s.w.document.querySelectorAll('#kk-liquid-refraction-svg').length,1);s.controller.destroy();assert.equal(s.w.document.querySelector('#kk-liquid-refraction-svg'),null);s.w.close();
});
test('vertical movement, cancellation, a second finger and Escape never select an unintended tab',async()=>{
 const s=dragScene();await s.flush();s.pointer(s.buttons[0],'pointerdown',60);s.pointer(s.w.document,'pointermove',65,90);assert.equal(s.nav.dataset.lensDragging,undefined);s.pointer(s.w.document,'pointerup',65,90);assert.equal(s.actions.length,0);
 s.pointer(s.buttons[0],'pointerdown',60);s.pointer(s.w.document,'pointermove',250);s.pointer(s.w.document,'pointercancel',250);await s.flush();assert.equal(s.nav.style.getPropertyValue('--lens-x'),'0px');assert.equal(s.actions.length,0);
 s.pointer(s.buttons[0],'pointerdown',60);s.pointer(s.w.document,'pointermove',250);s.pointer(s.buttons[1],'pointerdown',160,40,{pointerId:2,isPrimary:false});s.pointer(s.w.document,'pointerup',250);assert.equal(s.actions.length,0);assert.equal(s.nav.dataset.lensDragging,undefined);
 s.pointer(s.buttons[0],'pointerdown',60);s.pointer(s.w.document,'pointermove',250);const escape=new s.w.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true});s.buttons[0].dispatchEvent(escape);assert.equal(escape.defaultPrevented,true);s.pointer(s.w.document,'pointerup',250);assert.equal(s.actions.length,0);s.buttons[1].click();assert.deepEqual(s.actions,['Layout'],'keyboard/programmatic activation still works after cancellation');s.controller.destroy();s.w.close();
});
test('drag clamps at the track ends and never activates a disabled tab',async()=>{
 const s=dragScene();await s.flush();s.buttons[1].disabled=true;s.pointer(s.buttons[0],'pointerdown',60);s.pointer(s.w.document,'pointermove',160);s.pointer(s.w.document,'pointerup',160);assert.equal(s.actions.length,0,'a disabled middle tab is not a drop target');
 s.pointer(s.buttons[0],'pointerdown',60);s.pointer(s.w.document,'pointermove',900);assert.equal(s.nav.style.getPropertyValue('--lens-x'),'200px');s.pointer(s.w.document,'pointerup',900);assert.deepEqual(s.actions,['Theme']);await s.flush();
 s.pointer(s.buttons[2],'pointerdown',260);s.pointer(s.w.document,'pointermove',-900);assert.equal(s.nav.style.getPropertyValue('--lens-x'),'0px');s.pointer(s.w.document,'pointerup',-900);assert.deepEqual(s.actions,['Theme','Text']);s.controller.destroy();s.w.close();
});
