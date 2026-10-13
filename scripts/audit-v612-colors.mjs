/** Global palette consistency check; reports historical CSS separately from active tokens. */
import assert from 'node:assert/strict';
import { readFileSync,readdirSync } from 'node:fs';
import { join } from 'node:path';
const read=p=>readFileSync(p,'utf8');
const tokens=read('src/design/sapphire-tokens.css');
const palette=read('src/design/sapphirePalette.ts');
const light={background:'#F4F8FD',surface:'#FFFFFF',raised:'#E9F2FC',text:'#172C48',muted:'#506781',border:'#D5E3F2',accent:'#235DB4'};
const dark={background:'#081425',surface:'#10243D',raised:'#173251',text:'#EFF6FF',muted:'#B2C5DA',border:'#294665',accent:'#9BC9FF'};
for(const [name,colors] of Object.entries({light,dark})) for(const [key,hex] of Object.entries(colors)) {
  assert.ok(palette.includes(`${key}: '${hex}'`),`Missing ${name} JS ${key}`);
  assert.ok(tokens.includes(hex),`Missing ${name} CSS ${key}`);
}
const current=['src/design/v67-sapphire-polish.css','src/design/v69-writer-studio.css','src/design/v610-reader-experience.css','src/design/v611-immersive-reader.css','src/design/v612-reader-layout.css','src/index.css'];
const forbidden=/#(?:f0c98b|805321|f6efe5|f8eedc|fff5e6|fff9ed|fffcf7|f8f2e9|855624|bd9177)\b/i;
for(const f of current) assert.doesNotMatch(read(f),forbidden,`Legacy warm color in ${f}`);
const walk=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(join(dir,e.name)):[join(dir,e.name)]);
const views=walk('src').filter(p=>/\.(tsx|jsx)$/.test(p));
assert.deepEqual(views.filter(f=>/#[0-9a-f]{3,8}\b/i.test(read(f))),[],'UI components must use semantic colors');
const css=walk('src').filter(p=>p.endsWith('.css')&&!p.endsWith('sapphire-tokens.css'));
const count=css.reduce((n,f)=>n+(read(f).match(/#[0-9a-f]{3,8}\b/ig)||[]).length,0);
console.log(`PASS V6.12 palette: two theme contracts, ${views.length} UI components without hex, no warm colors in current UI layers. ${count} literals remain in historical stylesheets; full runtime cascade audit pending.`);
