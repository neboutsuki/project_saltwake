/* SALTWAKE ambient life (v0.31): small moving things that make the world feel alive. Particles and effects only
 * (no sprites drawn in code, no gameplay effect).
 * - Leaves: drift down from trees on screen and blow with the wind.
 * - Butterflies / moths: flutter over grass and flowers by day, a few pale moths around lamps at dusk.
 * - Fireflies: glow over grass, reeds and shrubs at night (drawn on top of the darkness).
 * - Bird shadows: a small flock's shadow crosses the ground now and then on clear days.
 * Counts scale with what is on screen and with the time of day; everything is culled to the view.
 * window.saltwakeAmbient exposes counters and settings for QA.
 */
(() => {
  const P = Game.prototype, T = 32;
  const A = window.saltwakeAmbient = { enabled: true, leaves: [], flies: [], bugs: [], birds: null, stats: { leaves: 0, flies: 0, bugs: 0, birds: 0 } };
  const rnd = (a, b) => a + Math.random() * (b - a);
  let nextBirds = 8;

  function view(g) { const z = g.camera.zoom; return { x0: g.camera.x, y0: g.camera.y, x1: g.camera.x + VW / z, y1: g.camera.y + VH / z }; }
  function inView(o, v, pad = 0) { return o.x > v.x0 - pad && o.x < v.x1 + pad && o.y > v.y0 - pad && o.y < v.y1 + pad; }
  function sceneIn(g, v, re) { const out = []; for (const o of (SALTWAKE_VIS[g.mapId]?.decor || [])) { const x = o.x * T, y = o.y * T; if (x > v.x0 - 80 && x < v.x1 + 80 && y > v.y0 && y < v.y1 + 160 && re.test(o.asset)) out.push(o); } return out; }

  function step(g, dt) {
    const v = view(g), K = window.saltwakeSky?.state || {}, wind = K.wind || { x: .3, y: .05 }, cc = g.climateClock?.() % 1440;
    const night = window.saltwakeDayNight?.level ?? (K.night || 0), day = night < .3, rain = (K.rain || 0) > .3;
    // leaves
    const trees = sceneIn(g, v, /art\/trees\/|art\/edges\/treeline/);
    if (trees.length && A.leaves.length < 26 && Math.random() < dt * Math.min(6, trees.length * .25)) {
      const t = trees[Math.floor(Math.random() * trees.length)];
      A.leaves.push({ x: t.x * T + rnd(-t.w * 12, t.w * 12), y: t.y * T - t.h * T * rnd(.45, .85), vy: rnd(14, 26), ph: rnd(0, 6), life: rnd(3, 5), age: 0, tone: Math.random() < .5 ? '#8a6a3c' : '#6d7040' });
    }
    for (const l of A.leaves) { l.age += dt; l.x += (wind.x * 40 + Math.sin(l.age * 2.4 + l.ph) * 18) * dt; l.y += l.vy * dt; }
    A.leaves = A.leaves.filter(l => l.age < l.life);
    // butterflies (day) / moths (dusk)
    const want = day && !rain ? 10 : night < .7 && !rain ? 4 : 0;
    if (A.bugs.length < want && Math.random() < dt * 2) {
      const grass = sceneIn(g, v, day ? /art\/plants\/(flowers|grass|fern)/ : /lantern|brazier/);
      if (grass.length) { const o = grass[Math.floor(Math.random() * grass.length)]; A.bugs.push({ x: o.x * T, y: o.y * T - 20, hx: o.x * T, hy: o.y * T - 20, ph: rnd(0, 6), age: 0, life: rnd(8, 16), moth: !day, col: ['#e9d9a6', '#c9a86a', '#e0e4ec', '#d08f6a'][Math.floor(Math.random() * 4)] }); }
    }
    for (const b of A.bugs) { b.age += dt; const a = b.age * 1.3 + b.ph; b.x = b.hx + Math.sin(a) * 40 + Math.sin(a * 2.7) * 12 + wind.x * b.age * 6; b.y = b.hy + Math.cos(a * 1.4) * 18 - Math.abs(Math.sin(a * 3)) * 6; }
    A.bugs = A.bugs.filter(b => b.age < b.life && inView(b, v, 200));
    // fireflies (night, dry)
    const flyWant = night > .55 && !rain ? 40 : 0;
    if (A.flies.length < flyWant && Math.random() < dt * 12) {
      const plants = sceneIn(g, v, /art\/plants\/(grass|reeds|shrub|fern)/);
      if (plants.length) { const o = plants[Math.floor(Math.random() * plants.length)]; A.flies.push({ x: o.x * T + rnd(-20, 20), y: o.y * T - rnd(10, 40), ph: rnd(0, 6), age: 0, life: rnd(5, 10), vx: rnd(-8, 8), vy: rnd(-5, 5) }); }
    }
    for (const f of A.flies) { f.age += dt; f.x += (f.vx + Math.sin(f.age * 1.7 + f.ph) * 10) * dt; f.y += (f.vy + Math.cos(f.age * 1.3 + f.ph) * 8) * dt; }
    A.flies = A.flies.filter(f => f.age < f.life && inView(f, v, 100));
    if (flyWant === 0) A.flies = A.flies.filter(f => (f.life = Math.min(f.life, f.age + .5)));
    // bird shadows
    nextBirds -= dt;
    if (!A.birds && nextBirds <= 0 && day && (K.cloud || 0) < .6) {
      const dir = Math.random() < .5 ? 1 : -1, y = rnd(v.y0 + 40, v.y1 - 40);
      A.birds = { x: dir > 0 ? v.x0 - 200 : v.x1 + 200, y, dir, n: 3 + Math.floor(Math.random() * 4), t: 0 }; A.stats.birds++;
      nextBirds = rnd(18, 40);
    }
    if (A.birds) { A.birds.t += dt; A.birds.x += A.birds.dir * 230 * dt; if (A.birds.t > 9) A.birds = null; }
  }
  const hubOrField = g => A.enabled && g.mode === 'play' && g.map()?.tilemap;
  const update = P.update;
  P.update = function (dt) { const out = update.apply(this, arguments); if (hubOrField(this) && !this.isPaused?.()) step(this, Math.min(.1, dt || 0)); return out; };

  // world-space things (leaves, butterflies, bird shadows) after the scene, before lighting
  const scene = P.drawCoastScene;
  P.drawCoastScene = function () {
    const out = scene.apply(this, arguments);
    if (!hubOrField(this)) return out;
    const t = performance.now() / 1000;
    g.save();
    if (A.birds) { const b = A.birds; g.fillStyle = 'rgba(12,14,16,.16)';
      for (let i = 0; i < b.n; i++) { const x = b.x - b.dir * i * 34 + Math.sin(i * 2.1) * 14, y = b.y + (i % 2 ? 20 : -14) * (i * .5), f = Math.sin(t * 9 + i) * 5;
        g.beginPath(); g.moveTo(x - 12, y - f); g.quadraticCurveTo(x, y + 3, x + 12, y - f); g.quadraticCurveTo(x, y + 6, x - 12, y - f); g.fill(); } }
    for (const l of A.leaves) { const fade = Math.min(1, l.age / .3, (l.life - l.age) / .6); g.globalAlpha = fade * .9; g.fillStyle = l.tone;
      g.save(); g.translate(l.x, l.y); g.rotate(Math.sin(l.age * 3 + l.ph) * 1.2); g.fillRect(-2.5, -1.2, 5, 2.4); g.restore(); A.stats.leaves++; }
    for (const b of A.bugs) { const fade = Math.min(1, b.age / .4, (b.life - b.age) / .4), flap = Math.abs(Math.sin(t * 18 + b.ph)); g.globalAlpha = fade * .95; g.fillStyle = b.col;
      g.fillRect(b.x - 3 * flap - .5, b.y - 1.5, 3 * flap, 3); g.fillRect(b.x + .5, b.y - 1.5, 3 * flap, 3); g.fillStyle = '#2b2622'; g.fillRect(b.x - .5, b.y - 1.5, 1, 3); A.stats.bugs++; }
    g.restore();
    return out;
  };
  // fireflies glow on top of the darkness
  const light = P.drawPinewallLight;
  P.drawPinewallLight = function (now) {
    const out = light.apply(this, arguments);
    if (!hubOrField(this) || !A.flies.length) return out;
    const z = this.camera.zoom, t = now / 1000;
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'lighter';
    for (const f of A.flies) {
      const pulse = Math.max(0, Math.sin(t * 2.2 + f.ph * 3)) ** 3, fade = Math.min(1, f.age / .5, (f.life - f.age) / .5), a = pulse * fade;
      if (a < .02) continue;
      const X = (f.x - this.camera.x) * z, Y = (f.y - this.camera.y) * z, R = 9 * z;
      const gr = g.createRadialGradient(X, Y, 0, X, Y, R); gr.addColorStop(0, `rgba(210,255,140,${.85 * a})`); gr.addColorStop(1, 'rgba(210,255,140,0)');
      g.fillStyle = gr; g.fillRect(X - R, Y - R, R * 2, R * 2); A.stats.flies++;
    }
    g.restore();
    return out;
  };
})();
