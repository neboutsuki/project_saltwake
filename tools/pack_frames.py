"""Pack single animation frames into horizontal strips the game loads.

    python tools/pack_frames.py <frames_dir> <out_dir>

<frames_dir>/<character>/work/<action>_01.png .. _NN.png  ->  <out_dir>/<character>_work.png (frames left to right)
<frames_dir>/<character>/<dir>/<anim>_NN.png             ->  <out_dir>/<character>_<dir>_<anim>.png (only if missing)
Put the results in incoming_art/characters/story/ and run tools/import_art.py.
"""
import sys, re
from pathlib import Path
from PIL import Image

src, out = Path(sys.argv[1]), Path(sys.argv[2])
out.mkdir(parents=True, exist_ok=True)
groups = {}
for f in sorted(src.glob('*/*/*.png')):
    who, d = f.parts[-3], f.parts[-2]
    m = re.match(r'(.+)_(\d+)\.png$', f.name)
    if not m:
        continue
    name = f'{who}_work' if d == 'work' else f'{who}_{d}_{m[1]}'
    groups.setdefault(name, []).append(f)
for name, fs in groups.items():
    dst = out / f'{name}.png'
    if dst.exists() and not name.endswith('_work'):
        continue
    ims = [Image.open(f).convert('RGBA') for f in fs]
    w, h = ims[0].size
    strip = Image.new('RGBA', (w * len(ims), h))
    for i, im in enumerate(ims):
        strip.paste(im, (i * w, 0))
    strip.save(dst, optimize=True)
    print(dst.name, len(ims), 'frames', (w, h))
