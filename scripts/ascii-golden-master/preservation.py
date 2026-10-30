#!/usr/bin/env python3
"""Verify original evidence is unchanged and make an audit-only rollback patch."""
from pathlib import Path
import datetime
import difflib
import hashlib
import json
import os
import subprocess

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'evidence/ascii-golden-master-2026-10-30'
baseline = json.loads((OUT / 'preservation/baseline.json').read_text())
skip = set(baseline['excludedDirectories'])


def sha(file):
    h = hashlib.sha256()
    with file.open('rb') as stream:
        for data in iter(lambda: stream.read(1024 * 1024), b''):
            h.update(data)
    return h.hexdigest()


def git(root, *args):
    result = subprocess.run(['git', '-C', str(root), *args], capture_output=True, text=True)
    return result.stdout if result.returncode == 0 else None


receipt = {'capturedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'method': baseline['scope'], 'trees': {}, 'historical': {}}
for name, info in baseline['trees'].items():
    if name == 'consolidated':
        continue
    root = Path(info['root'])
    current = {}
    for directory, dirs, files in os.walk(root):
        dirs[:] = [d for d in dirs if d not in skip]
        for file in files:
            p = Path(directory) / file
            if p.is_symlink() or not p.is_file() or p.name.endswith('.tsbuildinfo'):
                continue
            current[str(p.relative_to(root))] = sha(p)
    old = {p: v['sha256'] for p, v in info['files'].items()}
    changed = [p for p in old if p in current and old[p] != current[p]]
    missing, added = sorted(set(old) - set(current)), sorted(set(current) - set(old))
    current_head = git(root, 'rev-parse', 'HEAD')
    current_status = git(root, 'status', '--porcelain', '--untracked-files=all')
    passed = not changed and not missing and not added and current_head == info['head'] and current_status == info['status']
    receipt['trees'][name] = {'root': str(root), 'files': len(current), 'changed': changed, 'missing': missing, 'added': added, 'head': current_head, 'gitStatusUnchanged': current_status == info['status'], 'pass': passed}

historic_path = Path('/home/swirky/DevHub/experiments/ascii-waves-react-01/evidence/preservation/baseline.json')
historic = json.loads(historic_path.read_text())
matches = []
mismatches = []
proof = Path(baseline['trees']['proof03']['root'])
for row in historic['proof03']['manifest']['files']:
    file = proof / row['path']
    (matches if file.is_file() and sha(file) == row['sha256'] else mismatches).append(row['path'])
receipt['historical'] = {'source': str(historic_path), 'capturedAt': historic['capturedAt'], 'proof03FileHashesMatching': len(matches), 'mismatches': mismatches, 'checkpoint': historic['proof03']['checkpoint']}

core = ['ascii-waves.tsx', 'ascii-waves.module.css', 'renderer.ts', 'glyphAtlas.ts', 'presets.ts']
receipt['preservedComponent'] = [{'file': file, 'sha256': sha(ROOT / 'components/effects/ascii-waves' / file), 'matchesUiForge': sha(ROOT / 'components/effects/ascii-waves' / file) == sha(Path(baseline['trees']['ui-forge']['root']) / 'registry/new-york/ascii-waves' / file)} for file in core]
receipt['preExistingUntouchedFiles'] = [{'file': file, 'sha256': sha(ROOT / file), 'matchesPreAudit': sha(ROOT / file) == baseline['trees']['consolidated']['files'][file]['sha256']} for file in ['components/effects/home-field.tsx', 'lib/effects/manifest.ts']]
receipt['highLabDefaultRetained'] = 'quality: "high"' in (ROOT / 'components/effects/effect-lab-preview.tsx').read_text()
receipt['consolidatedHeadUnchanged'] = git(ROOT, 'rev-parse', 'HEAD') == baseline['trees']['consolidated']['head']
patch = ''
for file in ['components/effects/ascii-waves-canvas.tsx', 'components/effects/effect-lab-preview.tsx']:
    before = (OUT / 'preservation/pre-audit-files' / file).read_text()
    after = (ROOT / file).read_text()
    patch += ''.join(difflib.unified_diff(before.splitlines(True), after.splitlines(True), fromfile='a/' + file, tofile='b/' + file))
(OUT / 'preservation/audit-only.patch').write_text(patch)
receipt['consolidatedStatus'] = git(ROOT, 'status', '--short', '--branch')
receipt['allOriginalsUnchanged'] = all(r['pass'] for r in receipt['trees'].values())
receipt['allPreservedComponentFilesMatch'] = all(r['matchesUiForge'] for r in receipt['preservedComponent'])
(OUT / 'preservation/final.json').write_text(json.dumps(receipt, indent=2) + '\n')
print(json.dumps({key: receipt[key] for key in ['allOriginalsUnchanged', 'allPreservedComponentFilesMatch', 'consolidatedHeadUnchanged', 'highLabDefaultRetained']}, indent=2))
print(json.dumps({name: {'files': r['files'], 'pass': r['pass']} for name, r in receipt['trees'].items()}, indent=2))
print('Historical Proof 03 matching file hashes:', len(matches), 'mismatches:', mismatches)
if not receipt['allOriginalsUnchanged'] or not receipt['allPreservedComponentFilesMatch'] or mismatches:
    raise SystemExit(1)
