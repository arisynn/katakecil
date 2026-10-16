import React,{useEffect,useState} from 'react';
import {prepareCover} from './prepare';
import {DEFAULT_COVER} from './model';
import type {ImportCover} from '../../utils/importManuscript';
let thumbnailQueue:Promise<unknown>=Promise.resolve();
function Candidate({cover,selected,choose,disabled}:{cover:ImportCover;selected:boolean;choose:()=>void;disabled:boolean}){
 const [url,setURL]=useState('');useEffect(()=>{const controller=new AbortController();let local='';thumbnailQueue=thumbnailQueue.catch(()=>{}).then(async()=>{controller.signal.throwIfAborted();const value=await prepareCover(cover.data,cover.name,DEFAULT_COVER,controller.signal,256);if(!controller.signal.aborted){local=URL.createObjectURL(value.normalized);setURL(local);}}).catch(()=>{});return()=>{controller.abort();if(local)URL.revokeObjectURL(local);};},[cover.data]);
 return <button type="button" className="kk-cover-candidate" aria-pressed={selected} disabled={disabled} onClick={choose}>{url?<img src={url} alt={`Kandidat sampul ${cover.name}`} loading="lazy"/>:<span className="kk-cover-candidate-loading" aria-hidden="true">Menyiapkan gambar…</span>}<strong>{cover.name}</strong><small>{cover.width} × {cover.height}<br/>{cover.reason}</small></button>;
}
export function CoverCandidates({covers,selected,onChoose,disabled=false}:{covers:ImportCover[];selected:string|null;onChoose:(cover:ImportCover|null)=>void;disabled?:boolean}){
 return <section className="studio-panel"><div className="studio-panel-top"><h2>Pilih sampul ({covers.length})</h2><button type="button" className="studio-light-button" disabled={disabled} onClick={()=>onChoose(null)}>Tanpa sampul</button></div><p className="studio-muted">Urutan teratas adalah rekomendasi. Pilih gambar yang benar; gambar lain dilewati tanpa mengubah arsip asli.</p><div className="kk-cover-candidates">{covers.map(c=><Candidate key={c.origin} cover={c} selected={selected===c.origin} choose={()=>onChoose(c)} disabled={disabled}/>)}</div></section>;
}
