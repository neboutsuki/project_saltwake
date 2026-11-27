/* SALTWAKE survival operations (v0.31), Helldivers-style.
 * A SURVIVAL commission (board) sends you to a site on the Outer Quays. Press E there to light the signal beacon:
 *   HOLD THE LINE  escalating waves of monsters close in from all sides (they always know where you are);
 *   BOAT INBOUND   the last 30 s are a surge;
 *   EVAC           the guild boat pulls in at the nearest shore - reach it and stand in the circle to win.
 * Call-ins (stratagems) while the beacon burns: hold X and type the code with WASD / arrows (you stop moving), it is
 * thrown at your aim. Supply Drop (ammo + medicine pod) · Mortar Barrage (6 shells around the mark - friendly fire!)
 * · Harbor Cannon (one huge blast). Each has a cooldown.
 * Win = the commission completes and the raid ends as a safe extraction (normal reward + kill bonus scrip).
 * Art used: art/props/brazier (beacon), art/props/rowboat (boat), art/props/open_supply_crate (pod). Effects in code.
 * window.saltwakeSurvival exposes state and helpers for QA.
 */
(() => {
  const P = Game.prototype, T = 32, TAU = Math.PI * 2, $ = id => document.getElementById(id);
  const STRAT = [
    { id: 'supply', name: 'Supply Drop', code: 'DDUR', cd: 45, delay: 3.5 },
    { id: 'mortar', name: 'Mortar Barrage', code: 'RRDL', cd: 70, delay: 2.5 },
    { id: 'cannon', name: 'Harbor Cannon', code: 'URDDD', cd: 110, delay: 2.5 },
  ];
  const GLYPH = { U: '↑', D: '↓', L: '←', R: '→' };
  const SV = window.saltwakeSurvival = { STRAT, stats: { started: 0, waves: 0, spawned: 0, calls: 0, blasts: 0, pods: 0, wins: 0 } };
  const CT = () => window.saltwakeContracts;
  const cur = g => { const k = CT()?.current?.(g); return k && k.s.kind === 'survive' ? k : null; };
  const site = k => CT()?.SITES?.[k.s.target];
  const fmt = s => `${Math.floor(s / 60)}:${String(Math.max(0, Math.floor(s % 60))).padStart(2, '0')}`;
  const near = (a, b, r) => Math.hypot(a.x - b.x, a.y - b.y) < r;
  const img = a => { const s = window.SALTWAKE_ASSETS?.images?.[a]; if (!s) return null; const c = img.c ||= {}; if (!c[a]) { c[a] = new Image(); c[a].src = s; } return c[a]; };
  const okImg = im => im && im.complete && im.naturalWidth > 0;
  const sprite = (a, x, footY, h) => { const im = img(a); if (!okImg(im)) return false; const w = h * im.naturalWidth / im.naturalHeight; g.imageSmoothingEnabled = false; g.drawImage(im, x - w / 2, footY - h, w, h); return true; };

  SV.state = g => g.raid?.surv || null;
  function state(g) {
    const r = g.raid; if (!r) return null;
    if (!r.surv && r.operation) { const o = r.operation;     // Brinefront operation: objectives first, then call extraction at the beacon
      r.surv = { phase: 'ops', op: true, t: 0, seconds: o.hold || 90, evac: 30, wave: 0, next: 45, kills: 0, tier: o.tier || 2, site: { x: o.evac.x * T, y: o.evac.y * T, name: 'the extraction beacon' },
        cd: Object.fromEntries(STRAT.map(x => [x.id, 0])), calls: [], shells: [], pods: [], input: [], menu: false, boat: null, zone: null, board: 0, msg: null }; }
    if (!r.surv) { const k = cur(g); if (!k) return null; const s = site(k);
      r.surv = { phase: 'idle', t: 0, seconds: k.s.seconds || 180, evac: 30, wave: 0, next: 4, kills: 0, tier: k.c.tier || 1, site: { x: s.x * T, y: s.y * T, name: s.name },
        cd: Object.fromEntries(STRAT.map(x => [x.id, 0])), calls: [], shells: [], pods: [], input: [], menu: false, boat: null, zone: null, board: 0, msg: null }; }
    return r.surv;
  }
  SV.ensure = state;

  // ---- start ----------------------------------------------------------------------------------------------------
  function start(g) {
    const S = state(g); if (!S || (S.phase !== 'idle' && S.phase !== 'ops')) return false;
    S.phase = 'waves'; S.t = 0; S.next = 3; SV.stats.started++;
    S.zone = evacPoint(g, S.site);
    g.notify('BEACON LIT · Hold the line! Hold X for call-ins', 4); window.saltwakeAudio?.event?.('warning', .8); window.saltwakeCamera?.shake?.(.2);
    return true;
  }
  SV.start = start;
  const interact = P.interact;
  P.interact = function () {
    const S = this.raid && state(this);
    if (S && S.phase === 'idle' && near(this.player, S.site, 3 * T)) { start(this); return; }
    if (S && S.phase === 'ops' && near(this.player, S.site, 3 * T)) { const o = this.raid.operation, left = o.objectives.filter(x => !x.done).length;
      if (left) { this.notify(`Complete the objectives first · ${o.objectives.length - left}/${o.objectives.length} done`, 3); return; }
      start(this); this.notify('EXTRACTION CALLED · Hold the beacon until the boat arrives! Hold X for call-ins', 4); return; }
    return interact.apply(this, arguments);
  };
  // the boat lands at the nearest shore to the site (else at the site itself)
  function evacPoint(g, s) {
    let best = null;
    for (let k = 0; k < 24; k++) { const a = k / 24 * TAU; let lastDry = null;
      for (let d = 32; d < 14 * T; d += 16) { const x = s.x + Math.cos(a) * d, y = s.y + Math.sin(a) * d;
        if (g.isWater?.(x, y)) { if (lastDry && (!best || d < best.d)) best = { x: lastDry.x, y: lastDry.y, wx: x + Math.cos(a) * 40, wy: y + Math.sin(a) * 40, a, d }; break; }
        if (g.walkable(x, y)) lastDry = { x, y }; else break; } }
    return best || { x: s.x, y: s.y + 2 * T, wx: s.x, wy: s.y + 4 * T, a: Math.PI / 2, d: 0 };
  }

  // ---- waves ------------------------------------------------------------------------------------------------------
  function pool(g, S) {
    const night = !!g.climateState?.().night, w = S.wave, out = ['gull', 'widow'];
    if (w >= 2 || S.tier >= 2) out.push('brineback');
    if (night || S.tier >= 2 && w >= 3 || S.tier >= 3) out.push('brineworn_drifter', 'brineworn_drifter');
    if (S.tier >= 2 && w >= 5 || S.tier >= 3 && w >= 3) out.push('brineworn_breaker');
    return out;
  }
  function make(g, type, x, y, id) {
    if (/^brineworn_/.test(type)) return window.saltwakeAlpha?.makeAltered?.(g, type, x, y, id) || null;
    const d = (g.world.content.enemies || []).find(t => t.id === type); if (!d) return null;
    return { id, type, name: d.name, x, y, homeX: x, homeY: y, hp: d.health, maxHp: d.health, dead: false, aggro: 9, attackCD: 1.2, walk: Math.random() * 5, phase: Math.floor(Math.random() * 9),
      factionId: 'wildlife', actorType: 'monster', provoked: true, parts: (d.parts || []).map(p => ({ ...p, current: p.hp, broken: false })) };
  }
  function spawnWave(g, S, surge) {
    const r = g.raid, p = g.player, alive = r.enemies.filter(e => e.surv && !e.dead).length;
    const want = Math.min(16 - alive, Math.round((3 + S.wave * 1.4) * (1 + (S.tier - 1) * .35) * (surge ? 1.3 : 1)));
    const types = pool(g, S); let n = 0;
    for (let i = 0; i < want; i++) {
      for (let tries = 0; tries < 14; tries++) {
        const a = Math.random() * TAU, d = 420 + Math.random() * 160;
        let x = p.x + Math.cos(a) * d, y = p.y + Math.sin(a) * d;
        const nw = window.saltwakeTiles?.nearestWalkable?.(g, x / T, y / T); if (nw) { x = nw[0] * T; y = nw[1] * T; }
        if (!g.walkable(x, y) || g.isWater?.(x, y) || Math.hypot(x - p.x, y - p.y) < 320) continue;
        const e = make(g, types[Math.floor(Math.random() * types.length)], x, y, `surv_${S.wave}_${i}_${Math.floor(Math.random() * 1e6)}`); if (!e) break;
        g.initSense?.(e); e.surv = true; e.provoked = true; e.awareness = 'alert'; e.aggro = 9;
        r.enemies.push(e); n++; SV.stats.spawned++; break;
      }
    }
    return n;
  }
  SV.spawnWave = (g, surge) => spawnWave(g, state(g), surge);

  // ---- call-ins ---------------------------------------------------------------------------------------------------
  const active = g => { const S = g.raid && !g.isPaused?.() && g.mode === 'play' && state(g); return S && (S.phase === 'ops' || S.phase === 'waves' || S.phase === 'evac' || S.phase === 'board') ? S : null; };
  function call(g, id, x, y) {
    const S = state(g), st = STRAT.find(s => s.id === id); if (!S || !st || S.cd[id] > 0) return false;
    if (x == null) { const a = g.aimWorld?.() || { x: g.player.x + 100, y: g.player.y }, d = Math.hypot(a.x - g.player.x, a.y - g.player.y), k = Math.min(1, 300 / (d || 1)); x = g.player.x + (a.x - g.player.x) * k; y = g.player.y + (a.y - g.player.y) * k; }
    S.cd[id] = st.cd; S.calls.push({ id, x, y, t: st.delay, max: st.delay }); SV.stats.calls++;
    g.notify(`${st.name.toUpperCase()} INBOUND`, 1.8); window.saltwakeAudio?.event?.('ui', 1);
    return true;
  }
  SV.call = call;
  function input(g, dir) {
    const S = active(g); if (!S) return false;
    S.input.push(dir); const code = S.input.join('');
    const done = STRAT.find(s => s.code === code && S.cd[s.id] <= 0);
    if (done) { S.input = []; S.menu = false; call(g, done.id); return done.id; }
    if (!STRAT.some(s => s.code.startsWith(code))) { S.input = []; window.saltwakeAudio?.event?.('failure', .4); return null; }
    window.saltwakeAudio?.event?.('ui', .5); return '';
  }
  SV.input = input;
  const DIRS = { KeyW: 'U', ArrowUp: 'U', KeyS: 'D', ArrowDown: 'D', KeyA: 'L', ArrowLeft: 'L', KeyD: 'R', ArrowRight: 'R' };
  window.addEventListener('keydown', e => {
    const G = window.SALTWAKE_DEV?.game; if (!G || G.panel) return; const S = active(G); if (!S) return;
    if (e.code === 'KeyX') { e.preventDefault(); if (!S.menu) { S.menu = true; S.input = []; for (const k of Object.keys(DIRS)) delete G.keys[k]; } return; }
    if (S.menu && DIRS[e.code]) { e.preventDefault(); e.stopImmediatePropagation(); if (!e.repeat) input(G, DIRS[e.code]); }
  }, true);
  window.addEventListener('keyup', e => { const G = window.SALTWAKE_DEV?.game; const S = G?.raid?.surv; if (S && e.code === 'KeyX') { S.menu = false; S.input = []; } }, true);

  function blast(g, x, y, R, dmg, friendly) {
    const r = g.raid; SV.stats.blasts++;
    for (const e of r.enemies) { if (e.dead) continue; const d = Math.hypot(e.x - x, e.y - y); if (d > R + 14) continue;
      const k = 1 - Math.max(0, d - R * .4) / (R * .6 + 14); g.hitMonster(e, dmg * Math.max(.35, k), { penetration: 45, stagger: 3, partPower: 1.3, explosive: true }, e.x, e.y); if (!e.dead) e.lastAttacker = 'player'; }
    const p = g.player; if (friendly && Math.hypot(p.x - x, p.y - y) < R && p.iframes <= 0) { g.hurtPlayer(friendly, 0); g.notify('Caught in your own barrage!', 1.6); }
    if (r.particles) for (let i = 0; i < 26; i++) { const a = Math.random() * TAU, v = 60 + Math.random() * 260; r.particles.push({ x, y: y - 6, vx: Math.cos(a) * v, vy: Math.sin(a) * v * .6 - 40, t: .3 + Math.random() * .4, color: i % 3 ? '#f2b45a' : '#5a5148' }); }
    const IM = window.saltwakeImpact; if (IM) { const blobs = []; for (let i = 0; i < 7; i++) blobs.push([(Math.random() - .5) * R * .7, (Math.random() - .5) * R * .4, R * (.12 + Math.random() * .15)]); IM.decals.push({ x, y: y - 14, blobs, color: '#1d1712', life: 30 }); IM.SFX?.kill?.(); }
    window.saltwakeCamera?.shake?.(Math.min(.8, R / 140)); r.swBooms = (r.swBooms || []).concat([{ x, y, R, life: .35 }]);
  }
  function resolve(g, c) {
    if (c.id === 'supply') { const items = { bandage: 2, healing_tincture: 1 }; const a = g.save.armory;
      for (const id of a?.equipped || []) { const n = id && (typeof ARMORY !== 'undefined') && ARMORY.weapons.find(w => w.id === id); const am = n && ARMORY.families[n.family]?.ammoId; if (am) items[am] = (items[am] || 0) + (am === 'longbolt' ? 6 : 14); }
      if (Object.keys(items).length < 3) { items.bolt = (items.bolt || 0) + 14; items.wick_cell = (items.wick_cell || 0) + 10; }
      state(g).pods.push({ x: c.x, y: c.y, items, life: 60 }); window.saltwakeCamera?.shake?.(.25); SV.stats.pods++; }
    if (c.id === 'mortar') for (let i = 0; i < 6; i++) { const a = Math.random() * TAU, d = Math.random() * 110; state(g).shells.push({ x: c.x + Math.cos(a) * d, y: c.y + Math.sin(a) * d * .8, t: .5 + i * .5, max: .9, R: 58, dmg: 150, ff: 30 }); }
    if (c.id === 'cannon') blast(g, c.x, c.y, 110, 480, 60);
  }

  // ---- per frame --------------------------------------------------------------------------------------------------
  const upd = P.update;
  P.update = function (dt) {
    const out = upd.apply(this, arguments);
    const r = this.raid; if (!r || this.isPaused?.()) return out;
    const S = state(this); if (!S) return out; dt = Math.min(.1, dt || 0);
    const p = this.player;
    if (S.phase === 'ops' || S.phase === 'waves' || S.phase === 'evac' || S.phase === 'board') {
      if (S.phase !== 'ops') S.t += dt;
      for (const k in S.cd) S.cd[k] = Math.max(0, S.cd[k] - dt);
      // surviving monsters always know where you are
      for (const e of r.enemies) if (e.surv && !e.dead) { e.lastSeenX = p.x; e.lastSeenY = p.y; e.provoked = true; e.aggro = Math.max(e.aggro || 0, 5); if (e.awareness !== 'alert') { e.awareness = 'alert'; e.searchTime = 0; } }
      S.next -= dt;
      if (S.phase === 'ops') { if (S.next <= 0) { spawnWave(this, S, false); S.next = 50 + Math.random() * 25; this.notify('A patrol has picked up your trail', 2); } }
      else if (S.phase === 'waves') {
        if (S.next <= 0) { S.wave++; SV.stats.waves++; spawnWave(this, S, false); S.next = Math.max(11, 21 - S.wave * .9); this.notify(`WAVE ${S.wave}`, 1.4); }
        if (S.t >= S.seconds) { S.phase = 'evac'; S.evacT = S.evac; S.next = 2; S.boat = { x: S.zone.wx + Math.cos(S.zone.a) * 700, y: S.zone.wy + Math.sin(S.zone.a) * 700 }; this.notify('BOAT INBOUND · 30 seconds · hold on!', 3.5); window.saltwakeAudio?.event?.('warning', 1); }
      } else if (S.phase === 'evac') {
        S.evacT -= dt; const k = 1 - Math.max(0, S.evacT) / S.evac;
        S.boat.x = S.zone.wx + Math.cos(S.zone.a) * 700 * (1 - k); S.boat.y = S.zone.wy + Math.sin(S.zone.a) * 700 * (1 - k);
        if (S.next <= 0) { S.wave++; spawnWave(this, S, true); S.next = 9; }
        if (S.evacT <= 0) { S.phase = 'board'; S.board = 0; this.notify('EVAC READY · Get to the boat!', 3.5); window.saltwakeAudio?.event?.('success', .7); }
      } else if (S.phase === 'board') {
        if (Math.hypot(p.x - S.zone.x, p.y - S.zone.y) < 70) S.board += dt; else S.board = Math.max(0, S.board - dt * 2);
        if (S.board >= 2) { const k = cur(this), bonus = S.kills * 4 + S.wave * 10 + (r.operation ? r.operation.reward : 0); if (r.operation) r.operation.complete = true; S.phase = 'done'; SV.stats.wins++;
          if (k) this.livingAdvance('survive', k.s.target); this.save.gold += bonus; this.notify(`EVACUATED · ${S.kills} kills · +${bonus} bonus scrip`, 5);
          this.endRaid(true, 'Evacuated by the guild boat'); return out; }
      }
      for (const c of S.calls) { c.t -= dt; if (c.t <= 0) resolve(this, c); } S.calls = S.calls.filter(c => c.t > 0);
      for (const s of S.shells) { s.t -= dt; if (s.t <= 0) blast(this, s.x, s.y, s.R, s.dmg, s.ff); } S.shells = S.shells.filter(s => s.t > 0);
      for (const pod of S.pods) { pod.life -= dt; if (!pod.got && Math.hypot(p.x - pod.x, p.y - pod.y) < 44) { pod.got = true; for (const [id, n] of Object.entries(pod.items)) addItem(this.save.bag, id, n);
        this.notify('Supply pod · ' + Object.entries(pod.items).map(([id, n]) => `${n} × ${itemDef(id).name}`).join(' · '), 3); window.saltwakeAudio?.event?.('loot', 1); } }
      S.pods = S.pods.filter(x => !x.got && x.life > 0);
    }
    if (r.swBooms) { for (const b of r.swBooms) b.life -= dt; r.swBooms = r.swBooms.filter(b => b.life > 0); }
    return out;
  };
  const hm = P.hitMonster;
  P.hitMonster = function (e) { const was = e.dead, out = hm.apply(this, arguments); if (!was && e.dead && e.surv && this.raid?.surv) this.raid.surv.kills++; return out; };

  // ---- drawing (world) --------------------------------------------------------------------------------------------
  const scene = P.drawCoastScene;
  P.drawCoastScene = function () {
    const out = scene.apply(this, arguments), S = this.raid && state(this); if (!S) return out;
    const now = performance.now() / 1000, s = S.site;
    g.save();
    // beacon
    sprite('art/props/brazier', s.x, s.y + 10, 58);
    if (S.phase !== 'idle' && S.phase !== 'ops') { const fl = .7 + Math.sin(now * 13) * .15 + Math.sin(now * 7.3) * .1; const gr = g.createRadialGradient(s.x, s.y - 30, 2, s.x, s.y - 30, 90 * fl);
      gr.addColorStop(0, 'rgba(255,200,110,.55)'); gr.addColorStop(1, 'rgba(255,140,60,0)'); g.globalCompositeOperation = 'lighter'; g.fillStyle = gr; g.fillRect(s.x - 100, s.y - 130, 200, 200); g.globalCompositeOperation = 'source-over'; }
    else if (S.phase === 'ops' && Math.hypot(this.player.x - s.x, this.player.y - s.y) < 3 * T) { const ready = this.raid.operation.objectives.every(o => o.done), t2 = ready ? 'E · Call extraction' : 'Extraction beacon · finish the objectives';
      g.font = '600 13px system-ui'; g.textAlign = 'center'; g.fillStyle = ready ? 'rgba(160,240,210,.95)' : 'rgba(255,240,200,.8)'; g.strokeStyle = 'rgba(0,0,0,.7)'; g.lineWidth = 3; g.strokeText(t2, s.x, s.y - 70); g.fillText(t2, s.x, s.y - 70); }
    else if (S.phase === 'idle' && Math.hypot(this.player.x - s.x, this.player.y - s.y) < 3 * T) { g.font = '600 13px system-ui'; g.textAlign = 'center'; g.fillStyle = 'rgba(255,240,200,.95)'; g.strokeStyle = 'rgba(0,0,0,.7)'; g.lineWidth = 3; g.strokeText('E · Light the signal beacon', s.x, s.y - 70); g.fillText('E · Light the signal beacon', s.x, s.y - 70); }
    // pods
    for (const pod of S.pods) { sprite('art/props/open_supply_crate', pod.x, pod.y + 8, 40); g.strokeStyle = `rgba(140,230,200,${.5 + .4 * Math.sin(now * 5)})`; g.lineWidth = 2; g.beginPath(); g.ellipse(pod.x, pod.y + 6, 26, 12, 0, 0, TAU); g.stroke(); }
    // boat + evac zone
    if (S.boat) { const bob = Math.sin(now * 2) * 3; sprite('art/props/rowboat', S.boat.x, S.boat.y + 20 + bob, 70); }
    if (S.phase === 'board') { const z = S.zone, k = S.board / 2; g.strokeStyle = 'rgba(140,230,200,.9)'; g.lineWidth = 3; g.setLineDash([10, 6]); g.beginPath(); g.ellipse(z.x, z.y, 70, 44, 0, 0, TAU); g.stroke(); g.setLineDash([]);
      g.fillStyle = 'rgba(140,230,200,.22)'; g.beginPath(); g.ellipse(z.x, z.y, 70 * k, 44 * k, 0, 0, TAU); g.fill(); }
    // call-in beams
    for (const c of S.calls) { const k = 1 - c.t / c.max, col = c.id === 'supply' ? '120,220,255' : '255,110,80';
      g.globalCompositeOperation = 'lighter'; const gr = g.createLinearGradient(c.x, c.y - 420, c.x, c.y); gr.addColorStop(0, `rgba(${col},0)`); gr.addColorStop(1, `rgba(${col},${.35 + .3 * Math.sin(now * 20)})`);
      g.fillStyle = gr; g.fillRect(c.x - 3 - 3 * k, c.y - 420, 6 + 6 * k, 420); g.globalCompositeOperation = 'source-over';
      g.font = '700 12px system-ui'; g.textAlign = 'center'; g.fillStyle = `rgb(${col})`; g.fillText(c.t.toFixed(1), c.x, c.y + 22);
      if (c.id === 'cannon') { g.strokeStyle = `rgba(255,90,60,${.4 + .5 * k})`; g.lineWidth = 2; g.beginPath(); g.ellipse(c.x, c.y, 110, 77, 0, 0, TAU); g.stroke(); g.fillStyle = `rgba(255,80,50,${.12 * k + .05})`; g.fill(); }
      if (c.id === 'mortar') { g.strokeStyle = 'rgba(255,120,80,.35)'; g.setLineDash([6, 6]); g.beginPath(); g.ellipse(c.x, c.y, 160, 110, 0, 0, TAU); g.stroke(); g.setLineDash([]); } }
    for (const sh of S.shells) if (sh.t < sh.max) { const k = 1 - sh.t / sh.max; g.strokeStyle = `rgba(255,90,60,${.5 + .5 * k})`; g.lineWidth = 2; g.beginPath(); g.ellipse(sh.x, sh.y, sh.R, sh.R * .7, 0, 0, TAU); g.stroke();
      g.fillStyle = `rgba(255,80,50,${.25 * k})`; g.beginPath(); g.ellipse(sh.x, sh.y, sh.R * k, sh.R * .7 * k, 0, 0, TAU); g.fill(); }
    for (const b of this.raid.swBooms || []) { const k = b.life / .35; g.globalCompositeOperation = 'lighter'; const gr = g.createRadialGradient(b.x, b.y - 10, 0, b.x, b.y - 10, b.R * (1.3 - k * .4));
      gr.addColorStop(0, `rgba(255,240,200,${.9 * k})`); gr.addColorStop(.5, `rgba(255,150,60,${.5 * k})`); gr.addColorStop(1, 'rgba(255,90,40,0)'); g.fillStyle = gr; g.fillRect(b.x - b.R * 1.4, b.y - b.R * 1.4, b.R * 2.8, b.R * 2.8); g.globalCompositeOperation = 'source-over'; }
    g.restore();
    return out;
  };

  // ---- HUD --------------------------------------------------------------------------------------------------------
  const css = document.createElement('style');
  css.textContent = `#swSurv{position:absolute;top:90px;left:50%;transform:translateX(-50%);z-index:5;pointer-events:none;text-align:center;font:600 13px system-ui,sans-serif;color:#f3ead8;text-shadow:0 1px 3px #000}
  #swSurv b{display:block;font-size:20px;letter-spacing:.12em;color:#ffd27a}#swSurv.evac b{color:#ff8a6a}#swSurv.board b{color:#8ce6c8}#swSurv small{opacity:.85}
  #swStrat{position:absolute;right:14px;bottom:96px;z-index:5;pointer-events:none;display:flex;flex-direction:column;gap:4px;font:600 12px system-ui,sans-serif;color:#eee}
  #swStrat div{display:flex;gap:8px;align-items:center;justify-content:space-between;padding:4px 9px;border-radius:8px;background:rgba(10,14,16,.55);border:1px solid rgba(255,255,255,.1);min-width:190px}
  #swStrat div.cd{opacity:.5}#swStrat i{font-style:normal;letter-spacing:.15em;color:#9fd8ff}#swStrat i u{text-decoration:none;color:#ffd27a}#swStrat.open div{background:rgba(20,30,36,.85);border-color:rgba(159,216,255,.5)}#swStrat .hint{justify-content:center;opacity:.75}`;
  document.head.appendChild(css);
  const hud = P.hud;
  P.hud = function () {
    const out = hud.apply(this, arguments); let el = $('swSurv'), st = $('swStrat');
    if (!el) { el = document.createElement('div'); el.id = 'swSurv'; ($('world')?.parentElement || document.body).appendChild(el); }
    if (!st) { st = document.createElement('div'); st.id = 'swStrat'; ($('world')?.parentElement || document.body).appendChild(st); }
    const S = this.raid && this.mode === 'play' && state(this);
    if (!S || S.phase === 'done') { el.hidden = st.hidden = true; return out; }
    el.hidden = false; el.className = S.phase;
    const ops = S.phase === 'ops' && this.raid.operation, objs = ops ? ops.objectives.map(o => `${o.done ? '✓' : '○'} ${o.label}${!o.done && o.kind === 'mast' && o.progress ? ' ' + Math.round(o.progress / o.need * 100) + '%' : ''}`).join(' · ') : '';
    const html = ops ? `<b>OPERATION · ${ops.name}</b><small>${objs}${ops.objectives.every(o => o.done) ? ' · <b style="display:inline;font-size:13px">Call extraction at the beacon (E)</b>' : ''}</small>`
      : S.phase === 'idle' ? `<b>SURVIVAL</b><small>Go to ${S.site.name} and light the beacon (E)</small>`
      : S.phase === 'waves' ? `<b>HOLD THE LINE · ${fmt(S.seconds - S.t)}</b><small>Wave ${S.wave} · ${S.kills} kills · next wave ${Math.ceil(Math.max(0, S.next))}s</small>`
        : S.phase === 'evac' ? `<b>BOAT INBOUND · ${fmt(S.evacT)}</b><small>Survive! · ${S.kills} kills</small>`
          : `<b>EVAC READY</b><small>Reach the boat and stand in the circle ${S.board > 0 ? '· boarding ' + Math.round(S.board / 2 * 100) + '%' : ''}</small>`;
    if (el.innerHTML !== html) el.innerHTML = html;
    st.hidden = S.phase === 'idle'; st.className = S.menu ? 'open' : '';
    const typed = S.input.join('');
    const sh = STRAT.map(s => { const ready = S.cd[s.id] <= 0, code = [...s.code].map((d, i) => S.menu && typed && s.code.startsWith(typed) && i < typed.length ? `<u>${GLYPH[d]}</u>` : GLYPH[d]).join('');
      return `<div class="${ready ? '' : 'cd'}"><span>${s.name}</span><i>${ready ? code : Math.ceil(S.cd[s.id]) + 's'}</i></div>`; }).join('') + `<div class="hint">${S.menu ? 'Type the code (WASD / arrows)' : 'Hold X · call-ins'}</div>`;
    if (st.innerHTML !== sh) st.innerHTML = sh;
    return out;
  };
  // quest marker: the site, then the boat
  const UI = window.saltwakeQuestUI;
  if (UI) { const ex = UI.extraTarget; UI.extraTarget = g => { const S = g.raid && state(g);
    if (S && S.phase === 'idle') return { q: null, loc: { mapId: 'quays', name: S.site.name }, x: S.site.x, y: S.site.y + 30 };
    if (S && S.phase === 'ops') { const o = g.raid.operation.objectives.find(x => !x.done);
      return o ? { q: null, loc: { mapId: g.mapId, name: o.label }, x: o.x * T, y: o.y * T + 30 } : { q: null, loc: { mapId: g.mapId, name: 'the extraction beacon' }, x: S.site.x, y: S.site.y + 30 }; }
    if (S && S.phase === 'board') return { q: null, loc: { mapId: 'quays', name: 'the boat' }, x: S.zone.x, y: S.zone.y + 30 };
    return ex ? ex(g) : null; }; }
})();
