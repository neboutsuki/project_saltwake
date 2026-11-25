"""Expand docs/asset_list.csv into one ready-to-paste prompt per image file.
Writes docs/ASSET_PROMPTS_FULL.md (grouped, numbered) and docs/asset_prompts_full.txt (plain lines).
Usage: python tools/asset_prompts.py
"""
import csv, re
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
STYLE = ("High-detail pixel art game asset, 2.5D top-down three-quarter view (camera about 60 degrees looking down, front faces visible, "
         "NOT isometric), soft light from the upper-left, 1-pixel dark selective outline, bleak post-apocalyptic coastal fantasy "
         "(\"Ashen Wilds, Red Salt Coast\"): muted ash-grey palette, red-salt crust stains, brine-green rot, weathered salt-eaten wood, "
         "rusted iron, wet stone, warm lantern amber as the only saturated color. Crisp pixels, no text, no watermark.")
PORTRAIT_STYLE = ('High-detail pixel art character portrait for a dialogue box, head and shoulders bust, three-quarter view facing RIGHT, '
                  'soft light from the upper-left, 1-pixel dark selective outline, bleak post-apocalyptic coastal fantasy ("Ashen Wilds, Red Salt Coast"): '
                  'muted ash-grey palette with red-salt stains, warm lantern amber rim light, plain dark slate-grey background, crisp pixels, '
                  'no text, no frame, no watermark. Same art style and framing for every portrait.')
TILE_STYLE = ("High-detail pixel art ground texture for a top-down game, viewed straight from above (flat, no perspective, no horizon), "
              "soft light from the upper-left, bleak post-apocalyptic coastal fantasy (\"Ashen Wilds, Red Salt Coast\"): muted ash-grey palette, "
              "red-salt stains, brine-green rot. Crisp pixels, no text, no watermark.")
DIRS = [('down', 'facing the camera (front view)'), ('up', 'facing away from the camera (back view)'),
        ('left', 'facing left (side view)'), ('right', 'facing right (side view)')]
VARIANT = ['', 'a different shape and silhouette from the others', 'a different shape, slightly smaller',
           'a different shape, more damaged/weathered', 'a different shape, leaning', 'a different arrangement', 'a different arrangement, sparser']


def expand(file):
    m = re.search(r'_(\d+)\.\.(\d+)', file)
    if not m:
        return [(file, '')]
    a, b = int(m.group(1)), int(m.group(2))
    out = []
    for i in range(a, b + 1):
        f = file[:m.start()] + f'_{i:02d}' + file[m.end():]
        n = b - a + 1
        hint = f'Variant {i} of {n}' + (f', {VARIANT[min(i - a, len(VARIANT) - 1)]}' if i > a else '')
        out.append((f, hint))
    return out


def base_size(size):
    m = re.match(r'(\d+)×(\d+)', size)
    return (m.group(1), m.group(2)) if m else ('', '')


lines = []   # (category, file, prompt)
for r in csv.DictReader(open(ROOT / 'docs/asset_list.csv')):
    cat, file, size, desc, pri = r['category'], r['file'], r['size'], r['description'], r['priority']
    w, h = base_size(size)
    for f, hint in expand(file):
        tag = f'[{pri}]'
        if cat == 'Ground tiles':
            if 'transitions' in f:
                for a, b in [('packed_soil', 'sand_beach'), ('sand_beach', 'shallows'), ('shallows', 'deep_sea'), ('cobble_road', 'packed_soil'),
                             ('stone_plaza', 'packed_soil'), ('grass_short', 'packed_soil'), ('wet_mud', 'packed_soil')]:
                    lines.append((cat, f'tiles/transition_{a}__{b}.png', f'{tag} {TILE_STYLE} Seamless tileable square texture, no objects, 256x256: the left half is {a.replace("_", " ")}, the right half is {b.replace("_", " ")}, with a natural irregular blend between them that tiles vertically.'))
                continue
            lines.append((cat, f, f'{tag} {TILE_STYLE} Seamless tileable square texture, no objects, 256x256: {desc.replace("seamless tileable top-down ground texture: ", "")}.'))
        elif cat == 'Portraits':
            who = desc.replace('dialogue portrait, head and shoulders, facing right: ', '')
            lines.append((cat, f, f'{tag} {PORTRAIT_STYLE} {who}. Square image, 128x128.'))
        elif cat.startswith('Characters') or cat.startswith('Enemies'):
            npc = 'NPCs need only idle' in r['notes'] and not f.startswith('characters/player')
            name = Path(f).stem
            lines.append((cat, f'characters/{name}_design.png', f'{tag} {STYLE} Character design reference: {desc}, full body, front view, standing pose, about 52 pixels tall in a 64x64 frame, transparent background.'))
            anims = [('idle', '2-frame idle breathing animation'), ('walk', '6-frame walk cycle')] + ([] if npc else [('attack', '4-frame attack animation'), ('hit', '1-frame hit reaction'), ('death', '4-frame death animation')])
            for d, dd in DIRS:
                for an, ad in anims:
                    lines.append((cat, f'characters/{name}_{d}_{an}.png', f'{tag} {STYLE} Based on the uploaded design of the same {desc}: pixel art sprite strip, {ad}, {dd}, frames 64x64 in one horizontal row, consistent character, feet at the bottom center, transparent background.'))
        elif cat == 'Monsters':
            name = Path(f).stem
            fr = '128x128' if name in ('brineback', 'salt_widow', 'brineworn_breaker', 'ash_stag', 'reed_lurker') else '96x96'
            lines.append((cat, f'monsters/{name}_design.png', f'{tag} {STYLE} Creature design reference: {desc}, full body, three-quarter front view, transparent background, fits a {fr} frame.'))
            for d, dd in DIRS:
                for an, ad in [('idle', '2-frame idle'), ('move', '6-frame movement cycle'), ('attack', '5-frame attack with a clear wind-up pose'), ('hit', '1-frame hit reaction'), ('death', '4-frame death')]:
                    lines.append((cat, f'monsters/{name}_{d}_{an}.png', f'{tag} {STYLE} Based on the uploaded design of the {desc}: pixel art sprite strip, {ad}, {dd}, frames {fr} in one horizontal row, consistent creature, transparent background.'))
        elif cat == 'Bosses':
            name = Path(f).stem
            parts = r['notes'].replace('Breakable parts: ', '').split(', ')
            lines.append((cat, f'bosses/{name}_design.png', f'{tag} {STYLE} Boss monster design reference: {desc}. Clearly visible breakable parts: {", ".join(parts)}. Full body, three-quarter front view, imposing, transparent background, fits a 256x256 frame.'))
            for an, ad in [('idle', '4-frame idle, menacing breathing'), ('move', '6-frame movement cycle'), ('attack_bite', '5-frame lunging bite with a long readable wind-up'),
                           ('attack_spit', '5-frame projectile spit: rears back, then spits'), ('attack_sweep', '5-frame tail or limb sweep with wind-up'),
                           ('ultimate_windup', '6-frame dramatic charging pose for its ultimate attack, glowing'), ('stagger', '3-frame stagger, reeling back'),
                           ('topple', '4-frame toppled on its side, vulnerable'), ('death', '6-frame death collapse')]:
                lines.append((cat, f'bosses/{name}_{an}.png', f'{tag} {STYLE} Based on the uploaded design of the {desc}: pixel art sprite strip, {ad}, three-quarter front view, frames 256x256 in one horizontal row, transparent background.'))
            for p in parts:
                pn = re.sub(r'[^a-z0-9]+', '_', p.lower()).strip('_')
                lines.append((cat, f'bosses/{name}_part_{pn}_intact.png', f'{tag} {STYLE} Close-up overlay piece of the {desc}: its {p}, intact, matching the uploaded design, transparent background, about 64x64.'))
                lines.append((cat, f'bosses/{name}_part_{pn}_broken.png', f'{tag} {STYLE} Close-up overlay piece of the {desc}: its {p}, BROKEN (cracked, ruptured or severed, oozing), matching the uploaded design, transparent background, about 64x64.'))
        elif cat == 'Effects (VFX)':
            lines.append((cat, f, f'{tag} {STYLE} Pixel art effect animation: {desc}, frames of {size.split(" ")[0]} in one horizontal row (sprite strip), transparent background, bright readable shape.'))
        elif cat.startswith('Item icons') or cat == 'UI':
            lines.append((cat, f, f'{tag} {STYLE} Inventory icon, {desc}, centered, front three-quarter view, {w}x{h}, dark outline, transparent background.'))
        elif cat == 'Key art':
            lines.append((cat, f, f'{tag} Painterly pixel art illustration, {w}x{h}, {desc}. Bleak coastal post-apocalyptic fantasy, ash falling, red-salt stains, warm lantern light against cold blue-grey night, cinematic composition, no text.'))
        else:
            extra = ' Tiles seamlessly left-to-right.' if 'tiles horizontally' in desc else ''
            lines.append((cat, f, f'{tag} {STYLE} Single isolated object on a transparent background, no ground shadow: {desc}{". " + hint if hint else ""}. Target size {w}x{h}.{extra}'))

md = ['# SALTWAKE — every asset prompt (one line per file)', '',
      f'{len(lines)} prompts. Copy a line, paste it into ChatGPT, then save the result as `incoming_art/<file>` (shrink to size with nearest-neighbor).',
      'Prefix: [P1]/[P2]/[P3] = priority. Lines that say "Based on the uploaded design" need you to upload the matching `_design.png` image in the same chat first.', '']
cur = None
n = 0
for c, f, p in lines:
    if c != cur:
        cur = c
        md += ['', f'## {c}', '']
    n += 1
    md += [f'**{n}. `{f}`**', '', '```', p, '```', '']
(ROOT / 'docs/ASSET_PROMPTS_FULL.md').write_text('\n'.join(md) + '\n')
(ROOT / 'docs/asset_prompts_full.txt').write_text('\n'.join(f'{f}\t{p}' for c, f, p in lines) + '\n')
from collections import Counter
print(len(lines), Counter(p[1:3] for c, f, p in lines))
