export type DiffLine={kind:'equal'|'remove'|'add';text:string;block?:boolean};
/** Bounded line comparison: common edges + LCS for small edits, whole blocks for large rewrites. */
export function diffLines(before:string,after:string):DiffLine[]{
 // Avoid allocating millions of rows for a pasted, newline-heavy manuscript.
 const tooManyLines=(text:string)=>{let n=0;for(let i=0;i<text.length;i++)if(text.charCodeAt(i)===10&&++n>4000)return true;return false;};
 if(before.length+after.length>400000||tooManyLines(before)||tooManyLines(after))return before===after?[{kind:'equal',text:before,block:true}]:[{kind:'remove',text:before,block:true},{kind:'add',text:after,block:true}];
 const a=before.split('\n'),b=after.split('\n');let start=0,end=0;
 while(start<a.length&&start<b.length&&a[start]===b[start])start++;
 while(end<a.length-start&&end<b.length-start&&a[a.length-1-end]===b[b.length-1-end])end++;
 const x=a.slice(start,a.length-end),y=b.slice(start,b.length-end),out:DiffLine[]=a.slice(0,start).map(text=>({kind:'equal',text}));
 if(x.length+y.length<=2000&&x.length*y.length<=40000){
  const table=Array.from({length:x.length+1},()=>new Uint32Array(y.length+1));
  for(let i=x.length-1;i>=0;i--)for(let j=y.length-1;j>=0;j--)table[i][j]=x[i]===y[j]?table[i+1][j+1]+1:Math.max(table[i+1][j],table[i][j+1]);
  let i=0,j=0;while(i<x.length||j<y.length){
   if(i<x.length&&j<y.length&&x[i]===y[j]){out.push({kind:'equal',text:x[i++]});j++;}
   else if(i<x.length&&(j===y.length||table[i+1][j]>=table[i][j+1]))out.push({kind:'remove',text:x[i++]});
   else out.push({kind:'add',text:y[j++]});
  }
 }else{for(const text of x)out.push({kind:'remove',text});for(const text of y)out.push({kind:'add',text});}
 for(const text of a.slice(a.length-end))out.push({kind:'equal',text});return out;
}
