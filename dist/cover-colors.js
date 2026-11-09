// A small, bounded cache shared across Library renders; display images stay untouched.
const cache=new Map();
export function dominantCoverColor(pixels){
 const bins=new Map();
 for(let i=0;i<pixels.length;i+=4){
  if(pixels[i+3]<128)continue;
  const r=pixels[i],g=pixels[i+1],b=pixels[i+2],key=(r>>4)*256+(g>>4)*16+(b>>4),bin=bins.get(key)||[0,0,0,0];
  bin[0]++;bin[1]+=r;bin[2]+=g;bin[3]+=b;bins.set(key,bin);
 }
 const best=[...bins.values()].sort((a,b)=>b[0]-a[0])[0];
 return best?best.slice(1).map(v=>Math.round(v/best[0])):null;
}
export function createCoverTints(viewport){
 const doc=viewport.ownerDocument,win=doc.defaultView,queue=[],pending=new Set();let closed=false,running=0;
 const apply=(card,rgb)=>{if(!closed&&rgb)card.style.setProperty('--cover-rgb',rgb.join(','));};
 function pump(){
  while(!closed&&running<2&&queue.length){
   const {card,src}=queue.shift();if(cache.has(src)){apply(card,cache.get(src));continue;}
   running++;const image=new win.Image();let timer;
   const task={cancel:()=>finish(null)};pending.add(task);
   function finish(rgb){
    if(!pending.delete(task))return;
    win.clearTimeout(timer);image.onload=image.onerror=null;image.removeAttribute('src');running--;
    if(rgb){cache.set(src,rgb);if(cache.size>24)cache.delete(cache.keys().next().value);apply(card,rgb);}
    pump();
   }
   image.onload=()=>{try{const canvas=doc.createElement('canvas');canvas.width=canvas.height=24;const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)return finish(null);ctx.drawImage(image,0,0,24,24);finish(dominantCoverColor(ctx.getImageData(0,0,24,24).data));}catch{finish(null);}};
   image.onerror=()=>finish(null);timer=win.setTimeout(()=>finish(null),4000);
   // A separate CORS probe ensures a server without CORS cannot break its cover.
   image.crossOrigin='anonymous';image.src=src;
  }
 }
 return{request(card){
  if(closed)return;const cover=card.querySelector('.book-cover'),src=cover?.currentSrc||cover?.src;if(!src||card.dataset.tintSource===src)return;
  try{if(!['data:','blob:','https:','http:'].includes(new URL(src,doc.baseURI).protocol))return;}catch{return;}
  card.dataset.tintSource=src;if(cache.has(src))apply(card,cache.get(src));else{queue.push({card,src});pump();}
 },destroy(){closed=true;queue.length=0;for(const task of [...pending])task.cancel();}};
}
