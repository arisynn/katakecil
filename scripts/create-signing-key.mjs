import {mkdir,writeFile,access,chmod} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {randomBytes} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const directory=process.argv[2];
if(!directory)throw Error('Usage: node scripts/create-signing-key.mjs <private-directory-outside-repo>');
const target=resolve(directory),repository=resolve('.');
if(target===repository||target.startsWith(repository+'/'))throw Error('Choose a private directory outside the repository.');
await mkdir(target,{recursive:true,mode:0o700});
const store=join(target,'karisyono-katakecil.p12'),metadata=join(target,'signing.json');
for(const file of [store,metadata]){let exists=false;try{await access(file);exists=true;}catch{}if(exists)throw Error('Signing files already exist. Reuse them for updates; do not replace them.');}
const password=randomBytes(32).toString('base64url'),alias='karisyono';
const keytool=process.env.JAVA_HOME?join(process.env.JAVA_HOME,'bin','keytool'):'keytool';
const result=spawnSync(keytool,['-genkeypair','-keystore',store,'-storetype','PKCS12','-alias',alias,'-keyalg','RSA','-keysize','4096','-validity','10000','-dname','CN=Karisyono','-storepass:env','KK_KEY_PASSWORD','-keypass:env','KK_KEY_PASSWORD','-noprompt'],{stdio:'inherit',env:{...process.env,KK_KEY_PASSWORD:password}});
if(result.status!==0)throw Error('Key generation failed.');
await chmod(store,0o600);
await writeFile(metadata,JSON.stringify({storeFile:'karisyono-katakecil.p12',alias,storePassword:password,keyPassword:password,subject:'CN=Karisyono'},null,2)+'\n',{mode:0o600});
await writeFile(join(target,'README.txt'),'KataKecil — kunci penandatanganan Karisyono\n\nSimpan folder ini secara pribadi beserta signing.json. File JSON berisi password.\nKunci yang sama diperlukan untuk memperbarui APK yang sudah dipasang.\nJangan masukkan folder ini ke Git atau membagikannya bersama APK.\n\nBuild dari source dengan JDK 21 dan Android SDK:\nKATAKECIL_SIGNING_DIR=/path/ke/folder-ini npm run android:release\n',{mode:0o600});
console.log('Signing key created outside source. Preserve this directory for every future update.');
