import {Image} from './test-utils/image-fixture.mjs';
import {mkdirSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
mkdirSync('qa/v73',{recursive:true});const image=new Image(1600,1600);image.fill((x,y)=>((x%256)<<24|((y%256)<<16)|(((x+y)%256)<<8)|255)>>>0);writeFileSync('qa/v73/edge-input.png',await image.encode());
for(const args of [
 ['check','--node-modules-dir=manual','--no-lock','supabase/functions/cover-assets/index.ts'],
 ['run','--node-modules-dir=manual','--no-lock','--allow-env','--allow-read=qa/v73/edge-input.png','scripts/test-v73-deno.ts'],
]){const result=spawnSync(process.platform==='win32'?'npm.cmd':'npm',['exec','--yes','--package=deno@2.9.6','--','deno',...args],{stdio:'inherit'});if(result.status!==0)process.exit(result.status||1);}
