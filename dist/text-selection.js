// Reader text selection uses DOM ranges only for geometry, never window Selection.
// This avoids triggering Chrome's native selection toolbar/contextual Google search.
export function wordBounds(text,offset){
 if(!text.length)return{start:0,end:0};let point=Math.min(text.length-1,Math.max(0,offset));
 const word=char=>/[\p{L}\p{N}_]/u.test(char||'');
 if(!word(text[point])&&point>0&&word(text[point-1]))point--;
 let start=point,end=point+1;while(start>0&&word(text[start-1]))start--;while(end<text.length&&word(text[end]))end++;
 return{start,end};
}
export function textRange(root,start,end){
 const doc=root.ownerDocument,walker=doc.createTreeWalker(root,4),range=doc.createRange();let node,total=0,startSet=false,last;
 while(node=walker.nextNode()){
  const next=total+node.textContent.length;last=node;
  if(!startSet&&start<=next){range.setStart(node,Math.max(0,start-total));startSet=true;}
  if(startSet&&end<=next){range.setEnd(node,Math.max(0,end-total));return range;}
  total=next;
 }
 if(!last)return null;if(!startSet)range.setStart(last,last.textContent.length);range.setEnd(last,last.textContent.length);return range;
}
export function offsetAtPoint(root,x,y){
 const doc=root.ownerDocument,layer=doc.querySelector('.custom-selection-layer'),visible=layer?.style.visibility;if(layer)layer.style.visibility='hidden';let position,range;try{position=doc.caretPositionFromPoint?.(x,y);range=!position&&doc.caretRangeFromPoint?.(x,y);}finally{if(layer)layer.style.visibility=visible||'';}
 const node=position?.offsetNode||range?.startContainer,offset=position?.offset??range?.startOffset;
 if(node&&root.contains(node)){const before=doc.createRange();before.selectNodeContents(root);before.setEnd(node,offset);return before.toString().length;}
 const bounds=root.getBoundingClientRect();if(y<bounds.top)return 0;if(y>bounds.bottom)return root.textContent.length;return null;
}
export function createTextSelection({document:doc,getRoot,canStart=()=>true,onChange,onClear=()=>{},delay=420}){
 let state=null,pointer=null,timer=null,layer=null,dragging=null;
 const clearTimer=()=>{if(timer!==null)clearTimeout(timer);timer=null;};
 function clear(){clearTimer();state=null;dragging=null;layer?.remove();layer=null;onClear();}
 function draw(){
  if(!state||!state.root.isConnected){clear();return;}
  const range=textRange(state.root,state.start,state.end);if(!range)return;
  const rects=Array.from(range.getClientRects?.()||[]).filter(r=>r.width>0&&r.height>0);
  const rect=range.getBoundingClientRect();if(!rects.length&&rect.width>0)rects.push(rect);
  if(!layer){layer=doc.createElement('div');layer.className='custom-selection-layer';layer.setAttribute('aria-label','Pilihan highlight');const boxes=doc.createElement('div');boxes.className='selection-boxes';layer.appendChild(boxes);doc.body.appendChild(layer);}
  const boxes=layer.querySelector('.selection-boxes');boxes.replaceChildren();
  for(const r of rects){const box=doc.createElement('div');box.className='custom-selection-rect';Object.assign(box.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px'});boxes.appendChild(box);}
  const first=rects[0]||rect,last=rects.at(-1)||rect;
  for(const [endpoint,point] of [['start',{x:first.left,y:first.top}],['end',{x:last.right??last.left+last.width,y:last.bottom}]]){
   let handle=layer.querySelector('[data-endpoint="'+endpoint+'"]');
   if(!handle){handle=doc.createElement('button');handle.type='button';handle.className='selection-handle selection-handle-'+endpoint;handle.dataset.endpoint=endpoint;handle.setAttribute('aria-label',endpoint==='start'?'Awal highlight':'Akhir highlight');
    handle.addEventListener('pointerdown',event=>{event.preventDefault();event.stopPropagation();dragging={endpoint,pointerId:event.pointerId};handle.setPointerCapture?.(event.pointerId);});
    handle.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight'].includes(event.key))return;event.preventDefault();event.stopPropagation();const delta=event.key==='ArrowRight'?1:-1;if(endpoint==='start')state.start=Math.max(0,Math.min(state.end-1,state.start+delta));else state.end=Math.min(state.root.textContent.length,Math.max(state.start+1,state.end+delta));draw();});layer.appendChild(handle);
   }
   handle.style.left=point.x+'px';handle.style.top=point.y+'px';
  }
  onChange({...state,text:state.root.textContent.slice(state.start,state.end),rect,rects});
 }
 function select(start,end,root=getRoot()){
  if(!root)return;start=Math.max(0,Math.min(start,root.textContent.length));end=Math.max(start,Math.min(end,root.textContent.length));if(start===end){clear();return;}state={root,start,end};draw();
 }
 function begin(event){
  if(!canStart()||event.button>0)return;
  const root=getRoot();if(!root||!root.contains(event.target))return;
  if(pointer){clearTimer();pointer=null;return;}
  const offset=offsetAtPoint(root,event.clientX,event.clientY);if(offset===null)return;
  pointer={id:event.pointerId,x:event.clientX,y:event.clientY,offset,root,type:event.pointerType||'mouse',at:Date.now(),selected:false};
  timer=setTimeout(()=>{if(!pointer)return;pointer.selected=true;const bounds=wordBounds(root.textContent,offset);pointer.wordStart=bounds.start;pointer.wordEnd=bounds.end;select(bounds.start,bounds.end,root);},delay);
 }
 function move(event){
  if(dragging){event.preventDefault();const offset=offsetAtPoint(state.root,event.clientX,event.clientY);if(offset===null)return;if(dragging.endpoint==='start')state.start=Math.max(0,Math.min(state.end-1,offset));else state.end=Math.min(state.root.textContent.length,Math.max(state.start+1,offset));draw();return;}
  if(!pointer||pointer.id!==event.pointerId)return;
  const distance=Math.hypot(event.clientX-pointer.x,event.clientY-pointer.y);
  if(!pointer.selected&&distance>9){clearTimer();if(pointer.type==='mouse'){pointer.selected=true;}else{pointer=null;return;}}
  if(pointer.selected){event.preventDefault();const offset=offsetAtPoint(pointer.root,event.clientX,event.clientY);if(offset===null)return;select(Math.min(pointer.wordStart??pointer.offset,offset),Math.max(pointer.wordEnd??pointer.offset+1,offset),pointer.root);}
 }
 function end(event){
  if(dragging){event.preventDefault();dragging=null;return;}
  if(pointer?.id===event.pointerId){if(state&&!pointer.selected&&Date.now()-pointer.at<delay)clear();clearTimer();pointer=null;}
 }
 const native=event=>{const root=getRoot();if(root?.contains(event.target))event.preventDefault();};
 doc.addEventListener('pointerdown',begin);doc.addEventListener('pointermove',move,{passive:false});doc.addEventListener('pointerup',end);doc.addEventListener('pointercancel',()=>{clearTimer();pointer=null;dragging=null;});
 doc.addEventListener('touchstart',event=>{if(event.touches.length>1){clearTimer();pointer=null;}},{passive:true});
 doc.addEventListener('selectstart',native);doc.addEventListener('contextmenu',native);
 return {select,clear,redraw:()=>state&&draw(),get active(){return !!state;},get interacting(){return !!dragging||!!pointer?.selected;}};
}
