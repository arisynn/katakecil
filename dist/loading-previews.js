import {brandMark,escapeHTML} from './ui.js?v=12';

const choices=[
 {id:1,en:'Alternating quotes',idn:'Kutip bergantian'},
 {id:2,en:'Floating quotes',idn:'Kutip melayang'},
 {id:3,en:'Logo fade',idn:'Logo memudar'},
 {id:4,en:'Soft breathing',idn:'Napas lembut'},
];
const label=(choice,id)=>`${choice.id}. ${id?choice.idn:choice.en}`;
function artwork(number){
 const quotes='<svg class="loading-quotes" viewBox="0 0 76 48" aria-hidden="true"><path d="M30 5C16 7 6 19 6 31c0 8 5 13 12 13s13-5 13-12-5-12-12-12h-1c3-5 7-8 13-10 3-1 3-6-1-5Z"/><path d="M65 5C51 7 41 19 41 31c0 8 5 13 12 13s13-5 13-12-5-12-12-12h-1c3-5 7-8 13-10 3-1 3-6-1-5Z"/></svg>';
 return `<div class="loading-art loading-art-${number}" aria-hidden="true">${number<3?quotes:''}${brandMark()}</div>`;
}
export function loadingPreviews(language='en'){
 const id=language==='id';
 return `<section class="loading-previews"><div class="loading-preview-stage">${artwork(1)}<span class="loading-preview-status">${id?'Menata halaman…':'Preparing pages…'}</span></div><p class="loading-preview-name" aria-live="polite">${label(choices[0],id)}</p><div class="loading-preview-choices" role="group" aria-label="${id?'Pilih animasi':'Choose an animation'}">${choices.map(choice=>`<button class="secondary" data-action="loading-preview" data-value="${choice.id}" aria-pressed="${choice.id===1}">${escapeHTML(label(choice,id))}</button>`).join('')}</div><p class="loading-preview-caption">${id?'Percobaan saja. Pilih nomor favoritmu nanti.':'Preview only. Choose your favourite number later.'}</p></section>`;
}
export function selectLoadingPreview(root,value){
 const choice=choices.find(item=>item.id===Number(value));if(!choice||!root)return;
 const id=root.ownerDocument.documentElement.lang==='id';
 root.querySelector('.loading-art').outerHTML=artwork(choice.id);
 root.querySelector('.loading-preview-name').textContent=label(choice,id);
 root.querySelectorAll('[data-action=loading-preview]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.value)===choice.id)));
}
