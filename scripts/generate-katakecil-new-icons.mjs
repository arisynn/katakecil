import {readFile,writeFile,readdir} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {KATAKECIL_ICONS} from '../dist/katakecil-icons.js';
const base=new URL('../',import.meta.url),names=Object.keys(KATAKECIL_ICONS);
const tags=new Set(['path','circle','rect','line','polyline','polygon']);
const attributes=new Set(['fill','stroke','stroke-width','stroke-linecap','stroke-linejoin','cx','cy','r','d','x1','y1','x2','y2','points','x','y','width','height','rx','ry']);
const packs={};
for(const variant of ['outline','solid']){
 const directory=new URL(`dist/assets/icons/katakecil-new/${variant}/`,base);
 const files=await readdir(directory);
 if(files.length!==names.length||names.some(name=>!files.includes(name+'.svg')))throw Error('Incomplete icon variant: '+variant);
 packs[variant]={};
 for(const name of names){
  const source=await readFile(new URL(name+'.svg',directory),'utf8');
  if(/<!DOCTYPE|<!ENTITY/i.test(source))throw Error('Nonlocal SVG: '+name);
  const dom=new JSDOM(source,{contentType:'image/svg+xml'}),svg=dom.window.document.documentElement;
  try{
   if(svg.localName!=='svg'||svg.namespaceURI!=='http://www.w3.org/2000/svg'||svg.getAttribute('viewBox')!=='0 0 24 24')throw Error('Unexpected viewport: '+name);
   for(const node of [svg,...svg.querySelectorAll('*')]){
    if(node!==svg&&!tags.has(node.localName))throw Error('Unexpected SVG element: '+name);
    for(const attribute of node.attributes){
     if(node===svg&&['xmlns','viewBox'].includes(attribute.name))continue;
     if(!attributes.has(attribute.name)||/[<>&]/.test(attribute.value)||/\b(?:url|javascript|https?|data)\s*[:(]/i.test(attribute.value))throw Error('Unexpected SVG attribute: '+name);
    }
   }
   const fill=svg.getAttribute('fill'),stroke=svg.getAttribute('stroke')||'none';
   if(!['none','currentColor'].includes(fill)||!['none','currentColor'].includes(stroke))throw Error('Unexpected icon colors: '+name);
   const width=svg.getAttribute('stroke-width')||'1',cap=svg.getAttribute('stroke-linecap')||'butt',join=svg.getAttribute('stroke-linejoin')||'miter';
   // Preserve source-root inheritance independently from the host SVG/icon pack.
   packs[variant][name]=`<g fill="${fill}" stroke="${stroke}" stroke-width="${width}" stroke-linecap="${cap}" stroke-linejoin="${join}">${svg.innerHTML.trim().replace(/ xmlns="http:\/\/www.w3.org\/2000\/svg"/g,'')}</g>`;
  }finally{dom.window.close();}
 }
}
await writeFile(new URL('dist/katakecil-new-icons.js',base),'// Generated from the user-supplied KataKecil-icons-solid.zip. Original SVGs are in assets/icons/katakecil-new/.\nexport const KATAKECIL_NEW_OUTLINE=Object.freeze('+JSON.stringify(packs.outline)+');\nexport const KATAKECIL_NEW_SOLID=Object.freeze('+JSON.stringify(packs.solid)+');\n');
