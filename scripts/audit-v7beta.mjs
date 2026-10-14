import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
const tokens = readFileSync('src/design/sapphire-tokens.css', 'utf8');
const css = readFileSync('src/design/v70-beta1.css', 'utf8');
for (const key of ['--sapphire-muted','--sapphire-border','--sapphire-shadow']) {
  assert.equal((tokens.match(new RegExp(`${key}:`, 'g')) ?? []).length, 2, `${key} missing from a theme`);
  assert.match(css, new RegExp(`var\\(${key}\\)`));
}
const clean = css.replace(/\/\*[\s\S]*?\*\//g, '');
assert.doesNotMatch(clean, /#[0-9a-f]{3,8}\b|rgba?\s*\(|hsla?\s*\(/i, 'New CSS must use tokens');
const walk = dir => readdirSync(dir, {withFileTypes:true}).flatMap(x => x.isDirectory() ? walk(join(dir,x.name)) : [join(dir,x.name)]);
const legacy = walk('src').filter(file => file.endsWith('.css') && !/sapphire-tokens|v70-(?:alpha|beta)/.test(file));
const inventory = legacy.map(file => ({file, literals: (readFileSync(file,'utf8').match(/#[0-9a-f]{3,8}\b/ig) ?? []).length})).filter(x=>x.literals).sort((a,b)=>b.literals-a.literals);
const total = inventory.reduce((sum,x)=>sum+x.literals,0);
console.log(JSON.stringify({status:'PASS', newCssLiteralCount:0, legacyCssLiteralCount:total, largestLegacyFiles:inventory.slice(0,8)},null,2));
