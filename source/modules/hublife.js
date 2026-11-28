/* SALTWAKE harbor life (v0.31): makes Salvager's Rest feel inhabited. Visual only; nothing here blocks or collides.
 * - Townsfolk live a daily routine on the harbor's street graph (map life.streets/spots/doors, tools/make_maps.py):
 *   they walk to places and spend time there (read the notice board, draw water, shop at the stalls, watch the forge,
 *   work the quay, look out to sea from the piers, pray at the chapel at dusk, gather at the campfire in the evening,
 *   keep watch at night), stop to chat in pairs, and go home through their doors at night (out again in the morning).
 *   Rain: fewer people, they hurry and shelter under awnings. A jump in time puts everyone where they belong at once.
 * - They notice you: they step aside when you walk into them and turn to greet you (lines from npc-voice.js).
 * - Rowboats bob at their moorings (life.boats); fire lights (forge brazier, campfire, square lanterns) flicker.
 * window.saltwakeHubLife exposes the townsfolk (walkers = visible, all = everyone) and counters for QA.
 */
(() => {
  const P = Game.prototype, T = 32;
  const L = window.saltwakeHubLife = { enabled: true, walkers: [], all: [], stats: { drawn: 0, barks: 0 }, barks: [] };
  const ROLES = ['resident', 'dock', 'merchant', 'resident', 'dock', 'smith', 'medic', 'ledger', 'resident'];
  const COATS = ['5f6b6a', '7a6550', '6c5a4a', '58646e', '8a7356', '4f5d57', '6e4f45', '76705e', '5a5a66', '82664e', '667060'];
  const LINES = ['Tide’s turning early.', 'Fresh catch! Mostly fresh.', 'Mind the salt on the steps.', 'Another skiff came back empty.',
    'Lanterns before dusk, they said.', 'The Brineworn were singing again.', 'Rope’s gone up two scrip.', 'Keep to the lit roads.',
    'Ash on the wind today.', 'Heard the bell at the Quays?', 'My boy signed with the hunters.', 'Bring me a Brineback plate, I’ll pay.'];
  let rng = 1;
  const rand = () => (rng = (rng * 16807) % 2147483647) / 2147483647;
  const pick = a => a[Math.floor(rand() * a.length)];
  const life = g => g.world.maps.hub?.life;
  const V = () => window.saltwakeVoice;

  // ---- street graph (map life.streets / life.spots / life.doors; tools/make_maps.py) --------------------------------
  let G0 = null;
  function graph(H) {
    if (G0 && G0.H === H) return G0;
    const nodes = [], key = p => p[0].toFixed(1) + ',' + p[1].toFixed(1), idx = new Map(), adj = [];
    const id = p => { const k = key(p); if (!idx.has(k)) { idx.set(k, nodes.length); nodes.push([p[0], p[1]]); adj.push([]); } return idx.get(k); };
    for (const chain of H.streets || []) for (let i = 1; i < chain.length; i++) { const a = id(chain[i - 1]), b = id(chain[i]); if (!adj[a].includes(b)) { adj[a].push(b); adj[b].push(a); } }
    const near = (x, y) => { let bi = 0, bd = 1e9; for (let i = 0; i < nodes.length; i++) { const d = Math.hypot(nodes[i][0] - x, nodes[i][1] - y); if (d < bd) { bd = d; bi = i; } } return bi; };
    const spots = (H.spots || []).map(([kind, x, y, face, when, a, b], i) => ({ i, kind, x, y, face, when, min: a, max: b, node: near(x, y) }));
    const doors = (H.doors || []).map(([x, y]) => ({ x, y, node: near(x, y) }));
    return (G0 = { H, nodes, adj, near, spots, doors });
  }
  function route(gr, from, to) {   // BFS over the street graph, returns tile points
    const prev = new Array(gr.nodes.length).fill(-1), q = [from]; prev[from] = from;
    while (q.length) { const n = q.shift(); if (n === to) break; for (const m of gr.adj[n]) if (prev[m] < 0) { prev[m] = n; q.push(m); } }
    if (prev[to] < 0) return [gr.nodes[to]];
    const out = []; for (let n = to; n !== from; n = prev[n]) out.push(gr.nodes[n]); out.push(gr.nodes[from]); return out.reverse();
  }

  // ---- time of day -------------------------------------------------------------------------------------------------
  const clockOf = g => (g.save?.environment?.clock || 0) % 1440;
  const phaseOf = g => { const m = clockOf(g); return m < 330 || m >= 1290 ? 'night' : m < 480 ? 'dawn' : m < 1080 ? 'day' : 'evening'; };
  const raining = g => /rain|squall|storm/.test(g.climateWeather?.(g.save?.environment?.clock || 0)?.id || '');
  L.phase = phaseOf; L.raining = raining;
  function wanted(g) { const H = life(g), ph = phaseOf(g); let n = ph === 'night' ? H.night : ph === 'evening' ? Math.round(H.day * .8) : ph === 'dawn' ? Math.round(H.day * .6) : H.day; if (raining(g)) n = Math.ceil(n / 2); return n; }
  function spotFor(g, gr, w) {
    const ph = phaseOf(g), wet = raining(g), busy = new Set(L.all.filter(o => o !== w && o.spot).map(o => o.spot.i));
    let list = gr.spots.filter(s => !busy.has(s.i) && (wet ? s.when === 'rain' || (s.when === 'any' && rand() < .2) : (s.when === ph || s.when === 'any' || (ph === 'dawn' && s.when === 'day' && rand() < .5))));
    if (w.last != null) list = list.filter(s => s.i !== w.last) ;
    if (!list.length) return null;
    // prefer places close by (people don't cross the whole town for every errand)
    const wx = w.x / T, wy = w.y / T, wts = list.map(s => 1 / (1 + Math.hypot(s.x - wx, s.y - wy) / 10));
    let r = rand() * wts.reduce((a, b) => a + b, 0); for (let k = 0; k < list.length; k++) { r -= wts[k]; if (r <= 0) return list[k]; }
    return list[list.length - 1];
  }

  // ---- townsfolk -----------------------------------------------------------------------------------------------------
  function makeWalker(g, gr, i, at) {
    const p = at || gr.nodes[Math.floor(rand() * gr.nodes.length)];
    return { i, x: p[0] * T, y: p[1] * T, s: 0, dist: 0, face: 'front', mirror: false, pause: 0, state: 'idle', path: [], spot: null, last: null, t: 0,
      speed: 1.05 + rand() * .6, greetCD: 0, chatCD: 4 + rand() * 10, home: gr.doors.length ? gr.doors[i % gr.doors.length] : null, hidden: false, side: 0,
      profile: window.saltwakeFaces?.profile(ROLES[i % ROLES.length], { id: 'walker_' + i, color: COATS[i % COATS.length] }) };
  }
  function goTo(gr, w, tx, ty, then) {
    const a = gr.near(w.x / T, w.y / T), b = gr.near(tx, ty);
    w.path = route(gr, a, b).concat([[tx, ty]]); w.state = 'walk'; w.then = then; w.pause = 0;
  }
  function choose(g, gr, w) {
    const ph = phaseOf(g), visible = L.all.filter(o => !o.hidden && o.state !== 'home').length;
    if (w.home && visible > wanted(g) && (ph === 'night' || ph === 'evening' && rand() < .4)) { goTo(gr, w, w.home.x, w.home.y, 'home'); return; }
    const s = spotFor(g, gr, w);
    if (s && rand() < .82) { w.spot = s; w.last = s.i; goTo(gr, w, s.x, s.y, 'act'); return; }
    const n = gr.nodes[Math.floor(rand() * gr.nodes.length)]; w.spot = null; goTo(gr, w, n[0], n[1], 'idle');   // just a stroll
  }
  function resetAll(g) {
    const gr = graph(life(g)), total = Math.max(life(g).day, wanted(g)), n = wanted(g);
    L.all = []; for (let i = 0; i < total; i++) { const w = makeWalker(g, gr, i); if (i >= n) { w.hidden = true; w.state = 'home'; } L.all.push(w); }
    // start them already busy at their places, so the harbor is alive the moment you arrive
    for (const w of L.all) if (!w.hidden) { const sp = spotFor(g, gr, w); if (sp && rand() < .6) { w.x = sp.x * T; w.y = sp.y * T; w.spot = sp; w.last = sp.i; w.state = 'act'; w.t = sp.min + rand() * (sp.max - sp.min); faceSpot(w); } else choose(g, gr, w); }
    L.stamp = g.save?.environment?.clock || 0;
  }
  function faceSpot(w) { const f = w.spot?.face || 'down'; w.face = f === 'up' ? 'back' : f === 'down' ? 'front' : 'side'; w.mirror = f === 'left'; }
  function faceTo(w, x, y) { const dx = x - w.x, dy = y - w.y; if (Math.abs(dx) > Math.abs(dy) * .8) { w.face = 'side'; w.mirror = dx < 0; } else w.face = dy < 0 ? 'back' : 'front'; }
  function say(w, text, t = 3.2, delay = 0) { if (!text) return; L.barks.push({ w, text, t: t + delay, d: delay, T: t }); L.stats.barks++; }
  L.say = say;

  function spawn(g) { resetAll(g); L.key = phaseOf(g) + (raining(g) ? 'r' : ''); }
  function step(g, dt) {
    const H = life(g); if (!H) return;
    const gr = graph(H), clock = g.save?.environment?.clock || 0;
    // a jump in time (after an expedition, sleeping, or a test) puts everyone straight where they belong
    if (!L.all?.length || L.walkers.length === 0 && L.all.some(w => !w.hidden) || Math.abs(clock - (L.stamp ?? clock)) > 45) spawn(g);
    L.stamp = clock;
    const p = g.player, wet = raining(g), ph = phaseOf(g);
    // people come out of their doors when more are wanted (morning, rain stopping)
    const vis = L.all.filter(w => !w.hidden);
    if (vis.length < wanted(g) && rand() < dt * .5) { const w = L.all.find(o => o.hidden); if (w) { const d = w.home || gr.doors[0]; w.hidden = false; w.x = d.x * T; w.y = d.y * T; w.state = 'idle'; choose(g, gr, w); L.stats.outings = (L.stats.outings || 0) + 1; } }
    for (const w of L.all) {
      if (w.hidden) continue;
      w.greetCD -= dt; w.chatCD -= dt;
      const dp = Math.hypot(p.x - w.x, p.y - w.y);
      if (w.state === 'walk') {
        // step aside when the player is in the way
        const tgt = w.path[0]; if (!tgt) { arrive(g, gr, w); continue; }
        const tx = tgt[0] * T, ty = tgt[1] * T, dx = tx - w.x, dy = ty - w.y, d = Math.hypot(dx, dy);
        const sp = w.speed * (wet ? 1.45 : 1) * T * dt;
        let ox = 0, oy = 0;
        if (dp < 46) { const ux = dx / (d || 1), uy = dy / (d || 1), cross = (p.x - w.x) * uy - (p.y - w.y) * ux; w.side = Math.max(-1, Math.min(1, w.side + (cross > 0 ? -1 : 1) * dt * 3)); L.stats.sidesteps = (L.stats.sidesteps || 0) + dt; }
        else w.side *= Math.max(0, 1 - dt * 1.5);
        if (d <= sp) { w.x = tx; w.y = ty; w.path.shift(); w.s += d / T; w.dist += d / T; if (!w.path.length) arrive(g, gr, w); }
        else { w.x += dx / d * sp; w.y += dy / d * sp; w.s += sp / T; w.dist += sp / T; faceTo(w, tx, ty); }
        if (w.side) { const ux = dx / (d || 1), uy = dy / (d || 1); ox = -uy * w.side * 18; oy = ux * w.side * 18; }
        w.ox = ox; w.oy = oy;
        // two townsfolk crossing paths may stop for a word
        if (w.chatCD <= 0 && !wet) for (const o of L.all) if (o !== w && !o.hidden && o.chatCD <= 0 && o.state === 'walk' && Math.hypot(o.x - w.x, o.y - w.y) < 34 && rand() < .5) { startChat(g, w, o); break; }
      } else if (w.state === 'act' || w.state === 'idle' || w.state === 'chat' || w.state === 'greet') {
        w.t -= dt; w.ox = (w.ox || 0) * .9; w.oy = (w.oy || 0) * .9;
        if (w.state === 'chat' && w.with) faceTo(w, w.with.x, w.with.y);
        else if (dp < 90 && w.state !== 'act') faceTo(w, p.x, p.y);
        if (w.state === 'act' && rand() < dt * .03) say(w, V()?.townLine?.(g, w, w.spot?.kind) || pick(LINES));
        if (w.t <= 0) { if (w.state === 'chat') w.with = null; w.spot = null; choose(g, gr, w); }
      } else if (w.state === 'home') { w.hidden = true; }
      // greet the player: turn, nod and say something (not too often)
      if (dp < 78 && w.greetCD <= 0 && (L.greetGlobal || 0) <= 0 && w.state !== 'chat' && !g.panel) {
        w.greetCD = 50 + rand() * 40; L.greetGlobal = 7; faceTo(w, p.x, p.y);
        if (w.state === 'walk') { w.state = 'greet'; w.t = 1.6; w.resume = w.path; w.resumeThen = w.then; }
        say(w, V()?.greet?.(g, w) || 'Salvager.'); L.stats.greets = (L.stats.greets || 0) + 1;
      }
      if (w.state === 'greet' && w.t <= 0 && w.resume) { w.state = 'walk'; w.path = w.resume; w.then = w.resumeThen; w.resume = null; }
    }
    L.greetGlobal = (L.greetGlobal || 0) - dt;
    L.walkers = L.all.filter(w => !w.hidden);
    // ambient lines from someone near the player (the voice module picks lines that fit the moment)
    L.nextBark = (L.nextBark ?? 4) - dt;
    if (L.nextBark <= 0) {
      L.nextBark = 7 + rand() * 7;
      const near = L.walkers.filter(w => w.state !== 'chat' && Math.hypot(w.x - p.x, w.y - p.y) < 420);
      if (near.length) { const w = pick(near); say(w, V()?.townLine?.(g, w, w.spot?.kind) || pick(LINES)); }
    }
    for (const b of L.barks) b.t -= dt;
    L.barks = L.barks.filter(b => b.t > 0);
  }
  function arrive(g, gr, w) {
    if (w.then === 'home') { w.state = 'home'; w.hidden = true; L.stats.homecomings = (L.stats.homecomings || 0) + 1; return; }
    if (w.then === 'act' && w.spot) { w.state = 'act'; w.t = w.spot.min + rand() * (w.spot.max - w.spot.min); faceSpot(w); L.stats.activities = (L.stats.activities || 0) + 1; return; }
    w.state = 'idle'; w.t = 1 + rand() * 3;
  }
  function startChat(g, a, b) {
    const lines = V()?.chat?.(g, a, b) || [[0, 'Evening.'], [1, 'Evening.']];
    const dur = Math.max(4, lines.length * 2.4 + 1);
    for (const [w, o] of [[a, b], [b, a]]) { w.state = 'chat'; w.with = o; w.t = dur; w.chatCD = 40 + rand() * 40; w.ox = 0; w.oy = 0; faceTo(w, o.x, o.y); }
    lines.forEach(([who, text], k) => say(who ? b : a, text, 2.6, k * 2.4));
    L.stats.chats = (L.stats.chats || 0) + 1;
  }

  const hubActive = g => L.enabled && g.mapId === 'hub' && !g.raid && g.mode === 'play' && g.map()?.tilemap && life(g);

  const update = P.update;
  P.update = function (dt) { const out = update.apply(this, arguments); if (hubActive(this) && !this.isPaused?.()) step(this, Math.min(dt || 0, .1)); return out; };

  // Draw walkers and boats inside the scene pass (depth-sorted): temporary scene objects with "life:" keys.
  const scene = P.drawCoastScene;
  P.drawCoastScene = function (view) {
    if (!hubActive(this) || !SALTWAKE_VIS.hub) return scene.apply(this, arguments);
    const vis = SALTWAKE_VIS.hub, base = vis.decor, H = life(this), now = performance.now() / 1000;
    const temps = L.walkers.map((w, i) => ({ asset: 'life:w' + i, x: (w.x + (w.ox || 0)) / T, y: (w.y + (w.oy || 0)) / T, w: 2, h: 3, anchor: 'bottom' }))
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
        if (b.d && b.t > (b.T || 3.2)) continue;   // a reply waiting for its turn
        const x = (b.w.x + (b.w.ox || 0) - this.camera.x) * z, y = (b.w.y - 92 - this.camera.y) * z; if (x < 0 || y < 0 || x > VW || y > VH) continue;
        const a = Math.max(0, Math.min(1, b.t / .5, ((b.T || 3.2) - b.t) / .3)), w = g.measureText(b.text).width + 14;
        g.globalAlpha = a * .82; g.fillStyle = 'rgba(246,244,239,.9)'; g.beginPath(); g.roundRect(x - w / 2, y - 18, w, 22, 8); g.fill();
        g.globalAlpha = a; g.fillStyle = '#1c2224'; g.fillText(b.text, x, y - 3);
      }
      g.restore();
    }
    return out;
  };
})();
