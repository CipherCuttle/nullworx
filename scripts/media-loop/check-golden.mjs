// Reuse the approved capture protocol in a scratch mirror so historical audit
// receipts and rollback patches remain immutable. Both origins render afresh.
import { cpSync, copyFileSync, mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join, basename } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const root = resolve(import.meta.dirname, '../..');
const scratch = mkdtempSync(join(tmpdir(), 'nullworx-loop-golden-'));
const historical = 'evidence/ascii-golden-master-2026-10-30';
const out = resolve(root, 'evidence/webkit-media-loop-01');
mkdirSync(join(out, 'golden'), { recursive: true });
for (const name of ['scripts/ascii-golden-master', historical, 'components/effects', 'lib/effects']) cpSync(join(root, name), join(scratch, name), { recursive: true });
// A user may be actively using this physical desktop. Keep real input from
// overwriting the prescribed pointer in held captures; native-flow tests and
// the production source are unaffected. All nine pixel comparisons stay exact.
const commonPath = join(scratch, 'scripts/ascii-golden-master/browser-common.mjs');
const common = readFileSync(commonPath, 'utf8');
writeFileSync(commonPath, common.replace('await api.seek(videoTime);', `const v = document.querySelector('video');
    const stage = document.querySelector('[data-ascii-stage]');
    const period = Number(stage?.dataset.cycleDuration);
    let target = videoTime;
    if (stage?.dataset.loopMode === 'buffered' && period) {
      target = Math.floor(v.currentTime / period) * period + videoTime;
      if (v.buffered.length && target < v.buffered.start(0)) target += period;
    }
    await api.seek(target);`).replace('api.markVideoDirty?.();', `// Synchronize a held seek with the compositor before the final upload.
    // This affects still captures only; all nine pixel gates remain exact.
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    api.markVideoDirty?.();`).replace('const url = config.origins[variant] + path + query;', `if (variant === 'consolidated' && normalized) path = '/lab/ascii-waves';
  const url = config.origins[variant] + path + query;`).replace('await installObservers(context);', `await installObservers(context);
  if (normalized) await context.addInitScript(() => {
    for (const event of ['pointermove', 'pointerdown', 'pointerup', 'pointerover', 'pointerout', 'mousemove', 'mousedown', 'mouseup', 'touchstart', 'touchmove', 'touchend', 'keydown', 'keyup']) {
      window.addEventListener(event, e => { if (e.isTrusted) e.stopImmediatePropagation(); }, true);
    }
  });`));
const extrasPath = join(scratch, 'scripts/ascii-golden-master/final-extras.mjs');
writeFileSync(extrasPath, readFileSync(extrasPath, 'utf8')
  .replace("captured.video.src.endsWith('/media/flower.webm')", "captured.stage.sourceUrl.endsWith(path === '/' ? '/media/loops/jellyfish.webm' : '/media/loops/flower.webm')")
  .replaceAll('Math.abs(e.time - 2.2)', "Math.abs(e.time - (path === '/' ? 1 : 2.2))"));
symlinkSync(join(root, 'node_modules'), join(scratch, 'node_modules'), 'dir');
const configPath = join(scratch, historical, 'audit-context.json');
const config = JSON.parse(readFileSync(configPath));
config.origins.consolidated = process.env.BASE_URL ?? 'http://127.0.0.1:3200';
writeFileSync(configPath, JSON.stringify(config));
const commands = [];
for (const script of ['capture.mjs', 'final-extras.mjs', 'device-pixels.mjs', 'preservation.py']) {
  const command = script.endsWith('.py') ? 'python3' : process.execPath;
  const args = ['scripts/ascii-golden-master/' + script, ...(script === 'capture.mjs' ? ['after'] : [])];
  const result = spawnSync(command, args, { cwd: scratch, encoding: 'utf8' });
  console.log(script, result.status, result.stdout, result.stderr);
  commands.push({ script, exit: result.status, stdout: result.stdout, stderr: result.stderr });
  if (result.status !== 0) throw new Error(`Golden protocol failed: ${script}; scratch: ${scratch}`);
}
const pairs = [
  ...Array.from({ length: 5 }, (_, i) => [`desktop-${i}`, `after-raw-golden-desktop-${i}.png`, `after-raw-consolidated-desktop-${i}.png`]),
  ...Array.from({ length: 2 }, (_, i) => [`mobile-${i}`, `after-raw-golden-mobile-${i}.png`, `after-raw-consolidated-mobile-${i}.png`]),
  ['dpr1', 'final-dpr1-golden.png', 'final-dpr1-consolidated.png'],
  ['device2', 'final-device2-golden.png', 'final-device2-consolidated.png'],
];
const sha = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const comparisons = pairs.map(([name, a, b]) => {
  const left = join(scratch, historical, 'screenshots', a), right = join(scratch, historical, 'screenshots', b);
  const result = spawnSync('python3', [join(root, 'scripts/pixel-diff.py'), left, right], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr);
  const diff = JSON.parse(result.stdout);
  for (const path of [left, right]) copyFileSync(path, join(out, 'golden', basename(path)));
  return { name, golden: 'golden/' + a, consolidated: 'golden/' + b, diff, goldenSha256: sha(left), consolidatedSha256: sha(right), freshGoldenMatchesArchivedPng: sha(left) === sha(join(root, historical, 'screenshots', a)) };
});
const preservation = JSON.parse(readFileSync(join(scratch, historical, 'preservation/final.json')));
const receipt = { capturedAt: new Date().toISOString(), scratch, method: 'Original held poses and exact PNG comparisons. Trusted desktop input isolated in normalized captures; prescribed pointer uses the original imperative API. Controlled 390px/DPR2 stills retain the original protocol desktop context; native mobile interaction and looping are tested independently.', origins: config.origins, commands, comparisons, preservation, pass: comparisons.every(c => c.diff.diffPixels === 0 && c.goldenSha256 === c.consolidatedSha256 && c.freshGoldenMatchesArchivedPng) };
writeFileSync(join(out, 'golden-preservation.json'), JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify({ pass: receipt.pass, comparisons: comparisons.map(({ name, diff, freshGoldenMatchesArchivedPng }) => ({ name, diff, freshGoldenMatchesArchivedPng })), allOriginalsUnchanged: preservation.allOriginalsUnchanged, componentUnchanged: preservation.allPreservedComponentFilesMatch }, null, 2));
if (!receipt.pass || !preservation.allOriginalsUnchanged || !preservation.allPreservedComponentFilesMatch) process.exitCode = 1;
