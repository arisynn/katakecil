/** Validate local imports and referenced static assets without network or app credentials. */
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, extname, join, normalize, resolve } from 'node:path';

const root = process.cwd();
const files = [];
function walk(dir) {
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, item.name);
    if (item.isDirectory()) walk(full);
    else if (/\.(?:tsx?|css)$/.test(item.name)) files.push(full);
  }
}
walk(join(root, 'src'));

const unresolved = [];
let checked = 0;
for (const file of files) {
  const source = readFileSync(file, 'utf8');
  // Static import/export statements, dynamic import() and CSS @import.
  const patterns = [
    /\b(?:import|export)\s+(?:[^;'"\n]*?\s+from\s+)?['"](\.[^'"\n]+)['"]/g,
    /\bimport\s*\(\s*['"](\.[^'"\n]+)['"]\s*\)/g,
    /@import\s+['"](\.[^'"\n]+)['"]/g,
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      const spec = match[1].split('?')[0];
      const target = normalize(resolve(dirname(file), spec));
      const candidates = extname(target)
        ? [target]
        : [target, `${target}.ts`, `${target}.tsx`, `${target}.js`, `${target}.mjs`, `${target}.css`, join(target, 'index.ts'), join(target, 'index.tsx')];
      if (!candidates.some(existsSync)) unresolved.push(`${file.replace(root + '/', '')}: ${spec}`);
      checked++;
    }
  }
  // Only check literal URLs: mobile cover variants are selected dynamically at runtime.
  for (const match of source.matchAll(/['"(](\/assets\/[^'"()\s]+\.(?:webp|png|jpe?g|svg))['")]/g)) {
    const target = join(root, 'public', match[1]);
    if (!existsSync(target)) unresolved.push(`${file.replace(root + '/', '')}: ${match[1]}`);
    checked++;
  }
}
assert.deepEqual(unresolved, [], `Missing local dependencies:\n${unresolved.join('\n')}`);
assert.ok(existsSync(join(root, 'supabase/migrations')), 'Keep migrations');
assert.ok(existsSync(join(root, 'supabase/functions/secure-episode/index.ts')), 'Keep secure reader edge function');
console.log(`PASS structure: ${files.length} source files, ${checked} local imports/assets, no missing targets.`);
