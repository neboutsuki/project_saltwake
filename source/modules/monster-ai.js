/* SALTWAKE monster behaviour layer (v0.31). Runs after the engine's sense/chase/attack step and adds species behaviour
 * from the bestiary on top of it (telegraphed attacks still come from telegraphs.js):
 *   Pack alarm   - a monster that spots you alerts its own kind nearby (Callers alert every Brineworn in earshot).
 *   Surround     - several hunters spread around you in slots instead of stacking on one spot; bodies keep apart.
 *   Flee         - wounded wildlife (< 25 %) breaks off and runs, limping; apexes and Brineworn never flee.
 *   Grazers      - prey: when the herd is alarmed it bolts away from you (fights back only when cornered/provoked).
 *   Brinebacks   - territorial: come close and the bull turns, stomps and warns you for a moment before charging.
 *   Salt Widows  - ambush: stay still in cover until you are close, then pounce; after striking they back off.
 *   Redhook gulls- thieves: they fly to loot lying on the ground and steal it (kill the gull to drop it again).
 *   Brineworn    - at night they are drawn to your lantern light from far away.
 * window.saltwakeMonsterAI exposes settings and counters for QA.
 */
(() => {
  const P = Game.prototype, T = 32;
  const AI = window.saltwakeMonsterAI = { enabled: true, stats: { alarms: 0, flees: 0, herdBolts: 0, warnings: 0, ambushes: 0, steals: 0, lures: 0, slots: 0, pushes: 0 } };
  const d2 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const brine = e => /^brineworn_/.test(e.type);
  const alertOf = e => e.awareness === 'alert' || (e.aggro || 0) > 0;
  const move = (g, e, tx, ty, step) => { if (typeof fieldMove === 'function') fieldMove(g, e, tx, ty, step); else { const a = Math.atan2(ty - e.y, tx - e.x), nx = e.x + Math.cos(a) * step, ny = e.y + Math.sin(a) * step; if (g.walkable(nx, ny)) { e.x = nx; e.y = ny; } } };
  const away = (g, e, from, step) => { const a = Math.atan2(e.y - from.y, e.x - from.x); move(g, e, e.x + Math.cos(a) * 120, e.y + Math.sin(a) * 120, step); e.facing = a; };
  const say = (g, e, text) => { (g.raid.swSay ||= []).push({ x: e.x, y: e.y - 70 * (e.apexScale || 1), text, life: 1.4 }); };

  const upd = P.updateEnemies;
  P.updateEnemies = function (dt) {
    const pre = new Map(); if (AI.enabled && this.raid) for (const e of this.raid.enemies) if (!e.dead) pre.set(e, [e.x, e.y]);
    const hold = e => { const q = pre.get(e); if (q) { e.x = q[0]; e.y = q[1]; } };   // undo the engine's step for this monster
    const out = upd.apply(this, arguments), r = this.raid;
    if (!AI.enabled || !r || this.isPaused?.()) return out;
    dt = Math.min(.1, dt || 0); const p = this.player, list = r.enemies.filter(e => !e.dead && !e.boss), night = !!this.climateState?.().night;
    // ---- pack alarm --------------------------------------------------------------------------------------------
    for (const e of list) {
      const now = alertOf(e);
      if (now && !e.swWasAlert) { e.swWasAlert = true;
        const radius = e.type === 'brineworn_caller' ? 520 : 340;
        for (const o of list) if (o !== e && !alertOf(o) && d2(o, e) < radius && (o.type === e.type || e.type === 'brineworn_caller' && brine(o) || e.type === 'grazer' && o.type === 'grazer')) {
          o.awareness = 'alert'; o.lastSeenX = p.x; o.lastSeenY = p.y; o.searchTime = 0; if (o.type !== 'grazer') o.provoked = true; AI.stats.alarms++; }
        if (e.type === 'brineworn_caller') say(this, e, 'the Caller cries out');
      } else if (!now) e.swWasAlert = false;
    }
    // ---- species behaviour -------------------------------------------------------------------------------------
    const hunters = [];
    for (const e of list) {
      const d = Math.hypot(e.x - p.x, e.y - p.y), spd = ((typeof COMBAT_PARTS !== 'undefined' && COMBAT_PARTS[e.type]?.speed) || 70);
      if (e.staggerTime > 0 || e.swDash || e.swLeap) continue;
      // flee when badly hurt (wildlife only)
      if (!e.apex && !brine(e) && e.actorType !== 'human' && e.hp < e.maxHp * .25 && !e.swFled) { e.swFled = true; e.swFlee = 5; AI.stats.flees++; say(this, e, 'flees!'); }
      if (e.swFlee > 0) { hold(e); e.swFlee -= dt; e.instinctAttack = null; e.swTele = null; e.attackCD = Math.max(e.attackCD || 0, .6); away(this, e, p, spd * 1.15 * dt); continue; }
      // grazers: prey that bolts as a herd
      if (e.type === 'grazer' && !e.apex && !e.provoked) {
        const sprint = !!(this.keys?.ShiftLeft || this.keys?.ShiftRight), spook = d < (this.crouching ? 120 : 220) || sprint && d < 320;
        if ((spook || alertOf(e) || ['suspicious', 'searching', 'investigating'].includes(e.awareness)) && d < 420) { if (!e.swBolt) { e.swBolt = 2.5; AI.stats.herdBolts++; } }
        if (e.swBolt > 0) { hold(e); e.swBolt -= dt; e.instinctAttack = null; e.swTele = null; e.attackCD = Math.max(e.attackCD || 0, .5); away(this, e, p, spd * 1.35 * dt); if (d < 60) { e.provoked = true; e.swBolt = 0; } continue; }
      }
      // brinebacks: territorial warning before the charge
      if (e.type === 'brineback' && !e.apex && !e.provoked && !e.swWarnDone && d < 230) {
        hold(e); e.swWarn = (e.swWarn || 0) + dt; e.facing = Math.atan2(p.y - e.y, p.x - e.x); e.instinctAttack = null; e.swTele = null;
        if (!e.swWarned) { e.swWarned = true; AI.stats.warnings++; say(this, e, '! it stomps a warning'); window.saltwakeCamera?.shake?.(.08); }
        if (e.swWarn > 1.6 || d < 120) { e.provoked = true; e.swWarnDone = true; e.awareness = 'alert'; e.lastSeenX = p.x; e.lastSeenY = p.y; }
        continue;
      } else if (e.type === 'brineback' && e.swWarnDone && !alertOf(e) && d > 360) { e.swWarn = 0; e.swWarned = false; e.swWarnDone = false; e.provoked = false; }
      // salt widows: ambush - hold still until close, then pounce; back off after striking
      if (e.type === 'widow' && !e.apex) {
        if (!alertOf(e) && !e.provoked) { if (d < 150 && (this.hasSight?.(e.x, e.y, p.x, p.y) ?? true)) { e.awareness = 'alert'; e.provoked = true; e.attackCD = 0; e.lastSeenX = p.x; e.lastSeenY = p.y; AI.stats.ambushes++; say(this, e, 'ambush!'); } else { e.homeX = e.x; e.homeY = e.y; } }
        if ((e.attackCD || 0) > .5 && d < 90 && !e.swTele) { away(this, e, p, spd * .9 * dt); continue; }
      }
      // gulls: steal loot from the ground
      if (e.type === 'gull' && e.hp >= e.maxHp && !e.swLoot) {
        const drop = (r.drops || []).find(x => !x.got && (!x.swClaimed || x.swClaimed === e.id) && Math.hypot(x.x - e.x, x.y - e.y) < 380 && Math.hypot(x.x - e.x, x.y - e.y) < d);
        if (drop) { hold(e); e.instinctAttack = null; e.swTele = null; drop.swClaimed = e.id; move(this, e, drop.x, drop.y, spd * 1.1 * dt); if (Math.hypot(drop.x - e.x, drop.y - e.y) < 20) { drop.got = true; e.swLoot = { id: drop.id, n: drop.n }; AI.stats.steals++; say(this, e, 'a gull snatches the loot!'); } continue; }
      }
      // brineworn: drawn to the lantern at night
      if (brine(e) && night && !alertOf(e) && this.lanternOn !== false && d < 560 && d > 120) { e.awareness = 'investigating'; e.lastSeenX = p.x; e.lastSeenY = p.y; e.searchTime = 0; if (!e.swLured) { e.swLured = true; AI.stats.lures++; } }
      if (alertOf(e) && d < 320 && e.actorType !== 'human') hunters.push(e);
    }
    // ---- surround: give each hunter an angle slot around the player ---------------------------------------------
    if (hunters.length > 1) {
      hunters.sort((a, b) => Math.atan2(a.y - p.y, a.x - p.x) - Math.atan2(b.y - p.y, b.x - p.x));
      const base = Math.atan2(hunters[0].y - p.y, hunters[0].x - p.x);
      hunters.forEach((e, i) => { if (e.instinctAttack || e.swTele) return; const a = base + i / hunters.length * Math.PI * 2, R = 70 * (e.apexScale || 1);
        const tx = p.x + Math.cos(a) * R, ty = p.y + Math.sin(a) * R, d = Math.hypot(tx - e.x, ty - e.y);
        if (d > 20) { move(this, e, tx, ty, Math.min(d, 40 * dt)); AI.stats.slots++; } });
    }
    // ---- keep bodies apart ----------------------------------------------------------------------------------------
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
      const a = list[i], b = list[j], dx = b.x - a.x, dy = b.y - a.y, dd = Math.hypot(dx, dy), min = 22 * ((a.apexScale || 1) + (b.apexScale || 1)) / 2;
      if (dd > 0 && dd < min && Math.abs(dx) < min) { const push = (min - dd) / 2 * Math.min(1, dt * 8), ux = dx / dd, uy = dy / dd;
        if (!a.apex && this.walkable(a.x - ux * push, a.y - uy * push)) { a.x -= ux * push; a.y -= uy * push; }
        if (!b.apex && this.walkable(b.x + ux * push, b.y + uy * push)) { b.x += ux * push; b.y += uy * push; } AI.stats.pushes++; }
    }
    if (r.swSay) { for (const s of r.swSay) s.life -= dt; r.swSay = r.swSay.filter(s => s.life > 0).slice(-6); }
    return out;
  };
  // a gull that dies drops what it stole
  const hm = P.hitMonster;
  P.hitMonster = function (e) { const was = e.dead, out = hm.apply(this, arguments); if (!was && e.dead && e.swLoot && this.raid) { this.raid.drops.push({ x: e.x, y: e.y + 6, id: e.swLoot.id, n: e.swLoot.n, got: false }); e.swLoot = null; } return out; };
  // small floating cues ("! it stomps a warning", "flees!", "ambush!")
  const scene = P.drawCoastScene;
  P.drawCoastScene = function () {
    const out = scene.apply(this, arguments), r = this.raid; if (!r?.swSay?.length) return out;
    g.save(); g.font = '600 11px system-ui,sans-serif'; g.textAlign = 'center'; g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,.7)';
    for (const s of r.swSay) { g.globalAlpha = Math.min(1, s.life / .4); g.fillStyle = '#ffd9a0'; g.strokeText(s.text, s.x, s.y - (1.4 - s.life) * 12); g.fillText(s.text, s.x, s.y - (1.4 - s.life) * 12); }
    g.restore(); return out;
  };
})();
