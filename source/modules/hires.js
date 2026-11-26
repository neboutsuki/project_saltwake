/* SALTWAKE sharp rendering (v0.31): the game used to draw into a fixed 1024x576 canvas that the browser stretched to
 * the window (2.5x at 1440p), so everything looked soft and blocky. Now:
 * - The world canvas renders at up to the real screen resolution (default cap 1.875x = 1920x1080; up to 3x in
 *   Graphics). If the game runs below ~48 fps for 3 s it steps the resolution down automatically.
 *   All game code keeps drawing in its 1024x576 coordinates: setTransform/resetTransform are scaled underneath.
 * - Sharp pixel art: small sprites drawn with nearest-neighbour at a non-integer scale get uneven, shimmering pixels.
 *   They are drawn from a cached integer (nearest) upscale with smoothing on, which keeps pixel edges crisp and even.
 *   Large paintings (ground chunks) are drawn with high-quality smoothing.
 * - Tilt-shift blur is off by default (it blurred the top and bottom of the screen); it stays in Graphics settings.
 * Option: Graphics > "Sharp high-resolution rendering". window.saltwakeHiRes exposes the scale for QA.
 */
(() => {
  const C = document.getElementById('world'); if (!C || typeof g === 'undefined') return;
  const H = window.saltwakeHiRes = { enabled: true, scale: 1, max: 1.875, cap: 1.875, stats: { resizes: 0, sharp: 0, cached: 0 } };
  try { if (localStorage.getItem('saltwake.hires') === 'off') H.enabled = false; const m = +localStorage.getItem('saltwake.hires.max'); if (m >= 1 && m <= 3) H.max = H.cap = m; } catch (e) { }
  const ctx = g, setT = ctx.setTransform.bind(ctx), resetT = ctx.resetTransform?.bind(ctx), draw = ctx.drawImage.bind(ctx);
  // Overrides live on a private prototype for this one context, so other modules that set and then delete their own
  // temporary g.drawImage / g.setTransform properties never remove them.
  const proto = Object.create(Object.getPrototypeOf(ctx)); Object.setPrototypeOf(ctx, proto);
  proto.setTransform = function (a, b, c, d, e, f) {
    const S = H.scale;
    if (a && typeof a === 'object') { const m = a; return setT(m.a * S, m.b * S, m.c * S, m.d * S, m.e * S, m.f * S); }
    return setT(a * S, b * S, c * S, d * S, e * S, f * S);
  };
  proto.resetTransform = function () { return setT(H.scale, 0, 0, H.scale, 0, 0); };

  function resize() {
    const r = C.getBoundingClientRect(); if (!r.width) return;
    const want = H.enabled ? Math.max(1, Math.min(H.max, H.cap, r.width * (window.devicePixelRatio || 1) / VW)) : 1;
    const W = Math.round(VW * want), Hh = Math.round(VH * want);
    if (C.width === W && C.height === Hh) return;
    C.width = W; C.height = Hh; H.scale = W / VW; H.stats.resizes++;
    setT(H.scale, 0, 0, H.scale, 0, 0);
  }
  // Adaptive: if the game runs below ~48 fps for 3 s, step the resolution down (1.875 -> 1.5 -> 1.25 -> 1).
  let frames = 0, t0 = 0, slow = 0;
  function watch(t) {
    const G = window.SALTWAKE_DEV?.game;
    if (G && G.mode === 'play' && !G.panel && !document.hidden) {
      if (!t0) t0 = t; frames++;
      if (t - t0 > 1000) { const fps = frames * 1000 / (t - t0); frames = 0; t0 = t;
        slow = fps < 48 && H.scale > 1.01 ? slow + 1 : 0;
        if (slow >= 3) { slow = 0; H.cap = Math.max(1, +(H.scale - .375).toFixed(3)); resize(); H.stats.downshifts = (H.stats.downshifts || 0) + 1;
          G.notify?.(`Render resolution lowered to ${H.scale.toFixed(2)}x for smoother play`, 3); } }
    } else { t0 = 0; frames = 0; }
    requestAnimationFrame(watch);
  }
  requestAnimationFrame(watch);
  new ResizeObserver(resize).observe(C); addEventListener('resize', resize); resize();

  // Sharp pixel art: integer nearest-neighbour pre-scale, then smooth down to the exact size.
  const cache = new WeakMap();
  function upscaled(src, k) {
    let m = cache.get(src); if (!m) cache.set(src, m = {});
    if (m[k]) return m[k];
    const w = src.naturalWidth || src.width, h = src.naturalHeight || src.height;
    const c = document.createElement('canvas'); c.width = w * k; c.height = h * k;
    const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(src, 0, 0, c.width, c.height);
    H.stats.cached++; return (m[k] = c);
  }
  proto.drawImage = function (src) {
    // pixel-art images (decoded <img> art) always take the sharp path; generated canvases keep the caller's smoothing
    if (!H.enabled || !src || arguments.length < 5 || !(src instanceof HTMLImageElement)) return draw.apply(ctx, arguments);
    const was = ctx.imageSmoothingEnabled;
    const sw = src.naturalWidth || src.width, sh = src.naturalHeight || src.height;
    if (!sw || sw > 420 || sh > 420) {                 // big paintings: smooth them
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      try { return draw.apply(ctx, arguments); } finally { ctx.imageSmoothingEnabled = was; }
    }
    const t = ctx.getTransform(), dw = arguments.length >= 9 ? arguments[7] : arguments[3], sx = Math.abs(dw * t.a / (arguments.length >= 9 ? arguments[3] : sw));
    if (sx < 1.6) { ctx.imageSmoothingEnabled = true; try { return draw.apply(ctx, arguments); } finally { ctx.imageSmoothingEnabled = was; } }
    const k = Math.min(6, Math.max(2, Math.round(sx))), up = upscaled(src, k);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'medium'; H.stats.sharp++;
    try {
      if (arguments.length >= 9) { const [, a, b, c, d, e, f, w2, h2] = arguments; return draw(up, a * k, b * k, c * k, d * k, e, f, w2, h2); }
      const [, x, y, w2, h2] = arguments; return draw(up, x, y, w2, h2);
    } finally { ctx.imageSmoothingEnabled = was; }
  };

  // Tilt-shift off by default (once); the setting stays available.
  try { if (!localStorage.getItem('saltwake.sharp.v1')) { localStorage.setItem('saltwake.sharp.v1', '1'); window.saltwakePost?.set?.({ tilt: false }); } } catch (e) { }
  const P = Game.prototype, gp = P.graphicsPanel;
  P.graphicsPanel = function () {
    const out = gp.apply(this, arguments), root = document.getElementById('panel')?.querySelector('.engineOptions');
    root?.insertAdjacentHTML('afterbegin', `<label class="engineCheck"><input id="swHiRes" type="checkbox" ${H.enabled ? 'checked' : ''}> Sharp high-resolution rendering (${H.scale.toFixed(2)}x)</label><label>Max render scale<select id="swHiResMax">${[1.25, 1.5, 1.875, 2.5, 3].map(v => `<option value="${v}" ${v === H.max ? 'selected' : ''}>${v}x${v === 1.875 ? ' (1080p, default)' : v === 3 ? ' (4K)' : ''}</option>`).join('')}</select></label>`);
    const mx = document.getElementById('swHiResMax'); if (mx) mx.onchange = e => { H.max = +e.target.value; H.cap = H.max; try { localStorage.setItem('saltwake.hires.max', String(H.max)); } catch (_) { } resize(); };
    const el = document.getElementById('swHiRes'); if (el) el.onchange = e => { H.enabled = e.target.checked; try { localStorage.setItem('saltwake.hires', H.enabled ? 'on' : 'off'); } catch (_) { } resize(); };
    return out;
  };
  const css = document.createElement('style'); css.textContent = '#world{image-rendering:auto!important}'; document.head.appendChild(css);
})();
