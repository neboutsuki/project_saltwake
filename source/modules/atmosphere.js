/* SALTWAKE atmosphere (v0.31). Rendering effects in code on top of the existing art (no art drawn in code):
 * - Cloud shadows: big soft shadows drift over the land with the wind on part-cloudy days (lit by the day/night layer).
 * - Sun shafts: soft warm light beams slant across the scene at dawn and in the golden hour on clear days.
 * - Fog banks: drifting mist (procedural noise texture) in fog and rain, and a thin morning mist at dawn.
 * - Wet ground: surfaces darken and cool while it rains and dry slowly afterwards (saltwakeSky wetness).
 * - Embers: sparks rise from campfires, braziers and camp fires and glow in the dark.
 * - Building contact shadow: a soft dark pool where every building meets the ground.
 * Water and shoreline effects live in tilemap.js (drawSea); flash lights in daynight.js (DN.flash).
 * Settings: localStorage saltwake.atmo.v1 {clouds, shafts, fog, wet, embers, ao}; Graphics > "Atmosphere".
 * window.saltwakeAtmo exposes settings and counters for QA.
 */
(() => {
  const P = Game.prototype, T = 32, TAU = Math.PI * 2;
  const KEY = 'saltwake.atmo.v1';
  const cfg = { clouds: true, shafts: true, fog: true, wet: true, embers: true, ao: true };
  try { Object.assign(cfg, JSON.parse(localStorage.getItem(KEY)) || {}); } catch (e) { }
  const A = window.saltwakeAtmo = { cfg, stats: { clouds: 0, shafts: 0, fog: 0, wet: 0, embers: 0, ao: 0 }, embers: [],
    set(o) { Object.assign(cfg, o); try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch (e) { } } };
  const SK = () => window.saltwakeSky?.state || null;
  const H01 = (x, y, sd) => { let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(sd, 2147483647)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const tileMap = gm => !!gm.map?.()?.tilemap;

  // ---- procedural soft textures (generated once) -------------------------------------------------------------------
  function noiseTex(size, cells, seed, soft, rgb = [255, 255, 255]) {
    const c = document.createElement('canvas'); c.width = c.height = size; const x = c.getContext('2d'), id = x.createImageData(size, size), d = id.data;
    const sm = t => t * t * (3 - 2 * t), vn = (X, Y, s, per) => { const xi = Math.floor(X), yi = Math.floor(Y), xf = sm(X - xi), yf = sm(Y - yi), w = i => ((i % per) + per) % per;
      const a = H01(w(xi), w(yi), s), b = H01(w(xi + 1), w(yi), s), c2 = H01(w(xi), w(yi + 1), s), e = H01(w(xi + 1), w(yi + 1), s); return a + (b - a) * xf + (c2 - a) * yf + (a - b - c2 + e) * xf * yf; };
    for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
      let v = 0, amp = .55, f = cells / size, tot = 0; for (let o = 0; o < 4; o++) { v += vn(i * f, j * f, seed + o, cells * (1 << o)) * amp; tot += amp; amp *= .5; f *= 2; }
      v /= tot; const a = Math.max(0, Math.min(1, (v - soft[0]) / (soft[1] - soft[0])));
      const p = (j * size + i) * 4; d[p] = rgb[0]; d[p + 1] = rgb[1]; d[p + 2] = rgb[2]; d[p + 3] = Math.round(a * a * 255);
    }
    x.putImageData(id, 0, 0); return c;
  }
  let CLOUD = null, FOG = null;
  const cloudTex = () => CLOUD || (CLOUD = noiseTex(256, 3, 71, [.42, .78], [40, 52, 70]));   // tiles seamlessly (periodic noise)
  const fogTex = () => FOG || (FOG = noiseTex(256, 4, 91, [.3, .85]));

  // ---- world pass: wet ground under everything, cloud shadows over everything (before the light layer) --------------
  const terrain = P.drawTerrain;
  P.drawTerrain = function (view) {
    const out = terrain.apply(this, arguments), K = SK();
    if (cfg.wet && K && (K.wet || 0) > .03 && tileMap(this) && view) {
      g.save(); g.globalCompositeOperation = 'source-over'; g.fillStyle = `rgba(14,22,30,${.16 * K.wet})`; g.fillRect(view.x0, view.y0, view.x1 - view.x0, view.y1 - view.y0);
      g.globalCompositeOperation = 'soft-light'; g.fillStyle = `rgba(150,175,200,${.25 * K.wet})`; g.fillRect(view.x0, view.y0, view.x1 - view.x0, view.y1 - view.y0); g.restore(); A.stats.wet++;
    }
    return out;
  };
  const scene = P.drawCoastScene;
  P.drawCoastScene = function (view) {
    const out = scene.apply(this, arguments), K = SK();
    if (cfg.clouds && K && view && tileMap(this) && (K.sunElev || 0) > .05) {
      const cover = K.cloud || 0, a = (cover < .9 ? .1 + .32 * Math.min(1, cover / .6) : .12) * Math.min(1, K.sunElev * 3) * (1 - (K.rain || 0) * .6);
      if (a > .02) {
        const tex = cloudTex(), S = 1700, t = performance.now() / 1000, w = K.wind || { x: .35, y: .05 };
        const ox = (t * (12 + 30 * Math.abs(w.x)) * Math.sign(w.x || 1)) % S, oy = (t * 6 * (w.y || .05) * 3) % S;
        g.save(); g.globalAlpha = a; g.imageSmoothingEnabled = true;
        const pat = g.createPattern(tex, 'repeat'); pat.setTransform(new DOMMatrix().translate(ox, oy).scale(S / 256));
        g.fillStyle = pat; g.fillRect(view.x0, view.y0, view.x1 - view.x0, view.y1 - view.y0); g.restore(); A.stats.clouds++;
      }
    }
    return out;
  };

  // ---- building contact shadow (scene sprite entry point; installed before life.js captures it) ----------------------
  const cs = window.coastSprite;
  if (typeof cs === 'function') window.coastSprite = function (key, x, footY, w, h) {
    if (cfg.ao && typeof key === 'string' && key.startsWith('art/buildings/') && w > 60) {
      const rw = w * .56, rh = Math.max(10, h * .07);
      g.save(); g.translate(x, footY - rh * .25); g.scale(1, rh / rw);
      const gr = g.createRadialGradient(0, 0, rw * .35, 0, 0, rw); gr.addColorStop(0, 'rgba(10,12,14,.42)'); gr.addColorStop(1, 'rgba(10,12,14,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(0, 0, rw, 0, TAU); g.fill(); g.restore(); A.stats.ao++;
    }
    return cs.apply(this, arguments);
  };

  // ---- screen pass (after the light layer): sun shafts, fog banks, embers --------------------------------------------
  const upd = P.update;
  P.update = function (dt) {
    const out = upd.apply(this, arguments); if (!cfg.embers || this.isPaused?.() || this.mode !== 'play' || !tileMap(this)) return out;
    dt = Math.min(.1, dt || 0); const vis = window.SALTWAKE_VIS?.[this.mapId] || (typeof SALTWAKE_VIS !== 'undefined' ? SALTWAKE_VIS[this.mapId] : null), cam = this.camera, z = cam.zoom;
    const vx0 = cam.x - 60, vy0 = cam.y - 60, vx1 = cam.x + VW / z + 60, vy1 = cam.y + VH / z + 60, K = SK(), wind = K?.wind?.x ?? .3;
    for (const l of vis?.lights || []) { if ((l.radius || 120) < 140) continue; const x = l.x * T, y = l.y * T; if (x < vx0 || x > vx1 || y < vy0 || y > vy1) continue;
      if (Math.random() < dt * 7) A.embers.push({ x: x + (Math.random() - .5) * 16, y: y + 6, vx: (Math.random() - .5) * 14, vy: -26 - Math.random() * 30, t: 0, d: 1.2 + Math.random() * 1.6, s: .6 + Math.random() * .9, ph: Math.random() * 6 }); }
    for (const e of A.embers) { e.t += dt; e.ph += dt * 6; e.x += (e.vx + wind * 22 + Math.sin(e.ph) * 9) * dt; e.y += e.vy * dt; e.vy *= 1 - dt * .3; }
    A.embers = A.embers.filter(e => e.t < e.d).slice(-120);
    return out;
  };
  const render = P.render;
  P.render = function (now) {
    const out = render.apply(this, arguments);
    if (this.mode !== 'play' || this.panel || !tileMap(this)) return out;
    const K = SK(), cam = this.camera, z = cam.zoom, t = now / 1000;
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
    // embers: additive glowing sparks
    if (cfg.embers && A.embers.length) { g.globalCompositeOperation = 'lighter';
      for (const e of A.embers) { const k = e.t / e.d, a = (1 - k) * (.6 + .4 * Math.sin(e.ph * 1.7)), X = (e.x - cam.x) * z, Y = (e.y - cam.y) * z, r = e.s * z * 1.4;
        g.globalAlpha = a * .35; g.fillStyle = 'rgb(255,120,40)'; g.beginPath(); g.arc(X, Y, r * 3, 0, TAU); g.fill();
        g.globalAlpha = a; g.fillStyle = 'rgb(255,200,120)'; g.fillRect(X - r / 2, Y - r / 2, r, r); }
      A.stats.embers++; }
    if (K) {
      // sun shafts at dawn / golden hour on clear-ish days
      const m = K.minute ?? 720, golden = Math.max(0, 1 - Math.abs(m - 1050) / 110), morning = Math.max(0, 1 - Math.abs(m - 420) / 100);
      const sh = cfg.shafts ? Math.max(golden, morning * .8) * (1 - (K.cloud || 0) * .9) * (1 - (K.rain || 0)) * (1 - (K.fog || 0) * .7) : 0;
      if (sh > .03) { g.globalCompositeOperation = 'screen'; const ang = (m < 720 ? .55 : -.55) + (K.shadow?.shear || 0) * .15, len = VW * 2.2;
        for (let i = 0; i < 4; i++) { const ph = t * .015 + i * .27, cx = ((ph % 1) * 1.6 - .3) * VW, wdt = 70 + 60 * H01(i, 3, 1), a = sh * (.09 + .05 * Math.sin(t * .3 + i * 2));
          g.save(); g.translate(cx, VH * .4); g.rotate(ang); const gr = g.createLinearGradient(-wdt, 0, wdt, 0);
          gr.addColorStop(0, 'rgba(255,214,150,0)'); gr.addColorStop(.5, `rgba(255,214,150,${a})`); gr.addColorStop(1, 'rgba(255,214,150,0)');
          g.fillStyle = gr; g.globalAlpha = 1; g.fillRect(-wdt, -len / 2, wdt * 2, len); g.restore(); }
        A.stats.shafts++; }
      // fog banks: two drifting noise layers with parallax
      const mist = Math.max(K.fog || 0, (K.rain || 0) * .35, m > 300 && m < 480 ? .22 * (1 - Math.abs(m - 390) / 90) : 0);
      if (cfg.fog && mist > .03) { g.globalCompositeOperation = 'source-over'; const tex = fogTex(), w = K.wind || { x: .3, y: 0 }, amb = window.saltwakeDayNight?.ambient || [200, 205, 210];
        A._fg ||= document.createElement('canvas'); const F = A._fg; if (F.width !== 256) { F.width = F.height = 256; } const fx = F.getContext('2d');
        fx.globalCompositeOperation = 'source-over'; fx.clearRect(0, 0, 256, 256); fx.drawImage(tex, 0, 0); fx.globalCompositeOperation = 'source-in';
        fx.fillStyle = `rgb(${Math.min(255, amb[0] * .9 + 30)},${Math.min(255, amb[1] * .9 + 32)},${Math.min(255, amb[2] * .9 + 38)})`; fx.fillRect(0, 0, 256, 256);
        for (const [par, sc, al, sp] of [[.85, 900, .55, 10], [1.15, 1300, .4, 16]]) {
          const S = sc * z, ox = -((cam.x * par + t * sp * Math.sign(w.x || 1)) * z % S), oy = -((cam.y * par) * z % S);
          g.globalAlpha = Math.min(.75, mist * al);
          for (let y = oy - S; y < VH; y += S) for (let x = ox - S; x < VW; x += S) g.drawImage(F, x, y, S, S); }
        A.stats.fog++; }
    }
    g.restore(); return out;
  };

  // ---- settings ------------------------------------------------------------------------------------------------------
  const gp = P.graphicsPanel;
  P.graphicsPanel = function (...a) {
    const out = gp.apply(this, a), b = document.getElementById('panel')?.querySelector('.engineOptions');
    if (b && !document.getElementById('swAtmo')) {
      b.insertAdjacentHTML('beforeend', `<label class="engineCheck"><input id="swAtmo" type="checkbox" ${cfg.clouds && cfg.shafts && cfg.fog ? 'checked' : ''}> Atmosphere (cloud shadows, sun shafts, fog, embers, wet ground)</label>`);
      document.getElementById('swAtmo').onchange = e => { const v = e.target.checked; A.set({ clouds: v, shafts: v, fog: v, embers: v, wet: v }); };
    }
    return out;
  };
})();
