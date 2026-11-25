/* SALTWAKE dodge (v0.31). Stamina cost, invulnerability time and roll distance are kept.
 * - Motion curve: a fast burst that eases out (same total distance as the old constant-speed roll).
 * - Input buffer: pressing dodge up to 0.2 s before it is ready (cooldown, mid-roll) still dodges when it becomes ready.
 * - Cooldown 0.75 s (was 1.05 s).
 * - Perfect dodge: an attack that lands during the roll's invulnerability triggers a short slow-motion, a flash ring,
 *   "DODGED" and +12 stamina (once per roll).
 * - Feedback: afterimages along the roll, dust at start and end, and the stamina bar shakes when you lack stamina.
 * window.saltwakeDodge exposes settings and counters for QA.
 */
(() => {
  const P = Game.prototype;
  const D = window.saltwakeDodge = { enabled: true, buffer: .2, cooldown: .75, refund: 12, stats: { rolls: 0, perfect: 0, buffered: 0, denied: 0 }, ghosts: [], puffs: [], rings: [] };
  let queued = 0, rollDur = .31, perfectThisRoll = false;
  // speed multiplier over roll progress u (0..1); integral over [0,1] == 1 (keeps the distance)
  const curve = u => 1.75 * (1 - u) * (1 - u) + .25 + .25 * (1 - u);   // normalised below so the distance is unchanged
  const NORM = 1 / (1.75 / 3 + .25 + .125);

  const roll = P.roll;
  P.roll = function () {
    const p = this.player, m = this.mechanics(), before = p.roll;
    if (!D.enabled) return roll.apply(this, arguments);
    if (!this.isPaused() && (p.roll > 0 || p.rollCD > 0)) { queued = D.buffer; return; }
    if (!this.isPaused() && p.st < m.rollStamina) { D.stats.denied++; deny(); return; }
    const out = roll.apply(this, arguments);
    if (p.roll > 0 && before <= 0) {
      rollDur = m.rollDuration; perfectThisRoll = false; queued = 0; p.rollCD = Math.min(p.rollCD, D.cooldown); D.stats.rolls++;
      D.puffs.push({ x: p.x, y: p.y + 14, t: 0 });
    }
    return out;
  };
  function deny() { const el = document.getElementById('swHudLeft') || document.querySelector('.vitals'); if (!el) return; el.classList.remove('sw-nostam'); void el.offsetWidth; el.classList.add('sw-nostam'); }

  const update = P.update;
  P.update = function (dt) {
    const p = this.player, wasRolling = p.roll > 0;
    if (D.enabled && queued > 0 && !this.isPaused?.()) { queued -= dt || 0; if (p.roll <= 0 && p.rollCD <= 0) { D.stats.buffered++; queued = 0; this.roll(); } }
    const out = update.apply(this, arguments);
    if (D.enabled && p.roll > 0 && this.mode === 'play') { if (!D.ghosts.length || Math.hypot(p.x - D.ghosts[D.ghosts.length - 1].x, p.y - D.ghosts[D.ghosts.length - 1].y) > 14) D.ghosts.push({ x: p.x, y: p.y, a: p.angle, t: 0 }); }
    if (wasRolling && p.roll <= 0) D.puffs.push({ x: p.x, y: p.y + 14, t: 0 });
    const k = dt || 0;
    for (const L of [D.ghosts, D.puffs, D.rings]) { for (const o of L) o.t += k; }
    D.ghosts = D.ghosts.filter(o => o.t < .28); D.puffs = D.puffs.filter(o => o.t < .45); D.rings = D.rings.filter(o => o.t < .45);
    return out;
  };
  // eased roll speed: the engine moves rollX * rollSpeed * dt while p.roll > 0
  const move = P.move;
  P.move = function (dx, dy) {
    const p = this.player;
    if (D.enabled && p.roll > 0) {
      const u = 1 - p.roll / Math.max(.01, rollDur), k = curve(Math.max(0, Math.min(1, u))) * NORM;
      return move.call(this, dx * k, dy * k);
    }
    return move.apply(this, arguments);
  };
  // perfect dodge
  const hurt = P.hurtPlayer;
  P.hurtPlayer = function (dmg) {
    const p = this.player;
    if (D.enabled && p.roll > 0 && p.iframes > 0 && !perfectThisRoll && dmg > 0) {
      perfectThisRoll = true; D.stats.perfect++;
      p.st = Math.min(100, p.st + D.refund);
      const S = window.saltwakeSystems; if (S) S.hitStop = Math.max(S.hitStop || 0, .14);
      D.rings.push({ x: p.x, y: p.y - 12, t: 0 });
      this.notify?.('DODGED', .8);
    }
    return hurt.apply(this, arguments);
  };

  // drawing: ghosts under the player, dust and rings around it
  function ghosts(game) {
    const C = window.saltwakeCast;
    for (const o of D.ghosts) {
      const a = (1 - o.t / .28) * .38; g.save(); g.globalAlpha = a; g.filter = 'brightness(1.6) saturate(.3)';
      if (!(C && C.enabled && C.draw(g, C.player, 'walk', C.dirOfAngle(o.a || 0), 0, o.x, o.y + 4, 64 * (window.saltwakeScale?.CHAR || 1.4)))) {
        g.fillStyle = 'rgba(200,220,235,.6)'; g.beginPath(); g.ellipse(o.x, o.y - 14, 10, 22, 0, 0, Math.PI * 2); g.fill();
      }
      g.restore();
    }
    for (const o of D.puffs) { const u = o.t / .45; g.save(); g.globalAlpha = (1 - u) * .45; g.fillStyle = '#a49c8e';
      for (const s of [-1, 0, 1]) { g.beginPath(); g.ellipse(o.x + s * (8 + u * 16), o.y - u * 6, 5 + u * 9, 3 + u * 4, 0, 0, Math.PI * 2); g.fill(); } g.restore(); }
    for (const o of D.rings) { const u = o.t / .45; g.save(); g.globalAlpha = (1 - u) * .9; g.strokeStyle = '#eaf6ff'; g.lineWidth = 3 * (1 - u) + 1;
      g.beginPath(); g.ellipse(o.x, o.y, 18 + u * 46, 8 + u * 20, 0, 0, Math.PI * 2); g.stroke(); g.restore(); }
  }
  for (const name of ['coastPlayer', 'draw25Player']) {
    const f = P[name]; if (!f) continue;
    P[name] = function () {
      if (!D.enabled) return f.apply(this, arguments);
      ghosts(this); D.stats.drawn = (D.stats.drawn || 0) + D.ghosts.length;
      const p = this.player; if (p.roll <= 0) return f.apply(this, arguments);
      // lean into the roll and dip a little
      const u = 1 - p.roll / Math.max(.01, rollDur), e = Math.sin(Math.min(1, u) * Math.PI), lean = (p.rollX || 0) * .45 * e;
      g.save(); g.translate(p.x, p.y + 4); g.rotate(lean); g.translate(-p.x, -(p.y + 4) - e * 3);
      try { return f.apply(this, arguments); } finally { g.restore(); }
    };
  }
  const css = document.createElement('style');
  css.textContent = `.sw-nostam{animation:swNoStam .38s ease}@keyframes swNoStam{0%,100%{transform:translateX(0)}20%{transform:translateX(-5px)}40%{transform:translateX(5px)}60%{transform:translateX(-3px)}80%{transform:translateX(2px)}}
  .sw-nostam [class*=stamina],.sw-nostam #staminaBar{filter:brightness(1.6) hue-rotate(-40deg)}`;
  document.head.appendChild(css);
})();
