/* SALTWAKE tile maps (v0.31): renders every map built by tools/make_maps.py ("tilemap": true in world data).
 *
 * Ground: per tile a material from the map's ground paint list (fill, noisy areas, blobs, rects, roads; sand along
 *   the live coastline). Chunks of 16x16 tiles are composed per pixel from the seamless art/tiles textures with
 *   noise-warped borders and texture bombing; a few rows per frame (~5 ms) and nearby chunks ahead of time.
 * Sea: deep water + shallows band + surf strip below the live coastline (the tide moves it). Docks use planks.
 * Scenery: the map's scene.decor (art objects, depth-sorted with actors by the engine's scene pass) and lights.
 *   Buildings draw their "art" facade at the shared art scale; every building is closed scenery (no interiors).
 * Collision: the map's decor holds only collision helpers ("ghost": true, never drawn); blocked rects (edge band)
 *   minus openings (exits) are solid; walk checks only look at nearby colliders (spatial bins).
 * Arrivals: setArea() to a tilemap map maps old hard-coded positions to the new ones ("arrivals.legacy") and moves an
 *   unwalkable arrival to the nearest walkable tile; the engine's eight wildlife spawns use "spawns".
 * The old harbor frame is switched off (window.SALTWAKE_NEW_HUB): the hub is a normal map in this renderer.
 * window.saltwakeTiles exposes settings, material lookup and counters for QA.
 */
(() => {
  const P = Game.prototype, IMGS = () => (window.SALTWAKE_ASSETS && window.SALTWAKE_ASSETS.images) || {};
  const CH = 16, CPX = CH * 32, ART_SCALE = 1.4;
  window.SALTWAKE_NEW_HUB = true;
  const TX = window.saltwakeTiles = { enabled: true, ready: false, stats: { chunks: 0, built: 0, sprites: 0, facades: 0, remaps: 0 }, cacheSize: 48,
    budgetMs: 5, camera: .95, brighten: 1.1, desat: .18 };
  const isTile = m => !!(m && m.tilemap);

  // ---- art -------------------------------------------------------------------------------------------------------
  const TEX = { cobble: 'art/tiles/cobble_road', plaza: 'art/tiles/stone_plaza', gravel: 'art/tiles/gravel', soil: 'art/tiles/packed_soil',
    mud: 'art/tiles/wet_mud', grass: 'art/tiles/grass_short', tall: 'art/tiles/grass_tall', salt: 'art/tiles/red_salt_crust',
    sand: 'art/tiles/sand_beach', cave: 'art/tiles/cave_floor', ash: 'art/tiles/ash_drift', shallows: 'art/tiles/shallows',
    deep: 'art/tiles/deep_sea', plank: 'art/tiles/plank_deck' };
  const MATS = ['cobble', 'plaza', 'gravel', 'soil', 'mud', 'grass', 'tall', 'salt', 'sand', 'cave', 'ash'];
  const SCALE = { cobble: .36, plaza: .4, gravel: .4, soil: .42, mud: .4, grass: .42, tall: .42, salt: .42, sand: .42, cave: .42, ash: .42,
    shallows: .45, deep: .45, plank: .42 };
  const BOMB = new Set(['gravel', 'soil', 'mud', 'grass', 'tall', 'salt', 'sand', 'cave', 'ash']);
  const SURF = 'art/edges/surf_strip';
  const PLANTS = ['art/plants/grass_tuft_01', 'art/plants/grass_tuft_03', 'art/plants/reeds_01', 'art/plants/shrub_01', 'art/plants/shrub_02'];
  const ROCKS = ['art/rocks/rock_large_01', 'art/rocks/rock_small_02'];
  const PROPMAP = { 'coast/props/lantern': ['art/props/lantern_post_variant', 1.25], 'coast/props/brazier': ['art/props/brazier', 1.1],
    'coast/props/shingle': ['art/props/notice_board', 1.15], 'coast/props/stone-well': ['art/props/well', 1.05],
    'coast/props/cargo-hoist': ['art/buildings/crane', 1.7], 'props/chest': ['art/props/chest_common', 1.15], 'props/crate': ['art/props/crate_01', 1.1],
    'coast/props/crates': ['art/props/crate_stack', 1.1] };

  const imgs = {};
  function img(alias) { if (alias in imgs) return imgs[alias]; const src = IMGS()[alias]; if (!src) return (imgs[alias] = null); const im = new Image(); im.decoding = 'async'; im.src = src; return (imgs[alias] = im); }
  const ok = im => im && im.complete && im.naturalWidth > 0;
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
    const ds = name === 'deep' || name === 'shallows' ? 0 : TX.desat;   // muted ground so characters read first
    if (k !== 1 || ds) { for (let i = 0; i < d.length; i += 4) { const L = (d[i] * .3 + d[i + 1] * .59 + d[i + 2] * .11);
      d[i] = Math.min(255, (d[i] + (L - d[i]) * ds) * k); d[i + 1] = Math.min(255, (d[i + 1] + (L - d[i + 1]) * ds) * k); d[i + 2] = Math.min(255, (d[i + 2] + (L - d[i + 2]) * ds) * k); } x.putImageData(id, 0, 0); }
    return (texData[name] = { w: W, h: H, d, canvas: c });
  }
  const pats = {};
  function pattern(ctx, name) { if (pats[name]) return pats[name]; const t = tex(name); if (!t) return null; return (pats[name] = ctx.createPattern(t.canvas, 'repeat')); }
  const texturesReady = () => MATS.every(n => tex(n));

  // ---- noise (mirrors tools/make_maps.py) ------------------------------------------------------------------------
  const hash = (x, y, s) => { let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 2147483647)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const smooth = t => t * t * (3 - 2 * t);
  function vnoise(x, y, s) { const xi = Math.floor(x), yi = Math.floor(y), xf = smooth(x - xi), yf = smooth(y - yi);
    const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s);
    return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf; }
  const segDist = (px, py, ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy; let t = L ? ((px - ax) * dx + (py - ay) * dy) / L : 0; t = Math.max(0, Math.min(1, t)); return Math.hypot(px - ax - dx * t, py - ay - dy * t); };

  // ---- per-map state ---------------------------------------------------------------------------------------------
  const state = {};
  function S(game) {
    const id = game.mapId, m = game.map();
    let s = state[id];
    if (s && s.m === m) return s;
    s = state[id] = { m, grid: null, chunks: new Map(), jobs: new Map(), bins: null };
    return s;
  }
  function buildGrid(game, s) {
    const m = s.m, gw = m.w, gh = m.h, grid = new Uint8Array(gw * gh), id = n => Math.max(0, MATS.indexOf(n)), T = 32;
    const coast = x => (m.waterStart * T + Math.sin(x / 360) * 23 + Math.sin(x / 93) * 8) / T;
    for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
      const cx = x + .5, cy = y + .5; let mat = 'soil';
      for (const op of m.ground || []) {
        if (op.fill) mat = op.fill;
        else if (op.area) { const [ax, ay, aw, ah] = op.area; if (cx >= ax && cx < ax + aw && cy >= ay && cy < ay + ah) {
          const n = vnoise(x / 7, y / 7, 3); if (op.alt && n > 1 - (op.p ?? .3)) mat = op.alt; else if (op.base == null || n > 1 - op.base) mat = op.m; } }
        else if (op.blob) { const [bx, by, r] = op.blob, rr = r * (.75 + .5 * vnoise(x / 5, y / 5, 7));
          if (Math.hypot(cx - bx, cy - by) < rr) mat = op.alt && vnoise(x / 6, y / 6, 5) > 1 - (op.p ?? .3) ? op.alt : op.m; }
        else if (op.rect) { const [ax, ay, aw, ah] = op.rect; if (cx >= ax && cx < ax + aw && cy >= ay && cy < ay + ah) mat = op.m; }
        else if (op.road) { const p = op.road; for (let i = 1; i < p.length; i++) if (segDist(cx, cy, p[i - 1][0], p[i - 1][1], p[i][0], p[i][1]) <= op.w / 2) { mat = op.m; break; } }
      }
      if (cy > coast(cx * T) - 2.6) mat = 'sand';
      grid[y * gw + x] = id(mat);
    }
    s.grid = grid; s.gw = gw; s.gh = gh;
  }
  const matAt = (s, tx, ty) => s.grid[Math.max(0, Math.min(s.gh - 1, ty)) * s.gw + Math.max(0, Math.min(s.gw - 1, tx))];

  // ---- chunk compose (incremental) -------------------------------------------------------------------------------
  function startJob(cx, cy) {
    const c = document.createElement('canvas'); c.width = c.height = CPX;
    const ctx = c.getContext('2d'), out = ctx.createImageData(CPX, CPX);
    const ox = cx * CPX, oy = cy * CPX, St = 8, n = CPX / St + 2, wx = new Float32Array(n * n), wy = new Float32Array(n * n);
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const X = (ox + i * St) / 23, Y = (oy + j * St) / 23;
      wx[j * n + i] = (vnoise(X, Y, 11) - .5) * 44 + (vnoise(X * 3, Y * 3, 12) - .5) * 12;
      wy[j * n + i] = (vnoise(X, Y, 21) - .5) * 44 + (vnoise(X * 3, Y * 3, 22) - .5) * 12;
    }
    return { c, ctx, out, ox, oy, St, n, wx, wy, row: 0 };
  }
  function runJob(s, J, until) {
    const o = J.out.data, Tx = MATS.map(n => tex(n)), bomb = MATS.map(n => BOMB.has(n)), { ox, oy, St, n, wx, wy } = J;
    while (J.row < CPX && performance.now() < until) {
      for (let r = 0; r < 16 && J.row < CPX; r++, J.row++) {
        const py = J.row, fj = py / St, j0 = fj | 0, tj = fj - j0;
        for (let px = 0; px < CPX; px++) {
          const fi = px / St, i0 = fi | 0, ti = fi - i0, k = j0 * n + i0;
          const dx = (wx[k] * (1 - ti) + wx[k + 1] * ti) * (1 - tj) + (wx[k + n] * (1 - ti) + wx[k + n + 1] * ti) * tj;
          const dy = (wy[k] * (1 - ti) + wy[k + 1] * ti) * (1 - tj) + (wy[k + n] * (1 - ti) + wy[k + n + 1] * ti) * tj;
          const gx = ox + px, gy = oy + py, m = matAt(s, Math.floor((gx + dx) / 32), Math.floor((gy + dy) / 32)), t = Tx[m];
          let sx = gx, sy = gy;
          if (bomb[m]) { const c2 = Math.floor((gx + dx * .8) / 100), d2 = Math.floor((gy + dy * .8) / 100), hk = c2 * 7919 + d2 * 104729;
            sx += (Math.imul(hk, 2654435761) >>> 0) % t.w; sy += (Math.imul(hk, 2246822519) >>> 0) % t.h; }
          const q = (((sy % t.h) * t.w) + (sx % t.w)) * 4, p = (py * CPX + px) * 4;
          o[p] = t.d[q]; o[p + 1] = t.d[q + 1]; o[p + 2] = t.d[q + 2]; o[p + 3] = 255;
        }
      }
    }
    if (J.row < CPX) return null;
    J.ctx.putImageData(J.out, 0, 0); TX.stats.built++; return J.c;
  }
  let frameUntil = 0;
  function chunk(s, cx, cy) {
    const k = cx + ',' + cy; let c = s.chunks.get(k);
    if (c) { s.chunks.delete(k); s.chunks.set(k, c); return c; }
    let J = s.jobs.get(k); if (!J) { J = startJob(cx, cy); s.jobs.set(k, J); }
    c = runJob(s, J, frameUntil); if (!c) return null;
    s.jobs.delete(k); s.chunks.set(k, c);
    while (s.chunks.size > TX.cacheSize) s.chunks.delete(s.chunks.keys().next().value);
    return c;
  }
  const active = g => TX.enabled && isTile(g.map());

  // ---- terrain + sea ---------------------------------------------------------------------------------------------
  const drawTerrain = P.drawTerrain;
  P.drawTerrain = function (view) {
    if (!active(this) || !texturesReady()) return drawTerrain.apply(this, arguments);
    const s = S(this); if (!s.grid) buildGrid(this, s);
    TX.ready = true; frameUntil = performance.now() + TX.budgetMs;
    const m = s.m, span = CPX, mw = Math.ceil(m.w / CH), mh = Math.ceil(m.h / CH);
    const x0 = Math.max(0, Math.floor(view.x0 / span)), x1 = Math.min(mw, Math.ceil(view.x1 / span));
    const y0 = Math.max(0, Math.floor(view.y0 / span)), y1 = Math.min(mh, Math.ceil(view.y1 / span));
    g.imageSmoothingEnabled = false;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const c = chunk(s, x, y); if (c) { g.drawImage(c, x * span, y * span); TX.stats.chunks++; } else this.fill(x * span, y * span, span, span, '#4f4639');
    }
    for (let y = y0 - 1; y <= y1 && performance.now() < frameUntil; y++) for (let x = x0 - 1; x <= x1; x++) {
      if (performance.now() >= frameUntil) break;
      if (x < 0 || y < 0 || x >= mw || y >= mh || s.chunks.has(x + ',' + y)) continue;
      chunk(s, x, y);
    }
    // Rest of the terrain chain (terrain decals + rain puddles) with the old painted chunks and old sea hidden.
    const draw = SPRITES.draw;
    SPRITES.draw = function (ctx, key) { if (String(key).startsWith('painted/')) return true; return draw.apply(this, arguments); };
    try { drawTerrain.apply(this, arguments); } finally { SPRITES.draw = draw; }
    drawSea(this, view);
  };
  let surfCache = null;
  function surf() {
    if (surfCache) return surfCache; const im = img(SURF); if (!ok(im)) return null;
    const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight;
    const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(im, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height).data; let x0 = c.width, x1 = 0, y0 = c.height, y1 = 0;
    for (let y = 0; y < c.height; y++) for (let i = 0; i < c.width; i++) if (d[(y * c.width + i) * 4 + 3] > 8) { x0 = Math.min(x0, i); x1 = Math.max(x1, i); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    if (x1 <= x0) return null;
    const out = document.createElement('canvas'); out.width = x1 - x0 + 1; out.height = y1 - y0 + 1;
    out.getContext('2d').drawImage(c, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
    return (surfCache = { c: out, w: out.width, h: out.height });
  }
  function drawSea(game, view) {
    const m = game.map(), T = 32;
    if (view.y1 < (m.waterStart - game.floodRise()) * T - 40) return;
    const west = Math.max(0, Math.floor(view.x0 / 8) * 8), east = Math.min(m.w * T, Math.ceil(view.x1 / 8) * 8);
    const line = new Path2D(); line.moveTo(west, game.coastY(west));
    for (let x = west + 8; x <= east; x += 8) line.lineTo(x, game.coastY(x));
    const water = new Path2D(line); water.lineTo(east, m.h * T); water.lineTo(west, m.h * T); water.closePath();
    const t = performance.now() / 1000, deep = pattern(g, 'deep'), shal = pattern(g, 'shallows');
    g.save(); g.clip(water);
    if (deep) { deep.setTransform(new DOMMatrix().translate(t * 5 % 256, t * 2.2 % 256)); g.fillStyle = deep; g.fill(water); }
    if (shal) {
      shal.setTransform(new DOMMatrix().translate(-t * 3 % 256, t * 1.5 % 256));
      for (const [off, a] of [[0, .95], [34, .7], [70, .42], [108, .2]]) {
        const band = new Path2D(); band.moveTo(west, game.coastY(west) + off);
        for (let x = west + 8; x <= east; x += 8) band.lineTo(x, game.coastY(x) + off);
        for (let x = east; x >= west; x -= 8) band.lineTo(x, game.coastY(x) - 2);
        band.closePath(); g.globalAlpha = a * .5; g.fillStyle = shal; g.fill(band);
      }
      g.globalAlpha = 1;
    }
    const sf = surf();
    if (sf) { const bob = Math.sin(t * 1.3) * 2.5; g.globalAlpha = .82;
      for (let x = Math.floor(west / sf.w) * sf.w; x < east + sf.w; x += sf.w - 6) g.drawImage(sf.c, x, game.coastY(x + sf.w / 2) - sf.h * .35 + bob, sf.w, sf.h);
      g.globalAlpha = 1; }
    g.restore();
  }

  // ---- roads, docks ----------------------------------------------------------------------------------------------
  const drawRoads = P.drawRoads;
  P.drawRoads = function () { if (active(this)) return; return drawRoads.apply(this, arguments); };
  const drawDocks = P.drawDocks;
  P.drawDocks = function () {
    if (!active(this)) return drawDocks.apply(this, arguments);
    const pat = SPRITES.pattern, plank = pattern(g, 'plank');
    SPRITES.pattern = function (ctx, key) { return key === 'coast/materials/deck' && plank ? plank : pat.apply(this, arguments); };
    try { return drawDocks.apply(this, arguments); } finally { SPRITES.pattern = pat; }
  };

  // ---- scene -----------------------------------------------------------------------------------------------------
  // Each tilemap map brings its own scene (art objects, lights); the old night-theme scene for that map is replaced.
  function installScenes(world) {
    for (const [id, m] of Object.entries(world.maps || {})) if (isTile(m) && m.scene) {
      SALTWAKE_VIS[id] = { ambience: m.scene.ambience || SALTWAKE_VIS[id]?.ambience, darkness: m.scene.darkness, lights: m.scene.lights || [], decor: m.scene.decor || [] };
    }
  }
  try { installScenes(WORLD); } catch (e) { }
  function sprite(alias, x, footY, h, mirror) {
    const im = img(alias); if (!ok(im)) return false;
    TX.stats.sprites++; return coastSprite(alias, x, footY, h * im.naturalWidth / im.naturalHeight, h, mirror) !== false;
  }
  const pick = (list, a, b, s) => list[Math.floor(hash(Math.round(a * 10), Math.round(b * 10), s) * list.length)];
  const drawScene = P.drawCoastScene;
  P.drawCoastScene = function (view) {
    if (!active(this)) return drawScene.apply(this, arguments);
    const m = this.map(), decor = m.decor, features = m.features;
    m.decor = decor.filter(o => !o.ghost); m.features = features.filter(f => !f.hidden);
    const old = window.coastSprite;
    window.coastSprite = function (key, x, footY, w, h, mirror) {
      const k = String(key || '');
      let alias = null, hh = h;
      if (/^coast\/(props\/(grass|reed|flowers|yellow-flowers|shore-debris|forest-debris|green-scrub|red-scrub)|foliage\/)/.test(k)) { alias = pick(PLANTS, x / 32, footY / 32, 13); hh = h * 1.2; }
      else if (/^coast\/props\/rock-/.test(k)) { alias = pick(ROCKS, x / 32, footY / 32, 17); hh = h * 1.1; }
      else if (PROPMAP[k]) { alias = PROPMAP[k][0]; hh = h * PROPMAP[k][1]; }
      if (alias && sprite(alias, x, footY, hh, mirror)) { TX.stats.remaps++; return; }
      return old.apply(this, arguments);
    };
    try { return drawScene.apply(this, arguments); } finally { window.coastSprite = old; m.decor = decor; m.features = features; }
  };
  // Building facades at the shared art scale, feet on the footprint's front edge.
  const facade = P.coastFacade;
  P.coastFacade = function (b) {
    const im = active(this) && b.art && img(b.art);
    if (!ok(im)) return facade.apply(this, arguments);
    const T = 32, k = ART_SCALE * (b.artScale || 1), w = im.naturalWidth * k, h = im.naturalHeight * k, x = (b.x + b.w / 2) * T, foot = (b.y + b.h) * T + 4;
    g.save(); g.imageSmoothingEnabled = false; g.drawImage(im, x - w / 2, foot - h, w, h); g.restore();
    TX.stats.facades++;
  };

  // ---- collision: edge band + spatial bins ------------------------------------------------------------------------
  const BIN = 8;
  function bins(s) {
    if (s.bins) return s.bins;
    const m = s.m, B = new Map(), put = (k, o, key) => { let e = B.get(k); if (!e) B.set(k, e = { decor: [], buildings: [] }); if (!e[key].includes(o)) e[key].push(o); };
    for (const o of m.decor) { const x = o.x + o.w * .45, y = o.y + o.h * .55;
      for (let by = Math.floor((y - 1.5) / BIN); by <= Math.floor((y + 1.5) / BIN); by++) for (let bx = Math.floor((x - 1.5) / BIN); bx <= Math.floor((x + 1.5) / BIN); bx++) put(bx + ',' + by, o, 'decor'); }
    for (const b of m.buildings) for (let by = Math.floor((b.y - 1.5) / BIN); by <= Math.floor((b.y + b.h + 1.5) / BIN); by++)
      for (let bx = Math.floor((b.x - 1.5) / BIN); bx <= Math.floor((b.x + b.w + 1.5) / BIN); bx++) put(bx + ',' + by, b, 'buildings');
    return (s.bins = B);
  }
  const EMPTY = { decor: [], buildings: [] };
  const inRect = (r, x, y) => x >= r[0] && x < r[0] + r[2] && y >= r[1] && y < r[1] + r[3];
  const blockedAt = (m, tx, ty) => (m.blocked || []).some(r => inRect(r, tx, ty)) && !(m.openings || []).some(r => inRect(r, tx, ty));
  const walkable = P.walkable;
  P.walkable = function (x, y) {
    if (!active(this)) return walkable.apply(this, arguments);
    const m = this.map();
    if (blockedAt(m, x / 32, y / 32)) return false;
    const e = bins(S(this)).get(Math.floor(x / 32 / BIN) + ',' + Math.floor(y / 32 / BIN)) || EMPTY;
    const D = m.decor, Bs = m.buildings; m.decor = e.decor; m.buildings = e.buildings;
    try { return walkable.apply(this, arguments); } finally { m.decor = D; m.buildings = Bs; }
  };

  // ---- arrivals and spawns ---------------------------------------------------------------------------------------
  function nearestWalkable(game, x, y) {
    for (let r = 0; r <= 12; r += .5) for (let k = 0, n = Math.max(1, Math.round(r * 8)); k < n; k++) {
      const a = k / n * Math.PI * 2, px = (x + Math.cos(a) * r) * 32, py = (y + Math.sin(a) * r) * 32;
      if (game.walkable(px, py) && !game.isWater(px, py)) return [px / 32, py / 32];
    }
    return [x, y];
  }
  TX.nearestWalkable = nearestWalkable;
  const setArea = P.setArea;
  P.setArea = function (id, x, y) {
    const m = this.world.maps[id];
    if (!TX.enabled || !isTile(m) || !m.arrivals) return setArea.apply(this, arguments);
    const from = this.mapId, hit = (m.arrivals.legacy || []).find(([ox, oy]) => Math.abs(ox - x) < .6 && Math.abs(oy - y) < .6);
    if (hit) [x, y] = [hit[2], hit[3]];
    const out = setArea.call(this, id, x, y);
    if (!this.walkable(this.player.x, this.player.y) || this.isWater(this.player.x, this.player.y)) {
      const [nx, ny] = nearestWalkable(this, x, y); this.player.x = nx * 32; this.player.y = ny * 32;
    }
    return out;
  };
  const spawn = P.spawnEnemies;
  P.spawnEnemies = function () {
    const list = spawn.apply(this, arguments), m = this.world.maps.quays;
    if (TX.enabled && isTile(m) && Array.isArray(list)) for (const e of list) {
      const i = /^e(\d+)$/.exec(e.id || ''), sp = i && m.spawns?.[+i[1]];
      if (sp) { const prev = this.mapId; this.mapId = 'quays'; let xy; try { xy = nearestWalkable(this, sp[0], sp[1]); } finally { this.mapId = prev; }
        e.x = e.homeX = xy[0] * 32; e.y = e.homeY = xy[1] * 32; }
    }
    return list;
  };

  // ---- camera ----------------------------------------------------------------------------------------------------
  const camDef = P.cameraScaleDefault;
  P.cameraScaleDefault = function (id = this.mapId) {
    const v = camDef.apply(this, arguments); let chosen = null; try { chosen = localStorage.getItem('saltwake.alpha.camera'); } catch (e) { }
    return TX.enabled && isTile(this.world.maps[id]) && !chosen ? v * (TX.camera / .66) : v;
  };
  TX.materialAt = (tx, ty, game = window.SALTWAKE_DEV?.game) => { if (!game) return null; const s = S(game); if (!s.grid) buildGrid(game, s); return MATS[matAt(s, tx, ty)]; };
  TX.buildChunk = (cx, cy, game = window.SALTWAKE_DEV?.game) => { const s = S(game); if (!s.grid) buildGrid(game, s); return runJob(s, startJob(cx, cy), Infinity); };
  TX.blockedAt = (tx, ty, game = window.SALTWAKE_DEV?.game) => blockedAt(game.map(), tx, ty);
  TX.reset = () => { for (const k in state) delete state[k]; };
  // F talks / interacts too (the old harbor used F for talking).
  addEventListener('keydown', e => {
    if (e.code !== 'KeyF' || e.repeat || e.ctrlKey || e.altKey || e.metaKey) return;
    const G = window.SALTWAKE_DEV?.game; if (!G || G.mode !== 'play' || G.panel || G.raid || !active(G)) return;
    if (e.target?.closest?.('input,textarea,select')) return;
    G.interact?.();
  });
  for (const n of Object.keys(TEX)) img(TEX[n]);
})();
