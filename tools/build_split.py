"""Build SALTWAKE as a normal multi-file web project (no embedded art, no inline code).

    python tools/build_split.py [out_dir]        (default: dist/SALTWAKE)

Layout produced:
  index.html          page shell only: markup + <link>/<script src> tags in the original execution order
  css/NN.css          stylesheets (in order)
  js/engine/NN.js     the original game code layers, one file per former <script> block (same order)
  js/modules/*.js     v0.30+ systems (camera, sky, renderer, HUD, ...)
  js/art-packs.js     art-pack alias registration + weathered-art index
  data/world.js       canonical world data (window.SALTWAKE_WORLD = ...)
  assets/...          every art file, referenced by relative path (copied from /assets)
  play.bat / play.sh  start a local web server and open the game

Browsers restrict pixel reads and WebGL uploads of images opened from file://, so run it through the launcher
(or any static web server). The single-file build (python build.py) still exists for "double-click and play".
"""
from pathlib import Path
import json, re, shutil, sys
sys.path.insert(0, str(Path(__file__).resolve().parent))
import buildinfo

ROOT = Path(__file__).resolve().parent.parent
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'dist' / 'SALTWAKE'
tpl = (ROOT / 'source/game.template.html').read_text(encoding='utf-8')
manifest = json.loads((ROOT / 'assets/manifest.json').read_text(encoding='utf-8'))
world = (ROOT / 'world/world.json').read_text(encoding='utf-8'); json.loads(world)

if OUT.exists():
    shutil.rmtree(OUT)
for d in ['css', 'js/engine', 'js/modules', 'data', 'assets']:
    (OUT / d).mkdir(parents=True, exist_ok=True)

# Art: copy files, reference by relative path.
for key, a in manifest.items():
    src = ROOT / a['path']
    dst = OUT / a['path']
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dst)
shutil.copy2(ROOT / 'assets/manifest.json', OUT / 'assets/manifest.json')
if (ROOT / 'assets/README.md').exists():
    shutil.copy2(ROOT / 'assets/README.md', OUT / 'assets/README.md')
path_of = lambda k: manifest[k]['path']   # already "assets/..."
media = lambda m: path_of(m.group(1))

# Data: world JSON as a script so it also loads without fetch().
s = tpl.replace('@@SALTWAKE_WORLD_JSON@@', 'window.__SALTWAKE_WORLD_DATA')
(OUT / 'data/world.js').write_text('window.__SALTWAKE_WORLD_DATA=' + world + ';\n', encoding='utf-8')

# Art packs + weathered index (index keys are computed from the art the runtime actually loads).
extra = {al: path_of(k) for k, a in manifest.items() if a.get('pack') for al in a.get('aliases', [])}
packs = sorted({a['pack'] for a in manifest.values() if a.get('pack')})
s = s.replace('@@SALTWAKE_EXTRA_ASSETS@@', buildinfo.script() + 'Object.assign(window.SALTWAKE_ASSETS.images,' + json.dumps(extra) + ');window.SALTWAKE_ART_PACKS=' + json.dumps(packs) + ';')
widx = {}
for a in manifest.values():
    if a.get('weathers'):
        u = path_of(a['weathers'])
        widx[str(len(u)) + ':' + u[-48:]] = 'weathered/' + a['weathers']
s = s.replace('@@SALTWAKE_WEATHER_INDEX@@', 'window.SALTWAKE_WEATHER_INDEX=' + json.dumps(widx) + ';window.SALTWAKE_RELATIVE_ART=true;')
s = re.sub(r'@@SALTWAKE_MEDIA:([a-z0-9_]+)@@', media, s)

# Modules -> files; engine script blocks -> files; styles -> files.
mod_names = []
def mod(m):
    name = m.group(1)
    shutil.copy2(ROOT / 'source/modules' / name, OUT / 'js/modules' / name)
    mod_names.append(name)
    return '\x00MODULE:' + name + '\x00'
s = re.sub(r'<script>@@SALTWAKE_MODULE:([A-Za-z0-9_.-]+)@@</script>', mod, s)

n = [0]
def script(m):
    body = m.group(1)
    n[0] += 1
    name = f'{n[0]:03d}.js'
    if body.startswith('window.__SALTWAKE_WORLD_DATA') or body.strip() == '':
        pass
    (OUT / 'js/engine' / name).write_text(body, encoding='utf-8')
    return f'<script src="js/engine/{name}"></script>'
s = re.sub(r'<script>(.*?)</script>', script, s, flags=re.S)
s = re.sub('\x00MODULE:([^\x00]+)\x00', lambda m: f'<script src="js/modules/{m.group(1)}"></script>', s)

c = [0]
def style(m):
    c[0] += 1
    name = f'{c[0]:02d}.css'
    (OUT / 'css' / name).write_text(m.group(1), encoding='utf-8')
    return f'<link rel="stylesheet" href="css/{name}">'
s = re.sub(r'<style>(.*?)</style>', style, s, flags=re.S)

# World data must load before the first engine script that reads it.
s = s.replace('<script src="js/engine/001.js"></script>', '<script src="data/world.js"></script><script src="js/engine/001.js"></script>', 1)
(OUT / 'index.html').write_text(s, encoding='utf-8')

(OUT / 'play.bat').write_text('@echo off\r\ncd /d "%~dp0"\r\nwhere py >nul 2>nul && (start "" http://localhost:8765/ & py -m http.server 8765 & goto :eof)\r\nwhere python >nul 2>nul && (start "" http://localhost:8765/ & python -m http.server 8765 & goto :eof)\r\necho Python is needed to run the local server: https://www.python.org/downloads/\r\npause\r\n', encoding='utf-8')
(OUT / 'play.sh').write_text('#!/bin/sh\ncd "$(dirname "$0")"\n(sleep 1; (xdg-open http://localhost:8765/ || open http://localhost:8765/) >/dev/null 2>&1) &\nexec python3 -m http.server 8765\n', encoding='utf-8')
(OUT / 'play.sh').chmod(0o755)
(OUT / 'README.txt').write_text(
    'SALTWAKE — project build (code, data and art in separate folders)\n\n'
    'Play: double-click play.bat (Windows) or run ./play.sh (macOS/Linux). It starts a local web server and opens\n'
    'http://localhost:8765/ in your browser. Requires Python 3. Close the console window to stop.\n'
    '(Opening index.html directly from disk is blocked by browser security for parts of the renderer.)\n\n'
    'Folders: index.html (page shell) · css/ · js/engine/ (original game code) · js/modules/ (new systems) ·\n'
    'data/world.js (world data) · assets/ (all art; see assets/README.md and assets/manifest.json).\n', encoding='utf-8')
print(OUT, n[0], 'engine scripts,', len(mod_names), 'modules,', c[0], 'stylesheets,', len(manifest), 'art files')
