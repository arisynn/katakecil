import type {ReaderSource} from '../../data/readerSource';
import {getEpubEpisode,getEpubReleases,downloadEpub,type BookEpub,type EpubRelease} from './api';
import {epubReaderContent} from './readerContent';

export function createEpubReaderSource(bookId:string):ReaderSource{
 let releases:EpubRelease[]=[];
 return {
  async loadIndex(){releases=await getEpubReleases(bookId);return releases.map(row=>({episode_number:row.episode_number,title:row.title,arc_title:'',release_at:row.release_at||''}));},
  async loadEpisode(number,signal){
   const release=releases.find(row=>row.episode_number===number);if(!release)throw Error('Episode belum terbit atau tidak tersedia.');
   const value=await getEpubEpisode(release.id,signal),parsed=epubReaderContent(value.html);
   let resumeRatio:number|undefined;
   try{if(!localStorage.getItem(`kk-secure-progress-${bookId}`)){const ratio=localStorage.getItem(`kk:epub-scroll:${bookId}:${release.id}:${value.sourceVersion}`);if(ratio!==null&&Number.isFinite(Number(ratio)))resumeRatio=Math.max(0,Math.min(1,Number(ratio)));}}catch{}
   return {episodeNumber:number,title:release.title,arc:'',...parsed,sourceVersion:value.sourceVersion,resumeRatio};
  },
 };
}
/** Studio-only adapter opens the private original once; never used by public routes. */
export function createEpubPreviewSource(asset:BookEpub):ReaderSource{
 let disposed=false,cleanup:(()=>void)|undefined;
 const archive=async()=>{const {openEpub}=await import('./archive');return openEpub(await downloadEpub(asset));};
 let pending:ReturnType<typeof archive>|undefined;
 const load=()=>pending??=archive().catch(error=>{pending=undefined;throw error;});
 return {
  preview:true,
  async loadIndex(){const value=await load();return value.metadata.toc.map((item,index)=>({episode_number:index+1,title:item.title,arc_title:'Pratinjau privat',release_at:''}));},
  async loadEpisode(number,signal){const value=await load(),rendered=await value.renderSection(number-1);if(disposed||signal.aborted){rendered.dispose();throw Error('Pratinjau dibatalkan.');}const parsed=epubReaderContent(rendered.html,true);cleanup?.();cleanup=rendered.dispose;return {episodeNumber:number,title:value.metadata.toc[number-1].title,arc:'Pratinjau privat',...parsed,sourceVersion:asset.sha256};},
  dispose(){disposed=true;cleanup?.();cleanup=undefined;},
 };
}
