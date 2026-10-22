import {makeReleasePlan, toWibDate, type ReleaseCandidate} from './releasePlanning';
export type PublicationMode = 'draft'|'now'|'schedule'|'mixed';
export type PublicationOptions = {mode:PublicationMode;weekdays:number[];time:string;start:string;opening:number;append:boolean};
export type PublicationSlot = {episode_number:number;title:string;release_at:string|null};
export const RELEASE_PRESETS = [{label:'1× seminggu',days:[0]},{label:'2× seminggu',days:[2,5]},{label:'3× seminggu',days:[1,3,6]}];
export const WEEKDAYS = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
export function defaultPublicationOptions():PublicationOptions {
  return {mode:'draft',weekdays:[2,5],time:'19:00',start:toWibDate(new Date().toISOString()),opening:3,append:true};
}
export function publicationPreview(chapters:{episode_number:number|null;title:string}[], existing:ReleaseCandidate[], options:PublicationOptions,nowMs=Date.now()):PublicationSlot[] {
  if(options.mode==='draft')return [];
  if(!chapters.length)throw Error('Pilih sedikitnya satu bab untuk diterbitkan.');
  if(chapters.some(c=>c.episode_number===null)||new Set(chapters.map(c=>c.episode_number)).size!==chapters.length)throw Error('Periksa nomor bab sebelum mengatur penerbitan.');
  const ordered=[...chapters].sort((a,b)=>a.episode_number!-b.episode_number!);
  const opening=options.mode==='now'?ordered.length:options.mode==='mixed'?options.opening:0;
  if(!Number.isInteger(opening)||opening<0||opening>ordered.length||(options.mode==='mixed'&&opening<1))throw Error('Jumlah bab pembuka harus 1 sampai jumlah bab terpilih.');
  const result:PublicationSlot[]=ordered.slice(0,opening).map(c=>({episode_number:c.episode_number!,title:c.title,release_at:null}));
  const rest=ordered.slice(opening);if(!rest.length)return result;
  const last=options.append?Math.max(nowMs,...existing.filter(e=>e.is_enabled&&e.release_at).map(e=>Date.parse(e.release_at!))):nowMs;
  const start=options.start>toWibDate(new Date(last).toISOString())?options.start:toWibDate(new Date(last).toISOString());
  const fake=rest.map(c=>({id:`import-${c.episode_number}`,book_id:'import',episode_number:c.episode_number!,title:c.title,is_enabled:false,release_at:null}));
  const occupied=existing.filter(e=>e.is_enabled&&e.release_at).map(e=>({...e,book_id:'import'}));
  const slots=makeReleasePlan({bookId:'import',episodes:[...fake,...occupied],weekdays:options.weekdays,timeWib:options.time,startDate:start,count:rest.length,nowMs:last});
  return [...result,...slots.map(s=>({episode_number:s.episode_number,title:s.title,release_at:s.release_at}))];
}
