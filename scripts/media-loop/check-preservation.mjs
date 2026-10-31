import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const out = resolve('evidence/webkit-media-loop-01');
mkdirSync(out, { recursive: true });
execFileSync(process.execPath, ['scripts/source-preservation.mjs', '--output', out + '/source-preservation.json']);
const baseline = JSON.parse(readFileSync('evidence/g0/source-preservation-baseline.json'));
const current = JSON.parse(readFileSync(out + '/source-preservation.json'));
const roots = current.roots.map(row => ({ id: row.id, files: row.fileCount, sha256: row.treeSha256, pass: row.treeSha256 === baseline.roots.find(r => r.id === row.id)?.treeSha256 }));
const sha = data => createHash('sha256').update(data).digest('hex');
const protectedFiles = [
  ...['ascii-waves.tsx', 'ascii-waves.module.css', 'renderer.ts', 'glyphAtlas.ts', 'presets.ts'].map(file => 'components/effects/ascii-waves/' + file),
  'components/effects/ascii-waves-runtime.tsx', 'components/effects/ascii-waves-canvas.module.css',
  'public/media/flower.mp4', 'public/media/flower.webm', 'public/media/motifs/flower-poster.jpg',
  'public/downloads/ascii-waves-0.1.0.zip', 'public/downloads/ascii-waves-0.1.0.zip.sha256',
];
const files = protectedFiles.map(path => {
  const expected = sha(execFileSync('git', ['show', '059db3d:' + path], { maxBuffer: 16 * 1024 * 1024 }));
  const actual = sha(readFileSync(path));
  return { path, expected, actual, pass: expected === actual };
});
const checkpoint = '/home/swirky/DevHub/experiments/ascii-waves-proof03/checkpoints/ascii-waves-proof03-loved-flower-2026-10-24.tar.gz';
const checkpointSha = sha(readFileSync(checkpoint));
const bundleSha = readFileSync('public/downloads/ascii-waves-0.1.0.zip.sha256', 'utf8').split(/\s/)[0];
const receipt = { capturedAt: new Date().toISOString(), roots, files, checkpoint: { path: checkpoint, sha256: checkpointSha, pass: checkpointSha === '422482e98569aeda9e4254a9ef98b4cd42ca5b9f9ede75e7d17fca6d61114012' }, bundle: { expected: bundleSha, actual: sha(readFileSync('public/downloads/ascii-waves-0.1.0.zip')) } };
receipt.pass = roots.every(r => r.pass) && files.every(f => f.pass) && receipt.checkpoint.pass && receipt.bundle.expected === receipt.bundle.actual;
writeFileSync(out + '/checksums.json', JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify(receipt, null, 2));
if (!receipt.pass) process.exitCode = 1;
