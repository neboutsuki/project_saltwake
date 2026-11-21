#!/usr/bin/env python3
"""SALTWAKE data build.

Composes the editable JSON sources into the browser bundles that index.html
loads with plain <script> tags (so the game runs from file:// with no server):

  data/meta/project.json + data/graphics/styles.json
  + data/maps/*.json + data/content/*.json      -> data/generated/world.js
                                                  data/generated/world_project.json
  assets/manifest.json                          -> data/generated/assets.js
  data/graphics/terrain_layers/*.json           -> data/generated/terrain_maps.js

Edit the JSON sources, never the generated files. Run:  python tools/build.py
Use --check to verify the generated files are up to date (CI / QA).
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
GEN = DATA / "generated"

# Key order of the original bundle, preserved so diffs stay readable.
MAP_ORDER = ["hub", "quays"]
CONTENT_ORDER = ["schema", "items", "lootTables", "npcs", "dialogues", "quests",
                 "containers", "interactables", "shops", "worldEvents", "weapons",
                 "enemies", "mechanics", "factions", "factionAgents"]


def load(p):
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def compact(obj):
    return json.dumps(obj, ensure_ascii=False, separators=(",", ":"))


def compose_world():
    world = dict(load(DATA / "meta" / "project.json"))
    maps = {}
    names = [p.stem for p in sorted((DATA / "maps").glob("*.json"))]
    for mid in MAP_ORDER + [n for n in names if n not in MAP_ORDER]:
        maps[mid] = load(DATA / "maps" / f"{mid}.json")
    world["maps"] = maps
    styles = load(DATA / "graphics" / "styles.json")
    world["graphics"] = styles["graphics"]
    world["visualRules"] = styles["visualRules"]
    content = {}
    names = [p.stem for p in sorted((DATA / "content").glob("*.json"))]
    for cid in [n for n in CONTENT_ORDER if n in names] + [n for n in names if n not in CONTENT_ORDER]:
        content[cid] = load(DATA / "content" / f"{cid}.json")
    world["content"] = content
    return world


def outputs():
    world = compose_world()
    terrain = {
        p.stem: load(p)
        for p in sorted((DATA / "graphics" / "terrain_layers").glob("*.json"))
    }
    assets = load(ROOT / "assets" / "manifest.json")
    return {
        GEN / "world.js": "window.SALTWAKE_WORLD=" + compact(world) + ";\n",
        GEN / "world_project.json": json.dumps(world, ensure_ascii=False, indent=2) + "\n",
        GEN / "assets.js": "window.SALTWAKE_ASSETS=" + compact(assets) + ";\n",
        GEN / "terrain_maps.js": "window.SALTWAKE_TERRAIN=" + compact(terrain) + ";\n",
    }


def parse_bundle(path):
    s = path.read_text(encoding="utf-8")
    if path.suffix == ".json":
        return json.loads(s)
    return json.loads(s[s.index("=") + 1 :].strip().rstrip(";"))


def main():
    check = "--check" in sys.argv
    stale = []
    for path, text in outputs().items():
        if check:
            want = json.loads(text) if path.suffix == ".json" else json.loads(
                text[text.index("=") + 1 :].strip().rstrip(";")
            )
            if not path.exists() or parse_bundle(path) != want:
                stale.append(path.relative_to(ROOT))
        else:
            path.write_text(text, encoding="utf-8")
            print("wrote", path.relative_to(ROOT))
    if check:
        if stale:
            print("STALE generated files (run python tools/build.py):", *stale, sep="\n  ")
            sys.exit(1)
        print("generated bundles are up to date")


if __name__ == "__main__":
    main()
