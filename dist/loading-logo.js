import {normalizeVisualPreferences,readVisualPreferences} from './visual-preferences.js?v=2';
let currentStyle=readVisualPreferences().loadingStyle;
// Reuse the exact logo artwork; the default stagger and dots stay unchanged.
function loadingContents(style){
 const dots='<span class="loading-dots" aria-hidden="true"><i></i><i></i><i></i></span>';
 if(style==='dots')return '<span class="loading-motion loading-ink-flow" aria-hidden="true"><span class="loading-ink"><i class="loading-ink-stroke"></i><i class="loading-ink-stroke"></i><i class="loading-ink-stroke"></i></span></span>';
 if(style==='pulse')return '<span class="loading-motion loading-pages" aria-hidden="true"><span class="loading-book"><span class="loading-book-cover"></span><span class="loading-book-spine"></span><span class="loading-book-print"></span><i class="loading-turning-page"></i><i class="loading-turning-page"></i></span></span>';
 const cuts=[0,16,28.5,37,50,61,73.3,85.5,90,100];
 return `<span class="loading-wordmark" role="img" aria-label="KataKecil">${cuts.slice(0,-1).map((left,i)=>`<span class="loading-wordmark-piece" aria-hidden="true" style="--cut-left:${left}%;--cut-right:${100-cuts[i+1]}%;--wave-order:${i}"></span>`).join('')}</span>${dots}`;
}
export function loadingLogo(style){
 const preview=arguments.length>0,selected=preview?normalizeVisualPreferences({loadingStyle:style}).loadingStyle:currentStyle;
 return `<span class="loading-brand" data-loading-style="${selected}"${preview?' data-loading-preview="true"':''}>${loadingContents(selected)}</span>`;
}
export function applyLoadingStyle(style,root=globalThis.document){
 currentStyle=normalizeVisualPreferences({loadingStyle:style}).loadingStyle;
 const nodes=[...(root?.matches?.('.loading-brand')?[root]:[]),...(root?.querySelectorAll?.('.loading-brand')||[])];
 for(const el of nodes){
  if(el.hasAttribute('data-loading-preview')||el.dataset.loadingStyle===currentStyle)continue;
  el.innerHTML=loadingContents(currentStyle);el.dataset.loadingStyle=currentStyle;
 }
}
