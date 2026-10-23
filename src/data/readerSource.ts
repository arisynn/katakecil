import type {ReaderEpisode,ReleasedEpisode} from './secureReader';

/** Both formats feed the existing reader. This interface contains no UI. */
export interface ReaderSource {
 preview?:boolean;
 loadIndex():Promise<ReleasedEpisode[]>;
 loadEpisode(episodeNumber:number,signal:AbortSignal):Promise<ReaderEpisode>;
 dispose?():void;
}
export function savedReaderProgress(bookId:string){
 try{
  const value=JSON.parse(localStorage.getItem(`kk-secure-progress-${bookId}`)||'null');
  if(Number.isInteger(value?.ep)&&value.ep>=0&&Number.isFinite(value.offset)&&value.offset>=0)return value as {ep:number;part?:number;offset:number;sourceVersion?:string};
  const legacy=localStorage.getItem(`kk:epub-last:${bookId}`);
  if(legacy!==null&&/^\d+$/.test(legacy))return {ep:Number(legacy),offset:0};
 }catch{/* Reading still works when local storage is disabled. */}
 return null;
}
