/* SALTWAKE movement feel (v0.31). Top speeds, sprint, stamina, weight, crouch, roll and collisions are unchanged.
 * - Acceleration: you reach full speed in about 0.1 s and stop in about 0.07 s, so starts and stops feel weighted
 *   but stay responsive; changing direction blends instead of snapping.
 * - Corner nudge: walking into the edge of a tree, rock or crate slides you around it instead of stopping dead.
 * - The dodge roll and knockback move exactly as before.
 * window.saltwakeMovement exposes settings for QA.
 */
(() => {
  const P = Game.prototype;
  const MV = window.saltwakeMovement = { enabled: true, accel: 20, decel: 20, nudge: true, vel: { x: 0, y: 0 }, stats: { nudges: 0 } };
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
    const full = Math.hypot(dx, dy); lastStep = full;
    return nudged(this, move, MV.vel.x * full, MV.vel.y * full);
  };
  function nudged(game, inner, dx, dy) {
    const p = game.player, x0 = p.x, y0 = p.y, out = inner.call(game, dx, dy);
    if (!MV.nudge || p.roll > 0) return out;
    const want = Math.hypot(dx, dy), got = Math.hypot(p.x - x0, p.y - y0);
    if (want > .5 && got < want * .35) {          // blocked: try sliding around the obstacle's edge
      const ux = dx / want, uy = dy / want;
      for (const side of [1, -1]) {
        const nx = -uy * side, ny = ux * side, step = Math.max(1.5, want * .8);
        if (game.walkable(p.x + nx * 14 + ux * 6, p.y + ny * 14 + uy * 6)) { inner.call(game, nx * step, ny * step); MV.stats.nudges++; break; }
      }
    }
    return out;
  }
  // a roll or a teleport resets the eased velocity
  const roll = P.roll; if (roll) P.roll = function () { const r = roll.apply(this, arguments); if (this.player.roll > 0) { MV.vel.x = MV.vel.y = 0; lastStep = 0; } return r; };
  const setArea = P.setArea; P.setArea = function () { MV.vel.x = MV.vel.y = 0; lastStep = 0; return setArea.apply(this, arguments); };
})();
