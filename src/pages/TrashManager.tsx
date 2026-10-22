import ManagementDialog from '../features/studio/components/ManagementDialog';
import type {ManagementOperation,BulkItem} from '../data/management';
import BrandIcon from '../components/BrandIcon';
import React, { useEffect, useState } from 'react';
import { loadTrash, restoreItem, permanentlyDeleteItem, type TrashIndex, type TrashRecord } from '../data/trash';
const toError = (e: unknown) => e instanceof Error ? e.message : String(e);
type Kind = 'book' | 'episode' | 'section';
type Pending = {
    kind: Kind;
    item: TrashRecord;
};
export default function TrashManager({ onChanged }: {
    onChanged: () => Promise<void>;
}) {
    const [selected,setSelected]=useState<string[]>([]),[bulk,setBulk]=useState<ManagementOperation|null>(null);
    const [items, setItems] = useState<TrashIndex>({ books: [], episodes: [], sections: [] });
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [pending, setPending] = useState<Pending | null>(null);
    const [confirmation, setConfirmation] = useState('');
    const reload = async () => { setBusy(true); try {
        setItems(await loadTrash());
        setError('');
    }
    catch (e) {
        setError(`${toError(e)}. Pastikan migrasi V5 terpasang.`);
    }
    finally {
        setBusy(false);
    } };
    useEffect(() => { void reload(); }, []);
    const restore = async (kind: Kind, id: string) => {
        if (!window.confirm('Pulihkan sebagai privat/draft? Konten tidak akan langsung terbit.'))
            return;
        setBusy(true);
        setError('');
        setMessage('');
        try {
            await restoreItem(kind, id);
            await onChanged();
            setItems(await loadTrash());
            setMessage('Dipulihkan. Status publikasi tetap privat/draft.');
        }
        catch (e) {
            setError(toError(e));
        }
        finally {
            setBusy(false);
        }
    };
    const askDelete = (kind: Kind, item: TrashRecord) => { setPending({ kind, item }); setConfirmation(''); setMessage(''); setError(''); };
    const doDelete = async () => {
        if (!pending || busy || confirmation !== pending.item.title)
            return;
        const { kind, item } = pending;
        setBusy(true);
        setError('');
        setMessage('');
        try {
            const result = await permanentlyDeleteItem(kind, item.id, confirmation);
            setPending(null);
            setConfirmation('');
            try {
                await onChanged();
            }
            catch { /* Local Trash list will still refresh. */ }
            setItems(await loadTrash());
            setMessage(`“${item.title}” berhasil dihapus permanen dari database.${result.storage_cleanup_required ? ' Berkas sampul di Storage, jika ada, perlu dibersihkan terpisah.' : ''}`);
        }
        catch (e) {
            setError(toError(e));
        }
        finally {
            setBusy(false);
        }
    };
    const blocks = [{ kind: 'book' as const, title: 'Novel', records: items.books }, { kind: 'episode' as const, title: 'Episode', records: items.episodes }, { kind: 'section' as const, title: 'Halaman buku', records: items.sections }];
    const allItems:BulkItem[]=blocks.flatMap(g=>g.records.map(r=>({kind:g.kind,id:r.id,title:r.title})));
    const picked=allItems.filter(r=>selected.includes(`${r.kind}:${r.id}`));
    const openBulk=(action:ManagementOperation['action'],targets:BulkItem[])=>{if(targets.length)setBulk({id:crypto.randomUUID(),action,items:targets});};
    return <><div className="studio-page-head"><span className="studio-kicker">PENGELOLAAN NASKAH · V7.5</span><h1>Ruang <i>Sampah.</i></h1><p>Pilih beberapa item untuk dipulihkan, atau kosongkan Sampah dengan konfirmasi. Hapus permanen tidak bisa dibatalkan.</p></div>
 <div className="v5-trash-actions"><button className="studio-light-button" onClick={() => void reload()} disabled={busy}><BrandIcon name="refresh" size={16}/> Muat ulang</button></div>
 {error && <div className="studio-error" role="alert">{error}</div>}{message && <div className="studio-success" role="status">{message}</div>}
 {allItems.length>0&&<div className="kk-v75-bulk-bar"><button type="button" className="studio-light-button" disabled={busy} onClick={()=>setSelected(allItems.map(i=>`${i.kind}:${i.id}`))}>Pilih semua ({allItems.length})</button><button type="button" className="studio-light-button" disabled={!picked.length||busy} onClick={()=>setSelected([])}>Batal pilih</button><button type="button" className="studio-light-button" disabled={!picked.length||busy} onClick={()=>openBulk('restore',picked)}>Pulihkan terpilih ({picked.length})</button><button type="button" className="v51-permanent-button" disabled={!picked.length||busy} onClick={()=>openBulk('delete',picked)}>Hapus permanen terpilih</button><button type="button" className="v51-permanent-button" disabled={busy} onClick={()=>openBulk('delete',allItems)}>Kosongkan Sampah</button></div>}
 {blocks.map(group => <section className="studio-panel" key={group.kind}><div className="studio-panel-top"><h2>{group.title}</h2><span className="v3-counter">{group.records.length}</span></div>
  {group.records.length ? group.records.map(item => <div key={item.id} className="v5-trash-row"><input type="checkbox" aria-label={`Pilih ${item.title} di Sampah`} checked={selected.includes(`${group.kind}:${item.id}`)} disabled={busy} onChange={e=>setSelected(prev=>e.target.checked?[...prev,`${group.kind}:${item.id}`]:prev.filter(id=>id!==`${group.kind}:${item.id}`))}/><BrandIcon name="delete" size={17}/><div><strong>{item.title}</strong><small>{new Date(item.deleted_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' })} WIB</small></div><div className="v51-row-actions"><button disabled={busy} className="studio-light-button" onClick={() => void restore(group.kind, item.id)}><BrandIcon name="restore" size={16}/> Pulihkan</button><button disabled={busy} className="v51-permanent-button" onClick={() => askDelete(group.kind, item)}><BrandIcon name="delete" size={15}/> Hapus permanen</button></div></div>) : <p className="studio-muted">Tidak ada {group.title.toLowerCase()} di Sampah.</p>}
 </section>)}
 <p className="studio-footnote"><BrandIcon name="book-open" size={15}/> Memulihkan episode tidak mengembalikan jadwal sebelumnya. Penghapusan permanen novel menghapus semua episode dan halaman buku miliknya, termasuk riwayat impor dan jadwal.</p>
 {bulk&&<ManagementDialog operation={bulk} onClose={()=>{setBulk(null);void reload();}} onDone={async notice=>{await onChanged();setItems(await loadTrash());setSelected([]);setMessage(notice);setBulk(null);}}/>}
 {pending && <div className="v51-modal-overlay" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget && !busy)
            setPending(null); }}>
  <section role="dialog" aria-modal="true" aria-labelledby="v51-modal-title" className="v51-confirm-modal">
   <div className="v51-confirm-title"><BrandIcon name="alert" size={22}/><h2 id="v51-modal-title">Hapus permanen?</h2><button className="v51-close" aria-label="Batal" onClick={() => setPending(null)} disabled={busy}><BrandIcon name="close" size={18}/></button></div>
   <p>Item <strong>{pending.item.title}</strong> akan dihapus dari database dan <strong>tidak dapat dipulihkan</strong>.</p>
   {pending.kind === 'book' && <p className="v51-delete-warning">Seluruh episode, halaman buku, riwayat impor dan pengaturan jadwal novel ini juga akan dihapus. Sampul di Storage perlu dibersihkan secara terpisah.</p>}
   <label className="studio-label" htmlFor="v51-confirm-input">Ketik judul persis untuk mengonfirmasi:
    <strong className="v51-confirm-target">{pending.item.title}</strong>
    <input id="v51-confirm-input" autoComplete="off" spellCheck={false} value={confirmation} onChange={e => setConfirmation(e.target.value)} disabled={busy} placeholder="Ketik judul di sini"/>
   </label>
   <div className="v51-confirm-actions"><button className="studio-light-button" onClick={() => setPending(null)} disabled={busy}>Batal</button><button className="v51-permanent-button" disabled={busy || confirmation !== pending.item.title} onClick={() => void doDelete()}>{busy ? 'Menghapus…' : 'Ya, hapus permanen'}</button></div>
  </section>
 </div>}
 </>;
}
