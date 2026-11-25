# Changelog

## Unreleased — Glass UI
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
