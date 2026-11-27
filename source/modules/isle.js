/* SALTWAKE expedition destinations (v0.31): a random isle every visit, and a fixed final arena.
 * - THE DROWNED ISLE: a new layout is generated for every expedition (seeded): meadows, salt and mud flats, groves,
 *   rock fields, 5-6 points of interest (wreck, camp, nest, shrine, ruin) linked by tracks, loot caches, monster packs,
 *   a landing skiff and a cliff rope to extract. Same tile art, same renderer, same collision rules as the fixed maps.
 *   Its ground is painted fresh each visit (never cached to disk) behind the loading screen.
 * - THE MAW: one large fixed map (always the same layout): a beach landing, a forest approach and a walled arena of
 *   pillars where the FINAL BOSS waits, the Elder Tidemaw (boss.js variant: more health, harder hits, earlier tide
 *   phase and enrage, calls Brineworn broods). Unlocked once the Tidemaw of the Outer Quays has been slain.
 * - Expedition Chart at the Departure Pier: Outer Quays · Drowned Isle · Brinefront operation · the Maw (story quest only).
 * Art: existing image files only (trees, rocks, plants, props, arena pieces); sizes come from the images (px/32*1.4).
 * window.saltwakeIsle exposes the generators and state for QA.
 */
(() => {
  const P = Game.prototype, T = 32, TAU = Math.PI * 2;
  const SIZE = {"art/buildings/flats_evaporation_pan": [11.2, 5.6], "art/buildings/flats_pump_house": [9.8, 9.8], "art/buildings/salt_shed_01": [9.8, 7.0], "art/buildings/salt_shed_02": [9.8, 7.0], "art/buildings/wrecker_camp_tent_01": [7.0, 5.6], "art/buildings/wrecker_camp_tent_02": [7.0, 5.6], "art/buildings/rail_cart_track": [11.2, 2.8], "art/buildings/ashwood_cabin": [8.4, 8.4], "art/buildings/shrine_01": [4.2, 5.6], "art/buildings/shrine_02": [4.2, 5.6], "art/buildings/ancient_ruin_arch_01": [9.8, 9.8], "art/buildings/ancient_ruin_arch_02": [9.8, 9.8], "art/buildings/village_chapel_flooded": [12.6, 14.0], "art/buildings/village_house_sunken_01": [9.8, 9.8], "art/buildings/village_house_sunken_02": [9.8, 9.8], "art/buildings/village_house_sunken_03": [9.8, 9.8], "art/buildings/net_loft": [8.4, 9.8], "art/buildings/bone_well": [7.0, 7.0], "art/buildings/cliff_lighthouse": [8.4, 16.8], "art/buildings/cottage_01": [8.4, 9.8], "art/buildings/cottage_02": [8.4, 9.8], "art/buildings/wreck_small": [8.4, 5.6], "art/buildings/wreck_ship_01": [16.8, 9.8], "art/buildings/lighthouse_ruined": [7.0, 11.2], "art/edges/cliff_straight": [16.8, 5.6], "art/edges/cliff_corner_outer": [5.6, 5.6], "art/edges/ravine_edge": [16.8, 5.6],"art/trees/ash_pine_01": [4.2, 7.0], "art/trees/ash_pine_02": [4.2, 7.0], "art/trees/ash_pine_03": [4.2, 7.0], "art/trees/ash_pine_04": [4.2, 7.0], "art/trees/blight_tree_01": [5.6, 7.0], "art/trees/blight_tree_02": [5.6, 7.0], "art/trees/broadleaf_01": [5.6, 6.3], "art/trees/broadleaf_02": [5.6, 6.3], "art/trees/coastal_pine_01": [5.6, 7.0], "art/trees/coastal_pine_02": [5.6, 7.0], "art/trees/dead_tree_01": [4.2, 5.6], "art/trees/dead_tree_02": [4.2, 5.6], "art/trees/dead_tree_03": [4.2, 5.6], "art/trees/fallen_log_01": [4.2, 2.1], "art/trees/fallen_log_02": [4.2, 2.1], "art/trees/giant_grove_tree_01": [11.2, 14.0], "art/trees/giant_grove_tree_02": [11.2, 14.0], "art/trees/stump_01": [2.1, 1.75], "art/trees/stump_02": [2.1, 1.75], "art/rocks/cliff_rock_01": [5.6, 4.2], "art/rocks/cliff_rock_02": [5.6, 4.2], "art/rocks/rock_large_01": [4.2, 3.15], "art/rocks/rock_large_02": [4.2, 3.15], "art/rocks/rock_small_01": [1.4, 1.05], "art/rocks/rock_small_02": [1.4, 1.05], "art/rocks/rock_small_03": [1.4, 1.05], "art/rocks/salt_crystal_cluster_01": [2.1, 2.1], "art/rocks/salt_crystal_cluster_02": [2.1, 2.1], "art/plants/fern_01": [1.75, 1.4], "art/plants/fern_02": [1.75, 1.4], "art/plants/fern_03": [1.75, 1.4], "art/plants/flowers_01": [1.05, 1.05], "art/plants/flowers_02": [1.05, 1.05], "art/plants/flowers_03": [1.05, 1.05], "art/plants/grass_tuft_01": [1.4, 1.4], "art/plants/grass_tuft_02": [1.4, 1.4], "art/plants/grass_tuft_03": [1.4, 1.4], "art/plants/grass_tuft_04": [1.4, 1.4], "art/plants/grass_tuft_05": [1.4, 1.4], "art/plants/grass_tuft_06": [1.4, 1.4], "art/plants/kelp_pile_01": [2.1, 1.05], "art/plants/kelp_pile_02": [2.1, 1.05], "art/plants/mushrooms_01": [1.05, 1.05], "art/plants/mushrooms_02": [1.05, 1.05], "art/plants/reeds_01": [1.4, 2.1], "art/plants/reeds_02": [1.4, 2.1], "art/plants/reeds_03": [1.4, 2.1], "art/plants/reeds_04": [1.4, 2.1], "art/plants/shrub_01": [2.1, 1.75], "art/plants/shrub_02": [2.1, 1.75], "art/plants/shrub_03": [2.1, 1.75], "art/plants/shrub_04": [2.1, 1.75], "art/arena/arena_gate_closed": [8.4, 7.0], "art/arena/arena_pillar_01": [4.2, 8.4], "art/arena/arena_pillar_02": [4.2, 8.4], "art/arena/flood_water_overlay": [22.4, 22.4], "art/arena/harpoon_stuck": [2.8, 4.2], "art/arena/lure_lantern": [2.1, 4.2], "art/arena/oil_pool": [4.2, 2.1], "art/arena/pillar_broken": [4.2, 5.6], "art/arena/salt_boulder": [2.1, 1.75], "art/edges/treeline_mass_01": [14.0, 11.2], "art/edges/treeline_mass_02": [14.0, 11.2], "art/edges/treeline_mass_03": [14.0, 11.2], "art/edges/rubble_heap_01": [8.4, 5.6], "art/edges/rubble_heap_02": [8.4, 5.6], "art/props/anchor": [2.1, 2.1], "art/props/barrel_01": [1.4, 1.75], "art/props/barrel_02": [1.4, 1.75], "art/props/bench": [2.8, 1.75], "art/props/body_satchel": [1.75, 1.05], "art/props/bollard": [2.1, 2.1], "art/props/bone_pile_01": [2.1, 1.4], "art/props/bone_pile_02": [2.1, 1.4], "art/props/brazier": [1.4, 2.45], "art/props/broken_fence": [4.2, 2.45], "art/props/cache_bundle": [1.75, 1.4], "art/props/campfire": [2.1, 1.75], "art/props/carcass_01": [3.5, 2.1], "art/props/carcass_02": [3.5, 2.1], "art/props/cargo_platform": [8.4, 7.7], "art/props/carpenter_workbench": [4.9, 3.85], "art/props/cart_wreck": [4.2, 2.8], "art/props/chain_post": [1.4, 2.8], "art/props/chest_common": [1.75, 1.75], "art/props/chest_rare": [1.75, 1.75], "art/props/crate_01": [1.75, 1.75], "art/props/crate_02": [1.75, 1.75], "art/props/crate_03": [1.75, 1.75], "art/props/crate_stack": [2.8, 2.8], "art/props/dinghy_wrecked": [5.6, 4.2], "art/props/dock_broken_01": [8.4, 6.3], "art/props/dock_straight_01": [8.4, 6.3], "art/props/fence_iron": [2.8, 2.1], "art/props/fence_wood": [2.8, 2.1], "art/props/fish_basket": [1.4, 1.4], "art/props/fish_cleaning_station": [4.9, 4.2], "art/props/fish_drying_rack": [4.2, 3.5], "art/props/fountain": [5.6, 5.6], "art/props/hand_cart": [3.5, 2.45], "art/props/hand_water_pump": [2.8, 4.2], "art/props/hanging_lantern": [1.05, 1.75], "art/props/hanging_net_frame": [4.2, 3.5], "art/props/lantern_post": [2.8, 4.2], "art/props/lantern_post_variant": [1.4, 4.2], "art/props/mooring_post_rope": [2.1, 2.45], "art/props/nest_01": [4.2, 2.8], "art/props/nest_02": [4.2, 2.8], "art/props/net_rack": [2.8, 2.8], "art/props/notice_board": [2.8, 3.5], "art/props/open_supply_crate": [2.8, 2.8], "art/props/rope_coil": [1.4, 1.05], "art/props/rowboat": [4.2, 2.45], "art/props/rowboat_damaged": [5.6, 4.2], "art/props/salt_processing_trough": [4.9, 3.5], "art/props/salt_sack_pile": [2.1, 1.75], "art/props/salvage_debris": [5.6, 4.2], "art/props/signpost": [1.75, 2.8], "art/props/statue_hunter": [4.2, 7.0], "art/props/stone_relic": [4.2, 4.2], "art/props/storage_shelf": [4.2, 4.9], "art/props/supply_sacks": [2.1, 2.45], "art/props/tent_supplies": [2.8, 2.45], "art/props/tool_rack": [3.5, 3.85], "art/props/wall_lantern": [1.05, 1.4], "art/props/well": [2.8, 3.5], "art/props/wheelbarrow": [4.2, 3.15]};
  const IS = window.saltwakeIsle = { stats: { generated: 0, visits: 0, extractions: 0 }, DEST: ['quays', 'flats', 'ashwood', 'village', 'cliffs', 'isle', 'front', 'maw'] };
  // ---- monsters, apexes, operations, missions --------------------------------------------------------------------
  // Apexes are oversized, named, tinted versions of species that already have art (lore from docs/BESTIARY_LORE.md).
  const LORE = {
    brineback: 'Big shell-backed grazers. The salt grows their shell bigger every year. Old ones can flatten a cart.',
    gull: 'Redhook gulls learned that salvagers mean food. They follow lanterns and open crates, and they dive in flocks.',
    widow: 'Spiders that spin salt-thread webs between dead pines. The thread hardens like glass in the cold.',
    grazer: 'Herd animals that lick the salt crust. Their panic warns the whole flat that a hunter is near.',
    brineworn_drifter: 'Fishers and villagers who stayed in the brine too long. They drift toward light and warmth.',
    brineworn_caller: 'Brineworn who still remember their voices. Their song calls the others.',
    brineworn_breaker: 'Dock workers and smiths whose bodies grew huge in the brine. They break doors and walls.',
  };
  const APEX = IS.APEX = {
    harrier: { name: 'Gale Harrier', type: 'gull', hp: 1000, scale: 2.4, dmg: 2.2, cd: .6, hr: 1, icon: 'gull_idle', tint: 'brightness(.72) saturate(.55) contrast(1.25)',
      lore: 'A storm bird as big as a boat that nests in the old lamp towers. Sailors believe it brings the squalls.', minion: { type: 'gull', scale: 1, hp: 1, dmg: 1, name: 'Redhook Gull' },
      reward: { scrip: 320, items: [['redhook_feather', 4], ['redhook_beak', 2]] } },
    matriarch: { name: 'Brineback Matriarch', type: 'brineback', hp: 1500, scale: 1.75, dmg: 1.5, cd: .8, hr: 2, icon: 'brineback_0_0', tint: 'sepia(.3) saturate(1.4) hue-rotate(-14deg) brightness(1.06)',
      lore: 'The oldest Brineback, her shell covered in a crown of salt. Her calves ride on her back and answer her cry.', minion: { type: 'brineback', scale: .62, hp: .3, dmg: .5, name: 'Brineback Calf' },
      reward: { scrip: 420, items: [['brineback_plate', 3], ['brineback_tusk', 2]] } },
    widowqueen: { name: 'Salt Widow Queen', type: 'widow', hp: 1300, scale: 1.85, dmg: 1.5, cd: .8, hr: 3, icon: 'widow_0_0', tint: 'saturate(1.6) hue-rotate(-22deg) contrast(1.12)',
      lore: 'Mother of every widow in the Ashwood. Her egg sac is never empty; her brood bursts out when she is wounded.', minion: { type: 'widow', scale: .55, hp: .3, dmg: .45, name: 'Widowling' },
      reward: { scrip: 480, items: [['salt_widow_shell', 3], ['widow_claw', 2]] } },
    choir: { name: 'The Caller Choir', type: 'brineworn_caller', hp: 1200, scale: 1.8, dmg: 1.4, cd: .85, hr: 3, icon: 'caller', tint: 'hue-rotate(60deg) saturate(1.3) brightness(.9)',
      lore: 'Callers who sang together so long they fused into one body. Their song never stops; Drifters climb out of the water to answer.', minion: { type: 'brineworn_drifter', scale: 1, hp: 1, dmg: 1, name: 'Drifter' },
      reward: { scrip: 460, items: [['salt_crystals', 6], ['masterwork_core', 1]] } },
    bellhulk: { name: 'Bell Hulk', type: 'brineworn_breaker', hp: 1800, scale: 1.55, dmg: 1.6, cd: .85, hr: 4, icon: 'breaker', tint: 'sepia(.45) hue-rotate(60deg) saturate(1.2) brightness(.92)',
      lore: 'A Breaker who hid in the bell tower when the tide came. The bell grew into his body; its toll still stuns.', minion: { type: 'brineworn_drifter', scale: 1, hp: 1, dmg: 1, name: 'Drifter' },
      reward: { scrip: 540, items: [['scrap_metal', 8], ['masterwork_core', 1]] } },
    elkking: { name: 'Hollow Elk-King', type: 'grazer', hp: 1600, scale: 2.0, dmg: 1.9, cd: .75, hr: 4, icon: 'grazer_right', aggressive: true, tint: 'brightness(.5) contrast(1.35) saturate(.45)',
      lore: 'King of the hollow stags. His antlers never stopped burning after the great fire. His herd follows him into the dark.', minion: { type: 'grazer', scale: .9, hp: .6, dmg: .7, name: 'Hollow Stag', aggressive: true },
      reward: { scrip: 520, items: [['shed_horn', 3], ['masterwork_core', 1]] } },
    herdbull: { name: 'Herd Bull', type: 'brineback', hp: 1000, scale: 1.45, dmg: 1.35, cd: .85, hr: 3, icon: 'brineback_0_0', tint: 'saturate(1.25) contrast(1.1)', hidden: true,
      lore: 'The bull that leads a stampede. Bring it down and the herd scatters.', minion: { type: 'brineback', scale: .62, hp: .3, dmg: .5, name: 'Brineback Calf' }, reward: { scrip: 0, items: [['brineback_tusk', 1]] } },
  };
  const OPS = IS.OPS = [
    { id: 'brood', name: 'Brood Purge', family: 'Brineworn', icon: 'drifter', monsters: ['brineworn_drifter', 'brineworn_drifter', 'brineworn_caller', 'brineworn_breaker'], nests: 3, nestName: 'Brood Nest', mast: 25, hr: 1, reward: 250, threat: 3,
      lore: 'The Brineworn breed where the tide pools never drain. Burn their nests before the next spring tide, then signal the guild.' },
    { id: 'rookery', name: 'Rookery Raid', family: 'Redhook Gulls', icon: 'gull_flight', monsters: ['gull', 'gull', 'gull', 'widow'], nests: 3, nestName: 'Rookery', mast: 20, hr: 1, reward: 220, threat: 2,
      lore: 'A Redhook rookery has grown so big the flocks strip whole salvage camps. Burn the rookeries; expect the sky to fight back.' },
    { id: 'clutch', name: 'Widow Clutch Burn', family: 'Salt Widows', icon: 'widow_0_0', monsters: ['widow', 'widow', 'widow'], minion: 'widowling', nests: 4, nestName: 'Egg Clutch', mast: 0, hr: 2, reward: 300, threat: 3,
      lore: 'Widow egg clutches hidden among the dead pines. When they hatch, nothing on the isle survives. Burn all four.' },
    { id: 'stampede', name: 'Stampede Break', family: 'Brinebacks', icon: 'brineback_0_0', monsters: ['brineback', 'brineback', 'grazer'], nests: 0, mast: 40, hunt: 'herdbull', hr: 3, reward: 380, threat: 4,
      lore: 'A Brineback stampede is heading for the salt road. Hold the signal mast while the guild diverts the carts, and bring down the Herd Bull.' },
  ];
  const MISSIONS = IS.MISSIONS = {
    quays: [{ id: 'quays_free', kind: 'free', name: 'Free Expedition', threat: 2, hr: 1, desc: 'Salvage, follow your story and commission steps. Tide-gated extractions.' }],
    isle: [{ id: 'isle_free', kind: 'free', name: 'Free Expedition', threat: 2, hr: 1, desc: 'A new random isle. Something big roams it: an unknown apex. Salvage, hunt it if you dare, extract.' }]
      .concat(Object.entries(APEX).filter(([, a]) => !a.hidden).map(([id, a]) => ({ id: 'hunt_' + id, kind: 'hunt', apex: id, name: 'Hunt: ' + a.name, threat: Math.min(5, a.hr + 1), hr: a.hr,
        desc: `A random isle where only ${a.name.replace(/^The /, '')}'s kind lives. Track it down, slay it, extract.` }))),
    front: OPS.map(o => ({ id: 'op_' + o.id, kind: 'op', op: o.id, name: o.name, threat: o.threat, hr: o.hr, desc: o.lore })),
    ...Object.fromEntries(Object.entries({ flats: 'matriarch', ashwood: 'widowqueen', village: 'choir', cliffs: 'harrier' }).map(([k, ap]) => [k, [
      { id: k + '_free', kind: 'free', name: 'Free Expedition', threat: 2, hr: 1, desc: 'Explore the region, salvage its caches and stores. Its apex lives in its lair: slay it for trophies if you dare.' },
      { id: k + '_hunt', kind: 'hunt', apex: ap, name: 'Hunt: ' + APEX[ap].name, threat: Math.min(5, APEX[ap].hr + 1), hr: APEX[ap].hr, desc: 'Go straight for the apex in its lair. Slay it and extract to complete the hunt.' }]])),
    maw: [{ id: 'maw_story', kind: 'story', name: 'Into the Maw', threat: 5, hr: 1, desc: 'Story quest. The Elder Tidemaw waits in the drowned crater.' }],
  };
  IS.LORE = LORE;
  const rank = G => window.saltwakeHunter?.rank?.(G) || 1;
  IS.mission = (G, dest) => { const list = MISSIONS[dest] || []; const id = G.save.missions?.[dest]; const m = list.find(x => x.id === id && rank(G) >= (x.hr || 1)); return m || list[0]; };
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
      bigs: [],
      put(asset, x, y, sc = 1, mirror) { const s = SIZE[asset]; if (!s) return false;
        // big scenery never overlaps other big scenery
        if (/\/(trees|rocks|props|arena)\//.test(asset) && !/stump|fallen_log|bone_pile|rock_small|mooring|chain_post|signpost/.test(asset)) {
          const w = s[0] * sc; for (const b of B.bigs) if (Math.abs(b[0] - x) < 8 && Math.hypot(b[0] - x, (b[1] - y) * 1.4) < Math.min(b[2], w) * .42) return false; B.bigs.push([x, y, w]); }
        M.scene.decor.push({ asset, x: +x.toFixed(2), y: +y.toFixed(2), w: +(s[0] * sc).toFixed(2), h: +(s[1] * sc).toFixed(2), anchor: 'bottom', ...(mirror ? { mirror: true } : {}) }); },
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
          if (B.put(asset, jx, jy, sc, R() < .5) === false) continue; B.ghost(jx, jy - .25); keep.push([jx, jy, .9]);
          if (R() < .05) { B.put(pick(R, ['art/trees/stump_01', 'art/trees/stump_02', 'art/trees/fallen_log_01']), jx + 1.6, jy + 1.2); }
        }
      },
      rocks(count) { for (let i = 0; i < count; i++) { const x = 6 + R() * (W - 12), y = 8 + R() * (waterStart - 14); if (!B.clear(x, y, 1.8)) continue;
          const big = R() < .35, a = big ? pick(R, ['art/rocks/rock_large_01', 'art/rocks/rock_large_02', 'art/rocks/salt_crystal_cluster_01', 'art/rocks/salt_crystal_cluster_02']) : pick(R, ['art/rocks/rock_small_01', 'art/rocks/rock_small_02', 'art/rocks/rock_small_03']);
          if (B.put(a, x, y, .9 + R() * .2, R() < .5) === false) continue; if (big) { B.ghost(x, y - .3, 'stone'); keep.push([x, y, 1.4]); } } },
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
      for (let i = 0; i < 6; i++) { const a = R() * TAU, r = 2.5 + R() * 3.5, x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r * .8, asset = pick(R, D.props); if (B.put(asset, x, y, .95, R() < .5) !== false && SIZE[asset] && SIZE[asset][0] > 2.5) B.ghost(x, y - .3, 'crate'); }
      if (D.fire) B.light(p.x, p.y, 190, .85);
      const nCache = D.rare ? 1 : 1 + (R() < .5 ? 1 : 0);
      for (let i = 0; i < nCache; i++) { const a = (i / nCache) * TAU + R() * .5, x = p.x + Math.cos(a) * 1.8, y = p.y + Math.sin(a) * 1.4;
        containers.push({ id: 'isle_c_' + (ci++), name: D.cname, mapId: 'isle', x: +x.toFixed(2), y: +y.toFixed(2), lootTableId: D.loot, respawn: 'raid', ...(D.rare ? { rare: true } : {}) }); }
      B.zone('isle.' + p.kind + ci, D.name, p.x - 10, p.y - 8, 20, 16); p.name = D.name; }
    // stray caches along the tracks
    for (let i = 0; i < 5; i++) { const s = pick(R, B.segs), t = R(), x = s[0] + (s[2] - s[0]) * t + (R() - .5) * 4, y = s[1] + (s[3] - s[1]) * t + (R() - .5) * 3;
      if (containers.some(k => Math.hypot(k.x - x, k.y - y) < 2)) continue;
      containers.push({ id: 'isle_c_' + (ci++), name: pick(R, ['Lost Satchel', 'Salvage Crate', 'Washed-up Chest']), mapId: 'isle', x: +x.toFixed(2), y: +y.toFixed(2), lootTableId: pick(R, ['dock_scrap', 'provisions', 'wrecker_cache']), respawn: 'raid' }); B.keep.push([x, y, 1.2]); }
    B.zone('isle.all', M.name, 0, 0, W, H);
    B.edges(); B.trees(.55 + R() * .1, R() < .5 ? ['ash', 'coastal', 'broad', 'dead'] : ['coastal', 'broad', 'blight', 'ash']); B.rocks(70); B.plants(1100);
    // monster spawn points: away from the landing
    for (let i = 0; i < 24; i++) { const x = 10 + R() * (W - 20), y = 10 + R() * (WS - 20); if (Math.hypot(x - land[0], y - land[1]) > 30) M.spawns.push([+x.toFixed(1), +y.toFixed(1)]); }
    M.procedural = true; M.expedition = true; M.pois = pois; M.containers = containers; M.isleName = isle;
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
    M.expedition = true; M.arena = { x0: cx - rx + 1.5, y0: cy - ry + 1, x1: cx + rx - 1.5, y1: cy + ry - .5, cx, cy, gate: [cx - 3, cy + ry, 6, 2] };
    M.containers = [{ id: 'maw_c_0', name: 'Hunter’s Cache', mapId: 'maw', x: 52, y: 76, lootTableId: 'deep_cache', respawn: 'raid' }, { id: 'maw_c_1', name: 'Drowned Offering', mapId: 'maw', x: 72, y: 70, lootTableId: 'cave_salvage', respawn: 'raid' }];
    return M;
  }
  IS.genMaw = genMaw;

  // ---- THE BRINEFRONT (Helldivers-style operation, random every time) --------------------------------------------
  const FRONT_NAMES = ['Operation Ashtide', 'Operation Saltfang', 'Operation Grey Wake', 'Operation Hollow Bell', 'Operation Red Shoal', 'Operation Cinder Reef'];
  function genFront(seed, op = OPS[0]) {
    const W = 160, H = 120, WS = 104, B = builder('front', 'The Brinefront', W, H, seed, WS), { M, R } = B;
    M.desc = 'A Brineworn breeding ground the guild wants burned out. Destroy the nests, raise the signal mast, call extraction and hold.';
    M.ground.push({ area: [0, 0, W, WS], m: 'ash', alt: 'soil', p: .45, base: .55 }, { area: [0, WS - 9, W, 9], m: 'mud', alt: 'sand', p: .45, base: .5 });
    for (let i = 0; i < 14; i++) M.ground.push({ blob: [8 + R() * (W - 16), 10 + R() * (WS - 22), 5 + R() * 10], m: pick(R, ['salt', 'mud', 'gravel', 'ash', 'tall']), alt: pick(R, ['ash', 'soil', 'gravel']), p: .35 });
    const land = [20 + R() * (W - 40), WS - 4];
    M.arrivals = { default: [land[0], land[1] - 1.5], legacy: [], from: { hub: [land[0], land[1] - 1.5] } };
    B.keep.push([land[0], land[1], 7]); B.put('art/props/rowboat', land[0] + 2, land[1] + 2.6, .9);
    // objectives: 3 brood nests + the signal mast, spread across the map; extraction beacon on the far shore
    const spots = []; const far = (x, y, d) => spots.every(p => Math.hypot(p[0] - x, p[1] - y) > d) && Math.hypot(x - land[0], y - land[1]) > 28;
    const place = () => { for (let t = 0; t < 200; t++) { const x = 16 + R() * (W - 32), y = 14 + R() * (WS - 34); if (far(x, y, 30)) { spots.push([x, y]); return [x, y]; } } const x = 20 + R() * (W - 40), y = 20 + R() * (WS - 40); spots.push([x, y]); return [x, y]; };
    const objectives = [];
    for (let i = 0; i < op.nests; i++) { const [x, y] = place(); objectives.push({ id: 'nest' + i, kind: 'nest', label: `Burn ${op.nestName} ${i + 1}`, x, y, done: false });
      B.keep.push([x, y, 6]); M.ground.push({ blob: [x, y, 6], m: 'mud', alt: 'ash', p: .4 });
      for (let k = 0; k < 5; k++) { const a = R() * TAU, r = 2.5 + R() * 3; B.put(pick(R, ['art/props/bone_pile_01', 'art/props/bone_pile_02', 'art/props/carcass_01', 'art/props/carcass_02', 'art/props/nest_01']), x + Math.cos(a) * r, y + Math.sin(a) * r * .8, 1, R() < .5); }
      B.zone('front.nest' + i, op.nestName, x - 9, y - 7, 18, 14); }
    if (op.hunt) { const [x, y] = place(); objectives.push({ id: 'hunt', kind: 'hunt', apex: op.hunt, label: 'Slay the ' + APEX[op.hunt].name, x, y, done: false }); B.keep.push([x, y, 6]); B.zone('front.hunt', APEX[op.hunt].name + '’s ground', x - 9, y - 7, 18, 14); }
    if (op.mast) { const [x, y] = place(); objectives.push({ id: 'mast', kind: 'mast', label: 'Raise the Signal Mast', x, y, done: false, progress: 0, need: op.mast });
      B.keep.push([x, y, 7]); M.ground.push({ blob: [x, y, 6], m: 'plaza', alt: 'gravel', p: .3 });
      B.put('art/props/lantern_post', x, y - .5, 1.3); B.put('art/props/signpost', x - 2.2, y + 1.2); B.put('art/props/crate_stack', x + 2.6, y + 1.4); B.ghost(x, y - .6, 'crate'); B.light(x, y, 200, .9);
      B.zone('front.mast', 'Signal Mast', x - 9, y - 7, 18, 14); }
    let evac; for (let t = 0; t < 200; t++) { const x = 16 + R() * (W - 32); if (Math.abs(x - land[0]) > 50) { evac = [x, WS - 6]; break; } } evac ||= [W - land[0], WS - 6];
    B.keep.push([evac[0], evac[1], 7]); M.ground.push({ blob: [evac[0], evac[1], 6], m: 'gravel', alt: 'sand', p: .3 }); B.zone('front.evac', 'Extraction Beacon', evac[0] - 9, evac[1] - 7, 18, 14);
    // tracks between everything
    const nodes = [land, ...objectives.map(o => [o.x, o.y]), evac]; let cur = nodes[0], left = nodes.slice(1, -1);
    while (left.length) { left.sort((a, b) => Math.hypot(a[0] - cur[0], a[1] - cur[1]) - Math.hypot(b[0] - cur[0], b[1] - cur[1])); const n = left.shift(); B.path(cur, n, 3, 'gravel'); cur = n; } B.path(cur, evac, 3, 'gravel');
    // a few ruined camps with caches
    const containers = []; for (let i = 0; i < 6; i++) { const [x, y] = [12 + R() * (W - 24), 12 + R() * (WS - 24)]; if (!B.clear(x, y, 3)) continue;
      B.put(pick(R, ['art/props/cart_wreck', 'art/props/tent_supplies', 'art/props/salvage_debris']), x, y); B.ghost(x, y - .3, 'crate');
      containers.push({ id: 'front_c_' + i, name: pick(R, ['Guild Supply Drop', 'Scorched Crate', 'Dead Hunter’s Pack']), mapId: 'front', x: +(x + 1.6).toFixed(2), y: +(y + 1).toFixed(2), lootTableId: pick(R, ['provisions', 'dock_scrap', 'wrecker_cache', 'deep_cache']), respawn: 'raid' }); B.keep.push([x, y, 3]); }
    B.zone('front.all', 'The Brinefront', 0, 0, W, H);
    B.edges(); B.trees(.5, ['dead', 'blight', 'ash']); B.rocks(80); B.plants(800);
    for (let i = 0; i < 30; i++) { const x = 10 + R() * (W - 20), y = 10 + R() * (WS - 20); if (Math.hypot(x - land[0], y - land[1]) > 30) M.spawns.push([+x.toFixed(1), +y.toFixed(1)]); }
    M.procedural = true; M.expedition = true; M.containers = containers; M.objectives = objectives; M.evac = { x: evac[0], y: evac[1] }; M.opName = pick(R, FRONT_NAMES) + ' · ' + op.name; M.op = op.id;
    return M;
  }
  IS.genFront = genFront;

  // ---- MAJOR AREAS (fixed maps, always the same layout) ---------------------------------------------------------
  // Each region has its own ground, flora, buildings, residents and an apex living in its lair.
  const P_ = a => 'art/props/' + a, BLD = a => 'art/buildings/' + a;
  const AREAS = IS.AREAS = {
    flats: { name: 'Red Salt Flats', seed: 31337, hr: 1, threat: 2, apex: 'matriarch', lairName: 'Evaporation Pans', pos: [58, 66],
      desc: 'Wide salt pans where the crust cracks like old porcelain. Brineback herds graze here and the Matriarch rules the evaporation pans.',
      ground: [{ area: [0, 0, 150, 94], m: 'salt', alt: 'sand', p: .45, base: .55 }], blobs: ['gravel', 'soil', 'sand', 'salt', 'mud'],
      trees: [.2, ['dead', 'ash']], rocks: 130, plants: 420, residents: ['brineback', 'brineback', 'grazer', 'grazer', 'gull'], night: ['brineback', 'grazer', 'brineworn_drifter', 'gull'],
      pois: [['Salt Works', ['flats_pump_house', 'salt_shed_01'], ['salt_processing_trough', 'salt_sack_pile', 'hand_cart', 'tool_rack', 'wheelbarrow'], 'provisions'],
        ['Herders’ Camp', ['wrecker_camp_tent_01'], ['campfire', 'fence_wood', 'hand_water_pump', 'supply_sacks'], 'provisions', true],
        ['Rail Cut', ['salt_shed_02'], ['cart_wreck', 'crate_stack', 'barrel_01'], 'dock_scrap']],
      lair: (B, x, y) => { B.building('flats_evaporation_pan', x - 8, y + 2); B.building('flats_evaporation_pan', x + 8, y + 2); for (const [dx, dy] of [[-12, -6], [12, -6], [0, -9]]) { B.put('art/arena/pillar_broken', x + dx, y + dy); B.ghost(x + dx, y + dy - .3, 'stone'); } B.put('art/arena/salt_boulder', x - 4, y + 6); B.put('art/rocks/salt_crystal_cluster_02', x + 5, y + 7); } },
    ashwood: { name: 'The Ashwood', seed: 51719, hr: 2, threat: 3, apex: 'widowqueen', lairName: 'Burnt Clearing', pos: [80, 48],
      desc: 'A pine forest that burned and never stopped smouldering. Salt Widows string glass-hard webs between the dead trunks; their Queen nests in the clearing her fire made.',
      ground: [{ area: [0, 0, 150, 94], m: 'ash', alt: 'soil', p: .45, base: .55 }], blobs: ['soil', 'mud', 'ash', 'gravel'],
      trees: [.8, ['dead', 'blight', 'ash']], rocks: 60, plants: 700, residents: ['widow', 'widow', 'grazer', 'gull'], night: ['widow', 'widow', 'brineworn_drifter'],
      pois: [['Charcoal Camp', ['ashwood_cabin'], ['campfire', 'tent_supplies', 'cart_wreck', 'barrel_02'], 'provisions', true],
        ['Hunter’s Rest', ['shrine_01'], ['statue_hunter', 'tool_rack', 'crate_02'], 'cave_salvage'],
        ['Old Grove', ['ancient_ruin_arch_01'], ['stone_relic', 'bone_pile_01'], 'deep_cache']],
      lair: (B, x, y) => { B.M.ground.push({ blob: [x, y, 9], m: 'ash', alt: 'mud', p: .5 }); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, r = 6 + B.R() * 3; B.put(B.R() < .5 ? P_('carcass_01') : P_('bone_pile_02'), x + Math.cos(a) * r, y + Math.sin(a) * r * .8); } B.put(P_('nest_02'), x, y - 1, 1.4); B.light(x, y, 200, .7); } },
    village: { name: 'The Drowned Village', seed: 70421, hr: 2, threat: 3, apex: 'choir', lairName: 'Flooded Chapel', pos: [12, 48],
      desc: 'A fishing village the tide took one night. The people never left: they are Brineworn now, and the Callers sing them home from the flooded chapel.',
      ground: [{ area: [0, 0, 150, 94], m: 'mud', alt: 'soil', p: .5, base: .5 }], blobs: ['gravel', 'plaza', 'sand', 'mud'],
      trees: [.28, ['coastal', 'dead']], rocks: 50, plants: 500, residents: ['brineworn_drifter', 'brineworn_drifter', 'brineworn_caller', 'brineworn_breaker'], night: ['brineworn_drifter', 'brineworn_drifter', 'brineworn_caller', 'brineworn_breaker', 'brineworn_breaker'],
      pois: [['Sunken Row', ['village_house_sunken_01', 'village_house_sunken_02', 'village_house_sunken_03'], ['broken_fence', 'barrel_01', 'fish_basket'], 'dock_scrap'],
        ['Net Lofts', ['net_loft'], ['net_rack', 'fish_drying_rack', 'hanging_net_frame'], 'provisions'],
        ['Bone Well', ['bone_well'], ['bone_pile_01', 'lantern_post'], 'cave_salvage', true]],
      lair: (B, x, y) => { B.building('village_chapel_flooded', x, y - 1); for (const dx of [-8, 8]) { B.put('art/arena/lure_lantern', x + dx, y + 3); B.light(x + dx, y + 2, 180, .8); } B.put(P_('statue_hunter'), x - 4, y + 5); } },
    cliffs: { name: 'Storm Cliffs', seed: 88813, hr: 3, threat: 3, apex: 'harrier', lairName: 'Lamp Gallery', pos: [60, 30],
      desc: 'Wind-scoured headlands above the shoals. Redhook flocks wheel around the old lighthouse, and something much bigger nests in its lamp gallery.',
      ground: [{ area: [0, 0, 150, 94], m: 'grass', alt: 'tall', p: .45, base: .55 }], blobs: ['gravel', 'soil', 'tall', 'grass'],
      trees: [.32, ['coastal', 'ash']], rocks: 150, plants: 650, residents: ['gull', 'gull', 'gull', 'grazer', 'widow'], night: ['gull', 'widow', 'brineworn_drifter'], ridges: true,
      pois: [['Shepherd’s Hut', ['cottage_01'], ['fence_wood', 'well', 'supply_sacks'], 'provisions'],
        ['Wreck Cove', ['wreck_small'], ['dinghy_wrecked', 'salvage_debris', 'rope_coil'], 'dock_scrap'],
        ['Ruined Lighthouse', ['lighthouse_ruined'], ['rubble_heap', 'crate_01'], 'cave_salvage']],
      lair: (B, x, y) => { B.building('cliff_lighthouse', x, y); for (const dx of [-6, 6]) { B.put(P_('lantern_post'), x + dx, y + 2); B.light(x + dx, y + 1, 180, .8); } B.put(P_('nest_01'), x - 3, y + 4, 1.3); B.put(P_('nest_02'), x + 4, y + 5, 1.2); } },
  };
  function genArea(key) {
    const A = AREAS[key], W = 150, H = 110, WS = 94, B = builder(key, A.name, W, H, A.seed, WS), { M, R } = B;
    B.M = M; B.R = R;
    B.building = (name, x, y) => { const asset = BLD(name), s = SIZE[asset]; if (!s) return; M.scene.decor.push({ asset, x: +x.toFixed(2), y: +y.toFixed(2), w: s[0], h: s[1], anchor: 'bottom' });
      const depth = Math.max(2, s[1] * .42); for (let gx = x - s[0] * .4; gx <= x + s[0] * .4; gx += 1.2) for (let gy = y - depth; gy <= y - .3; gy += 1.2) B.ghost(gx, gy, 'crate');
      B.keep.push([x, y - depth / 2, Math.max(s[0], depth) * .62]); B.bigs.push([x, y - depth / 2, s[0]]); };
    M.desc = A.desc; M.expedition = true;
    M.ground.push(...A.ground, { area: [0, WS - 8, W, 8], m: 'mud', alt: 'sand', p: .45, base: .5 });
    for (let i = 0; i < 12; i++) M.ground.push({ blob: [8 + R() * (W - 16), 10 + R() * (WS - 22), 5 + R() * 9], m: pick(R, A.blobs), alt: pick(R, A.blobs), p: .3 });
    const land = [40 + R() * 70, WS - 4], trail = [20 + R() * 110, 7.5], lair = [30 + R() * 90, 18 + R() * 10];
    M.arrivals = { default: [land[0], land[1] - 1.5], legacy: [], from: { hub: [land[0], land[1] - 1.5] } };
    M.portals.push({ id: key + '.skiff', name: 'Landing Skiff / Extraction', x: land[0] + 2, y: land[1] + 1.5, target: 'sea departure' }, { id: key + '.trail', name: 'Inland Trail / Extraction', x: trail[0], y: trail[1], target: 'inland' });
    B.keep.push([land[0], land[1], 6], [trail[0], trail[1], 4], [lair[0], lair[1], 12]);
    B.put('art/props/rowboat', land[0] + 2, land[1] + 2.6, .9); B.put('art/props/signpost', trail[0] - 1.6, trail[1] + 1.2);
    A.lair(B, lair[0], lair[1]); B.zone(key + '.lair', A.lairName, lair[0] - 12, lair[1] - 9, 24, 18);
    const pois = [{ x: lair[0], y: lair[1], name: A.lairName, lair: true }], containers = []; let ci = 0;
    for (const [name, blds, props, loot, fire] of A.pois) { let spot = null;
      for (let t = 0; t < 200 && !spot; t++) { const x = 18 + R() * (W - 36), y = 22 + R() * (WS - 40); if (pois.every(p => Math.hypot(p.x - x, p.y - y) > 28) && Math.hypot(x - land[0], y - land[1]) > 18) spot = [x, y]; }
      if (!spot) continue; const [x, y] = spot; pois.push({ x, y, name });
      M.ground.push({ blob: [x, y, 7], m: pick(R, ['gravel', 'soil', 'plaza']), alt: 'gravel', p: .3 });
      blds.forEach((b, i) => B.building(b, x + (i - (blds.length - 1) / 2) * 11, y - 1));
      for (const pr of props) { for (let t = 0; t < 6; t++) { const a = R() * TAU, r = 4 + R() * 3, px = x + Math.cos(a) * r, py = y + 1.5 + Math.abs(Math.sin(a)) * r * .6;
        if (B.put(P_(pr) in SIZE ? P_(pr) : 'art/edges/rubble_heap_01', px, py, 1, R() < .5) !== false) break; } }
      if (fire) B.light(x, y + 2, 190, .85);
      for (let i = 0; i < 2; i++) containers.push({ id: `${key}_c_${ci++}`, name: name + (i ? ' Store' : ' Cache'), mapId: key, x: +(x - 2.5 + i * 5).toFixed(2), y: +(y + 3).toFixed(2), lootTableId: loot, respawn: 'raid' });
      B.zone(key + '.poi' + ci, name, x - 11, y - 8, 22, 16); }
    containers.push({ id: `${key}_c_${ci++}`, name: A.lairName + ' Hoard', mapId: key, x: +(lair[0] + 3).toFixed(2), y: +(lair[1] + 7).toFixed(2), lootTableId: 'deep_cache', respawn: 'raid', rare: true });
    // tracks: landing -> points of interest -> lair -> trail
    let cur = land, left = pois.filter(p => !p.lair).map(p => [p.x, p.y + 3]); while (left.length) { left.sort((a, b) => Math.hypot(a[0] - cur[0], a[1] - cur[1]) - Math.hypot(b[0] - cur[0], b[1] - cur[1])); const n = left.shift(); B.path(cur, n, 3); cur = n; }
    B.path(cur, [lair[0], lair[1] + 9], 3); B.path([lair[0], lair[1] + 9], trail, 3);
    if (A.ridges) for (const ry of [36, 60]) for (let x = 6; x < W - 12; x += 13.4) { if (!B.clear(x + 6.7, ry, 2) || !B.clear(x + 2, ry, 1.5) || !B.clear(x + 11, ry, 1.5)) continue;
      M.scene.decor.push({ asset: 'art/edges/cliff_straight', x: +(x + 6.7).toFixed(2), y: ry, w: 13.44, h: 4.48, anchor: 'bottom' }); for (let gx = x; gx <= x + 13.4; gx += 1.2) B.ghost(gx, ry - .6, 'stone'); B.keep.push([x + 6.7, ry - 1, 7]); }
    B.zone(key + '.all', A.name, 0, 0, W, H);
    B.edges(); B.trees(A.trees[0], A.trees[1]); B.rocks(A.rocks); B.plants(A.plants);
    for (let i = 0; i < 26; i++) { const x = 10 + R() * (W - 20), y = 10 + R() * (WS - 20); if (Math.hypot(x - land[0], y - land[1]) > 26 && Math.hypot(x - lair[0], y - lair[1]) > 14) M.spawns.push([+x.toFixed(1), +y.toFixed(1)]); }
    M.containers = containers; M.pois = pois; M.lair = { x: lair[0], y: lair[1] }; M.areaKey = key;
    return M;
  }
  IS.genArea = genArea;
  // register the fixed map at load (so it is preloaded and cached like the others)
  const G0 = () => window.SALTWAKE_DEV?.game;
  function install(G, M) {
    G.world.maps[M.id] = M; window.saltwakeTiles?.installScene?.(M.id, M);
    const C = G.world.content; C.containers = C.containers.filter(k => k.mapId !== M.id).concat(M.containers || []);
    if (M.arena && window.saltwakeBoss) window.saltwakeBoss.ARENAS[M.id] = M.arena;
  }
  IS.install = install;
  try { const W0 = window.SALTWAKE_WORLD || WORLD; for (const k of Object.keys(AREAS)) { const m = genArea(k); W0.maps[k] = m; window.saltwakeTiles?.installScene?.(k, m); W0.content.containers = W0.content.containers.filter(c => c.mapId !== k).concat(m.containers); } } catch (e) { console.warn('areas', e); }
  try { const W0 = window.SALTWAKE_WORLD || WORLD; const maw = genMaw(); W0.maps.maw = maw; window.saltwakeTiles?.installScene?.('maw', maw); W0.content.containers = W0.content.containers.filter(k => k.mapId !== 'maw').concat(maw.containers); if (window.saltwakeBoss) window.saltwakeBoss.ARENAS.maw = maw.arena; } catch (e) { }

  // ---- destinations ----------------------------------------------------------------------------------------------
  // Quest destinations: a map that exists only while a story quest that names it is active (the Maw: "Into the Maw").
  const questFor = (G, d) => (G.world.content.quests || []).find(q => q.destination === d && G.quest?.progress?.(q)) || null;
  IS.questFor = questFor;
  const unlocked = (G, d) => d === 'maw' ? !!questFor(G, d) : AREAS[d] ? rank(G) >= AREAS[d].hr : true;
  IS.unlocked = unlocked;
  // ---- EXPEDITION CHART (Monster Hunter-style destination map) ----------------------------------------------------
  // The one departure point is the Rest Docks pier. It opens a full-screen sea chart of the Red Salt Coast; pick a
  // region, read its brief, check the weather windows, depart.
  const DEST_INFO = {
    quays: { name: 'The Outer Quays', tag: 'FIXED MAP', threat: 2, pos: [34, 66], desc: 'The ruined waterfront south-west of the Rest. Story quests, field commissions, survival operations and the Tidemaw at the Boathouse Slip.',
      facts: ['Story & commissions', 'Tide-gated extractions', 'Boss: the Tidemaw'] },
    isle: { name: 'The Drowned Isle', tag: 'SPECIAL · RANDOM', threat: 2, pos: [28, 22], desc: 'An unmapped isle that is different every time the fog lifts. Landmarks, salvage caches and monster packs in a new layout every visit.',
      facts: ['New layout every visit', '12-16 salvage caches', 'Extract: landing skiff or cliff rope'] },
    front: { name: 'The Brinefront', tag: 'SPECIAL · OPERATION', threat: 3, pos: [86, 20], desc: 'A Brineworn breeding ground. Burn the brood nests, raise the signal mast, then call extraction and hold the line until the boat comes. Call-ins available all mission.',
      facts: ['Objectives: 3 nests + signal mast', 'Call-ins: hold X', 'Hold for extraction · bonus 250 scrip'] },
    maw: { name: 'The Maw', tag: 'STORY QUEST', threat: 5, pos: [48, 8], desc: 'A drowned crater ringed by old pillars, charted by Teren Sull. The Elder Tidemaw waits at its heart. Bring everything.',
      facts: ['Story quest: Into the Maw', 'Boss: the Elder Tidemaw', 'Appears only while the quest is active'] },
  };
  for (const [k, A] of Object.entries(AREAS)) DEST_INFO[k] = { name: A.name, tag: 'FIXED MAP · HR ' + A.hr, threat: A.threat, pos: A.pos, desc: A.desc,
    facts: ['Residents: ' + [...new Set(A.residents)].map(t => t.replace('brineworn_', 'Brineworn ').replace(/^./, c => c.toUpperCase())).join(', '), 'Apex: ' + APEX[A.apex].name + ' (' + A.lairName + ')', 'Extract: landing skiff or inland trail'] };
  IS.DEST_INFO = DEST_INFO;
  const thumbs = {};
  function thumb(G, d) {
    if (thumbs[d] !== undefined) return thumbs[d];
    const imgs = window.SALTWAKE_ASSETS?.images || {};
    if (d === 'quays') return (thumbs[d] = imgs['art/maps/quays'] || null);
    if (d === 'maw' || AREAS[d]) { try { const c = window.saltwakeTiles?.renderOverview?.(G, d, 3); return (thumbs[d] = c ? c.toDataURL('image/png') : null); } catch (e) { return null; } }
    return (thumbs[d] = null);
  }
  const IMGS2 = () => window.SALTWAKE_ASSETS?.images || {};
  const spriteSrc = k => IMGS2()[k] || (typeof veinArt !== 'undefined' && (veinArt.get(k)?.src || veinArt.get(k + '_0_0')?.src)) || null;
  function monsterCard(img, tint, name, lore, tag) { const src = spriteSrc(img) || spriteSrc(String(img).replace(/_(idle|flight|right)$/, '') + '_0_0'); return `<div class="swMon">${src ? `<img src="${src}" alt="" style="filter:${tint || 'none'}">` : '<i>?</i>'}<div><span>${tag}</span><b>${name}</b><small>${lore}</small></div></div>`; }
  function missionsHtml(G, dest) {
    const list = MISSIONS[dest] || []; if (list.length < 2 && dest !== 'front') return '';
    const cur = IS.mission(G, dest), hr = rank(G);
    const rows = list.map(m => { const lock = hr < (m.hr || 1); return `<button class="swMis ${m.id === cur.id ? 'on' : ''}" data-act="sw_mission" data-id="${m.id}" ${lock ? 'disabled' : ''}><b>${m.name}</b><small>${m.kind === 'hunt' ? 'HUNT' : m.kind === 'op' ? 'OPERATION' : m.kind === 'story' ? 'STORY' : 'EXPEDITION'} · ${'★'.repeat(m.threat)}${lock ? ' · HR ' + m.hr + ' required' : ''}</small></button>`; }).join('');
    let detail = `<p class="swMisDesc">${cur.desc}</p>`;
    if (cur.kind === 'hunt') { const A = APEX[cur.apex]; detail += monsterCard(A.icon, A.tint, A.name, A.lore, 'TARGET · APEX ' + A.type.replace('brineworn_', '').toUpperCase()) +
      `<p class="fine">Reward on extraction: ${A.reward.scrip} scrip · ${A.reward.items.map(([id, n]) => `${Math.ceil(n / 2)} × ${itemDef(id).name}`).join(' · ')} · +450 HR XP</p>`; }
    if (cur.kind === 'op') { const O = OPS.find(o => o.id === cur.op); detail += monsterCard(O.icon, '', O.family, LORE[O.monsters[0]] || '', 'ENEMY · ' + O.family.toUpperCase()) +
      `<ul>${[O.nests ? `Burn ${O.nests} × ${O.nestName}` : '', O.hunt ? `Slay the ${APEX[O.hunt].name}` : '', O.mast ? `Hold the signal mast ${O.mast} s` : '', 'Call extraction and hold until the boat'].filter(Boolean).map(x => `<li>${x}</li>`).join('')}</ul><p class="fine">Bonus ${O.reward} scrip + kills</p>`; }
    if (cur.kind === 'free' && dest === 'isle') detail += '<p class="fine">A random apex roams this isle. Slaying it pays trophies and Hunter XP.</p>';
    return `<h4>Missions</h4><div class="swMisList">${rows}</div>${detail}`;
  }
  const fc = P.showClimateForecast;
  if (fc) P.showClimateForecast = function (departure) {
    if (!departure) return fc.apply(this, arguments);
    const G = this; if (this.save.destination === 'maw' && !unlocked(this, 'maw')) this.save.destination = 'quays';
    const sel = this.save.destination && IS.DEST.includes(this.save.destination) ? this.save.destination : 'quays', D = DEST_INFO[sel], ok = unlocked(this, sel);
    const cs = this.climateState(), weather = cs.weather, inPort = this.environmentCanDepart?.() !== false, ct = typeof coastTime === 'function' ? coastTime : m => '';
    const shown = IS.DEST.filter(d => d !== 'maw' || unlocked(G, d));
    const nodes = shown.map(d => { const I = DEST_INFO[d], open = unlocked(G, d), t = open ? thumb(G, d) : null;
      return `<button class="swNode ${d === sel ? 'on' : ''} ${open ? '' : 'locked'} t-${d}" data-act="sw_dest" data-id="${d}" style="left:${I.pos[0]}%;top:${I.pos[1]}%">
        <span class="swThumb">${t ? `<img src="${t}" alt="">` : `<i>${open ? (d === 'isle' || d === 'front' ? '?' : '◆') : '🔒'}</i>`}</span><b>${I.name}</b><small>${I.tag}</small></button>`; }).join('');
    const routes = shown.map(d => { const I = DEST_INFO[d]; return `<path d="M 36 88 Q ${(36 + I.pos[0]) / 2 + (I.pos[0] < 36 ? -8 : 8)} ${(88 + I.pos[1]) / 2} ${I.pos[0]} ${I.pos[1] + 6}" class="${d === sel ? 'on' : ''} ${unlocked(G, d) ? '' : 'locked'}"/>`; }).join('');
    const windows = [['dawn', 360], ['day', 600], ['dusk', 1080], ['night', 1260]].map(([id, minute]) => { const delta = (((minute - cs.clock) % 1440) + 1440) % 1440 || 1440, f = this.climateState(cs.clock + delta);
      return `<div class="swWin"><span><b>${id.toUpperCase()}</b><small>${ct(cs.clock + delta)} · ${f.weather.icon} ${f.weather.name}</small></span><button data-act="env_wait" data-window="${id}" ${inPort ? '' : 'disabled'}>Wait</button></div>`; }).join('');
    const stars = n => '★'.repeat(n) + '☆'.repeat(5 - n);
    this.open('EXPEDITION PLANNING', `<div class="swChart">
      <section class="swSea"><svg viewBox="0 0 100 100" preserveAspectRatio="none" class="swRoutes">${routes}</svg>
        <div class="swHome" style="left:36%;top:88%"><b>Salvager’s Rest</b><small>Departure pier</small></div>${nodes}
        <div class="swCompass">N</div><div class="swSeaName">THE RED SALT COAST</div></section>
      <aside class="swBrief"><span class="swTag t-${sel}">${D.tag}</span><h2>${D.name}</h2><div class="swThreat">Threat <b>${stars(D.threat)}</b></div>
        <p>${D.desc}</p><ul>${D.facts.map(f => `<li>${f}</li>`).join('')}</ul>
        ${sel === 'maw' && ok ? `<p class="swQuest">◆ Story quest · ${questFor(G, 'maw').title}</p>` : ''}${!ok && AREAS[sel] ? `<p class="swLock">Locked · Hunter Rank ${AREAS[sel].hr} required</p>` : ''}
        ${sel !== 'quays' && this.livingState?.().active ? '<p class="fine">Your commission’s sites are on the Outer Quays; hunt-type commissions still count anywhere.</p>' : ''}
        ${missionsHtml(G, sel)}
        <h4>Conditions now · ${ct(cs.clock)}</h4><div class="swNow">${weather.icon} <b>${weather.name}</b> · ${cs.period.name}</div>
        <h4>Departure windows</h4><div class="swWins">${windows}</div>
        <button class="primary swGo" data-act="env_deploy" ${inPort && ok ? '' : 'disabled'}>DEPART · ${(IS.mission(G, sel)?.kind === 'free' ? D.name : IS.mission(G, sel)?.name || D.name).toUpperCase()}</button>
        <p class="fine">Gear carried on death is lost. Extract to bring it home.</p></aside></div>`);
  };
  const act = P.doAction;
  P.doAction = function (a, n) { if (a === 'sw_mission') { const id = n.dataset.id, d = Object.keys(MISSIONS).find(k => MISSIONS[k].some(m => m.id === id)); if (d) { (this.save.missions ||= {})[d] = id; this.store(); } return this.showClimateForecast(true); }
    if (a === 'sw_dest') { const d = n.dataset.id; if (IS.DEST.includes(d)) { this.save.destination = d; this.store(); } return this.showClimateForecast(true); } return act.apply(this, arguments); };

  // one departure point: the Rest Docks pier; the old road passage is barricaded
  const hubPortal = P.portal;
  P.portal = function (o) {
    if (!this.raid && this.mapId === 'hub' && o?.id === 'hub.outer') { this.notify('The passage is barricaded · Expeditions leave from the Rest Docks departure pier', 3.5); return; }
    return hubPortal.apply(this, arguments);
  };
  try { const H = (window.SALTWAKE_WORLD || WORLD).maps.hub, dp = H.portals.find(p => p.id === 'hub.depart');
    if (dp) { dp.name = 'Departure Pier · Expedition Chart'; H.scene?.decor?.push({ asset: 'art/props/notice_board', x: dp.x - 1.2, y: dp.y - 2.2, w: SIZE['art/props/notice_board']?.[0] || 2.8, h: SIZE['art/props/notice_board']?.[1] || 2.8, anchor: 'bottom' }, { asset: 'art/props/lantern_post', x: dp.x + 1.5, y: dp.y - 1.6, w: SIZE['art/props/lantern_post']?.[0] || 1.4, h: SIZE['art/props/lantern_post']?.[1] || 2.8, anchor: 'bottom' });
      H.scene?.lights?.push({ x: dp.x + 1.5, y: dp.y - 2.6, radius: 170, strength: .8 }); }
    const ou = H.portals.find(p => p.id === 'hub.outer'); if (ou) ou.name = 'Outer Quays Passage (barricaded)'; } catch (e) { }
  // ---- raid on a destination ---------------------------------------------------------------------------------------
  const MON = (G, type, x, y, id) => {
    if (/^brineworn_/.test(type)) return window.saltwakeAlpha?.makeAltered?.(G, type, x, y, id) || null;
    const d = (G.world.content.enemies || []).find(t => t.id === type); if (!d) return null;
    return { id, type, name: d.name, x, y, homeX: x, homeY: y, hp: d.health, maxHp: d.health, dead: false, aggro: 0, attackCD: 1.2, walk: Math.random() * 5, phase: Math.floor(Math.random() * 9),
      factionId: 'wildlife', actorType: 'monster', provoked: false, parts: (d.parts || []).map(p => ({ ...p, current: p.hp, broken: false })) };
  };
  function populate(G, M, seed, only) {
    const R = rng(seed ^ 0x51ed), night = !!G.climateState?.().night, out = [], TX = window.saltwakeTiles;
    const types = M.id === 'front' ? ['brineworn_drifter', 'brineworn_drifter', 'brineworn_caller', 'brineworn_breaker', 'widow', 'gull'] : M.id === 'maw' ? ['brineworn_drifter', 'brineworn_drifter', 'brineworn_breaker', 'widow', 'gull'] : night ? ['brineworn_drifter', 'widow', 'brineback', 'gull', 'brineworn_breaker'] : ['gull', 'gull', 'widow', 'brineback', 'grazer', 'grazer', 'brineworn_drifter'];
    const types2 = only || types, n = M.id === 'maw' ? 6 : 12 + Math.floor(R() * 5);
    for (let i = 0; i < n; i++) { const sp = M.spawns[i % M.spawns.length]; let x = sp[0] + (R() - .5) * 6, y = sp[1] + (R() - .5) * 5;
      const nw = TX?.nearestWalkable?.(G, x, y); if (nw) [x, y] = nw; const e = MON(G, pick(R, types2), x * T, y * T, `${M.id}_${seed}_${i}`); if (!e) continue; try { G.initSense?.(e); } catch (er) { } out.push(e); }
    for (const p of M.pois || []) if (POI[p.kind]?.pack) for (let i = 0; i < 2; i++) { const e = MON(G, only ? only[0] : night ? 'brineworn_drifter' : 'widow', (p.x + (R() - .5) * 6) * T, (p.y + (R() - .5) * 5) * T, `${M.id}_${seed}_nest_${i}_${p.x | 0}`); if (e) { try { G.initSense?.(e); } catch (er) { } out.push(e); } }
    return out;
  }
  const begin = P.beginRaid;
  P.beginRaid = function () {
    const had = !!this.raid, out = begin.apply(this, arguments); const r = this.raid;
    if (had || !r) return out;
    const dest = this.save.destination && unlocked(this, this.save.destination) ? this.save.destination : 'quays';
    if (dest === 'quays') return out;
    let M; const mission = IS.mission(this, dest), seed = (Date.now() ^ (Math.random() * 1e9)) >>> 0, op = mission.kind === 'op' ? OPS.find(o => o.id === mission.op) : null;
    if (dest === 'isle') { M = genIsle(seed); IS.stats.generated++; }
    else if (dest === 'front') { M = genFront(seed, op || OPS[0]); IS.stats.generated++; }
    else if (AREAS[dest]) M = this.world.maps[dest]?.tilemap ? this.world.maps[dest] : genArea(dest);
    else M = this.world.maps.maw?.tilemap ? this.world.maps.maw : genMaw();
    r.mission = mission.id;
    install(this, M);
    // overview picture for the map screen (random maps have no painted overview)
    try { if (!M.overview) { const c = window.saltwakeTiles?.renderOverview?.(this, M.id, 6); if (c) { const al = `art/maps/${M.id}_${M.seed}`; window.SALTWAKE_ASSETS.images[al] = c.toDataURL('image/png'); M.overview = al; } } } catch (e) { }
    r.destination = dest; r.tidemaw = null; r.contract = {};
    const huntA = mission.kind === 'hunt' ? APEX[mission.apex] : null;
    const AR = AREAS[dest], night0 = !!this.climateState?.().night;
    r.enemies = populate(this, M, r.seed || 1, AR ? (night0 ? AR.night : AR.residents) : huntA ? [huntA.type, huntA.type, huntA.minion.type] : op ? op.monsters : null);
    if (AR) { const e = spawnApex(this, AR.apex, M.lair.x * T, (M.lair.y + 6) * T); if (e) { e.patrolRadius = 5; if (huntA) r.hunt = { apex: AR.apex, id: e.id, name: APEX[AR.apex].name, done: false, reward: APEX[AR.apex].reward }; else r.roamer = { apex: AR.apex, id: e.id, seen: false }; } }
    if (dest === 'front') { const O = op || OPS[0]; r.operation = { id: O.id, name: M.opName, tier: 3, reward: O.reward, hold: 90, evac: M.evac, monsters: O.monsters, objectives: M.objectives.map(o => ({ ...o })) };
      for (const o of r.operation.objectives) if (o.kind === 'hunt') { const e = spawnApex(this, o.apex, o.x * T, o.y * T); if (e) o.apexId = e.id; } }
    if (dest === 'isle') { const far = (M.pois || []).slice().sort((a, b) => Math.hypot(b.x - M.arrivals.default[0], b.y - M.arrivals.default[1]) - Math.hypot(a.x - M.arrivals.default[0], a.y - M.arrivals.default[1]))[0] || { x: M.w / 2, y: M.h / 3 };
      let key = huntA ? mission.apex : null;
      if (!key) { const pool = Object.entries(APEX).filter(([, a]) => !a.hidden && a.hr <= rank(this) + 1).map(([k]) => k); key = pool[Math.floor(Math.random() * pool.length)] || 'harrier'; }
      const e = spawnApex(this, key, far.x * T, (far.y + 3) * T);
      if (huntA && e) r.hunt = { apex: key, id: e.id, name: huntA.name, done: false, reward: huntA.reward };
      else if (e) r.roamer = { apex: key, id: e.id, seen: false }; }
    IS.stats.visits++;
    const [ax, ay] = M.arrivals.default; this.setArea(M.id, ax, ay);
    this.notify(AR && !r.hunt ? `${M.name.toUpperCase()} · ${APEX[AR.apex].name} rules the ${AREAS[dest].lairName}.` : r.hunt ? `HUNT · ${r.hunt.name.toUpperCase()} · ${M.name}. Track it down and slay it, then extract.` : dest === 'isle' ? `${M.name.toUpperCase()} · A new isle rises from the fog. Something big hunts here.` : dest === 'front' ? `${M.opName.toUpperCase()} · Complete the objectives, then call extraction. Hold X for call-ins.` : 'INTO THE MAW · The Elder Tidemaw waits in the drowned crater.', 5);
    return out;
  };
  // extraction on the new maps
  const portal = P.portal;
  P.portal = function (o) {
    if (this.raid && this.map()?.expedition && o && String(o.id).startsWith(this.mapId + '.')) { IS.stats.extractions++; this.endRaid(true, 'Reached ' + o.name); return; }
    return portal.apply(this, arguments);
  };

  // ---- apex monsters --------------------------------------------------------------------------------------------
  // Oversized named versions of a species: more health, harder and faster hits, extra "hide" hitboxes covering the big
  // sprite, summons its young/flock when it is fighting, enrages below 40 %. Uses the species' own telegraphed moves.
  function spawnApex(G, key, x, y) {
    const A = APEX[key]; if (!A || !G.raid) return null;
    const TX = window.saltwakeTiles; const nw = TX?.nearestWalkable?.(G, x / T, y / T); if (nw) { x = nw[0] * T; y = nw[1] * T; }
    const e = MON(G, A.type, x, y, `apex_${key}_${Date.now()}`); if (!e) return null;
    try { G.initSense?.(e); } catch (er) { }   // (initSense rebuilds parts from the species: do it before the apex parts)
    const k = A.scale, armor = (typeof COMBAT_PARTS !== 'undefined' && COMBAT_PARTS[A.type]?.bodyArmor) || 8;
    Object.assign(e, { apex: key, name: A.name, hp: A.hp, maxHp: A.hp, apexScale: k, apexTint: A.tint, dmgMul: A.dmg, cdMul: A.cd, apexSummon: 8, provoked: !!A.aggressive, homeX: x, homeY: y, patrolRadius: 8 });
    e.parts = (e.parts || []).map(p => ({ ...p, dx: p.dx * k, dy: p.dy * k, radius: p.radius * Math.sqrt(k) }))
      .concat([[0, -12], [-18, -4], [18, -4]].map(([dx, dy], i) => ({ id: 'hide' + i, name: '', dx: dx * k, dy: dy * k, radius: 17 * k, hp: 1e9, current: 1e9, armor, drop: null, broken: false, hide: true })));
    G.raid.enemies.push(e); IS.stats.apex = (IS.stats.apex || 0) + 1; return e;
  }
  IS.spawnApex = spawnApex;
  function minions(G, e, n) {
    const A = APEX[e.apex], m = A.minion; if (!m) return;
    for (let i = 0; i < n; i++) { const a = Math.random() * TAU, x = e.x + Math.cos(a) * 70, y = e.y + Math.sin(a) * 50;
      const c = MON(G, m.type, x, y, `brood_${e.id}_${Date.now()}_${i}`); if (!c) continue; try { G.initSense?.(c); } catch (er) { }
      if (m.scale !== 1) { c.apexScale = m.scale; c.parts = (c.parts || []).map(p => ({ ...p, dx: p.dx * m.scale, dy: p.dy * m.scale, radius: p.radius * m.scale })); }
      c.hp = c.maxHp = Math.max(8, Math.round(c.maxHp * m.hp)); c.dmgMul = m.dmg; c.name = m.name; c.provoked = true; c.awareness = 'alert'; c.aggro = 9; G.raid.enemies.push(c); }
  }
  const apexUpd = P.update;
  P.update = function (dt) {
    const out = apexUpd.apply(this, arguments), r = this.raid; if (!r || this.isPaused()) return out; dt = Math.min(.1, dt || 0);
    const p = this.player;
    for (const e of r.enemies) { if (!e.apex || e.dead) continue; const A = APEX[e.apex], d = Math.hypot(e.x - p.x, e.y - p.y);
      if (A.aggressive && d < 520) { e.provoked = true; }
      const fighting = e.awareness === 'alert' || e.aggro > 0 || e.provoked && d < 520;
      if (fighting) { e.apexSummon -= dt; if (e.apexSummon <= 0) { minions(this, e, e.hp < e.maxHp * .4 ? 3 : 2); e.apexSummon = e.hp < e.maxHp * .4 ? 11 : 17; this.notify(`${A.name} calls its ${A.minion.name.toLowerCase()}s!`, 1.8); } }
      if (!e.apexEnraged && e.hp < e.maxHp * .4) { e.apexEnraged = true; e.cdMul = (e.cdMul || 1) * .75; this.notify(`${A.name.toUpperCase()} IS ENRAGED`, 2.5); window.saltwakeCamera?.shake?.(.3); }
      if (r.roamer && r.roamer.id === e.id && !r.roamer.seen && d < 620) { r.roamer.seen = true; this.notify(`APEX SIGHTED · ${A.name}`, 3); window.saltwakeAudio?.event?.('warning', .8); }
    }
    return out;
  };
  const apexHit = P.hitMonster;
  P.hitMonster = function (e) {
    const was = e.dead, out = apexHit.apply(this, arguments), r = this.raid;
    if (!was && e.dead && e.apex && r) { const A = APEX[e.apex];
      for (const [id, n] of A.reward.items) for (let i = 0; i < Math.min(n, 3); i++) r.drops.push({ x: e.x + (Math.random() - .5) * 70, y: e.y + 10 + Math.random() * 20, id, n: Math.ceil(n / Math.min(n, 3)), got: false });
      window.saltwakeHunter?.bank?.(this, 250, A.name); IS.stats.apexKills = (IS.stats.apexKills || 0) + 1;
      if (r.hunt && r.hunt.id === e.id) { r.hunt.done = true; this.notify(`TARGET HUNTED · ${A.name} · Collect the trophies and extract to complete the hunt`, 5); }
      else this.notify(`APEX SLAIN · ${A.name}`, 4);
      for (const o of r.operation?.objectives || []) if (o.kind === 'hunt' && o.apexId === e.id && !o.done) { o.done = true; this.notify(`${A.name.toUpperCase()} DOWN · objective complete`, 3); }
      window.saltwakeCamera?.shake?.(.5); }
    return out;
  };
  // hunt reward on a safe extraction
  const huntEnd = P.endRaid;
  P.endRaid = function (success) {
    const r = this.raid, h = r?.hunt; const out = huntEnd.apply(this, arguments);
    if (h && h.done && success) { this.save.gold += h.reward.scrip; for (const [id, n] of h.reward.items) addItem(this.save.bag, id, Math.ceil(n / 2)); window.saltwakeHunter?.bank?.(this, 200, 'Hunt');
      this.save.huntsDone = (this.save.huntsDone || 0) + 1; this.store?.(); this.notify(`HUNT COMPLETE · ${h.name} · +${h.reward.scrip} scrip`, 5); IS.stats.hunts = (IS.stats.hunts || 0) + 1; }
    return out;
  };
  // HUD: apex bar (hunt target always; other apexes when close)
  const apexHud = P.hud;
  P.hud = function () {
    const out = apexHud.apply(this, arguments); let el = document.getElementById('swApex');
    if (!el) { el = document.createElement('div'); el.id = 'swApex'; el.innerHTML = '<span></span><b></b><div><i></i></div>'; (document.getElementById('world')?.parentElement || document.body).appendChild(el); }
    const r = this.raid, p = this.player; let e = null;
    if (r && this.mode === 'play') { const live = r.enemies.filter(x => x.apex && !x.dead && !APEX[x.apex].hidden || x.apex && !x.dead && r.operation);
      e = live.find(x => r.hunt && x.id === r.hunt.id) || live.filter(x => Math.hypot(x.x - p.x, x.y - p.y) < 700).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0] || null; }
    el.hidden = !e; if (e) { el.querySelector('span').textContent = r.hunt && e.id === r.hunt.id ? 'HUNT TARGET' : 'APEX'; el.querySelector('b').textContent = e.name; el.querySelector('i').style.width = Math.max(0, e.hp / e.maxHp * 100) + '%'; }
    return out;
  };
  // quest marker: the hunt target, then an extraction
  const QUI = window.saltwakeQuestUI;
  if (QUI) { const ex = QUI.extraTarget; QUI.extraTarget = g => { const r = g.raid;
    if (r?.hunt) { const e = r.enemies.find(x => x.id === r.hunt.id);
      if (!r.hunt.done && e && !e.dead) return { q: null, loc: { mapId: g.mapId, name: r.hunt.name }, x: e.x, y: e.y };
      const pt = g.map().portals?.[0]; if (r.hunt.done && pt) return { q: null, loc: { mapId: g.mapId, name: pt.name }, x: pt.x * T, y: pt.y * T }; }
    return ex ? ex(g) : null; }; }

  // ---- operation objectives (Brinefront) -------------------------------------------------------------------------
  const opNear = (G, o, r) => Math.hypot(G.player.x - o.x * T, G.player.y - o.y * T) < r * T;
  function defenders(G, o, n) { const R = Math.random; for (let i = 0; i < n; i++) { const a = R() * TAU, x = (o.x + Math.cos(a) * 9) * T, y = (o.y + Math.sin(a) * 7) * T;
      const e = MON(G, pick(R, G.raid.operation?.monsters || ['brineworn_drifter', 'brineworn_drifter', 'widow', 'brineworn_breaker']), x, y, `op_${o.id}_${Date.now()}_${i}`); if (!e) continue; try { G.initSense?.(e); } catch (er) { } e.surv = true; e.provoked = true; e.awareness = 'alert'; e.aggro = 9; G.raid.enemies.push(e); } }
  IS.opDefenders = defenders;
  const inter = P.interact;
  P.interact = function () {
    const op = this.raid?.operation;
    if (op && !this.isPaused()) for (const o of op.objectives) {
      if (o.done) continue;
      if (o.kind === 'nest' && !o.charge && opNear(this, o, 2.6)) { o.charge = 5; this.notify('CHARGE PLANTED · Get clear! 5 s', 2.5); defenders(this, o, 3); window.saltwakeAudio?.event?.('warning', .8); return; }
      if (o.kind === 'mast' && !o.active && opNear(this, o, 2.6)) { o.active = true; o.wave = 2; this.notify('SIGNAL MAST RAISING · Stay near it for 25 s', 3); defenders(this, o, 3); return; }
    }
    return inter.apply(this, arguments);
  };
  const opUpd = P.update;
  P.update = function (dt) {
    const out = opUpd.apply(this, arguments), op = this.raid?.operation; if (!op || this.isPaused()) return out; dt = Math.min(.1, dt || 0);
    for (const o of op.objectives) {
      if (o.done) continue;
      if (o.kind === 'nest' && o.charge) { o.charge -= dt; if (o.charge <= 0) { o.done = true; o.charge = 0;
          for (const e of this.raid.enemies) if (!e.dead && Math.hypot(e.x - o.x * T, e.y - o.y * T) < 110) this.hitMonster(e, 220, { penetration: 50, stagger: 3 }, e.x, e.y);
          if (opNear(this, o, 3.2) && this.player.iframes <= 0) this.hurtPlayer(40, 0);
          window.saltwakeCamera?.shake?.(.6); window.saltwakeImpact?.SFX?.kill?.(); this.raid.swBooms = (this.raid.swBooms || []).concat([{ x: o.x * T, y: o.y * T, R: 110, life: .45 }]);
          const IMx = window.saltwakeImpact; if (IMx) IMx.decals.push({ x: o.x * T, y: o.y * T - 14, blobs: [[0, 0, 20], [14, 4, 10], [-12, -3, 12], [5, -8, 9]], color: '#1a1410', life: 60 });
          const left = op.objectives.filter(x => !x.done).length; this.notify(`NEST DESTROYED · ${op.objectives.length - left}/${op.objectives.length} objectives`, 3); } }
      if (o.kind === 'mast' && o.active) { if (opNear(this, o, 5.5)) o.progress = Math.min(o.need, (o.progress || 0) + dt);
        o.wave -= dt; if (o.wave <= 0) { defenders(this, o, 2); o.wave = 8; }
        if (o.progress >= o.need) { o.done = true; o.active = false; this.notify('SIGNAL MAST RAISED · The guild knows where you are', 3); window.saltwakeAudio?.event?.('success', .8); } }
    }
    if (!op.allDone && op.objectives.every(o => o.done)) { op.allDone = true; this.notify('ALL OBJECTIVES COMPLETE · Call extraction at the beacon', 4.5); }
    return out;
  };
  const opScene = P.drawCoastScene;
  P.drawCoastScene = function () {
    const out = opScene.apply(this, arguments), op = this.raid?.operation; if (!op || this.mapId !== 'front') return out;
    const now = performance.now() / 1000; g.save();
    for (const o of op.objectives) { const x = o.x * T, y = o.y * T;
      if (o.kind === 'nest') { if (!o.done) { const im = nestImg(); if (im) { const w = 96 * 1.4, h = 64 * 1.4; g.drawImage(im, x - w / 2, y - h + 10, w, h); }
          g.strokeStyle = `rgba(255,90,70,${.45 + .3 * Math.sin(now * 4)})`; g.lineWidth = 3; g.beginPath(); g.ellipse(x, y + 4, 60, 34, 0, 0, TAU); g.stroke();
          if (o.charge) { g.strokeStyle = '#ffd27a'; g.lineWidth = 5; g.beginPath(); g.arc(x, y - 30, 22, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - o.charge / 5)); g.stroke(); g.fillStyle = '#ffd27a'; g.font = '700 14px system-ui'; g.textAlign = 'center'; g.fillText(Math.ceil(o.charge) + '', x, y - 25); }
          else if (opNear(this, o, 2.6)) { g.font = '600 13px system-ui'; g.textAlign = 'center'; g.fillStyle = 'rgba(255,240,200,.95)'; g.fillText('E · Plant charge', x, y - 80); } } }
      else if (o.kind === 'mast') { const k = (o.progress || 0) / o.need; g.strokeStyle = o.done ? 'rgba(140,230,200,.8)' : 'rgba(140,210,240,.7)'; g.lineWidth = 3; g.setLineDash([10, 6]); g.beginPath(); g.ellipse(x, y, 5.5 * T, 3.8 * T, 0, 0, TAU); g.stroke(); g.setLineDash([]);
        if (!o.done && k > 0) { g.fillStyle = 'rgba(140,210,240,.16)'; g.beginPath(); g.ellipse(x, y, 5.5 * T * k, 3.8 * T * k, 0, 0, TAU); g.fill(); }
        if (!o.active && !o.done && opNear(this, o, 2.6)) { g.font = '600 13px system-ui'; g.textAlign = 'center'; g.fillStyle = 'rgba(255,240,200,.95)'; g.fillText('E · Raise the signal mast', x, y - 90); } } }
    g.restore(); return out;
  };
  let nestIm = null; const nestImg = () => { if (!nestIm) { const s2 = window.SALTWAKE_ASSETS?.images?.['art/props/nest_02']; if (s2) { nestIm = new Image(); nestIm.src = s2; } } return nestIm && nestIm.complete && nestIm.naturalWidth ? nestIm : null; };

  const css = document.createElement('style');
  css.textContent = `
  .swChart{display:grid;grid-template-columns:minmax(0,1fr) minmax(300px,380px);gap:18px;height:calc(100vh - 150px);min-height:440px}
  .swSea{position:relative;border-radius:14px;overflow:hidden;background:radial-gradient(ellipse at 40% 85%,#2d4c4f 0,#18323a 35%,#0d1d24 75%),#0d1d24;border:1px solid rgba(255,255,255,.08)}
  .swSea::before{content:'';position:absolute;inset:0;background:repeating-radial-gradient(circle at 36% 92%,rgba(255,255,255,.035) 0 2px,transparent 2px 26px);pointer-events:none}
  .swSea::after{content:'';position:absolute;left:-10%;right:-10%;bottom:0;height:22%;background:radial-gradient(ellipse at 50% 120%,rgba(120,95,70,.55),transparent 70%);pointer-events:none}
  .swRoutes{position:absolute;inset:0;width:100%;height:100%}.swRoutes path{fill:none;stroke:rgba(232,209,143,.35);stroke-width:.4;stroke-dasharray:1.4 1.2}.swRoutes path.on{stroke:rgba(232,209,143,.95);stroke-width:.6}.swRoutes path.locked{stroke:rgba(255,255,255,.12)}
  .swNode,html.sw-glass #panelLayer #panel .swNode{position:absolute;transform:translate(-50%,-50%);display:flex!important;flex-direction:column;align-items:center;gap:4px;background:transparent!important;border:0!important;box-shadow:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;padding:0!important;cursor:pointer;z-index:2}
  .swThumb{width:96px;height:96px;border-radius:50%;overflow:hidden;display:grid;place-items:center;border:3px solid rgba(232,209,143,.5);background:radial-gradient(circle,#3a4e52,#1b2a30);box-shadow:0 6px 18px rgba(0,0,0,.5)}
  .swThumb img{width:100%;height:100%;object-fit:cover}.swThumb i{font-style:normal;font-size:34px;color:#e8d18f;opacity:.85}
  .swNode b{font-size:14px;color:#f3ead8;text-shadow:0 1px 3px #000}.swNode small{font-size:10px;letter-spacing:.14em;color:#9fd8ff;opacity:.85}
  .swNode.on .swThumb{border-color:#e8d18f;box-shadow:0 0 0 6px rgba(232,209,143,.18),0 6px 18px rgba(0,0,0,.5)}.swNode.locked{opacity:.5}
  .swNode.t-maw .swThumb{border-color:rgba(255,110,90,.6)}.swNode.t-isle .swThumb,.swNode.t-front .swThumb{border-style:dashed}.swThumb{width:80px!important;height:80px!important}.swNode.t-front .swThumb{border-color:rgba(255,170,90,.6)}.swNode.t-isle .swThumb{border-color:rgba(140,210,240,.6)}
  .swHome{position:absolute;transform:translate(-50%,-50%);text-align:center;padding:8px 12px;border-radius:10px;background:rgba(20,16,10,.65);border:1px solid rgba(232,209,143,.45);z-index:2}.swHome b{display:block;color:#e8d18f}.swHome small{opacity:.7}
  .swCompass{position:absolute;right:16px;top:12px;width:36px;height:36px;border-radius:50%;display:grid;place-items:center;border:1px solid rgba(255,255,255,.25);color:#e8d18f;font-weight:800}
  .swSeaName{position:absolute;left:16px;top:14px;letter-spacing:.3em;font-size:11px;color:rgba(232,209,143,.6)}
  .swChart>.swBrief{position:relative!important;inset:auto!important;left:auto!important;top:auto!important;width:auto!important;max-width:none!important;transform:none!important;background:transparent!important;display:flex;flex-direction:column;gap:8px;overflow:auto;padding:4px 4px 4px 0}.swBrief h2{margin:0}.swBrief ul{margin:0;padding-left:18px;opacity:.85}.swBrief h4{margin:10px 0 0;font-size:11px;letter-spacing:.14em;text-transform:uppercase;opacity:.65}
  .swTag{align-self:flex-start;font-size:11px;letter-spacing:.14em;padding:3px 9px;border-radius:999px;background:rgba(255,255,255,.08)}.swTag.t-maw{color:#ff9a86}.swTag.t-front{color:#ffc37a}.swTag.t-isle{color:#9fd8ff}.swTag.t-quays{color:#e8d18f}
  .swThreat b{color:#e8a05a;letter-spacing:.1em}.swLock{color:#ff9a86}.swQuest{color:#e8d18f;font-weight:600}.swWins{display:flex;flex-direction:column;gap:6px}.swWin{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:6px 10px;border-radius:8px;background:rgba(255,255,255,.04)}
  .swWin small{display:block;opacity:.7}.swGo{margin-top:8px;padding:12px!important;font-size:15px!important;letter-spacing:.08em;position:sticky;bottom:0;z-index:3;flex:none;box-shadow:0 -14px 18px 4px rgba(12,16,18,.92)}.swGo:not(:disabled){background:#22383c!important}
  .swChart>.swBrief{min-height:0;max-height:100%;pointer-events:auto!important}.panel aside,.panelBody aside{pointer-events:auto}.swChart>.swSea{min-height:0}
  @media (max-width:860px){.swChart{grid-template-columns:1fr;height:auto}.swSea{height:60vh}}
  .swMisList{display:flex;flex-direction:column;gap:5px}.swMis{display:flex!important;flex-direction:column;align-items:flex-start;text-align:left;padding:7px 10px!important;gap:1px}
  .swMis small{opacity:.7;font-size:11px;letter-spacing:.06em}.swMis.on{outline:2px solid rgba(232,209,143,.65);background:rgba(232,209,143,.12)!important}.swMisDesc{margin:6px 0 2px;opacity:.9}
  .swMon{display:flex;gap:12px;align-items:center;padding:10px;border-radius:10px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08)}
  .swMon img{width:84px;height:84px;object-fit:contain;image-rendering:pixelated;flex:none}.swMon i{width:84px;height:84px;display:grid;place-items:center;font-size:30px;font-style:normal;opacity:.6}
  .swMon span{display:block;font-size:10px;letter-spacing:.14em;color:#ff9a86}.swMon b{display:block;font-size:16px}.swMon small{opacity:.8;line-height:1.35}
  #swApex{position:absolute;top:44px;left:50%;transform:translateX(-50%);z-index:5;width:min(460px,60vw);pointer-events:none;text-align:center;font:600 12px system-ui,sans-serif;color:#f3ead8;text-shadow:0 1px 3px #000}
  #swApex span{display:block;font-size:10px;letter-spacing:.2em;color:#ff9a86}#swApex b{display:block;font-size:15px;letter-spacing:.1em;text-transform:uppercase;margin:1px 0 4px}
  #swApex div{height:7px;border-radius:5px;background:rgba(0,0,0,.55);overflow:hidden;border:1px solid rgba(255,255,255,.15)}#swApex i{display:block;height:100%;background:linear-gradient(90deg,#c9543f,#e8a05a)}
  .swDest{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:8px;margin-bottom:12px}.swDest button{display:flex!important;flex-direction:column;align-items:flex-start;gap:3px;text-align:left;padding:10px 12px!important}
  .swDest button[aria-pressed="true"]{outline:2px solid rgba(143,212,232,.65);background:rgba(143,212,232,.14)!important}.swDest small{opacity:.75;font-size:12px;line-height:1.35}`;
  document.head.appendChild(css);
})();
