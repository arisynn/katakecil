import {useEffect,useState} from 'react';
import {App} from '@capacitor/app';
import {Browser} from '@capacitor/browser';
import {isNativeApp} from './platform';
import {latestApk,type ApkUpdate} from './updateCheck';
import {useReaderDialogFocus} from '../hooks/useReaderDialogFocus';
import BrandIcon from '../components/BrandIcon';

function UpdateDialog({update,onClose}:{update:ApkUpdate;onClose:()=>void}){
 const [error,setError]=useState('');const ref=useReaderDialogFocus<HTMLElement>(onClose);
 return <div className="crystal-dialog-scrim" onClick={onClose}><section ref={ref} className="crystal-dialog update-dialog" role="dialog" aria-modal="true" aria-labelledby="apk-update-title" onClick={event=>event.stopPropagation()}>
  <header className="notification-heading"><BrandIcon name="download" size={21}/><h2 id="apk-update-title">Pembaruan tersedia</h2><button type="button" className="dialog-close" aria-label="Tutup pembaruan" onClick={onClose}><BrandIcon name="close" size={18}/></button></header>
  <p>Versi {update.versionName} · {(update.size/1048576).toFixed(1)} MB</p>
  {update.releaseNotes.length>0&&<ul>{update.releaseNotes.map((note,i)=><li key={i}>{note}</li>)}</ul>}
  <p>Unduh APK terbaru, lalu setujui pembaruan di Android. Tidak perlu menghapus aplikasi sebelumnya.</p>
  {error&&<p role="alert">{error}</p>}
  <div className="crystal-notification-actions"><button type="button" onClick={onClose}>Nanti</button><button type="button" className="crystal-primary" onClick={()=>void Browser.open({url:update.url}).then(onClose).catch(()=>setError('Unduhan belum dapat dibuka. Periksa koneksi lalu coba lagi.'))}>Unduh pembaruan</button></div>
 </section></div>;
}
export default function NativeUpdatePrompt(){
 const [candidate,setCandidate]=useState<ApkUpdate|null>(null),[visible,setVisible]=useState(false),[notice,setNotice]=useState('');
 useEffect(()=>{
  if(!isNativeApp)return;let active=true,busy=false;
  const check=async(manual=false)=>{
   if(busy)return;try{if(!manual&&Date.now()-Number(localStorage.getItem('kk-apk-last-check')||0)<6*3600000)return;}catch{}
   busy=true;if(manual)setNotice('Memeriksa pembaruan…');
   try{
    const info=await App.getInfo(),update=await latestApk(info.id);if(!active)return;
    try{localStorage.setItem('kk-apk-last-check',String(Date.now()));}catch{}
    if(update.versionCode>Number(info.build)){
     let dismissed=false;try{dismissed=Date.now()-Number(localStorage.getItem(`kk-apk-later-${update.versionCode}`)||0)<86400000;}catch{}
     if(manual||!dismissed){setCandidate(update);if(manual)setVisible(true);}setNotice('');
    }else if(manual)setNotice('KataKecil sudah menggunakan versi terbaru.');
   }catch(e){if(active&&manual)setNotice(e instanceof Error?e.message:'Pembaruan belum dapat diperiksa.');}finally{busy=false;}
  };
  const manual=()=>void check(true),automatic=()=>void check();
  window.addEventListener('kk:check-update',manual);window.addEventListener('kk:app-active',automatic);void check();
  return()=>{active=false;window.removeEventListener('kk:check-update',manual);window.removeEventListener('kk:app-active',automatic);};
 },[]);
 useEffect(()=>{
  if(!candidate||visible)return;
  const timer=window.setInterval(()=>{if(document.visibilityState==='visible'&&location.pathname==='/'&&!document.querySelector('[role=dialog]')&&!document.querySelector('.crystal-startup'))setVisible(true);},800);
  return()=>window.clearInterval(timer);
 },[candidate,visible]);
 if(!isNativeApp)return null;
 const close=()=>{if(candidate)try{localStorage.setItem(`kk-apk-later-${candidate.versionCode}`,String(Date.now()));}catch{}setVisible(false);setCandidate(null);};
 return <>{visible&&candidate&&<UpdateDialog update={candidate} onClose={close}/>} {notice&&<div role="status" className="kk-pwa-notice">{notice}<button type="button" onClick={()=>setNotice('')}>Tutup</button></div>}</>;
}
