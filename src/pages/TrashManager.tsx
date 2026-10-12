import React,{useEffect,useState} from 'react';
import {ArchiveRestore,BookOpen,RefreshCw,Trash2} from 'lucide-react';
import {loadTrash,restoreItem,type TrashIndex} from '../data/trash';
const toError=(e:unknown)=>e instanceof Error?e.message:String(e);
export default function TrashManager({onChanged}:{onChanged:()=>Promise<void>}){
 const [items,setItems]=useState<TrashIndex>({books:[],episodes:[],sections:[]});
 const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [message,setMessage]=useState('');
 const reload=async()=>{setBusy(true);try{setItems(await loadTrash());setError('');}catch(e){setError(`${toError(e)}. Jalankan migrasi V5 dahulu.`)}finally{setBusy(false);}};
 useEffect(()=>{void reload()},[]);
 const restore=async(kind:'book'|'episode'|'section',id:string)=>{
  if(!window.confirm('Pulihkan sebagai privat/draft? Konten tidak akan langsung terbit.'))return;
  setBusy(true);setError('');setMessage('');
  try{await restoreItem(kind,id);await onChanged();setItems(await loadTrash());setMessage('Dipulihkan. Status publikasi tetap privat/draft.');}
  catch(e){setError(toError(e));}finally{setBusy(false);}
 };
 const blocks=[{kind:'book' as const,title:'Novel',records:items.books},{kind:'episode' as const,title:'Episode',records:items.episodes},{kind:'section' as const,title:'Halaman buku',records:items.sections}];
 return <><div className="studio-page-head"><span className="studio-kicker">PEMULIHAN NASKAH · V5</span><h1>Ruang <i>Sampah.</i></h1><p>Konten di sini belum dihapus permanen. Pulihkan tanpa menerbitkannya kembali secara otomatis.</p></div>
 <div className="v5-trash-actions"><button className="studio-light-button" onClick={()=>void reload()} disabled={busy}><RefreshCw size={16}/> Muat ulang</button></div>
 {error&&<div className="studio-error" role="alert">{error}</div>}{message&&<div className="studio-success" role="status">{message}</div>}
 {blocks.map(group=><section className="studio-panel" key={group.kind}><div className="studio-panel-top"><h2>{group.title}</h2><span className="v3-counter">{group.records.length}</span></div>
  {group.records.length?group.records.map(item=><div key={item.id} className="v5-trash-row"><Trash2 size={17}/><div><strong>{item.title}</strong><small>{new Date(item.deleted_at).toLocaleString('id-ID',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Jakarta'})} WIB</small></div><button disabled={busy} className="studio-light-button" onClick={()=>void restore(group.kind,item.id)}><ArchiveRestore size={16}/> Pulihkan</button></div>):<p className="studio-muted">Tidak ada {group.title.toLowerCase()} di Sampah.</p>}
 </section>)}
 <p className="studio-footnote"><BookOpen size={15}/> Memulihkan episode tidak mengembalikan jadwal sebelumnya. Atur jadwal baru melalui Studio jika diperlukan.</p></>;
}
