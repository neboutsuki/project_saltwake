# SALTWAKE v0.30.0-alpha.1 — The Unseen War

## Play
Extract the ZIP to a folder, then open `SALTWAKE_v0.30.0-alpha.1_Unseen_War.html` in Chrome or Edge. All art and game data are embedded. No server or installation is needed. Export your character JSON from the old game before switching files; local storage can differ by filename. Use the existing Load Game import feature. Keep the old game as backup.

## Changes from the recovered v0.29.1 Nightwatch package
- Human actors already selected by Nightwatch (at most two, never on the first expedition) now choose routes between validated exterior approaches to existing buildings. Native pathfinding and cover remain authoritative.
- Wreckers can wait in ambush at an approach; detected combat targets take precedence over patrol goals. Human actors below 34% health or unarmed actors may retreat from a detected threat. Choices are updated every 0.65 simulation seconds; the actual game engine advances movement/combat continuously.
- NPCs can pick up only native drops produced by faction kills (one stack at a time). Their cargo returns to a native drop on death. NPCs do not access authored quest containers or grant new rewards. Player pickup still uses the original inventory handler.
- The expedition debrief shows patrol starts, faction casualties, retreats, salvage claims and surviving patrol members. Last successful summary is saved in the existing flags object. Field notes explain the new behaviors.
- All original embedded assets, canonical world data, quests and map geometry are byte-for-byte unchanged. Original save key/schema is unchanged. Title and release label updated.

## Engineering decisions and limits
The original game has one authoritative actor simulator and departure checkpoint system. The preceding standalone Unseen War/Bridge prototypes are design references, not a second runtime. This integrated port uses native actors and drops rather than a separate abstract inventory or synthetic actor spawns. No new patrol groups, persistent off-raid world economy or mid-raid resume; actors reset at departure, as before. No new images, full animation sheets, full UI overhaul, performance benchmark, or all-quest regression in this checkpoint. Existing combat stats unchanged. Controlled tests are not a complete human playthrough.

## QA
22 focused checks in headless Chromium passed with zero page errors, including actual native AI movement and human/Brineworn combat, extraction, first-raid safety, and cargo conservation. Browser policy blocked file navigation, so HTML was loaded as page content with emulated localStorage; direct local-file launch and real filesystem permissions remain unverified in this environment. 30 separate prior prototype tests also passed but are not tests of the integrated game. The previous Nightwatch QA is historical and is not claimed as a fresh regression result.

## Rebuild
Run `python build.py path/to/SALTWAKE_v0.29.1_Nightwatch.html path/to/output.html` from this folder or supply absolute paths. `test.py` requires Python Playwright and Chromium at `/usr/bin/chromium`. It loads the build and outputs `.qa.json` and a screenshot. The package contains the complete playable HTML and the patch source for further AI-assisted development.
