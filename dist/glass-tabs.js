import {animateIcon} from './motion.js?v=1';
// One controller for tabs; pointer velocity and optional SVG edge distortion adapt the owner-supplied liquid helper.
// Existing buttons remain the only focus/action targets.
export function installGlassTabs(doc=document){
 const win=doc.defaultView,records=new Map();let frame=0,stopped=false,gesture=null;
 const selector='.appearance-tabs,.reader-tabs,.segmented';
 let optical=doc.getElementById('kk-liquid-refraction-svg'),ownsOptical=false;
 if(!optical){
  optical=doc.createElementNS('http://www.w3.org/2000/svg','svg');optical.id='kk-liquid-refraction-svg';optical.setAttribute('width','0');optical.setAttribute('height','0');optical.setAttribute('aria-hidden','true');optical.setAttribute('focusable','false');optical.style.cssText='position:fixed;top:-9999px;left:-9999px;pointer-events:none';
  optical.innerHTML='<defs><filter id="kk-lens-refract" x="-15%" y="-15%" width="130%" height="130%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="0.018 0.045" numOctaves="1" seed="3" result="noise"/><feGaussianBlur in="noise" stdDeviation="3.5" result="softNoise"/><feDisplacementMap in="SourceGraphic" in2="softNoise" scale="8" xChannelSelector="R" yChannelSelector="G"/></filter></defs>';
  doc.body.append(optical);ownsOptical=true;
 }
 const previousFilter=doc.body.style.getPropertyValue('--g-lens-refraction-filter');
 doc.body.style.setProperty('--g-lens-refraction-filter','url('+JSON.stringify(new URL('#kk-lens-refract',doc.URL).href)+')');
 const clearStretch=nav=>{nav.style.removeProperty('--lens-stretch-x');nav.style.removeProperty('--lens-stretch-y');};
 const schedule=()=>{if(!frame&&!stopped)frame=win.requestAnimationFrame(refresh);};
 const resize=win.ResizeObserver?new win.ResizeObserver(schedule):null;
 const setGeometry=(nav,geometry)=>{for(const [key,value] of Object.entries(geometry))if(nav.style.getPropertyValue(key)!==value)nav.style.setProperty(key,value);};
 function releaseCapture(nav,id){try{if(nav.hasPointerCapture?.(id))nav.releasePointerCapture(id);}catch{}}
 function cancelGesture(){
  if(!gesture)return;const {nav,record,id,dragging}=gesture;gesture=null;
  if(dragging)record.suppressClick=true;delete nav.dataset.lensDragging;clearStretch(nav);releaseCapture(nav,id);schedule();
 }
 function refresh(){
  frame=0;if(stopped)return;
  for(const [nav,{lens}] of records)if(!nav.isConnected){if(gesture?.nav===nav)cancelGesture();resize?.unobserve(nav);lens.remove();records.delete(nav);}
  for(const nav of doc.querySelectorAll(selector)){
   let record=records.get(nav);
   if(!record){const lens=doc.createElement('span');lens.className='glass-tab-lens';lens.setAttribute('aria-hidden','true');nav.append(lens);nav.classList.add('liquid-tabs');nav.dataset.lensReady='false';record={lens,suppressClick:false};records.set(nav,record);resize?.observe(nav);}
   const active=nav.querySelector(':scope > button.active,:scope > button[aria-selected=true]');record.lens.hidden=!active;if(!active)continue;
   const box=nav.getBoundingClientRect(),target=active.getBoundingClientRect();
   if(!box.width||!target.width)continue;
   if(record.active&&record.active!==active)animateIcon(active.querySelector('svg'));record.active=active;
   if(record.width!==box.width){if(gesture?.nav===nav)cancelGesture();nav.dataset.lensReady='false';record.width=box.width;}
   if(gesture?.nav===nav&&gesture.dragging)continue;
   setGeometry(nav,{'--lens-x':target.left-box.left+nav.scrollLeft+'px','--lens-y':target.top-box.top+nav.scrollTop+'px','--lens-w':target.width+'px','--lens-h':target.height+'px'});
   if(nav.dataset.lensReady==='false')win.requestAnimationFrame(()=>{if(nav.isConnected)nav.dataset.lensReady='true';});
  }
 }
 function down(event){
  if(event.isPrimary===false){cancelGesture();return;}
  if(event.button!==0)return;
  cancelGesture();const nav=event.target.closest?.('.liquid-tabs'),record=records.get(nav);if(!record)return;
  record.suppressClick=false;
  const button=event.target.closest?.('button');if(button?.disabled)return;
  const active=nav.querySelector(':scope > button.active,:scope > button[aria-selected=true]');if(!active)return;
  const box=nav.getBoundingClientRect(),rect=active.getBoundingClientRect();if(!box.width||!rect.width)return;
  const items=Array.from(nav.querySelectorAll(':scope > button:not(:disabled)')).map(button=>{const r=button.getBoundingClientRect();return{button,x:r.left-box.left+nav.scrollLeft,width:r.width};}).filter(item=>item.width>0).sort((a,b)=>a.x-b.x);
  if(items.length<2)return;
  const withinActive=event.clientX>=rect.left&&event.clientX<=rect.right;
  gesture={nav,record,id:event.pointerId,startX:event.clientX,startY:event.clientY,box,items,width:rect.width,height:rect.height,y:rect.top-box.top+nav.scrollTop,grab:withinActive?event.clientX-rect.left:rect.width/2,active,chosen:active,dragging:false,vertical:false,lastX:event.clientX,lastTime:event.timeStamp||win.performance.now(),velocity:0};
 }
 function move(event){
  const g=gesture;if(!g||event.pointerId!==g.id||g.vertical)return;
  const dx=event.clientX-g.startX,dy=event.clientY-g.startY;
  if(!g.dragging){
   if(Math.max(Math.abs(dx),Math.abs(dy))<7)return;
   if(Math.abs(dy)>=Math.abs(dx)){g.vertical=true;return;}
   g.dragging=true;g.nav.dataset.lensDragging='true';try{g.nav.setPointerCapture?.(g.id);}catch{}
  }
  event.preventDefault();
  const now=event.timeStamp||win.performance.now(),dt=Math.max(8,now-g.lastTime);g.velocity=g.velocity*.45+((event.clientX-g.lastX)/dt)*.55;g.lastX=event.clientX;g.lastTime=now;
  // Bounded stretch follows real pointer velocity; release clears it synchronously.
  g.nav.style.setProperty('--lens-stretch-x',String(Math.min(1.06,1.01+Math.abs(g.velocity)*.025)));
  g.nav.style.setProperty('--lens-stretch-y',String(Math.max(.97,1.01-Math.abs(g.velocity)*.015)));
  const x=Math.min(g.items.at(-1).x,Math.max(g.items[0].x,event.clientX-g.box.left+g.nav.scrollLeft-g.grab)),center=x+g.width/2;
  g.chosen=g.items.reduce((best,item)=>Math.abs(item.x+item.width/2-center)<Math.abs(best.x+best.width/2-center)?item:best).button;
  setGeometry(g.nav,{'--lens-x':x+'px','--lens-y':g.y+'px','--lens-w':g.width+'px','--lens-h':g.height+'px'});
 }
 function up(event){
  const g=gesture;if(!g||event.pointerId!==g.id)return;
  // Pointer release commits immediately; no timer decides when the drag ends.
  gesture=null;delete g.nav.dataset.lensDragging;clearStretch(g.nav);releaseCapture(g.nav,g.id);
  if(g.dragging||g.vertical)g.record.suppressClick=true;
  if(g.dragging&&g.chosen!==g.active&&g.chosen.isConnected&&!g.chosen.disabled){g.chosen.focus({preventScroll:true});g.chosen.click();}
  schedule();
 }
 function cancel(event){if(gesture?.id===event.pointerId)cancelGesture();}
 function lost(event){if(gesture?.nav===event.target&&gesture.id===event.pointerId)cancelGesture();}
 function click(event){const record=records.get(event.target.closest?.('.liquid-tabs'));if(record?.suppressClick&&event.detail>0){record.suppressClick=false;event.preventDefault();event.stopImmediatePropagation();}}
 function key(event){if(event.key==='Escape'&&gesture){const dragging=gesture.dragging;cancelGesture();if(dragging){event.preventDefault();event.stopImmediatePropagation();}}}
 const observer=new win.MutationObserver(schedule);observer.observe(doc.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class','aria-selected','lang','open']});win.addEventListener('resize',schedule);doc.fonts?.ready.then(schedule);
 const handlers={pointerdown:down,pointermove:move,pointerup:up,pointercancel:cancel,lostpointercapture:lost,click,keydown:key};for(const [name,handler] of Object.entries(handlers))doc.addEventListener(name,handler,{capture:true,passive:false});schedule();
 return{refresh:schedule,destroy(){cancelGesture();stopped=true;observer.disconnect();resize?.disconnect();win.cancelAnimationFrame(frame);win.removeEventListener('resize',schedule);for(const [name,handler] of Object.entries(handlers))doc.removeEventListener(name,handler,true);for(const [nav,{lens}] of records){lens.remove();nav.classList.remove('liquid-tabs');nav.removeAttribute('data-lens-ready');delete nav.dataset.lensDragging;clearStretch(nav);}records.clear();if(ownsOptical)optical.remove();if(previousFilter)doc.body.style.setProperty('--g-lens-refraction-filter',previousFilter);else doc.body.style.removeProperty('--g-lens-refraction-filter');}};
}
