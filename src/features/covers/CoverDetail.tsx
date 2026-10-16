import React,{useRef,useState} from 'react';
import type {Book} from '../../data/library';
import {Cover} from '../../components/Cover';
import BrandIcon from '../../components/BrandIcon';
export function CoverDetail({book}:{book:Book}){
 const dialog=useRef<HTMLDialogElement|null>(null),[zoom,setZoom]=useState(1);const src=book.cover_manifest?.detail.url||book.cover_url;
 return <><Cover book={book} context="detail" size="large" eager/>{src&&<button type="button" className="kk-cover-enlarge" onClick={()=>{setZoom(1);dialog.current?.showModal();}}><BrandIcon name="fullscreen" size={16}/> Lihat sampul lebih besar</button>}
  <dialog className="kk-cover-dialog" ref={dialog} aria-label={`Sampul ${book.title}`} onClick={e=>{if(e.target===e.currentTarget)dialog.current?.close();}}><div className="kk-cover-dialog-head"><strong>{book.title}</strong><button type="button" aria-label="Tutup sampul" onClick={()=>dialog.current?.close()}><BrandIcon name="close" size={20}/></button></div><label className="kk-cover-range">Perbesar<input aria-label="Perbesar sampul detail" type="range" min="1" max="3" step=".1" value={zoom} onChange={e=>setZoom(Number(e.target.value))}/></label><div className="kk-cover-dialog-image"><img src={src||''} alt={`Sampul ${book.title}`} style={{width:`${zoom*100}%`,maxWidth:'none'}}/></div></dialog>
 </>;
}
