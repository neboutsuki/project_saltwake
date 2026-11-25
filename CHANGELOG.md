# Changelog

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
