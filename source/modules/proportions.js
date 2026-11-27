/* SALTWAKE proportions (v0.31): one consistent scale for everything in the world.
 * Sizes are measured from the ACTUAL visible pixels of each sprite (its opaque bounding box, not the padded image)
 * and drawn so that every thing has a sensible real-world height. Reference: an adult = HUMAN world px (~1.75 m),
 * so 1 m ~= HUMAN / 1.75. Anchored at the feet, so ground contact, depth sorting, collision and hit boxes are unchanged.
 *   People   - Ren, story cast, townsfolk, escorts, Wreckers, Brineworn: all HUMAN tall (Breaker: a hulking 2.2 m).
 *   Monsters - per species (Brineback, Salt Widow, Grazer, Redhook gull); apexes keep their extra size on top.
 *   Props    - per prop, real-world heights (barrel 1 m, pump 1.4 m, lantern post 2.6 m ...).
 * Every path keeps working if a measurement is not available yet (first frame draws at the old size).
 * window.saltwakeProportions exposes the tables and measured factors for QA.
 */
(() => {
  const P = Game.prototype;
  const HUMAN = 80, M = HUMAN / 1.75;
  const CREATURE = { brineback: 104, widow: 80, grazer: 84, gull: 34, brineworn_breaker: Math.round(2.2 * M), tidemaw: 0 };
  const PROP_M = {   // real-world height in metres of the visible prop
    barrel_01: 1, barrel_02: 1, crate_01: .75, crate_02: .75, crate_03: .75, crate_stack: 1.4, chest_common: .6, chest_rare: .65, open_supply_crate: .7,
    supply_sacks: 1, salt_sack_pile: 1.05, wheelbarrow: 1, hand_cart: 1.25, cart_wreck: 1.35, hand_water_pump: 1.45, well: 1.6, fence_wood: 1.1, broken_fence: 1, fence_iron: 1.2,
    lantern_post: 2.6, lantern_post_variant: 2.6, notice_board: 1.95, signpost: 1.85, bench: .85, campfire: .65, brazier: 1.05, carpenter_workbench: 1.35, tool_rack: 1.9,
    storage_shelf: 2, fish_cleaning_station: 1.25, fish_drying_rack: 1.9, net_rack: 2, hanging_net_frame: 2.1, fish_basket: .55, statue_hunter: 3.3, stone_relic: 2.2,
    tent_supplies: 1.8, salvage_debris: 1.15, dinghy_wrecked: .95, anchor: 1.45, rope_coil: .4, bone_pile_01: .5, bone_pile_02: .5, carcass_01: .75, carcass_02: .75,
    nest_01: .75, nest_02: .75, mooring_post_rope: 1, bollard: .75, chain_post: 1.15, salt_processing_trough: 1, cache_bundle: .55, body_satchel: .35, wall_lantern: .9,
    hanging_lantern: 1.4, bedroll: .4, fountain: 2.6, repair_bench: 1.1,
  };
  const PR = window.saltwakeProportions = { HUMAN, CREATURE, PROP_M, factors: {}, stats: { people: 0, creatures: 0, props: 0, measured: 0 }, enabled: true };

  // ---- opaque bounding box of an image region (cached) ------------------------------------------------------------
  const BOX = new WeakMap(), cv = document.createElement('canvas'), cx = cv.getContext('2d', { willReadFrequently: true });
  function box(src, sx, sy, sw, sh) {
    let m = BOX.get(src); if (!m) { m = new Map(); BOX.set(src, m); }
    const k = sx + ',' + sy + ',' + sw + ',' + sh; if (m.has(k)) return m.get(k);
    let r = null;
    try { cv.width = Math.max(1, sw | 0); cv.height = Math.max(1, sh | 0); cx.clearRect(0, 0, cv.width, cv.height); cx.drawImage(src, sx, sy, sw, sh, 0, 0, cv.width, cv.height);
      const d = cx.getImageData(0, 0, cv.width, cv.height).data, W = cv.width, H = cv.height; let t = H, b = -1;
      for (let y = 0; y < H; y++) { for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > 40) { if (t === H) t = y; b = y; break; } }
      if (b >= 0) r = [t / H, (b + 1) / H]; } catch (e) { r = null; }
    if (r || (src.complete !== false)) m.set(k, r); PR.stats.measured++; return r;
  }
  PR.box = box;
  const worldScale = () => { const G = window.SALTWAKE_DEV?.game; return (G?.camera?.zoom || 1) * (window.saltwakeHiRes?.enabled !== false ? (window.saltwakeHiRes?.scale || 1) : 1); };

  // ---- normalise one draw call: scale everything it draws around (ax, ay) so its main body is `target` tall -------
  const ST = new Map();
  function normalized(key, ax, ay, target, fn, self, args) {
    if (!PR.enabled || !(target > 0)) return fn.apply(self, args);
    const st = ST.get(key) || (ST.set(key, { raw: null }), ST.get(key)), k = st.raw ? Math.max(.25, Math.min(4, target / st.raw)) : 1;
    PR.factors[key] = +k.toFixed(3);
    const draw = g.drawImage, own = Object.prototype.hasOwnProperty.call(g, 'drawImage'); let best = 0;
    g.drawImage = function (src) {
      if (st.raw == null && src && !src.isSil && (arguments.length === 9 || arguments.length === 5)) {
        let sx = 0, sy = 0, sw = src.naturalWidth || src.width, sh = src.naturalHeight || src.height, dh;
        if (arguments.length === 9) { sx = arguments[1]; sy = arguments[2]; sw = arguments[3]; sh = arguments[4]; dh = arguments[8]; } else dh = arguments[4];
        const t = g.getTransform(), sy2 = Math.hypot(t.b, t.d), vis0 = Math.abs(dh) * sy2 / worldScale();
        if (PR.trace) { const b = box(src, sx, sy, sw, sh); (PR.trace[key] ||= []).push([src.tagName === 'CANVAS' ? 'c' + src.width + 'x' + src.height : String(src.src).slice(-24), Math.round(vis0), b && Math.round(vis0 * (b[1] - b[0]))]); }
        if (vis0 >= 18) { const b = box(src, sx, sy, sw, sh); if (b) best = Math.max(best, vis0 * (b[1] - b[0])); }
      }
      return draw.apply(g, arguments);
    };
    g.save(); if (k !== 1) { g.translate(ax, ay); g.scale(k, k); g.translate(-ax, -ay); }
    try { return fn.apply(self, args); } finally { g.restore(); if (st.raw == null && best > 0) st.raw = best; if (own) g.drawImage = draw; else delete g.drawImage; }
  }
  PR.normalized = normalized;

  // ---- people ----------------------------------------------------------------------------------------------------
  for (const name of ['coastPlayer', 'draw25Player']) {
    const f = P[name]; if (!f) continue;
    P[name] = function () { PR.stats.people++; const p = this.player; return normalized('player', p.x, p.y + 4, HUMAN, f, this, arguments); };
  }
  const cp = P.coastPerson;
  if (cp) P.coastPerson = function (x, y, faction, role) { PR.stats.people++; return normalized('person:' + (role || faction || '?'), x, y + 4, HUMAN, cp, this, arguments); };
  function wrapFaces() { const F = window.saltwakeFaces; if (!F || F.__prop || typeof F.render !== 'function') return; const r = F.render;
    F.render = function (ctx, profile, dir, mirror, frame, x, y, w, h) { if (ctx !== g || typeof x !== 'number') return r.apply(this, arguments); PR.stats.people++;
      return normalized('face:' + (profile?.id || profile?.role || '?') + ':' + dir, x, y, HUMAN, r, this, arguments); };
    F.__prop = true; }
  wrapFaces(); setTimeout(wrapFaces, 0); setTimeout(wrapFaces, 1000);

  // ---- monsters and field humans (all go through veinEnemyArt) ---------------------------------------------------
  if (typeof veinEnemyArt === 'function') {
    const art = veinEnemyArt;
    veinEnemyArt = function (G, e) {
      if (!e) return art.apply(this, arguments);
      const human = e.actorType === 'human' || /^brineworn_(drifter|caller)|wrecker/.test(e.type);
      const base = CREATURE[e.type] ?? (human ? HUMAN : null); if (!base) return art.apply(this, arguments);
      PR.stats[human ? 'people' : 'creatures']++;
      return normalized('mon:' + e.type + ':' + (e.apexScale || 1), e.x, e.y + 10, base * (e.apexScale || 1), art, this, arguments);
    };
  }

  // ---- props drawn through the scene sprite entry point -----------------------------------------------------------
  const IM = () => window.SALTWAKE_ASSETS?.images || {}, imgs = {};
  const img = a => { if (a in imgs) return imgs[a]; const s = IM()[a]; if (!s) return (imgs[a] = null); const i = new Image(); i.src = s; return (imgs[a] = i); };
  const cs = window.coastSprite;
  if (typeof cs === 'function') {
    window.coastSprite = function (key, x, footY, w, h, mirror) {
      const k = String(key || ''), m = /^art\/props\/([a-z0-9_]+)$/.exec(k), meters = m && PROP_M[m[1]];
      if (PR.enabled && meters && typeof h === 'number') {
        const im = img(k); if (im && im.complete && im.naturalWidth) { const b = box(im, 0, 0, im.naturalWidth, im.naturalHeight);
          if (b) { const vis = h * (b[1] - b[0]), s = (meters * M) / vis; if (s > 0 && isFinite(s)) { PR.stats.props++; PR.factors[k] = +s.toFixed(3);
            // keep the feet where they were: the image bottom padding scales too
            return cs.call(this, key, x, footY + h * (1 - b[1]) * (1 - s), w * s, h * s, mirror); } } }
      }
      return cs.apply(this, arguments);
    };
  }
})();
