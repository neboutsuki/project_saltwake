/* SALTWAKE weapons overhaul (v0.31).
 * 1. Hit feel: hitstop scaled by weapon and damage, screen shake, recoil kick, muzzle flash, impact sparks; heavy hits
 *    knock monsters back. All effects are code (no drawn art).
 * 2. Melee (slot 3): Spear, Knife, Greataxe from the weapon sheet. LEFT CLICK = light attack, chaining into a 3-hit
 *    combo (click again or hold; the 3rd hit is a finisher). RIGHT CLICK = heavy attack (Spear Impaling Lunge, Knife Dash
 *    Stab, Greataxe Overhead Cleave). Each weapon has its own reach, arc, speed, stamina, stagger and part power. Knife
 *    backstabs (unaware or from behind) deal x2.5. Greataxe sweeps hit everything in the arc. Crafted/upgraded (Lv 1-3)
 *    at the forge's Melee tab.
 * 3. Ranged: LEFT CLICK = normal shot (hold for auto-fire). RIGHT CLICK = the weapon's special shot, short cooldown:
 *    Bow Piercing Arrow · Arbalest Breaker Bolt · Wickcaster Flare Burst (fan of every loaded cell) · Harpoon Gun Reel
 *    Shot. Longwatch keeps right click = steady aim; a shot fired fully steady is a Deadeye. No charging.
 *    Harpoon Gun (fires bolts): small monsters are reeled in, big ones are anchored (slowed).
 * 4. Crafting: rank V "Tidemaw" upgrades for every weapon branch (Tidemaw parts), harpoon gun tree, melee upgrades;
 *    material lists say which monster part drops what you are missing.
 * window.saltwakeWeapons exposes data, state and stats for QA.
 */
(() => {
  const P = Game.prototype, T = 32, TAU = Math.PI * 2;
  const W = window.saltwakeWeapons = { stats: { hitstops: 0, light: 0, heavy: 0, combo3: 0, specials: 0, pulls: 0, anchors: 0, pierces: 0, backstabs: 0, shakes: 0 }, stop: 0, flashes: [], trails: [] };
  const AL = window.saltwakeAlpha, CAM = () => window.saltwakeCamera, AU = () => window.saltwakeAudio;
  const HUNT = () => window.saltwakeHunt;
  const has = typeof ARMORY !== 'undefined';
  const node = id => has ? ARMORY.weapons.find(n => n.id === id) : null;
  const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
  const shake = v => { if (v > 0) { CAM()?.shake?.(v); W.stats.shakes++; } };
  const sound = (n, s = 1) => { try { AU()?.event?.(n, s); } catch (e) { } };
  const isBoss = e => e.type === 'tidemaw' || e.boss;
  const hitstop = s => { if (s > W.stop) W.stop = s; W.stats.hitstops++; };

  // ---- data -------------------------------------------------------------------------------------------------------
  // step: dmg, reach (px), arc (half-angle rad), wind (s before the hit), rec (s after), st (stamina), lunge (px)
  const MELEE = W.MELEE = {
    spear: { name: 'Salvager Spear', art: 'art/weapons/spear', icon: 'weapon_spear', len: 62, pen: 17, stagger: 1.1, part: .8, multi: 2, sound: 'knife', stop: .05,
      combo: [{ dmg: 27, reach: 94, arc: .48, wind: .16, rec: .24, st: 12, lunge: 8 }, { dmg: 25, reach: 96, arc: .5, wind: .13, rec: .24, st: 11, lunge: 12 }, { dmg: 44, reach: 112, arc: .45, wind: .2, rec: .38, st: 16, lunge: 24 }],
      heavy: { name: 'Impaling Lunge', dmg: 78, reach: 128, arc: .36, wind: .3, rec: .42, st: 24, lunge: 42 },
      blurb: 'Long reach thrusts. Hits up to two in a line. Heavy: lunging impale.', craft: null, up: [{ scrap_metal: 4, rope: 2 }, { scrap_metal: 6, brineback_tusk: 1 }], upPrice: [80, 160] },
    knife: { name: 'Gutting Knife', art: 'art/weapons/knife', icon: 'weapon_knife', len: 32, pen: 8, stagger: .6, part: .6, multi: 1, sound: 'knife', stop: .03, backstab: 2.5,
      combo: [{ dmg: 14, reach: 60, arc: .8, wind: .07, rec: .13, st: 5, lunge: 10 }, { dmg: 14, reach: 60, arc: .8, wind: .07, rec: .13, st: 5, lunge: 10 }, { dmg: 24, reach: 66, arc: .9, wind: .1, rec: .26, st: 8, lunge: 18 }],
      heavy: { name: 'Dash Stab', dmg: 46, reach: 74, arc: .6, wind: .2, rec: .3, st: 14, lunge: 56 },
      blurb: 'Fast and quiet. x2.5 damage on unaware targets or from behind. Heavy: dashing stab.', craft: { scrap_metal: 3, rope: 1 }, price: 60, up: [{ scrap_metal: 4, widow_claw: 1 }, { scrap_metal: 5, widow_claw: 2, redhook_beak: 1 }], upPrice: [70, 150] },
    greataxe: { name: 'Salvager Greataxe', art: 'art/weapons/greataxe', icon: 'weapon_greataxe', len: 60, pen: 30, stagger: 2.2, part: 1.8, multi: 6, sound: 'hammer', stop: .1, knock: 34,
      combo: [{ dmg: 50, reach: 88, arc: 1.15, wind: .3, rec: .42, st: 18, lunge: 6 }, { dmg: 58, reach: 88, arc: 1.2, wind: .28, rec: .46, st: 20, lunge: 10 }, { dmg: 96, reach: 96, arc: 1.4, wind: .36, rec: .62, st: 26, lunge: 16 }],
      heavy: { name: 'Overhead Cleave', dmg: 165, reach: 104, arc: 1.5, wind: .45, rec: .7, st: 34, lunge: 22 },
      blurb: 'Slow sweeping chops that hit everything in the arc. Huge stagger and part breaking.', craft: { scrap_metal: 8, brineback_plate: 2, brineback_tusk: 1 }, price: 220, up: [{ scrap_metal: 8, brineback_plate: 3 }, { scrap_metal: 10, tidemaw_jaw_plate: 1, brineback_tusk: 2 }], upPrice: [180, 320] },
  };
  const ALT_CD = W.ALT_CD = { bow: 1.0, arbalest: 2.0, wickcaster: 2.5, harpoon: 3.0 };   // right-click special cooldowns (s)
  const SPECIAL = W.SPECIAL = { bow: 'Piercing Arrow', longwatch: 'Deadeye', arbalest: 'Breaker Bolt', wickcaster: 'Flare Burst', harpoon: 'Reel Shot' };
  const FEEL = { bow: [.02, .05, 2], longwatch: [.06, .22, 6], arbalest: [.04, .14, 5], wickcaster: [.03, .09, 3], harpoon: [.05, .16, 6] }; // hitstop, shake, recoil px
  const FIRE_SOUND = { bow: 'bow', longwatch: 'longwatch', arbalest: 'arbalest', wickcaster: 'wickcaster', harpoon: 'arbalest' };

  // ---- armory additions: harpoon gun family, rank V Tidemaw upgrades ------------------------------------------------
  if (window.saltwakeHunter?.WEAPON_HR) window.saltwakeHunter.WEAPON_HR[5] = 7;   // rank V needs HR7

  // Keep a masterwork modification when the weapon is upgraded to rank V.
  const forge = P.forgeNode;
  P.forgeNode = function (id) {
    const n = node(id), a = this.ensureArmory?.(), mod = n?.parent && a?.modifications?.[n.parent];
    const out = forge.apply(this, arguments);
    if (mod && a.owned[id] && !a.modifications[id]) { a.modifications[id] = mod; this.store(); }
    return out;
  };
  // Where materials come from (monster parts) shown next to what you are missing.
  const SOURCES = W.SOURCES = {};
  try {
    const C = window.SALTWAKE_WORLD?.content || WORLD.content;
    for (const e of C.enemies || []) for (const p of e.parts || []) if (p.drop && !SOURCES[p.drop]) SOURCES[p.drop] = `break ${e.name || e.id}’s ${p.name || p.id}`;
  } catch (e) { }
  const req = P.armoryRequirements;
  P.armoryRequirements = function (r) {
    const out = req.apply(this, arguments);
    const miss = Object.entries(r || {}).filter(([id, n]) => this.materialCount(id) < n && SOURCES[id]).map(([id]) => `${itemDef(id).name}: ${SOURCES[id]}`);
    return miss.length ? out + `<br><span class="swwSrc">◎ ${miss.map(s => safeText(s)).join(' · ')}</span>` : out;
  };

  // ---- melee loadout ----------------------------------------------------------------------------------------------
  const ml = g => { const m = g.save.melee ||= { owned: { spear: 1 }, level: { spear: 1 }, equipped: 'spear' }; m.owned.spear ||= 1; m.level ||= {}; if (!m.owned[m.equipped]) m.equipped = 'spear'; return m; };
  W.melee = g => { const m = ml(g), id = m.equipped; return { id, lvl: m.level[id] || 1, ...MELEE[id] }; };
  const mult = lvl => 1 + .2 * ((lvl || 1) - 1);

  // ---- melee attacks ----------------------------------------------------------------------------------------------
  // state per raid: { id, kind, step, age, wind, end, angle, hit, data }
  const ST = new WeakMap(), S = r => { let s = ST.get(r); if (!s) { s = { att: null, buffer: 0, lastEnd: -9, combo: 0, altCD: 0 }; ST.set(r, s); } return s; };
  W.state = g => g.raid && S(g.raid);
  function startMelee(g, heavy) {
    const p = g.player, r = g.raid; if (!r || g.isPaused() || p.roll > 0 || p.weapon !== 2) return false;
    const s = S(r), w = W.melee(g);
    if (s.att) { if (!heavy && s.att.age > s.att.wind) s.buffer = .35; return false; }
    const step = heavy ? w.heavy : w.combo[(r.time - s.lastEnd < .5 && s.combo < 3) ? s.combo : 0];
    const idx = heavy ? -1 : w.combo.indexOf(step);
    if (p.st < step.st) { g.notify('Not enough stamina'); return false; }
    p.st -= step.st; s.combo = heavy ? 0 : idx + 1;
    s.att = { id: w.id, kind: heavy ? 'heavy' : 'light', step: idx, age: 0, wind: step.wind, end: step.wind + .08 + step.rec, angle: p.angle, hit: false, data: step, w };
    if (w.backstab) s.att.sneak = new Set(r.enemies.filter(e => !e.dead && e.awareness !== 'alert' && !e.aggro && Math.hypot(e.x - p.x, e.y - p.y) < step.reach + 60).map(e => e.id));
    p.cooldown = s.att.end;
    g.makeSound?.(p.x, p.y, w.id === 'knife' ? 30 : w.id === 'greataxe' ? 110 : 55, 'spear');
    if (r.alpha) r.alpha.melee++;
    if (heavy) W.stats.heavy++; else { W.stats.light++; if (idx === 2) W.stats.combo3++; }
    return true;
  }
  function meleeHit(g, s) {
    const a = s.att, p = g.player, r = g.raid, w = a.w, d = a.data, k = mult(w.lvl) * (a.kind === 'heavy' ? 1 : 1);
    const targets = r.enemies.filter(e => !e.dead && Math.hypot(e.x - p.x, e.y - p.y) <= d.reach + (isBoss(e) ? 40 : 10)
      && (Math.hypot(e.x - p.x, e.y - p.y) < 36 || Math.abs(angDiff(Math.atan2(e.y - p.y, e.x - p.x), a.angle)) < d.arc) && (!g.hasSight || g.hasSight(p.x, p.y, e.x, e.y)))
      .sort((x, y) => Math.hypot(x.x - p.x, x.y - p.y) - Math.hypot(y.x - p.x, y.y - p.y)).slice(0, w.multi);
    let total = 0;
    for (const e of targets) {
      let dmg = d.dmg * k, back = false;
      if (w.backstab) { const unaware = a.sneak?.has(e.id) || (e.awareness !== 'alert' && !e.aggro); const behind = e.facing != null && Math.abs(angDiff(e.facing, a.angle)) < 1.0; if (unaware || behind) { dmg *= w.backstab; back = true; W.stats.backstabs++; } }
      const before = e.hp;
      g.hitMonster(e, dmg, { penetration: w.pen, stagger: w.stagger * (a.kind === 'heavy' ? 1.6 : a.step === 2 ? 1.3 : 1), partPower: w.part, weaponId: 'melee_' + w.id, melee: true }, e.x, e.y);
      const dealt = Math.max(0, before - e.hp); total += dealt;
      const f = HUNT()?.fx?.(r); if (f) { f.events.push({ x: e.x, y: e.y - 6, kind: 'hit', amount: dealt, part: back ? 'BACKSTAB' : a.kind === 'heavy' ? 'HEAVY' : a.step === 2 ? 'FINISHER' : '', life: .6, max: .6 }); if (f.events.length > 36) f.events.shift(); }
      const kb = (w.knock || 10) * (a.kind === 'heavy' ? 1.8 : a.step === 2 ? 1.3 : .6);
      if (!e.dead && !isBoss(e) && kb > 0) knock(g, e, Math.atan2(e.y - p.y, e.x - p.x), kb);
      sparks(g, e.x, e.y - 10, a.angle, a.kind === 'heavy' ? 12 : 7, back ? '#ffe9a8' : '#f3d9a6');
    }
    if (targets.length) {
      hitstop(w.stop * (a.kind === 'heavy' ? 1.8 : a.step === 2 ? 1.4 : 1) + Math.min(.04, total / 3000));
      shake((a.kind === 'heavy' ? .32 : a.step === 2 ? .2 : .1) * (w.id === 'greataxe' ? 1.4 : w.id === 'knife' ? .6 : 1));
      sound(w.sound, a.kind === 'heavy' ? 1.2 : .9); sound('hit', w.id === 'greataxe' ? 1.3 : .8);
    }
    return targets.length;
  }
  function knock(g, e, ang, px) {
    const steps = 6; for (let i = 0; i < steps; i++) { const nx = e.x + Math.cos(ang) * px / steps, ny = e.y + Math.sin(ang) * px / steps; if (g.walkable(nx, ny)) { e.x = nx; e.y = ny; } else break; }
  }
  function sparks(g, x, y, ang, n, color) {
    const r = g.raid; if (!r?.particles) return;
    for (let i = 0; i < n; i++) { const a = ang + (Math.random() - .5) * 1.6, v = 80 + Math.random() * 170; r.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30, t: .18 + Math.random() * .2, color }); }
  }
  function advance(g, dt) {
    const r = g.raid; if (!r) return; const s = S(r), p = g.player, a = s.att;
    if (!a) return;
    if (p.roll > 0 || p.hitStun > 0 || p.weapon !== 2) { s.att = null; s.combo = 0; return; }
    const prev = a.age; a.age += dt;
    // lunge forward during the wind-up
    if (a.data.lunge && prev < a.wind) { const t = Math.min(a.age, a.wind) - prev, v = a.data.lunge / a.wind; g.move(Math.cos(a.angle) * v * t, Math.sin(a.angle) * v * t); }
    if (!a.hit && a.age >= a.wind) { a.hit = true; meleeHit(g, s); W.trails.push({ x: p.x, y: p.y - 14, angle: a.angle, arc: a.w.id === 'spear' ? .18 : a.data.arc, reach: a.data.reach, life: .16, max: .16, heavy: a.kind === 'heavy' }); }
    if (a.age >= a.end) { s.att = null; s.lastEnd = r.time; if (s.buffer > 0) { s.buffer = 0; startMelee(g, false); } }
    if (s.buffer > 0) s.buffer -= dt;
  }
  W.startMelee = startMelee;
  // Replace the single spear thrust (same input path), keep its API for the renderer and old callers.
  if (AL) {
    AL.startSpear = G => startMelee(G, false);
    AL.advanceSpear = (G, dt) => advance(G, dt);
    AL.spearPose = G => {
      const a = G.raid && S(G.raid).att; if (!a) return null; const t = a.age, w = a.wind;
      return { angle: a.angle, extension: t < w ? -9 * t / w : t < w + .1 ? -9 + 30 * (t - w) / .1 : Math.max(0, 21 * (1 - (t - w - .1) / Math.max(.05, a.end - w - .1))) };
    };
  }

  // ---- leap attack: attack during a dodge roll (melee) ----------------------------------------------------------------
  // The roll turns into a leap toward your aim: Ren rises in an arc (shadow stays on the ground), the weapon goes up
  // overhead, and the landing is a ground slam around the impact point (hitstop, shake, dust ring, crack). Short
  // i-frames at take-off. Greataxe: Leaping Cleave (wide, heavy) · Spear: Plunge (long reach) · Knife: Pounce (far, fast).
  const LEAP = W.LEAP = {
    greataxe: { name: 'Leaping Cleave', dist: 92, dur: .58, h: 40, r: 80, dmg: 1.25, st: 26 },
    spear: { name: 'Plunge', dist: 118, dur: .52, h: 34, r: 58, dmg: 1.15, st: 20 },
    knife: { name: 'Pounce', dist: 140, dur: .46, h: 30, r: 50, dmg: 1.3, st: 14 },
  };
  W.rings = []; W.leapZ = 0; W.stats.leaps = 0; W.stats.leapHits = 0;
  function startLeap(g) {
    const p = g.player, r = g.raid; if (!r || g.isPaused()) return false;
    const s = S(r), w = W.melee(g), L = LEAP[w.id]; if (!L || s.leap) return false;
    if (p.st < L.st) { g.notify('Not enough stamina'); return false; }
    p.st -= L.st; p.roll = 0; p.iframes = Math.max(p.iframes || 0, .28); s.att = null; s.buffer = 0;
    s.leap = { t: 0, dur: L.dur, a: p.angle || 0, L, w }; W.stats.leaps++;
    g.makeSound?.(p.x, p.y, 80, 'spear'); sound('roll', .8);
    return true;
  }
  W.startLeap = startLeap;
  function leapLand(g, s) {
    const p = g.player, r = g.raid, { L, w, a } = s.leap, cx = p.x + Math.cos(a) * 16, cy = p.y + Math.sin(a) * 12;
    const heavy = w.heavy, k = mult(w.lvl) * L.dmg; let hits = 0;
    for (const e of r.enemies) { if (e.dead) continue; const d = Math.hypot(e.x - cx, e.y - cy); if (d > L.r + (isBoss(e) ? 40 : 14)) continue;
      const before = e.hp; g.hitMonster(e, heavy.dmg * k * (d < L.r * .5 ? 1 : .75), { penetration: w.pen + 10, stagger: w.stagger * 2, partPower: w.part * 1.2, weaponId: 'melee_' + w.id, melee: true }, e.x, e.y);
      if (!e.dead && !isBoss(e)) knock(g, e, Math.atan2(e.y - cy, e.x - cx), (w.knock || 14) * 1.8);
      const f = HUNT()?.fx?.(r); if (f) { f.events.push({ x: e.x, y: e.y - 6, kind: 'hit', amount: Math.max(0, before - e.hp), part: L.name.toUpperCase(), life: .6, max: .6 }); if (f.events.length > 36) f.events.shift(); }
      hits++; W.stats.leapHits++; }
    hitstop(hits ? .11 : .05); shake(hits ? .45 : .25); sound('hammer', 1.2); if (hits) sound('hit', 1.3);
    W.rings.push({ x: cx, y: cy, r: L.r, life: .38, max: .38 });
    sparks(g, cx, cy, -Math.PI / 2, 14, '#d8c9a8');
    const IM = window.saltwakeImpact; if (IM) { const blobs = []; for (let i = 0; i < 6; i++) { const t = i / 6 * Math.PI * 2; blobs.push([Math.cos(t) * L.r * .35, Math.sin(t) * L.r * .2, 3 + Math.random() * 3]); } blobs.push([0, 0, 7]); IM.decals.push({ x: cx, y: cy - 14, blobs, color: '#2a221a', life: 20 }); }
    s.land = .14; s.lastLeapA = a; s.leap = null; W.leapZ = 0;
  }
  // ---- input: left click = main attack, right click = special ------------------------------------------------------
  // Melee: LMB light combo (hold to keep swinging), RMB heavy. Ranged: LMB normal shot (hold = auto-fire as before),
  // RMB the weapon's special shot with a short cooldown. Longwatch keeps RMB = steady aim (scope); a LMB shot fired
  // while fully steady is a Deadeye. No charging anywhere.
  const famOf = g => { const w = g.player.weapon < 2 && g.weapon?.(); return w?.family || null; };
  const shoot = P.shoot;
  P.shoot = function () {
    const p = this.player, r = this.raid;
    if (!r || this.isPaused() || p.harpoon) return shoot.apply(this, arguments);
    const s = S(r);
    if (p.weapon === 2 && (p.roll > 0 || s.leap)) return s.leap ? undefined : startLeap(this);
    if (p.weapon === 2) { if (s.att) { if (s.att.age > s.att.wind) s.buffer = .35; return; } return startMelee(this, false); }
    const fam = famOf(this);
    const deadeye = fam === 'longwatch' && typeof this.longwatchSpread === 'function' && this.longwatchSpread() <= .5;
    return fire.call(this, fam, deadeye ? 1 : 0);
  };
  P.altAttack = function () {
    const p = this.player, r = this.raid;
    if (!r || this.isPaused() || this.panel || p.harpoon) return false;
    const s = S(r);
    if (p.weapon === 2 && (p.roll > 0 || s.leap)) return s.leap ? false : startLeap(this);
    if (p.roll > 0) return false;
    if (p.weapon === 2) { if (s.att) return false; return startMelee(this, true); }
    const fam = famOf(this); if (!fam || !ALT_CD[fam]) return false;          // longwatch: RMB is the scope
    if ((s.altCD || 0) > 0) { this.notify?.(`${SPECIAL[fam]} ready in ${s.altCD.toFixed(1)} s`, .8); return false; }
    if (p.cooldown > 0 || p.reload > 0) return false;
    if (!p.mag[p.weapon]) { this.reload?.(); return false; }
    const before = W.stats.specials; fire.call(this, fam, 1);
    if (W.stats.specials > before) { s.altCD = ALT_CD[fam]; p.cooldown = Math.max(p.cooldown, (this.weapon()?.cooldown || .5) * 1.4); return true; }
    return false;
  };
  W.alt = g => g.altAttack();
  const canvas = typeof C !== 'undefined' ? C : document.getElementById('world');
  canvas?.addEventListener('pointerdown', e => { const G = window.SALTWAKE_DEV?.game; if (e.button !== 2 || !G || G.mode !== 'play' || !G.raid) return; e.preventDefault(); G.altAttack(); });
  function fire(fam, level) {
    const p = this.player, r = this.raid, before = r ? r.bullets.length : 0, mag = p.mag?.[p.weapon], cd = p.cooldown;
    const out = shoot.call(this);
    if (!r || this.raid !== r || !(p.mag?.[p.weapon] < mag)) return out;      // nothing fired
    const made = r.bullets.slice(before).filter(b => !b.enemy);
    const f = FEEL[fam] || [.03, .08, 3], ang = p.angle;
    for (const b of made) b.fam = fam;
    if (level > 0 && made.length) {
      const b = made[0], sp = Math.hypot(b.vx, b.vy);
      const aim = (k) => { b.vx = Math.cos(ang) * sp * k; b.vy = Math.sin(ang) * sp * k; b.t = b.t / k; };
      {
        W.stats.specials++; const label = SPECIAL[fam];
        if (fam === 'bow') { b.damage *= 1.9; b.pierce = 2; aim(1.25); }
        else if (fam === 'longwatch') { b.damage *= 2; b.pierce = 3; b.partPower = (b.partPower || 1) * 1.5; aim(1.2); }
        else if (fam === 'arbalest') { b.damage *= 1.6; b.stagger = (b.stagger || 1) * 2.5; b.pierce = 1; b.knock = 40; aim(1); }
        else if (fam === 'harpoon') { b.damage *= 1.5; b.reel = 2; aim(1.1); }
        else if (fam === 'wickcaster') {
          const extra = Math.max(0, p.mag[p.weapon]), pellets = 4 + extra * 2; p.mag[p.weapon] = 0;
          for (let i = 0; i < pellets; i++) { const a = ang + (i / (pellets - 1) - .5) * .7; r.bullets.push({ ...b, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, damage: b.damage * .8, stagger: (b.stagger || 1) * 1.3, fam }); }
          b.damage *= 1.1;
        }
        r.particles?.push({ x: p.x + Math.cos(ang) * 30, y: p.y - 8 + Math.sin(ang) * 30, vx: 0, vy: -20, t: .4, color: '#fff2c4' });
        this.notify?.(label, 1.1);
      }
    }
    // recoil + muzzle flash
    const kick = f[2] * (level >= 1 ? 2 : 1); this.move(-Math.cos(ang) * kick, -Math.sin(ang) * kick);
    shake(f[1] * (level >= 1 ? 1.8 : 1) * .6);
    W.flashes.push({ x: p.x + Math.cos(ang) * 28, y: p.y - 8 + Math.sin(ang) * 28, life: .07, max: .07, big: level >= 1 });
    W.shotAnim = { t: r.time, fam, big: level >= 1 };
    if (level >= 1) sound(FIRE_SOUND[fam] || 'arbalest', 1.3);
    return out;
  }
  W.fire = (g, fam, level) => fire.call(g, fam, level);

  // ---- per-frame: hitstop, special cooldown, pulls/anchors, effect lifetimes ------------------------------------------------
  const update = P.update;
  P.update = function (dt) {
    const r = this.raid, sl = r && !this.isPaused() && S(r).leap;
    if (sl) { const saved = {}; for (const k of ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']) if (this.keys[k]) { saved[k] = true; delete this.keys[k]; }
      try { return leapFrame.call(this, dt); } finally { Object.assign(this.keys, saved); } }
    return leapFrame.call(this, dt);
  };
  function leapFrame(dt) {
    const r = this.raid;
    if (r && !this.isPaused() && W.stop > 0 && dt > 0) { const d = Math.min(W.stop, dt); W.stop -= d; dt = dt - d + d * .08; }
    else if (!r) W.stop = 0;
    const out = update.call(this, dt);
    if (!this.raid || this.isPaused()) return out;
    const s = S(this.raid), p = this.player;
    if (s.altCD > 0) s.altCD = Math.max(0, s.altCD - dt);
    if (s.land > 0) s.land = Math.max(0, s.land - dt);
    if (s.leap) { const Lp = s.leap, prev = Lp.t; Lp.t = Math.min(Lp.dur, Lp.t + dt); const u0 = prev / Lp.dur, u1 = Lp.t / Lp.dur;
      const ez = x => 1 - Math.pow(1 - x, 1.6), step = (ez(u1) - ez(u0)) * Lp.L.dist; this.move(Math.cos(Lp.a) * step, Math.sin(Lp.a) * step);
      W.leapZ = 4 * Lp.L.h * u1 * (1 - u1); if (Lp.t >= Lp.dur) leapLand(this, s); }
    else W.leapZ = 0;
    for (const ring of W.rings) ring.life -= dt; for (let i = W.rings.length - 1; i >= 0; i--) if (W.rings[i].life <= 0) W.rings.splice(i, 1);
    for (const e of this.raid.enemies) {
      if (e.swReel) { const k = Math.min(1, dt / e.swReel.t); const ang = Math.atan2(p.y - e.y, p.x - e.x), dist = Math.hypot(p.x - e.x, p.y - e.y);
        if (dist > 46) knock(this, e, ang, Math.min(dist - 46, e.swReel.px * k)); e.swReel.t -= dt; e.swReel.px *= 1 - k; if (e.swReel.t <= 0 || e.dead) e.swReel = null; }
      if (e.swAnchor) { e.swAnchor.t -= dt; if (e.swAnchor.t <= 0 || e.dead) { if (!e.swAnchor.wasSlow) e.slowed = false; e.swAnchor = null; } }
    }
    for (const list of [W.flashes, W.trails]) { for (const f of list) f.life -= dt; for (let i = list.length - 1; i >= 0; i--) if (list[i].life <= 0) list.splice(i, 1); }
    return out;
  };

  // ---- on hit: hitstop, shake, pierce, knockback, harpoon reel/anchor ---------------------------------------------
  const hit = P.hitMonster;
  P.hitMonster = function (e, damage, meta = {}, x, y) {
    const before = e.hp, out = hit.apply(this, arguments), dealt = Math.max(0, before - e.hp), r = this.raid;
    if (!r || meta.melee || meta.enemy) return out;
    const fam = meta.fam || (meta.weaponId && node(meta.weaponId)?.family);
    if (fam && meta.vx != null) {
      const f = FEEL[fam] || [.03, .08, 3];
      hitstop(f[0] * (meta.pierce != null || meta.reel ? 1.5 : 1) + Math.min(.05, dealt / 2500)); shake(f[1] * .7);
      sparks(this, x ?? e.x, (y ?? e.y) - 6, Math.atan2(meta.vy, meta.vx), 6, '#f6deaa');
      if (meta.pierce > 0) {
        const sp = Math.hypot(meta.vx, meta.vy) || 1, ux = meta.vx / sp, uy = meta.vy / sp, off = (isBoss(e) ? 90 : e.type === 'brineback' ? 52 : 40);
        r.bullets.push({ ...meta, hitPartId: undefined, x: e.x + ux * off, y: e.y + uy * off, t: Math.max(.05, (meta.t || .5)), damage: meta.damage * .8, pierce: meta.pierce - 1 }); W.stats.pierces++;
      }
      if (meta.knock && !e.dead && !isBoss(e)) knock(this, e, Math.atan2(meta.vy, meta.vx), meta.knock);
      if (fam === 'harpoon' && !e.dead) {
        const small = !isBoss(e) && (e.maxHp || e.hp) <= 260 && e.type !== 'brineback';
        const br = node(meta.weaponId)?.branch, reel = (meta.reel || 1) * (br === 'reelhook' ? 1.4 : 1);
        if (small) { e.swReel = { t: .35, px: Math.min(220, 130 * reel) }; e.staggerTime = Math.max(e.staggerTime || 0, .5); W.stats.pulls++; }
        else { e.swAnchor = { t: (br === 'anchorline' ? 6 : 3.5) * (meta.reel ? 1.4 : 1), wasSlow: e.swAnchor ? e.swAnchor.wasSlow : !!e.slowed }; e.slowed = true; W.stats.anchors++; this.notify?.('ANCHORED', 1); }
        e.swLine = { life: small ? .35 : e.swAnchor?.t || 3 };
      }
    }
    return out;
  };

  // ---- drawing: swing trails, muzzle flashes, harpoon lines --------------------------------------------
  const render = P.render;
  P.render = function (now) {
    const out = render.apply(this, arguments);
    if (!this.raid || this.mode !== 'play' || this.panel) return out;
    const z = this.camera.zoom, cx = this.camera.x, cy = this.camera.y, p = this.player, s = S(this.raid);
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'lighter';
    for (const t of W.trails) { const k = t.life / t.max, X = (t.x - cx) * z, Y = (t.y - cy) * z;
      g.globalAlpha = .55 * k; g.strokeStyle = t.heavy ? '#ffe2a0' : '#f2f0e6'; g.lineWidth = (t.heavy ? 9 : 5) * z * k + 1;
      g.beginPath(); g.arc(X, Y, t.reach * z * .9, t.angle - t.arc, t.angle + t.arc); g.stroke(); }
    for (const f of W.flashes) { const k = f.life / f.max, X = (f.x - cx) * z, Y = (f.y - cy) * z, R = (f.big ? 34 : 20) * z;
      const gr = g.createRadialGradient(X, Y, 0, X, Y, R); gr.addColorStop(0, `rgba(255,240,200,${.9 * k})`); gr.addColorStop(1, 'rgba(255,200,120,0)'); g.globalAlpha = 1; g.fillStyle = gr; g.fillRect(X - R, Y - R, R * 2, R * 2); }
    g.globalCompositeOperation = 'source-over';
    for (const ring of W.rings) { const k = ring.life / ring.max, R = ring.r * (1.15 - .55 * k) * z, X = (ring.x - cx) * z, Y = (ring.y - cy) * z;
      g.globalAlpha = .8 * k; g.strokeStyle = '#e8dcc0'; g.lineWidth = (2 + 5 * k) * z; g.beginPath(); g.ellipse(X, Y, R, R * .62, 0, 0, TAU); g.stroke();
      g.globalAlpha = .35 * k; g.fillStyle = '#b9ab90'; g.beginPath(); g.ellipse(X, Y, R * .8, R * .5, 0, 0, TAU); g.fill(); g.globalAlpha = 1; }
    for (const e of this.raid.enemies) if (e.swLine && !e.dead && (e.swReel || e.swAnchor)) {
      g.globalAlpha = .85; g.strokeStyle = '#d8c9a0'; g.lineWidth = Math.max(1, 1.6 * z); g.setLineDash([5 * z, 3 * z]);
      g.beginPath(); g.moveTo((p.x - cx) * z, (p.y - 14 - cy) * z); g.lineTo((e.x - cx) * z, (e.y - 10 - cy) * z); g.stroke(); g.setLineDash([]);
    }
    g.restore();
    return out;
  };

  // ---- held-weapon art + HUD name ---------------------------------------------------------------------------------
  // ---- attack animation (procedural motion of the existing weapon + character art) ---------------------------------
  // W.pose(g) -> { alias, len, angle, ext, scale, smear[], body{dx,dy,sx,sy} }. Phases per attack: wind-up (eased pull
  // back), strike (fast eased sweep/thrust with afterimages), recovery (ease back). Ranged: recoil kick + muzzle rise,
  // bow string snap, Wickcaster pump, reload dip-and-rack.
  const ease = { out: t => 1 - (1 - t) * (1 - t), in: t => t * t, io: t => t < .5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t), back: t => { const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); } };
  const lerp = (a, b, t) => a + (b - a) * t, clamp01 = t => Math.max(0, Math.min(1, t));
  W.shotAnim = null;
  function meleePose(g, w, a, aim) {
    const side = Math.cos(aim) < 0 ? -1 : 1, t = a.age, wind = a.wind, strikeEnd = wind + .09, end = a.end, heavy = a.kind === 'heavy', fin = a.step === 2;
    // per style: [start offset, end offset] relative to the aim (radians, mirrored by side), reach in/out (ext)
    let style = w.id === 'spear' ? 'thrust' : w.id === 'knife' ? (heavy ? 'thrust' : a.step === 1 ? 'thrust' : 'slash') : heavy ? 'overhead' : 'slash';
    if (w.id === 'greataxe' && fin && !heavy) style = 'spin';
    const dir = a.step === 1 ? -1 : 1;                                     // alternate slash direction through the combo
    const arc = Math.min(1.6, (a.data.arc || .6) * 1.25);
    let ang = aim, ext = 0, sc = 1, body = { dx: 0, dy: 0, sx: 1, sy: 1 }, smear = [];
    const ca = Math.cos(aim), sa = Math.sin(aim);
    const angAt = u => {                                                   // angle of the weapon along the strike, u 0..1
      if (style === 'slash') return aim + side * dir * lerp(arc, -arc, ease.io(u));
      if (style === 'spin') return aim + side * lerp(arc, arc - Math.PI * 2, ease.io(u));
      if (style === 'overhead') return aim + side * lerp(-2.3, 0, ease.in(u));
      return aim;
    };
    const extAt = u => style === 'thrust' ? lerp(-12, heavy ? 34 : 24, ease.out(u)) : style === 'overhead' ? lerp(-10, 8, ease.in(u)) : lerp(-4, 8, ease.io(u));
    if (t < wind) {                                                        // wind-up: pull back to the start pose
      const u = ease.out(clamp01(t / wind)); ang = lerp(aim, angAt(0), u); ext = lerp(0, extAt(0), u);
      if (style === 'overhead') sc = lerp(1, 1.2, u);                       // raised = closer to the camera
      body = { dx: -ca * 4 * u, dy: -sa * 3 * u, sx: 1 - .04 * u, sy: 1 + .05 * u };
    } else if (t < strikeEnd) {                                            // strike
      const u = clamp01((t - wind) / (strikeEnd - wind)); ang = angAt(u); ext = extAt(u);
      if (style === 'overhead') sc = lerp(1.2, .95, ease.in(u));
      body = { dx: ca * 7 * u, dy: sa * 5 * u, sx: 1 + .07 * u, sy: 1 - .07 * u };
      for (let i = 1; i <= 3; i++) { const v = clamp01(u - i * .14); if (v <= 0) break; smear.push({ angle: angAt(v), ext: extAt(v), alpha: .38 - i * .1 }); }
    } else {                                                               // follow-through + recovery
      const u = clamp01((t - strikeEnd) / Math.max(.05, end - strikeEnd)), k = ease.out(u);
      ang = lerp(angAt(1), aim, k); ext = lerp(extAt(1), 0, k); sc = style === 'overhead' ? lerp(.95, 1, k) : 1;
      body = { dx: ca * 7 * (1 - k), dy: sa * 5 * (1 - k), sx: 1 + .07 * (1 - k), sy: 1 - .07 * (1 - k) };
    }
    return { angle: ang, ext, scale: sc, smear, body };
  }
  function rangedPose(g, fam, aim) {
    const p = g.player, side = Math.cos(aim) < 0 ? -1 : 1, r = g.raid, now = r ? r.time : 0, w = g.weapon?.();
    let ang = aim, ext = 0, body = { dx: 0, dy: 0, sx: 1, sy: 1 };
    if (p.reload > 0 && w?.reload) {                                         // reload: dip down, rack, back up
      const u = 1 - p.reload / w.reload, dip = Math.sin(clamp01(u) * Math.PI);
      ang = aim + side * .95 * dip; ext = -8 * dip;
      if (u > .55 && u < .8) ext += Math.sin((u - .55) / .25 * Math.PI) * -5;  // rack
    }
    const S0 = W.shotAnim;
    if (S0 && r && now - S0.t < .45) {
      const t = now - S0.t, big = S0.big ? 1.7 : 1, kick = { bow: 3, arbalest: 7, wickcaster: 5, longwatch: 9, harpoon: 9 }[fam] || 6;
      const k = t < .04 ? t / .04 : Math.max(0, 1 - ease.out(clamp01((t - .04) / .3)));
      ext -= kick * big * k; ang -= side * .16 * big * k;                 // recoil back + muzzle rise
      body = { dx: -Math.cos(aim) * 3 * big * k, dy: -Math.sin(aim) * 2 * big * k, sx: 1, sy: 1 };
      if (fam === 'bow' && t < .12) ext += Math.sin(t / .12 * Math.PI * 3) * 1.5;   // string snap
      if (fam === 'wickcaster' && t > .14 && t < .34) ext -= Math.sin((t - .14) / .2 * Math.PI) * 5;   // pump
    }
    return { angle: ang, ext, scale: 1, smear: [], body };
  }
  W.pose = g => {
    const p = g.player, aim = p.angle || 0;
    if (p.weapon === 2) { const w = W.melee(g), st = g.raid && S(g.raid), a = st && st.att;
      const base = { alias: w.art, len: w.len, aim };
      if (st && st.leap) { const Lp = st.leap, u = Lp.t / Lp.dur, side = Math.cos(Lp.a) < 0 ? -1 : 1, down = clamp01((u - .55) / .45);
        const ang = Lp.a + side * lerp(-2.4 * ease.out(clamp01(u / .5)), 0, ease.in(down)), sm = [];
        if (down > 0) for (let i = 1; i <= 3; i++) { const v = clamp01(down - i * .15); if (v <= 0) break; sm.push({ angle: Lp.a + side * lerp(-2.4, 0, ease.in(v)), ext: 6, alpha: .35 - i * .09 }); }
        return { ...base, angle: ang, ext: lerp(-8, 10, down), scale: lerp(1.2, 1, down), smear: sm, body: { dx: 0, dy: -W.leapZ, sx: 1 - .05 * Math.sin(u * Math.PI), sy: 1 + .06 * Math.sin(u * Math.PI) }, air: W.leapZ }; }
      if (st && st.land > 0) { const k = st.land / .14; return { ...base, angle: (st.lastLeapA ?? aim), ext: 10, scale: 1, smear: [], body: { dx: 0, dy: 0, sx: 1 + .16 * k, sy: 1 - .14 * k } }; }
      return a ? { ...base, ...meleePose(g, w, a, a.angle) } : { ...base, angle: aim, ext: 0, scale: 1, smear: [], body: null }; }
    const fam = famOf(g); const A = { arbalest: 'art/weapons/arbalest', wickcaster: 'art/weapons/wickcaster', harpoon: 'art/weapons/harpoon_gun' };
    if (!A[fam] && !fam) return null;
    return { alias: A[fam] || 'art/weapons/arbalest', len: fam === 'harpoon' ? 50 : fam === 'wickcaster' ? 44 : 46, aim, ...rangedPose(g, fam, aim) };
  };
  W.art = g => { const q = W.pose(g); return q && { alias: q.alias, len: q.len, swing: q.angle - (g.player.angle || 0) }; };
  // body lean/lunge during attacks (wraps the player draw, outline included)
  for (const name of ['coastPlayer', 'draw25Player']) {
    const f = P[name]; if (!f) continue;
    P[name] = function () {
      const q = this.raid && W.pose(this), b = q?.body; if (!b || (!b.dx && !b.dy && b.sx === 1 && b.sy === 1)) return f.apply(this, arguments);
      const p = this.player, fy = p.y + 4, air = q.air || 0;
      if (air > 0) { const k = 1 - Math.min(.6, air / 70); g.save(); g.fillStyle = `rgba(8,8,10,${.32 * k})`; g.beginPath(); g.ellipse(p.x, p.y + 5, 15 * k, 5 * k, 0, 0, Math.PI * 2); g.fill(); g.restore(); if (window.saltwakePop) window.saltwakePop.noShadow = true; }
      g.save(); g.translate(p.x + b.dx, fy + b.dy); g.scale(b.sx, b.sy); g.translate(-p.x, -fy);
      try { return f.apply(this, arguments); } finally { g.restore(); if (window.saltwakePop) window.saltwakePop.noShadow = false; }
    };
  }
  const hud = P.hud;
  P.hud = function () {
    const out = hud.apply(this, arguments);
    const el = document.getElementById('weaponName'), am = document.getElementById('ammoText');
    const ro = el?.closest('.weaponReadout'); let alt = document.getElementById('swAlt');
    if (ro && !alt) { alt = document.createElement('div'); alt.id = 'swAlt'; ro.appendChild(alt); }
    if (alt) { const fam = famOf(this), s = this.raid && S(this.raid), cd = s?.altCD || 0;
      const t = this.player.weapon === 2 ? `RMB · ${W.melee(this).heavy.name}` : fam === 'longwatch' ? 'RMB · steady aim → Deadeye' : fam && SPECIAL[fam] ? `RMB · ${SPECIAL[fam]}${cd > 0 ? ' · ' + cd.toFixed(1) + 's' : ''}` : '';
      if (alt.textContent !== t) alt.textContent = t; alt.classList.toggle('cd', cd > 0); }
    if (el && this.player.weapon === 2) { const w = W.melee(this), t = `${w.name}${w.lvl > 1 ? ' +' + (w.lvl - 1) : ''}`; if (el.textContent !== t) el.textContent = t;
      const s = this.raid && S(this.raid), txt = s?.att ? (s.att.kind === 'heavy' ? 'HEAVY' : `Combo ${s.att.step + 1}/3`) : 'LMB combo'; if (am && am.textContent !== txt) am.textContent = txt; }
    return out;
  };

  // ---- forge: Melee tab -------------------------------------------------------------------------------------------
  const panel = P.armoryPanel;
  P.armoryPanel = function (tab) {
    if (tab && tab !== 'melee') this.swwMelee = false;
    if (tab === 'melee') this.swwMelee = true;
    const out = panel.call(this, this.swwMelee ? 'weapons' : tab);
    const body = document.querySelector('#panel .panelBody'); if (!body || !this.smithyAllowed()) return out;
    const tabs = body.querySelector('.smithTabs') || body.querySelector('.armTabs');
    if (tabs && !tabs.querySelector('[data-tab="melee"]')) tabs.querySelector('[data-tab="weapons"]')?.insertAdjacentHTML('afterend', `<button class="armTab" data-act="armorytab" data-tab="melee" aria-pressed="${!!this.swwMelee}">Melee</button>`);
    // rank V labels in the weapon tree (the tree only knows ranks I-IV)
    for (const b of body.querySelectorAll('.smithTreeNode b')) if (/^undefined-/.test(b.textContent)) b.textContent = 'V-' + b.textContent.split('-')[1];
    for (const el of body.querySelectorAll('.smithDetailHead .smallLabel')) el.textContent = el.textContent.replace('RANK undefined', 'RANK V');
    for (const el of body.querySelectorAll('.smithMaterial.missing')) { const nm = el.querySelector('span')?.textContent, id = Object.keys(SOURCES).find(k => { try { return itemDef(k).name === nm; } catch (e) { return false; } });
      if (id && !el.querySelector('.swwSrc')) el.insertAdjacentHTML('beforeend', `<small class="swwSrc">◎ ${safeText(SOURCES[id])}</small>`); }
    const graph = body.querySelector('.smithGraph');
    if (graph && body.querySelector('.smithTreeNode[data-id$="_R5L1"]')) { graph.style.width = '1820px'; graph.insertAdjacentHTML('beforeend', '<span class="smithRankLabel" style="left:1668px">RANK V · TIDEMAW</span>'); const svg = graph.querySelector('svg'); if (svg) svg.style.overflow = 'visible'; }
    if (this.swwMelee) {
      tabs?.querySelector('[data-tab="weapons"]')?.setAttribute('aria-pressed', 'false');
      for (const n of body.querySelectorAll('.smithWeaponTab')) n.remove();
      const m = ml(this), icon = id => { const s = window.saltwakeArt?.iconFor?.(id); return s ? `<img class="swwIcon" src="${s}" alt="">` : ''; };
      body.insertAdjacentHTML('beforeend', `<p>Your melee weapon is slot 3 (Q to cycle). Left click: attack (keep clicking or hold for a 3-hit combo). Right click: heavy attack.</p><div class="armList">${Object.entries(MELEE).map(([id, w]) => {
        const own = !!m.owned[id], lvl = m.level[id] || 1, eq = m.equipped === id, up = own && lvl < 3 ? { mat: w.up[lvl - 1], price: w.upPrice[lvl - 1] } : null;
        const c = w.combo, dps = Math.round(c.reduce((s, x) => s + x.dmg, 0) * mult(lvl));
        const btn = !own ? `<button data-act="sww_craft" data-id="${id}" ${w.craft && this.hasMaterials(w.craft) && this.save.gold >= w.price ? '' : 'disabled'}>CRAFT</button>`
          : `${eq ? '<b class="swwEq">EQUIPPED</b>' : `<button data-act="sww_equip" data-id="${id}">EQUIP</button>`}${up ? `<button data-act="sww_up" data-id="${id}" ${this.hasMaterials(up.mat) && this.save.gold >= up.price ? '' : 'disabled'}>UPGRADE TO LV ${lvl + 1}</button>` : ''}`;
        return `<div class="armNode ${own ? 'owned' : ''}"><div class="row">${icon(w.icon)}<b>${safeText(w.name)}</b><span class="badge">${own ? 'LV ' + lvl : 'NOT OWNED'}</span></div><p class="fine">${safeText(w.blurb)}</p>
          <small>Combo damage ${dps} · RMB ${w.heavy.name} ${Math.round(w.heavy.dmg * mult(lvl))} · reach ${c[0].reach} · stamina ${c[0].st}/swing</small>
          ${!own && w.craft ? `<p class="fine">${this.armoryRequirements(w.craft)} · ${w.price} scrip</p>` : up ? `<p class="fine">Next: ${this.armoryRequirements(up.mat)} · ${up.price} scrip</p>` : ''}<div class="fieldActions">${btn}</div></div>`; }).join('')}</div>`);
    }
    return out;
  };
  const act = P.doAction;
  P.doAction = function (a, n) {
    if (a === 'sww_craft' || a === 'sww_up' || a === 'sww_equip') {
      const id = n.dataset.id, w = MELEE[id], m = ml(this);
      if (!w || !this.smithyAllowed()) return;
      if (a === 'sww_craft' && !m.owned[id] && w.craft && this.save.gold >= w.price && this.consumeMaterials(w.craft)) { this.save.gold -= w.price; m.owned[id] = 1; m.level[id] = 1; m.equipped = id; this.notify('Crafted ' + w.name); }
      if (a === 'sww_up' && m.owned[id]) { const l = m.level[id] || 1, mat = w.up[l - 1], pr = w.upPrice[l - 1]; if (l < 3 && this.save.gold >= pr && this.consumeMaterials(mat)) { this.save.gold -= pr; m.level[id] = l + 1; this.notify(`${w.name} upgraded to Lv ${l + 1}`); } }
      if (a === 'sww_equip' && m.owned[id]) { m.equipped = id; this.notify('Equipped ' + w.name); }
      this.store(); return this.armoryPanel('melee');
    }
    if (a === 'armorytab' && n.dataset.tab === 'melee') return this.armoryPanel('melee');
    return act.apply(this, arguments);
  };

  const help = P.help;
  if (help) P.help = function () { const out = help.apply(this, arguments);
    document.querySelector('#panel .panelBody')?.insertAdjacentHTML('beforeend', '<p class="callout"><b>Weapons:</b> left click = attack (hold to keep firing / keep swinging the 3-hit melee combo). Right click = special: Bow Piercing Arrow, Arbalest Breaker Bolt, Wickcaster Flare Burst, Harpoon Gun Reel Shot (each with a short cooldown); melee heavy attack. Longwatch: hold right click to steady your aim; a fully steady shot is a Deadeye.</p>'); return out; };
  const css = document.createElement('style');
  css.textContent = `.swwSrc{color:#9ad4c0;font-size:11px}.smithMaterial .swwSrc{flex-basis:100%;display:block}.smithMaterial{flex-wrap:wrap}.swwIcon{width:28px;height:28px;object-fit:contain;margin-right:8px;vertical-align:middle}#swAlt,#swHudLeft .weaponReadout #swAlt{display:block!important;grid-column:2!important;font-size:10px!important;color:#9fd8ff!important;letter-spacing:.04em}#swAlt.cd{color:#7d8a92!important}.swwEq{color:#e8d18f;font-size:12px;letter-spacing:.1em;align-self:center}`;
  document.head.appendChild(css);
})();
