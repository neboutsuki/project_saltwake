/* SALTWAKE tile map, stage A (v0.31): the Outer Quays drawn from the generated art pack.
 * Layout, coordinates, IDs, exits and gameplay collisions are unchanged; only how the map looks changes, plus a
 * thin blocked band where the new edge scenery stands.
 *
 * Ground: every tile gets a material (cobble roads, stone plaza, gravel yards, red-salt crust, grass, soil, mud,
 *   sand, cave floor) from the map's roads, spaces, zones, coastline and a little noise. Chunks of 16x16 tiles are
 *   composed per pixel from the seamless art/tiles textures; borders between materials are warped by noise so they
 *   look natural (no straight tile seams). Chunks are built a few rows at a time (about 5 ms of work per frame, nearby
 *   chunks ahead of time), kept in a small cache, and the old painted chunk shows until a new one is ready.
 * Sea: drawn every frame below the live coastline (the tide still moves it): deep water, a shallows band, and the
 *   surf strip along the line. Water textures drift slowly.
 * Roads are part of the ground; docks use the plank texture.
 * Scenery: trees, grass, shrubs, rocks, crates, lanterns, fixtures and loot containers use art/* sprites; Quays
 *   buildings use art/buildings facades when you are outside them (interiors are unchanged).
 * Edges: a dense treeline along the north, treelines and rubble down the east and west sides, rubble and a sea wall
 *   where land meets the sea; the exits (West Passage, Storm Gate) stay open.
 * Every art name used is written out in full below (the single-file build inlines exactly those files).
 * window.saltwakeTiles exposes settings, the material grid and counters for QA.
 */
(() => {
  const P = Game.prototype, IMGS = () => (window.SALTWAKE_ASSETS && window.SALTWAKE_ASSETS.images) || {};
  const MAP = 'quays', CH = 16, CPX = CH * 32;
  const TX = window.saltwakeTiles = { enabled: true, ready: false, stats: { chunks: 0, built: 0, sprites: 0, facades: 0, edges: 0 }, cacheSize: 40 };
  try { if (localStorage.getItem('saltwake.tiles') === 'off') TX.enabled = false; } catch (e) { }

  // ---- art tables (full alias names) ------------------------------------------------------------------------------
  const TEX = {
    cobble: 'art/tiles/cobble_road', plaza: 'art/tiles/stone_plaza', gravel: 'art/tiles/gravel', soil: 'art/tiles/packed_soil',
    mud: 'art/tiles/wet_mud', grass: 'art/tiles/grass_short', tall: 'art/tiles/grass_tall', salt: 'art/tiles/red_salt_crust',
    sand: 'art/tiles/sand_beach', cave: 'art/tiles/cave_floor', moss: 'art/tiles/moss', ash: 'art/tiles/ash_drift',
    shallows: 'art/tiles/shallows', deep: 'art/tiles/deep_sea', plank: 'art/tiles/plank_deck',
  };
  const MATS = ['cobble', 'plaza', 'gravel', 'soil', 'mud', 'grass', 'tall', 'salt', 'sand', 'cave', 'ash'];
  const TREES = { north: ['art/trees/ash_pine_01', 'art/trees/ash_pine_02', 'art/trees/ash_pine_03', 'art/trees/ash_pine_04', 'art/trees/dead_tree_02'],
    coast: ['art/trees/coastal_pine_01', 'art/trees/coastal_pine_02', 'art/trees/dead_tree_01', 'art/trees/dead_tree_03'],
    mid: ['art/trees/coastal_pine_01', 'art/trees/ash_pine_02', 'art/trees/broadleaf_01', 'art/trees/broadleaf_02', 'art/trees/dead_tree_01'] };
  const PLANTS = { dry: ['art/plants/grass_tuft_01', 'art/plants/grass_tuft_02', 'art/plants/grass_tuft_03', 'art/plants/grass_tuft_04', 'art/plants/grass_tuft_05', 'art/plants/grass_tuft_06', 'art/plants/flowers_01', 'art/plants/flowers_02', 'art/plants/fern_01'],
    wet: ['art/plants/reeds_01', 'art/plants/reeds_02', 'art/plants/reeds_03', 'art/plants/reeds_04', 'art/plants/kelp_pile_01', 'art/plants/kelp_pile_02'],
    shrub: ['art/plants/shrub_01', 'art/plants/shrub_02', 'art/plants/shrub_03', 'art/plants/shrub_04', 'art/plants/fern_02', 'art/plants/fern_03', 'art/plants/mushrooms_01'] };
  const ROCKS = ['art/rocks/rock_large_01', 'art/rocks/rock_large_02', 'art/rocks/rock_small_02', 'art/rocks/rock_small_03', 'art/rocks/cliff_rock_01', 'art/rocks/salt_crystal_cluster_01', 'art/rocks/salt_crystal_cluster_02'];
  const CRATES = ['art/props/crate_01', 'art/props/crate_02', 'art/props/crate_03', 'art/props/barrel_01', 'art/props/barrel_02', 'art/props/crate_stack', 'art/props/supply_sacks', 'art/props/salt_sack_pile'];
  const PROPMAP = { // old asset key -> [new art, height multiplier]
    'coast/props/lantern': ['art/props/lantern_post_variant', 1.25], 'coast/props/brazier': ['art/props/brazier', 1.1],
    'coast/props/shingle': ['art/props/notice_board', 1.15], 'coast/props/stone-well': ['art/props/well', 1.05],
    'coast/props/cargo-hoist': ['art/buildings/crane', 1.7], 'props/chest': ['art/props/chest_common', 1.15],
  };
  const FACADES = { 'quays.salt': 'art/buildings/flats_pump_house', 'quays.salthouse': 'art/buildings/salt_shed_02',
    'quays.warehouse': 'art/buildings/warehouse_01', 'quays.customs': 'art/buildings/customs_house', 'quays.camp': 'art/buildings/warehouse_02',
    'quays.store': 'art/buildings/warehouse_ruined', 'quays.boathouse': 'art/buildings/boathouse', 'quays.shed1': 'art/buildings/pilot_shed',
    'quays.shed2': 'art/buildings/net_loft' };
  const EDGE = { tree: ['art/edges/treeline_mass_01', 'art/edges/treeline_mass_02', 'art/edges/treeline_mass_03'],
    rubble: ['art/edges/rubble_heap_01', 'art/edges/rubble_heap_02'], seawall: 'art/edges/sea_wall', surf: 'art/edges/surf_strip', reeds: 'art/edges/marsh_reed_wall' };

  // ---- image loading ---------------------------------------------------------------------------------------------
  const imgs = {};
  function img(alias) {
    if (alias in imgs) return imgs[alias];
    const src = IMGS()[alias]; if (!src) return (imgs[alias] = null);
    const im = new Image(); im.decoding = 'async'; im.src = src; return (imgs[alias] = im);
  }
  const ok = im => im && im.complete && im.naturalWidth > 0;
  // Ground textures are drawn at about 0.4x their pixel size (the generated textures have large features next to 52 px
  // characters). Downscaling uses a 3x3 tiled copy so the result still wraps seamlessly.
  const SCALE = { cobble: .36, plaza: .4, gravel: .4, soil: .42, mud: .4, grass: .42, tall: .42, salt: .42, sand: .42, cave: .42, ash: .42, moss: .42,
    shallows: .45, deep: .45, plank: .42 };
  const texData = {};
  function tex(name) {
    if (texData[name]) return texData[name];
    const im = img(TEX[name]); if (!ok(im)) return null;
    const w = im.naturalWidth, h = im.naturalHeight, sc = SCALE[name] || 1, W = Math.round(w * sc), H = Math.round(h * sc);
    const big = document.createElement('canvas'); big.width = w * 3; big.height = h * 3;
    const b = big.getContext('2d'); for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) b.drawImage(im, i * w, j * h);
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d', { willReadFrequently: true }); x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
    x.drawImage(big, w, h, w, h, 0, 0, W, H);
    const id = x.getImageData(0, 0, W, H), d = id.data, k = name === 'deep' || name === 'shallows' ? 1 : TX.brighten;
    if (k !== 1) { for (let i = 0; i < d.length; i += 4) { d[i] = Math.min(255, d[i] * k); d[i + 1] = Math.min(255, d[i + 1] * k); d[i + 2] = Math.min(255, d[i + 2] * k); } x.putImageData(id, 0, 0); }
    return (texData[name] = { w: W, h: H, d, canvas: c });
  }
  // Natural grounds get "texture bombing": each wavy ~3-tile cell samples the texture at its own offset, so the
  // repeat is not visible. Built grounds (cobble, plaza) keep one continuous pattern.
  const BOMB = new Set(['gravel', 'soil', 'mud', 'grass', 'tall', 'salt', 'sand', 'cave', 'ash']);
  const pats = {};
  function pattern(ctx, name) { if (pats[name]) return pats[name]; const t = tex(name); if (!t) return null; return (pats[name] = ctx.createPattern(t.canvas, 'repeat')); }

  // ---- noise -----------------------------------------------------------------------------------------------------
  const hash = (x, y, s) => { let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const smooth = t => t * t * (3 - 2 * t);
  function vnoise(x, y, s) { const xi = Math.floor(x), yi = Math.floor(y), xf = smooth(x - xi), yf = smooth(y - yi);
    const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s);
    return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf; }

  // ---- material grid ---------------------------------------------------------------------------------------------
  let grid = null, gw = 0, gh = 0;
  const segDist = (px, py, ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy; let t = L ? ((px - ax) * dx + (py - ay) * dy) / L : 0; t = Math.max(0, Math.min(1, t)); return Math.hypot(px - ax - dx * t, py - ay - dy * t); };
  const inR = (o, x, y) => x >= o.x && x < o.x + o.w && y >= o.y && y < o.y + o.h;
  function buildGrid(g) {
    const m = g.world.maps[MAP], T = 32; gw = m.w; gh = m.h; grid = new Uint8Array(gw * gh);
    const id = n => MATS.indexOf(n);
    const baseCoast = x => m.waterStart * T + Math.sin(x / 360) * 23 + Math.sin(x / 93) * 8;
    const zone = (x, y) => (m.zones || []).filter(z => inR(z, x, y)).sort((a, b) => a.w * a.h - b.w * b.h)[0]?.id;
    for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
      const cx = x + .5, cy = y + .5, n = vnoise(x / 7, y / 7, 3), n2 = vnoise(x / 15, y / 15, 9);
      const coastTiles = baseCoast(cx * T) / T, toCoast = coastTiles - cy;
      let mat;
      const z = zone(cx + (vnoise(x / 9, y / 9, 41) - .5) * 14, cy + (vnoise(x / 9, y / 9, 42) - .5) * 14);
      if (z === 'salt') mat = n > .52 ? 'salt' : n2 > .55 ? 'mud' : 'soil';
      else if (z === 'customs') mat = n > .62 ? 'gravel' : n2 > .7 ? 'grass' : 'soil';
      else if (z === 'camp') mat = n > .5 ? 'mud' : n2 > .5 ? 'soil' : 'gravel';
      else if (z === 'piers') mat = n > .55 ? 'gravel' : 'sand';
      else if (z === 'cave') mat = n > .45 ? 'cave' : 'gravel';
      else if (z === 'westroad') mat = n > .58 ? 'tall' : n2 > .45 ? 'grass' : 'soil';
      else mat = cy < 14 ? (n > .45 ? 'tall' : n2 > .6 ? 'ash' : 'grass') : (n > .55 ? 'grass' : n2 > .6 ? 'tall' : 'soil');
      if (toCoast < 2.6) mat = 'sand'; else if (toCoast < 6 && n > .45 && mat !== 'cave') mat = n2 > .5 ? 'gravel' : 'sand';
      for (const s of m.spaces || []) if (inR(s, cx, cy)) mat = s.type === 'square' ? 'plaza' : 'gravel';
      for (const r of m.roads || []) for (let i = 1; i < r.pts.length; i++) {
        const [ax, ay] = r.pts[i - 1], [bx, by] = r.pts[i];
        if (segDist(cx, cy, ax, ay, bx, by) <= r.width * .5) mat = r.width >= 5 ? 'cobble' : 'gravel';
      }
      for (const b of m.buildings || []) if (inR({ x: b.x - .5, y: b.y - .5, w: b.w + 1, h: b.h + 1 }, cx, cy)) mat = b.type === 'cave' ? 'cave' : 'soil';
      grid[y * gw + x] = id(mat);
    }
    TX.grid = grid;
  }
  const matAt = (tx, ty) => grid[Math.max(0, Math.min(gh - 1, ty)) * gw + Math.max(0, Math.min(gw - 1, tx))];

  // ---- chunk compose (incremental: a few rows at a time, ~5 ms of work per frame) ---------------------------------
  const chunks = new Map(), jobs = new Map();
  TX.budgetMs = 5;
  TX.facadeScale = .86;   // facade width vs. collision footprint (doors come out ~1.3x a character's height)
  TX.treeScale = 1.35;   // trees vs. their art size (about 2.5-3 characters tall)
  TX.brighten = 1.12;    // ground textures are lifted a little so characters stand out
  function texturesReady() { return MATS.every(n => tex(n)); }
  function startJob(cx, cy) {
    const c = document.createElement('canvas'); c.width = c.height = CPX;
    const ctx = c.getContext('2d'), out = ctx.createImageData(CPX, CPX);
    const ox = cx * CPX, oy = cy * CPX, S = 8, n = CPX / S + 2, wx = new Float32Array(n * n), wy = new Float32Array(n * n);
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const X = (ox + i * S) / 23, Y = (oy + j * S) / 23;
      wx[j * n + i] = (vnoise(X, Y, 11) - .5) * 44 + (vnoise(X * 3, Y * 3, 12) - .5) * 12;
      wy[j * n + i] = (vnoise(X, Y, 21) - .5) * 44 + (vnoise(X * 3, Y * 3, 22) - .5) * 12;
    }
    return { c, ctx, out, ox, oy, S, n, wx, wy, row: 0 };
  }
  function runJob(J, until) {
    const o = J.out.data, T = MATS.map(n => tex(n)), bomb = MATS.map(n => BOMB.has(n)), { ox, oy, S, n, wx, wy } = J;
    while (J.row < CPX && performance.now() < until) {
      for (let r = 0; r < 16 && J.row < CPX; r++, J.row++) {
        const py = J.row, fj = py / S, j0 = fj | 0, tj = fj - j0;
        for (let px = 0; px < CPX; px++) {
          const fi = px / S, i0 = fi | 0, ti = fi - i0, k = j0 * n + i0;
          const dx = (wx[k] * (1 - ti) + wx[k + 1] * ti) * (1 - tj) + (wx[k + n] * (1 - ti) + wx[k + n + 1] * ti) * tj;
          const dy = (wy[k] * (1 - ti) + wy[k + 1] * ti) * (1 - tj) + (wy[k + n] * (1 - ti) + wy[k + n + 1] * ti) * tj;
          const gx = ox + px, gy = oy + py;
          const m = matAt(Math.floor((gx + dx) / 32), Math.floor((gy + dy) / 32));
          const t = T[m]; let sx = gx, sy = gy;
          if (bomb[m]) { const cx2 = Math.floor((gx + dx * .8) / 100), cy2 = Math.floor((gy + dy * .8) / 100), hk = cx2 * 7919 + cy2 * 104729;
            sx += (hk * 2654435761 >>> 0) % t.w; sy += (hk * 2246822519 >>> 0) % t.h; }
          const q = (((sy % t.h) * t.w) + (sx % t.w)) * 4, p = (py * CPX + px) * 4;
          o[p] = t.d[q]; o[p + 1] = t.d[q + 1]; o[p + 2] = t.d[q + 2]; o[p + 3] = 255;
        }
      }
    }
    if (J.row < CPX) return null;
    J.ctx.putImageData(J.out, 0, 0); TX.stats.built++; return J.c;
  }
  let frameUntil = 0;
  function chunk(cx, cy) {
    const k = cx + ',' + cy; let c = chunks.get(k);
    if (c) { chunks.delete(k); chunks.set(k, c); return c; }
    let J = jobs.get(k); if (!J) { J = startJob(cx, cy); jobs.set(k, J); }
    c = runJob(J, frameUntil);
    if (!c) return null;
    jobs.delete(k); chunks.set(k, c);
    while (chunks.size > TX.cacheSize) chunks.delete(chunks.keys().next().value);
    return c;
  }
  function prefetch(x0, x1, y0, y1, mw, mh) {          // one ring around the view, with whatever budget is left
    for (let y = y0 - 1; y <= y1; y++) for (let x = x0 - 1; x <= x1; x++) {
      if (performance.now() >= frameUntil) return;
      if (x < 0 || y < 0 || x >= mw || y >= mh || chunks.has(x + ',' + y)) continue;
      chunk(x, y);
    }
  }
  TX.buildChunk = (cx, cy) => { const J = startJob(cx, cy); return runJob(J, Infinity); };
  const active = g => TX.enabled && g.mapId === MAP && grid && texturesReady();

  // ---- terrain + sea ---------------------------------------------------------------------------------------------
  const drawTerrain = P.drawTerrain;
  P.drawTerrain = function (view) {
    if (TX.enabled && this.mapId === MAP && !grid) buildGrid(this);
    if (!active(this)) return drawTerrain.apply(this, arguments);
    TX.ready = true; frameUntil = performance.now() + TX.budgetMs;
    const m = this.map(), T = 32, span = CPX;
    const x0 = Math.max(0, Math.floor(view.x0 / span)), x1 = Math.min(Math.ceil(m.w / CH), Math.ceil(view.x1 / span));
    const y0 = Math.max(0, Math.floor(view.y0 / span)), y1 = Math.min(Math.ceil(m.h / CH), Math.ceil(view.y1 / span));
    g.imageSmoothingEnabled = false;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const c = chunk(x, y), px = x * span, py = y * span;
      if (c) { g.drawImage(c, px, py); TX.stats.chunks++; }
      else if (!SPRITES.draw(g, 'painted/' + this.mapId + '/' + x + '/' + y, px, py, Math.min(span, m.w * T - px), Math.min(span, m.h * T - py))) this.fill(px, py, span, span, '#5d5346');
    }
    prefetch(x0, x1, y0, y1, Math.ceil(m.w / CH), Math.ceil(m.h / CH));
    // Run the rest of the terrain chain (terrain decals and rain puddles from world-detail) with the old painted
    // chunks switched off; the old sea it draws is covered by the new sea below.
    const draw = SPRITES.draw;
    SPRITES.draw = function (ctx, key) { if (String(key).startsWith('painted/' + MAP + '/')) return true; return draw.apply(this, arguments); };
    try { drawTerrain.apply(this, arguments); } finally { SPRITES.draw = draw; }
    drawSea(this, view);
  };
  function drawSea(game, view) {
    const m = game.map(), T = 32;
    if (view.y1 < (m.waterStart - game.floodRise()) * T - 40) return;
    const west = Math.max(0, Math.floor(view.x0 / 8) * 8), east = Math.min(m.w * T, Math.ceil(view.x1 / 8) * 8);
    const line = new Path2D(); line.moveTo(west, game.coastY(west));
    for (let x = west + 8; x <= east; x += 8) line.lineTo(x, game.coastY(x));
    const water = new Path2D(line); water.lineTo(east, m.h * T); water.lineTo(west, m.h * T); water.closePath();
    const t = performance.now() / 1000;
    const deep = pattern(g, 'deep'), shal = pattern(g, 'shallows');
    g.save(); g.clip(water);
    if (deep) { deep.setTransform(new DOMMatrix().translate(t * 5 % 256, t * 2.2 % 256)); g.fillStyle = deep; g.fill(water); }
    if (shal) { // shallows band fading into the deep water
      shal.setTransform(new DOMMatrix().translate(-t * 3 % 256, t * 1.5 % 256));
      for (const [off, a] of [[0, .95], [34, .7], [70, .42], [108, .2]]) {
        const band = new Path2D(); band.moveTo(west, game.coastY(west) + off);
        for (let x = west + 8; x <= east; x += 8) band.lineTo(x, game.coastY(x) + off);
        for (let x = east; x >= west; x -= 8) band.lineTo(x, game.coastY(x) - 2);
        band.closePath(); g.globalAlpha = a * .5; g.fillStyle = shal; g.fill(band);
      }
      g.globalAlpha = 1;
    }
    // surf strip along the waterline (content cropped from the art, repeated)
    const s = surf();
    if (s) {
      const bob = Math.sin(t * 1.3) * 2.5;
      for (let x = Math.floor(west / s.w) * s.w; x < east + s.w; x += s.w - 6) {
        const y = game.coastY(x + s.w / 2);
        g.globalAlpha = .82; g.drawImage(s.c, x, y - s.h * .35 + bob, s.w, s.h);
      }
      g.globalAlpha = 1;
    }
    g.restore();
  }
  let surfCache = null;
  function surf() {
    if (surfCache) return surfCache; const im = img(EDGE.surf); if (!ok(im)) return null;
    const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight;
    const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(im, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height).data; let x0 = c.width, x1 = 0, y0 = c.height, y1 = 0;
    for (let y = 0; y < c.height; y++) for (let i = 0; i < c.width; i++) if (d[(y * c.width + i) * 4 + 3] > 8) { x0 = Math.min(x0, i); x1 = Math.max(x1, i); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    if (x1 <= x0) return null;
    const out = document.createElement('canvas'); out.width = x1 - x0 + 1; out.height = y1 - y0 + 1;
    out.getContext('2d').drawImage(c, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
    return (surfCache = { c: out, w: out.width, h: out.height });
  }

  // ---- roads and docks -------------------------------------------------------------------------------------------
  const drawRoads = P.drawRoads;
  P.drawRoads = function () { if (active(this)) return; return drawRoads.apply(this, arguments); };
  const drawDocks = P.drawDocks;
  P.drawDocks = function (view) {
    if (!active(this)) return drawDocks.apply(this, arguments);
    const pat = SPRITES.pattern, plank = pattern(g, 'plank');
    SPRITES.pattern = function (ctx, key) { return key === 'coast/materials/deck' && plank ? plank : pat.apply(this, arguments); };
    try { return drawDocks.apply(this, arguments); } finally { SPRITES.pattern = pat; }
  };

  // ---- scenery sprites -------------------------------------------------------------------------------------------
  function sprite(alias, x, footY, h, mirror) {
    const im = img(alias); if (!ok(im)) return false;
    const w = h * im.naturalWidth / im.naturalHeight;
    TX.stats.sprites++;
    return coastSprite(alias, x, footY, w, h, mirror) !== false;
  }
  const pick = (list, a, b, s) => list[Math.floor(hash(Math.round(a * 10), Math.round(b * 10), s) * list.length)];
  const coastTree = P.coastTree;
  P.coastTree = function (o) {
    if (!active(this)) return coastTree.apply(this, arguments);
    const x = (o.x + o.w * .45) * 32, y = (o.y + o.h * .55) * 32;
    const list = o.y < 20 ? TREES.north : o.y > 60 ? TREES.coast : TREES.mid, name = pick(list, o.x, o.y, 5);
    const h = (name.includes('broadleaf') ? 144 : name.includes('dead') ? 128 : 160) * TX.treeScale * (0.9 + hash(o.x * 7 | 0, o.y * 7 | 0, 6) * 0.3);
    this.draw25Shadow?.(x, y + 1, h * .22, 6, .2);
    if (!sprite(name, x, y + 4, h, hash(o.x | 0, o.y | 0, 8) > .5)) return coastTree.apply(this, arguments);
  };
  // Remap the old prop/plant/rock art inside the scene pass.
  const drawScene = P.drawCoastScene;
  P.drawCoastScene = function (view) {
    if (!active(this)) return drawScene.apply(this, arguments);
    drawEdges(this, view);
    const old = window.coastSprite, game = this;
    window.coastSprite = function (key, x, footY, w, h, mirror) {
      const k = String(key || ''), a = x / 32, b = footY / 32;
      let alias = null, hh = h;
      if (/^coast\/(props\/(grass|reed|flowers|yellow-flowers|shore-debris|forest-debris)|foliage\/)/.test(k) || /^coast\/props\/(green-scrub|red-scrub)/.test(k)) {
        const wet = game.isWater(x, footY + 40) || b > game.map().waterStart - 6;
        const shrub = /scrub|bracken|copper|forest-debris/.test(k);
        alias = pick(wet ? PLANTS.wet : shrub ? PLANTS.shrub : PLANTS.dry, a, b, 13); hh = shrub ? h * 1.05 : h * 1.25;
      } else if (/^coast\/props\/rock-/.test(k)) { alias = pick(ROCKS, a, b, 17); hh = h * 1.1; }
      else if (k === 'props/crate' || k === 'coast/props/crates') { alias = pick(CRATES, a, b, 19); hh = h * 1.1; }
      else if (PROPMAP[k]) { alias = PROPMAP[k][0]; hh = h * PROPMAP[k][1]; }
      if (alias && sprite(alias, x, footY, hh, mirror)) return;
      return old.apply(this, arguments);
    };
    try { return drawScene.apply(this, arguments); } finally { window.coastSprite = old; }
  };
  // Building facades
  const facade = P.coastFacade;
  P.coastFacade = function (b, view, room) {
    const alias = active(this) && FACADES[b.id], im = alias && img(alias);
    if (!ok(im)) return facade.apply(this, arguments);
    const T = 32, w = b.w * T * TX.facadeScale, h = w * im.naturalHeight / im.naturalWidth, x = (b.x + b.w / 2) * T, foot = (b.y + b.h) * T + 10;
    g.save(); g.imageSmoothingEnabled = false; g.drawImage(im, x - w / 2, foot - h, w, h); g.restore();
    TX.stats.facades++;
  };

  // ---- natural edges ---------------------------------------------------------------------------------------------
  const GAPS = { north: [[70, 83]], west: [[19, 30]], east: [] };   // tile ranges kept open (Storm Gate, West Passage)
  const inGap = (side, t) => GAPS[side].some(([a, b]) => t >= a && t <= b);
  let edgeList = null;
  function edges(game) {
    if (edgeList) return edgeList;
    const m = game.map(), T = 32, out = [], shore = m.waterStart - 3;
    for (let x = -2; x < m.w + 2; x += 7) {                       // north: dense forest
      if (inGap('north', x + 3)) continue;
      out.push({ a: pick(EDGE.tree, x, 0, 31), x: (x + 4) * T, y: (2.2 + hash(x, 1, 32) * .8) * T, h: 230 + hash(x, 2, 33) * 50 });
    }
    for (const side of ['west', 'east']) {                        // sides: forest down to the salt flats, rubble near the shore
      for (let y = 4; y < shore; y += 6) {
        if (inGap(side, y)) continue;
        const near = y > shore - 14, a = near ? pick(EDGE.rubble, y, side === 'west' ? 1 : 2, 34) : pick(EDGE.tree, y, side === 'west' ? 3 : 4, 35);
        out.push({ a, x: side === 'west' ? -1.2 * T : (m.w + 1.2) * T, y: (y + 3) * T, h: near ? 120 : 210 + hash(y, 5, 36) * 40, mirror: side === 'east' });
      }
    }
    return (edgeList = out.sort((p, q) => p.y - q.y));
  }
  function drawEdges(game, view) {
    for (const e of edges(game)) {
      if (e.y < view.y0 - 40 || e.y - e.h > view.y1 + 40 || e.x < view.x0 - 260 || e.x > view.x1 + 260) continue;
      if (sprite(e.a, e.x, e.y, e.h, e.mirror)) TX.stats.edges++;
    }
    // darken the outer forest band so the map border reads as deep woods
    const m = game.map(), T = 32;
    if (view.y0 < 3 * T) { const gr = g.createLinearGradient(0, 0, 0, 3 * T); gr.addColorStop(0, 'rgba(8,10,10,.75)'); gr.addColorStop(1, 'rgba(8,10,10,0)'); g.fillStyle = gr; g.fillRect(view.x0, 0, view.x1 - view.x0, 3 * T); }
  }
  // Edge band collision: the scenery is solid, exits stay open.
  const walkable = P.walkable;
  P.walkable = function (x, y) {
    if (TX.enabled && this.mapId === MAP) {
      const m = this.map(), T = 32, tx = x / T, ty = y / T;
      if (ty < 2.0 && !inGap('north', tx)) return false;
      if (ty < m.waterStart - 3) {
        if (tx < 1.4 && !inGap('west', ty)) return false;
        if (tx > m.w - 1.4 && !inGap('east', ty)) return false;
      }
    }
    return walkable.apply(this, arguments);
  };

  // Closer default camera on the Quays (the old "Wide" default made characters tiny); a saved choice wins.
  const camDef = P.cameraScaleDefault;
  P.cameraScaleDefault = function (id = this.mapId) {
    const v = camDef.apply(this, arguments);
    let chosen = null; try { chosen = localStorage.getItem('saltwake.alpha.camera'); } catch (e) { }
    return TX.enabled && id === MAP && !chosen ? v * (TX.camera / .66) : v;
  };
  TX.camera = .95;
  TX.set = on => { TX.enabled = !!on; try { localStorage.setItem('saltwake.tiles', on ? 'on' : 'off'); } catch (e) { } };
  TX.materialAt = (tx, ty) => grid ? MATS[matAt(tx, ty)] : null;
  TX.reset = () => { grid = null; chunks.clear(); jobs.clear(); edgeList = null; };
  // Graphics panel toggle
  const gp = P.graphicsPanel;
  P.graphicsPanel = function () {
    const out = gp.apply(this, arguments), root = document.getElementById('panel')?.querySelector('.engineOptions');
    root?.insertAdjacentHTML('beforeend', `<label class="engineCheck"><input id="swTiles" type="checkbox" ${TX.enabled ? 'checked' : ''}> New Outer Quays art (tile map)</label>`);
    const el = document.getElementById('swTiles'); if (el) el.onchange = e => TX.set(e.target.checked);
    return out;
  };
  // Warm up textures early.
  for (const n of [...MATS, 'deep', 'shallows', 'plank']) img(TEX[n]);
})();
