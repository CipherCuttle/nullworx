#!/usr/bin/env python3
"""Create browser delivery encodes from the verified cyclic masters."""
import datetime
import fractions
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[2]
MASTER = ROOT / 'evidence/diagnostics/seamless-masters'
OUT = ROOT / 'public/media/loops'
EVIDENCE = ROOT / 'evidence/seamless-demos-2026-10-30'
OUT.mkdir(parents=True, exist_ok=True)
master_receipt = json.loads((EVIDENCE / 'encoding.json').read_text())
if not master_receipt['pass']:
    raise SystemExit('Cyclic masters must pass decoded frame validation first.')
rows = []
rebuild = sys.argv[sys.argv.index('--rebuild') + 1] if '--rebuild' in sys.argv else None
for reel in master_receipt['reels']:
    name = reel['name']
    source = MASTER / f'{name}.mp4'
    info = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_streams', '-of', 'json', str(source)]))['streams'][0]
    color = []
    for field, flag in [('color_range', '-color_range'), ('color_space', '-colorspace'), ('color_transfer', '-color_trc'), ('color_primaries', '-color_primaries')]:
        if info.get(field) not in (None, 'unknown', 'unspecified'):
            color += [flag, info[field]]
    outputs = []
    rate = fractions.Fraction(info['r_frame_rate'])
    key_interval = max(1, round(float(rate)))
    for ext in ['mp4', 'webm']:
        path = OUT / f'{name}.{ext}'
        if '--verify-only' in sys.argv or (rebuild and name != rebuild):
            if not path.exists():
                raise SystemExit(f'Missing delivery encode: {path}')
        elif name == 'flower':
            # Preserve approved held Flower frames exactly, outside its seam.
            if ext == 'mp4':
                subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(source), '-map', '0:v:0', '-an', '-c:v', 'libx264', '-qp', '0', '-preset', 'medium', '-g', str(key_interval), '-keyint_min', str(key_interval), '-sc_threshold', '0', '-movflags', '+frag_keyframe+empty_moov+default_base_moof', *color, str(path)], check=True)
            else:
                subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(source), '-an', '-c:v', 'libvpx-vp9', '-lossless', '1', '-g', str(key_interval), '-row-mt', '1', '-threads', '4', '-deadline', 'good', '-cpu-used', '4', *color, str(path)], check=True)
        else:
            codec = ['-c:v', 'libx264', '-crf', '16', '-preset', 'slow', '-bf', '0', '-g', str(key_interval), '-keyint_min', str(key_interval), '-sc_threshold', '0', '-movflags', '+frag_keyframe+empty_moov+default_base_moof'] if ext == 'mp4' else ['-c:v', 'libvpx-vp9', '-crf', '18', '-b:v', '0', '-g', str(key_interval), '-row-mt', '1', '-threads', '4', '-deadline', 'good', '-cpu-used', '4']
            subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(source), '-an', *codec, '-pix_fmt', 'yuv420p', *color, str(path)], check=True)
        # WebM's 1 ms timestamp quantization must not compare a frame to its
        # predecessor. Compare the same decoded frame indices at a common PTS.
        clock = f'settb=1/{rate.numerator},setpts=N*{rate.denominator}'
        compared = subprocess.run(['ffmpeg', '-hide_banner', '-i', str(source), '-i', str(path), '-filter_complex', f'[0:v]{clock}[a];[1:v]{clock}[b];[a][b]psnr', '-an', '-f', 'null', '-'], capture_output=True, text=True, check=True)
        match = re.search(r'PSNR .*average:([\d.]+|inf)', compared.stderr)
        psnr = match.group(1) if match else None
        passed = psnr is not None and (psnr == 'inf' or float(psnr) >= 40)
        delivery_info = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_streams', '-of', 'json', str(path)]))['streams'][0]
        profile = 'F4' if delivery_info['profile'] == 'High 4:4:4 Predictive' else '64'
        codec = f'avc1.{profile}00{delivery_info["level"]:02X}' if ext == 'mp4' else 'vp9'
        mime = f'video/{ext}; codecs="{codec}"'
        outputs.append({'file': str(path.relative_to(ROOT)), 'mime': mime, 'bytes': path.stat().st_size, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest(), 'psnrAverageDbVsLosslessMaster': psnr, 'pass': passed})
    rows.append({'name': name, 'duration': reel['duration'], 'fps': reel['fps'], 'frames': reel['originalFrames'] - reel['overlapFrames'], 'outputs': outputs})
    print(name, [(o['bytes'], o['psnrAverageDbVsLosslessMaster']) for o in outputs], flush=True)
receipt = {'capturedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'method': 'Flower delivery retains the decoded lossless cyclic master; other reels use high-quality encodes measured at >=40 dB PSNR against their verified cyclic masters.', 'reels': rows, 'pass': all(o['pass'] for row in rows for o in row['outputs'])}
(EVIDENCE / 'delivery.json').write_text(json.dumps(receipt, indent=2) + '\n')
if not receipt['pass']:
    raise SystemExit('Delivery fidelity verification failed.')
