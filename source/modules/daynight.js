/* SALTWAKE day & night lighting (v0.31). Rendering only; gameplay perception and timing are unchanged.
 * Replaces the flat dark wash on tile maps with colored lighting:
 * - Ambient light follows the clock through keyframes: cold blue night, violet pre-dawn, orange-pink sunrise, neutral
 *   day, warm golden hour, red sunset, blue hour. Clouds, rain and fog grey and dim it.
 * - A light layer (half resolution) starts at the ambient color and adds warm light: the map's lanterns, braziers and
 *   campfires (fires flicker), lit windows in town at dusk and night, and the player's lantern (a glow plus a cone
 *   toward the aim). The world is multiplied by it, so lights tint what they touch; flames get a soft glow on top.
 * - While this owns the lighting, the GPU renderer keeps the field image neutral (no second tint).
 * window.saltwakeDayNight exposes the current ambient, light count and settings for QA.
 */
(() => {
  const P = Game.prototype, T = 32;
  const DN = window.saltwakeDayNight = { enabled: true, active: false, stats: { frames: 0, lights: 0 }, ambient: [255, 255, 255], level: 0 };
  // minute -> [r, g, b, darkness 0..1]
  const KEYS = [[0, 52, 64, 104, 1], [280, 52, 64, 104, 1], [330, 110, 96, 128, .8], [380, 226, 182, 164, .3], [440, 238, 210, 186, .12],
    [520, 250, 244, 232, 0], [720, 255, 252, 246, 0], [960, 255, 242, 218, 0], [1030, 255, 208, 154, .08], [1090, 238, 168, 130, .25],
    [1150, 136, 114, 152, .65], [1210, 70, 80, 120, .92], [1440, 52, 64, 104, 1]];
  function ambient(minute) {
    const m = ((minute % 1440) + 1440) % 1440;
    let i = 0; while (i < KEYS.length - 2 && KEYS[i + 1][0] <= m) i++;
    const a = KEYS[i], b = KEYS[i + 1], t = (m - a[0]) / Math.max(1, b[0] - a[0]), s = t * t * (3 - 2 * t);
    return [0, 1, 2, 3].map(k => a[k + 1] + (b[k + 1] - a[k + 1]) * s);
  }
  DN.ambientAt = ambient;
  const LC = document.createElement('canvas'), lx = LC.getContext('2d');
  const RES = .5;
  function size() { const w = Math.round(VW * RES), h = Math.round(VH * RES); if (LC.width !== w || LC.height !== h) { LC.width = w; LC.height = h; } }

  function glow(ctx, x, y, r, rgb, a) {
    if (r <= 0 || a <= .01) return;
    const gr = ctx.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, `rgba(${rgb},${a})`); gr.addColorStop(.45, `rgba(${rgb},${a * .45})`); gr.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = gr; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  const old = P.drawPinewallLight;
  P.drawPinewallLight = function (now) {
    const m = this.map();
    DN.active = DN.enabled && !!m?.tilemap && this.mode === 'play';
    if (!DN.active) return old.apply(this, arguments);
    const K = window.saltwakeSky?.state || {}, minute = K.minute ?? (this.climateClock?.() % 1440);
    let [r, gg, b, dark] = ambient(minute);
    // weather: clouds/rain grey and dim the light; fog lifts the blacks a little
    const cloud = K.cloud || 0, rain = K.rain || 0, fog = K.fog || 0, grey = (r + gg + b) / 3;
    const mixG = Math.min(.55, cloud * .35 + rain * .25);
    r += (grey - r) * mixG; gg += (grey - gg) * mixG; b += (grey - b) * mixG;
    const dim = 1 - rain * .16 - cloud * .06;
    r *= dim; gg *= dim; b *= dim;
    r += fog * 18; gg += fog * 20; b += fog * 22;
    if (K.flash) { const f = Math.min(1, K.flash); r += (255 - r) * f; gg += (255 - gg) * f; b += (255 - b) * f; }
    DN.ambient = [r, gg, b].map(Math.round); DN.level = dark;
    const neutral = r > 250 && gg > 248 && b > 240 && dark < .02;
    if (neutral) return;
    size();
    const z = this.camera.zoom * RES, cx = this.camera.x, cy = this.camera.y, W = LC.width, H = LC.height;
    const sx = x => (x - cx) * z, sy = y => (y - cy) * z;
    lx.globalCompositeOperation = 'source-over';
    lx.fillStyle = `rgb(${DN.ambient.join(',')})`; lx.fillRect(0, 0, W, H);
    lx.globalCompositeOperation = 'lighter';
    const L = Math.max(0, dark), t = now / 1000, list = [];
    const scene = SALTWAKE_VIS[this.mapId] || {};
    for (const [i, l] of (scene.lights || []).entries()) {
      const fire = (l.radius || 120) >= 140, fl = fire ? .82 + .18 * Math.sin(t * 9 + i * 2.3) * Math.sin(t * 3.7 + i) : 1;
      list.push([l.x * T, l.y * T, (l.radius || 120) * 1.5 * fl, fire ? '255,150,70' : '255,190,120', (l.strength || .8) * fl, fire]);
    }
    if (this.mapId === 'hub' && L > .25) for (const bd of m.buildings) {     // lit windows in town
      if (!bd.art) continue; const k = 1.4 * (bd.artScale || 1), foot = (bd.y + bd.h) * T, x0 = (bd.x + bd.w / 2) * T;
      for (const dx of [-.22, .22]) list.push([x0 + dx * bd.w * T, foot - 40 * k, 70, '255,176,96', .55, false]);
    }
    const p = this.player;
    if (this.lanternOn !== false) list.push([p.x, p.y - 20, 150, '255,214,160', .7, false]);
    let n = 0;
    for (const [x, y, rad, rgb, a] of list) {
      const X = sx(x), Y = sy(y), R = rad * z;
      if (X < -R || Y < -R || X > W + R || Y > H + R) continue;
      glow(lx, X, Y, R, rgb, Math.min(1, a * (.25 + .9 * L))); n++;
    }
    if (this.lanternOn !== false && L > .2) {   // lantern cone toward the aim
      const a = p.angle || 0, X = sx(p.x), Y = sy(p.y - 16), R = 380 * z;
      lx.save(); lx.beginPath(); lx.moveTo(X, Y); lx.arc(X, Y, R, a - .42, a + .42); lx.closePath(); lx.clip();
      glow(lx, X, Y, R, '255,222,170', .55 * L); lx.restore();
    }
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingEnabled = true;
    g.globalCompositeOperation = 'multiply'; g.drawImage(LC, 0, 0, VW, VH);
    if (L > .15) {                                 // soft bloom around flames and lanterns
      g.globalCompositeOperation = 'screen';
      for (const [x, y, rad, rgb, a, fire] of list) {
        const X = (x - cx) * this.camera.zoom, Y = (y - cy) * this.camera.zoom, R = rad * .45 * this.camera.zoom;
        if (X < -R || Y < -R || X > VW + R || Y > VH + R) continue;
        glow(g, X, Y, R, rgb, (fire ? .22 : .12) * L * a);
      }
    }
    g.restore();
    DN.stats.frames++; DN.stats.lights = n;
  };
})();
