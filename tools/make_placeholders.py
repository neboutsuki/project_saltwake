"""Placeholder art for things whose real art is not made yet. Real image files with the final names, so delivering
the real art (same path) replaces them everywhere with no code change.

    python tools/make_placeholders.py
"""
from pathlib import Path
import hashlib, json, math
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
MAN = ROOT / 'assets/manifest.json'


def tidemaw():
    """Top-down eel-like brine beast facing right, crab-armored head, teal gill sacs. 288x176."""
    W, H = 288, 176
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    body = (52, 60, 58, 255); belly = (78, 88, 82, 255); dark = (22, 26, 26, 255); barn = (176, 170, 150, 255)
    # body: tapering segments from tail (left) to neck (right)
    for i in range(14):
        t = i / 13; x = 30 + t * 170; r = 14 + 26 * math.sin(t * math.pi * .55 + .25); y = H / 2 + math.sin(t * 3.2) * 10
        d.ellipse([x - r, y - r * .9, x + r, y + r * .9], fill=body, outline=dark, width=2)
        d.ellipse([x - r * .55, y - r * .35, x + r * .55, y + r * .35], fill=belly)
        for k in range(3):
            a = (i * 37 + k * 71) % 360; px = x + math.cos(math.radians(a)) * r * .6; py = y + math.sin(math.radians(a)) * r * .5
            d.ellipse([px - 2.5, py - 2.5, px + 2.5, py + 2.5], fill=barn)
    # tail fin
    d.polygon([(34, H / 2), (2, H / 2 - 26), (12, H / 2), (2, H / 2 + 26)], fill=(60, 72, 70, 255), outline=dark)
    # gill sacs (teal, glowing)
    for s in (-1, 1):
        cx, cy = 196, H / 2 + s * 34
        d.ellipse([cx - 20, cy - 16, cx + 20, cy + 16], fill=(60, 170, 168, 255), outline=(20, 70, 70, 255), width=3)
        d.ellipse([cx - 10, cy - 7, cx + 6, cy + 5], fill=(150, 240, 230, 255))
    # crab-armored head
    d.polygon([(206, H / 2 - 34), (262, H / 2 - 24), (284, H / 2), (262, H / 2 + 24), (206, H / 2 + 34), (196, H / 2)], fill=(122, 66, 56, 255), outline=dark)
    for k in range(4):
        x0 = 214 + k * 14
        d.line([(x0, H / 2 - 26 + k * 3), (x0 + 8, H / 2 + 26 - k * 3)], fill=(90, 46, 40, 255), width=2)
    # jaw teeth
    for k in range(5):
        y0 = H / 2 - 16 + k * 8
        d.polygon([(278, y0), (288, y0 + 3), (278, y0 + 6)], fill=(232, 222, 210, 255))
    # eyes
    for s in (-1, 1):
        d.ellipse([248, H / 2 + s * 14 - 4, 256, H / 2 + s * 14 + 4], fill=(240, 210, 120, 255))
    d.text((70, H - 16), 'PLACEHOLDER', fill=(255, 255, 255, 140))
    return im


def register(man, alias, path):
    key = 'placeholder_' + alias.replace('/', '_')
    man[key] = {'path': str(path.relative_to(ROOT)), 'mime': 'image/png', 'aliases': [alias], 'pack': 'art-new', 'placeholder': True,
                'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}


def main():
    man = json.loads(MAN.read_text())
    real = {a for v in man.values() if not v.get('placeholder') for a in v.get('aliases', [])}
    for alias, make in (('art/bosses/tidemaw', tidemaw),):
        if alias in real:
            print('real art exists, skipped', alias); continue
        p = ROOT / 'assets' / (alias + '.png'); p.parent.mkdir(parents=True, exist_ok=True); make().save(p)
        register(man, alias, p); print('placeholder', alias)
    MAN.write_text(json.dumps(man, indent=1))


if __name__ == '__main__':
    main()
