import {COVER_LIMITS} from '../covers/model';
import {inspectImage} from '../covers/inspect';
import JSZip from 'jszip';
import {parsePlainManuscript,type ImportChapter,type ParsedManuscript} from '../../utils/importManuscript';
export const ZIP_LIMITS={archive:20_000_000,expanded:70_000_000,entries:1000,depth:10,text:8_000_000};
type Entry={name:string;size:number;compressed:number;dir:boolean;crc:number};
export function inspectZip(bytes:Uint8Array):Entry[]{
  if(bytes.length>ZIP_LIMITS.archive||bytes.length<22)throw Error('ZIP harus berukuran maksimal 20 MB dan memiliki struktur yang valid.');
  const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  let end=-1;
  for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--)if(v.getUint32(i,true)===0x06054b50&&i+22+v.getUint16(i+20,true)===bytes.length){end=i;break;}
  if(end<0)throw Error('Direktori ZIP rusak.');
  const count=v.getUint16(end+10,true),offset=v.getUint32(end+16,true),size=v.getUint32(end+12,true);
  if(v.getUint16(end+4,true)||v.getUint16(end+6,true)||v.getUint16(end+8,true)!==count||count===65535||offset===0xffffffff)throw Error('ZIP multipart/ZIP64 belum didukung.');
  if(count>ZIP_LIMITS.entries||offset+size!==end)throw Error('Struktur atau jumlah berkas ZIP melampaui batas.');
  const result:Entry[]=[],seen=new Set<string>();let pos=offset,total=0;
  for(let i=0;i<count;i++){
    if(pos+46>end||v.getUint32(pos,true)!==0x02014b50)throw Error('Entry ZIP tidak valid.');
    const flags=v.getUint16(pos+8,true),method=v.getUint16(pos+10,true),len=v.getUint16(pos+28,true),extra=v.getUint16(pos+30,true),comment=v.getUint16(pos+32,true);
    if(pos+46+len+extra+comment>end)throw Error('Nama berkas ZIP terpotong.');
    if(flags&1||![0,8].includes(method))throw Error('ZIP terenkripsi atau metode kompresi tidak didukung.');
    const name=new TextDecoder('utf-8',{fatal:true}).decode(bytes.subarray(pos+46,pos+46+len));
    if(!name||name.startsWith('/')||/^[a-z]:/i.test(name)||name.includes('\\')||/[\u0000-\u001f]/.test(name)||name.split('/').some(p=>p==='..'||p==='.')||name.split('/').length>ZIP_LIMITS.depth+1)throw Error('ZIP memiliki path yang tidak aman.');
    if(((v.getUint32(pos+38,true)>>>16)&0xf000)===0xa000)throw Error('Symlink tidak diizinkan dalam ZIP.');
    const key=name.normalize('NFC').toLocaleLowerCase('en-US');if(seen.has(key))throw Error('ZIP memiliki nama berkas duplikat/bertabrakan.');seen.add(key);
    const expanded=v.getUint32(pos+24,true),compressed=v.getUint32(pos+20,true),local=v.getUint32(pos+42,true);
    if(local+30>offset||v.getUint32(local,true)!==0x04034b50)throw Error('Header berkas ZIP tidak valid.');
    const localLen=v.getUint16(local+26,true),localExtra=v.getUint16(local+28,true);
    if(local+30+localLen+localExtra+compressed>offset||v.getUint16(local+8,true)!==method||v.getUint16(local+6,true)!==flags)throw Error('Header ZIP tidak konsisten.');
    const localName=new TextDecoder('utf-8',{fatal:true}).decode(bytes.subarray(local+30,local+30+localLen));
    if(localName!==name)throw Error('Nama lokal dan direktori ZIP berbeda.');
    total+=expanded;if(total>ZIP_LIMITS.expanded||expanded===0xffffffff||compressed===0xffffffff)throw Error('ZIP terlalu besar setelah diekstraksi (maksimal 70 MB).');
    result.push({name,size:expanded,compressed,dir:name.endsWith('/'),crc:v.getUint32(pos+16,true)});pos+=46+len+extra+comment;
  }
  if(pos!==end)throw Error('Ukuran direktori ZIP tidak sesuai.');
  return result;
}
const crcTable=Array.from({length:256},(_,n)=>{let c=n;for(let i=0;i<8;i++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
export async function boundedRead(zip:JSZip,e:Entry,cap:number):Promise<Uint8Array>{
  if(e.size>cap)throw Error(`Berkas ${e.name} melampaui batas ukuran.`);
  const entry=zip.file(e.name);if(!entry)throw Error('Isi ZIP tidak sesuai direktori.');
  return new Promise((resolve,reject)=>{
    const chunks:Uint8Array[]=[];let size=0,crc=0xffffffff,failed=false;
    const stream=(entry as typeof entry & {internalStream:(type:'uint8array')=>JSZip.JSZipStreamHelper<Uint8Array>}).internalStream('uint8array');
    stream.on('data',(data:Uint8Array)=>{if(failed)return;size+=data.length;if(size>cap||size>e.size){failed=true;stream.pause();chunks.length=0;reject(Error('Keluaran ekstraksi melewati batas.'));return;}for(const b of data)crc=crcTable[(crc^b)&255]^(crc>>>8);chunks.push(data);});
    stream.on('error',err=>{failed=true;chunks.length=0;reject(err);});
    stream.on('end',()=>{if(failed)return;if(size!==e.size||((crc^0xffffffff)>>>0)!==e.crc){reject(Error('Pemeriksaan integritas ZIP gagal.'));return;}const out=new Uint8Array(size);let at=0;for(const part of chunks){out.set(part,at);at+=part.length;}resolve(out);});stream.resume();
  });
}
export type ZipResult={parsed:ParsedManuscript;epubs:{name:string;bytes:Uint8Array}[];expanded:number};
export async function parseZip(bytes:Uint8Array,name:string,progress:(message:string)=>void=()=>{}):Promise<ZipResult>{
  const entries=inspectZip(bytes);const zip=await JSZip.loadAsync(bytes);const chapters:ImportChapter[]=[],epubs:ZipResult['epubs']=[];const covers:NonNullable<ParsedManuscript['covers']>=[],coverWarnings:string[]=[];let coverBytes=0;
  for(const [i,e] of [...entries].sort((a,b)=>a.name.localeCompare(b.name,'id',{numeric:true})).entries()){
    if(e.dir)continue;progress(`Memeriksa berkas ${i+1} dari ${entries.length}…`);
    const base=e.name.split('/').pop()!;const system=/(?:^|\/)(?:__MACOSX|\.git|node_modules)(?:\/|$)/.test(e.name)||/^\./.test(base);
    if(system){chapters.push({key:`zip-${i}`,title:base,content_md:'',episode_number:null,arc_title:'',origin:e.name,include:false,confidence:'tinggi',reviewed:true,candidate_kind:'ignored',reason:'Berkas sistem; dilewati.'});continue;}
    if(/\.(md|txt)$/i.test(base)){
      const raw=await boundedRead(zip,e,ZIP_LIMITS.text);let text:string;try{text=new TextDecoder('utf-8',{fatal:true}).decode(raw);}catch{throw Error(`Encoding ${e.name} bukan UTF-8. Simpan ulang sebagai UTF-8.`);}
      if(text.includes('\0'))throw Error(`Berkas ${e.name} bukan naskah teks.`);
      const parsed=parsePlainManuscript(text,e.name);const folderArc=e.name.split('/').slice(0,-1).reverse().find(p=>/^(?:arc|bagian|part)[ _-]+[\divxlcdm]+/i.test(p))?.replace(/_/g,' ')||'';
      for(const c of parsed.chapters){chapters.push({...c,key:`zip-${i}-${c.key}`,arc_title:c.arc_title||folderArc});if(chapters.length>1000)throw Error('Maksimal 1000 kandidat bagian. Pecah ZIP menjadi beberapa arsip.');}
    }else if(/\.epub$/i.test(base)){
      if(epubs.length)throw Error('ZIP memuat beberapa EPUB. Pilih satu EPUB atau impor setiap karya secara terpisah.');
      epubs.push({name:e.name,bytes:await boundedRead(zip,e,18_000_000)});
    }else if(/\.(png|jpe?g|webp)$/i.test(base)){
      let reason='Gambar dilewati.',valid=false;
      if(covers.length>=COVER_LIMITS.candidates||e.size>COVER_LIMITS.bytes||coverBytes+e.size>COVER_LIMITS.candidateBytes){reason='Kandidat sampul melewati batas 12 gambar / 30 MiB total / 15 MiB per gambar.';coverWarnings.push(`${base}: ${reason}`);}
      else try{
        const raw=await boundedRead(zip,e,COVER_LIMITS.bytes);const info=inspectImage(raw);coverBytes+=raw.length;
        const named=/(?:^|[ _.-])(cover|sampul)(?:[ _.-]|$)/i.test(base),folder=/(?:^|\/)(?:covers?|sampul)\//i.test(e.name);
        const portrait=info.width/info.height>=.4&&info.width/info.height<=.85;
        reason=named?'Nama berkas menunjukkan sampul; tetap periksa gambarnya.':folder?'Gambar berada dalam folder sampul.':portrait?'Rasio potret; bisa berupa sampul atau ilustrasi bab.':'Gambar tambahan; pilih hanya jika memang sampul.';
        covers.push({data:new Blob([Uint8Array.from(raw)],{type:info.mime}),mime:info.mime,name:base,origin:e.name,reason,score:(named?80:0)+(folder?30:0)+(portrait?10:0),width:info.width,height:info.height});valid=true;
      }catch(error){reason=error instanceof Error?error.message:'Gambar tidak terbaca.';coverWarnings.push(`${base}: ${reason}`);}
      chapters.push({key:`zip-${i}`,title:base,content_md:'',episode_number:null,arc_title:'',origin:e.name,include:false,confidence:'tinggi',reviewed:true,candidate_kind:valid?'ignored':'unsupported',reason:valid?'Kandidat sampul; pilih terpisah. '+reason:reason});
    }else chapters.push({key:`zip-${i}`,title:base,content_md:'',episode_number:null,arc_title:'',origin:e.name,include:false,confidence:'periksa',reviewed:true,candidate_kind:'unsupported',reason:'Format belum didukung atau bukan naskah. Tidak disimpan.'});
  }
  covers.sort((a,b)=>b.score-a.score||a.origin.localeCompare(b.origin));
  return {parsed:{name,format:'zip',title:name.replace(/\.zip$/i,'').replace(/_/g,' '),creator:'',language:'id',chapters,warnings:['Periksa kelompok folder jika arsip berisi lebih dari satu karya. Berkas asli tidak diubah.',...coverWarnings],cover:covers[0],covers},epubs,expanded:entries.reduce((n,e)=>n+e.size,0)};
}
