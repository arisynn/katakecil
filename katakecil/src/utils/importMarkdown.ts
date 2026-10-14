import {titleInfo,filenameNumber} from './importStructure';
export type ImportedEpisode = { episode_number:number|null;arc_title:string;title:string;content_md:string;review_reason?:string;section_type?:'frontmatter'|'arc' };
/** Walk headings in source order. Text before numbered chapters is never dropped. */
export function parseMarkdownUpload(source:string,filename:string):ImportedEpisode[] {
  const text=source.replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n');
  const lines=text.split('\n');
  const out:ImportedEpisode[]=[];
  let arc='', title='', number:number|null=null, body:string[]=[], explicit=false, uncertain=false, fence='';
  const defaultTitle=filename.split(/[\\/]/).pop()!.replace(/\.(?:md|txt)$/i,'').replace(/_/g,' ').trim().slice(0,180)||'Bagian tanpa judul';
  const flush=()=>{
    const content=body.join('\n').trim();
    if(content || explicit){out.push({episode_number:number,arc_title:arc,title:title||defaultTitle,content_md:content,...(!explicit||uncertain?{review_reason:'Tidak ada batas episode yang pasti. Periksa judul, nomor, dan jenis bagian.'}:{})});}
    if(out.length>1000)throw Error('Terlalu banyak bagian teks. Pecah berkas sebelum impor.');
    body=[];title='';number=null;explicit=false;uncertain=false;
  };
  for(const line of lines){
    const f=/^\s*(`{3,}|~{3,})/.exec(line);
    if(f){if(!fence)fence=f[1][0];else if(fence===f[1][0])fence='';body.push(line);continue;}
    if(fence){body.push(line);continue;}
    const heading=/^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$/.exec(line);
    const raw=heading?.[1]||(/^\s*(?:bab|episode|chapter|prolog|epilog|arc|bagian|part)\b/i.test(line)?line.trim():'');
    const info=titleInfo(raw);
    if(raw&&info.kind==='arc'&&(heading||/\.txt$/i.test(filename))){flush();arc=info.title;continue;}
    if(raw&&info.kind==='chapter'&&(heading||/\.txt$/i.test(filename))){flush();title=info.title;number=info.number;explicit=true;uncertain=info.confidence==='periksa';continue;}
    // A leading book title alone is metadata; following prose remains a reviewable preamble.
    if(heading&&!title&&!body.some(x=>x.trim())&&!out.length){title=heading[1];continue;}
    body.push(line);
  }
  flush();
  const fileNumber=filenameNumber(filename);
  if(out.length===1){
    if(out[0].episode_number===null&&fileNumber!==null){out[0].episode_number=fileNumber;delete out[0].review_reason;}
    else if(fileNumber!==null&&out[0].episode_number!==fileNumber)out[0].review_reason=`Nomor nama berkas (${fileNumber}) berbeda dari heading (${out[0].episode_number}).`;
  }
  return out;
}
