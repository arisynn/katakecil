// Local V5.4 contract tests. No network, browser or live Supabase required.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import ts from 'typescript';
const read=(file)=>readFileSync(file,'utf8');
const html=read('index.html');
const css=read('src/design/v54.css');
const header=read('src/components/public/PublicHeader.tsx');
const studio=read('src/pages/Studio.tsx');
const modal=read('src/components/ReadingSettingsModal.tsx');
const importer=read('src/pages/ManuscriptImporter.tsx');
const sql=read('supabase/migrations/20261012210000_katakecil_v54_bulk_publish.sql');
const theme=read('src/hooks/useUiTheme.ts');
const palette=read('src/utils/theme.ts');
// Pre-render theme is set before app script runs; old preference is migrated.
assert.ok(html.indexOf("data-app-theme")<html.indexOf('src="/src/main.tsx"'));
assert.match(html,/--app-background/);
assert.match(html,/kk-boot-loader/);
assert.match(html,/KataKecil Reader/);
assert.match(theme,/appThemePreference/);
assert.match(theme,/prefers-color-scheme: dark/);
assert.match(theme,/katakecil_ui_theme_v53/);
assert.ok(!theme.includes('quiet_reader_settings'));
assert.match(read('src/components/ThemeToggle.tsx'),/Ikuti perangkat/);
assert.match(read('src/components/ThemeToggle.tsx'),/Terang/);
assert.match(read('src/components/ThemeToggle.tsx'),/Gelap/);
assert.match(header,/kk-public-bottom-nav/);
assert.match(header,/kk-header-hidden/);
assert.ok(!header.includes('mobile-menu-toggle'));
assert.ok(!studio.includes('setMenu(') && !studio.includes('studio-sidebar-visible'));
assert.match(studio,/kk-back-public/);
assert.match(studio,/Terbitkan semua/);
assert.match(studio,/Tandai Tamat & Terbitkan Draft/);
assert.match(importer,/Penyimpanan database berhasil diverifikasi/);
assert.match(importer,/Sampul ditemukan/);
assert.match(importer,/importReport/);
assert.match(modal,/THEMES\[id\]\.label/);
assert.match(palette,/Mist Paper/);
assert.match(palette,/Sepia Classic/);
assert.match(palette,/Night Blue/);
assert.match(palette,/OLED Dark/);
assert.match(palette,/theme: 'white'/);
assert.ok(css.includes('prefers-reduced-motion'));
assert.ok(!/(?:^|})\s*(?:\.quiet-app|\.reader-stage|\.reader-leaf|\.reader-page)/m.test(css),'Reader style layout must remain untouched.');
assert.match(sql,/qr_bulk_publish_drafts/);
assert.match(sql,/security definer set search_path = ''/i);
assert.match(sql,/qr_author_members/);
assert.match(sql,/actual_count<>p_expected_drafts/);
assert.match(sql,/deleted_at is null/);
assert.match(sql,/is_finale/);
assert.match(sql,/for update/);
assert.match(sql,/revoke all on function public\.qr_bulk_publish_drafts/);
assert.match(sql,/grant execute on function public\.qr_bulk_publish_drafts.*authenticated/);
assert.ok(!/\bdelete\s+from\s+public\.qr_(?:books|episodes)/i.test(sql));
// Reader engine files must remain identical to V5.3 as shipped.
const originalHashes={
  'src/ReaderApp.tsx':'3b00e0a0a0b15f9eb54fb7552c2b3d53e557c2d3372a48c74b685ea2f598ad9e',
  'src/SecureReaderApp.tsx':'3bed290d82e2d26d294951fc784ff81244b4c3ba1c50ea7b6d43b54738c29901',
  'src/components/ReaderPage.tsx':'7c452bf2771afb7036b910d9e166584573ad73f43123b6f24163f60085947aa8',
  'src/components/ReaderControls.tsx':'29a0541b04ddfc10dc8a2323c912dcab47727710c1df330f6a3c0796308bde27',
};
for(const [file,hash] of Object.entries(originalHashes)) assert.equal(createHash('sha256').update(read(file)).digest('hex'),hash,`Reader engine changed: ${file}`);
// Runtime palette sample (transpiled TypeScript) – ensures every palette is distinct.
const compiled=ts.transpileModule(palette,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const m={exports:{}};
vm.runInNewContext(`(function(module,exports){${compiled}})(module,module.exports)`,{module:m});
const colors=m.exports.THEMES;
assert.equal(Object.keys(colors).length,4);
assert.equal(new Set(Object.values(colors).map(x=>x.bg)).size,4);
assert.equal(m.exports.DEFAULT_SETTINGS.theme,'white');
console.log('PASS V5.4: theme boot, public/studio flows, palette, import progress, atomic author publish SQL, Reader core preserved.');
