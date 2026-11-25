# Changelog

## Unreleased — Hunter-style HUD layout
- `source/modules/hud-layout.js` moves the HUD. The existing elements are moved, not rebuilt.
  - **Upper left:** health and stamina, status effects (bleeding and similar) and the pack line. The equipped-weapon card sits directly below, with a translucent white silhouette of the weapon type (arbalest, wickcaster or spear) and the ammunition count with an icon (bolt or cell). The spear shows "Melee · no ammunition".
  - **Upper right:** the quest tracker, with color-coded type tags: HUNT, RECOVERY/SALVAGE, EXPEDITION, CONTACT, INVESTIGATE/TRACKING, plus MAIN STORY and ON EXPEDITION. Hunt commissions show the target monster and count, for example "Target: Brineback × 2".
  - **Lower left:** tide, weather and the minimap. The quick-use belt stays at bottom center.
- **Minimal HUD:** health and stamina have no panel or labels, just a heart and a bolt icon with bars and numbers. Bleeding shows as a pulsing red drop. The weapon shows only its silhouette and ammunition. The minimap is round with one line of info (tide, weather icon, time, raid timer) and a lantern on/off icon. Detection text and the long condition lines are hidden.
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
