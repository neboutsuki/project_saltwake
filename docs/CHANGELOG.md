# SALTWAKE changelog

## v0.11 — Foundation & ground pass

See `docs/AUDIT_v0.11.md` for the full audit; IDs below refer to it.

### Project / tooling
- Reformatted all JS/CSS/HTML (was minified). No logic changes in that commit. (S-1)
- Restored the missing tooling (S-2):
  - `tools/build.py` — JSON sources → `data/generated/*` (reproduces the v0.10 bundles exactly; `--check` for staleness).
  - `tools/validate_world.py` — IDs, references, bounds, overlaps, door lanes, decor on piers, and a protected-geometry hash lock (`tools/geometry_lock.json`). Accepted-but-open issues live in `tools/known_issues.json`.
  - `tests/qa.js` — Playwright browser QA (28 checks) + optional screenshots.
  - `tools/bake_terrain.py` — the new ground baker.
- Removed 7 silently overridden duplicate methods (S-3).

### Fixes
- Player saves: new `src/core/save.js` with normalisation, versioned migration hooks, and quarantine of unreadable saves instead of overwriting them. Old saves missing fields no longer crash the shop/repair. (B-1)
- Export/backup can no longer capture unextracted raid loot. (B-2)
- Projectiles now fly over water. (B-3)
- Dev geometry-lock check is meaningful. (B-4)
- Quest HUD names the contract giver. (B-5)

### Art
- Ground layer re-baked for both maps: organic material borders with scattered transitions, irregular stone setts along the real road curves, fine gravel, mottled soil, salt crust, grass tufts that follow existing vegetation, damp shoreline, hub seawall and a storm-broken seawall on the Outer Quays, building contact shadows. No repeating tiles. PNG chunks (same keys) replace the WebP chunks.
- Fixtures drawn at native pixel size (no more 136×154 px barrel); cistern is a cask cluster.

### Not changed
- All building/object IDs, coordinates, entrances, portals, quests and the save key/format (`saltwake.player.v04`, version 4). Geometry lock verified.

### Tested
- `python tools/validate_world.py` → 0 errors (1 known issue, 7 warnings: decor on piers).
- `node tests/qa.js` → 28/28 (assets, JS errors, reachability of all 66 targets on both maps, WASD/roll/Q/knife/quick slots/zoom, quest → loot → extraction → turn-in, death penalties, legacy save migration, export mid-raid, import accept/reject, projectile hits and water).
- Visual review of in-game screenshots of both maps (`docs/images/v011_ground_before_after.jpg`).

## v0.10
Original Playable Lite baseline as received (see README history).
