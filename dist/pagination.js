// Measure actual text height; the caller supplies the page geometry and loaded fonts.
export async function paginateToFit(chapters, fits, yieldControl=()=>Promise.resolve(), cancelled=()=>false) {
  const pages=[];
  for(let chapterIndex=0;chapterIndex<chapters.length;chapterIndex++) {
    const chapter=chapters[chapterIndex];let start=0;
    while(start<chapter.text.length){
      if(cancelled())return null;
      const first=start===0;
      // Grow a candidate, then binary-search its last fitting UTF-16 boundary.
      let low=0,high=Math.min(4096,chapter.text.length-start);
      while(high<chapter.text.length-start&&fits(chapter.text.slice(start,start+high),chapterIndex,first)){low=high;high=Math.min(high*2,chapter.text.length-start);}
      if(fits(chapter.text.slice(start,start+high),chapterIndex,first))low=high;
      else while(low+1<high){const mid=Math.floor((low+high)/2);if(fits(chapter.text.slice(start,start+mid),chapterIndex,first))low=mid;else high=mid;}
      if(!low)throw Error('Ukuran teks terlalu besar untuk area baca. Kecilkan teks atau putar layar.');
      let end=start+low;
      if(end<chapter.text.length){
        const space=chapter.text.lastIndexOf(' ',end);
        const paragraph=chapter.text.lastIndexOf('\n\n',end);
        if(paragraph>start+low*.6)end=paragraph+2;
        else if(space>start+low*.55)end=space+1;
        if(end>0&&/[\uD800-\uDBFF]/.test(chapter.text[end-1]))end--;
        // Whitespace wrapping can make the trailing delimiter need an extra line.
        while(end>start&&!fits(chapter.text.slice(start,end),chapterIndex,first))end--;
      }
      if(end<=start)throw Error('Halaman tidak dapat ditata untuk ukuran layar ini.');
      pages.push({chapterIndex,start,end,text:chapter.text.slice(start,end)});start=end;
      if(pages.length%20===0)await yieldControl();
    }
  }
  return pages;
}
