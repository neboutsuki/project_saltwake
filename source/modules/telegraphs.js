/* SALTWAKE monster attack telegraphs (v0.31).
 * Every monster attack against the player now has a readable wind-up with its own ground shape, and the hit is honest:
 * it lands only if you are inside the shape when it resolves (rolling i-frames still apply, perfect dodges still count).
 *   Brineback  Bite (wedge) · Tusk Charge (long lane; it dashes the lane, a wall stuns it for ~1.5 s)
 *   Salt Widow Claw Swipe (wide wedge) · Pounce (circle where you stood; it leaps there)
 *   Redhook gull Spit (aim line, locks on before firing so moving dodges it)
 *   Grazer     Horn Butt (wedge)
 *   Wreckers   Aimed shot (laser line, locks on before firing)
 *   Brineworn  Drifter lunge (wedge) · Caller rake (wedge) · Breaker Overhead Slam (circle in front)
 * Shapes fill as the attack charges; the last instant flashes white = strike (the moment to roll). "!" over the head,
 * red "!!" for heavy moves. At night shapes only show near you (you still see the eyes). The Tidemaw keeps its own.
 * Attacks between monsters keep the original logic. Option: Settings › telegraphs (existing toggle).
 * window.saltwakeTelegraphs exposes MOVES and stats for QA.
 */
(() => {
  const P = Game.prototype, TAU = Math.PI * 2;
  const TG = window.saltwakeTelegraphs = { stats: { windups: 0, hits: 0, whiffs: 0, charges: 0, wallStuns: 0, leaps: 0, locks: 0, drawn: 0 } };
  const orig = typeof instinctWindup === 'function' ? instinctWindup : null;
  if (!orig) return;
  const dist = (a, b, c, d) => Math.hypot(c - a, d - b);
  const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
  const defOf = e => (typeof COMBAT_PARTS !== 'undefined' && COMBAT_PARTS[e.type]) || {};
  const on = () => window.saltwakePolish?.settings?.telegraphs !== false;

  // kind: wedge {len, arc} · lane {len, w, dash, speed} · circle {r, off (0 = at target)} · aim {} ; wind s; lock = progress at
  // which the aim stops tracking you; dmg = x monster damage; min/max = distance band in which the move is chosen.
  const MOVES = TG.MOVES = {
    brineback: [
      { id: 'charge', name: 'Tusk Charge', kind: 'lane', wind: .8, lock: .7, len: 230, w: 46, dash: .42, speed: 560, dmg: 1.5, min: 85, max: 210, cd: 3.2, heavy: true },
      { id: 'bite', name: 'Bite', kind: 'wedge', wind: .55, lock: .6, len: 64, arc: .55, dmg: 1, min: 0, max: 52 }],
    widow: [
      { id: 'pounce', name: 'Pounce', kind: 'circle', wind: .75, lock: .75, r: 46, off: 0, dmg: 1.3, min: 70, max: 170, cd: 3.5, leap: .36, heavy: true },
      { id: 'swipe', name: 'Claw Swipe', kind: 'wedge', wind: .5, lock: .55, len: 60, arc: .95, dmg: 1, min: 0, max: 48 }],
    grazer: [{ id: 'butt', name: 'Horn Butt', kind: 'wedge', wind: .55, lock: .6, len: 62, arc: .5, dmg: 1, min: 0, max: 50 }],
    gull: [{ id: 'spit', name: 'Spit', kind: 'aim', wind: .6, lock: .65, ranged: true }],
    brineworn_drifter: [{ id: 'lunge', name: 'Lunge', kind: 'wedge', wind: .45, lock: .6, len: 58, arc: .6, dmg: 1, min: 0, max: 48 }],
    brineworn_caller: [{ id: 'rake', name: 'Rake', kind: 'wedge', wind: .55, lock: .6, len: 56, arc: .8, dmg: 1, min: 0, max: 46 }],
    brineworn_breaker: [{ id: 'slam', name: 'Overhead Slam', kind: 'circle', wind: .85, lock: .65, r: 50, off: 34, dmg: 1.4, min: 0, max: 70, heavy: true }],
    _gunner: [{ id: 'shot', name: 'Aimed Shot', kind: 'aim', wind: .5, lock: .7, ranged: true }],
  };
  const baseMoves = (g, e) => e.type === 'tidemaw' || e.boss ? null : MOVES[e.type] || (g.actorFaction?.(e) !== 'wildlife' && e.weapon ? MOVES._gunner : null);
  // apex monsters (bigger sprites) get shapes and reach scaled to their size
  const scaled = new Map();
  const movesFor = (g, e) => { const b = baseMoves(g, e), k = e.apexScale || 1; if (!b || k === 1) return b;
    const key = e.type + ':' + k; if (!scaled.has(key)) scaled.set(key, b.map(m => ({ ...m, len: m.len && m.len * k, r: m.r && m.r * Math.sqrt(k), w: m.w && m.w * Math.sqrt(k), off: m.off && m.off * k, min: m.min && m.min * k, max: m.max && m.max * k, wind: m.wind * .92 }))); return scaled.get(key); };
  const hit = (g, e, m) => {
    const def = defOf(e), p = g.player, dmg = (def.damage || 14) * (e.weakened ? .67 : 1) * (m.dmg || 1) * (e.dmgMul || 1);
    g.hurtPlayer(dmg, e.type === 'widow' ? .36 : .08);
    if (e.type === 'brineback') p.wet = Math.min(100, (p.wet || 0) + 17 * (1 - Math.min(.6, (g.armorSkill?.('brine_resist') || 0) * .15)));
    TG.stats.hits++;
  };
  const inside = (g, t, x, y) => {
    const m = t.m;
    if (m.kind === 'wedge') return dist(t.x, t.y, x, y) <= m.len + 12 && (dist(t.x, t.y, x, y) < 22 || Math.abs(angDiff(Math.atan2(y - t.y, x - t.x), t.a)) <= m.arc);
    if (m.kind === 'circle') { const c = center(t); return dist(c.x, c.y, x, y) <= m.r + 10; }
    if (m.kind === 'lane') { const dx = x - t.x, dy = y - t.y, along = dx * Math.cos(t.a) + dy * Math.sin(t.a), side = -dx * Math.sin(t.a) + dy * Math.cos(t.a); return along > -10 && along < m.len && Math.abs(side) < m.w / 2 + 10; }
    return false;
  };
  const center = t => t.m.off ? { x: t.x + Math.cos(t.a) * t.m.off, y: t.y + Math.sin(t.a) * t.m.off } : { x: t.tx, y: t.ty };
  TG.inside = inside;

  // ---- the wind-up / strike state machine (replaces instinctWindup for attacks on the player) ----------------------
  window.instinctWindup = function (game, e, target, range, dt) {
    const moves = movesFor(game, e);
    if (!moves || target.kind !== 'player') { if (e.swTele) { e.swTele = null; e.instinctAttack = null; } return orig.apply(this, arguments); }
    const p = game.player, d = dist(e.x, e.y, target.x, target.y);
    if (e.swDash || e.swLeap) return false;                                         // mid-move: the update hook drives it
    if (!e.instinctAttack || !e.swTele) {
      e.swTele = null; e.instinctAttack = null;
      if (e.attackCD > 0 || !game.hasSight(e.x, e.y, target.x, target.y)) return false;
      const m = moves.find(m => m.ranged ? d < range : d >= m.min && d <= m.max && (!m.cd || (e.swMoveCD?.[m.id] || 0) <= game.raid.time));
      if (!m) return false;
      const a = Math.atan2(target.y - e.y, target.x - e.x);
      e.swTele = { m, a, x: e.x, y: e.y, tx: target.x, ty: target.y, locked: false, tick: game.raid.time };
      e.instinctAttack = { id: 'player', left: m.wind, total: m.wind };
      TG.stats.windups++;
      window.saltwakeNight?.cue?.(game, e, 'windup');
      if (m.heavy && d < 420) window.saltwakeAudio?.event?.('warning', .35);
      return false;
    }
    const t = e.swTele, m = t.m, w = e.instinctAttack;
    t.x = e.x; t.y = e.y; t.tick = game.raid.time;
    if (!t.locked) {
      t.a = Math.atan2(p.y - e.y, p.x - e.x); t.tx = p.x; t.ty = p.y;
      if (1 - w.left / w.total >= m.lock) { t.locked = true; TG.stats.locks++; }
    }
    e.facing = t.a;
    w.left -= dt;
    if (w.left > 0) return false;
    // strike
    e.instinctAttack = null; e.swTele = null;
    window.saltwakeNight?.cue?.(game, e, 'strike');
    if (m.cd) (e.swMoveCD ||= {})[m.id] = game.raid.time + m.cd;
    if (m.ranged) { e.swAim = { x: t.tx, y: t.ty, until: game.raid.time + .05 }; return true; }   // native code fires, aimed at the lock
    const cd = (defOf(e).attackCooldown || 1.4) * (e.cdMul || 1);
    if (typeof motionAttack === 'function') motionAttack(e);
    if (m.kind === 'lane') { e.swDash = { a: t.a, t: m.dash, speed: m.speed, m, hitDone: false, sx: e.x, sy: e.y }; e.instinctAttack = { id: 'player', left: 99, total: 99, moving: true }; TG.stats.charges++; e.attackCD = cd; return false; }
    if (m.leap) { e.swLeap = { x0: e.x, y0: e.y, x1: t.tx, y1: t.ty, t: 0, dur: m.leap, m, tele: { ...t } }; e.instinctAttack = { id: 'player', left: 99, total: 99, moving: true }; TG.stats.leaps++; e.attackCD = cd; return false; }
    if (inside(game, t, p.x, p.y)) hit(game, e, m); else TG.stats.whiffs++;
    e.attackCD = cd; TG.flashes.push({ t: { ...t }, life: .18 });
    return false;
  };
  TG.flashes = [];

  // ranged attacks fire at the locked point, not where you are now
  const mb = P.makeBullet;
  if (mb) P.makeBullet = function (from, target, ...rest) {
    if (from?.swAim && this.raid && this.raid.time <= from.swAim.until && target && (target.kind === 'player' || target === this.player)) {
      const a = from.swAim; from.swAim = null; if (from.dmgMul && typeof rest[0] === 'number') rest[0] *= from.dmgMul; return mb.call(this, from, { ...target, x: a.x, y: a.y }, ...rest);
    }
    return mb.apply(this, arguments);
  };

  // ---- dash / leap movement, native brineback charge off -----------------------------------------------------------
  const upd = P.updateEnemies;
  P.updateEnemies = function (dt) {
    const r = this.raid;
    if (r) for (const e of r.enemies) if (!e.dead && e.type === 'brineback') e.chargeCD = 99;   // replaced by the telegraphed charge
    const out = upd.apply(this, arguments);
    if (!this.raid || this.raid !== r) return out;
    const p = this.player;
    for (const e of r.enemies) {
      if (e.swTele && r.time - e.swTele.tick > .3) { e.swTele = null; if (!e.swDash && !e.swLeap) e.instinctAttack = null; }   // lost sight: cancel the wind-up
      if (e.dead || e.staggerTime > 0) { if (e.swDash || e.swLeap) { e.swDash = e.swLeap = null; e.instinctAttack = null; e.swHop = 0; } continue; }
      const D = e.swDash;
      if (D) {
        const steps = 4, step = D.speed * Math.min(dt, D.t) / steps;
        for (let i = 0; i < steps && e.swDash; i++) {
          const nx = e.x + Math.cos(D.a) * step, ny = e.y + Math.sin(D.a) * step;
          if (!this.walkable(nx, ny)) {
            e.swDash = null; e.instinctAttack = null; e.staggerTime = 1.5; e.exposed = true; TG.stats.wallStuns++;
            window.saltwakeCamera?.shake?.(.25); if (dist(e.x, e.y, p.x, p.y) < 500) this.notify?.('Brineback stunned · strike now!', 1.6); break;
          }
          e.x = nx; e.y = ny;
          if (!D.hitDone && dist(e.x, e.y, p.x, p.y) < 34) {
            D.hitDone = true; if (p.iframes <= 0) { hit(this, e, D.m); this.move?.(Math.cos(D.a) * 46, Math.sin(D.a) * 46); } else this.hurtPlayer(1, 0);  // 1 dmg is absorbed by i-frames: still counts as a perfect dodge
          }
        }
        if (e.swDash) { D.t -= dt; if (D.t <= 0) { e.swDash = null; e.instinctAttack = null; } }
      }
      const L = e.swLeap;
      if (L) {
        L.t += dt; const k = Math.min(1, L.t / L.dur);
        const nx = L.x0 + (L.x1 - L.x0) * k, ny = L.y0 + (L.y1 - L.y0) * k;
        if (this.walkable(nx, ny)) { e.x = nx; e.y = ny; }
        e.swHop = Math.sin(k * Math.PI) * 26;
        if (k >= 1) {
          e.swLeap = null; e.instinctAttack = null; e.swHop = 0;
          if (inside(this, L.tele, p.x, p.y)) hit(this, e, L.m); else { TG.stats.whiffs++; if (p.iframes > 0 && dist(L.x1, L.y1, p.x, p.y) < 60) this.hurtPlayer(1, 0); }
          TG.flashes.push({ t: { ...L.tele }, life: .18 }); window.saltwakeCamera?.shake?.(.15);
        }
      }
    }
    for (const f of TG.flashes) f.life -= dt; for (let i = TG.flashes.length - 1; i >= 0; i--) if (TG.flashes[i].life <= 0) TG.flashes.splice(i, 1);
    return out;
  };

  // ---- drawing --------------------------------------------------------------------------------------------------
  // The old generic wedge/ring is replaced; hide it by masking the wind-up while the inner draw runs.
  const de = P.draw25Enemy;
  if (de) P.draw25Enemy = function (e) {
    const w = e.instinctAttack, hop = e.swHop || 0; if (w && e.swTele || w?.moving) e.instinctAttack = null;
    if (hop) e.y -= hop;
    try { return de.apply(this, arguments); } finally { e.instinctAttack = w; if (hop) e.y += hop; }
  };
  function shape(g, t, prog, z, cx, cy, flash) {
    const m = t.m, late = prog > .72, X = (t.x - cx) * z, Y = (t.y + 4 - cy) * z;
    const fill = flash ? 'rgba(255,250,235,.55)' : late ? `rgba(226,70,50,${.16 + .24 * prog})` : `rgba(240,170,90,${.10 + .16 * prog})`;
    const core = flash ? 'rgba(255,255,255,.6)' : late ? 'rgba(255,110,80,.42)' : 'rgba(255,214,150,.3)';
    const edge = flash ? 'rgba(255,255,255,.95)' : late ? 'rgba(255,130,95,.9)' : 'rgba(245,200,130,.6)';
    g.lineWidth = Math.max(1.2, 1.6 * z);
    if (m.kind === 'wedge') {
      const R = m.len * z;
      g.fillStyle = fill; g.beginPath(); g.moveTo(X, Y); g.arc(X, Y, R, t.a - m.arc, t.a + m.arc); g.closePath(); g.fill();
      g.fillStyle = core; g.beginPath(); g.moveTo(X, Y); g.arc(X, Y, R * prog, t.a - m.arc, t.a + m.arc); g.closePath(); g.fill();
      g.strokeStyle = edge; g.beginPath(); g.arc(X, Y, R, t.a - m.arc, t.a + m.arc); g.stroke();
    } else if (m.kind === 'lane') {
      g.save(); g.translate(X, Y); g.rotate(t.a);
      const L = m.len * z, H = m.w * z;
      g.fillStyle = fill; g.fillRect(0, -H / 2, L, H); g.fillStyle = core; g.fillRect(0, -H / 2, L * prog, H);
      g.strokeStyle = edge; g.strokeRect(0, -H / 2, L, H);
      g.fillStyle = edge; for (let i = 1; i <= 3; i++) { const x = L * i / 4; g.beginPath(); g.moveTo(x - 6 * z, -H / 4); g.lineTo(x + 6 * z, 0); g.lineTo(x - 6 * z, H / 4); g.closePath(); g.fill(); }
      g.restore();
    } else if (m.kind === 'circle') {
      const c = center(t), CX = (c.x - cx) * z, CY = (c.y + 4 - cy) * z, R = m.r * z;
      g.fillStyle = fill; g.beginPath(); g.ellipse(CX, CY, R, R * .7, 0, 0, TAU); g.fill();
      g.fillStyle = core; g.beginPath(); g.ellipse(CX, CY, R * prog, R * .7 * prog, 0, 0, TAU); g.fill();
      g.strokeStyle = edge; g.beginPath(); g.ellipse(CX, CY, R, R * .7, 0, 0, TAU); g.stroke();
    } else if (m.kind === 'aim') {
      const TX = (t.tx - cx) * z, TY = (t.ty - 8 - cy) * z;
      g.strokeStyle = t.locked ? 'rgba(255,90,70,.9)' : 'rgba(255,150,110,.45)'; g.setLineDash(t.locked ? [] : [6 * z, 5 * z]);
      g.beginPath(); g.moveTo(X, Y - 10 * z); g.lineTo(TX, TY); g.stroke(); g.setLineDash([]);
      g.beginPath(); g.arc(TX, TY, (t.locked ? 9 : 14 - 5 * prog) * z, 0, TAU); g.stroke();
    }
  }
  const render = P.render;
  P.render = function (now) {
    const out = render.apply(this, arguments);
    if (!this.raid || this.mode !== 'play' || this.panel || !on()) return out;
    const z = this.camera.zoom, cx = this.camera.x, cy = this.camera.y, p = this.player;
    const night = !!this.climateState?.().night;
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
    for (const e of this.raid.enemies) {
      const t = e.swTele, w = e.instinctAttack;
      const dP = dist(e.x, e.y, p.x, p.y);
      if (e.dead || dP > 700 || (night && dP > 300)) continue;
      if (t && w && !w.moving) {
        if (!this.hasSight(p.x, p.y, e.x, e.y)) continue;
        const prog = Math.min(1, 1 - w.left / w.total), flash = w.left < .1;
        shape(g, t, prog, z, cx, cy, flash);
        // "!" above the head
        const HX = (e.x - cx) * z, HY = (e.y - 62 - cy) * z, pulse = 1 + Math.sin(now / 60) * .12 * prog;
        g.font = `800 ${Math.round(16 * pulse)}px system-ui,sans-serif`; g.textAlign = 'center'; g.lineWidth = 3; g.strokeStyle = 'rgba(15,10,8,.85)';
        g.fillStyle = t.m.heavy ? '#ff6a4d' : '#ffcf7a'; const s = t.m.heavy ? '!!' : '!'; g.strokeText(s, HX, HY); g.fillText(s, HX, HY);
        if (t.m.heavy && prog < .5) { g.font = '700 10px system-ui,sans-serif'; g.fillStyle = 'rgba(255,220,190,.9)'; g.strokeText(t.m.name, HX, HY - 15); g.fillText(t.m.name, HX, HY - 15); }
        TG.stats.drawn++;
      } else if (e.swDash) {
        const D = e.swDash; g.strokeStyle = 'rgba(255,200,150,.5)'; g.lineWidth = 3; g.beginPath(); g.moveTo((D.sx - cx) * z, (D.sy - cy) * z); g.lineTo((e.x - cx) * z, (e.y - cy) * z); g.stroke();
      }
    }
    for (const f of TG.flashes) { g.globalAlpha = Math.min(1, f.life / .12); shape(g, f.t, 1, z, cx, cy, true); }
    g.restore();
    return out;
  };
})();
