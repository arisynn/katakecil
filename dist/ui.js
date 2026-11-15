import {normalizeVisualPreferences,readVisualPreferences} from './visual-preferences.js?v=5';
import {KATAKECIL_ICONS} from './katakecil-icons.js?v=1';
import {LUCIDE_ICONS} from './vendor/lucide-icons.js?v=1';
import {KATAKECIL_NEW_OUTLINE,KATAKECIL_NEW_SOLID} from './katakecil-new-icons.js?v=1';
import {KATAKECIL_LEMBAR_OUTLINE,KATAKECIL_LEMBAR_SOLID} from './katakecil-lembar-icons.js?v=1';
export const $ = (selector, root=document) => root.querySelector(selector);
export const $$ = (selector, root=document) => Array.from(root.querySelectorAll(selector));
export const escapeHTML = (value='') => String(value).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let currentPack=readVisualPreferences().iconPack;
const packOf=value=>normalizeVisualPreferences({iconPack:value}).iconPack;
const pairedPacks={'katakecil-new':[KATAKECIL_NEW_OUTLINE,KATAKECIL_NEW_SOLID],'katakecil-lembar':[KATAKECIL_LEMBAR_OUTLINE,KATAKECIL_LEMBAR_SOLID]};
const strokeOf=pack=>pack==='lucide'?2:pairedPacks[pack]?1.75:1.85;
function graphics(name,pack){
 const pair=pairedPacks[pack];
 if(pair)return `<g data-icon-state="outline">${pair[0][name]||pair[0].book}</g><g data-icon-state="solid">${pair[1][name]||pair[1].book}</g>`;
 return pack==='lucide'?(LUCIDE_ICONS[name]||LUCIDE_ICONS.book):(KATAKECIL_ICONS[name]||KATAKECIL_ICONS.book);
}
export function icon(name,cls='',pack){
 const preview=arguments.length>=3,selected=preview?packOf(pack):currentPack,stroke=strokeOf(selected);
 return `<svg fill="none" stroke="currentColor" stroke-width="${stroke}" style="stroke-width:${stroke}" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24" data-icon="${name}" data-icon-pack="${selected}"${preview?' data-icon-preview="true"':''} aria-hidden="true" class="${cls}">${graphics(name,selected)}</svg>`;
}
export function applyIconPack(pack,root=globalThis.document){
 currentPack=packOf(pack);
 const nodes=[...(root?.matches?.('svg[data-icon]')?[root]:[]),...(root?.querySelectorAll?.('svg[data-icon]')||[])];
 for(const el of nodes){
  if(el.hasAttribute('data-icon-preview')||el.dataset.iconPack===currentPack)continue;
  el.innerHTML=graphics(el.dataset.icon,currentPack);el.dataset.iconPack=currentPack;
  const stroke=String(strokeOf(currentPack));el.setAttribute('stroke-width',stroke);el.style.strokeWidth=stroke;
 }
}
export const actionButton=(action,name,label,extra='')=>`<button class="icon-button ${extra}" data-action="${action}" aria-label="${escapeHTML(label)}" title="${escapeHTML(label)}">${icon(name)}</button>`;

export const brandMark=()=>`<span class="brand-wordmark" role="img" aria-label="KataKecil"></span>`;
