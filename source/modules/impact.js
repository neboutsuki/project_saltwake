/* SALTWAKE impact pass (v0.31): make shooting punchy (Zero Sievert-style simplicity) and monsters face left/right.
 * Facing: field monsters face left or right toward what they are doing (mirrored sprite, with hysteresis), and their
 *   breakable-part hitboxes are mirrored with them. Brineworn and humans already had directional art.
 * Firing: directional camera kick, muzzle smoke, spent wick-cell casings, punchy layered shot sounds, crosshair bloom
 *   (spread grows while you spam, recovers fast: tap-firing is accurate), brighter glowing tracers.
 * Hitting: white hit-flash + squash on the monster, per-bullet knockback, blood/ichor spray in the shot direction,
 *   ground splats that fade, hit marker on the crosshair, "thwack" hit sound, armour "ping".
 * Killing: red hit marker, longer hitstop + shake, burst, and a corpse that stays on the ground for a while.
 * All effects are code (particles, flashes, decals); monster art is the existing images, mirrored and tinted.
 * window.saltwakeImpact exposes state/stats for QA.
 */
(() => {
  const P = Game.prototype, TAU = Math.PI * 2;
  const IM = window.saltwakeImpact = { stats: { fired: 0, hits: 0, kills: 0, flips: 0, splats: 0, corpses: 0, sounds: 0 }, bloom: 0, decals: [], corpses: [], casings: [], marker: null, enabled: true };
  const WPN = () => window.saltwakeWeapons;
  const AUTH = IM.AUTH = { brineback: 1, gull: 1, grazer: 1, widow: 1 };        // authored sprite facing (+1 right): all field monster art faces right
  const PART_FIX = { widow: -1 };   // the widow's claw offset was authored on the wrong side of its (right-facing) art
  const BLOOD = { brineback: '#7c2a24', gull: '#8e2b2b', grazer: '#7a3328', widow: '#b8a35e', wrecker: '#7d2620', tidemaw: '#3f7d74' };
  const blood = e => BLOOD[e.type] || (/brineworn/.test(e.type) ? '#3f7d74' : '#7c2a24');
  const BLOOM = { bow: .22, arbalest: .55, wickcaster: .32, longwatch: .7, harpoon: .45 };
  const KICK = { bow: 5, arbalest: 11, wickcaster: 7, longwatch: 15, harpoon: 12 };
  const KNOCK = { bow: 5, arbalest: 12, wickcaster: 6, longwatch: 14, harpoon: 4 };
  const flippable = e => AUTH[e.type] !== undefined && e.type !== 'tidemaw';
  const now = () => performance.now();

  // ---- sound: a small layered synth on the same volume settings --------------------------------------------------
  let ac = null, noiseBuf = null;
  const vol = () => { const s = window.saltwakeAudio?.settings; if (!s || s.muted) return 0; return (s.master ?? 1) * (s.effects ?? 1); };
  function audio() {
    if (ac) return ac.state === 'running' ? ac : null;
    const A = window.AudioContext || window.webkitAudioContext; if (!A) return null;
    try { ac = new A(); const n = ac.sampleRate * .5; noiseBuf = ac.createBuffer(1, n, ac.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; } catch (e) { ac = null; }
    return null;
  }
  for (const k of ['pointerdown', 'keydown']) window.addEventListener(k, () => { audio(); if (ac && ac.state === 'suspended') ac.resume().catch(() => {}); }, { capture: true, passive: true });
  function tone(f0, f1, dur, gain, type = 'sine', delay = 0) {
    const c = audio(), v = vol() * gain; if (!c || v <= 0) return; const t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur); o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + .02);
  }
  function noise(freq, q, dur, gain, kind = 'bandpass', delay = 0) {
    const c = audio(), v = vol() * gain; if (!c || v <= 0 || !noiseBuf) return; const t = c.currentTime + delay, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = noiseBuf; f.type = kind; f.frequency.value = freq; f.Q.value = q; g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    s.connect(f).connect(g).connect(c.destination); s.start(t, Math.random() * .3); s.stop(t + dur + .02);
  }
  const SFX = IM.SFX = {
    shot(fam, big) { IM.stats.sounds++; const k = big ? 1.4 : 1;
      if (fam === 'bow') { tone(380, 160, .09, .16 * k, 'triangle'); noise(2600, 1.2, .05, .12 * k); return; }
      if (fam === 'wickcaster') { tone(170, 60, .1, .32 * k); noise(3800, .7, .16, .22 * k, 'highpass'); return; }
      const heavy = fam === 'longwatch' ? 1.35 : fam === 'harpoon' ? 1.15 : 1;
      tone(150 / heavy, 42, .14 * heavy, .42 * k); noise(1900, .9, .07, .3 * k * heavy); noise(500, .7, .18 * heavy, .14 * k, 'lowpass', .01);
    },
    hit(armor) { IM.stats.sounds++; if (armor) { tone(1500, 900, .07, .1, 'triangle'); noise(4000, 3, .03, .06); } else { noise(700, .8, .07, .22, 'lowpass'); tone(210, 80, .07, .18); } },
    kill() { IM.stats.sounds++; tone(95, 34, .28, .4); noise(420, .6, .2, .22, 'lowpass'); tone(700, 300, .06, .08, 'square', .02); },
  };

  // ---- facing: mirror art + part hitboxes ------------------------------------------------------------------------
  function sideOf(e) {
    const c = Math.cos(e.swDash ? e.swDash.a : e.facing || 0);
    if (e.swSide === undefined) e.swSide = c < 0 ? -1 : 1;
    else if (c < -.2 && e.swSide !== -1) { e.swSide = -1; IM.stats.flips++; }
    else if (c > .2 && e.swSide !== 1) { e.swSide = 1; IM.stats.flips++; }
    return e.swSide;
  }
  IM.sideOf = sideOf;
  IM.syncParts = e => syncParts(e);
  function syncParts(e) {
    if (!flippable(e) || !e.parts) return;
    const flip = sideOf(e) !== AUTH[e.type];
    for (const p of e.parts) { if (p.dx0 === undefined) p.dx0 = p.dx * (PART_FIX[e.type] || 1); p.dx = flip ? -p.dx0 : p.dx0; }
  }
  const updE = P.updateEnemies;
  P.updateEnemies = function () { const out = updE.apply(this, arguments); if (this.raid) for (const e of this.raid.enemies) if (!e.dead) syncParts(e); return out; };

  if (typeof veinEnemyArt === 'function') {
    const art = veinEnemyArt;
    const draw = (G, e, rest) => art(G, e, ...rest);
    veinEnemyArt = function (G, e, ...rest) {
      if (!IM.enabled) return art(G, e, ...rest);
      const flip = flippable(e) && sideOf(e) !== AUTH[e.type];
      const fl = e.swFlash ? Math.max(0, (e.swFlash - now()) / 90) : 0, sq = e.swSquash ? Math.max(0, (e.swSquash - now()) / 140) : 0;
      const face = e.facing;
      g.save();
      if (flip) { g.translate(2 * e.x, 0); g.scale(-1, 1); e.facing = Math.PI - (face || 0); }
      if (sq > 0) { const fy = e.y + 18; g.translate(e.x, fy); g.scale(1 + .14 * sq, 1 - .12 * sq); g.translate(-e.x, -fy); }
      if (e.apexScale && e.apexScale !== 1) { const fy = e.y + 18, k = e.apexScale; g.translate(e.x, fy); g.scale(k, k); g.translate(-e.x, -fy); }
      if (e.apexTint) g.filter = e.apexTint;
      let out;
      try {
        out = draw(G, e, rest);
        if (out && fl > 0) { const sh = G.draw25Shadow; G.draw25Shadow = () => {}; g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = .9 * fl; g.filter = 'brightness(1.9) saturate(.3)'; try { draw(G, e, rest); } finally { g.restore(); G.draw25Shadow = sh; } }
      } finally { e.facing = face; g.restore(); }
      return out;
    };
  }

  // ---- ground layer: splats + corpses (under the scene) ----------------------------------------------------------
  const scene = P.drawCoastScene;
  P.drawCoastScene = function () {
    if (this.raid && IM.enabled) {
      g.save();
      for (const d of IM.decals) { g.globalAlpha = Math.min(.75, d.life / 6) * .75; g.fillStyle = d.color; for (const b of d.blobs) { g.beginPath(); g.ellipse(d.x + b[0], d.y + b[1], b[2], b[2] * .6, 0, 0, TAU); g.fill(); } }
      g.globalAlpha = 1;
      for (const c of IM.corpses) {
        const a = Math.min(1, c.life / 2); if (a <= 0) continue;
        g.save(); g.globalAlpha = a; g.filter = 'brightness(.55) saturate(.7)';
        const fy = c.e.y + 18; g.translate(c.e.x, fy); g.scale(1.05, .62); g.rotate(c.tilt); g.translate(-c.e.x, -fy);
        try { veinEnemyArt(this, c.e); } catch (x) { }
        g.restore();
      }
      for (const s of IM.casings) { g.globalAlpha = Math.min(1, s.life); g.fillStyle = '#c9a25a'; g.save(); g.translate(s.x, s.y); g.rotate(s.r); g.fillRect(-3, -1.5, 6, 3); g.restore(); }
      g.restore();
    }
    return scene.apply(this, arguments);
  };

  // ---- hits ------------------------------------------------------------------------------------------------------
  function spray(G, x, y, ang, n, color, speed = 1) {
    const r = G.raid; if (!r?.particles) return;
    for (let i = 0; i < n; i++) { const a = ang + (Math.random() - .5) * .9, v = (90 + Math.random() * 220) * speed; r.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 20, t: .2 + Math.random() * .3, color }); }
  }
  function splat(x, y, ang, color, size = 1) {
    const blobs = [], n = 3 + Math.floor(Math.random() * 3 * size);
    for (let i = 0; i < n; i++) { const d = Math.random() * 18 * size; blobs.push([Math.cos(ang) * d + (Math.random() - .5) * 8, Math.sin(ang) * d * .6 + (Math.random() - .5) * 6, (2 + Math.random() * 4.5) * size]); }
    IM.decals.push({ x, y: y + 14, blobs, color, life: 24 }); if (IM.decals.length > 140) IM.decals.shift(); IM.stats.splats++;
  }
  const hm = P.hitMonster;
  P.hitMonster = function (e, damage, meta = {}, x, y) {
    const wasDead = e.dead, hp = e.hp, out = hm.apply(this, arguments);
    if (!IM.enabled || !this.raid || meta.enemy || wasDead) return out;
    const dealt = Math.max(0, hp - e.hp), t = now(), fam = meta.fam || (meta.weaponId && (typeof ARMORY !== 'undefined') && ARMORY.weapons.find(n => n.id === meta.weaponId)?.family);
    const ang = meta.vx != null ? Math.atan2(meta.vy, meta.vx) : Math.atan2(e.y - this.player.y, e.x - this.player.x);
    e.swFlash = t + 90; e.swSquash = t + 140; IM.stats.hits++;
    const armor = dealt < damage * .45;
    spray(this, x ?? e.x, (y ?? e.y) - 8, ang, armor ? 4 : 9, armor ? '#e8d9b0' : blood(e));
    if (!armor) splat(e.x, e.y, ang, blood(e), dealt > 60 ? 1.4 : 1);
    if (meta.vx != null && !e.dead && e.type !== 'tidemaw' && !e.boss) {
      const k = (KNOCK[fam] || 6) * (meta.pierce != null ? 1.2 : 1), st = 4;
      for (let i = 0; i < st; i++) { const nx = e.x + Math.cos(ang) * k / st, ny = e.y + Math.sin(ang) * k / st; if (this.walkable(nx, ny)) { e.x = nx; e.y = ny; } else break; }
    }
    IM.marker = { t: .16, max: .16, kill: !!e.dead };
    if (e.dead) {
      IM.stats.kills++; SFX.kill();
      const W = WPN(); if (W) W.stop = Math.max(W.stop || 0, .09);
      window.saltwakeCamera?.shake?.(.28);
      spray(this, e.x, e.y - 10, ang, 22, blood(e), 1.3); splat(e.x, e.y, ang, blood(e), 2);
      if (e.type !== 'tidemaw') {
        const clone = { ...e, dead: false, instinctAttack: null, swTele: null, staggerTime: 0, swFlash: 0, swSquash: 0, parts: (e.parts || []).map(p => ({ ...p })) };
        IM.corpses.push({ e: clone, life: 14, tilt: (sideOf(e) > 0 ? 1 : -1) * (.12 + Math.random() * .1) }); if (IM.corpses.length > 14) IM.corpses.shift(); IM.stats.corpses++;
      }
    } else SFX.hit(armor);
    return out;
  };

  // ---- firing: detect new player shots each frame --------------------------------------------------------------
  const seen = new WeakSet();
  function scanShots(G) {
    const r = G.raid; if (!r) return; const p = G.player; let fired = null, n = 0;
    for (const b of r.bullets) { if (seen.has(b)) continue; seen.add(b); if (b.enemy || Math.hypot(b.x - p.x, b.y - p.y) > 70) continue; fired = b; n++; }
    if (!fired) return;
    IM.stats.fired++;
    const fam = fired.fam || (typeof ARMORY !== 'undefined' && ARMORY.weapons.find(x => x.id === fired.weaponId)?.family) || 'arbalest';
    const big = (fired.pierce != null && fired.pierce > 0) || n > 2 || fired.reel;
    const a = Math.atan2(fired.vy, fired.vx), k = (KICK[fam] || 8) * (big ? 1.6 : 1);
    const st = window.saltwakeCamera?.state; if (st && st.x != null) { st.x -= Math.cos(a) * k; st.y -= Math.sin(a) * k; }
    IM.bloom = Math.min(1.4, IM.bloom + (BLOOM[fam] || .35) * (big ? .6 : 1));
    const mx = p.x + Math.cos(a) * 30, my = p.y - 8 + Math.sin(a) * 30;
    if (r.particles) for (let i = 0; i < 5; i++) r.particles.push({ x: mx, y: my, vx: Math.cos(a) * 30 + (Math.random() - .5) * 30, vy: Math.sin(a) * 30 - 25 - Math.random() * 20, t: .4 + Math.random() * .3, color: 'rgba(200,196,186,.55)' });
    if (fam === 'wickcaster' || fam === 'harpoon') { const s = Math.cos(a) >= 0 ? -1 : 1; IM.casings.push({ x: p.x + s * 8, y: p.y + 6 + Math.random() * 8, r: Math.random() * 3, life: 6 }); if (IM.casings.length > 40) IM.casings.shift(); }
    SFX.shot(fam, big);
  }
  IM.scanShots = scanShots;

  // ---- per frame ---------------------------------------------------------------------------------------------------
  const upd = P.update;
  P.update = function (dt) {
    const out = upd.apply(this, arguments);
    if (!this.raid) { if (IM.decals.length || IM.corpses.length) { IM.decals.length = 0; IM.corpses.length = 0; IM.casings.length = 0; } IM.bloom = 0; return out; }
    if (this.isPaused()) return out;
    scanShots(this);
    IM.bloom = Math.max(0, IM.bloom - dt * 1.6);
    for (const L of [IM.decals, IM.corpses, IM.casings]) { for (const d of L) d.life -= dt; for (let i = L.length - 1; i >= 0; i--) if (L[i].life <= 0) L.splice(i, 1); }
    if (IM.marker) { IM.marker.t -= dt; if (IM.marker.t <= 0) IM.marker = null; }
    return out;
  };
  // Spam-firing blooms the spread; it recovers within about half a second.
  const env = P.environmentSpread;
  P.environmentSpread = function () { return (env ? env.apply(this, arguments) : 1) * (1 + IM.bloom * .9); };

  // ---- overlay: tracers, hit marker ------------------------------------------------------------------------------
  const render = P.render;
  P.render = function (t) {
    const out = render.apply(this, arguments);
    if (!this.raid || this.mode !== 'play' || this.panel || !IM.enabled) return out;
    const z = this.camera.zoom, cx = this.camera.x, cy = this.camera.y;
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
    for (const b of this.raid.bullets) {
      if (b.enemy) continue; const X = (b.x - cx) * z, Y = (b.y - cy) * z; if (X < -60 || Y < -60 || X > VW + 60 || Y > VH + 60) continue;
      const sp = Math.hypot(b.vx, b.vy) || 1, L = Math.min(70, sp * .045) * z;
      g.strokeStyle = 'rgba(255,200,120,.35)'; g.lineWidth = 5 * z; g.beginPath(); g.moveTo(X - b.vx / sp * L, Y - b.vy / sp * L); g.lineTo(X, Y); g.stroke();
      g.strokeStyle = 'rgba(255,245,215,.95)'; g.lineWidth = 1.8 * z; g.beginPath(); g.moveTo(X - b.vx / sp * L * .6, Y - b.vy / sp * L * .6); g.lineTo(X, Y); g.stroke();
    }
    g.globalCompositeOperation = 'source-over';
    const m = IM.marker;
    if (m) {
      const k = m.t / m.max, X = this.mouse.x, Y = this.mouse.y, r0 = 6 + (1 - k) * 4, r1 = r0 + 7;
      g.strokeStyle = m.kill ? `rgba(255,70,60,${k})` : `rgba(255,255,255,${k})`; g.lineWidth = m.kill ? 3 : 2;
      for (let i = 0; i < 4; i++) { const a = Math.PI / 4 + i * Math.PI / 2; g.beginPath(); g.moveTo(X + Math.cos(a) * r0, Y + Math.sin(a) * r0); g.lineTo(X + Math.cos(a) * r1, Y + Math.sin(a) * r1); g.stroke(); }
    }
    g.restore();
    return out;
  };
})();
