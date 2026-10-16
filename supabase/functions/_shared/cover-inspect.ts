import {COVER_LIMITS,type ImageInfo} from './cover-model.ts';
const text=(b:Uint8Array,start:number,length:number)=>String.fromCharCode(...b.subarray(start,start+length));
function exif(b:Uint8Array,offset:number):number {
 try {
  if(text(b,offset,6)==='Exif\0\0')offset+=6;
  const v=new DataView(b.buffer,b.byteOffset,b.byteLength),little=text(b,offset,2)==='II';
  if(!little&&text(b,offset,2)!=='MM')return 1;
  if(v.getUint16(offset+2,little)!==42)return 1;
  const first=offset+v.getUint32(offset+4,little),count=v.getUint16(first,little);
  for(let i=0;i<Math.min(count,256);i++){const p=first+2+i*12;if(v.getUint16(p,little)===0x112&&v.getUint16(p+2,little)===3&&v.getUint32(p+4,little)===1){const n=v.getUint16(p+8,little);return n>=1&&n<=8?n:1;}}
 }catch{/* malformed optional EXIF is ignored; image decode still has to succeed */}return 1;
}
export function inspectImage(bytes:Uint8Array):ImageInfo {
 if(!bytes.length||bytes.length>COVER_LIMITS.bytes)throw Error('Sampul maksimal 15 MiB.');
 const b=bytes,v=new DataView(b.buffer,b.byteOffset,b.byteLength);let width=0,height=0,orientation=1,transparent=false,mime:ImageInfo['mime'];
 if(b.length>=33&&text(b,1,3)==='PNG'&&b[0]===137&&text(b,12,4)==='IHDR'){
  mime='image/png';width=v.getUint32(16);height=v.getUint32(20);transparent=[4,6].includes(b[25]);
  let p=8,ended=false;while(p+12<=b.length){const n=v.getUint32(p),type=text(b,p+4,4);if(n>b.length-p-12)throw Error('PNG terpotong atau rusak.');if(type==='acTL')throw Error('Sampul animasi belum didukung.');if(type==='tRNS')transparent=true;if(type==='eXIf')orientation=exif(b,p+8);p+=12+n;if(type==='IEND'){ended=true;break;}}
  if(!ended)throw Error('PNG tidak lengkap.');
 }else if(b.length>=12&&text(b,0,4)==='RIFF'&&text(b,8,4)==='WEBP'){
  mime='image/webp';if(v.getUint32(4,true)+8!==b.length)throw Error('WebP terpotong atau rusak.');
  for(let p=12;p+8<=b.length;){const t=text(b,p,4),n=v.getUint32(p+4,true),d=p+8;if(n>b.length-d)throw Error('WebP tidak lengkap.');
   if(t==='ANIM'||t==='ANMF')throw Error('Sampul animasi belum didukung.');
   if(t==='VP8X'&&n>=10){if(b[d]&2)throw Error('Sampul animasi belum didukung.');transparent=Boolean(b[d]&16);width=1+b[d+4]+(b[d+5]<<8)+(b[d+6]<<16);height=1+b[d+7]+(b[d+8]<<8)+(b[d+9]<<16);}
   if(t==='VP8 '&&n>=10&&!width&&b[d+3]===157&&b[d+4]===1&&b[d+5]===42){width=v.getUint16(d+6,true)&16383;height=v.getUint16(d+8,true)&16383;}
   if(t==='VP8L'&&n>=5&&b[d]===47&&!width){const x=v.getUint32(d+1,true);width=(x&16383)+1;height=((x>>>14)&16383)+1;transparent=Boolean(x&0x10000000);}
   if(t==='EXIF')orientation=exif(b,d);p=d+n+(n%2);
  }
 }else if(b.length>=4&&b[0]===255&&b[1]===216){
  mime='image/jpeg';let p=2;
  while(p+3<b.length){if(b[p++]!==255)throw Error('Header JPEG rusak.');while(b[p]===255)p++;const marker=b[p++];if(marker===217||marker===218)break;if(marker===1||(marker>=208&&marker<=215))continue;
   const n=v.getUint16(p);if(n<2||p+n>b.length)throw Error('JPEG tidak lengkap.');
   if(marker===225)orientation=exif(b,p+2);
   if([192,193,194].includes(marker)&&n>=8){height=v.getUint16(p+3);width=v.getUint16(p+5);}
   p+=n;
  }
 }else throw Error('Isi berkas bukan JPG, PNG, atau WebP yang didukung.');
 if(!width||!height||width>COVER_LIMITS.side||height>COVER_LIMITS.side||width*height>COVER_LIMITS.pixels)throw Error('Dimensi sampul maksimal 20 megapiksel dan sisi terpanjang 8.192 piksel.');
 return {width,height,mime,orientation,transparent};
}
export async function inspectBlob(blob:Blob){if(blob.size>COVER_LIMITS.bytes)throw Error('Sampul maksimal 15 MiB.');return inspectImage(new Uint8Array(await blob.arrayBuffer()));}
