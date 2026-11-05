// Render once per frame while dragging; persist once on release, never on a timer.
export function installPageScrubber(doc,{enabled,snapshot,begin,preview,save,active}){
 const win=doc.defaultView;let drag=null,frame=0,lastCommit=null;
 const slider=event=>event.target?.id==='page-scrubber'?event.target:null;
 function start(input){
  if(drag)return true;if(!enabled()||input.disabled)return false;
  drag={input,origin:snapshot(),target:Number(input.value)};lastCommit=null;begin();active(true);return true;
 }
 function paint(){frame=0;if(drag)preview(drag.target);}
 function finish(cancel=false){
  if(!drag)return;const state=drag;if(frame){win.cancelAnimationFrame(frame);frame=0;}
  if(cancel)preview(state.origin.index,state.origin);else preview(state.target);
  drag=null;active(false);lastCommit={input:state.input,value:Number(state.input.value)};
  if(!cancel)save();
 }
 const down=event=>{const input=slider(event);if(input)start(input);};
 const input=event=>{const el=slider(event);if(!el||!start(el))return;drag.target=Number(el.value);if(!frame)frame=win.requestAnimationFrame(paint);};
 const change=event=>{const el=slider(event);if(!el)return;if(!drag&&lastCommit?.input===el&&lastCommit.value===Number(el.value))return;if(start(el)){drag.target=Number(el.value);finish();}};
 const up=()=>finish(),cancel=()=>finish(true),blur=event=>{if(event.target===drag?.input)finish();};
 const key=event=>{if(event.key==='Escape'&&drag){event.preventDefault();event.stopImmediatePropagation();finish(true);}};
 const listeners=[['pointerdown',down],['input',input],['change',change],['pointerup',up],['pointercancel',cancel],['focusout',blur],['keydown',key]];
 for(const [name,fn] of listeners)doc.addEventListener(name,fn,true);
 return{finish,cancel,destroy(){finish();for(const [name,fn] of listeners)doc.removeEventListener(name,fn,true);}};
}
