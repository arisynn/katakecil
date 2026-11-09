// Decorative placeholders; the containing status supplies the accessible label.
const block=(name='')=>`<span class="skeleton-block ${name}"></span>`;
export function librarySkeleton(rack=false){
 const spines=rack?block('skeleton-spine')+block('skeleton-spine'):'';
 return `<div class="skeleton-art ${rack?'skeleton-rack':''}" aria-hidden="true">${spines}${block('skeleton-book')}${spines}</div><div class="skeleton-navigation" aria-hidden="true">${Array.from({length:5},()=>block('skeleton-dot')).join('')}</div><div class="skeleton-footer" aria-hidden="true">${block('skeleton-caption')}${block('skeleton-action')}</div>`;
}
export function readerSkeleton(){
 return `<div class="reader-skeleton" aria-hidden="true">${block('skeleton-heading')}${Array.from({length:14},(_,i)=>block(i%5===4?'skeleton-line short':'skeleton-line')).join('')}</div>`;
}
