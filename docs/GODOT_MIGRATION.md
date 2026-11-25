# Moving SALTWAKE to Godot: what carries over

| Piece | Location | Godot use |
|---|---|---|
| All art (PNG, WebP, SVG) | `assets/` + `assets/manifest.json` (alias → file) | Import as-is into `res://assets/`. The manifest aliases become resource paths or a lookup table. |
| World, quests, items, enemies, factions, loot | `world/world.json` | Load with `JSON.parse_string` into Resources, or convert to `.tres` with a script. Coordinates are in 32-px tiles. |
| Climate and weather tables | `SALTWAKE_ENV` in `source/game.template.html` (extract to JSON) | Autoload singleton data |
| Systems written as modules | `source/modules/*.js` | Port them one by one as GDScript: sky (day/night, weather blend), camera (damped follow, look-ahead, shake), HUD layout, AI telegraphs, scale rules |
| Post-processing look | `source/modules/post-fx.js` (GLSL ES 3.0) | Becomes a `CanvasItem` / `WorldEnvironment` shader. The GLSL translates almost line for line. |
| Legacy engine logic | `source/game.template.html` (split view: `dist/SALTWAKE/js/engine/*.js`) | Reference implementation for movement, combat, AI senses, extraction, saves |

Suggested order: (1) import art and world data, (2) tile map and collision from `world.json`, (3) player movement, camera and combat, (4) AI, (5) HUD, (6) sky and weather, (7) the post shader.
