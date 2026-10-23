import {readdirSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
function inspect(directory){for(const item of readdirSync(directory,{withFileTypes:true})){const path=join(directory,item.name);if(item.isDirectory())inspect(path);else if(/\.apk$/i.test(item.name)||path.replaceAll('\\','/').endsWith('/downloads/latest.json'))throw Error('Android assets must not contain APK downloads or a web update manifest: '+path);}}
inspect('dist');
const html=readFileSync('dist/index.html','utf8');if(!html.includes('src="/assets/'))throw Error('Android frontend bundle is missing.');
console.log('Android local assets validated: compiled frontend, no nested APK/download manifest.');
