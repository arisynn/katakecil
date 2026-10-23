import assert from 'node:assert/strict';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {join,relative} from 'node:path';
import {createHash} from 'node:crypto';
import JSZip from 'jszip';
const sdk=process.env.ANDROID_HOME||process.env.ANDROID_SDK_ROOT;if(!sdk)throw Error('Set ANDROID_HOME.');
const buildTools=readdirSync(join(sdk,'build-tools')).sort((a,b)=>b.localeCompare(a,undefined,{numeric:true})).map(name=>join(sdk,'build-tools',name)).find(path=>existsSync(join(path,'aapt'))&&existsSync(join(path,'apksigner')));
if(!buildTools)throw Error('Android aapt/apksigner required.');
const gradle=readFileSync('android/app/build.gradle','utf8'),version=gradle.match(/versionCode (\d+)/)[1],name=gradle.match(/versionName "([^"]+)"/)[1],root='android/app/src/main/assets/public';
function walk(directory){return readdirSync(directory,{withFileTypes:true}).flatMap(item=>item.isDirectory()?walk(join(directory,item.name)):[join(directory,item.name)]);}
const files=walk(root),config=JSON.parse(readFileSync('android/app/src/main/assets/capacitor.config.json','utf8'));assert.equal(config.appId,'app.katakecil.mobile');assert(!config.server?.url);
for(const kind of ['debug','release']){
 const path=`android/app/build/outputs/apk/${kind}/app-${kind}.apk`,bytes=readFileSync(path),zip=await JSZip.loadAsync(bytes);assert(bytes.length>1_000_000);
 const badging=execFileSync(join(buildTools,'aapt'),['dump','badging',path],{encoding:'utf8'});assert(badging.includes(`package: name='app.katakecil.mobile' versionCode='${version}' versionName='${name}'`));assert.equal(badging.includes('application-debuggable'),kind==='debug');
 const signature=execFileSync(join(buildTools,'apksigner'),['verify','--print-certs',path],{encoding:'utf8'}),digest=signature.match(/Signer #1 certificate SHA-256 digest: ([a-f0-9]+)/)?.[1];assert(digest);
 assert(!Object.keys(zip.files).some(name=>name.startsWith('assets/public/')&&(/\.apk$/i.test(name)||/downloads\/latest\.json$|\.env(?:\.|$)|\.webmanifest$/i.test(name))),'No nested APK/env/PWA manifest');
 for(const file of files){const asset=zip.file('assets/public/'+relative(root,file).replaceAll('\\','/'));assert(asset,'Missing packaged frontend asset');assert((await asset.async('nodebuffer')).equals(readFileSync(file)),'Packaged asset differs from Capacitor sync');}
 for(const file of files.filter(file=>file.endsWith('.js')))assert(!/sb_secret_[A-Za-z0-9_-]+/.test(readFileSync(file,'utf8')),'Privileged key found in frontend');
 console.log(JSON.stringify({kind,path,packageId:config.appId,versionCode:Number(version),versionName:name,size:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),certificateSha256:digest,matchingBundledFiles:files.length,serverUrl:false}));
}
