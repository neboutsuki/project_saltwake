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

## Decisions (agreed, revised)
- **Two kinds of world.**
  1. **The Red Salt Coast: a large fixed region for the story.** Hand-built, growing out of today's Outer Quays
     into several connected zones (quays, salt flats, ashwood, the drowned village, cliffs). The story happens here.
     It still feels alive: **random roaming bosses and random encounters** (wandering elites, ambushes, storms
     bringing in an "intruder" boss, wreck events) rotate in, so a familiar map is never quite the same.
  2. **The Drowned Isles: generated, for the grind.** The repeatable hunt loop described above. Better loot, higher
     Threat levels, rare materials and the apex quarries only exist here.
- **Death:** you lose the cargo you carried that hadn't been extracted. You keep your equipped gear. The contract
  fails.
- **Run length:** 15–30 minutes on the isles. Story-region outings are free-form.
- **Difficulty:** Monster Hunter-like. Bosses are hard, readable and fair; you win through learning patterns,
  positioning, breaking parts and preparing well, not through stats alone.

## 7. Boss combat design
**Pillars**
1. **Readable, then punishing.** Every big attack is telegraphed (wind-up pose, ground wedge or zone, sound). If you
   read it you can always avoid it, but a hit hurts.
2. **Dodge is the core skill.** The existing roll has invulnerability frames. Bosses fire projectile patterns
   (fans, rings, lines, homing spit, rain) that you weave through. Stamina limits how much you can roll.
3. **The boss's attacks are your tools.** Missed attacks leave something in the arena you can use against it.
4. **Break parts to change the fight.** Specific parts gate specific attacks. Breaking the right part removes or
   weakens the most dangerous move, including **one-hit-kill ultimates**.
5. **Phases and enrage.** Each boss has 2–3 phases (at about 70% and 35% health) with new patterns. Enrage speeds it
   up; exhaustion gives you openings.
6. **Openings.** Stagger, topple (knocked down: big damage window), wall-stun after a missed charge, and
   flinch-on-break.

**Shared combat systems to build**
- **Pattern engine:** data-driven attack definitions (telegraph, timing, hitbox shape, projectile pattern,
  cooldown, phase, required part).
- **Breakable parts:** each with its own health, a visible damage state and a break reward. A part can be tagged
  `disables: [attackIds]` or `weakens: {attackId: factor}`.
- **Arena objects:** spawned debris and hazards with simple interactions: pick up / throw, ignite, collapse, flood.
- **Status effects:** bleed, wet and soaked, brine-poison, stun, and fire (also used on the boss).
- **Hit feedback:** hit-stop, part flash, break burst, stagger meter, enrage glow (built on the existing telegraph
  and damage-direction work).

**Gimmick catalogue (examples to build from)**
| Gimmick | How it plays |
|---|---|
| **Return to sender** | The boss hurls salt boulders or harpoons. A missed one sticks in the ground; pick it up and throw it back for big stagger damage. |
| **Charge into the wall** | Bait a charge into a pillar or wreck. The boss stuns itself (topple window), and the pillar collapses on it. |
| **Break the battery** | The ultimate ("Brine Deluge", a one-hit kill if you're caught) is charged by glowing gill sacs. Break both before phase 3 and the ultimate is gone. Break one and it becomes survivable. |
| **Cut the tether** | A Caller-type boss anchors summons to its lantern-lure. Break the lure and the summons scatter. |
| **Light and dark** | Night horrors only take full damage inside your lantern's light. They try to bait you into dousing it, or knock it out. |
| **Ignite the spill** | Brine-oil spit leaves pools; a fire bolt (wickcaster) ignites them under the boss. |
| **Tide timing** | Some lair arenas flood in waves. The boss is stronger in water; fight it on the dry islands between waves. |
| **Reflect the spit** | Time a parry or melee swing on certain slow projectiles to send them back. |
| **Mount / climb** (later) | Topple, then climb onto the boss for a weak-point stab mini-game. |

**First boss to prototype: Tidemaw** (burrowing brine beast, tidal cave lair)
- Phase 1: burrow and lunge (ground ripple telegraph), spit fans (dodge through the gaps), and a tail sweep.
- Gimmicks: its burrow lunges throw up **salt boulders** that you can throw back. Charging into a cave pillar
  stuns it.
- Breakable parts: **gill sacs (×2)** power the phase-3 ultimate **Brine Deluge** (an arena-wide wave; a one-hit
  kill unless you're behind a pillar or the gills are broken). **Jaw:** breaking it weakens bites. **Tail:** it can
  be severed, which removes the sweep and adds a carve.
- Phase 3 (enraged at 35%): faster, adds ring bursts. The arena floods between waves.

## 8. Rule: every map ends in a boss arena
- **Every map's final area is a boss arena.** This applies to each story zone of the Red Salt Coast and to every
  generated Drowned Isle. The map is built as a journey toward it: landing → exploration and tracking → the
  approach (a tense, quieter stretch, signs of the boss, a last safe camp or supply cache) → **arena** → extraction
  route opens.
- **Arenas are hand-built, fixed set pieces,** even on generated islands. They are designed around their boss's
  gimmicks: pillars to bait charges, cover from the ultimate, flood levels, light sources, throwable debris. The
  generator places the arena furthest from the landing and builds the island's routes toward it.
- **Story zones:** the arena boss is the zone's story boss the first time; afterwards it rotates with random roaming
  bosses. **Isles:** the arena holds the contract's quarry, or a random boss on free landfall.
- **Entering the arena commits you:** a gate, a collapse or a fog wall closes behind you. You can still use
  consumables. Leaving means beating the boss or dying, so preparation matters.
- After the boss dies, the **extraction route** opens (skiff, lift, or the tide receding) and the boss can be
  carved.

## 9. Checklist: "fun and difficult" (every boss must pass before it ships)
1. **At least 3 attack families,** including at least one projectile pattern you must dodge through rather than
   simply outrun.
2. **Every damaging attack is telegraphed** (pose, ground marker or sound) with a reaction window of at least
   0.35 s. A one-hit-kill ultimate gets a long, unmistakable wind-up and a clear counterplay.
3. **At least 2 gimmicks** that turn the boss's own actions or the arena against it (throw-back, wall stun,
   ignite, reflect, light).
4. **At least 2 breakable parts,** at least one of which **disables or weakens** a dangerous attack.
5. **Phases:** at least 2, with a visible change (new move, speed, arena change) and a short safe beat at the
   transition.
6. **Openings to punish:** a stagger meter, a topple, and recovery frames after big moves. The player should
   always know when it's their turn.
7. **Fair difficulty targets:** a first-time attempt with starter gear usually fails or barely wins; a prepared,
   skilled player wins in 6–12 minutes. No damage from off-screen sources without warning. No unavoidable chip
   damage.
8. **Readable at a glance:** a boss health bar, part-damage indicators, an enrage glow and a stagger meter.
9. **Reward that feels earned:** unique carves per broken part, a first-kill bonus, and a Bestiary entry that
   reveals weaknesses.
10. **Automated QA:** scripted checks that every attack has a telegraph, that every part break disables its tagged
    attacks, that the arena gimmicks work, and that a bot using perfect dodges can survive phase 1. These are
    added to the regression suite.

## Build phases (revised)
1. **Boss combat framework + Tidemaw prototype** in a **boss arena at the end of the Outer Quays,** tested there first, because fun combat is the
   core of everything else.
2. **Fixed story region expansion:** grow the Quays into a larger, connected hand-built region with random boss and
   encounter rotation.
3. **Drowned Isles generator** for the grind loop: biomes, POIs, lairs, extraction, tide stages.
4. **Hunt flow:** Hunt Board, threat levels, tracking, carving, debrief.
5. **Night and horror** quarries, more bosses, progression (Hunter Rank, Bestiary, monster gear).
