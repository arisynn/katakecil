// Delegated feedback also covers touch browsers that defer the :active pseudo-class.
// Never prevent input or capture pointers: the carousel/reader own their gestures.
export function installPressFeedback(doc){
 const supported='.primary,.secondary,.icon-button,.header-back,.settings-link,.app-select-trigger,.app-color-trigger,.toc-item,.tab,.segmented button,.tool-grid button,.reading-tool-list>button,.reader-tool-actions>button,.upload-zone,.shelf-dot,.cover-button';
 const glassSurface='.read-button,.library-header-actions,.shelf-navigation,.reading-status,.shelf-action,.glass,.settings-surface,.dialog,.app-picker';
 const win=doc.defaultView;
 const reducedMotion=()=>win?.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
 let pressed=null,spotFrame=0,spotEvent=null;
 function clear(){if(pressed)delete pressed.button.dataset.pressing;pressed=null;}
 function find(target){const button=target.closest?.('button');return button?.matches(supported)&&!button.disabled&&button.getAttribute('aria-disabled')!=='true'?button:null;}
 function applySpot(target,clientX,clientY){
  if(reducedMotion()||!Number.isFinite(clientX)||!Number.isFinite(clientY))return;
  const surface=target?.closest?.(glassSurface);if(!surface)return;
  const rect=surface.getBoundingClientRect?.();if(!rect||rect.width<=0||rect.height<=0)return;
  const x=Math.max(-20,Math.min(120,Math.round(((clientX-rect.left)/rect.width)*100)));
  const y=Math.max(-40,Math.min(140,Math.round(((clientY-rect.top)/rect.height)*100)));
  surface.style.setProperty('--spot-x',`${x}%`);
  surface.style.setProperty('--spot-y',`${y}%`);
 }
 doc.addEventListener('pointerdown',event=>{clear();if(event.isPrimary===false||(event.pointerType==='mouse'&&event.button!==0))return;applySpot(event.target,event.clientX,event.clientY);const button=find(event.target);if(button){pressed={button,id:event.pointerId,x:event.clientX,y:event.clientY};button.dataset.pressing='true';}},true);
 doc.addEventListener('pointermove',event=>{
  if(pressed&&event.pointerId===pressed.id&&Math.hypot(event.clientX-pressed.x,event.clientY-pressed.y)>7)clear();
  if(event.pointerType==='mouse'&&!reducedMotion()){
   spotEvent={target:event.target,x:event.clientX,y:event.clientY};
   if(!spotFrame&&win?.requestAnimationFrame){spotFrame=win.requestAnimationFrame(()=>{spotFrame=0;if(spotEvent)applySpot(spotEvent.target,spotEvent.x,spotEvent.y);});}
  }
 },true);
 for(const name of ['pointerup','pointercancel','scroll'])doc.addEventListener(name,clear,true);
 doc.addEventListener('focusout',event=>{if(pressed?.button===event.target)clear();},true);
 doc.addEventListener('keydown',event=>{if(!['Enter',' '].includes(event.key)||event.repeat)return;clear();const button=find(event.target);if(button){pressed={button};button.dataset.pressing='true';}},true);
 doc.addEventListener('keyup',event=>{if(['Enter',' '].includes(event.key))clear();},true);
 doc.addEventListener('visibilitychange',()=>{if(doc.hidden)clear();});win.addEventListener('blur',clear);
}
