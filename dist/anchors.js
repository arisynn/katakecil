// Reattach saved positions after a parser update using source files and exact text.
export function relocateAnchor(oldChapters,newChapters,chapterIndex,offset=0,quote=''){
 const old=oldChapters[chapterIndex];if(!old)return {chapterIndex:0,charOffset:0};
 const needle=quote||old.text.slice(offset,offset+100).trim();
 const candidates=newChapters.map((chapter,index)=>({chapter,index}));
 const sameFile=candidates.filter(c=>c.chapter.href?.split('#')[0]===old.href?.split('#')[0]);
 const ordered=[...sameFile,...candidates.filter(c=>c.chapter.href?.split('#')[0]!==old.href?.split('#')[0])];
 if(needle){
  for(const group of [sameFile,ordered]){
   const matches=group.flatMap(({chapter,index})=>{const start=chapter.text.indexOf(needle);return start>=0&&chapter.text.indexOf(needle,start+1)===-1?[{chapterIndex:index,charOffset:start}]:[];});
   if(matches.length===1)return matches[0];
  }
 }
 if(quote)return null;
 if(sameFile.length)return {chapterIndex:sameFile[0].index,charOffset:Math.min(offset,Math.max(0,sameFile[0].chapter.text.length-1))};
 // A title/imprint was removed: resume at the next surviving spine document.
 for(const chapter of oldChapters.slice(chapterIndex+1)){const index=newChapters.findIndex(c=>c.href===chapter.href);if(index>=0)return{chapterIndex:index,charOffset:0};}
 return {chapterIndex:Math.max(0,newChapters.length-1),charOffset:0};
}
