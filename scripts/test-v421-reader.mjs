import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (name) => fs.readFileSync(name, 'utf8');
const reader=read('src/SecureReaderApp.tsx');
const measurer=read('src/components/PageMeasurer.tsx');
const app=read('src/App.tsx');
const boundary=read('src/components/ReaderErrorBoundary.tsx');

assert.match(measurer,/\[chapters, geometry\./,'The measurer responds to chapter-array identity.');
assert.match(reader,/useMemo\(\(\)=>chapter\?\[chapter\]:\[\],\[chapter\]\)/,'The measured chapters array must be stable.');
assert.match(reader,/<PageMeasurer chapters=\{measuredChapters\}/,'The measurer must use the stable chapters array.');
assert.doesNotMatch(reader,/<PageMeasurer chapters=\{\[chapter\]\}/,'The crash-inducing inline array must not return.');
assert.match(reader,/setPages\(previous => previous.length === count/,'Duplicate page measurements must not force rerenders.');
assert.match(app,/<ReaderErrorBoundary onBack=/,'Reader needs a recoverable runtime error boundary.');
assert.match(boundary,/Kembali ke Library/,'Reader recovery must let the user exit safely to Library.');

console.log('PASS V4.2.1: stable pagination dependencies, no forced measurements, reader error recovery.');
