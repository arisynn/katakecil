import {layoutDialog} from './panel-layout.js?v=4';
import {escapeHTML as esc,icon} from './ui.js?v=12';

// Android owns download URLs, checksums, package/signature checks and installer permissions.
export function createAppUpdater(ctx){
 let stage='idle',result=null,error='',progress=0,checkTask=null,downloadTask=null,listener=null,notice='';
 const tr=(en,id)=>ctx.language()==='id'?id:en;
 const panel=()=>document.querySelector('.dialog[data-app-updates]');
 function summary(){return stage==='ready'?tr('Ready to install','Siap dipasang'):result?.update?`${tr('Update','Pembaruan')} ${result.update.version}`:result?.currentVersion||tr('Check for updates','Cek pembaruan');}
 function refreshSummary(){const node=document.querySelector('#app-update-summary');if(node)node.textContent=summary();}
 function content(){
  const update=result?.update,busy=['checking','downloading','installing'].includes(stage);
  const status={idle:tr('Check GitHub Releases for a newer APK.','Cek APK terbaru di GitHub Releases.'),checking:tr('Checking GitHub Releases…','Memeriksa GitHub Releases…'),current:tr('You are using the latest compatible release.','Kamu memakai rilis kompatibel terbaru.'),available:tr('A new version is available.','Versi baru tersedia.'),downloading:tr('Downloading and verifying the APK…','Mengunduh dan memverifikasi APK…'),ready:tr('Update verified and ready to install.','Pembaruan terverifikasi dan siap dipasang.'),installing:tr('Opening Android installation…','Membuka pemasangan Android…'),error:tr('The update could not be completed.','Pembaruan belum dapat diselesaikan.')}[stage];
  return ctx.heading(tr('App updates','Pembaruan aplikasi'))+`<section class="update-summary">${result?`<p class="update-version">${tr('Installed','Terpasang')}: ${esc(result.currentVersion)} · ${result.previewChannel?'Preview':tr('Stable','Stabil')}</p>`:''}<p class="update-state" role="status">${status}</p>${error?`<p class="form-error" role="alert">${esc(error)}</p>`:''}${notice?`<p class="settings-caption">${esc(notice)}</p>`:''}${update?`<p class="update-version">${esc(update.version)}${update.preview?' · Preview':''} · ${(update.size/1024/1024).toFixed(1)} MB</p>`:''}${stage==='downloading'?`<progress class="update-download" max="100" value="${progress}" aria-label="${tr('Download progress','Progres unduhan')}"></progress><output class="update-percent" aria-live="off">${progress}%</output>`:''}<div class="update-actions">${stage==='downloading'?`<button class="secondary" data-action="updates-cancel">${tr('Cancel download','Batalkan unduhan')}</button>`:stage==='ready'||stage==='installing'?`<button class="primary" data-action="updates-install" ${busy?'disabled':''}>${icon('download')}${tr('Install update','Pasang pembaruan')}</button>${error?`<button class="secondary" data-action="updates-download">${tr('Download again','Unduh lagi')}</button>`:''}`:update&&stage==='available'?`<button class="primary" data-action="updates-download">${icon('download')}${tr('Download update','Unduh pembaruan')}</button>`:`<button class="primary" data-action="updates-check" ${busy?'disabled':''}>${icon('refresh')}${tr('Check again','Periksa lagi')}</button>`}</div></section>${update?.notes?`<section class="update-changelog"><h3>${tr('Changes','Perubahan')}</h3><pre class="update-notes">${esc(update.notes)}</pre></section>`:''}<p class="update-privacy">${tr('Only release information is requested from GitHub. Books and reading data stay on your device. Android asks for your confirmation before installing; keep the app installed to preserve your data.','Hanya informasi rilis yang diminta dari GitHub. Buku dan data baca tetap di perangkat. Android meminta konfirmasi sebelum memasang; jangan uninstall aplikasi agar data tetap tersimpan.')}</p>`;
 }
 function render(open=false){
  if(!ctx.enabled)return;let dialog=panel();
  if(!dialog&&open){ctx.show(content());dialog=document.querySelector('.dialog');if(dialog)dialog.dataset.appUpdates='true';}
  else if(dialog)dialog.innerHTML=content();
  layoutDialog(dialog);dialog?.classList.add('compact-settings-dialog');refreshSummary();
 }
 async function check({silent=false}={}){
  if(!ctx.enabled||downloadTask||stage==='installing'||stage==='ready')return;
  if(checkTask)return checkTask;
  if(silent&&Date.now()-Number(ctx.lastCheck?.()||0)<24*60*60*1000)return;
  stage='checking';error='';notice='';render();
  checkTask=(async()=>{try{result=await ctx.api.check();stage=result.update?'available':'current';ctx.saveCheck?.(Date.now());}
   catch(e){stage='error';error=e.message||tr('Check your connection and try again.','Periksa koneksi lalu coba lagi.');}
   finally{checkTask=null;render();}})();
  return checkTask;
 }
 async function download(){
  if(!ctx.enabled||downloadTask||!result?.update||(stage!=='available'&&!(stage==='ready'&&error)))return;
  stage='downloading';error='';notice='';progress=0;render();
  downloadTask=(async()=>{try{
   listener=await ctx.api.addListener('downloadProgress',event=>{if(stage!=='downloading')return;progress=Math.min(100,Math.max(0,Math.round(Number(event.percent)||0)));const bar=panel()?.querySelector('progress'),label=panel()?.querySelector('.update-percent');if(bar)bar.value=progress;if(label)label.textContent=progress+'%';});
   const response=await ctx.api.download();if(!response.ready)throw Error(tr('Update verification did not finish.','Verifikasi pembaruan belum selesai.'));stage='ready';
  }catch(e){stage='error';error=e.message||tr('Download failed. Try again.','Unduhan gagal. Coba lagi.');}
  finally{try{await listener?.remove();}catch{}listener=null;downloadTask=null;render();}})();return downloadTask;
 }
 async function install(){
  if(!ctx.enabled||stage!=='ready')return;stage='installing';error='';notice='';render();
  try{const response=await ctx.api.install();notice=response.permissionRequired?tr('Allow installs from KataKecil in Android Settings, return here, then tap Install update again.','Izinkan pemasangan dari KataKecil di Pengaturan Android, kembali ke sini, lalu ketuk Pasang pembaruan lagi.'):tr('The Android installer has opened. Confirm installation there.','Pemasang Android telah dibuka. Konfirmasikan pemasangan di sana.');}
  catch(e){error=e.message||tr('Unable to open the Android installer.','Pemasang Android tidak dapat dibuka.');}
  finally{stage='ready';render();}
 }
 return{summary,refreshSummary,check,open(){if(!ctx.enabled)return;render(true);if(['idle','error'].includes(stage))void check();},async action(action){switch(action){case 'updates':this.open();return true;case 'updates-check':await check();return true;case 'updates-download':await download();return true;case 'updates-install':await install();return true;case 'updates-cancel':if(downloadTask)await ctx.api.cancel();return true;}return false;}};
}
