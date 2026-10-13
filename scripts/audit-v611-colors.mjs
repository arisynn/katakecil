/** Guard against hardcoded color drift in UI components. Legacy stylesheets
 * are reported, not silently deleted: cascade still requires browser QA. */
import assert from 'node:assert/strict';
import {readdirSync,readFileSync} from 'node:fs';
import {join} from 'node:path';

const walk = dir => readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
  const file=join(dir,entry.name);
  return entry.isDirectory()?walk(file):[file];
});
const views=walk('src').filter(file=>/\.(?:tsx|jsx)$/.test(file));
const offenders=views.filter(file=>/#[0-9a-f]{3,8}\b/i.test(readFileSync(file,'utf8')));
assert.deepEqual(offenders,[],`Component literals should use global semantic tokens: ${offenders.join(', ')}`);
const global=readFileSync('src/design/sapphire-tokens.css','utf8');
for(const hex of ['#F4F8FD','#081425','#FFFFFF','#10243D','#E9F2FC','#173251','#172C48','#EFF6FF','#506781','#B2C5DA','#235DB4','#9BC9FF']) {
  assert.ok(global.includes(hex),`Missing palette color ${hex}`);
}
const newCss=readFileSync('src/design/v611-immersive-reader.css','utf8');
const boot=readFileSync('index.html','utf8');
for(const [name,content] of [['V6.11 styles',newCss],['Boot',boot]]) {
  assert.doesNotMatch(content,/#(?:f8eedc|fff5e6|f0c98b|805321|a57c49)\b/i,`${name} reintroduced legacy amber`);
}
const oldCss=walk('src').filter(file=>file.endsWith('.css')&&!file.includes('v611-'));
const legacyLiterals=oldCss.reduce((sum,file)=>sum+(readFileSync(file,'utf8').match(/#[0-9a-f]{3,8}\b/ig)||[]).length,0);
console.log(`PASS V6.11 colors: ${views.length} UI components without hex literals; Sapphire tokens present. ${legacyLiterals} legacy CSS literals remain for runtime cascade review.`);
