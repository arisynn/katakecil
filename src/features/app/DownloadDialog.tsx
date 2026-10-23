import BrandIcon from '../../components/BrandIcon';
import {useReaderDialogFocus} from '../../hooks/useReaderDialogFocus';

const configured=import.meta.env.VITE_ANDROID_APK_URL?.trim();
export const apkUrl=configured&&(configured.startsWith('https://')||/^\/(?!\/)/.test(configured))?configured:'/downloads/KataKecil.apk';
export default function DownloadDialog({onClose}:{onClose:()=>void}){
 const ref=useReaderDialogFocus<HTMLElement>(onClose);
 return <div className="crystal-dialog-scrim" onClick={onClose}><section ref={ref} className="crystal-dialog download-dialog" role="dialog" aria-modal="true" aria-labelledby="download-title" onClick={event=>event.stopPropagation()}>
  <button type="button" className="dialog-close" aria-label="Tutup unduhan aplikasi" onClick={onClose}><BrandIcon name="close" size={18}/></button>
  <div className="download-heading"><img src="/brand/app-icon.png" width="52" height="52" alt=""/><div><span>KATAKECIL UNTUK ANDROID</span><h2 id="download-title">Cerita lebih dekat.</h2></div></div>
  <p>Baca lebih nyaman di aplikasi, dengan tampilan penuh dan pengingat membaca.</p>
  <a className="download-apk" href={apkUrl} download="KataKecil.apk"><BrandIcon name="download" size={18}/>Unduh APK Android<BrandIcon name="arrow-right" size={17}/></a>
  <button type="button" className="download-later" onClick={onClose}>Tetap membaca di web</button>
  <small>APK untuk Android 7+. Cerita tetap memerlukan internet.</small>
 </section></div>;
}
