import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
const forbidden = ['story', 'private_import.sql'];
for (const folder of forbidden) if (existsSync(folder)) { console.error(`Do not build with private manuscript path: ${folder}`); process.exit(1); }
let code = '';
function walk(dir) { for (const item of readdirSync(dir,{withFileTypes:true})) { const full=join(dir,item.name); if(item.isDirectory()) walk(full); else if (/\.(?:ts|tsx|js|mjs)$/.test(item.name)) code+=readFileSync(full,'utf8'); } }
walk('src');
if (/import\.meta\.glob\s*\(|\?raw.*story/.test(code)) { console.error('Bundled manuscripts are forbidden.'); process.exit(1); }
console.log('Public bundle source check passed: no manuscript import or private story folder.');
