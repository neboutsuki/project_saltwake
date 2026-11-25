# SALTWAKE — complete asset list

**228 entries · about 293 image files** (P1 = needed first: 207 · P2: 68 · P3: 18). Tick them off in `docs/asset_list.csv`.

## How to use this with ChatGPT
1. Start **one chat per category** and paste the *Style prompt* below once, so the style stays consistent.
2. For each asset, send: `Asset: <description>. Size target: <size>. Transparent background.`
3. Download, then shrink to the target size with **nearest-neighbor** (for example in [Pixelorama](https://pixelorama.org) or Aseprite), clean the edges, and save as `incoming_art/<file>`.
4. Characters and monsters: first make **one approved front-facing design**. Then ask for each direction and pose *based on that image* (upload it back). Generate one direction per image; whole sprite sheets drift.
5. Run `python tools/import_art.py` → `python build.py`.

### Style prompt (paste first in every chat)
> I am making a 2D game. Create high-detail **pixel art** game assets in a **2.5D top-down three-quarter view** (camera about 60° looking down, front faces visible, NOT isometric). Each image: **one isolated object on a transparent background**, no ground shadow, soft light from the upper-left, 1-pixel dark selective outline. Setting: bleak post-apocalyptic coastal fantasy ("Ashen Wilds, Red Salt Coast"): ash-grey muted palette, red-salt crust stains, brine-green rot, weathered salt-eaten wood, rusted iron, wet stone; warm lantern amber is the only saturated color. Crisp pixels, no text, no watermark.

Ground tiles: add *"seamless tileable square texture, viewed straight from above, no objects"*.
Sprite sheets: add *"pixel art sprite sheet, consistent character, evenly spaced frames on a transparent background"*.


## Ground tiles

| Pri | File | Size | Description | Notes |
|---|---|---|---|---|
| P1 | `tiles/packed_soil.png` | 256×256 seamless → sliced 32×32 | seamless tileable top-down ground texture: packed dark earth with ash dust and pebbles | Ask for "seamless tileable". 8 tiles of 32px per side. |
| P1 | `tiles/wet_mud.png` | 256×256 seamless → sliced 32×32 | seamless tileable top-down ground texture: wet dark mud with small puddles | Ask for "seamless tileable". 8 tiles of 32px per side. |
| P1 | `tiles/gravel.png` | 256×256 seamless → sliced 32×32 | seamless tileable top-down ground texture: loose grey gravel and shell fragments | Ask for "seamless tileable". 8 tiles of 32px per side. |
| P1 | `tiles/red_salt_crust.png` | 256×256 seamless → sliced 32×32 | seamless tileable top-down ground texture: cracked red-salt crust, pale pink crystals in dried mud cracks | Ask for "seamless tileable". 8 tiles of 32px per side. |
| P2 | `tiles/salt_flat.png` | 256×256 seamless → sliced 32×32 | seamless tileable top-down ground texture: bright white-pink salt flat, polygon cracks | Ask for "seamless tileable". 8 tiles of 32px per side. |
| P1 | `tiles/ash_drift.png` | 256×256 seamless → sliced 32×32 | seamless tileable top-down ground texture: soft grey ash drift over earth | Ask for "seamless tileable". 8 tiles of 32px per side. |
| P1 | `tiles/sand_beach.png` | 256×256 seamless → sliced 32×32 | seamless tileable top-down ground texture: grey volcanic beach sand with shell bits | Ask for "seamless tileable". 8 tiles of 32px per side. |
| P1 | `tiles/shallows.png` | 256×256 seamless → sliced 32×32 | seamless tileable top-down ground texture: shallow murky sea water over sand, ripples | Ask for "seamless tileable". 8 tiles of 32px per side. |
| P1 | `tiles/deep_sea.png` | 256×256 seamless → sliced 32×32 | seamless tileable top-down ground texture: dark deep sea water, blue-black, faint wave caps | Ask for "seamless tileable". 8 tiles of 32px per side. |
| P1 | `tiles/cobble_road.png` | 256×256 seamless → sliced 32×32 | seamless tileable top-down ground texture: worn cobblestone road, ash in joints, missing stones | Ask for "seamless tileable". 8 tiles of 32px per side. |
| P1 | `tiles/plank_deck.png` | 256×256 seamless → sliced 32×32 | seamless tileable top-down ground texture: weathered dock planks, salt-bleached, nails, gaps | Ask for "seamless tileable". 8 tiles of 32px per side. |
| P1 | `tiles/stone_plaza.png` | 256×256 seamless → sliced 32×32 | seamless tileable top-down ground texture: large cracked flagstones, moss in seams | Ask for "seamless tileable". 8 tiles of 32px per side. |
| P1 | `tiles/grass_short.png` | 256×256 seamless → sliced 32×32 | seamless tileable top-down ground texture: sparse dull olive coastal grass, ash-dusted | Ask for "seamless tileable". 8 tiles of 32px per side. |
| P2 | `tiles/grass_tall.png` | 256×256 seamless → sliced 32×32 | seamless tileable top-down ground texture: tall dry coastal grass, windswept | Ask for "seamless tileable". 8 tiles of 32px per side. |
| P2 | `tiles/marsh_water.png` | 256×256 seamless → sliced 32×32 | seamless tileable top-down ground texture: reed-marsh black-green water, floating weed | Ask for "seamless tileable". 8 tiles of 32px per side. |
| P2 | `tiles/moss.png` | 256×256 seamless → sliced 32×32 | seamless tileable top-down ground texture: damp dark green moss carpet | Ask for "seamless tileable". 8 tiles of 32px per side. |
| P2 | `tiles/cave_floor.png` | 256×256 seamless → sliced 32×32 | seamless tileable top-down ground texture: wet cave rock floor, puddles, salt deposits | Ask for "seamless tileable". 8 tiles of 32px per side. |
| P3 | `tiles/blight_ground.png` | 256×256 seamless → sliced 32×32 | seamless tileable top-down ground texture: diseased black soil, pale roots, oily sheen | Ask for "seamless tileable". 8 tiles of 32px per side. |
| P3 | `tiles/grove_soil.png` | 256×256 seamless → sliced 32×32 | seamless tileable top-down ground texture: rich dark forest soil with roots and fallen needles | Ask for "seamless tileable". 8 tiles of 32px per side. |
| P3 | `tiles/ancient_paving.png` | 256×256 seamless → sliced 32×32 | seamless tileable top-down ground texture: ancient overgrown carved paving stones | Ask for "seamless tileable". 8 tiles of 32px per side. |
| P2 | `tiles/transitions_<a>_<b>.png` | 256×256 | edge/blend between two ground types (e.g. soil→sand, road→soil, sand→shallows) | Make one per common pair: soil/sand, sand/shallows, shallows/deep, road/soil, plaza/soil, grass/soil, mud/soil |

## Edges & borders

| Pri | File | Size | Description | Notes |
|---|---|---|---|---|
| P1 | `edges/cliff_straight.png` | 256×128 | rocky sea-cliff face, front visible, layered dark stone with salt streaks, tiles horizontally |  |
| P1 | `edges/cliff_corner_outer.png` | 128×128 | outer corner of the rocky cliff |  |
| P1 | `edges/cliff_corner_inner.png` | 128×128 | inner corner of the rocky cliff |  |
| P1 | `edges/cliff_top_lip.png` | 256×64 | top edge/lip of the cliff with grass and loose stones |  |
| P1 | `edges/surf_strip.png` | 256×64 | white surf foam line on dark water, tiles horizontally |  |
| P1 | `edges/treeline_mass_01..03.png` | 320×256 | dense overlapping dead-pine canopy mass, impassable forest edge, darker toward top |  |
| P1 | `edges/sea_wall.png` | 256×128 | old stone sea wall / breakwater segment with barnacles, tiles horizontally |  |
| P1 | `edges/town_wall.png` | 256×160 | weathered timber-and-stone town palisade wall, tiles horizontally |  |
| P1 | `edges/town_gate.png` | 256×224 | town gate in the palisade, heavy wooden doors, lanterns |  |
| P1 | `edges/rubble_heap_01..02.png` | 192×128 | impassable heap of collapsed brick and timber rubble |  |
| P2 | `edges/ravine_edge.png` | 256×96 | jagged ravine drop edge with darkness below, tiles horizontally |  |
| P2 | `edges/fog_bank.png` | 512×256 | soft grey sea-fog bank, semi-transparent |  |
| P2 | `edges/marsh_reed_wall.png` | 256×160 | impenetrable wall of tall reeds |  |

## Trees

| Pri | File | Size | Description | Notes |
|---|---|---|---|---|
| P1 | `trees/ash_pine_01..04.png` | 96×160 | tall dead pine, sparse grey needles, ash-covered |  |
| P1 | `trees/coastal_pine_01..02.png` | 128×160 | wind-bent coastal pine |  |
| P1 | `trees/dead_tree_01..03.png` | 96×128 | bleached dead tree, twisted bare branches |  |
| P2 | `trees/broadleaf_01..02.png` | 128×144 | gnarled broadleaf tree, dull leaves |  |
| P3 | `trees/giant_grove_tree_01..02.png` | 256×320 | enormous ancient tree with huge roots (Lost Grove) |  |
| P3 | `trees/blight_tree_01..02.png` | 128×160 | rotting black tree with pale fungus (horror) |  |
| P1 | `trees/stump_01..02.png` | 48×40 | cut tree stump |  |
| P2 | `trees/fallen_log_01..02.png` | 96×48 | fallen mossy log |  |

## Plants

| Pri | File | Size | Description | Notes |
|---|---|---|---|---|
| P1 | `plants/grass_tuft_01..06.png` | 32×32 | small tuft of dry coastal grass |  |
| P1 | `plants/shrub_01..04.png` | 48×40 | low thorny shrub, rust-red leaves |  |
| P1 | `plants/reeds_01..04.png` | 32×48 | clump of tall marsh reeds |  |
| P2 | `plants/fern_01..03.png` | 40×32 | dark fern |  |
| P2 | `plants/flowers_01..03.png` | 24×24 | small pale wildflowers |  |
| P3 | `plants/mushrooms_01..02.png` | 24×24 | pale glowing mushrooms (night/horror) |  |
| P1 | `plants/kelp_pile_01..02.png` | 48×24 | washed-up kelp pile |  |

## Rocks

| Pri | File | Size | Description | Notes |
|---|---|---|---|---|
| P1 | `rocks/rock_small_01..03.png` | 32×24 | small grey rock |  |
| P1 | `rocks/rock_large_01..02.png` | 96×72 | large boulder |  |
| P2 | `rocks/salt_crystal_cluster_01..02.png` | 48×48 | red-salt crystal cluster |  |
| P2 | `rocks/cliff_rock_01..02.png` | 128×96 | big jagged coastal rock |  |

## Buildings — Salvager’s Rest

| Pri | File | Size | Description | Notes |
|---|---|---|---|---|
| P1 | `buildings/cottage_01..04.png` | 192×224 | small fisher cottage, slate roof, salt-stained timber, lit window, chimney |  |
| P1 | `buildings/stone_house_01..02.png` | 224×256 | two-story stone townhouse |  |
| P1 | `buildings/lodging.png` | 224×256 | player lodging/inn with sign, warm windows |  |
| P1 | `buildings/hunt_hall.png` | 320×256 | hunters guild hall, monster skulls over door, notice boards, banners |  |
| P1 | `buildings/bestiary_hall.png` | 256×256 | old stone hall with carved beast reliefs |  |
| P1 | `buildings/smithy.png` | 256×224 | blacksmith forge workshop, open forge glow, anvil, chimney |  |
| P1 | `buildings/chapel.png` | 224×288 | small weathered stone chapel with bell tower |  |
| P1 | `buildings/ledger_house.png` | 224×224 | merchant ledger office, signboard with scales |  |
| P1 | `buildings/tavern.png` | 256×224 | harbor tavern, hanging sign, barrels outside |  |
| P1 | `buildings/apothecary.png` | 192×224 | apothecary shop, herbs hanging, green bottles |  |
| P1 | `buildings/trader_shop.png` | 224×224 | trading post with crates and awning |  |
| P1 | `buildings/harbor_master.png` | 224×256 | harbor master office with flag pole |  |
| P1 | `buildings/salt_shed_01..02.png` | 224×160 | long salt-storage shed, open sides, salt piles |  |
| P1 | `buildings/net_loft.png` | 192×224 | tall net loft with nets drying |  |
| P1 | `buildings/crane.png` | 160×288 | wooden harbor crane with rope and hook |  |
| P1 | `buildings/market_stall_01..04.png` | 128×128 | market stall, cloth awning, goods |  |
| P1 | `buildings/pier_section.png` | 256×128 | wooden pier segment over water, tiles horizontally |  |
| P1 | `buildings/jetty_end.png` | 128×128 | pier end with mooring posts and lantern |  |
| P1 | `buildings/lighthouse.png` | 160×352 | tall stone lighthouse with lit lamp |  |
| P1 | `buildings/watch_beacon.png` | 128×224 | cliff-top signal beacon |  |

## Buildings — Outer Quays

| Pri | File | Size | Description | Notes |
|---|---|---|---|---|
| P1 | `buildings/warehouse_01..02.png` | 320×256 | large harbor warehouse, double doors, patched roof |  |
| P1 | `buildings/warehouse_ruined.png` | 320×256 | collapsed warehouse, roof caved in |  |
| P1 | `buildings/customs_house.png` | 320×288 | two-story stone customs house, broken windows |  |
| P1 | `buildings/boathouse.png` | 352×256 | old boathouse on stilts, slipway, half-collapsed |  |
| P1 | `buildings/pilot_shed.png` | 192×160 | small pilot hut by the water |  |
| P1 | `buildings/lighthouse_ruined.png` | 160×256 | broken lighthouse stump |  |
| P1 | `buildings/fish_market.png` | 320×224 | open fish-market hall, rotting stalls |  |
| P1 | `buildings/rail_cart_track.png` | 256×64 | rusted rail cart track segment |  |
| P1 | `buildings/wreck_ship_01..02.png` | 384×224 | beached wrecked sailing ship hull |  |
| P1 | `buildings/wreck_small.png` | 192×128 | small wrecked rowing boat |  |

## Buildings — later areas

| Pri | File | Size | Description | Notes |
|---|---|---|---|---|
| P2 | `buildings/flats_pump_house.png` | 224×224 | salt-works pump house (Red Salt Flats) |  |
| P2 | `buildings/flats_evaporation_pan.png` | 256×128 | stone evaporation pan with brine (Red Salt Flats) |  |
| P2 | `buildings/ashwood_cabin.png` | 192×192 | abandoned woodcutter cabin (Ashwood) |  |
| P2 | `buildings/wrecker_camp_tent_01..02.png` | 160×128 | ragged wrecker tent with stolen goods |  |
| P2 | `buildings/village_house_sunken_01..03.png` | 224×224 | half-sunken village house, water to the windows (Drowned Village) |  |
| P2 | `buildings/village_chapel_flooded.png` | 288×320 | flooded chapel with bell (boss arena) |  |
| P3 | `buildings/cliff_lighthouse.png` | 192×384 | tall storm-cliff lighthouse (Storm Cliffs) |  |
| P3 | `buildings/ancient_ruin_arch_01..02.png` | 224×224 | overgrown ancient stone arch (Lost Grove) |  |
| P2 | `buildings/shrine_01..02.png` | 96×128 | small weathered roadside shrine |  |
| P3 | `buildings/bone_well.png` | 160×160 | well choked with bones (Blight) |  |

## Props

| Pri | File | Size | Description | Notes |
|---|---|---|---|---|
| P1 | `props/barrel_01..02.png` | 32×40 | barrel, salt-weathered coastal ruin |  |
| P1 | `props/crate_01..03.png` | 40×40 | crate, salt-weathered coastal ruin |  |
| P1 | `props/crate_stack.png` | 64×64 | crate stack, salt-weathered coastal ruin |  |
| P1 | `props/net_rack.png` | 64×64 | net rack, salt-weathered coastal ruin |  |
| P1 | `props/anchor.png` | 48×48 | anchor, salt-weathered coastal ruin |  |
| P1 | `props/bollard.png` | 24×32 | bollard, salt-weathered coastal ruin |  |
| P1 | `props/lantern_post.png` | 32×96 | lantern post, salt-weathered coastal ruin |  |
| P1 | `props/wall_lantern.png` | 24×32 | wall lantern, salt-weathered coastal ruin |  |
| P1 | `props/hanging_lantern.png` | 24×40 | hanging lantern, salt-weathered coastal ruin |  |
| P1 | `props/bench.png` | 64×40 | bench, salt-weathered coastal ruin |  |
| P1 | `props/well.png` | 64×80 | well, salt-weathered coastal ruin |  |
| P1 | `props/hand_cart.png` | 80×56 | hand cart, salt-weathered coastal ruin |  |
| P1 | `props/rowboat.png` | 96×56 | rowboat, salt-weathered coastal ruin |  |
| P1 | `props/rope_coil.png` | 32×24 | rope coil, salt-weathered coastal ruin |  |
| P1 | `props/fish_basket.png` | 32×32 | fish basket, salt-weathered coastal ruin |  |
| P1 | `props/signpost.png` | 40×64 | signpost, salt-weathered coastal ruin |  |
| P1 | `props/notice_board.png` | 64×80 | notice board, salt-weathered coastal ruin |  |
| P1 | `props/fence_wood.png` | 64×48 | fence wood, salt-weathered coastal ruin |  |
| P1 | `props/fence_iron.png` | 64×48 | fence iron, salt-weathered coastal ruin |  |
| P1 | `props/brazier.png` | 32×56 | brazier, salt-weathered coastal ruin |  |
| P1 | `props/campfire.png` | 48×40 | campfire, salt-weathered coastal ruin |  |
| P1 | `props/tent_supplies.png` | 64×56 | tent supplies, salt-weathered coastal ruin |  |
| P1 | `props/bone_pile_01..02.png` | 48×32 | bone pile, salt-weathered coastal ruin |  |
| P1 | `props/carcass_01..02.png` | 80×48 | carcass, salt-weathered coastal ruin |  |
| P1 | `props/nest_01..02.png` | 96×64 | nest, salt-weathered coastal ruin |  |
| P1 | `props/cart_wreck.png` | 96×64 | cart wreck, salt-weathered coastal ruin |  |
| P1 | `props/chain_post.png` | 32×64 | chain post, salt-weathered coastal ruin |  |
| P1 | `props/salt_sack_pile.png` | 48×40 | salt sack pile, salt-weathered coastal ruin |  |
| P1 | `props/fountain.png` | 128×128 | fountain, salt-weathered coastal ruin |  |
| P1 | `props/statue_hunter.png` | 96×160 | statue hunter, salt-weathered coastal ruin |  |

## Props — loot

| Pri | File | Size | Description | Notes |
|---|---|---|---|---|
| P1 | `props/chest_common.png` | 40×40 | loot chest, plain |  |
| P1 | `props/chest_rare.png` | 40×40 | reinforced loot chest, iron bands |  |
| P1 | `props/cache_bundle.png` | 40×32 | tied salvage bundle |  |
| P1 | `props/body_satchel.png` | 40×24 | dead salvager satchel |  |

## Boss arena pieces

| Pri | File | Size | Description | Notes |
|---|---|---|---|---|
| P1 | `arena/arena_pillar_01..02.png` | 96×192 | thick stone/timber pillar (cover; bosses stun on it) |  |
| P1 | `arena/pillar_broken.png` | 96×128 | collapsed pillar (after boss impact) |  |
| P1 | `arena/salt_boulder.png` | 48×40 | throwable salt boulder (thrown back at the boss) |  |
| P1 | `arena/harpoon_stuck.png` | 32×64 | harpoon stuck in ground (pick up and throw) |  |
| P1 | `arena/oil_pool.png` | 96×48 | brine-oil pool (can ignite) |  |
| P1 | `arena/arena_gate_closed.png` | 192×160 | heavy gate/fog wall that seals the arena |  |
| P2 | `arena/lure_lantern.png` | 48×96 | boss lure lantern (breakable) |  |
| P2 | `arena/flood_water_overlay.png` | 512×512 | semi-transparent flood water overlay |  |

## Characters (NPC & player)

| Pri | File | Size | Description | Notes |
|---|---|---|---|---|
| P1 | `characters/player_male.png` | 64×64 per frame; 4 directions (down, up, left, right) × [idle 2, walk 6, attack 4, hit 1, death 4] | hooded salvager, grey-blue cloak, leather armor, satchel | NPCs need only idle + walk |
| P1 | `characters/player_female.png` | 64×64 per frame; 4 directions (down, up, left, right) × [idle 2, walk 6, attack 4, hit 1, death 4] | hooded salvager, grey-blue cloak, leather armor, satchel | NPCs need only idle + walk |
| P1 | `characters/smith.png` | 64×64 per frame; 4 directions (down, up, left, right) × [idle 2, walk 6, attack 4, hit 1, death 4] | burly smith, leather apron, soot | NPCs need only idle + walk |
| P1 | `characters/trader.png` | 64×64 per frame; 4 directions (down, up, left, right) × [idle 2, walk 6, attack 4, hit 1, death 4] | merchant with coin pouch and coat | NPCs need only idle + walk |
| P1 | `characters/medic.png` | 64×64 per frame; 4 directions (down, up, left, right) × [idle 2, walk 6, attack 4, hit 1, death 4] | field medic with bandage bag | NPCs need only idle + walk |
| P1 | `characters/quartermaster.png` | 64×64 per frame; 4 directions (down, up, left, right) × [idle 2, walk 6, attack 4, hit 1, death 4] | grizzled quartermaster with ledger | NPCs need only idle + walk |
| P1 | `characters/hunt_master.png` | 64×64 per frame; 4 directions (down, up, left, right) × [idle 2, walk 6, attack 4, hit 1, death 4] | veteran hunter, scarred, trophy necklace (Hunt Board) | NPCs need only idle + walk |
| P1 | `characters/guard.png` | 64×64 per frame; 4 directions (down, up, left, right) × [idle 2, walk 6, attack 4, hit 1, death 4] | harbor guard with halberd and lantern | NPCs need only idle + walk |
| P2 | `characters/townsfolk_01..06.png` | 64×64 per frame; 4 directions (down, up, left, right) × [idle 2, walk 6, attack 4, hit 1, death 4] | fisher folk, dock workers, children, elders | NPCs need only idle + walk |

## Enemies — humans

| Pri | File | Size | Description | Notes |
|---|---|---|---|---|
| P1 | `characters/wrecker_hook.png` | 64×64 per frame; 4 directions (down, up, left, right) × [idle 2, walk 6, attack 4, hit 1, death 4] | wrecker raider with rag mask and hook |  |
| P1 | `characters/wrecker_arbalest.png` | 64×64 per frame; 4 directions (down, up, left, right) × [idle 2, walk 6, attack 4, hit 1, death 4] | wrecker with crossbow |  |
| P2 | `characters/wrecker_brute.png` | 64×64 per frame; 4 directions (down, up, left, right) × [idle 2, walk 6, attack 4, hit 1, death 4] | big wrecker with plank shield |  |

## Monsters

| Pri | File | Size | Description | Notes |
|---|---|---|---|---|
| P1 | `monsters/grazer.png` | 96×96 per frame (large: 128×128); 4 directions × [idle 2, move 6, attack 4–6, hit 1, death 4] | goat-like coastal grazer with salt-crusted wool |  |
| P1 | `monsters/gull.png` | 96×96 per frame (large: 128×128); 4 directions × [idle 2, move 6, attack 4–6, hit 1, death 4] | mutated carrion gull |  |
| P1 | `monsters/brineback.png` | 96×96 per frame (large: 128×128); 4 directions × [idle 2, move 6, attack 4–6, hit 1, death 4] | armored boar-like brine beast with shell back |  |
| P1 | `monsters/salt_widow.png` | 96×96 per frame (large: 128×128); 4 directions × [idle 2, move 6, attack 4–6, hit 1, death 4] | huge pale salt spider |  |
| P1 | `monsters/brineworn_drifter.png` | 96×96 per frame (large: 128×128); 4 directions × [idle 2, move 6, attack 4–6, hit 1, death 4] | mutated former human, brine-rotted, lurching |  |
| P1 | `monsters/brineworn_caller.png` | 96×96 per frame (large: 128×128); 4 directions × [idle 2, move 6, attack 4–6, hit 1, death 4] | brineworn with a lantern lure, summoner |  |
| P1 | `monsters/brineworn_breaker.png` | 96×96 per frame (large: 128×128); 4 directions × [idle 2, move 6, attack 4–6, hit 1, death 4] | hulking brineworn with crystal-encrusted arm |  |
| P2 | `monsters/reed_lurker.png` | 96×96 per frame (large: 128×128); 4 directions × [idle 2, move 6, attack 4–6, hit 1, death 4] | submerged marsh ambusher, long jaws (night only) |  |
| P2 | `monsters/ash_stag.png` | 96×96 per frame (large: 128×128); 4 directions × [idle 2, move 6, attack 4–6, hit 1, death 4] | emaciated horror stag with antlers of bone (night only) |  |
| P3 | `monsters/tide_crab.png` | 96×96 per frame (large: 128×128); 4 directions × [idle 2, move 6, attack 4–6, hit 1, death 4] | large crab scavenger |  |
| P3 | `monsters/ash_wolf.png` | 96×96 per frame (large: 128×128); 4 directions × [idle 2, move 6, attack 4–6, hit 1, death 4] | grey ash wolf pack hunter |  |

## Bosses

| Pri | File | Size | Description | Notes |
|---|---|---|---|---|
| P1 | `bosses/tidemaw.png` | 192×192 or 256×256 per frame; idle, move, 3–5 attacks, stagger, topple, death; + breakable part overlays (intact/broken) | burrowing brine beast, eel body, crab-armored head, glowing teal gill sacs, salt-crystal teeth | Breakable parts: gill sac L/R, jaw plate, tail (severed) |
| P2 | `bosses/brineback_matriarch.png` | 192×192 or 256×256 per frame; idle, move, 3–5 attacks, stagger, topple, death; + breakable part overlays (intact/broken) | giant armored brineback with cracked shell crown | Breakable parts: shell crown, left tusk, right tusk |
| P2 | `bosses/salt_widow_queen.png` | 192×192 or 256×256 per frame; idle, move, 3–5 attacks, stagger, topple, death; + breakable part overlays (intact/broken) | enormous salt spider queen with egg sac | Breakable parts: egg sac, fangs, front legs |
| P2 | `bosses/caller_choir.png` | 192×192 or 256×256 per frame; idle, move, 3–5 attacks, stagger, topple, death; + breakable part overlays (intact/broken) | fused group of brineworn singers around a giant lantern lure | Breakable parts: lure lantern, three heads |
| P3 | `bosses/gale_harrier.png` | 192×192 or 256×256 per frame; idle, move, 3–5 attacks, stagger, topple, death; + breakable part overlays (intact/broken) | giant storm bird with rusted metal feathers | Breakable parts: wings L/R, beak |
| P3 | `bosses/salt_wyrm.png` | 192×192 or 256×256 per frame; idle, move, 3–5 attacks, stagger, topple, death; + breakable part overlays (intact/broken) | colossal salt serpent wyrm (story final) | Breakable parts: crystal spines, head crown, tail |

## Effects (VFX)

| Pri | File | Size | Description | Notes |
|---|---|---|---|---|
| P1 | `vfx/proj_spit_brine.png` | 32×32 ×4 frames | glowing teal brine spit projectile | Horizontal sprite strip |
| P1 | `vfx/proj_bolt.png` | 32×8 | crossbow bolt | Horizontal sprite strip |
| P1 | `vfx/proj_wick_flame.png` | 32×32 ×4 | fire bolt | Horizontal sprite strip |
| P1 | `vfx/proj_salt_shard.png` | 24×24 | spinning salt shard | Horizontal sprite strip |
| P1 | `vfx/hit_spark.png` | 48×48 ×5 | impact spark burst | Horizontal sprite strip |
| P1 | `vfx/blood_brine.png` | 48×48 ×5 | dark brine blood splash | Horizontal sprite strip |
| P1 | `vfx/part_break_burst.png` | 96×96 ×6 | armor/part break explosion of shards | Horizontal sprite strip |
| P1 | `vfx/dust_burrow.png` | 96×64 ×6 | sand burst from burrowing | Horizontal sprite strip |
| P1 | `vfx/splash.png` | 64×32 ×5 | water splash | Horizontal sprite strip |
| P1 | `vfx/wave_crash.png` | 256×128 ×6 | big wave crash (Brine Deluge) | Horizontal sprite strip |
| P1 | `vfx/fire_burn.png` | 48×64 ×6 | burning fire loop | Horizontal sprite strip |
| P2 | `vfx/smoke_puff.png` | 48×48 ×6 | smoke puff | Horizontal sprite strip |
| P2 | `vfx/lightning_bolt.png` | 64×256 ×3 | lightning strike | Horizontal sprite strip |
| P1 | `vfx/ground_crack.png` | 128×64 | ground crack decal after slam | Horizontal sprite strip |

## Item icons — weapons

| Pri | File | Size | Description | Notes |
|---|---|---|---|---|
| P1 | `icons/weapon_arbalest.png` | 64×64 | arbalest crossbow item icon |  |
| P1 | `icons/weapon_wickcaster.png` | 64×64 | oil-fire hand cannon item icon |  |
| P1 | `icons/weapon_spear.png` | 64×64 | salvager spear item icon |  |
| P1 | `icons/weapon_harpoon_gun.png` | 64×64 | harpoon launcher item icon |  |
| P1 | `icons/weapon_greataxe.png` | 64×64 | salt-iron great axe item icon |  |

## Item icons — consumables

| Pri | File | Size | Description | Notes |
|---|---|---|---|---|
| P1 | `icons/bolt.png` | 64×64 | bolt item icon |  |
| P1 | `icons/wick_cell.png` | 64×64 | wick cell item icon |  |
| P1 | `icons/bandage.png` | 64×64 | bandage item icon |  |
| P1 | `icons/ration.png` | 64×64 | ration item icon |  |
| P1 | `icons/healing_tincture.png` | 64×64 | healing tincture item icon |  |
| P1 | `icons/lamp_oil.png` | 64×64 | lamp oil item icon |  |
| P1 | `icons/whetstone.png` | 64×64 | whetstone item icon |  |
| P1 | `icons/smoke_bomb.png` | 64×64 | smoke bomb item icon |  |
| P1 | `icons/flash_pod.png` | 64×64 | flash pod item icon |  |
| P1 | `icons/trap_net.png` | 64×64 | trap net item icon |  |
| P1 | `icons/antidote.png` | 64×64 | antidote item icon |  |
| P1 | `icons/stamina_draught.png` | 64×64 | stamina draught item icon |  |

## Item icons — materials

| Pri | File | Size | Description | Notes |
|---|---|---|---|---|
| P1 | `icons/scrap_metal.png` | 64×64 | scrap metal material icon |  |
| P1 | `icons/rope.png` | 64×64 | rope material icon |  |
| P1 | `icons/salt_crystals.png` | 64×64 | salt crystals material icon |  |
| P1 | `icons/timber.png` | 64×64 | timber material icon |  |
| P1 | `icons/cloth.png` | 64×64 | cloth material icon |  |
| P1 | `icons/oil.png` | 64×64 | oil material icon |  |
| P1 | `icons/iron_ingot.png` | 64×64 | iron ingot material icon |  |

## Item icons — monster parts

| Pri | File | Size | Description | Notes |
|---|---|---|---|---|
| P1 | `icons/tidemaw_gill.png` | 64×64 | tidemaw gill monster part icon |  |
| P1 | `icons/tidemaw_jaw_plate.png` | 64×64 | tidemaw jaw plate monster part icon |  |
| P1 | `icons/tidemaw_tail_fin.png` | 64×64 | tidemaw tail fin monster part icon |  |
| P1 | `icons/brineback_shell.png` | 64×64 | brineback shell monster part icon |  |
| P1 | `icons/widow_silk.png` | 64×64 | widow silk monster part icon |  |
| P1 | `icons/widow_fang.png` | 64×64 | widow fang monster part icon |  |
| P1 | `icons/brineworn_crystal.png` | 64×64 | brineworn crystal monster part icon |  |
| P1 | `icons/grazer_wool.png` | 64×64 | grazer wool monster part icon |  |
| P1 | `icons/gull_feather.png` | 64×64 | gull feather monster part icon |  |
| P2 | `icons/lurker_scale.png` | 64×64 | lurker scale monster part icon |  |
| P2 | `icons/stag_antler.png` | 64×64 | stag antler monster part icon |  |
| P2 | `icons/wyrm_spine.png` | 64×64 | wyrm spine monster part icon |  |

## Item icons — armor

| Pri | File | Size | Description | Notes |
|---|---|---|---|---|
| P2 | `icons/armor_head_salvager.png` | 64×64 | salvager armor head icon | Later one set per monster |
| P2 | `icons/armor_chest_salvager.png` | 64×64 | salvager armor chest icon | Later one set per monster |
| P2 | `icons/armor_arms_salvager.png` | 64×64 | salvager armor arms icon | Later one set per monster |
| P2 | `icons/armor_waist_salvager.png` | 64×64 | salvager armor waist icon | Later one set per monster |
| P2 | `icons/armor_legs_salvager.png` | 64×64 | salvager armor legs icon | Later one set per monster |

## UI

| Pri | File | Size | Description | Notes |
|---|---|---|---|---|
| P2 | `ui/map_marker_quest.png` | 32×32 | quest marker |  |
| P2 | `ui/map_marker_boss.png` | 32×32 | boss skull marker |  |
| P2 | `ui/map_marker_exit.png` | 32×32 | extraction marker |  |
| P2 | `ui/map_marker_camp.png` | 32×32 | camp marker |  |
| P2 | `ui/map_marker_track.png` | 32×32 | monster track marker |  |
| P2 | `ui/map_marker_player.png` | 32×32 | player arrow |  |

## Key art

| Pri | File | Size | Description | Notes |
|---|---|---|---|---|
| P2 | `keyart/title_keyart.png` | 1920×1080 | title screen painting: Salvager’s Rest harbor at night, ash falling |  |
| P2 | `keyart/loading_01..03.png` | 1920×1080 | loading screen paintings (quays, flats, boss silhouette) |  |
| P3 | `keyart/bestiary_portrait_<monster>.png` | 256×256 | bestiary portrait per monster and boss |  |

## Not needed as art (handled by the engine)
Lighting, shadows, fog, rain and ash particles, bloom, color grading, attack telegraphs, damage numbers and arcs, the minimap, and menus and HUD frames.
