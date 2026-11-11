// Adapted from the user's rak-logic.js: ring positions keep the active cover centered.
// One canonical element per book; recycled edge items never travel across the cover.
import {createCoverTints} from './cover-colors.js?v=2';
export const shelfMode=count=>count<2?'single':count<5?'covers':'rack';
export const wrapIndex=(index,count)=>count>0?((Math.trunc(index)%count)+count)%count:-1;
export function shelfDots(count,index,limit=5){
 if(count<=limit)return Array.from({length:count},(_,i)=>i);
 return Array.from({length:limit},(_,i)=>wrapIndex(index+i-Math.floor(limit/2),count));
}
export function createShelfCarousel({viewport,items=[...viewport.querySelectorAll('.shelf-book')],start=0,onChange=()=>{},onOpen=()=>{}}){
 const win=viewport.ownerDocument.defaultView,n=items.length,mode=shelfMode(n),media=win.matchMedia?.('(prefers-reduced-motion: reduce)');
 const tints=createCoverTints(viewport);
 let index=n?wrapIndex(start,n):-1,direction=-1,drag=null,blocked=false,lastDrag=-Infinity,frame=0,dragFrame=0,destroyed=false,metrics={cover:0,height:0,step:96,gap:96},positions=new Map();
 const reduced=()=>!!media?.matches;
 const relative=k=>{let r=wrapIndex(k-index,n);if(r>n/2||(n%2===0&&r===n/2&&direction>0))r-=n;return r;};
 function offsetFor(f,step){
  const abs=Math.abs(f),sign=Math.sign(f);
  return abs<=1?f*step:sign*step*(1+(abs-1)*.62);
 }
 function measure(){
  const probe=viewport.querySelector('[data-shelf-measure]'),width=viewport.clientWidth,height=viewport.clientHeight;
  const desired=probe?.getBoundingClientRect().width||Math.min(width*.64,285),maximum=probe?.getBoundingClientRect().height||height-24;
  const h=Math.max(1,Math.min(maximum,height-24,desired*1.5)),cover=Math.max(1,Math.min(desired,h/1.5));
  const step=Math.max(52,Math.round(Math.min(cover*.6,Math.max(cover*.45,(width-cover*.82)*.46))));
  metrics={cover,height:h,step,gap:step};
  viewport.style.setProperty('--shelf-open-width',cover+'px');
 }
 function place(extra=0,animate=true){
  if(destroyed||!n)return;
  const center=viewport.clientWidth/2,{cover,height,step}=metrics,slots=n>=5?2:n>=3?2:1,shift=step?extra/step:0;
  tints.request(items[index]);
  const activeRgb=items[index]?.style.getPropertyValue('--cover-rgb')?.trim();
  if(activeRgb)viewport.closest?.('.library-shell')?.style.setProperty('--active-cover-rgb',activeRgb);
  for(const [k,item] of items.entries()){
   const r=relative(k),active=k===index,f=r+shift,d=Math.abs(f),old=positions.get(item),recycled=old!==undefined&&Math.abs(old-r)>Math.max(1,n/2),hidden=Math.abs(r)>slots;
   const x=center-cover/2+offsetFor(f,step);
   const scale=d<=1?1-d*.16:d<=2?.84-(d-1)*.12:Math.max(.64,.72-(d-2)*.08);
   const y=Math.min(16,d*7);
   const opacity=hidden?0:d<=1?1-d*.28:d<=2?.72-(d-1)*.34:Math.max(0,.38-(d-2)*.3);
   const z=active&&d<.5?6:Math.max(1,5-Math.round(d));
   item.classList.toggle('is-current',active);item.classList.toggle('is-neighbor',!active&&Math.abs(r)===1);item.classList.toggle('is-far',!active&&Math.abs(r)>=2);item.classList.toggle('is-recycling',!animate||reduced()||recycled);item.classList.toggle('is-wrapping',animate&&!reduced()&&recycled);item.hidden=hidden;item.setAttribute('aria-current',String(active));
   item.style.setProperty('--shelf-x',x+'px');item.style.setProperty('--shelf-y',y.toFixed(2)+'px');item.style.setProperty('--shelf-scale',scale.toFixed(4));item.style.setProperty('--shelf-opacity',opacity.toFixed(3));item.style.setProperty('--shelf-item-width',cover+'px');item.style.setProperty('--shelf-item-height',height+'px');item.style.zIndex=String(z);if(!hidden)tints.request(item);
   const button=item.querySelector('button');if(button)button.tabIndex=active?0:-1;
   positions.set(item,r);
  }
  if(frame)win.cancelAnimationFrame(frame);
  frame=win.requestAnimationFrame(()=>{frame=0;if(destroyed||drag?.moving)return;void viewport.offsetWidth;for(const item of items)item.classList.remove('is-recycling','is-wrapping');});
 }
 function goTo(value,animate=true){
  if(!n||!Number.isFinite(value)||destroyed)return;
  const next=wrapIndex(value,n),previous=index;if(next===previous){place(0,animate);return;}
  let delta=next-index;if(Math.abs(delta)>n/2)delta-=Math.sign(delta)*n;direction=(Math.abs(delta)===n/2?Math.sign(value-index):Math.sign(delta))||direction;
  // With two covers the other item can be placed on either side before its entrance.
  if(n===2&&animate&&!reduced()){
   const target=items[next],side=value>index?1:-1;
   target.classList.add('is-recycling');target.style.setProperty('--shelf-x',(viewport.clientWidth/2-metrics.cover/2+side*metrics.step)+'px');void target.offsetWidth;target.classList.remove('is-recycling');
  }
  index=next;place(0,animate);onChange(index,previous);
 }
 function down(event){
  if(n<2||(event.pointerType==='mouse'&&event.button!==0))return;if(event.isPrimary===false){cancel();blocked=true;return;}
  if(drag){cancel();blocked=true;return;}blocked=false;
  drag={id:event.pointerId,x:event.clientX,y:event.clientY,lastX:event.clientX,time:win.performance.now(),dx:0,velocity:0,moving:false};
 }
 function move(event){
  if(!drag||event.pointerId!==drag.id)return;
  const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
  if(!drag.moving){if(Math.max(Math.abs(dx),Math.abs(dy))<7)return;if(Math.abs(dy)>Math.abs(dx)){drag=null;blocked=true;return;}drag.moving=true;viewport.classList.add('is-dragging');try{viewport.setPointerCapture(event.pointerId);}catch{}}
  const now=win.performance.now(),dt=now-drag.time;if(dt>0)drag.velocity=.5*drag.velocity+.5*(event.clientX-drag.lastX)/dt;drag.lastX=event.clientX;drag.time=now;drag.dx=dx;
  // Coalesce high-frequency touch updates; one layout write per display frame.
  if(!dragFrame)dragFrame=win.requestAnimationFrame(()=>{dragFrame=0;if(!destroyed&&drag?.moving)place(Math.max(-viewport.clientWidth,Math.min(viewport.clientWidth,drag.dx)),false);});
 }
 function release(event,cancelled=false){
  if(!drag||(event&&event.pointerId!==drag.id))return;
  const state=drag;drag=null;if(dragFrame){win.cancelAnimationFrame(dragFrame);dragFrame=0;}viewport.classList.remove('is-dragging');try{viewport.releasePointerCapture(state.id);}catch{}
  if(cancelled||state.moving)lastDrag=win.performance.now();if(!state.moving)return;
  if(cancelled){place();return;}
  const velocity=lastDrag-state.time>90?0:state.velocity,unit=metrics.step||96;
  const threshold=Math.max(24,Math.min(60,unit*.2));
  const wanted=Math.round(-(state.dx+velocity*120)/unit)||(Math.abs(state.dx)>=threshold?-Math.sign(state.dx):0);
  // Never wrap so far in one fling that the shortest visible route reverses.
  const limit=Math.min(3,Math.floor(n/2)),steps=Math.max(-limit,Math.min(limit,wanted));
  goTo(index+steps);
 }
 function cancel(event){if(blocked){blocked=false;lastDrag=win.performance.now();}release(event,true);}
 // Touch starts with implicit capture on the cover button. Its bubbling loss is
 // expected when a horizontal drag transfers capture to the viewport.
 function lostCapture(event){if(event.target===viewport)cancel(event);}
 function up(event){if(blocked){blocked=false;lastDrag=win.performance.now();return;}release(event);}
 function click(event){
  const item=event.target.closest?.('.shelf-book');if(!item||!viewport.contains(item))return;
  event.preventDefault();event.stopPropagation();
  if(blocked||win.performance.now()-lastDrag<350||drag?.moving)return;
  const k=items.indexOf(item);if(k<0)return;if(k!==index)goTo(k);else onOpen(index);
 }
 const resize=()=>{cancel();measure();place(0,false);};
 viewport.dataset.carouselMode=mode;
 viewport.addEventListener('pointerdown',down);viewport.addEventListener('pointermove',move);viewport.addEventListener('pointerup',up);viewport.addEventListener('pointercancel',cancel);viewport.addEventListener('lostpointercapture',lostCapture);viewport.addEventListener('click',click);
 const observer=typeof win.ResizeObserver==='function'?new win.ResizeObserver(resize):null;if(observer)observer.observe(viewport);else win.addEventListener('resize',resize);
 media?.addEventListener?.('change',resize);measure();place(0,false);
 return{goTo,next:()=>goTo(index+1),prev:()=>goTo(index-1),refresh:resize,get index(){return index;},destroy(){destroyed=true;tints.destroy();if(frame)win.cancelAnimationFrame(frame);if(dragFrame)win.cancelAnimationFrame(dragFrame);observer?.disconnect();win.removeEventListener('resize',resize);media?.removeEventListener?.('change',resize);for(const [name,handler] of [['pointerdown',down],['pointermove',move],['pointerup',up],['pointercancel',cancel],['lostpointercapture',lostCapture],['click',click]])viewport.removeEventListener(name,handler);drag=null;viewport.classList.remove('is-dragging');}};
}
