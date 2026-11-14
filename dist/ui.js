import {normalizeVisualPreferences,readVisualPreferences} from './visual-preferences.js?v=2';
import {KATAKECIL_ICONS} from './katakecil-icons.js?v=1';
import {LUCIDE_ICONS} from './vendor/lucide-icons.js?v=1';
export const $ = (selector, root=document) => root.querySelector(selector);
export const $$ = (selector, root=document) => Array.from(root.querySelectorAll(selector));
export const escapeHTML = (value='') => String(value).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let currentPack=readVisualPreferences().iconPack;
const packOf=value=>normalizeVisualPreferences({iconPack:value}).iconPack;
const graphics=(name,pack)=>pack==='lucide'?(LUCIDE_ICONS[name]||LUCIDE_ICONS.book):(KATAKECIL_ICONS[name]||KATAKECIL_ICONS.book);
export function icon(name,cls='',pack){
 const preview=arguments.length>=3,selected=preview?packOf(pack):currentPack,stroke=selected==='lucide'?2:1.85;
 return `<svg fill="none" stroke="currentColor" stroke-width="${stroke}" style="stroke-width:${stroke}" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24" data-icon="${name}" data-icon-pack="${selected}"${preview?' data-icon-preview="true"':''} aria-hidden="true" class="${cls}">${graphics(name,selected)}</svg>`;
}
export function applyIconPack(pack,root=globalThis.document){
 currentPack=packOf(pack);
 const nodes=[...(root?.matches?.('svg[data-icon]')?[root]:[]),...(root?.querySelectorAll?.('svg[data-icon]')||[])];
 for(const el of nodes){
  if(el.hasAttribute('data-icon-preview')||el.dataset.iconPack===currentPack)continue;
  el.innerHTML=graphics(el.dataset.icon,currentPack);el.dataset.iconPack=currentPack;
  const stroke=currentPack==='lucide'?'2':'1.85';el.setAttribute('stroke-width',stroke);el.style.strokeWidth=stroke;
 }
}
export const actionButton=(action,name,label,extra='')=>`<button class="icon-button ${extra}" data-action="${action}" aria-label="${escapeHTML(label)}" title="${escapeHTML(label)}">${icon(name)}</button>`;

export const brandMark=()=>`<span class="brand-wordmark" role="img" aria-label="KataKecil"></span>`;
