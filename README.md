# ASHEN WILDS: SALTWAKE — Modular Foundation v0.11

A **playable HTML/Canvas prototype** with a smaller walkable hub, externally painted environment chunks, 10 assignable item shortcuts, a two-ranged-weapon loadout, neutral/friendly/hostile NPC factions and updated Red Salt Coast creatures. The game is still a prototype — **not yet the complete premium quality shown in the concept artwork**.

## Play on Windows or in a desktop browser

1. Extract the whole ZIP into a folder. **Keep all of the files together.**
2. On Windows, double-click `PLAY_SALTWAKE.bat`; otherwise open `index.html` in Chrome/Edge/Firefox.
3. Choose **Enter Salvager's Rest** (or the Play button) and move using WASD.

The project intentionally uses many real PNG/JS/JSON files instead of embedding everything into one HTML file. It is designed to run directly from the extracted folder using prebuilt script data. If your browser blocks local resources, host this folder as a static website.

## Controls

| Key | Action |
|---|---|
| WASD | Move |
| Shift | Sprint |
| Space | Dodge roll |
| Mouse | Aim / left-click fire |
| **Q** | **Cycle primary Arbalest and secondary Wickcaster (owned slots only)** |
| **1–9, 0** | **Use the assigned quick-slot item** |
| Tab | Open inventory, click BIND on an item to assign it to 1–0 |
| R | Reload selected ranged weapon |
| E | Interact, talk, loot or extract |
| F | Use bandage directly (legacy shortcut) |
| G | Factions and reputation |
| M | Labeled region map |
| J | Quests / journal |
| Mouse wheel / +/- | Camera zoom |
| Esc | Close menu / pause |

**Equipment:** One primary ranged weapon (Arbalest) + one secondary ranged weapon (Wickcaster), with a weak automatic emergency knife only if both ranged weapons are missing. The two weapon boxes are informational; their labels are not number keybinds. Quick slot numbers are independent of the weapons.

## What's new in v0.11

Foundation and ground pass: readable source, restored build/validation/QA tooling, a safer player-save loader, several bug fixes, and a re-baked pixel-art ground layer without repeating tiles. See `docs/CHANGELOG.md` and the full audit with the development plan in `docs/AUDIT_v0.11.md`.

## Important limitations / next art milestones

This is a visual foundation, not a claim of final art quality. Building prefabs and interiors are still single images stretched onto large footprints (the next art milestone); the player/NPC animations are limited; and faction AI currently uses basic local steering rather than obstacle-aware pathfinding or long-term schedules. The 48-cell inventory is a **stack grid**, not yet a draggable Tetris-style packing system. Weather/tide and quest effects remain prototypes.

Faction definitions other than the Harbor Compact are proposed working groups for SALTWAKE, **not newly locked Ashen Wilds world canon**. No giant Drowned King boss is spawned at Saltwatch.

## Saves and updates

Player saves and the world content database are separate. The **Player Save** UI exports and imports JSON; use it to back up your character **before switching project folders or browsers**. The game does **not** expose world overwrite/import options.

Older saves are normalised on load (`src/core/save.js`): missing fields get defaults, and a save this build cannot read is kept under `saltwake.player.quarantine` instead of being overwritten. Completed quests, stash, money and permanent progress are not replaced by painting new terrain. Equipment and unextracted loot still follow hardcore extraction rules.

## Source files / AI-editing workflow

| Folder | Contents |
|---|---|
| `data/maps/` | Map geometry: roads, buildings, docks, portals, zones, decor (protected) |
| `data/graphics/terrain_layers/` | Per-tile material and road hints used by the ground baker |
| `data/content/*.json` | Items, loot tables, NPCs, dialogues, quests, shops, factions, enemies, mechanics |
| `data/generated/` | **Generated** browser bundles — never edit by hand |
| `assets/painted_maps/` | Baked ground chunks (512×512 PNG, 1 px = 1 world px) |
| `assets/environment_kit/`, `assets/sprites/` | Prop, building, interior, actor PNGs |
| `src/core/` | Globals, game object, **save schema/migration** (`save.js`), boot |
| `src/systems/` | Movement, raids, combat, factions/AI, inventory/quick slots, quests, economy, interactions |
| `src/render/` | Sprite loader, world renderer, docks/atlas, painted ground |
| `src/ui/` | Menus, map panel, CSS |
| `tools/` | Build, validator, ground baker, geometry lock, known issues |
| `tests/qa.js` | Browser QA suite |
| `docs/` | Audit, changelog, comparison images |

Common tasks (Python 3 with numpy/scipy/Pillow; Node 18+ with Playwright):

```bash
python tools/build.py              # after editing any JSON in data/ or assets/manifest.json
python tools/validate_world.py     # IDs, references, overlaps, door lanes, geometry lock
node tests/qa.js --shots qa_shots  # browser QA + gameplay screenshots
python tools/bake_terrain.py       # re-bake ground art (then python tools/build.py)
```

Rules: art changes must never move geometry. Changing a building/decor position requires a placement audit, then `python tools/validate_world.py --update-lock`. Acknowledged-but-open validator findings go in `tools/known_issues.json` with an audit ID.

## Lore alignment

The Red Salt Coast reference describes the region as rust-red storm coast with brine roads, low storm walls, breakaway roofs, elevated dry stores, tied masonry, flood-drainage courts, and salt-resistant wood. The Compact joins port magistrates, reef pilots, salters, lighthouse crews and customs; the Drowned King's principal range is offshore between Coralwatch and Tidecarve. This prototype keeps those distinctions and avoids adding a Drowned King monster at the hub.

The v0.10 full archive's `docs/` and `assets/source/` were not part of the Lite build this repository started from; ask before assuming their contents.
