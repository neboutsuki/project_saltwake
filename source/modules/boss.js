/* SALTWAKE boss: the Tidemaw at the Boathouse Slip (v0.31).
 * The fight starts when you step inside the fenced Slip during an expedition (once per expedition, until slain).
 * It never leaves the Slip. Run out of the Slip and it sinks back under the sand to recover (heals a quarter of its
 * missing health over 10 s away); step back in and it rises again.
 * Uses the normal combat rules: bullets hit its body and breakable parts (gills, jaw, tail), parts drop trophies,
 * stagger opens it up, Hunter XP on the kill.
 * Moves (every attack is telegraphed on the ground):
 *   Bite lunge   - locks a line, then dashes along it. Dash into a pillar and it stuns itself (wall stun).
 *   Tail sweep   - when you stand behind it: an arc behind the body.
 *   Brine spit   - three-shot spread. Missed spits leave harpoon wrecks: pick one up (E) and your next shot throws
 *                  it back for heavy damage and stagger.
 *   Burrow (below 60%) - dives, travels under the sand, erupts where you stood.
 *   RIPTIDE (ultimate, below 60%, then every ~28 s) - a long wind-up, then a flood across the whole Slip for heavy
 *                  damage. Break BOTH gills and it can no longer call the tide; a stagger during the wind-up cancels it.
 *   Enrage below 30%: faster and shorter pauses.
 * Art: art/bosses/tidemaw (a placeholder image until the real art arrives).
 * window.saltwakeBoss exposes state and settings for QA.
 */
(() => {
  const P = Game.prototype, T = 32;
  const ARENA = { x0: 147.5, y0: 92.2, x1: 189, y1: 117.5, cx: 168, cy: 104, gate: [157.4, 89.6, 9.2, 2.6] };
  const OFF = { gill_left: [52, -34], gill_right: [52, 34], jaw: [132, 0], tail: [-128, 0] }, K = 1.4 * .85;
  // Arenas per map: the Slip on the Outer Quays (Tidemaw), and the final arena (the Elder Tidemaw, registered by isle.js).
  const ARENAS = { quays: { ...ARENA } };
  const B = window.saltwakeBoss = { ARENA, ARENAS, map: 'quays', enabled: true, stats: { fights: 0, kills: 0, riptides: 0, cancelled: 0, harpoons: 0, wallStuns: 0, elderKills: 0 } };
  const setupArena = id => { const a = ARENAS[id]; if (!a) return false; Object.assign(ARENA, a); B.map = id; return true; };
  B.setupArena = setupArena;
  const IMG = () => (window.SALTWAKE_ASSETS && window.SALTWAKE_ASSETS.images) || {};
  let art = null; const pic = () => { if (!art) { const s = IMG()['art/bosses/tidemaw']; if (s) { art = new Image(); art.src = s; } } return art && art.complete && art.naturalWidth ? art : null; };
  const inArena = (x, y) => x / T > ARENA.x0 && x / T < ARENA.x1 && y / T > ARENA.y0 && y / T < ARENA.y1;
  const def = g => (g.world.content.enemies || []).find(e => e.id === 'tidemaw');
  const ang = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
  const segDist = (px, py, ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy, t = L ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / L)) : 0; return Math.hypot(px - ax - dx * t, py - ay - dy * t); };

  function fight(g) { return g.raid?.tidemaw; }
  B.fight = fight;
  function start(g) {
    const d = def(g), r = g.raid; if (!d || !r) return;
    const e = { id: 'tidemaw', type: 'tidemaw', name: d.name, x: ARENA.cx * T, y: (ARENA.cy + 3) * T, homeX: ARENA.cx * T, homeY: ARENA.cy * T,
      hp: d.health, maxHp: d.health, dead: false, aggro: 9, attackCD: 1.5, walk: 0, phase: 0, factionId: 'wildlife', actorType: 'monster', provoked: true, boss: true,
      parts: d.parts.map(p => ({ ...p, current: p.hp, broken: false })), facing: -Math.PI / 2, stagger: 0, staggerTime: 0, staggerGrace: 0 };
    if (B.map === 'maw') { e.elder = true; e.name = 'The Elder Tidemaw'; e.hp = e.maxHp = Math.round(d.health * 2.4); }
    try { g.initSense?.(e); } catch (err) { }
    e.awareness = 'alert';
    r.enemies.push(e);
    r.tidemaw = { e, state: 'emerge', t: 1.6, next: 2, ripAt: null, phase: 1, harpoons: [], tele: null, done: false };
    B.stats.fights++;
    g.notify(e.elder ? 'THE ELDER TIDEMAW RISES FROM THE MAW' : 'THE TIDEMAW RISES', 4);
    g.makeSound?.(e.x, e.y, 400, 'boss');
    window.saltwakeCamera?.shake?.(.5);
  }

  function placeParts(e) {
    const c = Math.cos(e.facing), s = Math.sin(e.facing);
    for (const p of e.parts) { const o = OFF[p.id]; if (!o) continue; p.dx = (o[0] * c - o[1] * s) * K; p.dy = (o[0] * s + o[1] * c) * K; }
  }
  function moveBoss(g, e, dx, dy) {
    const nx = Math.max(ARENA.x0 * T + 40, Math.min(ARENA.x1 * T - 40, e.x + dx)), ny = Math.max(ARENA.y0 * T + 40, Math.min(ARENA.y1 * T - 30, e.y + dy));
    const prev = g.mapId; g.mapId = B.map; let ok; try { ok = g.walkable(nx, ny); } finally { g.mapId = prev; }
    if (ok) { e.x = nx; e.y = ny; return true; }
    return false;
  }
  const hurt = (g, dmg, why) => { const p = g.player, before = p.hp; g.hurtPlayer(dmg * (fight(g)?.e?.elder ? 1.25 : 1), .1); return p.hp < before; };

  function step(g, dt) {
    const F = fight(g); if (!F || F.done) return;
    const e = F.e, p = g.player, d = Math.hypot(p.x - e.x, p.y - e.y), toP = Math.atan2(p.y - e.y, p.x - e.x);
    const frac = e.hp / e.maxHp, enraged = frac < (e.elder ? .4 : .3), gillsLeft = e.parts.filter(q => /^gill/.test(q.id) && !q.broken).length;
    if (e.dead) { finish(g, F); return; }
    if (F.phase === 1 && frac < (e.elder ? .75 : .6)) { F.phase = 2; F.ripAt = 0; g.notify(e.elder ? 'The Elder Tidemaw calls its brood!' : 'The Tidemaw thrashes: the tide stirs under the Slip', 3);
      if (e.elder) brood(g, 3); }
    if (e.elder && enraged && !F.brood2) { F.brood2 = true; brood(g, 2); }
    if (enraged && !F.enraged) { F.enraged = true; g.notify('THE TIDEMAW IS ENRAGED', 3); }
    const speed = (enraged ? 1.35 : F.phase === 2 ? 1.15 : 1) * dt;
    e.staggerTime = Math.max(0, (e.staggerTime || 0) - dt); e.staggerGrace = Math.max(0, (e.staggerGrace || 0) - dt);
    if (e.staggerTime > 0 && F.state !== 'stun') {
      if (F.state === 'riptide') { B.stats.cancelled++; g.notify('RIPTIDE BROKEN · The stagger cut it short', 3); }
      F.state = 'stun'; F.t = Math.max(1.2, e.staggerTime); F.tele = null;
    }
    // harpoon pickups
    F.harpoons = F.harpoons.filter(h => !h.got);
    F.t -= dt;
    const away = !inArena(p.x, p.y);
    if (away && F.state !== 'away' && F.state !== 'riptide') { F.state = 'away'; F.away = 0; F.tele = null; e.burrowed = true; g.notify('The Tidemaw sinks beneath the Slip', 2.5); }
    if (F.state === 'away') { F.away += dt; if (F.away < 10) e.hp = Math.min(e.maxHp, e.hp + (e.maxHp - e.hp) * .025 * dt); e.x += (ARENA.cx * T - e.x) * Math.min(1, dt); e.y += (ARENA.cy * T - e.y) * Math.min(1, dt);
      if (!away) { F.state = 'emerge'; F.t = 1.2; g.notify('THE TIDEMAW RISES', 2.5); } placeParts(e); return; }
    switch (F.state) {
      case 'emerge': if (F.t <= 0) { F.state = 'chase'; F.next = 1.2; e.burrowed = false; } break;
      case 'stun': if (F.t <= 0) { F.state = 'chase'; F.next = .8; } break;
      case 'chase': {
        e.facing += ang(toP, e.facing) * Math.min(1, dt * 3);
        if (d > 150) moveBoss(g, e, Math.cos(e.facing) * 90 * speed, Math.sin(e.facing) * 90 * speed);
        F.next -= dt * (enraged ? 1.4 : 1);
        if (F.next <= 0) choose(g, F, e, d, toP, gillsLeft);
        break;
      }
      case 'lunge_tele': if (F.t <= 0) { F.state = 'lunge'; F.t = .5; } break;
      case 'lunge': {
        const v = 560 * speed, dx = Math.cos(F.tele.a) * v, dy = Math.sin(F.tele.a) * v, x0 = e.x, y0 = e.y;
        const moved = moveBoss(g, e, dx, dy);
        if (!F.hit && segDist(p.x, p.y, x0, y0, e.x + Math.cos(F.tele.a) * 90, e.y + Math.sin(F.tele.a) * 90) < 46) { F.hit = true; hurt(g, enraged ? 38 : 32); }
        if (!moved) { const near = (g.world.maps[B.map].decor || []).some(o => o.type === 'stone' && Math.hypot(o.x * T - e.x - Math.cos(F.tele.a) * 60, o.y * T - e.y - Math.sin(F.tele.a) * 60) < 90);
          if (near) { F.state = 'stun'; F.t = 2.6; e.staggerTime = 2.6; e.exposed = true; B.stats.wallStuns++; g.notify('The Tidemaw slammed into the pillar! Strike now!', 3); window.saltwakeCamera?.shake?.(.45); F.tele = null; break; }
          F.t = 0; }
        if (F.t <= 0) { F.state = 'recover'; F.t = enraged ? .5 : .9; F.tele = null; }
        break;
      }
      case 'tail_tele': if (F.t <= 0) { const behind = Math.abs(ang(toP, e.facing + Math.PI)) < 1.1 && d < 190; if (behind) hurt(g, 28); F.state = 'recover'; F.t = .6; F.tele = null; } break;
      case 'spit_tele': if (F.t <= 0) {
        for (const o of [-.26, 0, .26]) { const a = F.tele.a + o, hx = e.x + Math.cos(e.facing) * 120, hy = e.y + Math.sin(e.facing) * 120;
          g.raid.bullets.push({ x: hx, y: hy, vx: Math.cos(a) * 380, vy: Math.sin(a) * 380, t: 1.5, damage: 18, enemy: true, sourceId: e.id, factionId: 'wildlife', bossSpit: true });
          if (F.harpoons.length < 3) { const L = Math.min(380 * 1.3, 420); let hx2 = hx + Math.cos(a) * L, hy2 = hy + Math.sin(a) * L;
            hx2 = Math.max(ARENA.x0 * T + 30, Math.min(ARENA.x1 * T - 30, hx2)); hy2 = Math.max(ARENA.y0 * T + 30, Math.min(ARENA.y1 * T - 30, hy2));
            if (o === 0) F.harpoons.push({ x: hx2, y: hy2, t: 0 }); } }
        F.state = 'recover'; F.t = .7; F.tele = null; } break;
      case 'burrow': if (F.t <= 0) { F.state = 'under'; F.t = 1.3; F.tele = { kind: 'erupt', x: p.x, y: p.y, r: 95 }; e.burrowed = true; } break;
      case 'under': { const tx = F.tele.x, ty = F.tele.y, a = Math.atan2(ty - e.y, tx - e.x); moveBoss(g, e, Math.cos(a) * 260 * dt, Math.sin(a) * 260 * dt);
        if (F.t <= 0) { e.x = Math.max(ARENA.x0 * T + 40, Math.min(ARENA.x1 * T - 40, tx)); e.y = Math.max(ARENA.y0 * T + 40, Math.min(ARENA.y1 * T - 30, ty)); e.burrowed = false;
          if (Math.hypot(p.x - tx, p.y - ty) < F.tele.r) hurt(g, 35); window.saltwakeCamera?.shake?.(.4); F.state = 'recover'; F.t = .8; F.tele = null; } break; }
      case 'riptide': {
        if (gillsLeft === 0) { B.stats.cancelled++; F.state = 'stun'; F.t = 2.2; F.tele = null; g.notify('Both gills broken: the Tidemaw cannot call the tide!', 3.5); break; }
        F.tele.u = 1 - F.t / F.tele.d;
        if (F.t <= 0) { B.stats.riptides++; if (inArena(p.x, p.y) && p.iframes <= 0) hurt(g, 85); window.saltwakeCamera?.shake?.(.8); g.notify('RIPTIDE', 2); F.state = 'recover'; F.t = 1.4; F.tele = { kind: 'flood', t: 0 }; F.ripAt = e.elder ? 20 : 28; }
        break;
      }
      case 'recover': if (F.t <= 0) { F.state = 'chase'; F.next = enraged ? .5 : 1.1; if (F.tele?.kind === 'flood') F.tele = null; } break;
    }
    if (F.ripAt != null && F.state !== 'riptide') F.ripAt -= dt;
    if (F.tele?.kind === 'flood') F.tele.t += dt;
    placeParts(e);
  }
  function choose(g, F, e, d, toP, gills) {
    const r = Math.random();
    if (F.phase === 2 && F.ripAt != null && F.ripAt <= 0 && gills > 0) {
      F.state = 'riptide'; F.t = 3.4; F.tele = { kind: 'riptide', d: 3.4, u: 0 }; e.x += 0; g.notify('RIPTIDE INCOMING · Break its gills or stagger it!', 3.4); return;
    }
    if (d < 160 && Math.abs(ang(toP, e.facing + Math.PI)) < 1.1) { F.state = 'tail_tele'; F.t = .6; F.tele = { kind: 'tail' }; return; }
    if (F.phase === 2 && r < .25) { F.state = 'burrow'; F.t = .5; F.tele = null; return; }
    if (d > 200 && r < .55) { F.state = 'spit_tele'; F.t = .55; F.tele = { kind: 'spit', a: toP }; e.facing = toP; return; }
    if (d < 420) { e.facing = toP; F.state = 'lunge_tele'; F.t = F.enraged ? .55 : .75; F.tele = { kind: 'lunge', a: toP, len: 300 }; F.hit = false; return; }
    F.next = .4;
  }
  function brood(g, n) {
    const A = window.saltwakeAlpha; if (!A?.makeAltered) return;
    for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, x = (ARENA.cx + Math.cos(a) * (ARENA.x1 - ARENA.x0) * .4) * T, y = (ARENA.cy + Math.sin(a) * (ARENA.y1 - ARENA.y0) * .4) * T;
      const m = A.makeAltered(g, i % 3 === 2 ? 'brineworn_breaker' : 'brineworn_drifter', x, y, 'brood_' + Date.now() + '_' + i); if (!m) continue; m.provoked = true; m.awareness = 'alert'; m.aggro = 9; g.raid.enemies.push(m); }
  }
  function finish(g, F) {
    if (F.done) return; F.done = true; B.stats.kills++;
    const e = F.e; for (const id of ['tidemaw_jaw_plate', 'tidemaw_tail_fin']) g.raid.drops.push({ x: e.x + (Math.random() - .5) * 60, y: e.y + 20, id, n: 1, got: false });
    g.save.flags = g.save.flags || {};
    if (e.elder) { B.stats.elderKills++; g.save.flags.elderSlain = (g.save.flags.elderSlain || 0) + 1;
      for (const id of ['masterwork_core', 'tidemaw_gill', 'tidemaw_gill']) g.raid.drops.push({ x: e.x + (Math.random() - .5) * 80, y: e.y + 30, id, n: 1, got: false });
      (window.saltwakeHunter?.bank || window.saltwakeHunter?.grant)?.(g, 900, 'Elder Tidemaw');
      g.notify('THE ELDER TIDEMAW IS SLAIN · The Red Salt Coast breathes again. Gather the trophies and extract!', 7);
    } else {
      g.save.flags.tidemawSlain = (g.save.flags.tidemawSlain || 0) + 1;
      g.quest?.emit('interact', 'i_qs_tidemaw');
      g.notify('THE TIDEMAW IS SLAIN · Gather the trophies and extract!', 5);
    }
    window.saltwakeCamera?.shake?.(.7);
  }

  // ---- hooks -------------------------------------------------------------------------------------------------------
  if (window.saltwakeHunter) window.saltwakeHunter.KILL.tidemaw = 400;
  const upd = P.updateEnemies;
  P.updateEnemies = function (dt) {
    const r = this.raid; if (!r) return upd.apply(this, arguments);
    const F = r.tidemaw, all = r.enemies;
    if (B.enabled && !F && ARENAS[this.mapId] && setupArena(this.mapId) && inArena(this.player.x, this.player.y)) start(this);
    if (!r.tidemaw) return upd.apply(this, arguments);
    r.enemies = all.filter(e => !e.boss);
    try { upd.apply(this, arguments); } finally { if (this.raid === r) { const rest = r.enemies; r.enemies = rest.concat(all.filter(e => e.boss)); } }
    if (this.raid === r) step(this, dt);
  };
  const hm = P.hitMonster;
  P.hitMonster = function (e) { if (e?.boss && (e.burrowed || ['emerge', 'away'].includes(fight(this)?.state))) return 0; return hm.apply(this, arguments); };
  // harpoon wrecks: pick up with E, next shot throws it
  const interact = P.interact;
  P.interact = function () {
    const F = fight(this), p = this.player;
    if (F && !p.harpoon) { const h = F.harpoons.find(h => !h.got && Math.hypot(h.x - p.x, h.y - p.y) < 60); if (h) { h.got = true; p.harpoon = true; this.notify('Harpoon wreck picked up · Fire to hurl it back', 2.5); return; } }
    return interact.apply(this, arguments);
  };
  const shoot = P.shoot;
  P.shoot = function () {
    const p = this.player;
    if (p.harpoon && this.raid && !this.isPaused?.()) {
      p.harpoon = false; B.stats.harpoons++; const a = p.angle || 0;
      this.raid.bullets.push({ x: p.x, y: p.y - 8, vx: Math.cos(a) * 820, vy: Math.sin(a) * 820, t: .9, damage: 150, enemy: false, penetration: 60, stagger: 6, partPower: 1.8, weaponId: 'harpoon' });
      window.saltwakeCamera?.shake?.(.2); this.mouse.down = false; return;
    }
    return shoot.apply(this, arguments);
  };
  // the Wallow can only be "completed" by slaying the beast
  const use = P.useInteractable;
  P.useInteractable = function (o) { if (o?.id === 'i_qs_tidemaw') { this.notify(this.save.flags?.tidemawSlain ? 'The wallow is still. The Tidemaw is gone.' : 'Something vast stirs under the sand. Step into the Slip if you dare.', 3); return; } return use.apply(this, arguments); };

  // ---- deeper = richer: containers far from the West Passage give an extra deep-salvage roll ----------------------
  const loot = P.loot;
  P.loot = function (o) {
    const before = this.raid?.opened?.length || 0, out = loot.apply(this, arguments);
    if (this.raid && (this.raid.opened?.length || 0) > before && o?.mapId === 'quays' && !o.rare) {
      const far = Math.hypot(o.x - 8, o.y - 62);
      if (far > 95 && Math.random() < Math.min(.85, (far - 95) / 90 + .35)) { const extra = this.rollLoot('deep_cache'); const k = Object.keys(extra)[0];
        if (k) { addItem(this.save.bag, k, extra[k]); this.notify('Deep salvage: ' + extra[k] + ' × ' + itemDef(k).name, 2.6); B.stats.deepLoot = (B.stats.deepLoot || 0) + 1; } }
    }
    return out;
  };

  // ---- drawing -----------------------------------------------------------------------------------------------------
  const de = P.draw25Enemy;
  P.draw25Enemy = function (e) {
    if (!e?.boss) return de.apply(this, arguments);
    const F = fight(this), im = pic(), t = performance.now() / 1000;
    if (e.burrowed || F?.state === 'emerge' && F.t > .8) {           // a moving mound of sand
      g.save(); g.fillStyle = 'rgba(120,104,84,.55)'; for (let i = 0; i < 6; i++) { const a = t * 3 + i; g.beginPath(); g.ellipse(e.x + Math.cos(a) * 22, e.y + Math.sin(a * 1.3) * 10, 26, 12, 0, 0, Math.PI * 2); g.fill(); } g.restore(); return;
    }
    if (!im) return de.apply(this, arguments);
    const w = im.naturalWidth * K, h = im.naturalHeight * K, wob = F?.state === 'stun' ? Math.sin(t * 20) * .04 : Math.sin(t * 2) * .02;
    g.save(); g.fillStyle = 'rgba(8,10,10,.35)'; g.beginPath(); g.ellipse(e.x + 10, e.y + 22, w * .42, h * .28, e.facing, 0, Math.PI * 2); g.fill(); g.restore();
    g.save(); g.translate(e.x, e.y); g.rotate(e.facing + wob);
    if (e.hit > 0 || (e._hpSeen != null && e.hp < e._hpSeen)) g.filter = 'brightness(1.8)'; e._hpSeen = e.hp;
    g.drawImage(im, -w / 2, -h / 2, w, h); g.filter = 'none';
    for (const p of e.parts) { const o = OFF[p.id]; if (!o) continue;          // part state indicators
      const x = o[0] * K, y = o[1] * K;
      if (p.broken) { g.fillStyle = 'rgba(30,10,10,.75)'; g.beginPath(); g.arc(x, y, p.radius * .8, 0, Math.PI * 2); g.fill(); }
      else if (/^gill/.test(p.id) && F?.state === 'riptide') { g.strokeStyle = `rgba(140,255,240,${.5 + .5 * Math.sin(t * 12)})`; g.lineWidth = 3; g.beginPath(); g.arc(x, y, p.radius + 4, 0, Math.PI * 2); g.stroke(); } }
    g.restore();
  };
  const scene = P.drawCoastScene;
  P.drawCoastScene = function () {
    const out = scene.apply(this, arguments), F = fight(this);
    if (this.mapId !== B.map || !F) return out;
    const e = F.e, tl = F.tele, t = performance.now() / 1000;
    g.save();
    for (const h of F.harpoons) { g.fillStyle = 'rgba(230,210,150,.9)'; g.strokeStyle = 'rgba(20,16,10,.9)'; g.lineWidth = 2; g.save(); g.translate(h.x, h.y); g.rotate(.6); g.fillRect(-18, -2, 36, 4); g.strokeRect(-18, -2, 36, 4); g.restore();
      if (Math.hypot(h.x - this.player.x, h.y - this.player.y) < 60 && !this.player.harpoon) { g.fillStyle = 'rgba(255,240,200,.95)'; g.font = '600 12px system-ui'; g.textAlign = 'center'; g.fillText('E · pick up harpoon', h.x, h.y - 14); } }
    if (tl) {
      const pulse = .35 + .25 * Math.sin(t * 14);
      g.fillStyle = `rgba(210,60,40,${pulse})`; g.strokeStyle = 'rgba(255,120,90,.9)'; g.lineWidth = 2;
      if (tl.kind === 'lunge') { g.save(); g.translate(e.x, e.y); g.rotate(tl.a); g.fillRect(40, -42, tl.len + 60, 84); g.strokeRect(40, -42, tl.len + 60, 84); g.restore(); }
      else if (tl.kind === 'tail') { g.beginPath(); g.moveTo(e.x, e.y); g.arc(e.x, e.y, 190, e.facing + Math.PI - 1.1, e.facing + Math.PI + 1.1); g.closePath(); g.fill(); g.stroke(); }
      else if (tl.kind === 'spit') { for (const o of [-.26, 0, .26]) { g.save(); g.translate(e.x, e.y); g.rotate(tl.a + o); g.fillRect(100, -8, 420, 16); g.restore(); } }
      else if (tl.kind === 'erupt') { g.beginPath(); g.arc(tl.x, tl.y, tl.r, 0, Math.PI * 2); g.fill(); g.stroke(); }
      else if (tl.kind === 'riptide') { const u = tl.u || 0; g.fillStyle = `rgba(60,160,190,${.12 + .3 * u})`; g.fillRect(ARENA.x0 * T, ARENA.y0 * T, (ARENA.x1 - ARENA.x0) * T, (ARENA.y1 - ARENA.y0) * T);
        g.strokeStyle = `rgba(160,240,255,${.6 + .4 * Math.sin(t * 10)})`; g.lineWidth = 4; g.strokeRect(ARENA.x0 * T, ARENA.y0 * T, (ARENA.x1 - ARENA.x0) * T, (ARENA.y1 - ARENA.y0) * T); }
      else if (tl.kind === 'flood') { const a = Math.max(0, .6 - tl.t * .45); g.fillStyle = `rgba(80,140,160,${a})`; g.fillRect(ARENA.x0 * T, ARENA.y0 * T, (ARENA.x1 - ARENA.x0) * T, (ARENA.y1 - ARENA.y0) * T); }
    }
    g.restore();
    return out;
  };
  // boss bar
  const bar = document.createElement('div'); bar.id = 'swBossBar'; bar.hidden = true;
  bar.innerHTML = '<div class="n">The Tidemaw</div><div class="hp"><i></i></div><div class="parts"></div>';
  document.getElementById('viewport')?.appendChild(bar);
  const hud = P.hud;
  P.hud = function () {
    const out = hud.apply(this, arguments), F = this.raid && fight(this), show = !!F && !F.done && this.mapId === B.map;
    bar.hidden = !show; document.getElementById('placeRail')?.classList.toggle('swBossHide', show);
    if (show) { const e = F.e; bar.querySelector('.hp i').style.width = Math.max(0, e.hp / e.maxHp * 100) + '%';
      { const nm = bar.querySelector('.n'); if (nm && nm.textContent !== e.name) nm.textContent = e.name; }
      bar.querySelector('.parts').innerHTML = e.parts.map(p => `<span class="${p.broken ? 'broken' : ''}">${p.name}</span>`).join('') + (this.player.harpoon ? '<span class="harpoon">Harpoon ready</span>' : '');
      bar.classList.toggle('enraged', !!F.enraged); }
    return out;
  };
  const css = document.createElement('style');
  css.textContent = `#swBossBar{position:absolute;top:14px;left:50%;transform:translateX(-50%);width:min(560px,60%);z-index:6;pointer-events:none;text-align:center;font:600 13px system-ui,sans-serif;color:#f0e6d8;text-shadow:0 1px 3px #000}
  #swBossBar .n{letter-spacing:.2em;text-transform:uppercase;font-size:12px;margin-bottom:4px}
  #swBossBar .hp{height:9px;border-radius:5px;background:rgba(0,0,0,.55);border:1px solid rgba(255,255,255,.18);overflow:hidden}#swBossBar .hp i{display:block;height:100%;background:linear-gradient(90deg,#a83a2c,#e07a4a);transition:width .2s}
  #swBossBar.enraged .hp i{background:linear-gradient(90deg,#d22,#ff8a3a)}#swBossBar .parts{display:flex;gap:8px;justify-content:center;margin-top:5px;font-size:11px}
  #swBossBar .parts span{padding:1px 7px;border-radius:6px;background:rgba(0,0,0,.45)}#swBossBar .parts span.broken{text-decoration:line-through;color:#e8a080}#swBossBar .parts .harpoon{color:#e8d18f}#placeRail.swBossHide{visibility:hidden}`;
  document.head.appendChild(css);
})();
