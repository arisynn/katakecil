import {isNativeApp} from '../../native/platform';
import {useEffect,useRef,useState} from 'react';
import {hasPendingWork,mayLeave} from '../../utils/nav';
import {useReaderDialogFocus} from '../../hooks/useReaderDialogFocus';
type InstallEvent=Event&{prompt:()=>Promise<void>;userChoice:Promise<{outcome:string}>};
function InstallDialog({event,onClose,installed}:{event:InstallEvent|null;onClose:()=>void;installed:boolean}){
  const ref=useReaderDialogFocus<HTMLElement>(onClose);const ios=/iphone|ipad|ipod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  return <div className="kk-pwa-scrim" onClick={onClose}><section ref={ref} className="kk-pwa-dialog" role="dialog" aria-modal="true" aria-labelledby="kk-install-title" onClick={e=>e.stopPropagation()}>
    <img src="/brand/katakecil-icon-192.png" width="56" height="56" alt=""/><h2 id="kk-install-title">{installed?'KataKecil sudah terpasang':'Pasang KataKecil'}</h2>
    <p>Buka dari layar utama dan baca dalam tampilan aplikasi. Cerita tetap membutuhkan koneksi internet.</p>
    {event&&!installed?<button type="button" className="studio-primary" onClick={async()=>{await event.prompt();await event.userChoice;onClose();}}>Pasang aplikasi</button>:!installed&&<p>{ios?'Buka menu Bagikan di browser, pilih Tambah ke Layar Utama, lalu Tambah. Jika pilihan belum tersedia, buka situs ini di Safari.':'Buka menu browser dan pilih Pasang aplikasi atau Tambahkan ke layar utama jika tersedia. Jika memakai browser dalam aplikasi, buka situs ini di browser utama.'}</p>}
    <button type="button" className="studio-light-button" data-reader-autofocus onClick={onClose}>Tutup</button>
  </section></div>;
}
export default function PwaExperience(){
  const [install,setInstall]=useState<InstallEvent|null>(null),[open,setOpen]=useState(false),[offline,setOffline]=useState(!navigator.onLine),[waiting,setWaiting]=useState<ServiceWorker|null>(null),[notice,setNotice]=useState('');
  const [installed,setInstalled]=useState(()=>matchMedia('(display-mode: standalone)').matches||Boolean((navigator as Navigator&{standalone?:boolean}).standalone));
  const others=useRef(new Map<string,{busy:boolean;at:number}>());const reloadAllowed=useRef(false);
  useEffect(()=>{
    const before=(e:Event)=>{e.preventDefault();setInstall(e as InstallEvent);};const done=()=>{setInstalled(true);setInstall(null);};const show=()=>{if(isNativeApp)setNotice('KataKecil sudah terpasang di perangkat ini.');else setOpen(true);};
    const network=()=>{setOffline(!navigator.onLine);document.documentElement.dataset.kkOffline=String(!navigator.onLine);};network();
    window.addEventListener('beforeinstallprompt',before);window.addEventListener('appinstalled',done);window.addEventListener('kk:install',show);window.addEventListener('online',network);window.addEventListener('offline',network);
    return()=>{window.removeEventListener('beforeinstallprompt',before);window.removeEventListener('appinstalled',done);window.removeEventListener('kk:install',show);window.removeEventListener('online',network);window.removeEventListener('offline',network);};
  },[]);
  useEffect(()=>{
    if(!('BroadcastChannel'in window))return;const channel=new BroadcastChannel('kk-work-status');const id=crypto.randomUUID();
    const announce=()=>channel.postMessage({id,busy:hasPendingWork(),at:Date.now()});
    channel.onmessage=e=>{if(typeof e.data?.id==='string'&&typeof e.data?.busy==='boolean')others.current.set(e.data.id,{busy:e.data.busy,at:Date.now()});};
    const timer=setInterval(announce,3000);window.addEventListener('kk:guard-change',announce);announce();
    return()=>{clearInterval(timer);window.removeEventListener('kk:guard-change',announce);channel.postMessage({id,busy:false});channel.close();};
  },[]);
  useEffect(()=>{
    if(isNativeApp||!import.meta.env.PROD||!('serviceWorker'in navigator))return;let active=true;
    const change=()=>{if(reloadAllowed.current)location.reload();};navigator.serviceWorker.addEventListener('controllerchange',change);
    void navigator.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'}).then(reg=>{
      if(!active)return;if(reg.waiting)setWaiting(reg.waiting);
      reg.addEventListener('updatefound',()=>{const worker=reg.installing;worker?.addEventListener('statechange',()=>{if(active&&worker.state==='installed'&&navigator.serviceWorker.controller)setWaiting(worker);});});
      void reg.update().catch(()=>{});
    }).catch(()=>{if(active)setNotice('Pemasangan tetap mengikuti dukungan browser. Pengelola pembaruan belum tersedia.');});
    return()=>{active=false;navigator.serviceWorker.removeEventListener('controllerchange',change);};
  },[]);
  const update=async()=>{
    if([...others.current.values()].some(x=>x.busy&&Date.now()-x.at<12000)){setNotice('Selesaikan pekerjaan di tab KataKecil lain sebelum memperbarui.');return;}
    if(!(await mayLeave())){setNotice('Pembaruan ditunda sampai pekerjaan aman.');return;}
    if(!navigator.onLine){setNotice('Hubungkan internet sebelum memperbarui.');return;}
    reloadAllowed.current=true;waiting?.postMessage({type:'SKIP_WAITING'});
  };
  return <>{offline&&<div className="kk-pwa-banner" role="status">Koneksi terputus. Hubungkan internet untuk membaca atau menyimpan.</div>}
    {waiting&&!offline&&<div className="kk-pwa-banner" role="status">Pembaruan KataKecil tersedia. <button onClick={()=>void update()}>Muat ulang</button><button onClick={()=>setWaiting(null)}>Nanti</button></div>}
    {notice&&<div className="kk-pwa-notice" role="status">{notice}<button onClick={()=>setNotice('')}>Tutup</button></div>}
    {open&&<InstallDialog event={install} installed={installed} onClose={()=>setOpen(false)}/>}</>;
}
