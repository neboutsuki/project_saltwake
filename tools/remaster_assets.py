"""SALTWAKE asset remaster pipeline.

Deterministic, reversible pass over every embedded sprite:
  * originals are preserved once in assets/original/ and are always the input, so re-running is idempotent;
  * per-category colour grade (unified contrast curve, cool shadows / warm highlights, saturation control);
  * mild unsharp mask on sprites and icons (never on tiling terrain, so seams stay intact);
  * 1px soft dark rim on characters, creatures, props and foliage for readability against busy ground.
Image dimensions never change, so draw sizes, offsets and collisions are unaffected.

Usage:  python tools/remaster_assets.py            # remaster all
        python tools/remaster_assets.py --restore  # put originals back
"""
from pathlib import Path
import hashlib, json, shutil, sys
from PIL import Image, ImageFilter, ImageChops
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / 'assets'
ORIG = ASSETS / 'original'
MANIFEST = ASSETS / 'manifest.json'

TILE = ('terrain/', 'atlas/', 'painted/', 'coast/materials/')
WIDE = ('coast/keyart', 'interior/', 'coast/v0170/smithy-interior', 'coast/v0170/smithy-forecourt', 'pinewall/harbor_smoke')
ACTOR_WORDS = ('actors/', 'player', 'guard', 'dock', 'ledger', 'medic', 'merchant', 'resident', 'smith', 'brine', 'grazer',
               'gull', 'widow', 'wrecker', 'salvager', 'male_', 'female_', 'worker_', 'drifter', 'caller', 'breaker', 'quartermaster')


def category(aliases):
    a = (aliases or ['?'])[0]
    if a.startswith(TILE): return 'tile'
    if a.startswith(WIDE) or a == '?': return 'wide'
    if a.startswith('coast/icons/'): return 'icon'
    if a.startswith(('buildings/', 'coast/buildings/', 'prefab/', 'coast/v0170/', 'coast/v0171/')): return 'building'
    if a.startswith(('vegetation/', 'coast/foliage/', 'ashen25d/')): return 'foliage'
    if any(w in a for w in ACTOR_WORDS): return 'actor'
    return 'prop'


# grade parameters per category: (contrast, saturation, shadow_cool, highlight_warm, sharpen%, rim_alpha)
GRADE = {
    'tile':     (1.06, 0.92, 0.035, 0.015, 0,   0),
    'wide':     (1.05, 0.95, 0.030, 0.015, 0,   0),
    'icon':     (1.08, 1.04, 0.020, 0.020, 70,  0),
    'building': (1.08, 0.94, 0.040, 0.020, 55,  0),
    'foliage':  (1.07, 0.98, 0.035, 0.015, 45,  95),
    'actor':    (1.09, 1.00, 0.030, 0.020, 60,  150),
    'prop':     (1.08, 0.96, 0.035, 0.020, 55,  110),
}


def grade(rgb, contrast, sat, cool, warm):
    x = rgb.astype(np.float32) / 255.0
    # Filmic S-curve around mid grey: lifts mid contrast without crushing pixel-art darks.
    x = 0.5 + (x - 0.5) * contrast
    x = x + 0.06 * (x - 0.5) * (1 - np.abs(2 * x - 1))
    lum = (x * np.array([0.299, 0.587, 0.114], np.float32)).sum(-1, keepdims=True)
    x = lum + (x - lum) * sat
    shadow = np.clip(1 - lum * 2.2, 0, 1)
    high = np.clip(lum * 2 - 1.1, 0, 1)
    x = x + shadow * np.array([-cool * .6, -cool * .1, cool], np.float32)
    x = x + high * np.array([warm, warm * .45, -warm * .5], np.float32)
    return (np.clip(x, 0, 1) * 255 + .5).astype(np.uint8)


def rim(im, alpha):
    a = im.getchannel('A')
    grown = a.point(lambda v: 255 if v > 40 else 0).filter(ImageFilter.MaxFilter(3))
    edge = ImageChops.subtract(grown, a.point(lambda v: 255 if v > 40 else 0))
    edge = edge.point(lambda v: alpha if v else 0)
    out = Image.new('RGBA', im.size, (18, 16, 22, 0))
    out.putalpha(edge)
    return Image.alpha_composite(out, im)


def process(src, cat):
    im = Image.open(src)
    has_alpha = im.mode in ('RGBA', 'LA', 'P') and 'A' in im.convert('RGBA').getbands()
    im = im.convert('RGBA')
    c, s, cool, warm, sharp, rim_a = GRADE[cat]
    arr = np.array(im)
    arr[..., :3] = grade(arr[..., :3], c, s, cool, warm)
    out = Image.fromarray(arr, 'RGBA')
    if sharp:
        rgb = out.convert('RGB').filter(ImageFilter.UnsharpMask(radius=1, percent=sharp, threshold=2))
        rgb.putalpha(out.getchannel('A'))
        out = rgb
    alpha = np.array(out.getchannel('A'))
    if rim_a and alpha.min() < 10 and min(out.size) >= 24:
        out = rim(out, rim_a)
    return out, has_alpha


def main():
    manifest = json.loads(MANIFEST.read_text())
    ORIG.mkdir(exist_ok=True)
    restore = '--restore' in sys.argv
    counts = {}
    for key, a in manifest.items():
        path = ROOT / a['path']
        keep = ORIG / path.name
        if not keep.exists():
            shutil.copy2(path, keep)
        if restore:
            shutil.copy2(keep, path)
        else:
            cat = category(a.get('aliases'))
            counts[cat] = counts.get(cat, 0) + 1
            out, _ = process(keep, cat)
            if path.suffix == '.webp':
                # Painted ground/backdrops were shipped as lossy WebP; keep that so the build stays small.
                if cat in ('tile', 'wide'):
                    out.save(path, 'WEBP', quality=90, method=6)
                else:
                    out.save(path, 'WEBP', lossless=True, method=6)
            elif path.suffix in ('.jpg', '.jpeg'):
                out.convert('RGB').save(path, 'JPEG', quality=93)
            else:
                out.save(path, 'PNG', optimize=True)
            a['remaster'] = cat
        a['sha256'] = hashlib.sha256(path.read_bytes()).hexdigest()
        if restore:
            a.pop('remaster', None)
    MANIFEST.write_text(json.dumps(manifest, indent=1))
    print('restored' if restore else counts)


if __name__ == '__main__':
    main()
