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
  const KEYS = [[0, 9, 11, 20, 1], [280, 9, 11, 20, 1], [330, 46, 44, 66, .85], [380, 226, 182, 164, .3], [440, 238, 210, 186, .12],
    [520, 250, 244, 232, 0], [720, 255, 252, 246, 0], [960, 255, 242, 218, 0], [1030, 255, 208, 154, .08], [1090, 238, 168, 130, .25],
    [1150, 104, 92, 124, .7], [1200, 30, 34, 54, .95], [1240, 9, 11, 20, 1], [1440, 9, 11, 20, 1]];
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

  // ---- monster tells in darkness ---------------------------------------------------------------------------------
  const EYES = { widow: '255,70,60', brineback: '255,176,80', grazer: '220,230,200', gull: '230,230,230', wrecker: '255,210,140' };
  const eyeOf = t => /^brineworn_/.test(t) ? '90,240,220' : EYES[t] || '255,150,90';
  const seen = new WeakMap(), dust = [];
  function lightAt(list, x, y, game) {
    let v = 0;
    for (const [lx2, ly2, rad, , a] of list) { const d = Math.hypot(x - lx2, y - ly2); if (d < rad) v += (1 - d / rad) * a; }
    const p = game.player;
    if (game.lanternOn !== false) { const d = Math.hypot(x - p.x, y - p.y), da = Math.abs(Math.atan2(Math.sin(Math.atan2(y - p.y, x - p.x) - (p.angle || 0)), Math.cos(Math.atan2(y - p.y, x - p.x) - (p.angle || 0))));
      if (d < 470 && da < .42) v += (1 - d / 470) * .9; }
    return v;
  }
  function cues(game, list, amb, now) {
    const z = game.camera.zoom, cx = game.camera.x, cy = game.camera.y, t = now / 1000;
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'lighter';
    for (const e of game.raid.enemies) {
      if (e.dead) continue;
      const X = (e.x - cx) * z, Y = (e.y - cy) * z; if (X < -40 || Y < -40 || X > VW + 40 || Y > VH + 40) continue;
      const lit = amb + lightAt(list, e.x, e.y - 20, game); if (lit > .55) { seen.delete(e); continue; }
      const dark = Math.min(1, (.55 - lit) / .4);
      let s = seen.get(e); if (!s) seen.set(e, s = { x: e.x, y: e.y, moving: 0, blink: Math.random() * 6 });
      const mv = Math.hypot(e.x - s.x, e.y - s.y); s.moving = mv > .4 ? 1 : Math.max(0, s.moving - .04); s.x = e.x; s.y = e.y;
      if (mv > .4 && Math.random() < .35) dust.push({ x: e.x + (Math.random() - .5) * 18, y: e.y + 6, t: 0 });
      // eyes: a pair facing the way it looks; they blink now and then and burn brighter when it is alert
      const blink = ((t + s.blink) % 5.5) < .12, alert = e.aggro > 0 || e.awareness === 'alert';
      if (!blink) {
        const a = e.facing ?? Math.atan2(game.player.y - e.y, game.player.x - e.x), big = /brineback|widow/.test(e.type) ? 1.4 : 1;
        const ex = X + Math.cos(a) * 7 * z, ey = Y - (/gull/.test(e.type) ? 10 : 22) * z * big + Math.sin(a) * 3 * z, sp = 4.2 * z * big, rgb = eyeOf(e.type);
        for (const o of [-1, 1]) { const px = ex + Math.cos(a + Math.PI / 2) * sp * o, py = ey + Math.sin(a + Math.PI / 2) * sp * .4 * o;
          const gr = g.createRadialGradient(px, py, 0, px, py, 5 * z * big); gr.addColorStop(0, `rgba(${rgb},${(alert ? 1 : .75) * dark})`); gr.addColorStop(1, `rgba(${rgb},0)`);
          g.fillStyle = gr; g.fillRect(px - 6 * z * big, py - 6 * z * big, 12 * z * big, 12 * z * big);
          g.fillStyle = `rgba(255,255,240,${.9 * dark})`; g.fillRect(px - .7, py - .7, 1.4, 1.4); }
      }
      DN.stats.eyes = (DN.stats.eyes || 0) + 1;
    }
    // rustling dust where something moved in the dark
    g.globalCompositeOperation = 'source-over';
    for (let i = dust.length - 1; i >= 0; i--) { const d = dust[i]; d.t += 1 / 60; if (d.t > .7) { dust.splice(i, 1); continue; }
      const X = (d.x - cx) * z, Y = (d.y - cy - d.t * 10) * z, a = (1 - d.t / .7) * .35;
      g.fillStyle = `rgba(150,160,170,${a})`; g.beginPath(); g.ellipse(X, Y, (3 + d.t * 9) * z, (1.6 + d.t * 4) * z, 0, 0, Math.PI * 2); g.fill(); }
    if (dust.length > 160) dust.splice(0, dust.length - 160);
    g.restore();
  }
  DN.lightAt = lightAt;

  const old = P.drawPinewallLight;
  P.drawPinewallLight = function (now) {
    const m = this.map();
    DN.active = DN.enabled && !!m?.tilemap && this.mode === 'play';
    if (!DN.active) return old.apply(this, arguments);
    const K = window.saltwakeSky?.state || {}, cc = this.climateClock?.(), minute = Number.isFinite(cc) ? cc % 1440 : (K.minute ?? 720);
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
    if (this.lanternOn !== false) list.push([p.x, p.y - 20, 200, '255,214,160', .9, false]);
    else list.push([p.x, p.y - 20, 90, '150,170,210', .5, false]);   // you never lose your own silhouette
    let n = 0;
    for (const [x, y, rad, rgb, a] of list) {
      const X = sx(x), Y = sy(y), R = rad * z;
      if (X < -R || Y < -R || X > W + R || Y > H + R) continue;
      glow(lx, X, Y, R, rgb, Math.min(1, a * (.25 + .9 * L))); n++;
    }
    if (this.lanternOn !== false && L > .2) {   // lantern cone toward the aim
      const a = p.angle || 0, X = sx(p.x), Y = sy(p.y - 16), R = 470 * z;
      lx.save(); lx.beginPath(); lx.moveTo(X, Y); lx.arc(X, Y, R, a - .42, a + .42); lx.closePath(); lx.clip();
      glow(lx, X, Y, R, '255,222,170', .9 * L); lx.restore();
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
    // In the dark you see monsters only by their eyes and the dust they kick up.
    if (this.raid && L > .45) cues(this, list, (r + gg + b) / 765, now);
    DN.stats.frames++; DN.stats.lights = n;
  };
})();
