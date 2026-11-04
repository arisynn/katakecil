import {build} from 'esbuild';
import {readFile, writeFile, mkdir, access} from 'node:fs/promises';
await build({entryPoints:['src/reader/index.ts'],outdir:'dist',entryNames:'advanced-reader',bundle:true,format:'esm',platform:'browser',target:'es2022',legalComments:'eof',minify:true,metafile:true}).then(async result=>{
 await mkdir('docs/generated',{recursive:true});
 await writeFile('docs/generated/reader-bundle.json',JSON.stringify({bytes:result.metafile.outputs['dist/advanced-reader.js'].bytes,dependencies:Object.keys(result.metafile.inputs).filter(f=>f.startsWith('node_modules/'))},null,2)+'\n');
});
await build({entryPoints:{platform:'src/platform/index.ts','device-backup':'src/platform/backup.ts'},outdir:'dist',bundle:true,format:'esm',platform:'browser',target:'es2022',legalComments:'eof',minify:true});
await mkdir('dist/vendor/licenses',{recursive:true});
await build({entryPoints:['node_modules/reinvented-color-wheel/es/reinvented-color-wheel.js'],outfile:'dist/vendor/color-wheel.js',bundle:true,format:'esm',platform:'browser',target:'es2022',legalComments:'eof',minify:true});
await writeFile('dist/vendor/color-wheel.css',await readFile('node_modules/reinvented-color-wheel/css/reinvented-color-wheel.min.css'));
for(const name of ['reinvented-color-wheel','pure-color'])await writeFile('dist/vendor/licenses/'+name+'.txt',await readFile('node_modules/'+name+'/LICENSE'));

for(const name of ['dom-anchor-text-quote','dom-anchor-text-position','dom-seek','dom-node-iterator','index-of','diff-match-patch','easy-speech']){
 const file='node_modules/'+name+'/LICENSE';await access(file);
 await writeFile('dist/vendor/licenses/'+name+'.txt',await readFile(file));
}
await writeFile('dist/vendor/licenses/ancestors-NOTICE.txt','ancestors 0.0.3 — Chris Dickinson — MIT\nhttps://github.com/chrisdickinson/ancestors\nThe upstream README and package metadata specify MIT. The distributed package supplies no separate copyright/license file.\n\n'+await readFile('node_modules/ancestors/README.md','utf8')+'\n\nMIT license text:\nPermission'+(await readFile('node_modules/index-of/LICENSE','utf8')).split('Permission')[1]);
for(const name of ['core','android','app'])await writeFile('dist/vendor/licenses/capacitor-'+name+'.txt',await readFile('node_modules/@capacitor/'+name+'/LICENSE'));
await writeFile('dist/vendor/licenses/tslib.txt',await readFile('node_modules/tslib/CopyrightNotice.txt','utf8')+'\n'+await readFile('node_modules/tslib/LICENSE.txt','utf8'));
await writeFile('dist/vendor/OPEN_SOURCE_ATTRIBUTIONS.md',(await readFile('OPEN_SOURCE_ATTRIBUTIONS.md','utf8')).replaceAll('(dist/vendor/','(./').replaceAll('(dist/fonts/','(../fonts/'));
console.log('Reader modules bundled; third-party licenses copied.');

// About app always follows the release configuration used by the APK build.
const appInfo=JSON.parse(await readFile('app-version.json','utf8'));
await writeFile('dist/app-info.js','// Generated from app-version.json by npm run build.\nexport const APP_INFO = '+JSON.stringify(appInfo)+';\n');
