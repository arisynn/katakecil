// Reuse the exact logo artwork; stagger its regions from the right edge to the left.
export function loadingLogo(){
 const cuts=[0,16,28.5,37,50,61,73.3,85.5,90,100];
 return `<span class="loading-brand"><span class="loading-wordmark" role="img" aria-label="KataKecil">${cuts.slice(0,-1).map((left,i)=>`<span class="loading-wordmark-piece" aria-hidden="true" style="--cut-left:${left}%;--cut-right:${100-cuts[i+1]}%;--wave-order:${8-i}"></span>`).join('')}</span><span class="loading-dots" aria-hidden="true"><i></i><i></i><i></i></span></span>`;
}
