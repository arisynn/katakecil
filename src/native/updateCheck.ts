export type ApkUpdate={packageId:string;versionCode:number;versionName:string;url:string;sha256:string;size:number;releaseNotes:string[]};
export const updateManifestUrl=import.meta.env.VITE_ANDROID_UPDATE_URL||'https://katakecil.vercel.app/downloads/latest.json';
export function parseApkUpdate(value:unknown,manifestUrl:string,packageId:string):ApkUpdate|null{
 try{
  const v=value as ApkUpdate,manifest=new URL(manifestUrl),url=new URL(v.url,manifest);
  if(manifest.protocol!=='https:'||url.protocol!=='https:'||url.origin!==manifest.origin||url.username||url.password||!url.pathname.endsWith('.apk')||v.packageId!==packageId||!Number.isSafeInteger(v.versionCode)||v.versionCode<1||v.versionCode>2147483647||typeof v.versionName!=='string'||v.versionName.length>64||!/^[0-9a-f]{64}$/.test(v.sha256)||!Number.isSafeInteger(v.size)||v.size<1||v.size>250000000)return null;
  return {...v,url:url.href,releaseNotes:Array.isArray(v.releaseNotes)?v.releaseNotes.filter(note=>typeof note==='string').slice(0,3).map(note=>note.slice(0,120)):[]};
 }catch{return null;}
}
export async function latestApk(packageId:string){
 const response=await fetch(updateManifestUrl,{cache:'no-store',credentials:'omit',redirect:'error',signal:AbortSignal.timeout(8000)});
 if(!response.ok)throw Error('Pemeriksaan pembaruan belum tersedia. Coba lagi nanti.');
 const update=parseApkUpdate(await response.json(),updateManifestUrl,packageId);
 if(!update)throw Error('Informasi pembaruan belum valid. Coba lagi nanti.');return update;
}
