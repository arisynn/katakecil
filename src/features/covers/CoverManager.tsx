import React,{useEffect,useRef,useState} from 'react';
import BrandIcon from '../../components/BrandIcon';
import {Cover} from '../../components/Cover';
import type {Book} from '../../data/library';
import {useLeaveGuard} from '../../hooks/useLeaveGuard';
import {CoverEditor,type CoverSource} from './CoverEditor';
import {currentCover,downloadCover,listCovers,newCoverOperation,publishCover,saveCover,type CoverUploadOperation} from './api';
import type {CoverAsset,PreparedCover} from './model';
const message=(e:unknown)=>e instanceof Error?e.message:String(e);
export default function CoverManager({book,onChanged}:{book:Book;onChanged:(book:Book)=>void}){
 const [value,setValue]=useState<PreparedCover|null>(null),[source,setSource]=useState<CoverSource|null>(null),[assets,setAssets]=useState<CoverAsset[]>([]),[version,setVersion]=useState(book.cover_version||0),[busy,setBusy]=useState(false),[preparing,setPreparing]=useState(false),[stage,setStage]=useState(''),[error,setError]=useState(''),[notice,setNotice]=useState(''),[latest,setLatest]=useState<CoverAsset|null>(null),[privateURL,setPrivateURL]=useState('');
 const [activeAsset,setActiveAsset]=useState<string|null>(null),[displayBook,setDisplayBook]=useState(book);
 const sourceRequest=useRef(0);
 const operation=useRef<CoverUploadOperation|null>(null),publication=useRef<{asset:string;id:string;version:number}|null>(null),abort=useRef<AbortController|null>(null),alive=useRef(true);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;abort.current?.abort();};},[]);
 useLeaveGuard(Boolean(value)||busy,()=>{if(busy)return false;return window.confirm('Tinggalkan pengaturan sampul yang belum disimpan?');});
 const load=async()=>{try{const [rows,current]=await Promise.all([listCovers(book.id),currentCover(book.id)]);if(alive.current){setAssets(rows);setVersion(current?.version||0);setActiveAsset(current?.asset_id||null);setLatest(rows[0]||null);setDisplayBook(current?.manifest?{...book,cover_manifest:current.manifest,cover_url:current.manifest.card.at(-1)?.url||null}:book);}}catch(e){if(alive.current)setError(message(e));}};
 useEffect(()=>{void load();},[book.id]);
 useEffect(()=>{setPrivateURL('');const path=latest?.manifest?.card[0]?.path;if(!path)return;let active=true,url='';void downloadCover(path).then(blob=>{if(active){url=URL.createObjectURL(blob);setPrivateURL(url);}}).catch(()=>{});return()=>{active=false;if(url)URL.revokeObjectURL(url);};},[latest?.id]);
 const update=(next:PreparedCover|null)=>{sourceRequest.current++;setValue(next);operation.current=null;setNotice('');};
 const save=async()=>{
  if(!value||busy)return;const controller=new AbortController();abort.current=controller;setBusy(true);setError('');setNotice('');
  try{operation.current??=await newCoverOperation(book.id,value);const result=await saveCover(operation.current,controller.signal,setStage);if(!alive.current)return;setValue(null);operation.current=null;setLatest(result);setNotice('Sampul privat tersimpan. Pilih Terbitkan sampul saat sudah siap.');await load();}
  catch(e){if(alive.current)setError(controller.signal.aborted?'Proses dihentikan. Berkas yang sudah terkirim tetap privat; Coba simpan lagi untuk memeriksa hasilnya.':message(e));}
  finally{if(alive.current){setBusy(false);setStage('');}abort.current=null;}
 };
 const publish=async(asset:CoverAsset)=>{
  if(busy)return;
  if((!publication.current||publication.current.asset!==asset.id)&&!window.confirm('Terbitkan sampul ini? Versi yang dioptimalkan akan tersedia melalui URL publik. Berkas asli tetap privat.'))return;
  setBusy(true);setError('');setNotice('');setStage('Menerbitkan sampul…');abort.current=null;
  try{if(!publication.current||publication.current.asset!==asset.id)publication.current={asset:asset.id,id:crypto.randomUUID(),version};const op=publication.current;const result=await publishCover(op.asset,op.version,op.id);publication.current=null;if(!alive.current)return;setVersion(result.version);setActiveAsset(asset.id);onChanged({...book,cover_url:result.manifest.card.at(-1)?.url||null,cover_manifest:result.manifest,cover_version:result.version,studio_cover_path:asset.manifest?.card[0]?.path});setNotice('Sampul berhasil diterbitkan.');await load();}
  catch(e){setError(message(e));}
  finally{if(alive.current){setBusy(false);setStage('');}}
 };
 const edit=async(asset?:CoverAsset)=>{const request=++sourceRequest.current;setError('');try{const path=asset?.source_path||book.private_cover_path;if(!path)return;const data=await downloadCover(path,!asset);if(request===sourceRequest.current&&alive.current)setSource({data,name:asset?.source_name||'Sampul impor sebelumnya',settings:asset?.settings});}catch(e){setError(message(e));}};
 return <section className="studio-panel kk-cover-manager" aria-label="Kelola sampul cerita"><div className="studio-panel-top"><h2>Sampul cerita</h2><BrandIcon name="image-plus" size={20}/></div>
  <div className="kk-cover-previews"><figure><Cover book={displayBook}/><figcaption>Sampul pembaca saat ini</figcaption></figure>{privateURL&&<figure><Cover book={{...book,cover_url:privateURL,cover_manifest:null}}/><figcaption>Versi tersimpan terbaru</figcaption></figure>}</div>
  <CoverEditor value={value} onChange={update} source={source} title={book.title} disabled={busy} onBusy={setPreparing}/>
  {book.private_cover_path&&<button type="button" className="studio-light-button" disabled={busy||preparing} onClick={()=>void edit()}><BrandIcon name="folder" size={16}/> Ambil sampul dari impor sebelumnya</button>}
  {stage&&<p role="status">{stage}</p>}{error&&<p className="studio-error" role="alert">{error}</p>}{notice&&<p className="studio-success" role="status">{notice}</p>}
  <div className="kk-cover-toolbar">{value&&<button type="button" className="studio-primary" disabled={busy||preparing} onClick={()=>void save()}><BrandIcon name="save" size={17}/>{operation.current?'Coba simpan lagi':'Simpan sampul privat'}</button>}{busy&&abort.current&&<button type="button" className="studio-light-button" onClick={()=>abort.current?.abort()}>Hentikan proses</button>}{latest&&!value&&<button type="button" className="studio-primary" disabled={busy||preparing||latest.id===activeAsset} onClick={()=>void publish(latest)}><BrandIcon name="send" size={17}/>{publication.current?'Coba terbitkan lagi':latest.id===activeAsset?'Sampul sedang digunakan':'Terbitkan sampul'}</button>}</div>
  {publication.current&&error&&<button type="button" className="studio-light-button" disabled={busy} onClick={()=>{publication.current=null;void load();setNotice('Status sampul dimuat ulang. Tinjau sebelum menerbitkan kembali.');}}>Muat ulang status sampul</button>}
  <details className="kk-cover-history"><summary>Riwayat sampul ({assets.length})</summary><ul>{assets.map(asset=><li key={asset.id}><span><strong>{asset.source_name}</strong><br/>{new Intl.DateTimeFormat('id-ID',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Jakarta'}).format(new Date(asset.created_at))} WIB · {asset.status==='published'?'Pernah diterbitkan':'Privat'}</span><button type="button" className="studio-light-button" disabled={busy||preparing} onClick={()=>void edit(asset)}>Atur ulang</button><button type="button" className="studio-light-button" disabled={busy||preparing||!!value||asset.id===activeAsset} onClick={()=>void publish(asset)}>{asset.id===activeAsset?'Sedang digunakan':'Gunakan versi ini'}</button></li>)}</ul>{!assets.length&&<p className="studio-muted">Versi sampul tersimpan akan tampil di sini.</p>}</details>
 </section>;
}
