# AI art prompts (use with docs/ART_BIBLE.md)

Works with pixel-art-capable generators such as **PixelLab, Retro Diffusion, Scenario (pixel model), or Midjourney +
a pixelate pass**. Generate, then clean up:
1. downscale to the exact target size with **nearest-neighbor**;
2. remove the background (fully transparent, no semi-transparent fringe);
3. reduce colors to the palette (Aseprite or Pixelorama: *Sprite › Color Mode › Indexed* with the palette from the
   bible).

## Base prompt (prefix every prompt with this)
> high-detail pixel art, 2.5D top-down three-quarter view (camera ~60° looking down, front faces visible, NOT
> isometric), single isolated object on transparent background, soft light from upper-left, 1px dark selective
> outline, muted ash-grey palette with red-salt stains and brine-green rot, weathered salt-eaten wood, rusted iron,
> wet stone, bleak coastal post-apocalyptic fantasy, game asset, crisp pixels, no text, no shadow on ground

Negative / avoid: *isometric, perspective distortion, blurry, anti-aliasing, gradient background, text, watermark,
cast shadow, cute, saturated colors.*

## Batch 1 — needed first (new Salvager's Rest + Outer Quays)
### Ground (seamless tiles, 32×32 px; generate as 256×256 seamless texture then slice)
| File | Prompt (after base) |
|---|---|
| `tiles/packed_soil.png` | seamless tileable ground texture, packed dark earth with ash dust and small pebbles |
| `tiles/red_salt_crust.png` | seamless tileable cracked red salt crust, pale pink-white crystals in dried mud cracks |
| `tiles/cobble_road.png` | seamless tileable worn cobblestone road, ash in the joints, some missing stones |
| `tiles/plank_deck.png` | seamless tileable weathered dock planks, salt-bleached, iron nails, gaps |
| `tiles/stone_plaza.png` | seamless tileable large flagstones, cracked, moss in seams |
| `tiles/sand_beach.png` | seamless tileable grey volcanic beach sand with shell bits |
| `tiles/shallows.png` | seamless tileable shallow murky sea water over sand, subtle ripples |
| `tiles/deep_sea.png` | seamless tileable dark deep sea water, cold blue-black, faint wave caps |
| `tiles/grass_short.png` | seamless tileable sparse coastal grass, dull olive, ash-dusted |
| `tiles/wet_mud.png` | seamless tileable wet dark mud with puddles |

### Edges
| File | Size | Prompt |
|---|---|---|
| `edges/cliff_south.png` | 256×128 | rocky sea cliff face seen from above, front face visible, dark layered stone with salt streaks, straight segment that tiles horizontally |
| `edges/cliff_corner_outer.png` | 128×128 | outer corner of the same rocky cliff |
| `edges/surf_strip.png` | 256×64 | white surf foam line on dark water, tiles horizontally |
| `edges/treeline_mass.png` | 320×256 | dense overlapping dark dead-pine canopy mass, impenetrable forest edge, darker toward the top |
| `edges/sea_wall.png` | 256×128 | old stone sea wall / breakwater segment, barnacles, tiles horizontally |
| `edges/rubble_heap.png` | 192×128 | heap of collapsed brick and timber rubble, impassable |

### Trees and plants
| File | Size | Prompt |
|---|---|---|
| `trees/ash_pine_01..04.png` | 96×160 | tall dead pine tree with sparse grey needles, ash-covered branches |
| `trees/coastal_pine_01..02.png` | 128×160 | wind-bent coastal pine, leaning, dark green-grey needles |
| `trees/dead_tree_01..03.png` | 96×128 | bleached dead tree, bare twisted branches |
| `plants/grass_tuft_01..08.png` | 32×32 | small tuft of dry coastal grass |
| `plants/reeds_01..04.png` | 32×48 | clump of tall marsh reeds |
| `plants/shrub_01..06.png` | 48×40 | low thorny coastal shrub, rust-red leaves |

### Buildings (front-facing 2.5D, door at the bottom-center unless noted)
| File | Size | Prompt |
|---|---|---|
| `buildings/cottage_01..04.png` | 192×224 | small fisher cottage, slate roof, salt-stained timber walls, lit window, chimney |
| `buildings/warehouse_01..02.png` | 320×256 | large harbor warehouse, big double doors, corrugated roof patches |
| `buildings/smithy.png` | 256×224 | blacksmith workshop with open forge glow, anvil outside, chimney smoke stack |
| `buildings/hunt_hall.png` | 320×256 | hunters' guild hall, monster skulls over the door, notice boards, banners |
| `buildings/chapel.png` | 224×288 | small weathered stone chapel with a bell tower |
| `buildings/boathouse.png` | 352×256 | old wooden boathouse on stilts over water, slipway, half-collapsed |
| `buildings/customs_house.png` | 320×288 | two-story stone customs house, broken windows, faded sign |
| `buildings/market_stall_01..04.png` | 128×128 | market stall with cloth awning and goods |
| `buildings/crane.png` | 160×288 | wooden harbor crane with rope and hook |

### Props (32–96 px)
barrel · crate stack · fishing nets on a rack · anchor · bollard · lantern post · wall lantern · bench · well · hand
cart · rowboat · wreck hull piece · bone pile · salt boulder (throwable) · harpoon stuck in ground · signpost.
> Prompt pattern: "<object>, salt-weathered, coastal ruin"

### Characters (64×64 frames; generate a 4-direction sheet)
> Prompt: "<character> sprite sheet, 4 directions (front, back, left, right), idle and 6-frame walk, consistent
> character, 64x64 frames, feet at bottom center"
- player_male / player_female: hooded salvager, grey-blue cloak, leather armor, satchel, crossbow on back
- townsfolk ×6, smith (leather apron), trader, medic, guard (halberd), wrecker (rag mask, hook)

### Boss (batch 1): Tidemaw
| File | Size | Prompt |
|---|---|---|
| `bosses/tidemaw_idle_*.png` | 192×192 | huge burrowing brine beast, eel-like body with a crab-armored head, glowing teal gill sacs on both sides of the neck, barnacled hide, jaws full of salt-crystal teeth, top-down three-quarter view |
| `bosses/tidemaw_burrow.png` | 192×128 | same creature half-submerged in wet sand, only the back ridge visible |
| `bosses/tidemaw_gill_broken.png` | 64×64 | overlay: ruptured, dark gill sac |
| `bosses/tidemaw_jaw_broken.png` | 96×64 | overlay: cracked jaw plate |
| `bosses/tidemaw_tail_severed.png` | 128×64 | overlay: severed tail stump |

## Batch 2 and later
Remaining tiles and transitions, Ashwood and Salt Flats sets, Brineworn and creatures, other bosses (see the bible).

## Bringing them in
Save the files under `incoming_art/<same path as above>` and run:
```
python tools/import_art.py
```
It checks size, transparency and grid, copies valid files into `assets/`, registers aliases (`art/<path>`) in
`assets/manifest.json`, and lists any problems.
