import {useEffect,useState} from 'react';
import {isNativeApp} from './platform';
/** A short native-only transition. Loading never waits on a network request. */
export default function NativeStartup(){
 const [visible,setVisible]=useState(isNativeApp);
 useEffect(()=>{if(!isNativeApp)return;const timer=window.setTimeout(()=>setVisible(false),1300);return()=>window.clearTimeout(timer);},[]);
 if(!visible)return null;
 return <div className="crystal-startup" aria-hidden="true" onAnimationEnd={e=>{if(e.animationName==='crystal-start-out')setVisible(false);}}><img src="/brand/app-icon.png" width="128" height="128" alt=""/><strong>KataKecil</strong><p>SETIAP CERITA PUNYA RUANG.</p></div>;
}
