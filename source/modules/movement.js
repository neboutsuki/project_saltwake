/* SALTWAKE movement feel (v0.31). Top speeds, sprint, stamina, weight, crouch, roll and collisions are unchanged.
 * - Acceleration: you reach full speed in about 0.1 s and stop in about 0.07 s, so starts and stops feel weighted
 *   but stay responsive; changing direction blends instead of snapping.
 * - Slide: walking into a tree trunk, rock or crate slides you around it (tangent slide); wall corners nudge you past.
 * - Sprint builds up over 0.35 s with a forward lean and dust; crouching eases into a lower, wider pose.
 * - The dodge roll and knockback move exactly as before.
 * window.saltwakeMovement exposes settings for QA.
 */
(() => {
  const P = Game.prototype;
  const MV = window.saltwakeMovement = { enabled: true, accel: 20, decel: 20, nudge: true, vel: { x: 0, y: 0 }, stats: { nudges: 0 }, sprinting: false, sprintBlend: 0, crouchBlend: 0, dust: [] };
  let stepScale = null, inUpdate = false, lastStep = 0;

  const update = P.update;
  P.update = function (dt) {
    if (!MV.enabled || this.isPaused?.() || this.mode !== 'play') return update.apply(this, arguments);
    const p = this.player, k = this.keys || {};
    let ix = Number(!!k.KeyD) - Number(!!k.KeyA), iy = Number(!!k.KeyS) - Number(!!k.KeyW);
    const il = Math.hypot(ix, iy); if (il) { ix /= il; iy /= il; }
    const v = MV.vel, rate = il ? MV.accel : MV.decel, f = 1 - Math.exp(-rate * Math.max(0, dt || 0));
    v.x += (ix - v.x) * f; v.y += (iy - v.y) * f;
    if (Math.hypot(v.x, v.y) < .02 && !il) v.x = v.y = 0;
    MV.sprinting = !!il && !!(k.ShiftLeft || k.ShiftRight) && p.st > 0 && !this.crouching;
    MV.sprintBlend = MV.sprinting ? Math.min(1, MV.sprintBlend + (dt || 0) / .35) : Math.max(0, MV.sprintBlend - (dt || 0) / .2);
    MV.crouchBlend += ((this.crouching ? 1 : 0) - MV.crouchBlend) * (1 - Math.exp(-14 * (dt || 0)));
    if (MV.sprinting && MV.sprintBlend > .5 && (MV.dustT = (MV.dustT || 0) - (dt || 0)) <= 0) { MV.dustT = .11; MV.dust.push({ x: p.x - v.x * 8 + (Math.random() - .5) * 8, y: p.y + 16, t: 0 }); }
    for (const d of MV.dust) d.t += dt || 0; MV.dust = MV.dust.filter(d => d.t < .5);
    stepScale = il ? { ix, iy } : null; inUpdate = true;
    let out;
    try { out = update.apply(this, arguments); } finally { inUpdate = false; stepScale = null; }
    // glide to a stop after release (the engine only moves while a key is held)
    if (!il && p.roll <= 0 && (v.x || v.y) && lastStep > 0) moveRaw(this, v.x * lastStep, v.y * lastStep);
    if (!il) lastStep *= Math.exp(-MV.decel * (dt || 0));
    return out;
  };
  function moveRaw(game, dx, dy) { MV._raw = true; try { game.move(dx, dy); } finally { MV._raw = false; } }

  const move = P.move;
  P.move = function (dx, dy) {
    const p = this.player;
    if (!MV.enabled || MV._raw || !inUpdate || !stepScale || p.roll > 0) return nudged(this, move, dx, dy);
    // the engine asks for a full-speed step along the input; scale it by the eased velocity
    const full = Math.hypot(dx, dy), m = this.mechanics();
    let k = 1;
    if (MV.sprinting) k = (m.playerSpeed + (m.sprintSpeed - m.playerSpeed) * MV.sprintBlend) / m.sprintSpeed;   // sprint builds up
    lastStep = full * k;
    return nudged(this, move, MV.vel.x * full * k, MV.vel.y * full * k);
  };
  // Collision slide: when blocked by a round obstacle (tree trunk, rock, crate), move along its tangent so you
  // slip around it; head-on hits pick the side you are already offset toward. Walls and edges slide per axis as before.
  const RAD = { tree: 13, stone: 10, crate: 12 };
  function nearestCircle(game, x, y, reach) {
    let best = null, bd = Infinity;
    for (const o of game.map().decor || []) {
      const r = RAD[o.type]; if (!r) continue;
      const cx = (o.x + o.w * .45) * 32, cy = (o.y + o.h * .55) * 32, d = Math.hypot(x - cx, y - cy) - r;
      if (d < reach && d < bd) { bd = d; best = { cx, cy, r }; }
    }
    return best;
  }
  function nudged(game, inner, dx, dy) {
    const p = game.player, x0 = p.x, y0 = p.y, out = inner.call(game, dx, dy);
    if (!MV.nudge || p.roll > 0) return out;
    const want = Math.hypot(dx, dy), got = Math.hypot(p.x - x0, p.y - y0);
    if (want < .3 || got > want * .8) return out;
    const left = want - got, ux = dx / want, uy = dy / want;
    const c = nearestCircle(game, p.x + ux * 8, p.y + uy * 8, 18);
    if (c) {
      let nx = p.x - c.cx, ny = p.y - c.cy; const nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;
      let tx = -ny, ty = nx; if (tx * ux + ty * uy < 0) { tx = -tx; ty = -ty; }
      if (Math.abs(tx * ux + ty * uy) < .35) {      // near head-on: keep one side per obstacle until past it
        const st = MV.slide, now = performance.now();
        const open = sd => { let ok = 0; for (const d of [14, 26, 38]) if (game.walkable(p.x - ny * sd * d + ux * 6, p.y + nx * sd * d + uy * 6)) ok++; return ok; };
        let side;
        if (st && st.cx === c.cx && st.cy === c.cy && now - st.t < 600) { side = st.side; if (++st.n > 20 && open(side) < 2) { side = -side; st.n = 0; } }   // stuck: try the other way
        else { const pref = (ux * ny - uy * nx) >= 0 ? 1 : -1, a = open(pref), b = open(-pref); side = b > a ? -pref : pref; }
        MV.slide = { cx: c.cx, cy: c.cy, side, t: now, n: st && st.cx === c.cx && st.side === side ? st.n : 0 };
        tx = -ny * side; ty = nx * side;
      }
      const k = Math.max(.85, Math.abs(tx * ux + ty * uy));
      MV._raw = true; try { inner.call(game, tx * left * k, ty * left * k); } finally { MV._raw = false; }
      MV.stats.nudges++;
    } else {
      for (const side of [1, -1]) {                // corner of a wall: small sideways step
        const sx = -uy * side, sy = ux * side;
        if (game.walkable(p.x + sx * 12 + ux * 6, p.y + sy * 12 + uy * 6)) { MV._raw = true; try { inner.call(game, sx * left * .7, sy * left * .7); } finally { MV._raw = false; } MV.stats.nudges++; break; }
      }
    }
    return out;
  }
  // Pose: crouch lowers and widens the sprite; sprinting leans into the run; dust kicks up behind a sprint.
  for (const name of ['coastPlayer', 'draw25Player']) {
    const f = P[name]; if (!f) continue;
    P[name] = function () {
      if (!MV.enabled) return f.apply(this, arguments);
      const p = this.player, foot = p.y + 4;
      for (const d of MV.dust) { const u = d.t / .5; g.save(); g.globalAlpha = (1 - u) * .35; g.fillStyle = '#9d958a'; g.beginPath(); g.ellipse(d.x, d.y - u * 5, 4 + u * 8, 2 + u * 3, 0, 0, Math.PI * 2); g.fill(); g.restore(); }
      const c = MV.crouchBlend, lean = MV.vel.x * .09 * MV.sprintBlend;
      if (c < .02 && Math.abs(lean) < .005) return f.apply(this, arguments);
      g.save(); g.translate(p.x, foot); g.rotate(lean); g.scale(1 + c * .08, 1 - c * .16); g.translate(-p.x, -foot);
      try { return f.apply(this, arguments); } finally { g.restore(); }
    };
  }
  // a roll or a teleport resets the eased velocity
  const roll = P.roll; if (roll) P.roll = function () { const r = roll.apply(this, arguments); if (this.player.roll > 0) { MV.vel.x = MV.vel.y = 0; lastStep = 0; } return r; };
  const setArea = P.setArea; P.setArea = function () { MV.vel.x = MV.vel.y = 0; lastStep = 0; return setArea.apply(this, arguments); };
})();
