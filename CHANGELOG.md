# Changelog

## v0.31-dev — Impact pass (shooting feel) + left/right monsters
- **Monsters face left/right** (simple, Zero Sievert-style): field monster sprites mirror toward what they are doing, with hysteresis so they don't flicker. Their breakable-part hitboxes mirror with them. Fixed the Salt Widow's claw hitbox, which was on the wrong side of its art.
- **Firing:**
  - Directional camera kick (scaled by weapon) and muzzle smoke.
  - Spent cell casings that stay on the ground (Wickcaster, Harpoon Gun).
  - Punchy layered shot sounds: thump + crack.
  - Brighter glowing tracers.
  - Crosshair bloom: spam-firing widens the spread, which recovers in about half a second, so tap-firing is accurate.
- **Hitting:**
  - White hit-flash and squash on the monster, plus knockback per bullet.
  - Blood/ichor spray in the shot direction and ground splats that fade over ~25 s.
  - Hit marker on the crosshair; "thwack" sound, or an armour "ping" when the armour soaks the hit.
- **Killing:** red hit marker, longer hitstop and shake, a burst, a kill sound, and a corpse that stays on the ground for ~14 s.
- QA: new `impact` suite. 358 checks, all passing.

## v0.31-dev — Monster attack telegraphs
- Every monster attack on the player now has a readable wind-up (0.45–0.85 s, up from 0.30–0.42 s) with its own ground shape:
  - Brineback: Bite (wedge) and **Tusk Charge** (a long lane it dashes down; hitting a wall stuns it for 1.5 s, "strike now").
  - Salt Widow: Claw Swipe (wide wedge) and **Pounce** (a circle where you stood; it leaps there).
  - Redhook gull: Spit (aim line). Wrecker gunners: aimed shot (laser line).
  - Grazer: Horn Butt (wedge).
  - Brineworn: Drifter Lunge, Caller Rake, Breaker **Overhead Slam** (circle).
- **Honest hits:** a strike lands only if you are inside its shape when it resolves. Ranged aims lock on shortly before firing, so moving sideways dodges them. Rolling i-frames and perfect dodges work as before.
- **Readability:** shapes fill amber → red as the attack charges and flash white at the strike (the moment to roll). "!" over the head, red "!!" plus the move name for heavy moves, and a warning sound for heavy moves. At night, shapes only show within ~300 px.
- Replaces the old instant Brineback charge and the generic wedge. The Tidemaw keeps its own boss telegraphs. Monster-vs-monster fights use the original logic. The existing Settings toggle hides the shapes.
- QA: new `telegraphs` suite. 349 checks, all passing.

## v0.31-dev — Weapons overhaul
- **Hit feel:** hitstop (a short freeze on impact, scaled by weapon and damage), screen shake, recoil kick, muzzle flashes, impact sparks, swing trails. Heavy hits knock monsters back.
- **Melee (slot 3), now three weapons** from the weapon sheet:
  - Spear: long reach, hits 2 in a line.
  - Gutting Knife: fast; backstabs do x2.5 on unaware monsters or from behind.
  - Greataxe: slow sweeping chops that hit everything in the arc; huge stagger and part breaking.
  - Tap = light attack, chaining into a 3-hit combo with a finisher. Hold = charge a heavy attack. The HUD shows the combo step.
- **Charged shots:** hold fire to charge, release to shoot (a quick tap still fires normally). A full charge fires a special:
  - Bow: Piercing Arrow.
  - Longwatch: Deadeye.
  - Arbalest: Breaker Bolt.
  - Wickcaster: Flare Burst (a fan of every loaded cell).
  - Harpoon Gun: Reel Shot.
- **New Harpoon Gun** (fires bolts): reels small monsters in and anchors (slows) big ones. Its own forge tree has 2 branches (Reelhook, Anchorline).
- **Crafting:**
  - Rank V "Tidemaw" upgrades at the end of every weapon branch, forged from Tidemaw parts (needs HR7). Masterwork mods carry over.
  - New Melee tab at the forge: craft the knife and greataxe, and upgrade melee weapons to Lv 3.
  - Missing materials now say which monster part drops them.
- New modules: `weapons-data.js` (armory data, loaded before the forge) and `weapons.js` (behaviour).
- QA: new `weapons` suite. 330 checks, all passing.

## v0.31-dev — One quest at a time + errands
- **Quest slot (Monster Hunter style):** you carry one quest at a time: a story quest OR a field commission. You must finish or abandon it before you can take another. The commission board and the journal both explain why when it is locked.
- **Errands:** small jobs that run alongside your quest (up to 5) and never affect the story. The old side quests count as errands, plus 12 new ones:
  - 5 lost-item errands: find someone's belonging in a container out on the Outer Quays and return it to them (Ola's hammer, Mara's locket, Senn's tally book, Neral's spectacles, Talla's compass);
  - 7 delivery errands: bring a person a few of an item (scrap, salt, rope, feathers, lamp oil, a Brineback plate).
- **New quest step type "give":** hand items to a person. It completes when you talk to them while carrying the items (taken from your backpack first, then your stash). Otherwise they tell you how many you still need. The quest marker points at that person.
- **Journal:** Story · Errands · Commissions tabs. A "Quest" banner shows your one quest with an Abandon button and an errand count (x/5). Errands have "Drop errand", and give steps show your progress (e.g. 3/6). Abandoning a story quest resets it so you can take it again later.
- QA: new `errands` suite. The quest and audit checks now know the give step. 309 checks, all passing.

## Unreleased — New commission types and a story choice
- **Four new commission types** (`source/modules/contracts.js`), still counted through the engine and paid on a safe
  extraction:
  - **Escort:** a salvager walks with you to a site; monsters near them hurt them (health bar over their head); if
    they fall the commission fails.
  - **Delivery:** take fragile cargo at one site (E) and bring it to another; more hits than the cargo allows and it
    breaks.
  - **Capture (wound):** bring a monster below a third of its health without killing it; it is tagged and flees.
  - **Defense (hold):** stand at a site for 30–45 s while waves of Brineworn come (night).
  A marker and edge arrow point to the current pickup or destination.
- **Eight new commissions:** Records Run and The Keeper's Heir (escort), Medicine for the Pilot and Volatile Cargo
  (delivery), Tag a Bull and Mark the Widow (capture), Keep the Beacon Lit and Vigil at the Shrine (night defense).
  32 commissions in total.
- **Fix:** commissions were read from an old embedded copy of 11 entries, so the commissions added in the last two
  updates never reached the board. The board now uses the world data (all 32).
- **Story choice:** after Talla's Missing Crew, Talla asks what to do with the Wreckers' ledger: give it to the Guild
  (+220 scrip, Salvagers +15, Wreckers −20), sell it back to the Wreckers (+380, Wreckers +20, Salvagers −10) or burn
  it (+120, crews +10). Saved as `save.flags.wreckerLedger`.
- QA: new `contracts` suite; 295/295.

## Unreleased — The Tidemaw (first boss) and deeper loot
- **The Tidemaw** (`source/modules/boss.js`) rises when you step into the Boathouse Slip on an expedition. Normal
  combat rules: bullets hit its body and four breakable parts (left and right gill sacs, jaw plate, tail) that drop
  trophies; stagger opens it up; Hunter XP 400.
  - **Bite lunge** (locked red lane, then a dash); dashing into a Slip pillar stuns it (wall stun).
  - **Tail sweep** if you stand behind it (red arc).
  - **Brine spit**, a three-shot spread; missed spits leave **harpoon wrecks**: pick one up with E and your next shot
    hurls it back (150 damage, heavy stagger).
  - **Phase 2 (below 60%): burrow** under the sand and erupt where you stood (red circle).
  - **RIPTIDE** (ultimate, phase 2, then about every 28 s): a 3.4 s wind-up with glowing gills and the whole Slip
    lit blue, then a flood for 85 damage. **Break both gills** and it can never call the tide again; a stagger
    during the wind-up cancels it. A perfectly timed dodge also avoids it.
  - **Enraged below 30%**: faster, shorter pauses. Leave the Slip and it sinks to recover; step back in and it rises.
  - Boss bar with health and part status; a placeholder image (`tools/make_placeholders.py` writes
    `art/bosses/tidemaw.png`) until the real art is delivered under the same name.
- **New story finale for act 1:** The Thing Under the Slip (Mara Fen, after Warnings at the Slip): slay the Tidemaw.
  Trophy items: Tidemaw Gill Sac, Jaw Plate, Tail Fin.
- **Deeper = richer:** six rare caches at landmarks (grove trees, ruin arches, ravine edge, drowned caverns) use a new
  Deep Salvage table (lens, pressure seals, tinctures, gears, Widow claws, a chance of a masterwork core), and every
  container far from the West Passage has a growing chance of an extra deep-salvage roll.
- QA: new `boss` suite; 287/287.

## Unreleased — Quest display and many more quests
- **14 new story and side quests** (19 total), built into the maps by `tools/make_maps.py` with 13 new containers and
  11 new inspect points on the Outer Quays. Story continues with The Harbor Master's Seal and Warnings at the Slip
  (leading to the Boathouse Slip). Every harbor character now has work: rope from the net loft (Mira), lost tools
  (Ola), herb caches past the Ashwood (Sera), the old patrol route and the ridge cairn (Orin), short rations (Neral),
  buoy bells on the piers (Teren), Talla's missing crew, the crane-yard tally (Senn), saltworks gears (Iven), the
  lighthouse keeper's log (Edda) and the ridge shrine (Mara).
- **10 more commissions** (24 total): gull flocks, salvage runs, track surveys, grazer horns, Redhook beaks, Brineback
  tusk (★★), Wrecker stash (★★ stealth), two bulls at low tide (★★), Widow shell (★★★), Caller at night (★★★).
- **New quest journal** (`source/modules/questui.js`): tabs for Story, Side quests and Commissions; quest cards with
  the giver's portrait and progress; a detail view with summary, a step checklist (done / current / upcoming),
  location, rewards with item icons and Hunter XP, and Track / Accept / Show on map.
- **Tracking:** pick the tracked quest (accepting a quest tracks it). The HUD tracker shows step and distance
  ("2/4 · 80 m"); a marker floats over the objective on screen, or an arrow at the screen edge points to it.
- **Accept from conversation:** quest givers add "Any work for me? (quest)" to their dialogue.
- QA: new `questui` suite; all 19 story/side quests verified completable; 275/275.

## Unreleased — Hunter Rank and the hunting loop
- **Hunter Rank HR1–HR8** (`source/modules/hunter.js`, save `save.hunter`): XP from monster kills (gull 4 … Widow 45,
  Brineworn 15–35), part breaks (15), extraction (20), fulfilled commissions (50 × tier) and story quests (100). XP
  earned on an expedition is banked when you extract; if you fall, half is kept. Thresholds 0/120/300/550/900/1350/
  1900/2600. Rank-ups announce what they unlock.
- **Rank gates progression:** weapon ranks 2/3/4 need HR2/4/6; Brineback armor HR2, Salt Widow armor HR3; masterwork
  modifications HR5; commission tiers 1–3 need HR1–3; HR3 and HR5 each add one commission to the board. The smithy
  marks locked items "Requires HR n". (Crafting already used monster parts: Brineback plates and tusks, Redhook
  feathers and beaks, Salt Widow shells and claws.)
- **Commission board:** threat stars, colored type, a plain target line ("Hunt 2 × Redhook Gull", "Break a Salt Widow
  claw"), rewards with XP, locked cards for tiers above your rank, and your rank with a progress bar.
- **New higher-tier commissions:** Salt Yard Bulls (tier 2: three Brinebacks plus a plate), Widows of the Caverns
  (tier 3: trails plus two Widows), Quiet the Broken Quays (tier 3, night: four Brineworn).
- Rank and XP show in Player Info, the smithy and the expedition debrief. QA: new `hunter` suite; 267/267.

## Unreleased — Character pop
- Ren gets a dark pixel outline (scaled to screen pixels) and a rim light on the side facing the light: warm by day
  and at sunset, from the lantern side at night when it is lit, pale blue in the dark (`source/modules/pop.js`).
- A soft shadow plus a crisp contact shadow at the feet ground Ren (drawn outside the outline effect).
- The background is muted slightly: ground textures 18% desaturated, scenery sprites 20% desaturated and 6% darker;
  characters keep full color. QA 260/260.

## Unreleased — Sharp rendering
- **Why it looked blurry:** the game drew into a fixed 1024x576 canvas that the browser stretched to the window
  (2.5x at 1440p), and the enhanced renderer's tilt-shift blurred the top and bottom of the screen.
- **Now** (`source/modules/hires.js`): the world canvas renders at up to screen resolution (default cap 1920x1080,
  up to 4K in Graphics › "Max render scale"); all game code still draws in its 1024x576 coordinates. Pixel-art
  sprites are drawn from a cached integer nearest-neighbour upscale with smoothing, so pixels stay crisp and evenly
  sized instead of blocky and shimmering; large paintings use high-quality smoothing. Tilt-shift is off by default.
- If the game runs below ~48 fps for 3 s, the render resolution steps down automatically (1.875x → 1.5x → 1.25x →
  1x) with a message. Toggle: Graphics › "Sharp high-resolution rendering".
- QA: new `hires` suite; 259/259.

## Unreleased — A more alive world
- **Denser scenery:** the Outer Quays has about 4,000 scenery objects (was about 2,100): twice the Ashwood pines,
  more coastal pines, 22 woodland copses on the open ground, about 170 grass-and-flower meadows, more shrubs and reed
  beds along the shore. The hub gets more trees, meadow patches and shrubs. Trees only block at the trunk, so dense
  groves stay walkable.
- **Ambient life** (`source/modules/ambient.js`, particles only): leaves drift down from trees and blow with the wind;
  butterflies flutter over flowers and grass by day, pale moths around lamps at dusk; fireflies glow over grass and
  reeds at night (on top of the darkness, not in rain); a small flock's shadow crosses the ground now and then on
  clear days. Everything is culled to the view (60 fps headless on the densest area).
- Spawn points step to the nearest open ground if new scenery covers them. QA: new `ambient` suite; 254/254.

## Unreleased — Movement: walk, run, crouch, no snagging
- **No more getting stuck on trees and rocks:** trees now block only at the trunk (one small circle, not a row across
  the canopy) and rocks and props along a narrower base, and walking into a round obstacle slides you around it. A
  head-on bump picks the open side and sticks with it; if that side is blocked it switches. Wall corners nudge you
  past. Measured: with a way around, 95% of head-on approaches now get past (from 0%).
- **Running:** sprint builds up over 0.35 s instead of snapping on, Ren leans into the run and dust kicks up behind.
- **Crouching:** eases into a lower, wider pose (and back) instead of no visible change.
- Day/night lighting reads the game clock directly. QA 248/248.

## Unreleased — Better dodge
- **Burst and ease:** the roll starts fast (about 2.3x the old speed) and eases out, covering the same distance; Ren
  leans into it and dips.
- **Buffered input:** pressing dodge up to 0.2 s before it is ready (still rolling or cooling down) dodges as soon as
  it can. **Cooldown 0.75 s** (was 1.05 s). Stamina cost and invulnerability time are unchanged.
- **Perfect dodge:** rolling through an attack (hit during the invulnerability window) gives a brief slow-motion, a
  white ring, "DODGED" and +12 stamina, once per roll.
- **Feedback:** afterimages trail the roll, dust puffs at the start and end, and the vitals shake when you lack
  stamina to dodge.
- QA: new `dodge` suite; 245/245.

## Unreleased — Dark nights
- Night is now near-black away from light (ambient about 4% at midnight, a short blue hour at dusk and a violet
  pre-dawn). You see by your lantern (bigger glow, longer and brighter cone), fires, lanterns and lit windows; with the
  lantern off you keep a faint cool glow around yourself.
- In the dark, monsters show only their eyes, colored by kind (red Widows, amber Brinebacks, sea-green Brineworn, pale
  gulls and grazers); eyes blink, burn brighter when alerted, and moving monsters kick up faint dust you can track.
  Lit by your lantern or a fire, they look normal.
- Falling ash fades out at night so the darkness stays dark. QA 238/238.

## Unreleased — Day & night, camera and movement
- **Day & night lighting** (`source/modules/daynight.js`): on the new maps the flat dark wash is replaced by colored
  light. Ambient color follows the clock (cold blue night, violet pre-dawn, warm sunrise, neutral day, golden hour,
  red sunset, blue hour), greyed and dimmed by clouds, rain and fog. A half-resolution light layer adds warm light
  from the map's lanterns, braziers and campfires (fires flicker), lit town windows from dusk, and the player's
  lantern (glow plus a cone toward the aim); the world is multiplied by it, with a soft bloom on flames at night.
  The GPU renderer keeps the field neutral while this owns the lighting (no double tint).
- **Camera** (`camera.js`): a critically damped spring follow (smooth start and stop, no overshoot), look-ahead mostly
  toward where you walk with only a small aim lead, and pixel-snapped positions so pixel art does not shimmer.
- **Movement** (`source/modules/movement.js`): eased acceleration (full speed in about 0.1 s) and stopping (about
  0.07 s); direction changes blend; walking into the edge of a tree, rock or crate slides you around it. Speeds,
  sprint, stamina, weight, crouch, rolls and collisions are unchanged.
- QA: new `feel` suite; 236/236.

## Unreleased — Better maps
- **Map screens:** `tools/make_maps.py` now also renders a clean top-down picture of each area from the game art
  (`assets/art/maps/hub.webp`, `quays.webp`); the round minimap and the field map (M) draw it instead of flat shapes.
  Unexplored fog on the Quays is lighter (the land shows through dimly) and you reveal a wider area as you walk.
  The hub map's location directory works again (buildings, districts, people, exits and services).
- **Salvager's Rest:** a town wall with the city gate along the north, garden fences in front of the homes, more
  street clutter and benches.
- **Outer Quays:** Customs Hill now sits on a plateau with a cliff edge and one road up (signpost and shrine at the
  top); fences along the Salt Yards, a rubble line along the Wreckers' Camp and an iron fence around the Boathouse Slip
  turn open ground into paths; landmarks (two giant grove trees, the lighthouse on the point, a hunter statue);
  cargo clutter around the working districts; about twice the ground cover (grass, flowers, shrubs, small rocks).
- QA 227/227.

## Unreleased — Living Salvager's Rest
- **Townsfolk** (`source/modules/hublife.js`, routes in `tools/make_maps.py`): about 11 people by day walk the harbor
  routes (around Lantern Square, the promenade, the north lane, the road to the departure pier, the Quays gate road,
  the west lane, the city-gate road and two piers), pause and look around, and now and then say a short line near
  you. About 4 at night; half as many in rain. Visual only: they never block you.
- **Harbor:** four rowboats bob at their moorings; fire lights (forge brazier, campfire, square lanterns) flicker.
- **Fixes:** the round minimap works in the new hub; harbor bollards scaled to the new bollard art.
- QA: new `hublife` suite; 224/224.

## Unreleased — Living Outer Quays
- **District population** (`source/modules/population.js`, data in `tools/make_maps.py`): on top of the engine's eight
  wildlife spawns, the Quays gets about 25 more creatures by day (grazer herds on the Salt Yards, Ashwood edge,
  Customs Hill outskirts and Ravine Ridge; gull flocks at the Fish Market and Broken Quays; Brinebacks on the Salt
  Yards, shore, ridge and Customs Hill; a Widow at the Tidal Caverns) and about 20 at night (Brineworn groups on the
  Broken Quays, Warehouse Row, the Boathouse Slip and the West Passage; extra Widows in the Ashwood, camp and caverns).
  Every spawn is moved to walkable ground and gets the engine's perception state.
- Rules kept: no extra Wreckers (living hostile humans stay rare), and no Brineworn on the very first expedition.
- **15 more loot containers** across the districts (harbor master, salt shed, bonded warehouse, fish market, pilot
  shed, net loft, tool shed, abandoned cottage, Ashwood cabin, collapsed house, sunken house, lighthouse, two wrecks,
  ruin arch): 26 on the Quays in total.
- QA: new `population` suite; 217/217.

## Unreleased — New Salvager's Rest and Outer Quays
- **Both areas rebuilt from the art pack** by `tools/make_maps.py` (previews in `docs/maps/`; old world in
  `archive/world_pre_v031_maps/`):
  - **Salvager's Rest (hub), 72x58 tiles, compact:** Lantern Square with fountain, notice board and lanterns; Old Town
    row (homes, Tide Chapel, guardhouse, your lodging, cart shelter); clinic and Ledger House west, forge yard east;
    Market Row (quartermaster, salvage buyer, ration stall, Hunters' Hall, harbor stores); harbor front with crane,
    fish racks, Pilot Station and three piers. Exits: city gate north, Outer Quays passage east, Rest Docks south.
  - **Outer Quays (field), 220x150 tiles, large (was 160x128):** Salt Yards with red-salt crust, evaporation pans and
    the old saltworks; Customs Hill (customs house, warehouse, harbor master's lodge, watch beacon, ruined store);
    Ashwood edge and Ravine Ridge north; Wreckers' Camp; Warehouse Row and the Crane Yard; Old Fish Market;
    Net-loft lanes; Broken Quays with four piers, wrecks and sunken houses; the Boathouse Slip arena (pillars,
    harpoons, salt boulders); Tidal Caverns; lighthouse stump. Exits: West Passage, Storm Gate, cart track, pilot skiff.
  - Natural edges: dense treelines north and along the sides, rubble near the shore, the sea south. No invisible walls.
- Every building, NPC, container, interactable, portal and feature ID is kept (only moved), so quests and saves work;
  all six story quests still play through. Buildings are closed facades; NPCs stand at their shop fronts.
- **One renderer:** the old harbor frame no longer loads; the hub is a normal map (`tilemap.js` renders any map with
  `"tilemap": true`). Art objects are depth-sorted with actors; collisions use spatial bins; old hard-coded arrival
  points are remapped; the eight wildlife spawns, faction patrols and the minimap use the new layouts. F also talks.
- The story cast is drawn on the new hub; the dialogue box anchors above the speaker through the game camera.
- **Redo art (B27) imported:** full-width cliff, ravine and surf strips, a new moss tile, lantern post, bollard,
  harpoon stake and a stone relic. Source images live in `incoming_art/source/` and are never imported as game art.
- QA: 210/210 on both builds (tile-map suite rewritten for the new maps).

## Unreleased — Story cast in the harbor
- Imported the story characters' portraits (`art/portraits/<name>.png`, 192 px). Their work/station animations were
  removed and are not used anywhere (`tools/pack_frames.py` skips `work/` folders).
- Harbor NPCs are drawn as the story cast (one editable table, `saltwakeCast.castOf` in
  `source/modules/characters.js`): Mara Fen → Captain Elda, Neral Brin → Harlan, Edda Voss → Marin, Iven Rusk →
  Master Rook, Sera Moll → Soren, Ola Marr → Lira, Orin Hale → Kade, Teren Sull → Ivo, Mira Vale → Mira, Talla Cor →
  Tess. Names and dialogue are unchanged. They walk (up/down walk strips; sideways uses the side idle with a step
  bob) and idle when they stop.
- The dialogue box shows the story character's portrait for those NPCs; the player portrait is removed from the
  dialogue box. QA 199/199.

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
