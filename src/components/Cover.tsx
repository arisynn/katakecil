import React, {useState} from 'react';
import type {Book} from '../data/library';
import BrandIcon from './BrandIcon';
import type {PublicCoverManifest} from '../features/covers/model';
const FALLBACK_COVERS=['01-senja','02-langit','03-jejak','04-ruang','05-hujan','06-rumah','07-tertunda','08-bunga'];
function fallbackIndex(book:Pick<Book,'id'|'title'>){const known=['senja','langit','jejak','ruang','hujan','rumah','tertunda','bunga'];const named=known.findIndex(word=>book.title.toLocaleLowerCase('id-ID').includes(word));return named>=0?named:Array.from(book.id).reduce((n,c)=>(n*31+c.charCodeAt(0))>>>0,7)%8;}
/** Used only by the explicitly labelled sample library. Real books use a neutral placeholder. */
export const fallbackCover=(book:Pick<Book,'id'|'title'>)=>`/assets/v6/covers/${FALLBACK_COVERS[fallbackIndex(book)]}.webp`;
export const fallbackCoverMobile=(book:Pick<Book,'id'|'title'>)=>fallbackCover(book).replace('.webp','-mobile.webp');
type CoverBook=Pick<Book,'title'|'genre'|'cover_url'|'id'>&{cover_manifest?:PublicCoverManifest|null};
export type CoverProps={book:CoverBook;size?:'normal'|'mini'|'large';eager?:boolean;context?:'card'|'detail';sizes?:string};
function safeURL(value:string|undefined|null){if(!value)return '';try{const u=new URL(value,window.location.origin);return ['https:','http:','blob:'].includes(u.protocol)?value:'';}catch{return '';}}
export function Cover(props:CoverProps){
 // Keying the image state makes a replacement recover immediately after any prior failure.
 const key=`${props.book.id}:${props.book.cover_manifest?.version||''}:${props.book.cover_url||''}:${props.context||''}`;
 return <CoverImage {...props} key={key}/>;
}
function CoverImage({book,size='normal',eager=false,context='card',sizes}:CoverProps){
 const [failed,setFailed]=useState(false),[legacy,setLegacy]=useState(false),[natural,setNatural]=useState<{width:number;height:number}|null>(null);
 const manifest=book.cover_manifest;
 const variants=(context==='detail'?[manifest?.detail]:manifest?.card||[]).filter((v):v is NonNullable<typeof v>=>Boolean(v&&safeURL(v.url)));
 const chosen=variants[variants.length-1];
 const src=safeURL(legacy?book.cover_url:chosen?.url||book.cover_url);
 const srcSet=!legacy&&variants.length>1?variants.map(v=>`${safeURL(v.url)} ${v.width}w`).join(', '):undefined;
 const width=(!legacy&&chosen?.width)||natural?.width||400,height=(!legacy&&chosen?.height)||natural?.height||600;
 return <div className={`art-cover v6-cover art-cover--${size} kk-cover kk-cover--${context} ${src&&!failed?'v6-original-cover':'kk-cover--empty'}`} style={context==='detail'?{'--kk-cover-ratio':`${width} / ${height}`} as React.CSSProperties:undefined}>
  {src&&!failed?<picture>{book.id.startsWith('v6-demo-')&&<source media="(max-width: 600px)" srcSet={fallbackCoverMobile(book)} type="image/webp"/>}<img src={src} srcSet={srcSet} sizes={sizes||(context==='detail'?'(max-width: 640px) 70vw, 320px':size==='mini'?'72px':'(max-width: 600px) 44vw, (max-width: 1000px) 28vw, 240px')} width={width} height={height} alt={`Sampul ${book.title}`} className="art-cover-image v6-cover-image" loading={eager?'eager':'lazy'} decoding="async" onLoad={e=>{if(!chosen||legacy)setNatural({width:e.currentTarget.naturalWidth,height:e.currentTarget.naturalHeight});}} onError={()=>{if(!legacy&&book.cover_url&&book.cover_url!==src)setLegacy(true);else setFailed(true);}}/></picture>
   :<div className="kk-cover-placeholder" role="img" aria-label={`${failed?'Sampul belum dapat dimuat':'Belum ada sampul'}: ${book.title}`}><BrandIcon name="book-open" size={28}/><strong>{book.title||'Cerita baru'}</strong><span>{failed?'Sampul belum tersedia':'KataKecil'}</span></div>}
 </div>;
}
