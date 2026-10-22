import {useEffect,useRef,useState} from 'react';
import {manageItems,type ManagementOperation} from '../../../data/management';
export default function ManagementDialog({operation,description,onClose,onDone}:{operation:ManagementOperation;description?:string;onClose:()=>void;onDone:(message:string)=>Promise<void>}) {
  const dialog=useRef<HTMLDialogElement>(null),[confirmation,setConfirmation]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const verb=operation.action==='delete'?'Hapus permanen':operation.action==='restore'?'Pulihkan':'Pindahkan ke Sampah';
  const target=operation.action==='delete'?'HAPUS PERMANEN':operation.action==='trash'?'HAPUS':'PULIHKAN';
  useEffect(()=>{const opener=document.activeElement as HTMLElement|null;dialog.current?.showModal();return ()=>{dialog.current?.close();opener?.focus();};},[]);
  const commit=async()=>{
    if(busy||confirmation!==target)return;setBusy(true);setError('');
    try {const result=await manageItems(operation);await onDone(`${result.count} item berhasil ${operation.action==='restore'?'dipulihkan sebagai privat/draf':operation.action==='delete'?'dihapus permanen':'dipindahkan ke Sampah'}.${result.cleanup_queued?' Sampul masuk antrean pembersihan server.':''}`);}
    catch(e){setError(`${e instanceof Error?e.message:String(e)} Pilihan dan identitas operasi tetap sama saat mencoba lagi.`);}
    finally{setBusy(false);}
  };
  return <dialog ref={dialog} className="kk-v75-dialog" aria-labelledby="management-title" onCancel={e=>{e.preventDefault();if(!busy)onClose();}}>
    <h2 id="management-title">{verb} {operation.items.length} item?</h2><p>{description}</p>
    <ul className="kk-v75-targets">{operation.items.slice(0,8).map(item=><li key={`${item.kind}:${item.id}`}>{item.title}</li>)}</ul>{operation.items.length>8&&<p>Dan {operation.items.length-8} item lainnya.</p>}
    <p>{operation.action==='delete'?'Isi dan revisi item terpilih akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.':operation.action==='restore'?'Novel tetap privat. Bab yang dipulihkan tetap draf.':'Novel langsung disembunyikan dari publik dan dapat dipulihkan melalui Sampah.'}</p>
    <label className="studio-label">Ketik {target} untuk mengonfirmasi<input autoFocus autoComplete="off" value={confirmation} onChange={e=>setConfirmation(e.target.value)} disabled={busy}/></label>
    {error&&<p role="alert" className="studio-error">{error}</p>}<div className="kk-v75-actions"><button type="button" className="studio-light-button" disabled={busy} onClick={onClose}>Batal</button><button type="button" className={operation.action==='restore'?'studio-primary':'v51-permanent-button'} disabled={busy||confirmation!==target} onClick={()=>void commit()}>{busy?'Memproses…':error?'Coba lagi':verb}</button></div>
  </dialog>;
}
