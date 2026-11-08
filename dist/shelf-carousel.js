// Adapted from the user's rak-logic.js: ring positions keep the active cover centered.
// One canonical element per book; recycled edge items never travel across the cover.
export const shelfMode=count=>count<2?'single':count<5?'covers':'rack';
export const wrapIndex=(index,count)=>count>0?((Math.trunc(index)%count)+count)%count:-1;
export function shelfDots(count,index,limit=5){
 if(count<=limit)return Array.from({length:count},(_,i)=>i);
 return Array.from({length:limit},(_,i)=>wrapIndex(index+i-Math.floor(limit/2),count));
}
export function createShelfCarousel({viewport,items=[...viewport.querySelectorAll('.shelf-book')],start=0,onChange=()=>{},onOpen=()=>{}}){
 const win=viewport.ownerDocument.defaultView,n=items.length,mode=shelfMode(n),media=win.matchMedia?.('(prefers-reduced-motion: reduce)');
 let index=n?wrapIndex(start,n):-1,direction=-1,drag=null,blocked=false,lastDrag=-Infinity,frame=0,destroyed=false,metrics={cover:0,height:0,spine:34,gap:6},positions=new Map();
 const reduced=()=>!!media?.matches;
 const relative=k=>{let r=wrapIndex(k-index,n);if(r>n/2||(n%2===0&&r===n/2&&direction>0))r-=n;return r;};
 function measure(){
  const probe=viewport.querySelector('[data-shelf-measure]'),style=win.getComputedStyle(viewport),width=viewport.clientWidth,height=viewport.clientHeight;
  const desired=probe?.getBoundingClientRect().width||Math.min(width*.68,285),maximum=probe?.getBoundingClientRect().height||height-24;
  const h=Math.max(1,Math.min(maximum,height-24,desired*1.5)),cover=Math.max(1,Math.min(desired,h/1.5));
  metrics={cover,height:h,spine:parseFloat(style.getPropertyValue('--spine-width'))||34,gap:parseFloat(style.getPropertyValue(mode==='rack'?'--spine-gap':'--cover-gap'))||(mode==='rack'?6:36)};
  viewport.style.setProperty('--shelf-open-width',cover+'px');
 }
 function place(extra=0,animate=true){
  if(destroyed||!n)return;
  const center=viewport.clientWidth/2,{cover,height,spine,gap}=metrics,slots=mode==='rack'?3:2;
  for(const [k,item] of items.entries()){
   const r=relative(k),active=k===index,w=mode==='rack'&&!active?spine:cover,old=positions.get(item),recycled=old!==undefined&&Math.abs(old-r)>1,hidden=Math.abs(r)>slots;
   const x=mode==='rack'?(r===0?center-cover/2:r>0?center+cover/2+gap+(r-1)*(spine+gap):center-cover/2-gap-spine+(r+1)*(spine+gap)):center-cover/2+r*(cover+gap);
   item.classList.toggle('is-current',active);item.classList.toggle('is-recycling',!animate||reduced()||recycled);item.hidden=hidden;item.setAttribute('aria-current',String(active));
   item.style.setProperty('--shelf-x',x+extra+'px');item.style.setProperty('--shelf-item-width',w+'px');item.style.setProperty('--shelf-item-height',(mode==='rack'&&!active?height*(parseFloat(item.dataset.spineHeight)||.88):height)+'px');item.style.zIndex=active?'3':String(Math.max(0,2-Math.abs(r)));
   const button=item.querySelector('button');if(button)button.tabIndex=active?0:-1;
   positions.set(item,r);
  }
  if(frame)win.cancelAnimationFrame(frame);
  frame=win.requestAnimationFrame(()=>{frame=0;void viewport.offsetWidth;if(!destroyed&&!drag?.moving)for(const item of items)item.classList.remove('is-recycling');});
 }
 function goTo(value,animate=true){
  if(!n||!Number.isFinite(value)||destroyed)return;
  const next=wrapIndex(value,n),previous=index;if(next===previous){place(0,animate);return;}
  let delta=next-index;if(Math.abs(delta)>n/2)delta-=Math.sign(delta)*n;direction=(Math.abs(delta)===n/2?Math.sign(value-index):Math.sign(delta))||direction;
  // With two covers the other item can be placed on either side before its entrance.
  if(n===2&&animate&&!reduced()){
   const target=items[next],side=value>index?1:-1;
   target.classList.add('is-recycling');target.style.setProperty('--shelf-x',(viewport.clientWidth/2-metrics.cover/2+side*(metrics.cover+metrics.gap))+'px');void target.offsetWidth;target.classList.remove('is-recycling');
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
  place(Math.max(-viewport.clientWidth,Math.min(viewport.clientWidth,dx)),false);
 }
 function release(event,cancelled=false){
  if(!drag||(event&&event.pointerId!==drag.id))return;
  const state=drag;drag=null;viewport.classList.remove('is-dragging');try{viewport.releasePointerCapture(state.id);}catch{}
  if(cancelled||state.moving)lastDrag=win.performance.now();if(!state.moving)return;
  if(cancelled){place();return;}
  const velocity=lastDrag-state.time>90?0:state.velocity,unit=mode==='rack'?metrics.spine+metrics.gap:metrics.cover+metrics.gap;
  const threshold=Math.max(24,Math.min(60,unit*.2));
  const wanted=Math.round(-(state.dx+velocity*120)/unit)||(Math.abs(state.dx)>=threshold?-Math.sign(state.dx):0);
  const steps=Math.max(-Math.min(3,n-1),Math.min(Math.min(3,n-1),wanted));
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
 return{goTo,next:()=>goTo(index+1),prev:()=>goTo(index-1),refresh:resize,get index(){return index;},destroy(){destroyed=true;if(frame)win.cancelAnimationFrame(frame);observer?.disconnect();win.removeEventListener('resize',resize);media?.removeEventListener?.('change',resize);for(const [name,handler] of [['pointerdown',down],['pointermove',move],['pointerup',up],['pointercancel',cancel],['lostpointercapture',lostCapture],['click',click]])viewport.removeEventListener(name,handler);drag=null;}};
}
