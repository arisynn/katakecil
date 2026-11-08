export interface SpeedWord {text:string;start:number;end:number}
export interface SpeedEpisode {chapterIndex:number;text:string;start:number;language?:string}
const graphemes=(text:string)=>typeof Intl.Segmenter==='function'?Array.from(new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(text),part=>part.segment):Array.from(text);
// A length-based display heuristic, not a claim of one optimal point for every reader.
export function focusParts(text:string){
 const parts=graphemes(text),letters=parts.map((part,index)=>({part,index})).filter(({part})=>/[\p{L}\p{N}]/u.test(part));
 const count=letters.length,position=count<=1?0:count<=5?1:count<=9?2:count<=13?3:Math.floor(count*.3);
 const index=letters[position]?.index??0;
 return{before:parts.slice(0,index).join(''),pivot:parts[index]||'',after:parts.slice(index+1).join('')};
}
export function speedWordDelay(word:string,following:string,wpm:number){
 const rate=Math.min(600,Math.max(100,Number.isFinite(wpm)?wpm:250));
 const letters=graphemes(word).filter(part=>/[\p{L}\p{N}]/u.test(part)).length;
 const lengthFactor=Math.min(1.6,1+Math.max(0,letters-8)*.035);
 const punctuation=/[.!?…][”’"')\]]*$/.test(word)?1.8:/[,;:][”’"')\]]*$/.test(word)?1.35:1;
 return 60000/rate*lengthFactor*(following.includes('\n\n')?Math.max(2.2,punctuation):punctuation);
}
export function speedWords(text:string,language=''):SpeedWord[]{
 if(/^(?:zh|ja|th)(?:-|$)/i.test(language)&&typeof Intl.Segmenter==='function'){
  const words:SpeedWord[]=[];
  for(const part of new Intl.Segmenter(language,{granularity:'word'}).segment(text)){
   if(part.isWordLike)words.push({text:part.segment,start:part.index,end:part.index+part.segment.length});
   else if(words.length&&part.segment.trim()){const word=words[words.length-1];word.end=part.index+part.segment.length;word.text=text.slice(word.start,word.end);}
  }
  return words;
 }
 return Array.from(text.matchAll(/\S+/gu),m=>({text:m[0],start:m.index!,end:m.index!+m[0].length}));
}
export class SpeedReader {
 state:'paused'|'playing'|'loading'|'ended'='paused';
 words:SpeedWord[]=[];index=0;wpm=250;episode:SpeedEpisode={chapterIndex:0,text:'',start:0};
 private timer:ReturnType<typeof setTimeout>|undefined;
 private generation=0;
 private session=0;
 private pendingSession:number|null=null;
 get loading(){return this.pendingSession===this.session;}
 constructor(private hooks:{word:(word:SpeedWord,chapterIndex:number)=>void;change:()=>void;next:(chapterIndex:number)=>Promise<SpeedEpisode|null>;error:(error:Error)=>void}){}
 open(episode:SpeedEpisode,wpm=250){this.session++;this.pause();this.episode=episode;this.words=speedWords(episode.text,episode.language);this.index=Math.max(0,this.words.findIndex(w=>w.end>episode.start));this.setRate(wpm);this.paint();}
 private paint(){const word=this.words[this.index];if(word)this.hooks.word(word,this.episode.chapterIndex);this.hooks.change();}
 setRate(wpm:number){this.wpm=Math.min(600,Math.max(100,Number.isFinite(wpm)?Math.round(wpm):250));if(this.state==='playing'){clearTimeout(this.timer);this.schedule();}}
 play(){if(this.loading||this.state==='loading'||this.state==='playing'||!this.words.length)return;if(this.state==='ended')this.index=0;this.state='playing';this.paint();this.schedule();}
 pause(){this.generation++;clearTimeout(this.timer);this.state='paused';this.hooks.change();}
 stop(){this.session++;this.pause();this.words=[];this.episode={chapterIndex:0,text:'',start:0};}
 seek(delta:number){if(this.state==='loading'||!this.words.length)return;this.pause();this.index=Math.min(this.words.length-1,Math.max(0,this.index+delta));this.paint();}
 private schedule(){
  const word=this.words[this.index];if(!word)return;
  const after=this.episode.text.slice(word.end,this.words[this.index+1]?.start??word.end);
  this.timer=setTimeout(()=>{void this.advance();},speedWordDelay(word.text,after,this.wpm));
 }
 private async advance(){
  if(this.state!=='playing')return;
  if(this.index+1<this.words.length){this.index++;this.paint();this.schedule();return;}
  const generation=this.generation,session=this.session;this.pendingSession=session;this.state='loading';this.hooks.change();
  try{
   const next=await this.hooks.next(this.episode.chapterIndex);if(session!==this.session)return;
   if(!next){this.state='ended';this.hooks.change();return;}
   this.episode=next;this.words=speedWords(next.text,next.language);this.index=0;
   if(!this.words.length){this.state='ended';this.hooks.change();return;}
   this.state=generation===this.generation?'playing':'paused';this.paint();if(this.state==='playing')this.schedule();
  }catch(error){if(session!==this.session)return;this.state='paused';this.hooks.error(error as Error);}
  finally{if(this.pendingSession===session)this.pendingSession=null;this.hooks.change();}
 }
}
