// Fill each page to its actual measured height; paragraph endings never discard usable lines.
export async function paginateToFit(chapters,fits,yieldControl=()=>Promise.resolve(),cancelled=()=>false){
 const pages=[];
 for(let chapterIndex=0;chapterIndex<chapters.length;chapterIndex++){
  const chapter=chapters[chapterIndex];let start=0;
  while(start<chapter.text.length){
   if(cancelled())return null;
   const first=start===0;let low=0,high=Math.min(4096,chapter.text.length-start);
   while(high<chapter.text.length-start&&fits(chapter.text.slice(start,start+high),chapterIndex,first)){low=high;high=Math.min(high*2,chapter.text.length-start);}
   if(fits(chapter.text.slice(start,start+high),chapterIndex,first))low=high;
   else while(low+1<high){const mid=Math.floor((low+high)/2);if(fits(chapter.text.slice(start,start+mid),chapterIndex,first))low=mid;else high=mid;}
   if(!low)throw Error('Ukuran teks terlalu besar untuk area baca. Kecilkan teks atau putar layar.');
   let end=start+low;
   if(end<chapter.text.length){
    // Keep the nearest complete word; do not retreat to an earlier paragraph.
    if(!/\s/u.test(chapter.text[end]||'')){const space=chapter.text.slice(start,end).search(/\s+\S*$/u);if(space>=low*.92)end=start+space+1;}
    while(end>start&&!fits(chapter.text.slice(start,end),chapterIndex,first))end--;
    if(/[\uD800-\uDBFF]/.test(chapter.text[end-1]||''))end--;
   }
   if(end<=start)throw Error('Halaman tidak dapat ditata untuk ukuran layar ini.');
   pages.push({chapterIndex,start,end,text:chapter.text.slice(start,end)});start=end;
   if(pages.length%20===0)await yieldControl();
  }
 }
 return pages;
}
