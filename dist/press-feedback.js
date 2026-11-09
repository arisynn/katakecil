// Delegated feedback also covers touch browsers that defer the :active pseudo-class.
// Never prevent input or capture pointers: the carousel/reader own their gestures.
export function installPressFeedback(doc){
 const supported='.primary,.secondary,.icon-button,.header-back,.settings-link,.app-select-trigger,.app-color-trigger,.toc-item,.tab,.segmented button,.tool-grid button,.reading-tool-list>button,.reader-tool-actions>button,.upload-zone,.shelf-dot,.cover-button';
 let pressed=null;
 function clear(){if(pressed)delete pressed.button.dataset.pressing;pressed=null;}
 function find(target){const button=target.closest?.('button');return button?.matches(supported)&&!button.disabled&&button.getAttribute('aria-disabled')!=='true'?button:null;}
 doc.addEventListener('pointerdown',event=>{clear();if(event.isPrimary===false||(event.pointerType==='mouse'&&event.button!==0))return;const button=find(event.target);if(button){pressed={button,id:event.pointerId,x:event.clientX,y:event.clientY};button.dataset.pressing='true';}},true);
 doc.addEventListener('pointermove',event=>{if(pressed&&event.pointerId===pressed.id&&Math.hypot(event.clientX-pressed.x,event.clientY-pressed.y)>7)clear();},true);
 for(const name of ['pointerup','pointercancel','scroll'])doc.addEventListener(name,clear,true);
 doc.addEventListener('focusout',event=>{if(pressed?.button===event.target)clear();},true);
 doc.addEventListener('keydown',event=>{if(!['Enter',' '].includes(event.key)||event.repeat)return;clear();const button=find(event.target);if(button){pressed={button};button.dataset.pressing='true';}},true);
 doc.addEventListener('keyup',event=>{if(['Enter',' '].includes(event.key))clear();},true);
 doc.addEventListener('visibilitychange',()=>{if(doc.hidden)clear();});doc.defaultView.addEventListener('blur',clear);
}
