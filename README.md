# THE ASHEN WILDS: SALTWAKE — Full Development Handover

Version v0.30.0 — The Unseen War.

- Start with `CLAUDE.md` (handover instructions).
- Play `playable/SALTWAKE_v0.30.0_Unseen_War.html` in Chrome or Edge.
- Edit `source/game.template.html`, `world/world.json`, and `assets/` using `assets/manifest.json` to locate asset aliases. Run `python build.py` to rebuild a self-contained HTML.
- `development/` contains original integration patch, historical patch builder and browser QA script. The patch builder is for reconstructing from the Nightwatch baseline, not for editing the current template.
- `qa/` includes existing integrated QA and screenshot. `baseline/` contains the complete recovered previous package. `archive/` contains three standalone historical prototypes; do not run them in parallel with the game.

Extracted 622 unique embedded images from 781 media occurrences, without altering the game. World JSON is exported verbatim. Current source is still monolithic rather than an independently modular engine. Original external layered art and comprehensive lore documents are not included because they were unavailable. No new gameplay or art is claimed by this packaging task.
