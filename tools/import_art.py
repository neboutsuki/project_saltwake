"""Import new art into the game.

Drop files into incoming_art/<category>/<name>.png (see docs/ART_PROMPTS.md for names and sizes), then run:

    python tools/import_art.py            # check + import
    python tools/import_art.py --check    # only report problems

Each valid file is copied to assets/art/<category>/<name>.png and registered in assets/manifest.json with alias
"art/<category>/<name>" and pack "art-new". Re-importing a file replaces it. Nothing in incoming_art is modified.
Checks: PNG, has an alpha channel (except tiles/), no semi-transparent fringe (warns), dimensions multiple of 8
(warns), expected size if listed in EXPECTED.
"""
from pathlib import Path
import hashlib, json, re, shutil, sys
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
INCOMING = ROOT / 'incoming_art'
DEST = ROOT / 'assets' / 'art'
MANIFEST = ROOT / 'assets' / 'manifest.json'
PACK = 'art-new'
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
    if category != 'tiles':
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
    ok = bad = 0
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
        if only_check:
            continue
        dst = DEST / rel
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(path, dst)
        alias = 'art/' + str(rel.with_suffix('')).replace('\\', '/')
        key = 'art_new_' + re.sub('[^a-z0-9_]', '_', alias.lower())
        man[key] = {'path': 'assets/art/' + str(rel).replace('\\', '/'), 'mime': 'image/png', 'aliases': [alias],
                    'pack': PACK, 'sha256': hashlib.sha256(dst.read_bytes()).hexdigest()}
    if not only_check:
        MANIFEST.write_text(json.dumps(man, indent=1))
    print(f'\n{ok} ok, {bad} failed' + ('' if only_check else ' — imported. Run: python build.py'))


if __name__ == '__main__':
    main()
