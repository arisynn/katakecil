// Local magnification leaves pagination, font preferences and app chrome unchanged.
export function createReaderZoom(getPage){
 let scale=1,x=0,y=0;
 function paint(next=scale,px=x,py=y){
  const page=getPage();scale=Math.max(1,Math.min(3,next));
  x=Math.max(-(page?.offsetWidth||0)*(scale-1)/2,Math.min((page?.offsetWidth||0)*(scale-1)/2,px));
  y=Math.max(-(page?.offsetHeight||0)*(scale-1)/2,Math.min((page?.offsetHeight||0)*(scale-1)/2,py));
  if(page){page.style.setProperty('--reading-zoom',String(scale));page.style.setProperty('--reading-pan-x',x+'px');page.style.setProperty('--reading-pan-y',y+'px');page.toggleAttribute('data-zoomed',scale>1.001);}
 }
 function snapshot(point){const page=getPage(),box=page?.getBoundingClientRect();return{scale,x,y,point,center:{x:box?box.left+box.width/2-x:0,y:box?box.top+box.height/2-y:0}};}
 function pinch(start,ratio,point=start.point){const next=Math.max(1,Math.min(3,start.scale*ratio)),factor=next/start.scale;paint(next,point.x-start.center.x-(start.point.x-start.center.x-start.x)*factor,point.y-start.center.y-(start.point.y-start.center.y-start.y)*factor);}
 return{get scale(){return scale;},get x(){return x;},get y(){return y;},snapshot,pinch,pan:(px,py)=>paint(scale,px,py),reset:()=>paint(1,0,0),zoom:(next,point)=>pinch(snapshot(point),next/scale)};
}
