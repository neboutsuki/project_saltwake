"""Rebuild the self-contained playable HTML from editable source, world data, art files and code modules.

Inputs
  source/game.template.html   game code (legacy layers) with placeholders
  source/modules/*.js         gameplay/presentation modules, inlined at @@SALTWAKE_MODULE:name.js@@
  world/world.json            canonical world data
  assets/manifest.json        every art file (image/svg) and its aliases; files live in assets/
Art packs (manifest entries with "pack") are registered into the sprite library under their aliases, so code
refers to art only by alias. Weathered building art ("weathers": <source media key>) is indexed so the game can
swap a source image for its weathered file.
"""
from pathlib import Path
import base64, json, re, sys
sys.path.insert(0, str(Path(__file__).resolve().parent / 'tools'))
import buildinfo

root = Path(__file__).resolve().parent
out = Path(sys.argv[1]) if len(sys.argv) > 1 else root / 'playable/SALTWAKE_v0.30.0_Unseen_War.html'
s = (root / 'source/game.template.html').read_text(encoding='utf-8')
world = (root / 'world/world.json').read_text(encoding='utf-8'); json.loads(world)
s = s.replace('@@SALTWAKE_WORLD_JSON@@', world)
manifest = json.loads((root / 'assets/manifest.json').read_text(encoding='utf-8'))
cache = {}


def data_url(key):
    if key not in cache:
        a = manifest[key]
        cache[key] = 'data:' + a['mime'] + ';base64,' + base64.b64encode((root / a['path']).read_bytes()).decode('ascii')
    return cache[key]


def sig(url):
    return str(len(url)) + ':' + url[-48:]


# Art packs -> sprite library aliases (resolved to data URLs below with the other media placeholders).
extra = {al: '@@SALTWAKE_MEDIA:' + k + '@@' for k, a in manifest.items() if a.get('pack') for al in a.get('aliases', [])}
packs = sorted({a['pack'] for a in manifest.values() if a.get('pack')})
s = s.replace('@@SALTWAKE_EXTRA_ASSETS@@', buildinfo.script() + 'Object.assign(window.SALTWAKE_ASSETS.images,' + json.dumps(extra) + ');window.SALTWAKE_ART_PACKS=' + json.dumps(packs) + ';')
weather_index = {sig(data_url(a['weathers'])): 'weathered/' + a['weathers'] for a in manifest.values() if a.get('weathers')}
s = s.replace('@@SALTWAKE_WEATHER_INDEX@@', 'window.SALTWAKE_WEATHER_INDEX=' + json.dumps(weather_index) + ';')
# Code modules are inlined verbatim.
s = re.sub(r'@@SALTWAKE_MODULE:([A-Za-z0-9_.-]+)@@', lambda m: (root / 'source/modules' / m.group(1)).read_text(encoding='utf-8').replace('</script', '<\\/script'), s)
s = re.sub(r'@@SALTWAKE_MEDIA:([a-z0-9_]+)@@', lambda m: data_url(m.group(1)), s)
out.parent.mkdir(parents=True, exist_ok=True)
out.write_bytes(s.encode('utf-8'))
print(out)
