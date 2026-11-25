"""Import new art into the game.

Drop files into incoming_art/<category>/<name>.png (see docs/ART_PROMPTS.md for names and sizes), then run:

    python tools/import_art.py            # check + import
    python tools/import_art.py --check    # only report problems

Each valid file is copied to assets/art/<category>/<name>.png and registered in assets/manifest.json with alias
"art/<category>/<name>" and pack "art-new", marked "staged" (not inlined into the single-file build until the game
uses it; clear the flag when a map starts using the file). Re-importing a file replaces it. Nothing in incoming_art is modified.
Checks: PNG, has an alpha channel (except tiles/), no semi-transparent fringe (warns), dimensions multiple of 8
(warns), expected size if listed in EXPECTED.
"""
from pathlib import Path
import csv, hashlib, json, re, shutil, sys
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
INCOMING = ROOT / 'incoming_art'
DEST = ROOT / 'assets' / 'art'
MANIFEST = ROOT / 'assets' / 'manifest.json'
PACK = 'art-new'
LIST = ROOT / 'docs' / 'asset_list.csv'
SOFT_OK = ('tiles', 'icons', 'ui', 'vfx')  # may keep soft alpha edges


def expected_sizes():
    """file -> (priority, (w, h) or None) from docs/asset_list.csv; expands name_01..04 ranges."""
    out = {}
    if not LIST.exists():
        return out
    for r in csv.DictReader(open(LIST, encoding='utf-8')):
        m = re.match(r'(.*_)(\d+)\.\.(\d+)(\.png)$', r['file'])
        names = [f'{m[1]}{i:0{len(m[2])}d}{m[4]}' for i in range(int(m[2]), int(m[3]) + 1)] if m else [r['file']]
        sz = re.match(r'(\d+)×(\d+)', r.get('size') or '')
        for n in names:
            out[n] = (r['priority'], (int(sz[1]), int(sz[2])) if sz else None)
    return out


def autofix(im, rel, category, want):
    """Fixes applied to the imported copy (incoming_art is never changed). Returns (image, notes)."""
    notes = []
    im = im.convert('RGBA')
    # 1. Oversized generator output -> exact size with nearest-neighbor, when the aspect ratio matches.
    if want and im.size != want and category != 'vfx':
        w, h = im.size
        if w > want[0] and abs(w / h - want[0] / want[1]) < 0.02:
            im = im.resize(want, Image.NEAREST)
            notes.append(f'resized {w}x{h} -> {want[0]}x{want[1]} (nearest)')
    # 2. Hard pixel-art edges for world sprites: snap soft alpha to 0/255.
    if category not in SOFT_OK:
        a = im.getchannel('A')
        if sum(a.histogram()[1:255]):
            im.putalpha(a.point(lambda v: 255 if v >= 128 else 0))
            notes.append('hardened soft edges')
    return im, notes


def frames_of(im, category):
    """Horizontal animation strips (vfx/ or *_strip): frame count when the width is a whole number of squares."""
    w, h = im.size
    if category == 'vfx' and w > h and w % h == 0:
        return w // h
    return None
EXPECTED = {  # category -> (w, h) when strict; None = any multiple of 8
    'tiles': (32, 32), 'plants': None, 'trees': None, 'buildings': None, 'props': None, 'edges': None,
    'characters': None, 'bosses': None, 'ui': None,
}


def check(path, category):
    problems, warnings = [], []
    try:
        im = Image.open(path)
        im.load()
    except Exception as e:
        return [f'cannot open: {e}'], []
    w, h = im.size
    exp = EXPECTED.get(category)
    if exp and category == 'tiles' and (w % 32 or h % 32):
        problems.append(f'tile size {w}x{h} is not a multiple of 32')
    elif w % 8 or h % 8:
        warnings.append(f'size {w}x{h} is not a multiple of 8')
    if category not in ('tiles', 'icons', 'ui', 'vfx'):  # UI and effects may use soft edges
        if 'A' not in im.getbands() and im.mode != 'P':
            problems.append('no transparency (needs a transparent background)')
        else:
            a = im.convert('RGBA').getchannel('A')
            hist = a.histogram()
            partial = sum(hist[1:255])
            if partial > 0.02 * w * h:
                warnings.append(f'{partial} semi-transparent pixels (soft edges); pixel art should have hard edges')
            if hist[0] == 0:
                problems.append('background is not transparent')
    return problems, warnings


def main():
    only_check = '--check' in sys.argv
    if not INCOMING.exists():
        INCOMING.mkdir()
        print('Created incoming_art/. Put new art there (see docs/ART_PROMPTS.md).')
        return
    man = json.loads(MANIFEST.read_text())
    exp = expected_sizes()
    ok = bad = 0
    seen = set()
    for path in sorted(INCOMING.rglob('*.png')):
        rel = path.relative_to(INCOMING)
        category = rel.parts[0] if len(rel.parts) > 1 else 'misc'
        problems, warnings = check(path, category)
        tag = 'FAIL' if problems else ('WARN' if warnings else 'OK  ')
        print(f'{tag} {rel}' + ''.join(f'\n      - {m}' for m in problems + warnings))
        if problems:
            bad += 1
            continue
        ok += 1
        seen.add(str(rel).replace('\\', '/'))
        if only_check:
            continue
        dst = DEST / rel
        dst.parent.mkdir(parents=True, exist_ok=True)
        im, notes = autofix(Image.open(path), rel, category, (exp.get(str(rel).replace('\\', '/')) or (0, None))[1])
        im.save(dst, optimize=True)
        for n in notes:
            print(f'      * {n}')
        frames = frames_of(im, category)
        alias = 'art/' + str(rel.with_suffix('')).replace('\\', '/')
        key = 'art_new_' + re.sub('[^a-z0-9_]', '_', alias.lower())
        man[key] = {'path': 'assets/art/' + str(rel).replace('\\', '/'), 'mime': 'image/png', 'aliases': [alias],
                    'pack': PACK, 'staged': True, 'sha256': hashlib.sha256(dst.read_bytes()).hexdigest()}
        if frames:
            man[key]['frames'] = frames
    if not only_check:
        MANIFEST.write_text(json.dumps(man, indent=1))
    print(f'\n{ok} ok, {bad} failed' + ('' if only_check else ' — imported. Run: python build.py'))
    report(exp, seen | {v['aliases'][0][4:] + '.png' for v in man.values() if v.get('pack') == PACK})


def report(exp, have):
    """Writes docs/ART_STATUS.md: what is delivered and what is still missing, by priority."""
    if not exp:
        return
    lines = ['# Art status (written by tools/import_art.py)', '']
    for pri in sorted({p for p, _ in exp.values()}):
        names = [n for n, (p, _) in exp.items() if p == pri]
        done = [n for n in names if n in have]
        lines.append(f'## {pri}: {len(done)}/{len(names)} delivered')
        missing = [n for n in names if n not in have]
        lines += [f'- [ ] `{n}`' for n in missing] or ['- all delivered']
        lines.append('')
    extra = sorted(h for h in have if h not in exp)
    lines += [f'## Extra files not on the list: {len(extra)}', ''] + [f'- `{n}`' for n in extra]
    (ROOT / 'docs' / 'ART_STATUS.md').write_text('\n'.join(lines) + '\n')
    print('Wrote docs/ART_STATUS.md')


if __name__ == '__main__':
    main()
