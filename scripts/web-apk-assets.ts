import {copyFileSync,existsSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import type {Plugin} from 'vite';
/** The website hosts the APK; Android builds must never embed another APK. */
export function webApkAssets(mode:string):Plugin{
 let output='';return {name:'katakecil-web-apk',configResolved(config){output=config.build.outDir;},closeBundle(){
  if(mode==='android')return;
  if(!existsSync('releases/KataKecil.apk')||!existsSync('releases/latest.json')){console.warn('APK download assets not staged. Run npm run release:web after compiling Android.');return;}
  mkdirSync(resolve(output,'downloads'),{recursive:true});
  for(const name of ['KataKecil.apk','latest.json'])copyFileSync(resolve('releases',name),resolve(output,'downloads',name));
 }};
}
