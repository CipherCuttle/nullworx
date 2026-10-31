#!/usr/bin/env python3
"""Make cyclic, lossless review derivatives without changing any original reel.

The first 18 output frames ease from the original tail to the original head.
The remaining frames keep their ORIGINAL frame indices/timestamps. Thus the
last-to-first cut is two adjacent original frames, and Flower at 2.2 s remains
the exact original frame. Every untouched body frame is verified by decoded MD5.
"""
import datetime
import fractions
import hashlib
import json
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[2]
PROOF = Path('/home/swirky/DevHub/experiments/ascii-waves-proof03')
OUT = ROOT / 'evidence/diagnostics/seamless-masters'
EVIDENCE = ROOT / 'evidence/seamless-demos-2026-10-30'
OUT.mkdir(parents=True, exist_ok=True)
EVIDENCE.mkdir(parents=True, exist_ok=True)


def run(args):
    return subprocess.check_output(args, text=True, stderr=subprocess.PIPE)


def frames(path):
    raw = run(['ffmpeg', '-v', 'error', '-i', str(path), '-map', '0:v:0', '-an', '-f', 'framemd5', '-'])
    return [row.split(',')[-1].strip() for row in raw.splitlines() if row and not row.startswith('#')]


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


rows = []
for name, source in [
    ('flower', ROOT / 'public/media/flower.mp4'),
    *[(name, PROOF / f'public/media/motifs/{file}.mp4') for name, file in [('jellyfish', 'jellyfish'), ('koi', 'koi'), ('smoke', 'smoke'), ('orion', 'nebula')]],
]:
    info = json.loads(run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_streams', '-of', 'json', str(source)]))['streams'][0]
    rate = fractions.Fraction(info['r_frame_rate'])
    original_hash = sha(source)
    # The preserved renderer maps source luma directly to glyph coverage. Pure
    # blue is only 11% luma, leaving Jellyfish almost empty. Lift its blue light
    # into red/green in a separate derivative; black and white remain fixed.
    grade = 'colorchannelmixer=rr=0.5:rb=0.5:gg=0.5:gb=0.5:bb=1' if name == 'jellyfish' else None
    prepared = source
    if grade:
        prepared = OUT / f'{name}-prepared.mp4'
        if not prepared.exists():
            subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(source), '-an', '-vf', grade + ',format=yuv420p', '-c:v', 'libx264', '-qp', '0', '-preset', 'medium', str(prepared)], check=True)
    original = frames(prepared)
    n = len(original)
    overlap = 18
    cycle = n - overlap
    fade_end = float(fractions.Fraction(overlap - 1, 1) / rate)
    weight = f'(0.5-0.5*cos(PI*T/{fade_end:.15f}))'
    blend = f'if(lte(T,0.000001),A,if(gte(T,{fade_end - .00001:.15f}),B,A*(1-{weight})+B*{weight}))'
    filters = (
        f'[0:v]format=yuv420p,split=3[h][t][b];'
        f'[h]trim=start_frame=0:end_frame={overlap},setpts=PTS-STARTPTS[head];'
        f'[t]trim=start_frame={cycle}:end_frame={n},setpts=PTS-STARTPTS[tail];'
        f'[tail][head]blend=all_expr=\'{blend}\'[seam];'
        f'[b]trim=start_frame={overlap}:end_frame={cycle},setpts=PTS-STARTPTS[body];'
        f'[seam][body]concat=n=2:v=1:a=0,settb=1/{rate.numerator},setpts=N*{rate.denominator}[v]'
    )
    color_args = []
    for field, flag in [('color_range', '-color_range'), ('color_space', '-colorspace'), ('color_transfer', '-color_trc'), ('color_primaries', '-color_primaries')]:
        if info.get(field) not in (None, 'unknown', 'unspecified'):
            color_args += [flag, info[field]]
    mp4, webm = OUT / f'{name}.mp4', OUT / f'{name}.webm'
    if not mp4.exists():
        subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(prepared), '-filter_complex_threads', '1', '-filter_complex', filters, '-map', '[v]', '-an', '-c:v', 'libx264', '-qp', '0', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-r', str(rate), '-fps_mode', 'cfr', '-video_track_timescale', str(rate.numerator), '-movflags', '+faststart', *color_args, str(mp4)], check=True)
    if not webm.exists():
        subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(mp4), '-an', '-c:v', 'libvpx-vp9', '-lossless', '1', '-row-mt', '1', '-threads', '4', '-deadline', 'good', '-cpu-used', '4', '-pix_fmt', 'yuv420p', *color_args, str(webm)], check=True)
    encoded = []
    for path in [mp4, webm]:
        decoded = frames(path)
        body_matches = all(decoded[i] == original[i] for i in range(overlap, cycle))
        passed = len(decoded) == cycle and body_matches and decoded[0] == original[cycle] and decoded[overlap - 1] == original[overlap - 1] and decoded[-1] == original[cycle - 1]
        encoded.append({'file': str(path.relative_to(ROOT)), 'bytes': path.stat().st_size, 'sha256': sha(path), 'frames': len(decoded), 'bodyFramesMatchingPreparedSource': cycle - overlap if body_matches else 0, 'bodyFramesMatchingOriginal': cycle - overlap if body_matches and not grade else None, 'loopCutIsAdjacentPreparedFrames': decoded[-1] == original[cycle - 1] and decoded[0] == original[cycle], 'fadeEndsOnExactHeadFrame': decoded[overlap - 1] == original[overlap - 1], 'pass': passed})
    row = {'name': name, 'source': str(source), 'sourceSha256': original_hash, 'sourceUnchanged': sha(source) == original_hash, 'grade': grade, 'fps': str(rate), 'originalFrames': n, 'overlapFrames': overlap, 'duration': float(fractions.Fraction(cycle, 1) / rate), 'method': 'Cosine-eased cyclic tail/head dissolve at source time zero; lossless body retains prepared source frame indices. Only Jellyfish has a documented luma lift.', 'outputs': encoded}
    rows.append(row)
    write = {'capturedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'ffmpeg': run(['ffmpeg', '-version']).splitlines()[0], 'reels': rows, 'pass': all(r['sourceUnchanged'] and all(o['pass'] for o in r['outputs']) for r in rows)}
    (EVIDENCE / 'encoding.json').write_text(json.dumps(write, indent=2) + '\n')
    print(name, 'frames', n, '->', cycle, 'pass', all(o['pass'] for o in encoded), flush=True)
    if not all(o['pass'] for o in encoded):
        raise SystemExit('Decoded-frame preservation or cyclic seam validation failed.')
