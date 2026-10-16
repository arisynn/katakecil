import React,{useEffect,useRef,useState} from 'react';
import BrandIcon from '../../components/BrandIcon';
import {Cover} from '../../components/Cover';
import {cropRect,DEFAULT_COVER,imageAdvice,ratioLabel,type CoverSettings,type PreparedCover} from './model';
import {prepareCover} from './prepare';
export type CoverSource={data:Blob;name:string;settings?:CoverSettings};
export function CoverEditor({value,onChange,title='Judul ceritamu',source,disabled=false,onBusy}:{value:PreparedCover|null;onChange:(value:PreparedCover|null)=>void;title?:string;source?:CoverSource|null;disabled?:boolean;onBusy?:(busy:boolean)=>void}){
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[sourceURL,setSourceURL]=useState(''),[cardURL,setCardURL]=useState('');
 const controller=useRef<AbortController|null>(null),fileRef=useRef<HTMLInputElement|null>(null),mounted=useRef(true);
 const changed=useRef(onChange),busyChange=useRef(onBusy);changed.current=onChange;busyChange.current=onBusy;
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;controller.current?.abort();};},[]);
 const choose=async(blob:Blob,name:string,settings:CoverSettings=DEFAULT_COVER)=>{
  controller.current?.abort();const abort=new AbortController();controller.current=abort;setError('');setBusy(true);busyChange.current?.(true);changed.current(null);
  try{const result=await prepareCover(blob,name,settings,abort.signal);if(!abort.signal.aborted&&mounted.current)changed.current(result);}
  catch(e){if(!abort.signal.aborted&&mounted.current)setError(e instanceof Error?e.message:'Gambar tidak dapat dibaca.');}
  finally{if(controller.current===abort&&mounted.current){setBusy(false);busyChange.current?.(false);}}
 };
 useEffect(()=>{if(source)void choose(source.data,source.name,source.settings||DEFAULT_COVER);},[source]);
 useEffect(()=>{if(!value){setSourceURL('');return;}const url=URL.createObjectURL(value.normalized);setSourceURL(url);return()=>URL.revokeObjectURL(url);},[value?.normalized]);
 useEffect(()=>{
  if(!value||!sourceURL||value.settings.mode!=='crop'){setCardURL('');return;}let cancelled=false,url='';
  const img=new Image();img.src=sourceURL;
  void img.decode().then(()=>{if(cancelled)return;const rect=cropRect(value.width,value.height,value.settings);const scale=Math.min(1,360/rect.width,800/rect.height),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(rect.width*scale));canvas.height=Math.max(1,Math.round(rect.height*scale));const ctx=canvas.getContext('2d');if(!ctx)return;ctx.drawImage(img,Math.floor(rect.x),Math.floor(rect.y),Math.max(1,Math.floor(rect.width)),Math.max(1,Math.floor(rect.height)),0,0,canvas.width,canvas.height);
   canvas.toBlob(blob=>{if(!blob||cancelled)return;url=URL.createObjectURL(blob);setCardURL(url);},'image/png');
  }).catch(()=>{if(!cancelled)setCardURL('');});
  return()=>{cancelled=true;if(url)URL.revokeObjectURL(url);};
 },[sourceURL,value?.settings.mode,value?.settings.x,value?.settings.y,value?.settings.zoom]);
 const settings=value?.settings||DEFAULT_COVER;
 const set=(patch:Partial<CoverSettings>)=>{if(value)onChange({...value,settings:{...settings,...patch}});};
 const rect=value?cropRect(value.width,value.height,{...settings,mode:'crop'}):null;
 const drag=useRef<{x:number;y:number;s:CoverSettings;width:number;height:number}|null>(null);
 const move=(event:React.PointerEvent<HTMLDivElement>)=>{if(!drag.current||!value||!rect)return;const d=drag.current;const availableX=(value.width-rect.width)/rect.width*d.width,availableY=(value.height-rect.height)/rect.height*d.height;set({x:Math.max(0,Math.min(1,d.s.x-(event.clientX-d.x)/(availableX||Infinity))),y:Math.max(0,Math.min(1,d.s.y-(event.clientY-d.y)/(availableY||Infinity)))});};
 const previewBook={id:'cover-preview',title,genre:'Fiksi',cover_url:settings.mode==='crop'?cardURL||sourceURL:sourceURL};
 return <section className="kk-cover-editor" aria-label="Pengaturan sampul">
  <div className="kk-cover-toolbar"><button type="button" className="studio-light-button" disabled={disabled} onClick={()=>fileRef.current?.click()}><BrandIcon name="image-plus" size={18}/>{value?'Ganti gambar':'Pilih sampul dari HP'}</button><input ref={fileRef} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)void choose(file,file.name);}}/>{value&&<button className="studio-text-button" type="button" disabled={disabled||busy} onClick={()=>onChange(null)}>Batalkan pilihan</button>}</div>
  <p className="kk-cover-source-info">JPG, PNG, WebP · maksimum 15 MiB dan 20 megapiksel. Berkas asli tetap privat.</p>
  {busy&&<div role="status" className="studio-muted">Memeriksa dan menyiapkan gambar… <button type="button" className="studio-text-button" onClick={()=>{controller.current?.abort();setBusy(false);busyChange.current?.(false);}}>Batal</button></div>}
  {error&&<p className="studio-error" role="alert">{error}</p>}
  {value&&<fieldset disabled={disabled||busy}>
   <p className="kk-cover-source-info">{value.name}<br/>{value.info.width} × {value.info.height} px · {ratioLabel(value.width,value.height)} · {(value.original.size/1024/1024).toFixed(2)} MiB<br/>{imageAdvice(value)}</p>
   <div className="kk-cover-modes" role="group" aria-label="Cara menampilkan sampul"><button type="button" aria-pressed={settings.mode==='contain'} onClick={()=>set({mode:'contain'})}>Tampilkan utuh</button><button type="button" aria-pressed={settings.mode==='crop'} onClick={()=>set({mode:'crop'})}>Penuhi bingkai</button></div>
   <div className="kk-cover-toolbar"><button type="button" className="studio-light-button" onClick={()=>void choose(value.original,value.name,{...settings,rotation:((settings.rotation+90)%360) as CoverSettings['rotation'],x:.5,y:.5})}><BrandIcon name="rotate" size={16}/> Putar 90°</button><button type="button" className="studio-light-button" onClick={()=>settings.rotation?void choose(value.original,value.name,DEFAULT_COVER):set(DEFAULT_COVER)}><BrandIcon name="restore" size={16}/> Reset</button></div>
   {settings.mode==='crop'&&rect&&<>
    <div className="kk-cover-crop" tabIndex={0} role="group" aria-label="Geser area sampul. Gunakan tombol panah atau penggeser posisi." onPointerDown={e=>{if(disabled)return;const box=e.currentTarget.getBoundingClientRect();drag.current={x:e.clientX,y:e.clientY,s:settings,width:box.width,height:box.height};e.currentTarget.setPointerCapture(e.pointerId);}} onPointerMove={move} onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}} onKeyDown={e=>{const n=.025;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();set({x:Math.max(0,Math.min(1,settings.x+(e.key==='ArrowRight'?n:e.key==='ArrowLeft'?-n:0))),y:Math.max(0,Math.min(1,settings.y+(e.key==='ArrowDown'?n:e.key==='ArrowUp'?-n:0)))});}}}>
     <img src={sourceURL} alt="Area sampul yang akan tampil di katalog" draggable={false} style={{width:`${value.width/rect.width*100}%`,height:`${value.height/rect.height*100}%`,left:`${-rect.x/rect.width*100}%`,top:`${-rect.y/rect.height*100}%`}}/>
    </div>
    <details className="kk-cover-crop-overview"><summary>Lihat area yang terpotong</summary><svg viewBox={`0 0 ${value.width} ${value.height}`} role="img" aria-label="Gambar utuh; area redup tidak tampil di katalog"><image href={sourceURL} width={value.width} height={value.height}/><path fill="black" opacity=".55" fillRule="evenodd" d={`M0 0H${value.width}V${value.height}H0Z M${rect.x} ${rect.y}h${rect.width}v${rect.height}h${-rect.width}Z`}/><rect x={rect.x} y={rect.y} width={rect.width} height={rect.height} fill="none" stroke="white" strokeWidth={Math.max(value.width,value.height)/200}/></svg><p className="kk-cover-source-info">Area redup tidak tampil di katalog.</p></details>
    <p className="kk-cover-source-info">Geser gambar untuk menentukan potongan katalog. Pada detail cerita, gambar tetap utuh.</p>
    <label className="kk-cover-range">Pembesaran<input aria-label="Pembesaran sampul" type="range" min="1" max="4" step=".01" value={settings.zoom} onChange={e=>set({zoom:Number(e.target.value)})}/></label>
    <label className="kk-cover-range">Kiri / kanan<input aria-label="Posisi horizontal sampul" type="range" min="0" max="1" step=".01" value={settings.x} onChange={e=>set({x:Number(e.target.value)})}/></label>
    <label className="kk-cover-range">Atas / bawah<input aria-label="Posisi vertikal sampul" type="range" min="0" max="1" step=".01" value={settings.y} onChange={e=>set({y:Number(e.target.value)})}/></label>
   </>}
   <h3>Hasil yang akan terlihat</h3>
   <div className="kk-cover-previews"><figure><Cover book={previewBook}/><figcaption>Katalog</figcaption></figure><figure><Cover book={{...previewBook,cover_url:sourceURL,cover_manifest:sourceURL?{version:sourceURL,mode:settings.mode,card:[],detail:{url:sourceURL,width:value.width,height:value.height,bytes:value.normalized.size,mime:'image/png'}}:null}} context="detail"/><figcaption>Detail cerita · utuh</figcaption></figure><figure><Cover book={previewBook} size="mini"/><figcaption>Daftar Studio</figcaption></figure></div>
  </fieldset>}
 </section>;
}
