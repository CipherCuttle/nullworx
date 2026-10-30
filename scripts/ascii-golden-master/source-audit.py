#!/usr/bin/env python3
"""Read-only source inventory for the Flower golden-master audit."""
from pathlib import Path
import csv
import datetime
import difflib
import hashlib
import json
import re
import subprocess

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'evidence/ascii-golden-master-2026-10-30'
CONTEXT = json.loads((OUT / 'audit-context.json').read_text())
HASH = lambda data: hashlib.sha256(data).hexdigest()
VARIANTS = {
    'golden-checkpoint': (Path(CONTEXT['golden']), 'src'),
    'proof03-shelf': (Path(CONTEXT['roots']['proof03']), 'src'),
    'react01': (Path(CONTEXT['roots']['react01']), 'src/components/ascii-waves'),
    'ui-forge': (Path(CONTEXT['roots']['ui-forge']), 'registry/new-york/ascii-waves'),
    'branded': (Path(CONTEXT['roots']['branded']), 'components/effects/ascii-waves'),
    'consolidated-HEAD': (ROOT, 'components/effects/ascii-waves'),
    'consolidated-working': (ROOT, 'components/effects/ascii-waves'),
}


def read(variant, path):
    root, _ = VARIANTS[variant]
    if variant == 'consolidated-HEAD':
        result = subprocess.run(['git', '-C', str(root), 'show', f'9926dbc:{path}'], capture_output=True)
        return result.stdout if result.returncode == 0 else None
    file = root / path
    return file.read_bytes() if file.is_file() else None


def renderer_part(data, name):
    text = data.decode()
    if name in ['VERT', 'FRAG']:
        return re.search(r'const ' + name + r' = `([\s\S]*?)`;', text).group(1).encode()
    return re.search(r'export const DEFAULT_SETTINGS: WavesSettings = (\{[\s\S]*?\n\});', text).group(1).encode()


matrix = []
defaults = {}
media = []
text_versions = {}
for variant, (root, component) in VARIANTS.items():
    original = component == 'src'
    renderer = read(variant, f'{component}/renderer.ts')
    selections = {
        'renderer.ts': f'{component}/renderer.ts',
        'glyphAtlas.ts': f'{component}/glyphAtlas.ts',
        'component/App': f'{component}/App.tsx' if original else f'{component}/' + ('AsciiWaves.tsx' if variant == 'react01' else 'ascii-waves.tsx'),
        'component CSS': f'{component}/styles.css' if original else f'{component}/' + ('AsciiWaves.module.css' if variant == 'react01' else 'ascii-waves.module.css'),
        'presets/motifs': 'src/motifs.ts' if original else f'{component}/presets.ts',
        'controls': 'src/components/ControlPanel.tsx' if original else 'src/demo/App.tsx' if variant == 'react01' else 'components/forge-gallery.tsx' if variant == 'ui-forge' else 'components/effects/effect-lab-preview.tsx',
        'homepage wrapper': 'components/effects/home-field.tsx',
        'site canvas wrapper': 'components/effects/ascii-waves-canvas.tsx',
        'site wrapper CSS': 'components/effects/ascii-waves-canvas.module.css',
        'runtime seam': 'components/effects/ascii-waves-runtime.tsx',
        'home CSS': 'components/effects/home-field.module.css',
        'lab CSS': 'components/effects/effect-lab-preview.module.css',
        'global CSS': 'app/globals.css' if variant not in ['golden-checkpoint', 'proof03-shelf', 'react01'] else 'src/styles.css' if original else 'src/demo/demo.module.css',
        'manifest': 'lib/effects/manifest.ts',
        'package.json': 'package.json',
        'lockfile': 'package-lock.json' if original or variant == 'react01' else 'pnpm-lock.yaml',
        'framework config': 'tsconfig.json' if original else 'vite.config.mjs' if variant == 'react01' else 'next.config.ts',
        'Flower MP4': 'public/media/flower.mp4',
        'Flower poster': 'public/media/motifs/flower-poster.jpg',
        'VP9 derivative': 'public/media/flower.webm',
    }
    for item, path in selections.items():
        data = read(variant, path)
        matrix.append({'variant': variant, 'item': item, 'path': path, 'bytes': len(data) if data is not None else None, 'sha256': HASH(data) if data is not None else None})
        if data is not None and path.endswith(('.tsx', '.ts', '.css')):
            text_versions.setdefault(item, {})[variant] = data.decode()
    for name in ['VERT', 'FRAG', 'DEFAULT_SETTINGS']:
        data = renderer_part(renderer, name)
        matrix.append({'variant': variant, 'item': name + ' exact extracted bytes', 'path': f'{component}/renderer.ts::{name}', 'bytes': len(data), 'sha256': HASH(data)})
        if name == 'DEFAULT_SETTINGS':
            defaults[variant] = data.decode()
    for f in sorted((root / 'public/media').rglob('*')):
        if not f.is_file():
            continue
        if f.suffix.lower() not in ['.mp4', '.webm', '.jpg', '.png']:
            continue
        data = read(variant, str(f.relative_to(root)))
        if data is None:
            continue
        row = {'variant': variant, 'path': str(f.relative_to(root)), 'bytes': len(data), 'sha256': HASH(data)}
        if f.suffix in ['.mp4', '.webm']:
            info = subprocess.run(['ffprobe', '-v', 'quiet', '-show_format', '-show_streams', '-of', 'json', str(f)], capture_output=True, text=True)
            row['ffprobe'] = json.loads(info.stdout)
        media.append(row)

source = OUT / 'source'
source.mkdir(exist_ok=True)
for item, versions in text_versions.items():
    chain = ['golden-checkpoint', 'proof03-shelf', 'react01', 'ui-forge', 'branded', 'consolidated-HEAD', 'consolidated-working']
    present = [v for v in chain if v in versions]
    for a, b in zip(present, present[1:]):
        if versions[a] != versions[b]:
            diff = ''.join(difflib.unified_diff(versions[a].splitlines(True), versions[b].splitlines(True), fromfile=f'{a}/{item}', tofile=f'{b}/{item}'))
            (source / (item.replace('/', '-') + f'--{a}--{b}.diff')).write_text(diff)

(source / 'hash-matrix.json').write_text(json.dumps({'generatedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'algorithm': 'SHA-256 of complete raw file or named exact extracted block; no whitespace normalization', 'variants': {k: {'root': str(v[0]), 'component': v[1]} for k, v in VARIANTS.items()}, 'rows': matrix}, indent=2) + '\n')
with (source / 'hash-matrix.tsv').open('w') as file:
    writer = csv.DictWriter(file, fieldnames=['variant', 'item', 'path', 'bytes', 'sha256'], delimiter='\t')
    writer.writeheader()
    writer.writerows(matrix)
(source / 'defaults.json').write_text(json.dumps(defaults, indent=2) + '\n')
(source / 'media-inventory.json').write_text(json.dumps(media, indent=2) + '\n')
lines = ['# Exact SHA-256 matrix', '', 'Raw bytes; `—` means absent. `consolidated-HEAD` is commit `9926dbc`; working includes the pre-existing High defaults and any explicitly documented audit fix. Exact source equality does not establish visual equality.', '']
for variant in VARIANTS:
    lines += [f'## {variant}', '', '| Item | Bytes | SHA-256 |', '| --- | ---: | --- |']
    lines += [f"| {r['item']} | {r['bytes'] if r['bytes'] is not None else '—'} | `{r['sha256']}` |" if r['sha256'] else f"| {r['item']} | — | — |" for r in matrix if r['variant'] == variant]
    lines += ['']
(source / 'HASH_MATRIX.md').write_text('\n'.join(lines))
print(json.dumps({'variants': len(VARIANTS), 'hashRows': len(matrix), 'mediaFiles': len(media), 'shaderHashes': {name: sorted({r['sha256'] for r in matrix if r['item'] == name + ' exact extracted bytes'}) for name in ['VERT', 'FRAG']}, 'output': str(source)}, indent=2))
