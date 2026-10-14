/** Structure recognition is shared by text, EPUB, ZIP and reader headings. */
export function romanNumber(raw: string): number | null {
  const value=raw.toUpperCase();
  if(!value || !/^(?=[MDCLXVI]+$)M{0,3}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/.test(value)) return null;
  const symbols:Record<string,number>={I:1,V:5,X:10,L:50,C:100,D:500,M:1000};
  return [...value].reduce((sum,c,i)=>sum+(symbols[c]<(symbols[value[i+1]]||0)?-symbols[c]:symbols[c]),0);
}
export function numberValue(raw:string):number|null {
  const n=/^\d+$/.test(raw)?Number(raw):romanNumber(raw);
  return n!==null&&Number.isInteger(n)&&n>=0&&n<=9999?n:null;
}
export function titleInfo(raw:string):{number:number|null;title:string;confidence:'tinggi'|'sedang'|'periksa';kind:'chapter'|'arc'|'other'} {
  const title=raw.normalize('NFC').replace(/[\u200b\ufeff]/g,'').trim().replace(/\s+/g,' ').slice(0,180);
  if(/^(?:arc|bagian|part|volume|jilid)\s+[\divxlcdm]+(?:\b|[_—–:-])/i.test(title))return {number:null,title,confidence:'tinggi',kind:'arc'};
  const match=/^(?:episode|bab|chapter|chap\.?|bagian cerita)\s*(?:ke[- ]?)?(\d{1,4}|[IVXLCDM]+)(?=$|\s|[.:—–_-])/i.exec(title);
  if(match){const number=numberValue(match[1]);return {number,title,confidence:number===null?'periksa':'tinggi',kind:'chapter'};}
  if(/^(?:prolog|prologue)(?:$|\s|[:—–-])/i.test(title))return {number:0,title,confidence:'sedang',kind:'chapter'};
  if(/^(?:epilog|epilogue|interlude|interlud|bonus)(?:$|\s|[:—–-])/i.test(title))return {number:null,title,confidence:'sedang',kind:'chapter'};
  return {number:null,title,confidence:'periksa',kind:'other'};
}
export function filenameNumber(name:string):number|null {
  const base=name.split(/[\\/]/).pop()!.replace(/\.[^.]+$/,'').replace(/_/g,' ');
  const info=titleInfo(base);if(info.number!==null)return info.number;
  const match=/^(\d{1,4})(?:[ .—–-]|$)/.exec(base);return match?numberValue(match[1]):null;
}
