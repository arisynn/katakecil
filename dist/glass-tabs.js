// One decorative lens, no duplicated text/focus targets or additional gestures.
export function installGlassTabs(doc=document){
 const win=doc.defaultView,records=new Map();let frame=0,stopped=false;
 const schedule=()=>{if(!frame&&!stopped)frame=win.requestAnimationFrame(refresh);};
 const resize=win.ResizeObserver?new win.ResizeObserver(schedule):null;
 function refresh(){
  frame=0;if(stopped)return;
  for(const [nav,{lens}] of records)if(!nav.isConnected){resize?.unobserve(nav);lens.remove();records.delete(nav);}
  for(const nav of doc.querySelectorAll('.appearance-tabs,.reader-tabs,.segmented')){
   let record=records.get(nav);
   if(!record){const lens=doc.createElement('span');lens.className='glass-tab-lens';lens.setAttribute('aria-hidden','true');nav.append(lens);nav.classList.add('liquid-tabs');nav.dataset.lensReady='false';record={lens};records.set(nav,record);resize?.observe(nav);}
   const active=nav.querySelector(':scope > button.active,:scope > button[aria-selected=true]');record.lens.hidden=!active;if(!active)continue;
   const box=nav.getBoundingClientRect(),target=active.getBoundingClientRect();
   if(!box.width||!target.width)continue;
   if(record.width!==box.width){nav.dataset.lensReady='false';record.width=box.width;}
   for(const [key,value] of Object.entries({'--lens-x':target.left-box.left+nav.scrollLeft+'px','--lens-y':target.top-box.top+nav.scrollTop+'px','--lens-w':target.width+'px','--lens-h':target.height+'px'}))if(nav.style.getPropertyValue(key)!==value)nav.style.setProperty(key,value);
   if(nav.dataset.lensReady==='false')win.requestAnimationFrame(()=>{if(nav.isConnected)nav.dataset.lensReady='true';});
  }
 }
 const observer=new win.MutationObserver(schedule);observer.observe(doc.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class','aria-selected','lang','open']});win.addEventListener('resize',schedule);doc.fonts?.ready.then(schedule);schedule();
 return{refresh:schedule,destroy(){stopped=true;observer.disconnect();resize?.disconnect();win.cancelAnimationFrame(frame);win.removeEventListener('resize',schedule);for(const [nav,{lens}] of records){lens.remove();nav.classList.remove('liquid-tabs');nav.removeAttribute('data-lens-ready');}records.clear();}};
}
