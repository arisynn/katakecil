import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import ts from 'typescript';
const read = file => readFileSync(file, 'utf8');
const pkg = JSON.parse(read('package.json'));
assert.ok(['7.0.0-beta.2', '7.1.0-rc.1'].includes(pkg.version), 'Beta.2 regression must remain compatible with V7.1');
const app = read('src/App.tsx');
const tokens = read('src/design/sapphire-tokens.css');
const polish = read('src/design/v70-beta2.css');
const iconComponent = read('src/components/BrandIcon.tsx');
const studio = read('src/features/studio/components/StudioOverview.tsx');
const navigation = read('src/features/studio/components/StudioNavigation.tsx');
const publicNav = read('src/components/public/PublicHeader.tsx');
const secure = read('src/SecureReaderApp.tsx');
assert.match(app, /design\/v70-beta2\.css/);
assert.match(tokens, /html\[data-app-theme='light'\]/);
assert.match(tokens, /html\[data-app-theme='dark'\]/);
assert.doesNotMatch(polish.replace(/\/\*[\s\S]*?\*\//g, ''), /#[\da-f]{3,8}\b|\brgba?\s*\(|\bhsla?\s*\(/i);
assert.match(iconComponent, /maskImage:/);
assert.match(iconComponent, /WebkitMaskImage:/);
assert.match(iconComponent, /aria-hidden/);
assert.match(read('src/components/BrandLogo.tsx'), /katakecil-wordmark-light\.svg/);
assert.match(read('src/components/BrandLogo.tsx'), /katakecil-wordmark-dark\.svg/);
assert.match(navigation, /label: 'Upload'/);
assert.match(navigation, /aria-current=/);
assert.match(navigation, /\/studio\/pengumuman/);
assert.match(publicNav, /name=\{l.icon\}/);
assert.match(studio, /v72-quick-actions/);
assert.match(studio, /v72-dashboard-grid/);
assert.match(studio, /episodeStatus\(ep\)/);
assert.match(studio, /lastEdited/);
assert.match(studio, /new Date\(b.updated_at\)/);
assert.match(secure, /onToggleChapterCompleted/);
const iconFiles = readdirSync('public/assets/v7/icons').filter(name => name.endsWith('.svg'));
assert.ok(iconFiles.length >= 70, 'asset icon set must cover the public UI, reader and Studio');
const names = new Set(iconFiles.map(name => name.slice(0, -4)));
const iconUsages = [];
for (const file of readdirSync('src', { recursive: true }).filter(file => file.endsWith('.tsx'))) {
  const full = `src/${file}`;
  const source = read(full);
  assert.doesNotMatch(source, /from ['"]lucide-react['"]/, `Legacy icon imports remain: ${full}`);
  const output = ts.transpileModule(source, {
    fileName: full, reportDiagnostics: true,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX },
  });
  const errors = output.diagnostics?.filter(d => d.category === ts.DiagnosticCategory.Error) ?? [];
  assert.equal(errors.length, 0, `TSX syntax error in ${full}`);
  for (const match of source.matchAll(/<BrandIcon\s+name="([a-z-]+)"/g)) {
    assert.ok(names.has(match[1]), `Missing SVG asset ${match[1]} in ${full}`);
    iconUsages.push(match[1]);
  }
}
assert.ok(iconUsages.length > 130, `Too few asset icon usages: ${iconUsages.length}`);
for (const file of iconFiles) {
  const source = read(`public/assets/v7/icons/${file}`);
  assert.match(source, /^<svg\b/);
  assert.match(source, /viewBox="0 0 24 24"/);
  assert.match(source, /stroke-width="1\.85"/);
  assert.doesNotMatch(source, /<script\b|<foreignObject\b|<image\b|href=/i);
}
for (const file of ['public/brand/katakecil-mark.svg', 'public/brand/katakecil-icon.svg', 'public/brand/katakecil-icon-192.png', 'public/brand/katakecil-icon-512.png', 'public/brand/katakecil-wordmark-light.svg', 'public/brand/katakecil-wordmark-dark.svg']) assert.ok(existsSync(file), file);
console.log(`PASS V7 Beta.2: ${iconFiles.length} SVG assets, ${iconUsages.length} references, TSX parse, Sapphire theme, writer workflow and reader invariants.`);
