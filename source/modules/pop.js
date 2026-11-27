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
  const POP = window.saltwakePop = { enabled: true, outline: 'rgba(14,11,10,.95)', castShadow: true, lift: { contrast: 1.12, saturation: 1.15, brightness: 1.12 }, stats: { drawn: 0 } };
  function rim(game) {
    const DN = window.saltwakeDayNight, dark = DN?.active ? DN.level : 0, p = game.player;
    if (dark > .5 && game.lanternOn !== false) { const a = p.angle || 0; return { dx: Math.cos(a), dy: Math.sin(a) * .6 - .3, col: 'rgba(255,214,150,.9)' }; }
    if (dark > .5) return { dx: -.7, dy: -.7, col: 'rgba(150,180,230,.7)' };
    const amb = DN?.ambient || [255, 250, 240];
    return { dx: -.75, dy: -.65, col: `rgba(${Math.min(255, amb[0] + 20)},${Math.min(255, amb[1] + 10)},${amb[2]},.85)` };
  }
  // cached outlined frames: Map<image, Map<rect|rim, canvas>>
  const OUT = new Map(); let outCount = 0;
  const q = v => Math.round(v * 2) / 2;
  const rimKey = r => q(r.dx) + ',' + q(r.dy) + ',' + r.col.replace(/\d+(\.\d+)?/g, m => String(Math.round(+m / 24) * 24));
  function silhouette(src, sx, sy, sw, sh, color) {
    const c = document.createElement('canvas'); c.width = sw; c.height = sh; const x = c.getContext('2d');
    x.drawImage(src, sx, sy, sw, sh, 0, 0, sw, sh); x.globalCompositeOperation = 'source-in'; x.fillStyle = color; x.fillRect(0, 0, sw, sh); return c;
  }
  function outlined(src, sx, sy, sw, sh, r, rk) {
    rk = 'lift';
    if (!sw || !sh || sw > 512 || sh > 512) return null;
    let m = OUT.get(src); if (!m) { m = new Map(); OUT.set(src, m); }
    const key = sx + ',' + sy + ',' + sw + ',' + sh + '|' + rk; let c = m.get(key); if (c) return c;
    if (outCount > 600) { OUT.clear(); outCount = 0; m = new Map(); OUT.set(src, m); }
    // No outline (v0.31): the frame is "lifted" instead - a little more contrast, saturation and brightness than the
    // muted ground - and a dark silhouette is kept for the cast shadow.
    c = document.createElement('canvas'); c.width = sw; c.height = sh; c.pad = 0;
    const x = c.getContext('2d', { willReadFrequently: true }); x.imageSmoothingEnabled = false; x.drawImage(src, sx, sy, sw, sh, 0, 0, sw, sh);
    try { const id = x.getImageData(0, 0, sw, sh), d = id.data, C = POP.lift.contrast, S = POP.lift.saturation, B = POP.lift.brightness;
      for (let i = 0; i < d.length; i += 4) { if (!d[i + 3]) continue; let rr = d[i], gg = d[i + 1], bb = d[i + 2]; const L = rr * .3 + gg * .59 + bb * .11;
        rr = L + (rr - L) * S; gg = L + (gg - L) * S; bb = L + (bb - L) * S;
        d[i] = Math.max(0, Math.min(255, ((rr - 128) * C + 128) * B)); d[i + 1] = Math.max(0, Math.min(255, ((gg - 128) * C + 128) * B)); d[i + 2] = Math.max(0, Math.min(255, ((bb - 128) * C + 128) * B)); }
      x.putImageData(id, 0, 0); } catch (e) { }
    c.sil = silhouette(src, sx, sy, sw, sh, POP.shadowColor || 'rgb(8,8,12)');
    m.set(key, c); outCount++; POP.stats.cached = (POP.stats.cached || 0) + 1; return c;
  }
  for (const name of ['coastPlayer', 'draw25Player']) {
    const f = P[name]; if (!f) continue;
    P[name] = function () {
      if (!POP.enabled || this.mode !== 'play') return f.apply(this, arguments);
      const p = this.player, H = window.saltwakeHiRes, px = Math.max(1, Math.round((H?.scale || 1) * (this.camera?.zoom || 1) * .75));
      // soft shadow + crisp contact shadow at the feet
      if (!POP.noShadow) { g.save(); g.fillStyle = 'rgba(8,8,10,.22)'; g.beginPath(); g.ellipse(p.x + 3, p.y + 6, 17, 6, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(8,8,10,.38)'; g.beginPath(); g.ellipse(p.x, p.y + 5, 10, 3.2, 0, 0, Math.PI * 2); g.fill(); g.restore(); }
      // Outline + rim light without canvas filters: every sprite image drawn for the player is swapped for a cached copy
      // that already has a 1-source-pixel dark outline and a lit rim baked in. (The old 5x drop-shadow filter re-rendered
      // a large layer on every draw call and was by far the most expensive thing in a frame.)
      const L = POP.lastShadow;
      if (POP.castShadow && L && !POP.noShadow) { const night = !!this.climateState?.().night;
        g.save(); g.globalAlpha *= POP.shadowAlpha ?? (night ? .18 : .34); g.translate(p.x, p.y + 4); g.transform(1, 0, POP.shadowSkew ?? -.62, POP.shadowFlat ?? -.36, 0, 0);
        g.drawImage(L.sil, 0, 0, L.sil.width, L.sil.height, -L.dw / 2, -L.dh * (60 / 64), L.dw, L.dh); g.restore(); POP.stats.shadows = (POP.stats.shadows || 0) + 1; }
      const r = rim(this), sh = this.draw25Shadow; this.draw25Shadow = () => { };
      const draw = g.drawImage, rk = rimKey(r); let shadowDone = false;
      g.drawImage = function (src) {
        if (!(src instanceof HTMLImageElement || src instanceof HTMLCanvasElement) || (arguments.length !== 9 && arguments.length !== 5)) return draw.apply(g, arguments);
        let sx = 0, sy = 0, sw = src.naturalWidth || src.width, shh = src.naturalHeight || src.height, dx, dy, dw, dh;
        if (arguments.length === 9) [, sx, sy, sw, shh, dx, dy, dw, dh] = arguments; else [, dx, dy, dw, dh] = arguments;
        const c = outlined(src, sx, sy, sw, shh, r, rk); if (!c) return draw.apply(g, arguments);
        const kx = dw / sw, ky = dh / shh;
        if (c.sil && Math.abs(dh) >= 40 && !shadowDone) { shadowDone = true; POP.lastShadow = { sil: c.sil, dw, dh }; }   // remembered; drawn before the (clipped) player pass
        return draw.call(g, c, 0, 0, c.width, c.height, dx - c.pad * kx, dy - c.pad * ky, dw + 2 * c.pad * kx, dh + 2 * c.pad * ky);
      };
      try { POP.stats.drawn++; return f.apply(this, arguments); } finally { delete g.drawImage; if (g.drawImage !== draw && Object.getPrototypeOf(g).drawImage !== draw) g.drawImage = draw; this.draw25Shadow = sh; }
    };
  }
  // the older faint white halo from scale.js is replaced by this
  if (window.saltwakeScale) window.saltwakeScale.rim = false;
})();
