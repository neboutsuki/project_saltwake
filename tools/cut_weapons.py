"""Cut the weapon sheet (incoming_art/source/weapons_sheet.webp, 3 rows x 2 columns on white) into game art.

For each weapon it writes:
  assets/art/weapons/<name>.png      the weapon on a transparent background (alias art/weapons/<name>)
  assets/art/icons/weapon_<name>.png 64x64 inventory icon (alias art/icons/weapon_<name>)
  assets/ui/weapon_<name>_sil.png    white translucent HUD silhouette (alias ui/weapon_<name>, replaces the old SVG)
The background is removed by flood-filling near-white from the image border, so light highlights inside a weapon stay.

    python tools/cut_weapons.py
"""
from pathlib import Path
import hashlib, json
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'incoming_art/source/weapons_sheet.webp'
LAYOUT = [['arbalest', 'wickcaster'], ['spear', 'harpoon_gun'], ['greataxe', 'knife']]
MAN = ROOT / 'assets/manifest.json'


def background(a):
    """Near-white pixels connected to the border."""
    h, w = a.shape[:2]
    rgb = a[..., :3].astype(int)
    white = (rgb.min(-1) > 222) & ((rgb.max(-1) - rgb.min(-1)) < 22)
    bg = np.zeros((h, w), bool)
    stack = [(y, x) for x in range(w) for y in (0, h - 1)] + [(y, x) for y in range(h) for x in (0, w - 1)]
    while stack:
        y, x = stack.pop()
        if bg[y, x] or not white[y, x]:
            continue
        bg[y, x] = True
        if y > 0: stack.append((y - 1, x))
        if y < h - 1: stack.append((y + 1, x))
        if x > 0: stack.append((y, x - 1))
        if x < w - 1: stack.append((y, x + 1))
    return bg


def reg(man, key, path, alias, mime='image/png'):
    for k in [k for k, v in man.items() if alias in v.get('aliases', []) and k != key]:
        man[k]['aliases'] = [a for a in man[k]['aliases'] if a != alias]   # new art takes the alias over
    man[key] = {'path': str(path.relative_to(ROOT)), 'mime': mime, 'aliases': [alias], 'pack': 'art-new',
                'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}


def main():
    im = Image.open(SRC).convert('RGBA')
    a = np.asarray(im).copy()
    bg = background(a)
    # soften: pixels next to the background that are very light become transparent (white fringe)
    a[bg, 3] = 0
    rgb = a[..., :3].astype(int)
    edge = np.zeros_like(bg)
    edge[1:, :] |= bg[:-1, :]; edge[:-1, :] |= bg[1:, :]; edge[:, 1:] |= bg[:, :-1]; edge[:, :-1] |= bg[:, 1:]
    a[edge & ~bg & (rgb.min(-1) > 200), 3] = 0
    H, W = a.shape[:2]
    man = json.loads(MAN.read_text())
    out = []
    for r, row in enumerate(LAYOUT):
        for c, name in enumerate(row):
            cell = a[r * H // 3:(r + 1) * H // 3, c * W // 2:(c + 1) * W // 2]
            ys, xs = np.where(cell[..., 3] > 0)
            crop = Image.fromarray(cell[ys.min():ys.max() + 1, xs.min():xs.max() + 1])
            # weapons: max 192 px long (game scale), nearest-neighbour keeps the pixel look
            k = 192 / max(crop.size)
            wpn = crop.resize((max(1, round(crop.width * k)), max(1, round(crop.height * k))), Image.LANCZOS)
            al = np.asarray(wpn)[..., 3]; arr = np.asarray(wpn).copy(); arr[..., 3] = np.where(al > 110, 255, 0); wpn = Image.fromarray(arr)
            p = ROOT / f'assets/art/weapons/{name}.png'; p.parent.mkdir(parents=True, exist_ok=True); wpn.save(p, optimize=True)
            reg(man, f'art_weapon_{name}', p, f'art/weapons/{name}')
            # icon 64x64, diagonal like the other item icons
            ic = crop.rotate(35, expand=True, resample=Image.BICUBIC)
            ib = ic.getbbox(); ic = ic.crop(ib); k = 58 / max(ic.size)
            ic = ic.resize((max(1, round(ic.width * k)), max(1, round(ic.height * k))), Image.LANCZOS)
            icon = Image.new('RGBA', (64, 64)); icon.paste(ic, ((64 - ic.width) // 2, (64 - ic.height) // 2), ic)
            p = ROOT / f'assets/art/icons/weapon_{name}.png'; icon.save(p, optimize=True)
            reg(man, f'art_new_art_icons_weapon_{name}', p, f'art/icons/weapon_{name}')
            # HUD silhouette: white, translucent edge, 128 px wide
            k = 128 / max(crop.size)
            sil = crop.resize((max(1, round(crop.width * k)), max(1, round(crop.height * k))), Image.LANCZOS)
            sa = np.asarray(sil)[..., 3].astype(float)
            s = np.zeros((sil.height, sil.width, 4), np.uint8); s[..., :3] = 255; s[..., 3] = np.clip(sa * 1.1, 0, 255).astype(np.uint8)
            sq = Image.new('RGBA', (128, 128)); simg = Image.fromarray(s); sq.paste(simg, ((128 - simg.width) // 2, (128 - simg.height) // 2), simg)
            p = ROOT / f'assets/ui/weapon_{name}_sil.png'; sq.save(p, optimize=True)
            reg(man, f'art_ui_weapon_{name}_sil', p, f'ui/weapon_{name}')
            out.append((name, wpn.size))
    MAN.write_text(json.dumps(man, indent=1))
    print(out)


if __name__ == '__main__':
    main()
