"""Cut rain-puddle decals out of the generated wet-mud ground art (assets/art/tiles/wet_mud.png).

The tile already contains painted puddles (smooth, grey, low-saturation water). This finds them, makes the water
see-through (glints stay bright) with a slightly softer edge, and writes assets/decals/puddle_<n>.png (the
aliases the terrain-decal system already uses, "decals/puddle_<n>"). The tile wraps, so puddles crossing an edge are
cut from a 2x2 tiled copy.

    python tools/cut_puddles.py
"""
from pathlib import Path
import hashlib, json
import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'assets/art/tiles/wet_mud.png'
OUT = ROOT / 'assets/decals'
MANIFEST = ROOT / 'assets/manifest.json'
COUNT = 3


def components(mask):
    h, w = mask.shape
    lab = np.zeros((h, w), int)
    n = 0
    for y in range(h):
        for x in range(w):
            if mask[y, x] and not lab[y, x]:
                n += 1
                st = [(y, x)]
                lab[y, x] = n
                while st:
                    cy, cx = st.pop()
                    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        ny, nx = cy + dy, cx + dx
                        if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not lab[ny, nx]:
                            lab[ny, nx] = n
                            st.append((ny, nx))
    return lab, n


def main():
    tile = Image.open(SRC).convert('RGB')
    w, h = tile.size
    big = Image.new('RGB', (w * 2, h * 2))
    for oy in (0, h):
        for ox in (0, w):
            big.paste(tile, (ox, oy))
    a = np.asarray(big).astype(float)
    lum = a.mean(-1)
    sat = a.max(-1) - a.min(-1)
    # local roughness: puddles are smooth
    blur = np.asarray(big.convert('L').filter(ImageFilter.BoxBlur(2))).astype(float)
    rough = np.abs(lum - blur)
    water = (sat < 16) & (lum > 52) & (lum < 125) & (rough < 9)
    m = Image.fromarray((water * 255).astype('uint8')).filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.MinFilter(5)).filter(ImageFilter.MaxFilter(3))
    mask = np.asarray(m) > 127
    lab, n = components(mask)
    found = []
    for i in range(1, n + 1):
        ys, xs = np.where(lab == i)
        if len(ys) < 900:
            continue
        if ys.min() < 4 or xs.min() < 4 or ys.max() > 2 * h - 5 or xs.max() > 2 * w - 5:
            continue
        cy, cx = ys.mean(), xs.mean()
        if not (h * .25 <= cy < h * 1.25 and w * .25 <= cx < w * 1.25):   # one copy of each wrapped puddle
            continue
        found.append((len(ys), i, ys, xs))
    found.sort(reverse=True)
    written = []
    man = json.loads(MANIFEST.read_text())
    for k, (_, i, ys, xs) in enumerate(found[:COUNT], 1):
        pad = 6
        y0, y1, x0, x1 = ys.min() - pad, ys.max() + pad + 1, xs.min() - pad, xs.max() + pad + 1
        crop = big.crop((x0, y0, x1, y1)).convert('RGBA')
        selm = lab[y0:y1, x0:x1] == i
        sel = Image.fromarray((selm * 255).astype('uint8'))
        # Shallow water: see-through body so the ground under it shows, brighter glints stay strong, a 1-2 px
        # softer edge. No mud rim (it would not match every ground type).
        inner = np.asarray(sel.filter(ImageFilter.MinFilter(3))) > 127
        clum = np.asarray(crop.convert('L')).astype(float)
        alpha = np.where(selm, 120, 0).astype(float)
        alpha[inner] = 165
        alpha[selm & (clum > 118)] = 225
        alpha = Image.fromarray(alpha.astype('uint8'))
        crop.putalpha(alpha)
        dst = OUT / f'puddle_{k}.png'
        crop.save(dst, optimize=True)
        key = f'art_decals_puddle_{k}_png'
        if key in man:
            man[key]['sha256'] = hashlib.sha256(dst.read_bytes()).hexdigest()
            man[key]['source'] = 'cut from art/tiles/wet_mud (tools/cut_puddles.py)'
        written.append((dst.name, crop.size))
    MANIFEST.write_text(json.dumps(man, indent=1))
    print(f'{len(found)} puddles found; wrote', written)


if __name__ == '__main__':
    main()
