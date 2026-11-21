# ASHEN WILDS: SALTWAKE — Modular Foundation v0.10

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

## What's changed from v0.9

- **Hub reduced to 98×76 tiles** (was 120×90): ~31% less area with intentionally open Salvager's Square and separate housing, trading, workshop, ledger and dock zones.
- **24 existing building/structure IDs preserved** across the two maps; hub locations deliberately moved closer together. The Outer Quays' map geometry remains unchanged.
- **World layouts and entrances audited:** no overlaps or inaccessible objectives in the current automated tests.
- **Painted ground:** 115 externally baked 512px-or-smaller PNG chunks. Original coastal source artwork feeds the material and road pipeline. Tiled cobbles are limited to roads/entrance lanes rather than filling the plaza; red soil/gravel blends at material boundaries. Tides still change dynamically.
- **Inventory:** a 48-cell stack view, item weight readout, two-slot loadout, and **10 custom quick slots**; binds and faction reputation are saved with the player.
- **Factions:** a JSON data model for the canonical Saltwatch Harbor Compact plus *proposed* licensed salvagers, unlicensed wreckers, and neutral harbor crews. NPC patrols can fight hostile factions without player involvement. Attacking allies changes player reputation and can provoke retaliation.
- **11 hub NPC records** (7 existing + 4 ambient locals) and 5 patrolling/neutral Outer Quays human agents in addition to the existing enemies.
- **Creature art:** new separate, higher-quality PNGs for Brineback, Redhook Gull, Salt Widow (crab) and Saltcliff Grazer; species remain recognizable and lore-consistent. Brineback has a low charge, Gull harasses at range, Grazer is normally passive, and Salt Widow can cause bleeding.
- **Quests unchanged:** 5 starter missions with the same stable IDs. Save data continues to use the previous `saltwake.player.v04` format and key.

## Important limitations / next art milestones

This is a visual foundation, not a claim of final art quality. Terrain tiles still show some repeating motifs at certain zooms; some original buildings remain visually large; the player/NPC animations are limited; and faction AI currently uses basic local steering rather than obstacle-aware pathfinding or long-term schedules. The 48-cell inventory is a **stack grid**, not yet a draggable Tetris-style packing system. Weather/tide and quest effects remain prototypes.

Faction definitions other than the Harbor Compact are proposed working groups for SALTWAKE, **not newly locked Ashen Wilds world canon**. No giant Drowned King boss is spawned at Saltwatch.

## Saves and updates

Player saves and the world content database are separate. The **Player Save** UI exports and imports JSON; use it to back up your character **before switching project folders or browsers**. The game does **not** expose world overwrite/import options.

Existing v4 saves migrate defaults for `quickSlots` and `factionStanding` when opened. Completed quests, stash, money and permanent progress are not replaced by painting new terrain. Equipment and unextracted loot still follow hardcore extraction rules.

## Source files / AI-editing workflow

| Folder | Contents |
|---|---|
| `data/maps/` | Map geometry, roads, buildings, docks, NPC landmarks |
| `data/graphics/terrain_layers/` | Per-tile material, road masks, IDs and variants |
| `data/content/factions.json` | Faction names, relationships, default standing, lore descriptions |
| `data/content/factionAgents.json` | Patrolling NPC positions and factions |
| `data/content/quests.json`, `dialogues.json` | Mission and conversation definitions |
| `data/content/items.json`, `enemies.json` | Item and creature data |
| `assets/source/` | Source art reference sheets, including v0.10 creature sheet |
| `assets/environment_kit/` | Modular roof, wall, interior, terrain and prop PNGs |
| `assets/painted_maps/` | Loaded ground chunk PNGs for each region |
| `assets/sprites/actors/` | Creature and faction NPC image assets |
| `src/systems/` | Separate JS systems for gameplay, equipment, factions and quickbar |
| `src/render/` | External-image renderer, camera and painted ground layer |
| `tools/` | Asset baker, audits and protected-geometry validator |
| `tests/` | Browser regressions including quest/extraction/weapon/faction systems |

To edit story/loot only, update the appropriate JSON and run `python build.py`. To rebuild approved **environment art** using the packaged source art, run `python tools/rebuild_environment_v10.py` (requires Pillow/NumPy/SciPy). Changing building *positions* intentionally requires updating the protected `tools/geometry_lock.json` after a separate placement audit; **never change geometry to fix a sprite's appearance.**

Run `python tools/qa_all_v10.py --browser` to execute all current placement, terrain, faction and browser tests. Chromium/Playwright required for browser tests.

## Lore alignment

The Red Salt Coast reference describes the region as rust-red storm coast with brine roads, low storm walls, breakaway roofs, elevated dry stores, tied masonry, flood-drainage courts, and salt-resistant wood. The Compact joins port magistrates, reef pilots, salters, lighthouse crews and customs; the Drowned King's principal range is offshore between Coralwatch and Tidecarve. This prototype keeps those distinctions and avoids adding a Drowned King monster at the hub.

See `docs/CHANGELOG_v10.md`, `docs/FACTIONS_v10.md`, and `docs/QA_v10.json` for details.

For current known limitations and QA evidence, see `docs/V10_CHANGELOG_AND_QA.md`.

## Lite distribution

This Lite release preserves the game scripts, world data, and gameplay artwork, but uses visually similar WebP ground chunks to greatly reduce download size. For the full AI art-generation source files and QA snapshots, keep the original full project archive.
