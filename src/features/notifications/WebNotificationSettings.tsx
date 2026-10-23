import {useEffect,useState} from 'react';
import BrandIcon from '../../components/BrandIcon';
import {useReaderDialogFocus} from '../../hooks/useReaderDialogFocus';
import {disableWebPush,enableWebPush,getWebPushState,type WebPushState} from './webPush';
export default function WebNotificationSettings({onClose}:{onClose:()=>void}){
 const [state,setState]=useState<WebPushState|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const ref=useReaderDialogFocus<HTMLElement>(()=>{if(!busy)onClose();});
 useEffect(()=>{let active=true;void getWebPushState().then(result=>{if(active)setState(result);}).catch(()=>{if(active)setError('Pilihan notifikasi belum dapat dimuat.');});return()=>{active=false;};},[]);
 const toggle=async()=>{if(busy||!state)return;setBusy(true);setError('');try{if(state.enabled)await disableWebPush();else if(state.publicKey)await enableWebPush(state.publicKey);setState(await getWebPushState());}catch(e){setError(e instanceof Error?e.message:'Pilihan belum dapat disimpan.');setState(await getWebPushState());}finally{setBusy(false);}};
 return <div className="crystal-dialog-scrim" onClick={()=>{if(!busy)onClose();}}><section ref={ref} className="crystal-dialog" role="dialog" aria-modal="true" aria-labelledby="web-notification-title" onClick={e=>e.stopPropagation()}>
  <header className="notification-heading"><BrandIcon name="bell" size={20}/><h2 id="web-notification-title">Notifikasi web</h2><button type="button" className="dialog-close" disabled={busy} onClick={onClose} aria-label="Tutup notifikasi web"><BrandIcon name="close" size={18}/></button></header>
  {!state?<p role="status">Memuat pilihan…</p>:!state.supported?<p className="web-push-state">Browser ini belum mendukung notifikasi web. Kamu tetap bisa membaca di sini.</p>:<>
   <div className="crystal-notification-row"><label className="notification-option"><span><strong>Kabar episode baru</strong><small>Kabar dari Library, langsung ke browser yang kamu izinkan.</small></span><input type="checkbox" aria-label="Aktifkan notifikasi web" checked={state.enabled} disabled={busy||(!state.available&&!state.enabled)||(state.permission==='denied'&&!state.enabled)} onChange={()=>void toggle()}/></label></div>
   {!state.available&&<p>Notifikasi web belum diaktifkan pengelola.</p>}
   {state.permission==='denied'&&<p>Izin diblokir. Ubah izin notifikasi situs lewat pengaturan browser.</p>}
   <p>Pengiriman mengikuti koneksi, browser, dan jadwal pemeriksaan episode baru. Kamu bisa mematikannya kapan saja.</p>
  </>}
  {error&&<p role="alert">{error}</p>}<div className="crystal-notification-actions"><button type="button" className="crystal-primary" disabled={busy} onClick={onClose}>Selesai</button></div>
 </section></div>;
}
