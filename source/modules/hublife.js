/* SALTWAKE harbor life (v0.31): makes Salvager's Rest feel inhabited. Visual only; nothing here blocks or collides.
 * - Townsfolk walk the map's life.routes (back and forth), pause at waypoints, and now and then say a short line.
 *   About 11 by day, 4 at night, half as many in rain. Drawn with the shared character renderer (saltwakeFaces), varied
 *   by role and coat color, depth-sorted with everything else.
 * - Rowboats bob at their moorings (life.boats); fire lights (forge brazier, campfire, square lanterns) flicker.
 * window.saltwakeHubLife exposes the walkers and counters for QA.
 */
(() => {
  const P = Game.prototype, T = 32;
  const L = window.saltwakeHubLife = { enabled: true, walkers: [], stats: { drawn: 0, barks: 0 }, barks: [] };
  const ROLES = ['resident', 'dock', 'merchant', 'resident', 'dock', 'smith', 'medic', 'ledger', 'resident'];
  const COATS = ['5f6b6a', '7a6550', '6c5a4a', '58646e', '8a7356', '4f5d57', '6e4f45', '76705e', '5a5a66', '82664e', '667060'];
  const LINES = ['Tide’s turning early.', 'Fresh catch! Mostly fresh.', 'Mind the salt on the steps.', 'Another skiff came back empty.',
    'Lanterns before dusk, they said.', 'The Brineworn were singing again.', 'Rope’s gone up two scrip.', 'Keep to the lit roads.',
    'Ash on the wind today.', 'Heard the bell at the Quays?', 'My boy signed with the hunters.', 'Bring me a Brineback plate, I’ll pay.'];
  let rng = 1;
  const rand = () => (rng = (rng * 16807) % 2147483647) / 2147483647;
  const life = g => g.world.maps.hub?.life;

  function routeLen(r) { let d = 0; for (let i = 1; i < r.length; i++) d += Math.hypot(r[i][0] - r[i - 1][0], r[i][1] - r[i - 1][1]); return d; }
  function at(r, s) { // position at distance s along the route
    for (let i = 1; i < r.length; i++) { const d = Math.hypot(r[i][0] - r[i - 1][0], r[i][1] - r[i - 1][1]); if (s <= d) { const k = d ? s / d : 0; return [r[i - 1][0] + (r[i][0] - r[i - 1][0]) * k, r[i - 1][1] + (r[i][1] - r[i - 1][1]) * k]; } s -= d; }
    return r[r.length - 1];
  }
  function spawn(g) {
    const H = life(g); if (!H) return;
    const C = g.climateState?.() || {}, rain = /rain|squall|storm/.test(g.climateWeather?.(g.save?.environment?.clock || 0)?.id || '');
    let n = C.night ? H.night : H.day; if (rain) n = Math.ceil(n / 2);
    L.walkers = [];
    for (let i = 0; i < n; i++) {
      const r = H.routes[i % H.routes.length], len = routeLen(r);
      L.walkers.push({ r, len, s: rand() * len, dir: rand() < .5 ? 1 : -1, speed: 1.1 + rand() * .7, pause: 0, x: 0, y: 0, dist: 0, face: 'front', mirror: false,
        profile: window.saltwakeFaces?.profile(ROLES[i % ROLES.length], { id: 'walker_' + i, color: COATS[i % COATS.length] }) });
    }
    L.key = (C.night ? 'n' : 'd') + (rain ? 'r' : '');
  }
  function step(g, dt) {
    const H = life(g); if (!H) return;
    const C = g.climateState?.() || {}, key = (C.night ? 'n' : 'd') + (/rain|squall|storm/.test(g.climateWeather?.(g.save?.environment?.clock || 0)?.id || '') ? 'r' : '');
    if (!L.walkers.length || L.key !== key) spawn(g);
    for (const w of L.walkers) {
      if (w.pause > 0) { w.pause -= dt; continue; }
      const before = at(w.r, w.s);
      w.s += w.dir * w.speed * dt;
      if (w.s >= w.len || w.s <= 0) { w.s = Math.max(0, Math.min(w.len, w.s)); w.dir *= -1; w.pause = 1.5 + rand() * 4; }
      else if (rand() < dt * .05) w.pause = 1 + rand() * 3;   // stop to look around
      const p = at(w.r, w.s), dx = p[0] - before[0], dy = p[1] - before[1];
      w.x = p[0] * T; w.y = p[1] * T; w.dist += Math.hypot(dx, dy);
      if (Math.hypot(dx, dy) > 1e-4) { if (Math.abs(dx) > Math.abs(dy)) { w.face = 'side'; w.mirror = dx < 0; } else w.face = dy < 0 ? 'back' : 'front'; }
    }
    // barks: one short line every few seconds from someone near the player
    L.nextBark = (L.nextBark ?? 4) - dt;
    if (L.nextBark <= 0) {
      L.nextBark = 6 + rand() * 6;
      const near = L.walkers.filter(w => Math.hypot(w.x - g.player.x, w.y - g.player.y) < 420);
      if (near.length) { const w = near[Math.floor(rand() * near.length)]; L.barks.push({ w, text: LINES[Math.floor(rand() * LINES.length)], t: 3.2 }); L.stats.barks++; }
    }
    for (const b of L.barks) b.t -= dt;
    L.barks = L.barks.filter(b => b.t > 0);
  }
  const hubActive = g => L.enabled && g.mapId === 'hub' && !g.raid && g.mode === 'play' && g.map()?.tilemap && life(g);

  const update = P.update;
  P.update = function (dt) { const out = update.apply(this, arguments); if (hubActive(this) && !this.isPaused?.()) step(this, Math.min(dt || 0, .1)); return out; };

  // Draw walkers and boats inside the scene pass (depth-sorted): temporary scene objects with "life:" keys.
  const scene = P.drawCoastScene;
  P.drawCoastScene = function (view) {
    if (!hubActive(this) || !SALTWAKE_VIS.hub) return scene.apply(this, arguments);
    const vis = SALTWAKE_VIS.hub, base = vis.decor, H = life(this), now = performance.now() / 1000;
    const temps = L.walkers.map((w, i) => ({ asset: 'life:w' + i, x: w.x / T, y: w.y / T, w: 2, h: 3, anchor: 'bottom' }))
      .concat((H.boats || []).map((b, i) => ({ asset: 'life:b' + i, x: b[0], y: b[1], w: 4, h: 3, anchor: 'bottom' })));
    vis.decor = base.concat(temps);
    const cs = window.coastSprite;
    window.coastSprite = function (key, x, footY, w, h) {
      if (typeof key === 'string' && key.startsWith('life:')) {
        const i = +key.slice(6);
        if (key[5] === 'w') { const p = L.walkers[i]; if (p && window.saltwakeFaces) { const fr = p.pause > 0 ? 0 : Math.floor(p.dist / .22) % 4, bh = 52 * 1.4;
          g.save(); g.fillStyle = 'rgba(10,12,12,.28)'; g.beginPath(); g.ellipse(x, footY + 2, 12, 4.5, 0, 0, Math.PI * 2); g.fill(); g.restore();
          window.saltwakeFaces.render(g, p.profile, p.face, p.mirror, fr, x, footY + 2, bh * 40 / 56, bh); L.stats.drawn++; } }
        else { const bob = Math.sin(now * 1.3 + i * 1.7) * 2.2, tilt = Math.sin(now * .9 + i) * .03;
          g.save(); g.translate(x, footY + bob); g.rotate(tilt); cs('art/props/rowboat', 0, 0, 134, 78); g.restore(); }
        return;
      }
      return cs.apply(this, arguments);
    };
    try { return scene.apply(this, arguments); } finally { window.coastSprite = cs; vis.decor = base; }
  };

  // Flickering fire light + barks (screen space, after the scene).
  const render = P.render;
  P.render = function (now) {
    const vis = SALTWAKE_VIS.hub;
    if (vis && this.mapId === 'hub') for (const [i, l] of (vis.lights || []).entries()) { l._base ??= l.strength; l.strength = l._base * (.86 + .14 * Math.sin(now / 90 + i * 2.1) * Math.sin(now / 37 + i)); }
    const out = render.apply(this, arguments);
    if (hubActive(this) && L.barks.length && !this.panel) {
      const z = this.camera.zoom; g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.font = '600 12px system-ui,sans-serif'; g.textAlign = 'center';
      for (const b of L.barks) {
        const x = (b.w.x - this.camera.x) * z, y = (b.w.y - 92 - this.camera.y) * z; if (x < 0 || y < 0 || x > VW || y > VH) continue;
        const a = Math.min(1, b.t / .5, (3.2 - b.t) / .3), w = g.measureText(b.text).width + 14;
        g.globalAlpha = a * .82; g.fillStyle = 'rgba(246,244,239,.9)'; g.beginPath(); g.roundRect(x - w / 2, y - 18, w, 22, 8); g.fill();
        g.globalAlpha = a; g.fillStyle = '#1c2224'; g.fillText(b.text, x, y - 3);
      }
      g.restore();
    }
    return out;
  };
})();
