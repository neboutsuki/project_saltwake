/* SALTWAKE character pop (v0.31): makes Ren read clearly on any ground, day or night.
 * - Dark 1-pixel outline around the sprite (scaled to screen pixels).
 * - Rim light on the side facing the light: warm by day and at sunset, pale blue at night, from the lantern side when
 *   it is lit and dark.
 * - A crisp contact shadow at the feet so Ren sits on the ground.
 * - The background is muted a little (ground textures and scenery sprites, see tilemap.js / hires.js); characters
 *   keep full color.
 * Rendering only. window.saltwakePop exposes settings for QA.
 */
(() => {
  const P = Game.prototype;
  const POP = window.saltwakePop = { enabled: true, outline: 'rgba(14,11,10,.95)', stats: { drawn: 0 } };
  function rim(game) {
    const DN = window.saltwakeDayNight, dark = DN?.active ? DN.level : 0, p = game.player;
    if (dark > .5 && game.lanternOn !== false) { const a = p.angle || 0; return { dx: Math.cos(a), dy: Math.sin(a) * .6 - .3, col: 'rgba(255,214,150,.9)' }; }
    if (dark > .5) return { dx: -.7, dy: -.7, col: 'rgba(150,180,230,.7)' };
    const amb = DN?.ambient || [255, 250, 240];
    return { dx: -.75, dy: -.65, col: `rgba(${Math.min(255, amb[0] + 20)},${Math.min(255, amb[1] + 10)},${amb[2]},.85)` };
  }
  for (const name of ['coastPlayer', 'draw25Player']) {
    const f = P[name]; if (!f) continue;
    P[name] = function () {
      if (!POP.enabled || this.mode !== 'play') return f.apply(this, arguments);
      const p = this.player, H = window.saltwakeHiRes, px = Math.max(1, Math.round((H?.scale || 1) * (this.camera?.zoom || 1) * .75));
      // soft shadow + crisp contact shadow at the feet
      g.save(); g.fillStyle = 'rgba(8,8,10,.22)'; g.beginPath(); g.ellipse(p.x + 3, p.y + 6, 17, 6, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(8,8,10,.38)'; g.beginPath(); g.ellipse(p.x, p.y + 5, 10, 3.2, 0, 0, Math.PI * 2); g.fill(); g.restore();
      const r = rim(this), o = POP.outline;
      g.save();
      g.filter = `drop-shadow(${px}px 0 0 ${o}) drop-shadow(-${px}px 0 0 ${o}) drop-shadow(0 ${px}px 0 ${o}) drop-shadow(0 -${px}px 0 ${o}) drop-shadow(${(r.dx * px * 1.4).toFixed(1)}px ${(r.dy * px * 1.4).toFixed(1)}px 0 ${r.col})`;
      const sh = this.draw25Shadow; this.draw25Shadow = () => { };   // its own soft shadow is drawn below instead (unfiltered)
      try { POP.stats.drawn++; return f.apply(this, arguments); } finally { g.restore(); this.draw25Shadow = sh; }
    };
  }
  // the older faint white halo from scale.js is replaced by this
  if (window.saltwakeScale) window.saltwakeScale.rim = false;
})();
