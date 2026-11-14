import {readFile,writeFile,mkdir} from 'node:fs/promises';
const version='1.73.0',base=new URL('../',import.meta.url);
const names={sun:'sun',moon:'moon-star',leaf:'leaf',paper:'file-text',sepia:'coffee',speaker:'volume-2',play:'play',pause:'pause',globe:'globe',refresh:'refresh-cw',collapse:'minimize',palette:'palette',type:'type',textSize:'a-large-small',device:'smartphone',systemTheme:'sun-moon',book:'book-marked',bookOpen:'book-open',grid:'layout-grid',notes:'notebook-pen',appearance:'contrast',plus:'plus',search:'search',chevron:'chevron-right',left:'chevron-left',arrow:'arrow-right',close:'x',check:'check',shield:'shield-check',cloud:'cloud-download',upload:'upload',bookmark:'bookmark',quote:'quote',sparkle:'sparkle',list:'list',lock:'lock-keyhole',more:'ellipsis',download:'download',expand:'maximize',edit:'pencil',trash:'trash-2',info:'info',back:'arrow-left',sliders:'sliders-horizontal',clock:'clock-3',single:'rectangle-vertical',double:'columns-2',folder:'folder',mail:'mail',eye:'eye',eyeOff:'eye-off',logout:'log-out'};
const upstream=JSON.parse(await readFile(new URL('node_modules/lucide-static/package.json',base),'utf8'));
if(upstream.version!==version)throw Error('Lucide generator expects pinned lucide-static@'+version);
const icons={};
for(const [key,name] of Object.entries(names)){
 const source=await readFile(new URL('node_modules/lucide-static/icons/'+name+'.svg',base),'utf8');
 const inner=source.match(/<svg\b[^>]*>([\s\S]*?)<\/svg>/)?.[1].trim().replace(/\s+/g,' ');
 if(!inner||/<(?:script|foreignObject|use|image)\b|\bon\w+=|(?:href|url)\s*[=(]/i.test(inner))throw Error('Unexpected icon markup: '+name);
 icons[key]=inner;
}
await mkdir(new URL('dist/vendor/licenses/',base),{recursive:true});
await writeFile(new URL('dist/vendor/lucide-icons.js',base),'// Generated from official lucide-static@'+version+' SVGs. ISC; see licenses/lucide-static.txt.\n// Only the 52 mapped glyphs are shipped; geometry is unchanged.\nexport const LUCIDE_VERSION='+JSON.stringify(version)+';\nexport const LUCIDE_ICON_NAMES=Object.freeze('+JSON.stringify(names)+');\nexport const LUCIDE_ICONS=Object.freeze('+JSON.stringify(icons)+');\n');
await writeFile(new URL('dist/vendor/licenses/lucide-static.txt',base),await readFile(new URL('node_modules/lucide-static/LICENSE',base)));
