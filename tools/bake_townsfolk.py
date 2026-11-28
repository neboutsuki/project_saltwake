"""Bake harbor townsfolk sprite strips from the story cast art (same style, scale and animation as Ren and the cast).

Each townsperson starts from one cast member's strips (idle: 4 frames x 4 directions, walk: 8 frames up/down; 64x64
frames, feet at y=60) and gets its own clothing colours (hue/saturation/value shift of the clothes; skin is kept) and,
optionally, hair colour, so they read as different people. Output: assets/art/characters/townsfolk/<id>_<dir>_<action>.png
plus manifest entries (pack 'art-new', aliases 'art/characters/townsfolk/<id>_<dir>_<action>').

    python tools/bake_townsfolk.py
"""
import colorsys
import hashlib
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / 'assets/art/characters/story'
OUT = ROOT / 'assets/art/characters/townsfolk'
MANIFEST = ROOT / 'assets/manifest.json'

# id: (base cast member, clothes hue (0-1) or None to keep, clothes saturation x, clothes value x, hair (hue, sat, val) or None)
FOLK = {
    'folk_a': ('harlan', .60, 1.1, .95, None),                 # navy coat, burly dock hand
    'folk_b': ('ivo', .25, 1.0, 1.0, None),                    # moss-green old fisherman
    'folk_c': ('mira', .62, 1.2, .9, (.02, .2, .2)),         # red-dress townswoman, auburn hair
    'folk_d': ('marin', .48, .95, 1.0, (.06, .4, .32)),        # teal clerk, sandy hair
    'folk_e': ('master_rook', .12, 1.2, 1.05, None),           # ochre-aproned labourer
    'folk_f': ('tess', .80, .9, .9, (.05, .15, .25)),            # plum-cloaked salvager, black hair
    'folk_g': ('soren', .07, 1.9, .8, (.07, .45, .3)),        # grey-robed townswoman, brown hair
    'folk_h': ('lira', .58, 1.0, 1.05, (.03, .55, .5)),         # blue-jacket youth, blond hair
}
STRIPS = [('down', 'idle'), ('up', 'idle'), ('left', 'idle'), ('right', 'idle'), ('down', 'walk'), ('up', 'walk')]


def is_skin(h, s, v):
    return .015 <= h <= .11 and .18 <= s <= .62 and v >= .5


def is_hair_candidate(y, h, s, v, top):
    return y <= top + 13 and v < .62 and not is_skin(h, s, v)


def recolor(im, hue, smul, vmul, hair):
    im = im.convert('RGBA')
    px = im.load()
    W, H = im.size
    fw = 64
    for f in range(W // fw):
        # top of the figure in this frame (for the hair band)
        top = next((y for y in range(H) for x in range(f * fw, f * fw + fw) if px[x, y][3] > 40), 0)
        for y in range(H):
            for x in range(f * fw, f * fw + fw):
                r, g, b, a = px[x, y]
                if a == 0:
                    continue
                h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
                if is_skin(h, s, v):
                    continue
                head = y <= top + 13
                if head:
                    if not (hair and is_hair_candidate(y, h, s, v, top)):
                        continue
                    hh, hs, hv = hair       # hair: new colour, the original light and shade kept
                    nh, ns, nv = hh, min(.55, hs * (.5 + s)), min(1, (v / .45) * hv * .8 + .04)
                elif v < .12:            # line work and deep shadow stay dark
                    continue
                else:                    # clothes: muted shift towards the new hue, blended with the original
                    th = h if hue is None else hue
                    k = .7
                    nh = th if hue is not None else h
                    ns = min(.5, s * smul)
                    nv = min(1, v * vmul)
                    r0, g0, b0 = colorsys.hsv_to_rgb(nh % 1, ns, nv)
                    r1, g1, b1 = r / 255, g / 255, b / 255
                    nh, ns, nv = colorsys.rgb_to_hsv(r1 + (r0 - r1) * k, g1 + (g0 - g1) * k, b1 + (b0 - b1) * k)
                nr, ng, nb = colorsys.hsv_to_rgb(nh % 1, max(0, ns), max(0, nv))
                px[x, y] = (round(nr * 255), round(ng * 255), round(nb * 255), a)
    return im


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    for fid, (base, hue, smul, vmul, hair) in FOLK.items():
        for d, act in STRIPS:
            src = SRC / f'{base}_{d}_{act}.png'
            if not src.exists():
                continue
            out = OUT / f'{fid}_{d}_{act}.png'
            recolor(Image.open(src), hue, smul, vmul, hair).save(out, optimize=True)
            data = out.read_bytes()
            alias = f'art/characters/townsfolk/{fid}_{d}_{act}'
            manifest[f'art_townsfolk_{fid}_{d}_{act}'] = {'path': str(out.relative_to(ROOT)), 'mime': 'image/png', 'aliases': [alias],
                                                         'pack': 'art-new', 'staged': False, 'sha256': hashlib.sha256(data).hexdigest()}
        print('baked', fid, 'from', base)
    MANIFEST.write_text(json.dumps(manifest, indent=1, ensure_ascii=False) + '\n', encoding='utf-8')


if __name__ == '__main__':
    main()
