/* SALTWAKE expedition destinations (v0.31): a random isle every visit, and a fixed final arena.
 * - THE DROWNED ISLE: a new layout is generated for every expedition (seeded): meadows, salt and mud flats, groves,
 *   rock fields, 5-6 points of interest (wreck, camp, nest, shrine, ruin) linked by tracks, loot caches, monster packs,
 *   a landing skiff and a cliff rope to extract. Same tile art, same renderer, same collision rules as the fixed maps.
 *   Its ground is painted fresh each visit (never cached to disk) behind the loading screen.
 * - THE MAW: one large fixed map (always the same layout): a beach landing, a forest approach and a walled arena of
 *   pillars where the FINAL BOSS waits, the Elder Tidemaw (boss.js variant: more health, harder hits, earlier tide
 *   phase and enrage, calls Brineworn broods). Unlocked once the Tidemaw of the Outer Quays has been slain.
 * - Destination picker in Expedition Planning (harbor exit): Outer Quays (story, commissions) · Drowned Isle · The Maw.
 * Art: existing image files only (trees, rocks, plants, props, arena pieces); sizes come from the images (px/32*1.4).
 * window.saltwakeIsle exposes the generators and state for QA.
 */
(() => {
  const P = Game.prototype, T = 32, TAU = Math.PI * 2;
  const SIZE = {"art/trees/ash_pine_01": [4.2, 7.0], "art/trees/ash_pine_02": [4.2, 7.0], "art/trees/ash_pine_03": [4.2, 7.0], "art/trees/ash_pine_04": [4.2, 7.0], "art/trees/blight_tree_01": [5.6, 7.0], "art/trees/blight_tree_02": [5.6, 7.0], "art/trees/broadleaf_01": [5.6, 6.3], "art/trees/broadleaf_02": [5.6, 6.3], "art/trees/coastal_pine_01": [5.6, 7.0], "art/trees/coastal_pine_02": [5.6, 7.0], "art/trees/dead_tree_01": [4.2, 5.6], "art/trees/dead_tree_02": [4.2, 5.6], "art/trees/dead_tree_03": [4.2, 5.6], "art/trees/fallen_log_01": [4.2, 2.1], "art/trees/fallen_log_02": [4.2, 2.1], "art/trees/giant_grove_tree_01": [11.2, 14.0], "art/trees/giant_grove_tree_02": [11.2, 14.0], "art/trees/stump_01": [2.1, 1.75], "art/trees/stump_02": [2.1, 1.75], "art/rocks/cliff_rock_01": [5.6, 4.2], "art/rocks/cliff_rock_02": [5.6, 4.2], "art/rocks/rock_large_01": [4.2, 3.15], "art/rocks/rock_large_02": [4.2, 3.15], "art/rocks/rock_small_01": [1.4, 1.05], "art/rocks/rock_small_02": [1.4, 1.05], "art/rocks/rock_small_03": [1.4, 1.05], "art/rocks/salt_crystal_cluster_01": [2.1, 2.1], "art/rocks/salt_crystal_cluster_02": [2.1, 2.1], "art/plants/fern_01": [1.75, 1.4], "art/plants/fern_02": [1.75, 1.4], "art/plants/fern_03": [1.75, 1.4], "art/plants/flowers_01": [1.05, 1.05], "art/plants/flowers_02": [1.05, 1.05], "art/plants/flowers_03": [1.05, 1.05], "art/plants/grass_tuft_01": [1.4, 1.4], "art/plants/grass_tuft_02": [1.4, 1.4], "art/plants/grass_tuft_03": [1.4, 1.4], "art/plants/grass_tuft_04": [1.4, 1.4], "art/plants/grass_tuft_05": [1.4, 1.4], "art/plants/grass_tuft_06": [1.4, 1.4], "art/plants/kelp_pile_01": [2.1, 1.05], "art/plants/kelp_pile_02": [2.1, 1.05], "art/plants/mushrooms_01": [1.05, 1.05], "art/plants/mushrooms_02": [1.05, 1.05], "art/plants/reeds_01": [1.4, 2.1], "art/plants/reeds_02": [1.4, 2.1], "art/plants/reeds_03": [1.4, 2.1], "art/plants/reeds_04": [1.4, 2.1], "art/plants/shrub_01": [2.1, 1.75], "art/plants/shrub_02": [2.1, 1.75], "art/plants/shrub_03": [2.1, 1.75], "art/plants/shrub_04": [2.1, 1.75], "art/arena/arena_gate_closed": [8.4, 7.0], "art/arena/arena_pillar_01": [4.2, 8.4], "art/arena/arena_pillar_02": [4.2, 8.4], "art/arena/flood_water_overlay": [22.4, 22.4], "art/arena/harpoon_stuck": [2.8, 4.2], "art/arena/lure_lantern": [2.1, 4.2], "art/arena/oil_pool": [4.2, 2.1], "art/arena/pillar_broken": [4.2, 5.6], "art/arena/salt_boulder": [2.1, 1.75], "art/edges/treeline_mass_01": [14.0, 11.2], "art/edges/treeline_mass_02": [14.0, 11.2], "art/edges/treeline_mass_03": [14.0, 11.2], "art/edges/rubble_heap_01": [8.4, 5.6], "art/edges/rubble_heap_02": [8.4, 5.6], "art/props/anchor": [2.1, 2.1], "art/props/barrel_01": [1.4, 1.75], "art/props/barrel_02": [1.4, 1.75], "art/props/bench": [2.8, 1.75], "art/props/body_satchel": [1.75, 1.05], "art/props/bollard": [2.1, 2.1], "art/props/bone_pile_01": [2.1, 1.4], "art/props/bone_pile_02": [2.1, 1.4], "art/props/brazier": [1.4, 2.45], "art/props/broken_fence": [4.2, 2.45], "art/props/cache_bundle": [1.75, 1.4], "art/props/campfire": [2.1, 1.75], "art/props/carcass_01": [3.5, 2.1], "art/props/carcass_02": [3.5, 2.1], "art/props/cargo_platform": [8.4, 7.7], "art/props/carpenter_workbench": [4.9, 3.85], "art/props/cart_wreck": [4.2, 2.8], "art/props/chain_post": [1.4, 2.8], "art/props/chest_common": [1.75, 1.75], "art/props/chest_rare": [1.75, 1.75], "art/props/crate_01": [1.75, 1.75], "art/props/crate_02": [1.75, 1.75], "art/props/crate_03": [1.75, 1.75], "art/props/crate_stack": [2.8, 2.8], "art/props/dinghy_wrecked": [5.6, 4.2], "art/props/dock_broken_01": [8.4, 6.3], "art/props/dock_straight_01": [8.4, 6.3], "art/props/fence_iron": [2.8, 2.1], "art/props/fence_wood": [2.8, 2.1], "art/props/fish_basket": [1.4, 1.4], "art/props/fish_cleaning_station": [4.9, 4.2], "art/props/fish_drying_rack": [4.2, 3.5], "art/props/fountain": [5.6, 5.6], "art/props/hand_cart": [3.5, 2.45], "art/props/hand_water_pump": [2.8, 4.2], "art/props/hanging_lantern": [1.05, 1.75], "art/props/hanging_net_frame": [4.2, 3.5], "art/props/lantern_post": [2.8, 4.2], "art/props/lantern_post_variant": [1.4, 4.2], "art/props/mooring_post_rope": [2.1, 2.45], "art/props/nest_01": [4.2, 2.8], "art/props/nest_02": [4.2, 2.8], "art/props/net_rack": [2.8, 2.8], "art/props/notice_board": [2.8, 3.5], "art/props/open_supply_crate": [2.8, 2.8], "art/props/rope_coil": [1.4, 1.05], "art/props/rowboat": [4.2, 2.45], "art/props/rowboat_damaged": [5.6, 4.2], "art/props/salt_processing_trough": [4.9, 3.5], "art/props/salt_sack_pile": [2.1, 1.75], "art/props/salvage_debris": [5.6, 4.2], "art/props/signpost": [1.75, 2.8], "art/props/statue_hunter": [4.2, 7.0], "art/props/stone_relic": [4.2, 4.2], "art/props/storage_shelf": [4.2, 4.9], "art/props/supply_sacks": [2.1, 2.45], "art/props/tent_supplies": [2.8, 2.45], "art/props/tool_rack": [3.5, 3.85], "art/props/wall_lantern": [1.05, 1.4], "art/props/well": [2.8, 3.5], "art/props/wheelbarrow": [4.2, 3.15]};
  const IS = window.saltwakeIsle = { stats: { generated: 0, visits: 0, extractions: 0 }, DEST: ['quays', 'isle', 'maw'] };
  const rng = seed => { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
  const pick = (R, a) => a[Math.floor(R() * a.length)];
  const segDist = (px, py, ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy; let t = L ? ((px - ax) * dx + (py - ay) * dy) / L : 0; t = Math.max(0, Math.min(1, t)); return Math.hypot(px - ax - dx * t, py - ay - dy * t); };
  function noise2(seed) { const R = rng(seed), o = Array.from({ length: 6 }, () => R() * 100); return (x, y) => (Math.sin(x * .11 + o[0]) * Math.sin(y * .13 + o[1]) + Math.sin(x * .047 + o[2] + y * .031) * .8 + Math.sin(y * .059 + o[3] - x * .023) * .6 + 2.4) / 4.8; }

  // ---- map builder ------------------------------------------------------------------------------------------------
  function builder(id, name, W, H, seed, waterStart) {
    const R = rng(seed), n = noise2(seed * 7 + 3), M = { id, name, w: W, h: H, seed, shore: waterStart, waterStart, desc: '', roads: [], spaces: [], features: [], buildings: [], portals: [], docks: [], zones: [],
      decor: [], terrainTiles: [], ground: [{ fill: 'soil' }], blocked: [], openings: [], scene: { darkness: .36, ambience: null, lights: [], decor: [] }, arrivals: {}, tilemap: true, spawns: [], population: [] };
    const keep = [], segs = [];
    const B = { M, R, n, keep, segs, gid: 0,
      clear(x, y, pad) { for (const k of keep) if (Math.hypot(x - k[0], y - k[1]) < k[2] + pad) return false; for (const s of segs) if (segDist(x, y, s[0], s[1], s[2], s[3]) < s[4] + pad) return false; return true; },
      put(asset, x, y, sc = 1, mirror) { const s = SIZE[asset]; if (!s) return; M.scene.decor.push({ asset, x: +x.toFixed(2), y: +y.toFixed(2), w: +(s[0] * sc).toFixed(2), h: +(s[1] * sc).toFixed(2), anchor: 'bottom', ...(mirror ? { mirror: true } : {}) }); },
      ghost(x, y, type = 'tree') { M.decor.push({ id: id + '.ghost.' + (B.gid++), name: 'collision', type, x: +x.toFixed(2), y: +y.toFixed(2), w: 0, h: 0, variant: 0, ghost: true }); },
      road(pts, w = 3, m = 'gravel') { M.ground.push({ road: pts, w, m }); for (let i = 1; i < pts.length; i++) segs.push([pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], w / 2 + .6]); },
      path(a, b, w = 3, m = 'gravel') { const pts = [a]; const k = 3 + Math.floor(R() * 2); for (let i = 1; i < k; i++) { const t = i / k; pts.push([a[0] + (b[0] - a[0]) * t + (R() - .5) * 10, a[1] + (b[1] - a[1]) * t + (R() - .5) * 8]); } pts.push(b); B.road(pts, w, m); },
      edges() { M.blocked.push([0, 0, W, 5], [0, 0, 4, waterStart], [W - 4, 0, 4, waterStart]);
        for (let x = 1; x < W + 6; x += 8 + R() * 2) B.put(pick(R, ['art/edges/treeline_mass_01', 'art/edges/treeline_mass_02', 'art/edges/treeline_mass_03']), x, 4.4 + R() * .9, 1, R() < .5); },
      trees(density = .6, kinds = ['ash', 'coastal', 'broad'], fromY = 6, toY = waterStart - 5) {
        const KIND = { ash: ['art/trees/ash_pine_01', 'art/trees/ash_pine_02', 'art/trees/ash_pine_03', 'art/trees/ash_pine_04'], coastal: ['art/trees/coastal_pine_01', 'art/trees/coastal_pine_02'],
          broad: ['art/trees/broadleaf_01', 'art/trees/broadleaf_02'], dead: ['art/trees/dead_tree_01', 'art/trees/dead_tree_02', 'art/trees/dead_tree_03'], blight: ['art/trees/blight_tree_01', 'art/trees/blight_tree_02'] };
        for (let y = fromY; y < toY; y += 2.4) for (let x = 3; x < W - 3; x += 2.4) {
          const jx = x + (R() - .5) * 1.8, jy = y + (R() - .5) * 1.6, v = n(jx, jy), edge = jx < 9 || jx > W - 9 ? .22 : 0;
          if (v + edge < 1 - density || !B.clear(jx, jy, 2.2)) continue;
          const kind = kinds[Math.floor(n(jx * .5 + 40, jy * .5) * kinds.length * .999)], asset = pick(R, KIND[kind] || KIND.ash), sc = .9 + R() * .25;
          B.put(asset, jx, jy, sc, R() < .5); B.ghost(jx, jy - .25); keep.push([jx, jy, .9]);
          if (R() < .05) { B.put(pick(R, ['art/trees/stump_01', 'art/trees/stump_02', 'art/trees/fallen_log_01']), jx + 1.6, jy + 1.2); }
        }
      },
      rocks(count) { for (let i = 0; i < count; i++) { const x = 6 + R() * (W - 12), y = 8 + R() * (waterStart - 14); if (!B.clear(x, y, 1.8)) continue;
          const big = R() < .35, a = big ? pick(R, ['art/rocks/rock_large_01', 'art/rocks/rock_large_02', 'art/rocks/salt_crystal_cluster_01', 'art/rocks/salt_crystal_cluster_02']) : pick(R, ['art/rocks/rock_small_01', 'art/rocks/rock_small_02', 'art/rocks/rock_small_03']);
          B.put(a, x, y, .9 + R() * .2, R() < .5); if (big) { B.ghost(x, y - .3, 'stone'); keep.push([x, y, 1.4]); } } },
      plants(count) { const PL = ['art/plants/grass_tuft_01', 'art/plants/grass_tuft_02', 'art/plants/grass_tuft_03', 'art/plants/grass_tuft_05', 'art/plants/grass_tuft_06', 'art/plants/flowers_01', 'art/plants/flowers_03', 'art/plants/fern_01', 'art/plants/fern_02', 'art/plants/mushrooms_01', 'art/plants/mushrooms_02', 'art/plants/shrub_01', 'art/plants/shrub_02', 'art/plants/shrub_04'];
        for (let i = 0; i < count; i++) { const x = 4 + R() * (W - 8), y = 6 + R() * (waterStart - 8); let onRoad = false; for (const s of segs) if (segDist(x, y, s[0], s[1], s[2], s[3]) < s[4] - .4) { onRoad = true; break; } if (onRoad) continue; B.put(pick(R, PL), x, y, .85 + R() * .3, R() < .5); } },
      zone(id2, nm, x, y, w, h) { M.zones.push({ id: id2, name: nm, x, y, w, h }); },
      light(x, y, r = 180, s = .8) { M.scene.lights.push({ x, y, radius: r, strength: s }); },
    };
    return B;
  }

  // ---- THE DROWNED ISLE (random) -------------------------------------------------------------------------------
  const ISLE_NAMES = ['Gullwrack', 'Saltgrave', 'Brinehollow', 'Ashreef', 'Hookmoor', 'Widowkeel', 'Tallowmere', 'Cinderbank', 'Rookshoal', 'Wrackfen'];
  const POI = {
    wreck: { name: 'Beached Wreck', ground: 'sand', props: ['art/props/dinghy_wrecked', 'art/props/salvage_debris', 'art/props/crate_01', 'art/props/crate_02', 'art/props/barrel_01', 'art/props/rope_coil', 'art/props/anchor'], loot: 'dock_scrap', cname: 'Wreck Hold' },
    camp: { name: 'Abandoned Camp', ground: 'gravel', props: ['art/props/tent_supplies', 'art/props/campfire', 'art/props/supply_sacks', 'art/props/crate_stack', 'art/props/cart_wreck', 'art/props/barrel_02'], loot: 'provisions', cname: 'Abandoned Pack', fire: true },
    nest: { name: 'Bone Nest', ground: 'mud', props: ['art/props/nest_01', 'art/props/nest_02', 'art/props/bone_pile_01', 'art/props/bone_pile_02', 'art/props/carcass_01', 'art/props/carcass_02'], loot: 'widow_drops', cname: 'Bone Midden', pack: true },
    shrine: { name: 'Drowned Shrine', ground: 'plaza', props: ['art/props/stone_relic', 'art/props/statue_hunter', 'art/arena/lure_lantern', 'art/arena/salt_boulder'], loot: 'deep_cache', cname: 'Shrine Offering', rare: true, fire: true },
    ruin: { name: 'Salt Ruin', ground: 'salt', props: ['art/arena/pillar_broken', 'art/edges/rubble_heap_01', 'art/edges/rubble_heap_02', 'art/arena/salt_boulder', 'art/rocks/salt_crystal_cluster_01'], loot: 'cave_salvage', cname: 'Collapsed Store' },
  };
  function genIsle(seed) {
    const W = 150, H = 112, WS = 96, B = builder('isle', 'The Drowned Isle', W, H, seed, WS), { M, R } = B;
    const isle = pick(R, ISLE_NAMES); M.name = `${isle} Isle`; M.desc = 'An unmapped isle off the Red Salt Coast. Its shape is different every time the fog lifts.';
    M.ground.push({ area: [0, 0, W, WS], m: 'grass', alt: 'tall', p: .38, base: .6 }, { area: [0, WS - 9, W, 9], m: 'mud', alt: 'sand', p: .45, base: .5 });
    for (let i = 0; i < 12; i++) M.ground.push({ blob: [8 + R() * (W - 16), 10 + R() * (WS - 22), 5 + R() * 9], m: pick(R, ['mud', 'salt', 'gravel', 'ash', 'tall', 'soil']), alt: pick(R, ['grass', 'soil', 'gravel']), p: .3 });
    // landing + extractions
    const land = [16 + R() * (W - 32), WS - 4], rope = [12 + R() * (W - 24), 7.5];
    M.arrivals = { default: [land[0], land[1] - 1.5], legacy: [], from: { hub: [land[0], land[1] - 1.5] } };
    M.portals.push({ id: 'isle.skiff', name: 'Landing Skiff / Extraction', x: land[0] + 2, y: land[1] + 1.5, target: 'sea departure' }, { id: 'isle.rope', name: 'Cliff Rope / Extraction', x: rope[0], y: rope[1], target: 'cliff' });
    B.keep.push([land[0], land[1], 6], [rope[0], rope[1], 4]);
    B.put('art/props/rowboat', land[0] + 2, land[1] + 2.6, .9); B.put('art/props/mooring_post_rope', land[0] - 1, land[1] + 1); B.put('art/props/chain_post', rope[0] + 1.4, rope[1] + .4); B.put('art/props/signpost', rope[0] - 1.6, rope[1] + 1.2);
    // points of interest, spread out
    const kinds = ['wreck', 'camp', 'nest', 'shrine', 'ruin', pick(R, ['camp', 'nest', 'ruin', 'wreck'])], pois = [];
    for (const kind of kinds) { for (let tries = 0; tries < 60; tries++) { const x = 14 + R() * (W - 28), y = 14 + R() * (WS - 30);
        if (pois.some(p => Math.hypot(p.x - x, p.y - y) < 26) || Math.hypot(x - land[0], y - land[1]) < 20 || Math.hypot(x - rope[0], y - rope[1]) < 12) continue; pois.push({ kind, x, y }); break; } }
    // tracks: landing -> nearest POI chain -> rope
    let cur = land, left = pois.slice(); while (left.length) { left.sort((a, b) => Math.hypot(a.x - cur[0], a.y - cur[1]) - Math.hypot(b.x - cur[0], b.y - cur[1])); const p = left.shift(); B.path(cur, [p.x, p.y], 3); cur = [p.x, p.y]; }
    B.path(cur, rope, 3);
    const containers = []; let ci = 0;
    for (const p of pois) { const D = POI[p.kind]; B.keep.push([p.x, p.y, 7]); M.ground.push({ blob: [p.x, p.y, 5.5], m: D.ground, alt: 'gravel', p: .3 });
      for (let i = 0; i < 6; i++) { const a = R() * TAU, r = 2.5 + R() * 3.5, x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r * .8, asset = pick(R, D.props); B.put(asset, x, y, .95, R() < .5); if (SIZE[asset] && SIZE[asset][0] > 2.5) B.ghost(x, y - .3, 'crate'); }
      if (D.fire) B.light(p.x, p.y, 190, .85);
      const nCache = D.rare ? 1 : 1 + (R() < .5 ? 1 : 0);
      for (let i = 0; i < nCache; i++) { const a = R() * TAU, x = p.x + Math.cos(a) * 1.6, y = p.y + Math.sin(a) * 1.2;
        containers.push({ id: 'isle_c_' + (ci++), name: D.cname, mapId: 'isle', x: +x.toFixed(2), y: +y.toFixed(2), lootTableId: D.loot, respawn: 'raid', ...(D.rare ? { rare: true } : {}) }); }
      B.zone('isle.' + p.kind + ci, D.name, p.x - 10, p.y - 8, 20, 16); p.name = D.name; }
    // stray caches along the tracks
    for (let i = 0; i < 5; i++) { const s = pick(R, B.segs), t = R(), x = s[0] + (s[2] - s[0]) * t + (R() - .5) * 4, y = s[1] + (s[3] - s[1]) * t + (R() - .5) * 3;
      containers.push({ id: 'isle_c_' + (ci++), name: pick(R, ['Lost Satchel', 'Salvage Crate', 'Washed-up Chest']), mapId: 'isle', x: +x.toFixed(2), y: +y.toFixed(2), lootTableId: pick(R, ['dock_scrap', 'provisions', 'wrecker_cache']), respawn: 'raid' }); B.keep.push([x, y, 1.2]); }
    B.zone('isle.all', M.name, 0, 0, W, H);
    B.edges(); B.trees(.55 + R() * .1, R() < .5 ? ['ash', 'coastal', 'broad', 'dead'] : ['coastal', 'broad', 'blight', 'ash']); B.rocks(70); B.plants(1100);
    // monster spawn points: away from the landing
    for (let i = 0; i < 24; i++) { const x = 10 + R() * (W - 20), y = 10 + R() * (WS - 20); if (Math.hypot(x - land[0], y - land[1]) > 30) M.spawns.push([+x.toFixed(1), +y.toFixed(1)]); }
    M.procedural = true; M.pois = pois; M.containers = containers; M.isleName = isle;
    return M;
  }
  IS.genIsle = genIsle;

  // ---- THE MAW (fixed final arena) -------------------------------------------------------------------------------
  function genMaw() {
    const W = 120, H = 100, WS = 86, B = builder('maw', 'The Maw', W, H, 90717, WS), { M, R } = B;
    M.desc = 'A drowned crater ringed by old pillars, where the tide goes to die. The Elder Tidemaw sleeps here.';
    const cx = 60, cy = 42, rx = 22, ry = 15;
    M.ground.push({ area: [0, 0, W, WS], m: 'grass', alt: 'ash', p: .4, base: .55 }, { blob: [cx, cy, 24], m: 'sand', alt: 'mud', p: .35 }, { blob: [cx, cy, 15], m: 'plaza', alt: 'sand', p: .3 }, { area: [0, WS - 8, W, 8], m: 'mud', alt: 'sand', p: .5, base: .5 });
    const land = [60, WS - 4];
    M.arrivals = { default: [land[0], land[1] - 1.5], legacy: [], from: { hub: [land[0], land[1] - 1.5] } };
    M.portals.push({ id: 'maw.skiff', name: 'Landing Skiff / Extraction', x: land[0] + 3, y: land[1] + 1.5, target: 'sea departure' });
    B.put('art/props/rowboat', land[0] + 3, land[1] + 2.6, .9);
    B.road([land, [59, 74], [61, 66], [60, cy + ry + 1]], 4, 'gravel');
    B.keep.push([cx, cy, 25], [land[0], land[1], 6]);
    // arena wall: a ring of rubble and boulders with the entrance to the south
    for (let a = 0; a < TAU; a += .2) { if (Math.abs(Math.atan2(Math.sin(a - Math.PI / 2), Math.cos(a - Math.PI / 2))) < .32) continue;
      const x = cx + Math.cos(a) * (rx + 2), y = cy + Math.sin(a) * (ry + 2); B.put(R() < .5 ? 'art/edges/rubble_heap_01' : 'art/edges/rubble_heap_02', x, y + 1, .9, R() < .5); B.ghost(x, y, 'stone'); B.ghost(x + .9, y, 'stone'); B.ghost(x - .9, y, 'stone'); }
    B.put('art/arena/arena_gate_closed', cx - 5.5, cy + ry + 3.2, .8); B.put('art/arena/arena_gate_closed', cx + 5.5, cy + ry + 3.2, .8, true);
    // pillars inside (dash the Elder into one to stun it)
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + .2, x = cx + Math.cos(a) * rx * .62, y = cy + Math.sin(a) * ry * .62, broken = i % 3 === 2;
      B.put(broken ? 'art/arena/pillar_broken' : (i % 2 ? 'art/arena/arena_pillar_01' : 'art/arena/arena_pillar_02'), x, y, 1); B.ghost(x - .5, y - .3, 'stone'); B.ghost(x + .5, y - .3, 'stone'); }
    for (let i = 0; i < 6; i++) { const a = R() * TAU, r = .3 + R() * .5; B.put(pick(R, ['art/arena/harpoon_stuck', 'art/arena/salt_boulder', 'art/props/bone_pile_01', 'art/props/bone_pile_02']), cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r); }
    for (const [dx, dy] of [[-14, 14], [14, 14], [-20, -6], [20, -6]]) { B.put('art/arena/lure_lantern', cx + dx, cy + dy); B.light(cx + dx, cy + dy, 200, .85); }
    B.zone('maw.arena', 'The Maw · Drowned Crater', cx - rx, cy - ry, rx * 2, ry * 2); B.zone('maw.shore', 'The Maw · Landing', 40, WS - 14, 40, 14); B.zone('maw.all', 'The Maw', 0, 0, W, H);
    B.edges(); B.trees(.62, ['dead', 'blight', 'ash']); B.rocks(50); B.plants(700);
    for (let i = 0; i < 10; i++) { const x = 15 + R() * (W - 30), y = cy + ry + 6 + R() * (WS - cy - ry - 14); M.spawns.push([+x.toFixed(1), +y.toFixed(1)]); }
    M.arena = { x0: cx - rx + 1.5, y0: cy - ry + 1, x1: cx + rx - 1.5, y1: cy + ry - .5, cx, cy, gate: [cx - 3, cy + ry, 6, 2] };
    M.containers = [{ id: 'maw_c_0', name: 'Hunter’s Cache', mapId: 'maw', x: 52, y: 76, lootTableId: 'deep_cache', respawn: 'raid' }, { id: 'maw_c_1', name: 'Drowned Offering', mapId: 'maw', x: 72, y: 70, lootTableId: 'cave_salvage', respawn: 'raid' }];
    return M;
  }
  IS.genMaw = genMaw;

  // register the fixed map at load (so it is preloaded and cached like the others)
  const G0 = () => window.SALTWAKE_DEV?.game;
  function install(G, M) {
    G.world.maps[M.id] = M; window.saltwakeTiles?.installScene?.(M.id, M);
    const C = G.world.content; C.containers = C.containers.filter(k => k.mapId !== M.id).concat(M.containers || []);
    if (M.arena && window.saltwakeBoss) window.saltwakeBoss.ARENAS[M.id] = M.arena;
  }
  IS.install = install;
  try { const W0 = window.SALTWAKE_WORLD || WORLD; const maw = genMaw(); W0.maps.maw = maw; window.saltwakeTiles?.installScene?.('maw', maw); W0.content.containers = W0.content.containers.filter(k => k.mapId !== 'maw').concat(maw.containers); if (window.saltwakeBoss) window.saltwakeBoss.ARENAS.maw = maw.arena; } catch (e) { }

  // ---- destinations ----------------------------------------------------------------------------------------------
  const unlocked = (G, d) => d !== 'maw' || !!G.save.flags?.tidemawSlain;
  IS.unlocked = unlocked;
  const DEST_INFO = {
    quays: ['The Outer Quays', 'The fixed waterfront. Story quests, commissions and the Tidemaw.'],
    isle: ['The Drowned Isle', 'A new random island every visit. Salvage caches, monster packs, two extractions.'],
    maw: ['The Maw · Final Hunt', 'A fixed arena map. The Elder Tidemaw waits in the drowned crater.'],
  };
  const fc = P.showClimateForecast;
  if (fc) P.showClimateForecast = function (departure) {
    const out = fc.apply(this, arguments); if (!departure) return out;
    const body = document.querySelector('#panel .panelBody'); if (!body) return out;
    const dest = this.save.destination && unlocked(this, this.save.destination) ? this.save.destination : 'quays';
    const html = `<h3>Destination</h3><div class="swDest">${IS.DEST.map(d => { const ok = unlocked(this, d), [nm, ds] = DEST_INFO[d];
      return `<button data-act="sw_dest" data-id="${d}" aria-pressed="${d === dest}" ${ok ? '' : 'disabled'}><b>${nm}</b><small>${ok ? ds : 'Locked · slay the Tidemaw on the Outer Quays first'}</small></button>`; }).join('')}</div>
      ${dest !== 'quays' && this.livingState?.().active ? '<p class="fine">Your commission sites are on the Outer Quays; hunt-type commissions still count anywhere.</p>' : ''}`;
    const act = body.querySelector('[data-act="env_deploy"]')?.closest('.actions'); if (act) act.insertAdjacentHTML('beforebegin', html); else body.insertAdjacentHTML('beforeend', html);
    const btn = body.querySelector('[data-act="env_deploy"]'); if (btn) btn.textContent = btn.textContent.replace('DEPART NOW', 'DEPART TO ' + DEST_INFO[dest][0].toUpperCase().replace(' · FINAL HUNT', ''));
    return out;
  };
  const act = P.doAction;
  P.doAction = function (a, n) { if (a === 'sw_dest') { const d = n.dataset.id; if (IS.DEST.includes(d) && unlocked(this, d)) { this.save.destination = d; this.store(); } return this.showClimateForecast(true); } return act.apply(this, arguments); };

  // ---- raid on a destination ---------------------------------------------------------------------------------------
  const MON = (G, type, x, y, id) => {
    if (/^brineworn_/.test(type)) return window.saltwakeAlpha?.makeAltered?.(G, type, x, y, id) || null;
    const d = (G.world.content.enemies || []).find(t => t.id === type); if (!d) return null;
    return { id, type, name: d.name, x, y, homeX: x, homeY: y, hp: d.health, maxHp: d.health, dead: false, aggro: 0, attackCD: 1.2, walk: Math.random() * 5, phase: Math.floor(Math.random() * 9),
      factionId: 'wildlife', actorType: 'monster', provoked: false, parts: (d.parts || []).map(p => ({ ...p, current: p.hp, broken: false })) };
  };
  function populate(G, M, seed) {
    const R = rng(seed ^ 0x51ed), night = !!G.climateState?.().night, out = [], TX = window.saltwakeTiles;
    const types = M.id === 'maw' ? ['brineworn_drifter', 'brineworn_drifter', 'brineworn_breaker', 'widow', 'gull'] : night ? ['brineworn_drifter', 'widow', 'brineback', 'gull', 'brineworn_breaker'] : ['gull', 'gull', 'widow', 'brineback', 'grazer', 'grazer', 'brineworn_drifter'];
    const n = M.id === 'maw' ? 6 : 12 + Math.floor(R() * 5);
    for (let i = 0; i < n; i++) { const sp = M.spawns[i % M.spawns.length]; let x = sp[0] + (R() - .5) * 6, y = sp[1] + (R() - .5) * 5;
      const nw = TX?.nearestWalkable?.(G, x, y); if (nw) [x, y] = nw; const e = MON(G, pick(R, types), x * T, y * T, `${M.id}_${seed}_${i}`); if (!e) continue; try { G.initSense?.(e); } catch (er) { } out.push(e); }
    for (const p of M.pois || []) if (POI[p.kind]?.pack) for (let i = 0; i < 2; i++) { const e = MON(G, night ? 'brineworn_drifter' : 'widow', (p.x + (R() - .5) * 6) * T, (p.y + (R() - .5) * 5) * T, `${M.id}_${seed}_nest_${i}_${p.x | 0}`); if (e) { try { G.initSense?.(e); } catch (er) { } out.push(e); } }
    return out;
  }
  const begin = P.beginRaid;
  P.beginRaid = function () {
    const had = !!this.raid, out = begin.apply(this, arguments); const r = this.raid;
    if (had || !r) return out;
    const dest = this.save.destination && unlocked(this, this.save.destination) ? this.save.destination : 'quays';
    if (dest === 'quays') return out;
    let M;
    if (dest === 'isle') { const seed = (Date.now() ^ (Math.random() * 1e9)) >>> 0; M = genIsle(seed); IS.stats.generated++; }
    else M = this.world.maps.maw?.tilemap ? this.world.maps.maw : genMaw();
    install(this, M);
    // overview picture for the map screen (random maps have no painted overview)
    try { if (!M.overview) { const c = window.saltwakeTiles?.renderOverview?.(this, M.id, 6); if (c) { const al = `art/maps/${M.id}_${M.seed}`; window.SALTWAKE_ASSETS.images[al] = c.toDataURL('image/png'); M.overview = al; } } } catch (e) { }
    r.destination = dest; r.tidemaw = null; r.contract = {};
    r.enemies = populate(this, M, r.seed || 1);
    IS.stats.visits++;
    const [ax, ay] = M.arrivals.default; this.setArea(M.id, ax, ay);
    this.notify(dest === 'isle' ? `${M.name.toUpperCase()} · A new isle rises from the fog. Salvage and reach an extraction.` : 'THE MAW · The Elder Tidemaw waits in the drowned crater.', 5);
    return out;
  };
  // extraction on the new maps
  const portal = P.portal;
  P.portal = function (o) {
    if (this.raid && (this.mapId === 'isle' || this.mapId === 'maw') && o && String(o.id).startsWith(this.mapId + '.')) { IS.stats.extractions++; this.endRaid(true, 'Reached ' + o.name); return; }
    return portal.apply(this, arguments);
  };

  const css = document.createElement('style');
  css.textContent = `.swDest{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:8px;margin-bottom:12px}.swDest button{display:flex!important;flex-direction:column;align-items:flex-start;gap:3px;text-align:left;padding:10px 12px!important}
  .swDest button[aria-pressed="true"]{outline:2px solid rgba(143,212,232,.65);background:rgba(143,212,232,.14)!important}.swDest small{opacity:.75;font-size:12px;line-height:1.35}`;
  document.head.appendChild(css);
})();
