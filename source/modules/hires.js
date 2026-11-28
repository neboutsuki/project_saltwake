/* SALTWAKE sharp rendering (v0.31): the game used to draw into a fixed 1024x576 canvas that the browser stretched to
 * the window (2.5x at 1440p), so everything looked soft and blocky. Now:
 * - The world canvas renders at up to the real screen resolution (default cap 2.5x = 2560x1440; up to 3x in
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
  const H = window.saltwakeHiRes = { enabled: true, smooth: true, scale: 1, max: 2.5, cap: 2.5, stats: { resizes: 0, sharp: 0, cached: 0, smooth: 0, smoothBaked: 0, smoothPending: 0 } };
  try { if (localStorage.getItem('saltwake.pixelstyle') === 'crisp') H.smooth = false; } catch (e) { }
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
  // Adaptive: if the game runs below ~48 fps for 3 s, step the resolution down (2.5 -> 2.125 -> ... -> 1).
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
  const cache = new WeakMap(), kind = new WeakMap();
  H.grade = { desat: .2, bright: .94 };
  let SCENERY = null;
  function scenery(src) {
    let v = kind.get(src); if (v !== undefined) return v;
    if (!SCENERY) { SCENERY = new Set(); const I = window.SALTWAKE_ASSETS?.images || {}; for (const [a, u] of Object.entries(I)) if (/^art\/(plants|rocks|trees|props|buildings|edges|arena)\//.test(a)) SCENERY.add(u); }
    v = SCENERY.has(src.getAttribute?.('src') || src.src); kind.set(src, v); return v;
  }
  function upscaled(src, k) {
    let m = cache.get(src); if (!m) cache.set(src, m = {});
    if (m[k]) return m[k];
    const w = src.naturalWidth || src.width, h = src.naturalHeight || src.height;
    const c = document.createElement('canvas'); c.width = w * k; c.height = h * k;
    const x = c.getContext('2d', { willReadFrequently: true }); x.imageSmoothingEnabled = false; x.drawImage(src, 0, 0, c.width, c.height);
    if (scenery(src) && H.grade) {                    // scenery is muted a little so characters stand out
      try { const id = x.getImageData(0, 0, c.width, c.height), d = id.data, ds = H.grade.desat, br = H.grade.bright;
        for (let i = 0; i < d.length; i += 4) { const L = d[i] * .3 + d[i + 1] * .59 + d[i + 2] * .11; d[i] = (d[i] + (L - d[i]) * ds) * br; d[i + 1] = (d[i + 1] + (L - d[i + 1]) * ds) * br; d[i + 2] = (d[i + 2] + (L - d[i + 2]) * ds) * br; }
        x.putImageData(id, 0, 0); } catch (e) { }
    }
    H.stats.cached++; return (m[k] = c);
  }
  // ---- Smooth mode (default): no visible pixels. Each small sprite is upscaled once with a bicubic (Catmull-Rom) filter
  // in a background worker (premultiplied alpha, separable), cached, and drawn with high-quality smoothing. Until its
  // upscale is ready a sprite is drawn with plain high-quality smoothing. Big images (>420 px) are drawn smoothly as is.
  const SMOOTH_SRC = `
    const cr=t=>{t=Math.abs(t);return t<1?1.5*t*t*t-2.5*t*t+1:t<2?-.5*t*t*t+2.5*t*t-4*t+2:0};
    function up(src,w,h,k){ // separable bicubic, premultiplied alpha
      const W=w*k,H=h*k,pre=new Float32Array(w*h*4);for(let i=0;i<w*h;i++){const a=src[i*4+3]/255;pre[i*4]=src[i*4]*a;pre[i*4+1]=src[i*4+1]*a;pre[i*4+2]=src[i*4+2]*a;pre[i*4+3]=src[i*4+3]}
      const tmp=new Float32Array(W*h*4);const wx=new Float32Array(4);
      for(let X=0;X<W;X++){const u=(X+.5)/k-.5,i0=Math.floor(u),f=u-i0;for(let m=0;m<4;m++)wx[m]=cr(m-1-f);
        for(let y=0;y<h;y++){let r=0,g=0,b=0,a=0;for(let m=0;m<4;m++){const x=Math.min(w-1,Math.max(0,i0+m-1)),q=(y*w+x)*4,ww=wx[m];r+=pre[q]*ww;g+=pre[q+1]*ww;b+=pre[q+2]*ww;a+=pre[q+3]*ww}
          const o=(y*W+X)*4;tmp[o]=r;tmp[o+1]=g;tmp[o+2]=b;tmp[o+3]=a}}
      const out=new Uint8ClampedArray(W*H*4);
      for(let Y=0;Y<H;Y++){const v=(Y+.5)/k-.5,j0=Math.floor(v),f=v-j0;for(let m=0;m<4;m++)wx[m]=cr(m-1-f);
        for(let X=0;X<W;X++){let r=0,g=0,b=0,a=0;for(let m=0;m<4;m++){const y=Math.min(h-1,Math.max(0,j0+m-1)),q=(y*W+X)*4,ww=wx[m];r+=tmp[q]*ww;g+=tmp[q+1]*ww;b+=tmp[q+2]*ww;a+=tmp[q+3]*ww}
          const o=(Y*W+X)*4;a=Math.max(0,Math.min(255,a));const ia=a>0.5?255/a:0;out[o]=r*ia;out[o+1]=g*ia;out[o+2]=b*ia;out[o+3]=a<6?0:a}}
      return out}
    onmessage=e=>{const {id,data,w,h,k}=e.data;const o=up(data,w,h,k);postMessage({id,buf:o.buffer,W:w*k,H:h*k},[o.buffer])};`;
  let SW = null, swFail = false, sid = 0; const swWait = new Map(), SMC = new WeakMap(); let smoothBytes = 0;
  function sworker() { if (SW || swFail) return SW; try { SW = new Worker(URL.createObjectURL(new Blob([SMOOTH_SRC], { type: 'text/javascript' })));
    SW.onmessage = e => { const { id, buf, W, H: Hh } = e.data, job = swWait.get(id); swWait.delete(id); H.stats.smoothPending = swWait.size; if (!job) return;
      const c = document.createElement('canvas'); c.width = W; c.height = Hh; c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(buf), W, Hh), 0, 0);
      job.m[job.k] = c; smoothBytes += W * Hh * 4; H.stats.smoothBaked++; };
    SW.onerror = () => { swFail = true; SW = null; }; } catch (e) { swFail = true; } return SW; }
  function smoothed(src, k) {
    let m = SMC.get(src); if (!m) SMC.set(src, m = {}); if (m[k] !== undefined) return m[k];
    if (smoothBytes > 420e6 || swWait.size > 48 || !sworker()) return null;   // memory / queue guard: fall back to plain smoothing
    const w = src.naturalWidth || src.width, h = src.naturalHeight || src.height; if (!w || !h) return null;
    try { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(src, 0, 0);
      let d = x.getImageData(0, 0, w, h);
      if (scenery(src) && H.grade) { const dd = d.data, ds = H.grade.desat, br = H.grade.bright; for (let i = 0; i < dd.length; i += 4) { const L = dd[i] * .3 + dd[i + 1] * .59 + dd[i + 2] * .11; dd[i] = (dd[i] + (L - dd[i]) * ds) * br; dd[i + 1] = (dd[i + 1] + (L - dd[i + 1]) * ds) * br; dd[i + 2] = (dd[i + 2] + (L - dd[i + 2]) * ds) * br; } }
      const id = ++sid; m[k] = null; swWait.set(id, { m, k }); H.stats.smoothPending = swWait.size; SW.postMessage({ id, data: d.data, w, h, k }, [d.data.buffer]);
    } catch (e) { m[k] = null; }
    return null;
  }
  H.smoothed = smoothed;
  proto.drawImage = function (src) {
    // pixel-art images (decoded <img> art) always take the sharp path; generated canvases keep the caller's smoothing
    if (!H.enabled || !src || arguments.length < 5 || !(src instanceof HTMLImageElement || src.pixelArt)) return draw.apply(ctx, arguments);
    const was = ctx.imageSmoothingEnabled;
    const sw = src.naturalWidth || src.width, sh = src.naturalHeight || src.height;
    if (!sw || sw > 420 || sh > 420) {                 // big paintings: smooth them
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      try { return draw.apply(ctx, arguments); } finally { ctx.imageSmoothingEnabled = was; }
    }
    const t = ctx.getTransform(), dw = arguments.length >= 9 ? arguments[7] : arguments[3], sx = Math.abs(dw * t.a / (arguments.length >= 9 ? arguments[3] : sw));
    if (sx < 1.6) { ctx.imageSmoothingEnabled = true; try { return draw.apply(ctx, arguments); } finally { ctx.imageSmoothingEnabled = was; } }
    if (H.smooth) {   // no visible pixels: bicubic upscale (2x for big sprites, up to 4x for small ones), high-quality smoothing
      const big = sw * sh > 200 * 200, k = big ? 2 : Math.min(4, Math.max(2, Math.ceil(sx))), up = smoothed(src, k);
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; H.stats.smooth++;
      try {
        if (!up) return draw.apply(ctx, arguments);
        if (arguments.length >= 9) { const [, a, b, c, d, e, f, w2, h2] = arguments; return draw(up, a * k, b * k, c * k, d * k, e, f, w2, h2); }
        const [, x, y, w2, h2] = arguments; return draw(up, x, y, w2, h2);
      } finally { ctx.imageSmoothingEnabled = was; }
    }
    const k = Math.min(src.pixelArt ? 4 : 6, Math.max(2, Math.round(sx))), up = upscaled(src, k);
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
    root?.insertAdjacentHTML('afterbegin', `<label>Pixel style<select id="swPixStyle"><option value="smooth" ${H.smooth ? 'selected' : ''}>Smooth (no visible pixels)</option><option value="crisp" ${H.smooth ? '' : 'selected'}>Crisp pixel art</option></select></label><label class="engineCheck"><input id="swHiRes" type="checkbox" ${H.enabled ? 'checked' : ''}> Sharp high-resolution rendering (${H.scale.toFixed(2)}x)</label><label>Max render scale<select id="swHiResMax">${[1.25, 1.5, 1.875, 2.5, 3].map(v => `<option value="${v}" ${v === H.max ? 'selected' : ''}>${v}x${v === 1.875 ? ' (1080p)' : v === 2.5 ? ' (1440p, default)' : v === 3 ? ' (4K)' : ''}</option>`).join('')}</select></label>`);
    const ps = document.getElementById('swPixStyle'); if (ps) ps.onchange = e => { H.smooth = e.target.value !== 'crisp'; document.documentElement.classList.toggle('sw-smooth', H.smooth); try { localStorage.setItem('saltwake.pixelstyle', H.smooth ? 'smooth' : 'crisp'); } catch (_) { } };
    const mx = document.getElementById('swHiResMax'); if (mx) mx.onchange = e => { H.max = +e.target.value; H.cap = H.max; try { localStorage.setItem('saltwake.hires.max', String(H.max)); } catch (_) { } resize(); };
    const el = document.getElementById('swHiRes'); if (el) el.onchange = e => { H.enabled = e.target.checked; try { localStorage.setItem('saltwake.hires', H.enabled ? 'on' : 'off'); } catch (_) { } resize(); };
    return out;
  };
  const css = document.createElement('style'); css.textContent = '#world{image-rendering:auto!important}html.sw-smooth img,html.sw-smooth canvas,html.sw-smooth .itemArt{image-rendering:auto!important}'; document.documentElement.classList.toggle('sw-smooth', H.smooth); document.head.appendChild(css);
})();
