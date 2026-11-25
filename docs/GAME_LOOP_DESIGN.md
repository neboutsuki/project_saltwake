# SALTWAKE — Core loop: Hunts on the Drowned Isles (design draft v1)

## Pitch
Salvager's Rest is the fixed home harbor. Beyond it lie the **Drowned Isles**: islands that the brine tide and
ashfall re-shape every cycle. Each landfall is a new, procedurally generated island hiding a **fixed, hand-built
lair** where your chosen quarry nests. You pick the hunt, read the island, track the monster, find its lair, break
it, and get off the island before the tide takes it back.

The randomness has an in-world reason: the Red Salt tide floods, the ash silts the channels, and the land is never
the same twice. The lairs are old and fixed. They are the only things the tide can't move, so they're always there
to be found.

## The loop
```
HARBOR (fixed)            HUNT BOARD               PREPARE               LANDFALL (random island)
craft · upgrade ·  ──▶  pick quarry +      ──▶  loadout · food ·   ──▶  explore · scavenge ·
trade · rest            threat level             tools · sail time       read tracks & signs
     ▲                  (see habitat, time,                                     │
     │                  weather, rewards)                                       ▼
 DEBRIEF  ◀──  EXTRACT (skiff point,  ◀──  HUNT (fixed lair arena:  ◀──  TRACK the quarry to
 carve parts,  before the tide            part breaks, enrage,            its lair (trail of
 rank up,      floods the low ground)     flee & return, finish)          clues + roaming)
 unlock tiers
```
A run should take **15–30 minutes**. You can always extract early with what you've carried. Dying loses the
unsecured cargo you carried (as in today's raids) but never your gear.

## 1. Hunt Board (harbor)
- **Contracts list:** each contract names a quarry (monster), a **Threat Level 1–5**, habitat biome(s), the time
  window (day / night / any), likely weather and the reward table.
- **Threat Level** scales monster health, damage and aggression, the number of elite roamers, island size, tide
  speed, how often bad weather rolls, and loot tier. It is gated by **Hunter Rank**, earned by completing hunts.
- **Free landfall:** sail without a contract to scavenge and gather. Normal monsters only, with a chance of an
  "intruder" quarry.
- The existing story contracts and Living Expedition commissions stay. Commissions can also target the isles.

## 2. Island generation (the "Drowned Isle")
**Size:** large. About 256×256 tiles at Threat 1, up to 320×320 at Threat 5, roughly 8–12× the Outer Quays, built
from 32×32-tile chunks so it streams and renders efficiently.

**Steps (seeded, so a run can be replayed and shared):**
1. **Landmass:** layered noise height, an island falloff mask and the current **tide level** give deep water,
   shallows, beach, lowland and highland. Sandbars only appear at low tide.
2. **Biomes** from height, moisture and "blight" noise:
   | Biome | Feel | Typical life |
   |---|---|---|
   | **Ashwood** | dense dead pines, ash drifts, low visibility | Grazers, Widows |
   | **Salt Flats** | open, cracked red-salt crust, mirages | Brinebacks, Gulls |
   | **Reed Marsh** | tall reeds, pools, mist, slow wading | Brineworn, eels (new) |
   | **Drowned Village** | ruined houses, wells, wreckage, lootable buildings | Wreckers, Brineworn |
   | **Lost Grove** | overgrown ancient stonework, giant trees, "lost world" | rare beasts |
   | **Blight Hollow** | horror zone: black water, bone piles, fog, wrong sounds | night horrors |
3. **Points of interest** (Poisson-spaced): camps, wrecks, shrines, caches, wells, watchtowers, nests, small
   hand-built prefabs.
4. **The Lair** (fixed, hand-built arena) is placed far from the landing beach, in a biome that matches the quarry.
   It is always reachable at any tide.
5. **Routes:** roads, animal trails and causeways connect landing, POIs, lair and **2–3 extraction points**. A
   connectivity check guarantees they're all reachable on foot.
6. **Dressing:** trees, grass, rocks, props and buildings are placed from the existing art set by biome rules (and
   new art later).

**Tide pressure:** during the run the tide rises in stages. Low ground floods, sandbar shortcuts vanish, and one
extraction point can close. That's the soft timer, the same tension as today's raids.

**Fog of war:** the map starts hidden. Climbing watchtowers, or using a chart item bought in the harbor, reveals
areas.

## 3. Tracking and the lair
- The quarry **roams** between its lair, feeding grounds and water. Its path leaves **signs**: tracks, broken
  reeds, carcasses, brine slime, sounds.
- Inspecting signs fills a **Trail meter**. At 3 signs the quarry's area is marked on the map; at 5 the lair is
  revealed.
- Hurt monsters **flee to the lair** to rest. Many fights end there, in the fixed arena designed for that monster.
- **Night-only quarry** exists only between dusk and dawn. During the day you find only its lair (empty, with clues)
  and must survive until night. These hunts lean on the Blight Hollow and Reed Marsh biomes, with stronger fog,
  lantern dependence, wrong sounds and fewer safe routes.

## 4. Monsters: design template
Each monster is data: habitat, active time, size class, senses, attack set (with the existing telegraph system),
**breakable parts**, enrage and flee thresholds, and drops. Existing monsters are reused at once and new ones are
added over time:

| Monster | Status | Habitat · time | Role |
|---|---|---|---|
| Grazer | existing | Ashwood, Flats · day | skittish prey, panics others |
| Gull | existing | coast · day | swarm harasser |
| Brineback | existing | Flats, shore · any | armored charger (shell break) |
| Salt Widow | existing | Ashwood, caves · night bias | ambush predator |
| Brineworn Drifter / Caller / Breaker | existing | Village, Marsh · dusk–night | mutated humans; caller summons |
| **Reed Lurker** | new | Marsh · night only | submerged ambusher, drags into water |
| **Ash Stag (Hollow Stag)** | new | Lost Grove, Blight · night only | horror quarry, teleports between trees in fog |
| **Tidemaw** | new · boss | lair: tidal cave | burrows in sand, triggers floods |
| **Salt Wyrm** | new · apex | lair: salt caldera · Threat 4+ | rare apex hunt |

## 5. Rewards and progression
- **Carve** parts after the kill: more and rarer parts for broken parts and higher Threat.
- Parts feed the existing **Armory and crafting** (weapon trees, armor sets, set skills), extended with
  monster-themed gear.
- **Hunter Rank** unlocks Threat levels and new quarries. The **Bestiary** fills with weaknesses, habitats and
  tracks.

## 6. How it fits the current code
- The **world format already supports maps** (`world.json`), so the generator emits a map object of the same shape
  (tiles, collision, buildings, decor, portals, spawn tables) at runtime. The renderer, collision, AI, lighting,
  weather and HUD work on it unchanged.
- The **Outer Quays stay as the fixed, hand-made starter zone** and tutorial. The isles open after the first story
  contract.
- The existing systems carry straight over: tide, extraction, raid debrief, cargo loss, factions, weather and
  day/night.

## Build phases
1. **Island generator v1:** seeded landmass, biomes, routes, POIs, extraction points and a lair placeholder, as a
   playable map with debug seed and minimap. Hunt Board with a Threat selector and "Free landfall".
2. **Hunt flow:** quarry spawn and roaming, signs and Trail meter, lair arena, flee-to-lair, carve rewards, debrief.
3. **Night and horror:** night-only spawning, Blight Hollow and Marsh atmosphere, lantern dependence.
4. **New monsters:** behaviors first (placeholder art), then art.
5. **Progression:** Hunter Rank, Threat gating, Bestiary, monster gear.

## Open questions
1. Should the Outer Quays stay as a separate fixed zone, or become one of the isles' fixed landmarks?
2. Run length: is 15–30 minutes right?
3. On death: lose carried cargo (extraction-shooter style), or lose nothing and just fail the contract?
