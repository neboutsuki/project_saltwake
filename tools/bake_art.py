"""Bake SALTWAKE's v0.31+ art into real image files so the game code only *places* images.

Outputs (all registered in assets/manifest.json with "pack": "art-v031"):
  assets/weathered/<name>.png   weathered variants of every building sprite (light, footing grime, brine, salt
                                streaks, roof ash). Alias: "weathered/<original alias>".
  assets/decals/*.png           terrain decals: salt crusts, ash drifts, cracks, pebbles, puddles. Alias: "decals/<name>".
  assets/fx/*.png               particles: ash flakes, ember, rain streak, splash. Alias: "fx/<name>".
  assets/ui/*.svg               HUD icons and weapon silhouettes. Alias: "ui/<name>".

Every output is an ordinary editable file. Re-running regenerates them from the current building sprites; an artist
can instead paint over any file and stop re-running the bake for it (delete its entry from BAKE_SKIP below).
Usage:  python tools/bake_art.py
"""
from pathlib import Path
import hashlib, json, math, random, re
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / 'assets'
MANIFEST = ASSETS / 'manifest.json'
PACK = 'art-v031'
BAKE_SKIP = set()   # paths (relative to assets/) an artist has hand-edited; the bake leaves them alone


def rgba(r, g, b, a):
    return (r, g, b, int(round(a * 255)))


def over(base, layer):
    return Image.alpha_composite(base, layer)


def stip(d, cx, cy, r, col, dens, R, px=1, flat=.6, stretch=1.0):
    n = int(round(r * r * dens))
    for _ in range(n):
        a = R.random() * 6.283
        dd = r * math.sqrt(R.random())
        x = cx + math.cos(a) * dd * stretch
        y = cy + math.sin(a) * dd * flat
        x = round(x / px) * px
        y = round(y / px) * px
        d.rectangle([x, y, x + px - 1, y + px - 1], fill=col)


def patch(d, cx, cy, r, col, dens, R, px, flat, stretch):
    n = 4 + int(R.random() * 4)
    ang = R.random() * 6.283
    for _ in range(n):
        dd = r * .75 * math.sqrt(R.random())
        a = ang + (R.random() - .5) * 2.2
        stip(d, cx + math.cos(a) * dd * stretch, cy + math.sin(a) * dd * flat, r * (.28 + R.random() * .38), col,
             dens * (.5 + R.random() * .8), R, px, flat, stretch * (.8 + R.random() * .5))


def gradient(size, stops, axis):
    """stops: list of (t, rgba). axis 'diag' | 'v'."""
    w, h = size
    import numpy as np
    yy, xx = np.mgrid[0:h, 0:w].astype('float32')
    t = (xx / max(1, w - 1) + yy / max(1, h - 1)) / 2 if axis == 'diag' else yy / max(1, h - 1)
    out = np.zeros((h, w, 4), 'float32')
    for (t0, c0), (t1, c1) in zip(stops, stops[1:]):
        m = (t >= t0) & (t <= t1)
        k = ((t - t0) / max(1e-6, t1 - t0))[..., None]
        out[m] = (np.array(c0, 'float32') * (1 - k) + np.array(c1, 'float32') * k)[m]
    return Image.fromarray(out.clip(0, 255).astype('uint8'), 'RGBA')


def weather(src, seed):
    im = src.convert('RGBA')
    w, h = im.size
    R = random.Random(seed)
    px = max(1, round(w / 300))
    layer = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    layer = over(layer, gradient((w, h), [(0, rgba(255, 222, 176, .2)), (.45, rgba(0, 0, 0, 0)), (1, rgba(14, 18, 32, .32))], 'diag'))
    foot = gradient((w, h), [(0, (10, 9, 9, 0)), (.68, (10, 9, 9, 0)), (1, rgba(10, 9, 9, .52))], 'v')
    layer = over(layer, foot)
    d = ImageDraw.Draw(layer, 'RGBA')
    for _ in range(max(3, w // 40)):
        stip(d, R.random() * w, h * (.9 + R.random() * .08), 6 + R.random() * 14 * px, rgba(86, 118, 96, .22), .6, R, px, .45, 1.6)
    for _ in range(w // 9):
        sx = round(R.random() * w / px) * px
        sy = h * (.38 + R.random() * .3)
        ln = h * (.08 + R.random() * .22)
        d.rectangle([sx, sy, sx + px - 1, sy + ln], fill=rgba(236, 224, 214, .08 + R.random() * .12))
        if R.random() < .4:
            d.rectangle([sx + px, sy, sx + 2 * px - 1, sy + ln * .7], fill=rgba(30, 24, 22, .08))
    for _ in range(w * h // 420):
        yy = R.random() * h * .45
        x = round(R.random() * w / px) * px
        y = round(yy / px) * px
        d.rectangle([x, y, x + px - 1, y + px - 1], fill=rgba(210, 204, 196, .1 + R.random() * .2 * (1 - yy / (h * .45))))
    for _ in range(2):
        stip(d, R.random() * w, h * (.55 + R.random() * .35), 4 + R.random() * 7 * px, rgba(214, 150, 138, .14), .6, R, px, .7)
    for _ in range(w * h // 60):
        x = round(R.random() * w / px) * px
        y = round(R.random() * h / px) * px
        d.rectangle([x, y, x + px - 1, y + px - 1], fill=rgba(0, 0, 0, .05) if R.random() < .5 else rgba(255, 255, 255, .035))
    # Only where the building exists (source-atop).
    alpha = im.getchannel('A')
    la = layer.getchannel('A')
    from PIL import ImageChops
    layer.putalpha(ImageChops.multiply(la, alpha))
    return over(im, layer)


def decal(kind, seed, size=128):
    R = random.Random(seed)
    im = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(im, 'RGBA')
    c = size / 2
    if kind == 'salt_crust':
        r = size * .36
        patch(d, c, c, r, rgba(226, 208, 200, .3), .55, R, 2, .55, 1.2)
        patch(d, c, c, r * .8, rgba(206, 140, 128, .24), .4, R, 2, .55, 1.2)
        stip(d, c, c, r * .7, rgba(255, 246, 240, .85), .012, R, 2, .55)
    elif kind == 'ash_drift':
        r = size * .3
        patch(d, c, c, r, rgba(70, 68, 66, .32), .5, R, 2, .38, 1.6)
        patch(d, c - r * .3, c - r * .06, r * .55, rgba(180, 174, 166, .25), .4, R, 2, .3, 1.8)
    elif kind == 'crack':
        def walk(sx, sy, a, n, depth):
            pts = [(sx, sy)]
            for _ in range(n):
                a += (R.random() - .5) * .9
                sx += math.cos(a) * 7
                sy += math.sin(a) * 4.2
                pts.append((round(sx / 2) * 2, round(sy / 2) * 2))
                if depth < 2 and R.random() < .18:
                    walk(sx, sy, a + (1 if R.random() < .5 else -1) * .9, 4 + int(R.random() * 5), depth + 1)
            d.line(pts, fill=rgba(34, 27, 23, .6), width=2)
        walk(c - size * .3, c, R.random() * .6 - .3, 10 + int(R.random() * 5), 0)
    elif kind == 'pebbles':
        for _ in range(14):
            x = round((c + (R.random() - .5) * size * .7) / 2) * 2
            y = round((c + (R.random() - .5) * size * .45) / 2) * 2
            q = 2 if R.random() < .7 else 4
            d.rectangle([x, y, x + q * 2 - 1, y + q - 1], fill=rgba(30, 26, 24, .7))
            d.rectangle([x, y - q, x + q * 2 - 1, y - 1], fill=rgba(220, 212, 200, .45))
    elif kind == 'puddle':
        rx = size * (.3 + R.random() * .12)
        ry = rx * (.38 + R.random() * .1)
        d.ellipse([c - rx, c - ry, c + rx, c + ry], fill=rgba(34, 48, 60, .62))
        d.ellipse([c - rx * .75, c - ry * .65, c + rx * .45, c + ry * .25], fill=rgba(120, 145, 165, .28))
        d.arc([c - rx, c - ry, c + rx, c + ry], 200, 340, fill=rgba(185, 200, 212, .5), width=2)
    return im


def fx(kind):
    if kind == 'ash_flake':
        im = Image.new('RGBA', (6, 5), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
        d.rectangle([1, 1, 4, 3], fill=rgba(226, 220, 210, .85)); d.rectangle([0, 2, 5, 2], fill=rgba(226, 220, 210, .45))
    elif kind == 'ash_flake_small':
        im = Image.new('RGBA', (3, 3), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
        d.rectangle([0, 0, 2, 2], fill=rgba(222, 216, 206, .7)); d.point((1, 1), fill=rgba(240, 236, 228, 1))
    elif kind == 'ember':
        im = Image.new('RGBA', (5, 5), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
        d.rectangle([1, 1, 3, 3], fill=rgba(232, 120, 70, .75)); d.point((2, 2), fill=rgba(255, 200, 120, 1))
    elif kind == 'rain_streak':
        im = Image.new('RGBA', (2, 22), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
        for y in range(22):
            d.point((0, y), fill=rgba(196, 210, 222, .15 + .5 * y / 22))
    elif kind == 'splash':
        im = Image.new('RGBA', (16, 8), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
        d.ellipse([1, 1, 14, 6], outline=rgba(205, 218, 228, .7), width=1)
    return im


UI = {
    'heart': '<path fill="#f07a68" d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.6 4.5c2.1 0 3.6 1.2 5.4 3.2 1.8-2 3.3-3.2 5.4-3.2 3.6 0 5.7 3.9 4.2 7.3C19.5 16.4 12 21 12 21z"/>',
    'stamina': '<path fill="#8fd4e8" d="M13.5 2 4 13.5h6.5L9 22l11-12.5h-6.8z"/>',
    'bleed': '<path fill="#ff6b5e" d="M12 2s7 8 7 13a7 7 0 0 1-14 0c0-5 7-13 7-13z"/>',
    'lantern': '<path fill="#ffffff" d="M9 2h6v2h-1v1.2c2.4.6 4 2.6 4 5V18a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-7.8c0-2.4 1.6-4.4 4-5V4H9z"/><rect fill="#ffffff" x="8" y="21" width="8" height="1.6" rx=".8"/>',
    'ammo_bolt': '<g fill="#ffffff"><path d="M3 21 17 7l2 2L5 23z"/><path d="M16 4l6-2-2 6-2 1-3-3z"/><path d="M3 18l3 3-4 1z"/></g>',
    'ammo_cell': '<g fill="#ffffff"><rect x="7" y="4" width="10" height="17" rx="2"/><rect x="10" y="1" width="4" height="3"/></g><path d="M12 8l-2 5h3l-2 5" fill="none" stroke="#000" stroke-opacity=".6" stroke-width="1.5"/>',
}
UI_WEAPONS = {
    'weapon_arbalest': '<g fill="#ffffff"><path d="M6 30h40l6-4h6v12h-6l-6-4H6z"/><path d="M30 10c6 6 8 14 8 22s-2 16-8 22l-3-2c5-6 7-13 7-20s-2-14-7-20z"/><rect x="40" y="34" width="5" height="14" rx="1.5"/></g><path d="M30 12 22 32l8 20" fill="none" stroke="#ffffff" stroke-width="1.6"/>',
    'weapon_wickcaster': '<g fill="#ffffff"><rect x="6" y="26" width="34" height="12" rx="3"/><rect x="40" y="23" width="12" height="18" rx="2"/><path d="M52 29h7v6h-7z"/><rect x="14" y="38" width="7" height="14" rx="2"/><path d="M46 23c0-6 4-8 6-12 1 4-1 7-3 9z"/></g>',
    'weapon_spear': '<g fill="#ffffff"><path d="M8 56 46 18l3 3L11 59z"/><path d="M44 12 58 6l-6 14-6 2-4-4z"/><rect x="18" y="40" width="9" height="3" transform="rotate(-45 22 41)"/></g>',
}


def keyof(rel):
    return 'art_' + re.sub('[^a-z0-9_]', '_', rel.lower())


def write_png(rel, im, out):
    path = ASSETS / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    if rel not in BAKE_SKIP:
        im.save(path, 'PNG', optimize=True)
    out.append((rel, 'image/png'))


def main():
    man = json.loads(MANIFEST.read_text())
    # drop previous bake entries; they are regenerated below
    man = {k: v for k, v in man.items() if v.get('pack') != PACK}
    produced = []
    # Weathered building variants, keyed by source media key. Sources: every sprite the remaster tagged as a
    # building, plus the harbor house set referenced by housesArt in the game template.
    tpl = (ROOT / 'source' / 'game.template.html').read_text(encoding='utf-8')
    hm = re.search(r'housesArt=\{(.*?)\};', tpl)
    harbor = set(re.findall(r'@@SALTWAKE_MEDIA:([a-z0-9_]+)@@', hm.group(1))) if hm else set()
    sources = [k for k, a in man.items() if not a.get('pack') and (a.get('remaster') == 'building' or k in harbor)]
    for key in sources:
        a = man[key]
        rel = f'weathered/{key}.png'
        write_png(rel, weather(Image.open(ROOT / a['path']), int(hashlib.md5(key.encode()).hexdigest()[:8], 16)), produced)
        man[keyof(rel)] = {'path': 'assets/' + rel, 'mime': 'image/png', 'aliases': [f'weathered/{key}'], 'weathers': key, 'pack': PACK}
    for kind, n in [('salt_crust', 4), ('ash_drift', 4), ('crack', 3), ('pebbles', 3), ('puddle', 3)]:
        for i in range(n):
            rel = f'decals/{kind}_{i + 1}.png'
            write_png(rel, decal(kind, 1000 * i + len(kind), 128), produced)
            man[keyof(rel)] = {'path': 'assets/' + rel, 'mime': 'image/png', 'aliases': [f'decals/{kind}_{i + 1}'], 'pack': PACK}
    for kind in ['ash_flake', 'ash_flake_small', 'ember', 'rain_streak', 'splash']:
        rel = f'fx/{kind}.png'
        write_png(rel, fx(kind), produced)
        man[keyof(rel)] = {'path': 'assets/' + rel, 'mime': 'image/png', 'aliases': [f'fx/{kind}'], 'pack': PACK}
    for name, body in list(UI.items()) + list(UI_WEAPONS.items()):
        vb = '0 0 64 64' if name.startswith('weapon_') else '0 0 24 24'
        rel = f'ui/{name}.svg'
        p = ASSETS / rel
        p.parent.mkdir(parents=True, exist_ok=True)
        if rel not in BAKE_SKIP:
            p.write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}">{body}</svg>\n')
        man[keyof(rel)] = {'path': 'assets/' + rel, 'mime': 'image/svg+xml', 'aliases': [f'ui/{name}'], 'pack': PACK}
    for k, v in man.items():
        if v.get('pack') == PACK:
            v['sha256'] = hashlib.sha256((ROOT / v['path']).read_bytes()).hexdigest()
    MANIFEST.write_text(json.dumps(man, indent=1))
    print(len([v for v in man.values() if v.get('pack') == PACK]), 'art files baked/registered')


if __name__ == '__main__':
    main()
