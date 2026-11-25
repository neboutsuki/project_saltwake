# World redesign: Salvager's Rest, the Outer Quays, large areas and natural edges (draft v1)

## Global rules for every area
- **Large:** a fixed area is about **300×220 tiles** (about 9,600×7,000 px; roughly 2.5–3× today's Quays). The hub is
  smaller but denser. Generated isles are 200–320 tiles.
- **No invisible walls.** Every playable edge is a *visible, believable* barrier, and the camera never shows past
  it.
  | Edge type | Look | Used for |
  |---|---|---|
  | **Sea / deep water** | surf line → shallows → dark deep water; wading slows, deep water pushes you back with a wave | coasts |
  | **Cliffs** | 2.5D cliff faces with a lip and a shadowed drop, ledges, birds below | highland borders |
  | **Dense treeline** | 3–4 overlapping rows of large canopies + undergrowth; trees get darker and denser toward the edge | forests |
  | **Ravine / sinkhole** | jagged drop with fog at the bottom | flats, ashwood |
  | **Collapsed works** | sea wall, rubble heaps, fallen warehouse, chained gates | town and quays |
  | **Salt marsh deep** | reeds thicken, black water, mist | marsh |
  | **Fog bank** | for the generated isles' outer ring only: thickening sea-fog (with a gameplay reason: the tide) | isles |
- The **camera stops before the edge art ends** (an edge band of at least 12 tiles of scenery outside the walkable
  area), so the frame is always filled.
- **Exits are diegetic:** roads, gates, a ladder down a cliff, a skiff at a jetty, a cave mouth.

## New Salvager's Rest (hub) — about 180×140 tiles
A walled harbor town wedged in a cove between two cliff arms, ash-grey and red-salt stained, lantern-lit.
```
                 N  ── cliff ridge (edge) ── watch beacon
   ┌──────────────────────────────────────────────────────────┐
   │ Old Town (uphill)        ║  Hunters' Quarter              │
   │  ledger house · chapel   ║  HUNT BOARD · bestiary hall    │  ← cliff (edge)
   │  your lodging (stash,bed)║  smithy & forge yard           │
   │──── Lantern Square (fountain, notice board, market) ─────│
   │ Market Row: trader, tinker, apothecary, ration stall      │
   │ Salt Works (evaporation pans, salt sheds)   Shipwright yard│
   │─────────── Harbor front: piers, cranes, fish market ──────│
   │  Pilot jetty (skiff → Drowned Isles)   Fleet quay (story) │
   └────────────── sea wall / breakwater (edge) ───────────────┘
      W gate → road to the Outer Quays          E: storm cliffs (locked early)
```
- **Districts:** Old Town, Hunters' Quarter (new, the heart of the hunt loop), Lantern Square, Market Row, Salt
  Works, Shipwright yard, Harbor front.
- **Edges:** north cliff ridge, east sea cliffs, south breakwater and the open sea, west town wall with the gate.
- **New buildings and functions:** Hunt Board hall, Bestiary hall, forge yard (crafting with monster parts),
  lodging, chapel (lore), harbor master.
- Night: lanterns, lit windows, fog off the sea. Weather affects the square (puddles, crowd thins).

## New Outer Quays — about 300×220 tiles (Act 1)
The ruined commercial waterfront south-west of the Rest, half-reclaimed by tide and ash.
```
   N  ── ashwood treeline (edge, dense) ─────────────────────────
   │ Customs Hill (customs house, warehouses, rail yard)      │
   │      ┊ cart road ┊                ┊ Salt sheds           │  ← ravine (edge)
   │ Warehouse Row ── Crane Yard ── Collapsed Market          │
   │      │                    │                              │
   │ Net-loft lanes      Old Fish Market      Brineworn nests │
   │──── Broken quays & wrecked ships (low tide = sandbars) ──│
   │  Pilot shed     Lighthouse stump     BOATHOUSE SLIP ★    │  ★ boss arena (Tidemaw)
   └──────── open sea (edge: surf → deep water) ───────────────┘
   W: road gate to Salvager's Rest (entry)        E: sea-wall rubble (edge)
```
- **Flow:** entry gate → Warehouse Row (scavenging, Wreckers) → Crane Yard (vertical cover) → Old Fish Market (fights)
  → low-tide sandbar shortcut or Net-loft lanes → **Boathouse Slip arena** (Tidemaw) → skiff extraction.
- **Story landmarks kept:** boathouse (now the arena antechamber), customs house, mooring post, salt house.
- **Edges:** Ashwood treeline to the north, ravine and salt sheds to the north-east, sea-wall rubble to the east,
  open sea to the south, road gate to the west.
- **Tide** changes the map: low tide opens sandbars and wreck interiors; high tide floods them.

## What changes technically
- The hub is currently its own renderer (an embedded harbor frame with its own layout data). The new Rest should
  become a **normal map in the same format as the field maps**, so one renderer, one collision system and one edge
  system serve every area. This also matches the future Godot port (tilemaps + scenes).
- Maps move to **tile-based layers** (ground tileset, detail, props, buildings, collision, edge, lighting) instead of
  one pre-painted image per 16×16 chunk, so large maps are affordable and editable.
- An **edge system:** each map declares its walkable polygon. Everything outside it is edge scenery plus a camera
  clamp.
