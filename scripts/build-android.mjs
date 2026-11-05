import {spawn} from 'node:child_process';
import {readFile,mkdir,copyFile,writeFile,readdir,access} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url));
const version=JSON.parse(await readFile(join(root,'app-version.json'),'utf8'));
if(!/^\d+\.\d+\.\d+(?:-[A-Za-z0-9.-]+)?$/.test(version.version)||!Number.isSafeInteger(version.versionCode)||version.versionCode<1)throw Error('Invalid app-version.json.');
const debug=process.argv.includes('--debug'),output=resolve(process.env.KATAKECIL_OUTPUT_DIR||join(root,'artifacts'));
const env={...process.env};
const java=env.JAVA_HOME?join(env.JAVA_HOME,'bin','java'):'java';
const run=(command,args,cwd=root,overrides={})=>new Promise((resolve,reject)=>{
 const child=spawn(command,args,{cwd,env:{...env,...overrides},stdio:'inherit'});
 child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(Error(command+' failed ('+code+').')));
});
let signing;
if(!debug){
 if(!env.KATAKECIL_SIGNING_DIR)throw Error('Set KATAKECIL_SIGNING_DIR to the existing private signing directory. Generate a key once with npm run android:key -- /private/path.');
 const folder=resolve(env.KATAKECIL_SIGNING_DIR);
 signing=JSON.parse(await readFile(join(folder,'signing.json'),'utf8'));
 signing.path=resolve(folder,signing.storeFile);await access(signing.path);
}
// Java/Gradle do not automatically honor the HTTP proxy inherited by Node and curl.
if(env.HTTPS_PROXY||env.https_proxy){
 const proxy=new URL(env.HTTPS_PROXY||env.https_proxy);
 const options=['-Dhttps.proxyHost='+proxy.hostname,'-Dhttps.proxyPort='+(proxy.port||80),'-Dhttp.proxyHost='+proxy.hostname,'-Dhttp.proxyPort='+(proxy.port||80),'-Dhttp.nonProxyHosts=localhost|127.*'];
 env.GRADLE_OPTS=[env.GRADLE_OPTS,...options].filter(Boolean).join(' ');
}
await run(java,['-version']);
await run('npm',['run','build']);
await run('npx',['cap','sync','android']);
// Explicit release option for a user who takes responsibility for further QA.
const tasks=debug?['assembleDebug']:process.argv.includes('--skip-qa')?['assembleRelease']:['testReleaseUnitTest','assembleRelease','lintRelease'];
await run('./gradlew',['--no-daemon','--max-workers=2',...tasks],join(root,'android'));
await mkdir(output,{recursive:true});
const name=`KataKecil-${version.version}-${debug?'debug':'Karisyono'}.apk`,artifact=join(output,name);
if(debug)await copyFile(join(root,'android/app/build/outputs/apk/debug/app-debug.apk'),artifact);
else{
 let sdk=env.ANDROID_HOME||env.ANDROID_SDK_ROOT;
 if(!sdk){const local=await readFile(join(root,'android/local.properties'),'utf8');sdk=local.match(/^sdk.dir=(.+)$/m)?.[1].trim();}
 if(!sdk)throw Error('ANDROID_HOME or android/local.properties is required.');
 const versions=(await readdir(join(sdk,'build-tools'))).filter(v=>/^\d+\.\d+\.\d+$/.test(v)).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
 const tools=join(sdk,'build-tools',versions.at(-1)||'36.0.0'),aligned=join(root,'android/app/build/outputs/apk/release/katakecil-aligned.apk');
 await run(join(tools,'zipalign'),['-P','16','-f','4',join(root,'android/app/build/outputs/apk/release/app-release-unsigned.apk'),aligned]);
 await run(join(tools,'apksigner'),['sign','--ks',signing.path,'--ks-key-alias',signing.alias,'--ks-pass','env:KK_STORE_PASSWORD','--key-pass','env:KK_KEY_PASSWORD','--v1-signing-enabled','true','--v2-signing-enabled','true','--v3-signing-enabled','true','--out',artifact,aligned],root,{KK_STORE_PASSWORD:signing.storePassword,KK_KEY_PASSWORD:signing.keyPassword});
 await run(join(tools,'apksigner'),['verify','--verbose','--print-certs',artifact]);
 await run(join(tools,'zipalign'),['-c','-P','16','4',artifact]);
}
const bytes=await readFile(artifact),checksum=createHash('sha256').update(bytes).digest('hex');
await writeFile(artifact+'.sha256',checksum+'  '+name+'\n');
if(!debug)await writeFile(join(output,'KataKecil-release-info.json'),JSON.stringify({schemaVersion:1,applicationId:'id.karisyono.katakecil',version:version.version,versionCode:version.versionCode,releaseTag:'v'+version.version,releaseStatus:version.version.includes('-')?'prerelease':'stable',signedApk:{file:name,bytes:bytes.length,sha256:checksum}},null,2)+'\n');
console.log('APK: '+artifact+' ('+bytes.length+' bytes)');
