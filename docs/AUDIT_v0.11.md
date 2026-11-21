# SALTWAKE — Development Audit (v0.10 → v0.11)

Audit of the *SALTWAKE v0.10 Playable Lite* build, done before changing anything.
Each finding has an ID so later sessions and commits can refer to it.
Status: ✅ fixed in v0.11 · 🔶 partly addressed · ⏳ open · 🟨 needs your decision.

## 1. What already works

| Area | State |
|---|---|
| Architecture | Plain `<script>` modules over a shared `Game.prototype`; data in JSON; bundles in `data/generated/` so it runs from `file://`. Sound foundation. |
| Movement | WASD, Shift sprint, Space directional dodge roll with i-frames/cooldown/stamina, mouse aim, wheel / +/- zoom with smoothing. |
| Weapons | Primary Arbalest + secondary Wickcaster, Q cycles owned weapons, R reload, magazines, emergency knife when both are lost, weapon condition wear. |
| Quick slots | 10 bindable slots (1–9, 0), saved with the player. |
| Extraction loop | Raid snapshot of bag/quests; loot is only committed on extraction; death wipes bag + weapons, keeps stash/scrip; tide-gated exits (cart track / pilot skiff) and a 10-minute storm timer. |
| Quests | 5 data-driven contracts with stable IDs, stage types talk / loot / interact / extract, rewards. |
| Dialogue | Branching node dialogue with actions (offer quest, turn in, open shop, issue loaner kit). |
| Economy | Shops with limited stock, selling, stash deposit/withdraw, repair bench, weight limits. |
| Factions | Data-driven factions with hostility tables; patrols fight hostile factions on their own; attacking friendly groups costs standing and provokes retaliation; grazers stay passive until provoked. |
| Saves | Player save separate from world data; export/import/backup UI; no world editor in the normal UI. |
| Content | 2 maps (hub 98×76, Outer Quays 160×128), 24 buildings with interiors, 11 hub NPCs, 5 faction agents, 4 lore creatures. |

## 2. Bugs, gaps and structural problems

| ID | Finding | Status |
|---|---|---|
| S-1 | Shipped JS/CSS was minified onto ~700 very long lines: hard for people or an AI to edit or review. | ✅ reformatted (no logic change) |
| S-2 | README points at `build.py`, `tools/`, `tests/`, `docs/` that are **not in the Lite zip**. Nothing could regenerate `data/generated/*` or run QA. | ✅ rebuilt: `tools/build.py` (reproduces the shipped bundles exactly), `tools/validate_world.py`, `tests/qa.js` |
| S-3 | 7 methods defined twice in different files; the later file silently wins (`drawTerrain` ×3, `drawRoads` ×3, `drawDocks`, `updateEnemies`, `updateBullets`, `hurtEnemy`, `showPack`). Editing the first copy does nothing. ~320 dead lines. | ✅ dead copies removed |
| S-4 | Everything is `Object.assign(Game.prototype, …)` across 15 files with load-order coupling. Workable, but there is no module boundary or explicit dependency list. | ⏳ document per-file ownership; later move to ES modules + a tiny bundler step |
| S-5 | `data/SALTWAKE_World_Project_v4.json` duplicates `data/generated/world_project.json` (285 KB). | ⏳ keep until confirmed unused by your other tools, then delete |
| B-1 | Save loader accepted only `version === 4` with `bag` + `quests`; a save missing `stockSold` / `weaponCondition` crashed the shop/repair; a stored save that failed the check was **silently overwritten** with a new character. | ✅ `src/core/save.js`: normalise + versioned migrations; unreadable saves are quarantined, never overwritten |
| B-2 | *Export player backup* during a raid exported unextracted loot → export, die, import = keep the loot. | ✅ exports/backups use the committed (pre-raid) save |
| B-3 | Projectiles used the walking test, so every shot stopped at the shoreline (no shooting across water / from piers). | ✅ `projectileBlocked()` ignores water |
| B-4 | Dev geometry lock compared the world with itself (always true). | ✅ compares to a boot snapshot |
| B-5 | Quest HUD always said "Available at the contract board", even mid-raid. | ✅ names the giver; adds "after you extract" in raids |
| B-6 | Closing the tab mid-raid keeps your weapons (they are not in the raid snapshot), so quitting avoids the death penalty for gear. | ⏳ decide: treat disconnect as death (Tarkov-style) or as a free extraction |
| B-7 | `heal()` uses `mechanics.medicineHeal` while the pack *USE* button hard-codes 36 and the tincture 60; item effects are hard-coded in 3 places. | ⏳ move effects into `items.json` (`effect: {hp, stamina, bleed}`) |
| B-8 | Weapon condition decreases but has no gameplay effect. | ⏳ tie to spread / jam chance |
| B-9 | Camera smoothing is per-frame (`0.18`), so it is frame-rate dependent. | ⏳ minor |
| G-1 | Placement validation existed only as a claim in the README. | ✅ validator + reachability test using the game's own `walkable()`: all 66 interaction targets & interiors reachable |
| G-2 | Tile road mask is a stair-stepped copy of the road polylines; some roads pass under buildings (e.g. *outer* road under Harbor Clinic). | 🔶 ground baker uses polylines; road-under-building is hidden by the sprite but should be re-routed in a placement pass |
| G-3 | Salt Widow Cave Mouth footprint overlaps two quay piers. | 🟨 geometry change needs approval (tracked in `tools/known_issues.json`) |
| G-4 | 7 blocking decor items placed **on piers** (1 tree, 4 boulders, 2 crates) on the Outer Quays. | 🟨 proposal: delete the tree/boulders, keep crates (pier cargo) |

## 3. Why it does not yet match the reference art

In priority order:

1. **Ground texture** — v0.10 chunks were baked from blurry upscaled textures with a visible 64 px internal repeat ("camouflage"), hard per-tile material blocks, and stair-stepped roads. 🔶 *Replaced in v0.11 (see changelog).* Still to do: warmer colour variety in open soil, puddles, cart ruts and footpath wear.
2. **Inconsistent texel density** — the single biggest remaining problem. Actors are ~1 art-px per world-px, but building prefabs are small images stretched onto large footprints (e.g. Quartermaster Hall: roof planks ~2.5× too big), interiors are one texture tiled over the whole floor (Customs House), and props were stretched to footprints. 🔶 fixtures fixed; buildings/interiors open.
3. **Buildings are single flat images**, not modular kits. The reference has distinct roofs, eaves, walls, doors, windows, chimneys and porches assembled per building, with wall-height perspective. This is the next milestone (see §4).
4. **No lighting pass** — the reference's dusk mood comes from warm window/lantern glow and cool ambient shade. Currently everything is evenly lit.
5. **Characters are small and barely animated** (~24×46 px visible, idle-only in practice). The reference characters are ~32×48 with readable silhouettes and walk cycles.
6. **Water** is an opaque flat-teal atlas without depth, foam or shoreline lapping.
7. **UI** is functional but generic; the reference uses framed panels with icons, a paper-doll equipment screen and an icon item grid.

## 4. Recommended development order

1. ✅ **Foundation & safety** (this update): readable source, build/validate/QA tooling, save robustness, critical bugs, ground re-bake.
2. **Modular building kit + one consistent scale** — a kit of PNG pieces (roof sections per material, wall courses, doors, windows, chimneys, porches, stilts/flood plinths) composed by a building generator from each building's existing ID/footprint/door side. Positions, collision and door gaps stay data-driven; art swaps cannot move anything. Start with 3 hub buildings, review screenshots with you, then roll out.
3. **Interiors** — composed from the same kit (floor planks/flagstones, wall faces, furniture props) instead of one stretched image.
4. **Lighting & atmosphere** — dusk ambient tint, additive light sprites for windows/lanterns/fires, soft drop shadows for actors and props, chimney smoke.
5. **Characters** — 8-direction (or 4 + mirror) walk/roll/aim sheets for player and factions; creature animation for the four canon creatures (no redesigns).
6. **Water & coast** — animated water tiles with depth bands, foam on seawalls and piers, tide visuals tied to the existing flood rise.
7. **Gameplay depth** — grid (Tetris-style) backpack, data-driven item effects (B-7), weapon condition effects (B-8), crafting, obstacle-aware NPC pathfinding (A* on the walkable grid), NPC schedules.
8. **UI art pass** to the reference style.

Steps 2–4 are where most of the visual gap to the reference lies, so they come before more systems work.

## 5. Lore notes

- Canon creatures (Brineback, Redhook Gull, Salt Widow, Saltcliff Grazer) are untouched; no new creature designs were made.
- Factions other than the Saltwatch Harbor Compact (licensed salvagers, wreckers, neutral crews) are **proposed, not canon**, as the v0.10 docs already say. The faction names on the reference image (Harbor Oath, Saltwrights, Red Tides, Drowned Hand, Tideborn; Crown of Lirene, Briar Pact, Lighthouse Order, Free Salvagers) differ from the in-game ones — 🟨 please tell me which set is canon before I touch faction data.
- The new seawall, damp shoreline and salt crust in the ground art follow the Red Salt Coast description (flood management, salt-worn materials). No new lore was introduced.
