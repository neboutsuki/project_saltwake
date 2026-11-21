#!/usr/bin/env python3
"""SALTWAKE static world/content validator.

Checks the JSON sources (via tools/build.py composition) for:
  * duplicate IDs and dangling references (dialogue, quest, loot, shop, faction)
  * out-of-bounds placements
  * overlapping buildings / docks
  * blocking decor (tree, stone, crate) inside buildings or in front of doors
  * protected-geometry drift against tools/geometry_lock.json

Walkability / path reachability is checked in the browser by tests/qa.js,
using the game's own collision function, so the two can never disagree.

  python tools/validate_world.py                 # validate
  python tools/validate_world.py --update-lock   # accept current geometry
                                                 # (only after a placement audit)
"""
import hashlib
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build  # noqa: E402

ROOT = build.ROOT
LOCK = ROOT / "tools" / "geometry_lock.json"
BLOCKING_DECOR = {"tree", "stone", "crate"}
DOOR_LANE = 3  # tiles in front of a door that must stay clear


def rect_overlap(a, b, margin=0.0):
    return (a["x"] - margin < b["x"] + b["w"] and b["x"] - margin < a["x"] + a["w"]
            and a["y"] - margin < b["y"] + b["h"] and b["y"] - margin < a["y"] + a["h"])


def door_lane(b):
    """Rectangle (tiles) directly outside the building's door."""
    cx = b["x"] + b["w"] / 2
    if b.get("doorSide") == "north":
        return {"x": cx - 1.5, "y": b["y"] - DOOR_LANE, "w": 3, "h": DOOR_LANE}
    return {"x": cx - 1.5, "y": b["y"] + b["h"], "w": 3, "h": DOOR_LANE}


def geometry(world):
    """Everything whose position/size is gameplay-relevant. Art may change freely."""
    out = {}
    for mid, m in world["maps"].items():
        out[mid] = {
            "size": [m["w"], m["h"], m["waterStart"]],
            "buildings": {b["id"]: [b["type"], b["x"], b["y"], b["w"], b["h"], b.get("doorSide", "south")] for b in m["buildings"]},
            "portals": {p["id"]: [p["x"], p["y"], p["target"]] for p in m["portals"]},
            "features": {f["id"]: [f["kind"], f["x"], f["y"], f["w"], f["h"]] for f in m["features"]},
            "docks": [[d["x"], d["y"], d["w"], d["h"]] for d in m["docks"]],
            "roads": m["roads"],
            "decor": {d["id"]: [d["type"], d["x"], d["y"], d["w"], d["h"]] for d in m["decor"]},
        }
    c = world["content"]
    for col in ("npcs", "interactables", "containers", "factionAgents"):
        out[col] = {o["id"]: [o.get("mapId"), o["x"], o["y"]] for o in c.get(col, [])}
    return out


def digest(obj):
    return hashlib.sha256(json.dumps(obj, sort_keys=True).encode()).hexdigest()


def validate(world):
    errors, warnings = [], []
    c = world["content"]
    maps = world["maps"]
    ids = lambda col: {o["id"] for o in c.get(col, [])}  # noqa: E731
    items, npcs, dialogues = ids("items"), ids("npcs"), ids("dialogues")
    containers, interactables, loot = ids("containers"), ids("interactables"), ids("lootTables")
    factions, shops, quests = ids("factions"), ids("shops"), ids("quests")
    buildings = {b["id"]: b for m in maps.values() for b in m["buildings"]}
    portals = {p["id"] for m in maps.values() for p in m["portals"]}

    # --- unique IDs
    seen = {}
    for col in ("items", "npcs", "dialogues", "quests", "containers", "interactables",
                "shops", "lootTables", "enemies", "factions", "factionAgents"):
        for o in c.get(col, []):
            key = o["id"]
            if key in seen and seen[key] != col:
                pass  # different namespaces may share ids (e.g. weapon item vs weapon)
            elif key in seen:
                errors.append(f"duplicate id {key} in {col}")
            seen[key] = col
    for mid, m in maps.items():
        local = set()
        for col in ("buildings", "decor", "features", "portals"):
            for o in m[col]:
                if o["id"] in local:
                    errors.append(f"{mid}: duplicate placement id {o['id']}")
                local.add(o["id"])

    # --- references
    def ref(ok, msg):
        if not ok:
            errors.append(msg)

    for n in c["npcs"]:
        ref(n["mapId"] in maps, f"npc {n['id']}: unknown map {n['mapId']}")
        ref(n.get("dialogueId") in dialogues, f"npc {n['id']}: missing dialogue {n.get('dialogueId')}")
        if n.get("buildingId"):
            ref(n["buildingId"] in buildings, f"npc {n['id']}: unknown building {n['buildingId']}")
        if n.get("factionId"):
            ref(n["factionId"] in factions, f"npc {n['id']}: unknown faction {n['factionId']}")
    for d in c["dialogues"]:
        nodes = {nd["id"] for nd in d["nodes"]}
        ref(d["startNode"] in nodes, f"dialogue {d['id']}: missing start node")
        for nd in d["nodes"]:
            for ch in nd.get("choices", []):
                if ch.get("next"):
                    ref(ch["next"] in nodes, f"dialogue {d['id']}.{nd['id']}: missing node {ch['next']}")
                a = ch.get("action") or {}
                if a.get("questId"):
                    ref(a["questId"] in quests, f"dialogue {d['id']}: unknown quest {a['questId']}")
                if a.get("shopId"):
                    ref(a["shopId"] in shops, f"dialogue {d['id']}: unknown shop {a['shopId']}")
    stage_targets = {"talk": npcs, "loot": containers, "interact": interactables, "extract": portals}
    for q in c["quests"]:
        for p in q.get("prerequisites", []):
            ref(p in quests, f"quest {q['id']}: unknown prerequisite {p}")
        if q.get("offeredBy"):
            ref(q["offeredBy"] in npcs, f"quest {q['id']}: unknown giver {q['offeredBy']}")
        for s in q["stages"]:
            pool = stage_targets.get(s["type"])
            if pool is None:
                errors.append(f"quest {q['id']}.{s['id']}: unknown stage type {s['type']}")
            else:
                ref(s["targetId"] in pool, f"quest {q['id']}.{s['id']}: unknown target {s['targetId']}")
        for r in q.get("rewards", {}).get("items", []):
            ref(r["itemId"] in items, f"quest {q['id']}: unknown reward item {r['itemId']}")
    for o in c["containers"]:
        ref(o["lootTableId"] in loot, f"container {o['id']}: unknown loot table")
        for g in o.get("guaranteedItems", []):
            ref(g["itemId"] in items, f"container {o['id']}: unknown item {g['itemId']}")
    for t in c["lootTables"]:
        for e in t["entries"] + t.get("guaranteed", []):
            ref(e["itemId"] in items, f"loot table {t['id']}: unknown item {e['itemId']}")
    for s in c["shops"]:
        ref(s.get("ownerNpcId") in npcs, f"shop {s['id']}: unknown owner")
        for e in s["stock"]:
            ref(e["itemId"] in items, f"shop {s['id']}: unknown item {e['itemId']}")
    for e in c["enemies"]:
        if e.get("drop"):
            ref(e["drop"] in items, f"enemy {e['id']}: unknown drop {e['drop']}")
    for w in c["weapons"]:
        ref(w["ammoId"] in items, f"weapon {w['id']}: unknown ammo {w['ammoId']}")
    for f in c.get("factions", []):
        for h in f.get("hostileTo", []):
            ref(h in factions or h in ("wildlife", "player"), f"faction {f['id']}: unknown enemy faction {h}")
    for a in c.get("factionAgents", []):
        ref(a["factionId"] in factions, f"agent {a['id']}: unknown faction")
        ref(a["mapId"] in maps, f"agent {a['id']}: unknown map")

    # --- placement
    for mid, m in maps.items():
        W, H = m["w"], m["h"]
        for col in ("buildings", "decor", "features", "docks"):
            for o in m[col]:
                if o["x"] < 0 or o["y"] < 0 or o["x"] + o["w"] > W or o["y"] + o["h"] > H:
                    errors.append(f"{mid}: {col[:-1]} {o.get('id', o)} out of bounds")
        bs = m["buildings"]
        for i, a in enumerate(bs):
            for b in bs[i + 1:]:
                if rect_overlap(a, b):
                    errors.append(f"{mid}: buildings overlap {a['id']} / {b['id']}")
                elif rect_overlap(a, b, margin=1):
                    warnings.append(f"{mid}: buildings touch (no walking gap) {a['id']} / {b['id']}")
            for d in m["docks"]:
                if rect_overlap(a, d):
                    errors.append(f"{mid}: building {a['id']} overlaps a dock")
        for o in m["decor"]:
            if o["type"] not in BLOCKING_DECOR:
                continue
            for b in bs:
                if rect_overlap(o, b):
                    errors.append(f"{mid}: blocking decor {o['id']} inside building {b['id']}")
                elif rect_overlap(o, door_lane(b)):
                    errors.append(f"{mid}: blocking decor {o['id']} in front of door of {b['id']}")
        for f in m["features"]:
            for b in bs:
                if rect_overlap(f, door_lane(b)):
                    errors.append(f"{mid}: feature {f['id']} blocks door of {b['id']}")
    for col in ("npcs", "interactables", "containers", "factionAgents"):
        for o in c.get(col, []):
            m = maps.get(o.get("mapId"))
            if m and not (0 <= o["x"] < m["w"] and 0 <= o["y"] < m["h"]):
                errors.append(f"{col} {o['id']} out of bounds")
    return errors, warnings


def main():
    world = build.compose_world()
    errors, warnings = validate(world)
    geo = geometry(world)
    if "--update-lock" in sys.argv:
        LOCK.write_text(json.dumps({"note": "Protected gameplay geometry. Update only after a "
                                    "documented placement audit (tools/validate_world.py --update-lock).",
                                    "sha256": {k: digest(v) for k, v in geo.items()}}, indent=2) + "\n")
        print("geometry lock updated")
    elif LOCK.exists():
        lock = json.loads(LOCK.read_text())["sha256"]
        for k, v in geo.items():
            if lock.get(k) != digest(v):
                errors.append(f"protected geometry changed: {k} (if intentional, audit then --update-lock)")
    else:
        warnings.append("no geometry lock found; run with --update-lock")
    known = {}
    kp = ROOT / "tools" / "known_issues.json"
    if kp.exists():
        known = json.loads(kp.read_text())["accepted"]
    for e in sorted(set(errors) & set(known)):
        print("KNOWN", e, "--", known[e])
    errors = [e for e in dict.fromkeys(errors) if e not in known]
    for w in warnings:
        print("WARN ", w)
    for e in errors:
        print("ERROR", e)
    print(f"validate_world: {len(errors)} errors, {len(warnings)} warnings")
    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
