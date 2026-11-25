# Changelog

## Unreleased — Weapon art
- `tools/cut_weapons.py` cuts the weapon sheet (`incoming_art/source/weapons_sheet.webp`: arbalest, Wickcaster,
  spear, harpoon gun, greataxe, knife) into `assets/art/weapons/*.png`, 64 px inventory icons
  (`art/icons/weapon_*`) and white HUD silhouettes (`assets/ui/weapon_*_sil.png`, taking over the `ui/weapon_*`
  aliases from the old SVGs).
- The HUD weapon silhouette, the inventory/loadout icons and the weapon in Ren's hands now use this art. The weapon
  points at the aim, sits behind Ren when aiming up, flips when aiming left, and is hidden during a dodge.
- Harpoon gun, greataxe and knife art is ready for when those weapons exist in the game. QA 196/196.

## Unreleased — Ren Kagari and the story cast
- Imported the character art: Ren Kagari's 6-frame walk in 4 directions, and ten story characters (Captain Elda,
  Harlan, Ivo, Kade, Lira, Marin, Master Rook, Mira, Soren, Tess) with 4-direction designs, 4-frame idles and
  8-frame up/down walks (104 files, `assets/art/characters/story/`). The original Ren manifest and README are kept in
  `docs/art_sources/`.
- **Ren is the player** in the field and the harbor (`source/modules/characters.js`): faces the aim direction in the
  field (movement direction in the harbor), walks with frame rate tied to distance, stands on walk frame 0 until idle
  art exists, squashes during a dodge and flashes when hit. Toggle: Options › Graphics › "New character art (Ren)".
- The story cast is registered (`saltwakeCast.draw`) for NPC use; it is not assigned to any NPC yet.
- Characters and portraits import as live art; QA: new `cast` suite, 195/195.

## Unreleased — Outer Quays tile map, stage A
- **New ground:** the Outer Quays is drawn from the generated seamless tiles instead of the old painted chunks. Each
  tile gets a material from the map's roads (cobble, gravel), squares (stone plaza), zones (red-salt crust in the Salt
  Yards, mud in the Wreckers' Camp, gravel and sand on the piers, cave floor at the caverns, grass and ash inland),
  the coastline (beach) and noise. Borders are warped by noise so they look natural, textures are drawn at half size
  to match character scale, and natural grounds use texture bombing so repeats don't show. Chunks build a few rows
  per frame (about 5 ms) and nearby chunks ahead of time; the old painted chunk shows until a new one is ready.
- **New sea:** deep water and a shallows band from the generated textures, slowly drifting, with the surf strip on
  the waterline; it follows the live tide.
- **Docks** use the plank texture; **roads** are part of the ground.
- **Scenery:** trees, grass, reeds, shrubs, rocks, crates, lanterns, fixtures and loot chests use the new art, and
  nine Quays buildings use the new facades (interiors unchanged). Wind sway and contact shadows now cover the new art.
- **Natural edges:** a dense treeline along the north and down the sides, rubble near the shore; that band is solid.
  The West Passage and Storm Gate stay open; every exit is reachable.
- Layout, IDs, coordinates, quests and spawns are unchanged. Toggle: Options › Graphics › "New Outer Quays art".
- The single-file build now inlines any staged art a module names in full (+5.6 MB).
- **Scale and readability pass:** field characters drawn 1.4x (was 1.15) and creatures 1.2x so they match the new
  art; Quays facades sized to 0.86x their footprint (doors about 1.3 characters tall); trees 1.35x their art; ground
  textures at about 0.4x so cobbles and planks read at human scale; the Quays camera starts closer (0.95, a saved
  camera choice still wins); ground textures lifted 12%; the player gets a faint warm light pool and a thin light rim.
- QA: new `tiles` suite; 190/190 on both builds.

## Unreleased — Esc menu and Options
- **Esc opens the menu** during play, on the last tab you used (Options the first time); Esc closes it. Esc on a
  settings page opened from Options returns to Options. Works in the harbor too (its own Esc used to open Controls).
- **Options tab** after Factions in the menu book (LB/RB, PageUp/PageDown and clicks reach it): Resume, Save game,
  Controls, Sound, Graphics & performance, interface theme, larger text, hints, Weather & tide forecast, Field guide,
  Field notes, Back to main menu (locked during an expedition) and Exit to desktop (saves; warns that leaving
  mid-expedition abandons the run; shows "you can close this tab" where the browser won't close it).
- **No menu bar during play.** Shortcuts still work (J, Tab, M, G, K, L). The old "Field menu" and the controller
  Menu button open Options.
- QA: new `menu` suite; 176/176.

## Unreleased — Generated art in the game
- **Item icons:** inventory, stash, shops, loadout and the hotbar use the new `art/icons/*` images (17 items: 11 by
  name, 6 with a close stand-in such as Brineback plate → shell); other items keep their old icons until art exists.
- **Projectiles:** bolts and Wickcaster shots are drawn with the `proj_bolt` / `proj_wick_flame` sprite strips,
  rotated to their flight direction, instead of lines.
- **Hit effects:** hits and armor glances play `hit_spark`, part breaks `part_break_burst`, cover hits `smoke_puff`
  (6-frame strips); damage numbers are kept.
- **Wading:** walking through water kicks up `splash` sprites.
- **Rain puddles:** `tools/cut_puddles.py` cuts the puddles out of the generated `wet_mud` ground art and writes them
  as the terrain puddle decals (see-through water with bright glints), replacing the earlier flat ovals.
- Icons and effects are no longer staged, so they are in the single-file build (+1 MB). The import tool treats new
  icons, effects and portraits as live.
- QA: new `art` suite; 161/161 on both the single-file and split builds.

## Unreleased — Dialogue with portraits
- Conversations now appear as a speech box above the speaker's head (it follows them if the camera or they move; it
  drops below the head near the top edge). The speaker's portrait sits on the left, the player's on the right; the
  side that is talking is lit. Lines type out (Space/Enter/F to finish, then continue), choices appear afterwards,
  1–9 pick a choice. The box is light and see-through (frosted white, dark text). There is no close button: you
  leave by saying a farewell line; a node without one gets "Maybe next time.", "I'll pass." or "Goodbye." (Esc still
  leaves quietly). The dialogue engine, quest hooks and actions are unchanged.
- Portraits are image files (`assets/art/portraits/<npcId>.png`, `player_<body>.png`, optional `<id>_<mood>.png`
  with a node `"mood"`); a silhouette placeholder (`assets/ui/portrait_unknown.svg`) is used until they exist.
  `docs/PORTRAITS.md` lists the 13 portraits with prompts; the import tool makes portraits live at once.
- QA: new `dialogue` suite; 149/149.

## Unreleased — Systems pass and quest safety net
- **Pack alert:** hurting a monster brings nearby monsters of the same kind into the fight (neutral prey excluded).
- **Hit-stop:** heavy hits (18+ damage), part breaks and kills briefly slow the simulation so blows feel heavy.
- **Danger cue:** the round minimap pulses red while an alerted monster is within about 13 tiles (icon-only HUD; a
  steady ring with reduced motion).
- **Quest integrity QA** (`qa/tools/quest_checks.js`, runs with every QA pass): every quest and expedition contract
  must reference real NPCs, containers, interactables, exits, items, monsters and monster parts; prerequisites have no
  cycles; field targets must be reachable; and every story quest is played start to finish through the real quest
  engine (the save is restored afterwards). Map and art changes cannot silently break quests.
- **Art import:** auto-resizes oversized images (nearest-neighbor), hardens soft sprite edges, records VFX frame
  counts and writes `docs/ART_STATUS.md`. 288 generated art files imported as staged art.
- QA: 134/134 (adds `quest` and `systems` suites).

## Unreleased — Split project build
- New `tools/build_split.py` produces `dist/SALTWAKE/`: a plain `index.html` shell, 21 stylesheets in `css/`, 97 original code layers in `js/engine/`, the new systems in `js/modules/`, world data in `data/world.js`, and all 700 art files in `assets/`, referenced by relative path. It includes `play.bat` and `play.sh` launchers that start a local server, because browsers block canvas and WebGL pixel access for files opened from disk. QA passes 122/122 on both builds. `qa/tools/run_qa.js` now also accepts a URL.
- `docs/GODOT_MIGRATION.md`: mapping of art, data and systems to a Godot port.
- Notifications moved above the hotbar so they no longer cover the top menu bar.

## Unreleased — Performance fixes
- **Large-screen fix:** the frame-time cost grew with window size because of per-pixel browser effects over the animating game view. Removed the CSS color filter on the harbor frame (the main cost; it re-filtered about 4M pixels per frame at 1440p) and the separate ash DOM layer (ash is now drawn into the field scene, or sampled by the GPU renderer), and dropped the live backdrop blur from in-game HUD elements (menus keep it). Harbor at 2560×1440 (headless): 13 → 57 fps. Raid frame rate is now nearly independent of window size.
- **GPU renderer:** it now processes frames at the scene's own resolution (1024×576 in the field, 1536×864 in the harbor) and lets the browser scale the result. Before, it worked at display size × DPR, up to about 10× the pixels on 1440p or 4K screens. Page layout is cached and only re-measured on resize. Harbor frames that haven't changed are no longer re-uploaded or re-blurred. Falling ash is blended inside the GPU pass, so there's no separate full-screen layer while the renderer is active.
- **Performance guard:** if the game runs below 45 fps for about 3 s with the enhanced renderer on, the renderer pauses for the session and a message says so. Re-enabling it in Graphics & Performance resumes it.
- **Ash overlay:** when the renderer is off, the ash layer is drawn at half resolution.
- **Weathered-building lookup:** cached per image. Before, it read `img.src` on every draw, which copies the whole embedded data URL (100–300 KB) and caused heavy garbage-collection churn in the harbor.
- **2D fallback grade:** uses separable blend modes (multiply/screen) instead of `saturation`, which falls off the browser's fast path.
- Headless comparison (software rendering, so not representative of a real GPU): harbor with the renderer on went from 9 fps to 45 fps once the guard engages. Raid with the renderer off is about 31 fps, against about 43 fps for alpha.1 in the same environment.


## Unreleased — Art separated from code
- **Art is now ordinary image files.** Everything I added since v0.30 is baked by `tools/bake_art.py` into image files in `assets/` (pack `art-v031`) and registered in `assets/manifest.json`:
  - `weathered/`: 47 weathered building sprites, covering every field façade and the harbor house set;
  - `decals/`: 17 terrain decals;
  - `fx/`: 5 particle sprites;
  - `ui/`: 9 SVG HUD icons and weapon silhouettes.
  The game code only looks images up by alias and places them. There is no runtime pixel drawing for these anymore (no stippling, gradient weathering or inline SVG).
- **Build:** `build.py` registers every art-pack file into the sprite library before it is created. It also writes `SALTWAKE_WEATHER_INDEX`, which maps a source image (by content signature) to its weathered file. This lets harbor houses with unnamed media keys use their weathered art.
- **Art guide:** `assets/README.md` explains how to repaint or add art, and lists the older harbor pieces still drawn with shape primitives (plaza pillars, district props, walls and gates, towers, boats, yard and interior details). Those are next for sprite replacement.
- Rendering effects (lighting, bloom, grade, fog, wind sway, cast shadows, combat indicators) stay in code because they're effects, not art.
- QA: 122 checks, all passing.


## Unreleased — Houses and terrain detail
- **Weathered buildings** (`source/modules/world-detail.js`): every field façade and every harbor house gets a weathering pass, cached once per image. The pass adds:
  - baked directional light (warm upper-left, cool shade lower-right);
  - grime and darkening at the footing where the walls meet the ground;
  - green-grey brine staining along the base;
  - pale salt streaks running down the walls from the eaves;
  - ash settled on the roofs, plus a few red-salt blooms;
  - a fine material texture.
  Field buildings also get a soft contact shadow along their front wall. The harbor houses are reached by wrapping the harbor frame's `house()` renderer.
- **Terrain detail:** deterministic procedural decals per 16-tile chunk:
  - irregular red-salt crusts with crystal glints;
  - wind-stretched ash drifts;
  - branching crack networks and pebbles;
  - rain puddles that fade in as the ground gets wet.
  Decals are placed only on walkable land and never on water. In the harbor they are baked once into the ground canvas, skipping water pixels.
- Both can be toggled in Graphics & Performance. Benchmark (half-res lighting): render p95 5.8 ms. QA now runs 122 checks, all passing.


## Unreleased — Time of day and weather
- **Continuous day/night** (`source/modules/sky.js`): a sun model on the existing game clock with color keyframes for night, pre-dawn, dawn, morning, noon, golden hour, sunset and blue hour. Exposure and tint now change smoothly, where before there were only a few light steps (and a simple on/off night in the harbor). Bloom grows at night so lanterns and windows carry the scene. Dawn brings low ground mist.
- **Sun-driven shadows:** cast shadows swing from west to east through the day, stretch long at dawn and dusk, fade under heavy cloud, and become faint moonlit shadows at night.
- **Weather fronts blend:** the next weather now rolls in over the last in-game hour before it arrives instead of switching instantly. Gameplay modifiers (sight, hearing, spread, wetness, tide timing) are unchanged.
- **Weather visuals** (GPU path):
  - Wind drifts in direction and gusts, and is stronger in rain and squalls.
  - Rain falls at the wind's angle, with splash ripples.
  - Ground gets darker and shinier as rain builds wetness, then dries afterwards, faster in sun and wind.
  - Fog drifts with the wind and is thicker lower on screen.
  - Cloud shadows move across the ground on cloudy days.
  - Squalls bring lightning flashes.
  - Ashfall is heaviest under low cloud, thinner in clear weather, and stops in rain.
  The original 2D weather overlays take over again if the GPU renderer is off.
- **HUD:** the minimap line shows a sun or moon icon and the incoming front, for example "→☂ 2h".
- QA now runs 119 checks, all passing (new `qa/tools/sky_checks.js`).


## Unreleased — Enhanced renderer
- **GPU post-processing** (`source/modules/post-fx.js`, WebGL2): every frame of the field and the harbor is re-presented through pixel-art sharpening, bloom from lanterns, windows, fire and embers, tilt-shift depth of field (top and bottom of the screen soften so the scene reads as a lit diorama), a filmic ashen grade (drained mid-tones, cool slate shadows, warm ember highlights), a vignette and fine film grain. The source canvases still render and take input underneath. If the GPU path fails it switches itself off, and the old 2D/CSS grade takes over again. Each effect can be toggled in Graphics & Performance.
- **Projected shadows:** trees, lanterns, banners, cargo, barrels and similar props cast their actual silhouette along a low sun direction, in addition to the existing contact shadows.
- Headless software-GL cost is about 5 ms per frame in the harbor and about 17 ms in raids. On a real GPU it should be far lower, but I haven't measured it.
- QA now runs 104 checks, all passing.

## Camera, scale and ashen atmosphere
- **Camera** (`source/modules/camera.js`): smooth follow; look-ahead toward your aim and movement, stronger during raids; zoom with the mouse wheel over the world or `-` / `=` (0.8×–1.45× of each map's base scale); screen shake on damage that grows with the damage taken. The map-edge limits and the long-range aiming offset still work. Each option can be set in Graphics & Performance (zoom slider plus toggles). The base render now calls `Game.prototype.cameraFrame`.
- **Scale** (`source/modules/scale.js`): characters (player, NPCs, wreckers, Brineworn) are drawn 1.15× larger in both the field and the harbor. Gulls are reduced to 0.72×. Crates, benches, barrels, cargo and banners are reduced to roughly human scale. All scaling is anchored at the feet; hitboxes, collision radii, ranges and positions are unchanged. The HUD scales with the game's width (0.8×–1.55×).
- **Ashen Wilds atmosphere:** a drained, ash-grey grade with a warm haze and a darker seaward horizon, plus falling ash with occasional red embers that drift with the wind and parallax with the camera. A faint green brine haze pools at the feet of Brineworn and Brinebacks. The harbor gets a matching filter. "Falling ash" is a separate toggle.
- QA now runs 102 checks, all passing. Benchmark (half-res lighting): render p95 4.3 ms.


## Unreleased — Hunter-style HUD layout
- `source/modules/hud-layout.js` moves the HUD. The existing elements are moved, not rebuilt.
  - **Upper left:** health and stamina, status effects (bleeding and similar) and the pack line. The equipped-weapon card sits directly below, with a translucent white silhouette of the weapon type (arbalest, wickcaster or spear) and the ammunition count with an icon (bolt or cell). The spear shows "Melee · no ammunition".
  - **Upper right:** the quest tracker, with color-coded type tags: HUNT, RECOVERY/SALVAGE, EXPEDITION, CONTACT, INVESTIGATE/TRACKING, plus MAIN STORY and ON EXPEDITION. Hunt commissions show the target monster and count, for example "Target: Brineback × 2".
  - **Lower left:** tide, weather and the minimap. The quick-use belt stays at bottom center.
- **Minimal HUD:** health and stamina have no panel or labels, just a heart and a bolt icon with bars and numbers. Bleeding shows as a pulsing red drop. The weapon shows only its silhouette and ammunition. The minimap is round with one line of info (tide, weather icon, time, raid timer) and a lantern on/off icon. Detection text and the long condition lines are hidden.
- **Simple quest tracker:** no panel. It shows one type tag (for example HUNT or CONTACT), the quest title and the current objective, plus the target for hunts. The first-voyage steps, location line, raid contract line, detection meter and field notes are hidden; the Journal has the full details. Clicking the title opens the Journal.
- Removed the gold ring drawn around the player in the harbor.
- QA now runs 95 checks, all passing (layout positions, tags, hunt target, weapon silhouette, bleeding shown in vitals).

## Graphics pass, profile cleanup
- **Asset remaster:** `tools/remaster_assets.py` processes all 622 sprites by category (buildings, foliage, characters/creatures, props, icons, tiling terrain). It applies a unified contrast curve, cool shadows and warm highlights, and saturation control. Sprites and icons are sharpened; tiling terrain is not, so seams stay clean. Characters, creatures, props and foliage get a soft 1px dark rim so they read against busy ground. Sprite sizes don't change, so draw offsets and collisions are unaffected. Originals are kept in `assets/original/`. Run `python tools/remaster_assets.py --restore` to revert.
- **Living environment** (`source/modules/environment-fx.js`): vegetation sways in the wind (stronger in rain and squalls, anchored at the base), small props get soft contact shadows, and the scene gets a color grade. The harbor hub gets a matching grade. Each effect can be turned off in Graphics & Performance.
- **Profile portrait removed:** character creation, player info and the load menu no longer show the pixel portrait, and the hair/cloak pickers are hidden. Old saves still load.
- QA now runs 87 checks, all passing.

## Glass UI
- New module `source/modules/ui-glass.js` adds a dark translucent theme. The game view now fills the window. The top bar is a floating pill. HUD blocks use frosted glass with a cool cyan accent instead of green and gold. Menus open as a rounded glass sheet over the blurred game rather than a full-screen page. The location label sits under the nav bar and no longer overlaps the hotbar.
- The Classic theme is still available under Graphics & Performance → Interface theme (stored in `saltwake.ui.theme`). The theme only changes how things look, not game state.
- Removed the remaining green and gold. Text is now neutral white or gray, and labels and kickers are cyan. Cards, slots, profile and prologue screens use glass surfaces. Selected, active and equipped states, tab underlines and the selected inventory slot use a cyan highlight. Progress and weight bars, faction tracks and badges are restyled, and the field map and minimap are muted to slate. An automated color scan of 15 screens found 411 green or gold elements before this change and 19 after; the rest are intentional (green "good" status, faction identity colors).
- Before and after screenshots are in `qa/screenshots/ui-glass/`. Regression: 79/79 checks passed.

## v0.30.0 — The Unseen War (2026-11-24)
New module `source/modules/polish-v030.js`, inlined by `build.py`. Save key and schema are unchanged. Settings are stored under `saltwake.polish.v1`.

- **Combat readability:** a ground wedge points at the real target while an enemy winds up and turns red just before the strike. A red arc shows which direction damage came from. A low-health vignette (below 30 HP) pulses. Each one can be switched off in Graphics & Performance.
- **Actor robustness:** a collision guard puts an actor that ends up inside a solid tile back on its last valid tile. A stuck chaser (no movement for about 3 s) drops its route so the native planner finds a new one. Both are counted in `saltwakePolish.stats`.
- **Bug fix:** the quays grazer `e7` used to spawn inside the trunk of tree `quays.gen.tree.24`. It now spawns at (106,27).
- **Performance:** new optional half-resolution lighting layer. In a headless software-rendered benchmark, render p95 fell from 155 ms to 2.7 ms. Full resolution is still the default.
- **Tooling:** `saltwakePolish.benchmark(frames)`, Node Playwright runner `qa/tools/run_qa.js` (legacy + audit + v030 suites), `qa/tools/bench.js`.
- Version label and title set to v0.30.0. The alpha.1 build is in `archive/`.

## QA
79/79 checks passed with no page errors: 22 legacy, 43 map/quest/save/raid audit checks, 14 v0.30 feature checks. Results are in `qa/v0.30.0.qa.json`.

## Known issues
- The benchmarks ran on headless software rendering. Real GPU numbers will be different.
- Damage direction is estimated from the nearest enemy bullet or hostile.
- `i_stash` and `i_bed` are inside buildings, so the audit checks that they exist but not that they can be reached.
- No new art or animation sheets were added in this release. There has been no full human playthrough.
