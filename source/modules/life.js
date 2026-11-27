/* SALTWAKE living world (v0.31). Motion and effects on top of the existing art (no art drawn in code):
 * - Wind: grass, flowers and shrubs sway, tree tops lean gently; gusts get stronger in rain and squalls.
 * - Smoke: campfires and camp fires (scene lights flagged as fires) send up drifting smoke (art/vfx/smoke_puff).
 * - Sea: waves break along the shoreline (art/vfx/wave_crash) and fish jump now and then (art/vfx/splash).
 * - Sky: by day a flock of gulls crosses over the map (the gull art, small and high), with the existing ground shadows.
 * Everything is culled to the view. window.saltwakeLife exposes settings and counters for QA.
 */
(() => {
  const P = Game.prototype, T = 32, TAU = Math.PI * 2;
  const L = window.saltwakeLife = { enabled: true, sway: true, stats: { swayed: 0, smoke: 0, waves: 0, splashes: 0, flocks: 0 }, smoke: [], fx: [], flock: null };
  const IM = () => window.SALTWAKE_ASSETS?.images || {};
  const cache = {}; const img = a => { if (cache[a]) return cache[a]; const s = IM()[a]; if (!s) return null; const i = new Image(); i.src = s; return (cache[a] = i); };
  const ok = i => i && i.complete && i.naturalWidth > 0;
  const VFX = { smoke: ['art/vfx/smoke_puff', 6], splash: ['art/vfx/splash', 12], wave: ['art/vfx/wave_crash', 12] };
  const frame = (key, k, x, y, w, h, alpha = 1) => { const [a, n] = VFX[key], im = img(a); if (!ok(im)) return; const fw = im.naturalWidth / n, f = Math.min(n - 1, Math.floor(k * n));
    g.globalAlpha = alpha; g.drawImage(im, f * fw, 0, fw, im.naturalHeight, x - w / 2, y - h, w, h); };
  const wind = gm => { const w = gm.climateState?.().weather?.id; return w === 'squall' ? 2.4 : w === 'rain' ? 1.6 : 1; };

  // ---- wind sway: wraps the scene sprite draw for plants and trees ---------------------------------------------
  const ORIG = window.coastSprite;
  let gameRef = null, tnow = 0, wmul = 1;
  function swaySprite(key, x, footY, w, h, mirror) {
    const k = String(key || '');
    if (L.enabled && L.sway && /^art\/(plants|trees)\//.test(k)) {
      const tree = k.includes('/trees/'), amt = (tree ? .018 : .07) * wmul, ph = x * .013 + footY * .007;
      const s = (Math.sin(tnow * (tree ? 1.1 : 1.9) + ph) + Math.sin(tnow * 3.3 + ph * 2.1) * .35) * amt;
      g.save(); g.translate(x, footY); g.transform(1, 0, -s, 1, 0, 0); g.translate(-x, -footY); L.stats.swayed++;
      try { return ORIG.apply(this, arguments); } finally { g.restore(); }
    }
    return ORIG.apply(this, arguments);
  }
  const scene = P.drawCoastScene;
  P.drawCoastScene = function (view) {
    gameRef = this; tnow = performance.now() / 1000; wmul = wind(this);
    // sea life under the actors: breaking waves and fish
    if (L.enabled && this.map()?.tilemap && view) this.lifeSea?.(view);
    const prev = window.coastSprite; if (ORIG && prev === ORIG) window.coastSprite = swaySprite;
    try { return scene.apply(this, arguments); } finally { if (window.coastSprite === swaySprite) window.coastSprite = prev; }
  };

  // ---- sea: waves and splashes along the live coastline --------------------------------------------------------
  P.lifeSea = function (view) {
    const m = this.map(); if (!m.waterStart || !this.coastY) return;
    const x0 = view.x0, x1 = view.x1, cy = this.coastY((x0 + x1) / 2); if (cy > view.y1 + 60 || cy < view.y0 - 200) return;
    if (Math.random() < .045) { const x = x0 + Math.random() * (x1 - x0); L.fx.push({ k: 'wave', x, y: this.coastY(x) + 26, t: 0, d: .9, w: 150 + Math.random() * 60, h: 52 }); L.stats.waves++; }
    if (Math.random() < .012) { const x = x0 + Math.random() * (x1 - x0), y = this.coastY(x) + 90 + Math.random() * 200; if (y < view.y1) { L.fx.push({ k: 'splash', x, y, t: 0, d: .7, w: 34, h: 34 }); L.stats.splashes++; } }
    g.save();
    for (const f of L.fx) frame(f.k, f.t / f.d, f.x, f.y, f.w, f.h, f.k === 'wave' ? .75 : .9);
    g.restore();
  };

  // ---- smoke + flock + lifetimes ---------------------------------------------------------------------------------
  const upd = P.update;
  P.update = function (dt) {
    const out = upd.apply(this, arguments); if (!L.enabled || this.isPaused?.()) return out; dt = Math.min(.1, dt || 0);
    for (const f of L.fx) f.t += dt; L.fx = L.fx.filter(f => f.t < f.d);
    const vis = window.SALTWAKE_VIS?.[this.mapId] || (typeof SALTWAKE_VIS !== 'undefined' ? SALTWAKE_VIS[this.mapId] : null), cam = this.camera, z = cam.zoom;
    const vx0 = cam.x - 100, vy0 = cam.y - 100, vx1 = cam.x + VW / z + 100, vy1 = cam.y + VH / z + 100;
    for (const l of vis?.lights || []) { if (!(l.strength >= .85)) continue; const x = l.x * T, y = l.y * T; if (x < vx0 || x > vx1 || y < vy0 || y > vy1) continue;
      if (Math.random() < dt * 2.2) { L.smoke.push({ x: x + (Math.random() - .5) * 10, y: y - 20, t: 0, d: 3 + Math.random() * 1.5, s: .7 + Math.random() * .5 }); L.stats.smoke++; } }
    const w = wind(this);
    for (const s of L.smoke) { s.t += dt; s.y -= 16 * dt; s.x += (6 + 8 * w) * dt; } L.smoke = L.smoke.filter(s => s.t < s.d).slice(-60);
    const night = !!this.climateState?.().night;
    if (!L.flock && !night && Math.random() < dt / 22) { const dir = Math.random() < .5 ? 1 : -1, n = 4 + Math.floor(Math.random() * 4), y = cam.y + (VH / z) * (.15 + Math.random() * .5);
      L.flock = { dir, x: dir > 0 ? cam.x - 120 : cam.x + VW / z + 120, y, birds: Array.from({ length: n }, (_, i) => ({ dx: -i * 26 * dir + (Math.random() - .5) * 20, dy: (i % 2 ? 1 : -1) * i * 9 + (Math.random() - .5) * 12, ph: Math.random() * 6 })) }; L.stats.flocks++; }
    if (L.flock) { L.flock.x += L.flock.dir * 130 * dt; const ex = cam.x + (L.flock.dir > 0 ? VW / z + 260 : -260); if (L.flock.dir > 0 ? L.flock.x > ex : L.flock.x < ex) L.flock = null; }
    return out;
  };
  const render = P.render;
  P.render = function (now) {
    const out = render.apply(this, arguments); if (!L.enabled || this.mode !== 'play' || this.panel) return out;
    const z = this.camera.zoom, cx = this.camera.x, cy = this.camera.y;
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
    for (const s of L.smoke) { const k = s.t / s.d, sz = (26 + k * 40) * s.s * z; frame('smoke', k, (s.x - cx) * z, (s.y - cy) * z + sz / 2, sz, sz, .45 * (1 - k) * (k < .1 ? k * 10 : 1)); }
    const F = L.flock;
    if (F && typeof veinArt !== 'undefined') { g.globalAlpha = .92;
      for (const b of F.birds) { const fr = veinArt.get(`gull_${Math.floor(now / 120 + b.ph) % 4}_0`) || veinArt.get('gull_0_0'); if (!ok(fr)) continue;
        const x = (F.x + b.dx - cx) * z, y = (F.y + b.dy - cy) * z, w = 30 * z, h = w * fr.naturalHeight / fr.naturalWidth;
        g.save(); g.translate(x, y); if (F.dir < 0) g.scale(-1, 1); g.drawImage(fr, -w / 2, -h / 2, w, h); g.restore(); } }
    g.restore(); return out;
  };
})();
