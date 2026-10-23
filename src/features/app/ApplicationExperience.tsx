import {useEffect,useState} from 'react';
import {isNativeApp} from '../../native/platform';
import DownloadDialog from './DownloadDialog';
import {navigate} from '../../utils/nav';

const DISMISSED='kk-apk-prompt-dismissed';
const canOffer=()=>{try{return Date.now()-Number(localStorage.getItem(DISMISSED)||0)>7*86400000;}catch{return false;}};
export default function ApplicationExperience(){
 const [open,setOpen]=useState(false),[offline,setOffline]=useState(!navigator.onLine),[notice,setNotice]=useState('');
 useEffect(()=>{
  const network=()=>{setOffline(!navigator.onLine);document.documentElement.dataset.kkOffline=String(!navigator.onLine);};network();
  const show=()=>{if(isNativeApp)setNotice('KataKecil sudah terpasang di perangkat ini.');else setOpen(true);};
  const suppress=(event:Event)=>event.preventDefault();
  window.addEventListener('online',network);window.addEventListener('offline',network);window.addEventListener('kk:install',show);window.addEventListener('beforeinstallprompt',suppress);
  const timer=window.setTimeout(()=>{if(!isNativeApp&&!location.pathname.startsWith('/studio')&&!location.pathname.startsWith('/baca/')&&canOffer()&&!document.querySelector('[role=dialog]'))setOpen(true);},1800);
  return()=>{window.clearTimeout(timer);window.removeEventListener('online',network);window.removeEventListener('offline',network);window.removeEventListener('kk:install',show);window.removeEventListener('beforeinstallprompt',suppress);};
 },[]);
 useEffect(()=>{
  if(isNativeApp||!import.meta.env.PROD||!('serviceWorker'in navigator))return;
  // Notification delivery only. This worker neither caches nor intercepts pages.
  void navigator.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'}).catch(()=>{});
  const message=(event:MessageEvent)=>{const path=event.data?.path;if(event.data?.type==='KATAKECIL_OPEN_READER'&&typeof path==='string'&&/^\/baca\/[A-Za-z0-9%_-]+(?:\?episode=\d{1,4})?$/.test(path))navigate(path);};
  navigator.serviceWorker.addEventListener('message',message);
  return()=>navigator.serviceWorker.removeEventListener('message',message);
 },[]);
 const close=()=>{setOpen(false);try{localStorage.setItem(DISMISSED,String(Date.now()));}catch{}};
 return <>{offline&&<div className="kk-pwa-banner" role="status">Koneksi terputus. Hubungkan internet untuk membaca atau menyimpan.</div>}{notice&&<div className="kk-pwa-notice" role="status">{notice}<button type="button" onClick={()=>setNotice('')}>Tutup</button></div>}{open&&<DownloadDialog onClose={close}/>}</>;
}
