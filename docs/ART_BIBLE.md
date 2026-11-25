# SALTWAKE art bible (for the full graphics replacement)

## Style
- **High-detail pixel art, 2.5D top-down** (fixed ¾ view: the camera looks down at about 60°, with the fronts of
  objects visible). Not isometric. Grid-aligned.
- **Scale:** 1 tile = **32×32 px**. A human is **~52 px tall** (1.6 tiles). Doors are ~64 px tall. A one-story
  house is about 4–6 tiles wide.
- **Light:** key light from the **upper-left**, soft. Shadows fall to the lower-right. No baked cast shadows on
  sprites (the engine adds them). Baked ambient occlusion at the base is fine.
- **Outline:** dark selective outline (not pure black), 1 px, colored by material.
- **Mood:** Ashen Wilds, Red Salt Coast. Drained, ash-grey world; red-salt crusts and stains; brine green-grey
  rot; warm lantern amber as the only saturated light. Weathered, salt-eaten wood, rusted iron, wet stone.

## Palette (anchors)
| Role | Colors |
|---|---|
| Ash greys | #2b2a2c #45423f #6b6660 #9a948b #cfc8bd |
| Red salt | #5a2e2a #8e4a3f #c27b69 #e8c1b4 #f6e7e0 |
| Brine and rot | #24312c #3d5546 #6f8a74 #a5b8a2 |
| Sea | #0f1d24 #1d3640 #2f5560 #5d8b8f |
| Wood | #2a1d16 #4a3324 #6e4e36 #9a7552 |
| Lantern and fire | #ffb35c #ffd79a #e8703d |

## Deliverable format
- PNG with transparency, at **exact** pixel size, no scaling, no anti-aliased edges to transparency.
- One file per object, or a tileset sheet on a 32 px grid. Naming: `category/name_variant.png` (for example
  `trees/ash_pine_02.png`).
- Characters: **4 directions (front, back, left, right) × walk 6 frames + idle 2 + attack 4 + hit 1 + death 4**, on a
  64×64 frame grid, feet at the bottom-center pixel.
- Bosses: 128–256 px frames, same rules, plus separate **breakable-part overlays** (intact and broken).

## Asset list (full replacement)
### Ground tilesets (32 px, seamless, with transitions)
Packed soil · wet mud · gravel · cracked red-salt crust · salt flat (bright) · ash drift · sand / beach · shallows ·
deep sea · cobble road · plank deck · stone plaza · grass (short, tall) · reed marsh water · moss · cave floor ·
blight black-water. Each set needs **47-tile autotile transitions** (or the 16-tile minimal set) against its
neighbors.

### Edges and cliffs
Cliff faces (N, S, E, W, inner and outer corners, 3 heights) · cliff lips · ravine edges · surf foam strips ·
sea-wall segments · rubble heaps · dense treeline canopy masses (3 sizes) · fog bank overlay.

### Vegetation
Ash pine (4) · dead tree (3) · broadleaf (2) · giant grove tree (2) · wind-bent coastal pine (2) · shrubs (6) · grass
tufts (8) · reeds (4) · ferns (3) · flowers (4) · roots and stumps (4) · fallen logs (3).

### Buildings (with door positions marked)
Harbor: warehouse (2) · cottage (4) · stone house (3) · smithy · chapel · Hunt Board hall · ledger house · tavern ·
salt shed (2) · net loft · crane · lighthouse (intact and ruined) · boathouse · customs house · market stalls (4) ·
walls and gates. Ruins: collapsed variants of each (at least 6).

### Props
Barrels, crates, nets, ropes, anchors, bollards, lanterns (post, wall, hanging), benches, wells, carts, boats (3),
wreck pieces (6), bones and carcasses (4), nests (3), shrines (2), signposts, fences (wood, iron), debris throwables
(salt boulder, harpoon).

### Characters
Player (male and female) · townsfolk (6) · smith · trader · medic · quartermaster · ledger clerk · guard · wrecker (3
variants) · Brineworn drifter, caller and breaker.

### Creatures and bosses
Grazer · gull · Brineback · Salt Widow · Reed Lurker · Ash Stag · **Tidemaw** (boss) · Brineback Matriarch · Salt
Widow Queen · Caller Choir · Gale Harrier · Salt Wyrm.

### UI
Item icons (64 px), weapon silhouettes, status icons, map markers.

## How new art goes in
Put the files in `assets/<category>/`, run `python tools/import_art.py` (to be written: it registers aliases in
`manifest.json` and checks size, grid and transparency), then `python build.py`. Old art stays as a fallback until
each item is replaced.
