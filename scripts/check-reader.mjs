import {readdir,readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
for(const file of (await readdir('dist')).filter(f=>f.endsWith('.js'))){const result=spawnSync(process.execPath,['--check','dist/'+file],{stdio:'inherit'});if(result.status)process.exit(result.status);}
for(const file of (await readdir('supabase/functions/katakecil-reader')).filter(f=>f.endsWith('.ts'))){const result=spawnSync(process.execPath,['--check','supabase/functions/katakecil-reader/'+file],{stdio:'inherit'});if(result.status)process.exit(result.status);}
for(const file of (await readdir('supabase/functions/katakecil-publisher')).filter(f=>f.endsWith('.ts'))){const result=spawnSync(process.execPath,['--check','supabase/functions/katakecil-publisher/'+file],{stdio:'inherit'});if(result.status)process.exit(result.status);}
const edge=spawnSync(process.execPath,['--check','supabase/functions/lumina-library/index.ts'],{stdio:'inherit'});if(edge.status)process.exit(edge.status);
const html=await readFile('dist/index.html','utf8');
for(const asset of ['advanced-reader.css','app.js','styles.css'])if(!html.includes(asset))throw Error('Missing entry asset: '+asset);
const config=await readFile('dist/config.js','utf8');if(config.includes('/lumina-library'))throw Error('Frontend must use published authorization.');
const gateway=await readFile('supabase/functions/lumina-library/index.ts','utf8');if(/\/storage\/v1|SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEYS|expiresIn/.test(gateway))throw Error('Legacy source signing must stay disabled.');
console.log('JavaScript/Edge syntax, entry assets and publication boundaries checked.');
// A single URL per runtime module avoids duplicate stores/speech engines after a cached upgrade.
const entry=html.match(/<script[^>]*type=["']module["'][^>]*src=["']([^"']+)/)?.[1];if(!entry)throw Error('Missing module entry.');
const seen=new Map(),pending=[new URL(entry,new URL('../dist/index.html',import.meta.url))];
while(pending.length){const url=pending.pop(),file=url.pathname,previous=seen.get(file);if(previous){if(previous!==url.href)throw Error('Conflicting runtime module URLs: '+file);continue;}seen.set(file,url.href);const source=await readFile(url,'utf8');for(const match of source.matchAll(/(?:from\s*|import\s*)['"]([^'"]+)['"]/g))if(match[1].startsWith('.'))pending.push(new URL(match[1],url));}
console.log('Runtime module graph resolves with consistent cache versions.');
