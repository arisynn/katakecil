const running=new WeakMap(),closing=new WeakMap(),icons=new WeakMap();
export const reducedMotion=element=>!!element?.ownerDocument?.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
function animate(element,keyframes,options){if(!element?.animate||reducedMotion(element))return null;return element.animate(keyframes,options);}
export function enterSheet(layer){
 if(!layer)return;const sheet=layer.querySelector('.dialog,.app-picker');
 const animations=[animate(layer,[{opacity:0},{opacity:1}],{duration:190,easing:'ease-out'}),animate(sheet,[{transform:'translateY(28px)',opacity:.5},{transform:'translateY(0)',opacity:1}],{duration:240,easing:'cubic-bezier(.2,.8,.2,1)'})].filter(Boolean);running.set(layer,animations);
}
export function leaveSheet(layer,cleanup,immediate=false){
 if(!layer){cleanup();return Promise.resolve();}if(closing.has(layer)&&!immediate)return closing.get(layer);
 const sheet=layer.querySelector('.dialog,.app-picker'),win=layer.ownerDocument.defaultView,opacity=win.getComputedStyle(layer).opacity,transform=sheet&&win.getComputedStyle(sheet).transform;
 for(const animation of running.get(layer)||[])animation.cancel();running.delete(layer);
 layer.dataset.sheetClosing='true';layer.inert=true;
 if(immediate||!layer.animate||reducedMotion(layer)){cleanup();return Promise.resolve();}
 const animations=[animate(layer,[{opacity},{opacity:0}],{duration:160,easing:'ease-in',fill:'forwards'}),animate(sheet,[{transform:transform==='none'?'translateY(0)':transform},{transform:'translateY(22px)'}],{duration:170,easing:'cubic-bezier(.4,0,1,1)',fill:'forwards'})].filter(Boolean);
 const task=Promise.allSettled(animations.map(a=>a.finished)).then(()=>{cleanup();closing.delete(layer);});closing.set(layer,task);return task;
}
export function animateIcon(svg){
 if(!svg)return;icons.get(svg)?.cancel();const glyph=svg.dataset.icon;
 const frames=glyph==='bookmark'?[{transform:'scaleY(.75)'},{transform:'scaleY(1.06)'},{transform:'scaleY(1)'}]:glyph==='edit'||glyph==='notes'?[{transform:'rotate(-10deg) scale(.9)'},{transform:'rotate(3deg)'},{transform:'rotate(0)'}]:glyph==='list'?[{transform:'translateY(3px)',opacity:.5},{transform:'translateY(-1px)',opacity:1},{transform:'translateY(0)'}]:[{transform:'scale(.85) rotate(-4deg)',opacity:.6},{transform:'scale(1.07)',opacity:1},{transform:'scale(1)'}];
 const animation=animate(svg,frames,{duration:180,easing:'cubic-bezier(.2,.8,.2,1)'});if(animation)icons.set(svg,animation);
}
export function transitionContent(element,direction=1){
 if(!element)return;icons.get(element)?.cancel();const animation=animate(element,[{opacity:.35,transform:`translateX(${direction*7}px)`},{opacity:1,transform:'translateX(0)'}],{duration:170,easing:'cubic-bezier(.2,.8,.2,1)'});if(animation)icons.set(element,animation);
}
