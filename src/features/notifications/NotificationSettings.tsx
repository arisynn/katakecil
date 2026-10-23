import {useEffect,useState} from 'react';
import {useReaderDialogFocus} from '../../hooks/useReaderDialogFocus';
import BrandIcon from '../../components/BrandIcon';
import type * as NativeNotifications from '../../native/notifications';

export default function NotificationSettings({onClose}:{onClose:()=>void}){
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const ref=useReaderDialogFocus<HTMLElement>(()=>{if(!busy)onClose();});
 const [reminder,setReminder]=useState(false),[chapters,setChapters]=useState(false),[time,setTime]=useState('20:00'),[allowed,setAllowed]=useState(true);
 useEffect(()=>{let active=true;void import('../../native/notifications').then(m=>m.getNotificationSettings()).then(s=>{if(active){setReminder(s.reminder);setChapters(s.chapters);setTime(s.time);setAllowed(s.allowed);}}).catch(()=>{if(active)setError('Pengaturan notifikasi belum dapat dimuat.');}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[]);
 const run=async(action:(api:typeof NativeNotifications)=>Promise<void>,message:string)=>{
  if(busy)return;setBusy(true);setError('');setNotice('');
  try{const api=await import('../../native/notifications');await action(api);const s=await api.getNotificationSettings();setReminder(s.reminder);setChapters(s.chapters);setAllowed(s.allowed);setNotice(message);}
  catch(e){setError(e instanceof Error?e.message:'Notifikasi belum dapat diatur.');}finally{setBusy(false);}
 };
 return <div className="crystal-dialog-scrim" onClick={()=>{if(!busy)onClose();}}><section ref={ref} className="crystal-dialog" role="dialog" aria-modal="true" aria-labelledby="notification-title" aria-busy={loading||busy} onClick={e=>e.stopPropagation()}>
  <header className="notification-heading"><BrandIcon name="bell" size={20}/><h2 id="notification-title">Notifikasi</h2><button type="button" disabled={busy} className="dialog-close" aria-label="Tutup notifikasi" onClick={onClose}><BrandIcon name="close" size={18}/></button></header>
  {loading?<p role="status">Memuat pengaturan…</p>:<>
   {!allowed&&<p>Notifikasi belum diizinkan. Android akan meminta izin ketika kamu mengaktifkan salah satu pilihan.</p>}
   <div className="crystal-notification-row"><label className="notification-option"><span><strong>Pengingat membaca</strong><small>Satu pengingat setiap hari.</small></span><input type="checkbox" aria-label="Aktifkan pengingat" disabled={busy} checked={reminder} onChange={e=>{const next=e.target.checked;void run(api=>api.saveReminder(next,time),next?'Pengingat membaca diaktifkan.':'Pengingat membaca dimatikan.');}}/></label>{reminder&&<div className="notification-time"><input type="time" aria-label="Waktu pengingat membaca" disabled={busy} value={time} onChange={e=>setTime(e.target.value)}/><button type="button" disabled={busy} onClick={()=>void run(api=>api.saveReminder(true,time),'Waktu pengingat disimpan.')}>Simpan waktu</button></div>}</div>
   <div className="crystal-notification-row"><label className="notification-option"><span><strong>Kabar bab baru</strong><small>Diperiksa berkala saat online. Android dapat menunda pemberitahuan.</small></span><input type="checkbox" aria-label="Aktifkan kabar bab baru" disabled={busy} checked={chapters} onChange={e=>{const next=e.target.checked;void run(api=>api.setChapterAlerts(next),next?'Kabar bab baru diaktifkan. Pemeriksaan pertama menyiapkan Library tanpa mengirim kabar lama.':'Kabar bab baru dimatikan.');}}/></label></div>
   <div className="crystal-notification-actions"><button type="button" disabled={busy} onClick={()=>void run(api=>api.sendTestNotification(),'Notifikasi percobaan dikirim. Periksa panel notifikasi Android.')}>Coba notifikasi</button><button type="button" className="crystal-primary" disabled={busy} onClick={onClose}>Selesai</button></div>
  </>}
  {error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
 </section></div>;
}
