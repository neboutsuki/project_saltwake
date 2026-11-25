/* SALTWAKE art hookup (v0.31): puts the generated art pack to use without changing any game rule.
 * 1. Item icons: inventory, stash, shops and the hotbar use art/icons/<item>.png (exact id or a close stand-in) and
 *    fall back to the old coast icons.
 * 2. Projectiles: bolts and Wickcaster flames are drawn with art/vfx/proj_* sprite strips instead of lines.
 * 3. Hit effects: hits, armor glances, part breaks and cover hits play art/vfx sprite animations (hit_spark,
 *    part_break_burst, smoke_puff). Damage numbers are kept.
 * 4. Splashes: wading through water kicks up art/vfx/splash.
 * The hunt layer still owns bullets and its event list; this module only takes over how they are drawn.
 * Effect strips are 6 equal frames in one row. window.saltwakeArt exposes settings and counters for QA.
 */
(() => {
  const P = Game.prototype;
  const IMGS = () => (window.SALTWAKE_ASSETS && window.SALTWAKE_ASSETS.images) || {};
  const A = window.saltwakeArt = { enabled: true, stats: { icons: 0, projectiles: 0, effects: 0, splashes: 0 }, splashes: [] };

  // ---- 1. Item icons -------------------------------------------------------------------------------------------
  const STAND_IN = { brineback_plate: 'brineback_shell', redhook_feather: 'gull_feather', widow_claw: 'widow_fang',
    smoke_pot: 'smoke_bomb', shed_horn: 'stag_antler', longbolt: 'bolt' };
  A.iconFor = id => { const im = IMGS(); return id && (im['art/icons/' + id] || (STAND_IN[id] && im['art/icons/' + STAND_IN[id]])) || null; };
  const oldArt = window.inventoryArt;
  window.inventoryArt = function (id) {
    const src = A.enabled && A.iconFor(id);
    if (src) { A.stats.icons++; return '<img class="itemArt swArtIcon" src="' + String(src).replace(/"/g, '&quot;') + '" alt="" draggable="false">'; }
    return oldArt(id);
  };

  // ---- sprite strips ---------------------------------------------------------------------------------------------
  const cache = {};
  function strip(name) {
    if (cache[name] !== undefined) return cache[name];
    const src = IMGS()['art/vfx/' + name];
    if (!src) return (cache[name] = null);
    const im = new Image(); im.src = src; im.decoding = 'async';
    return (cache[name] = { im, frames: 6 });
  }
  function frame(ctx, name, t, x, y, scale, rot, alpha) {
    const s = strip(name); if (!s || !s.im.complete || !s.im.naturalWidth) return false;
    const fw = s.im.naturalWidth / s.frames, fh = s.im.naturalHeight, f = Math.min(s.frames - 1, Math.max(0, Math.floor(t * s.frames)));
    ctx.save(); ctx.globalAlpha = alpha ?? 1; ctx.translate(x, y); if (rot) ctx.rotate(rot);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(s.im, f * fw, 0, fw, fh, -fw * scale / 2, -fh * scale / 2, fw * scale, fh * scale);
    ctx.restore(); return true;
  }
  A.ready = () => ['hit_spark', 'part_break_burst', 'smoke_puff', 'splash', 'proj_bolt', 'proj_wick_flame'].every(n => { const s = strip(n); return s && s.im.complete && s.im.naturalWidth > 0; });

  const EFFECT = { hit: ['hit_spark', 1.5], part: ['hit_spark', 1.7], armor: ['hit_spark', 1.1], break: ['part_break_burst', 1.6], cover: ['smoke_puff', 0.9] };

  // ---- render: take over bullets + hit events for the field scene ------------------------------------------------
  const render = P.render;
  P.render = function (now) {
    const r = this.raid, H = window.saltwakeHunt;
    if (!A.enabled || !r || !H || this.mode !== 'play' || this.panel) return render.apply(this, arguments);
    const s = H.fx(r), events = s.events, bullets = r.bullets;
    for (const b of bullets) if (!b._art) b._art = !b.enemy && /wick/i.test(String(b.weaponId || '') + (this.weapon?.()?.name || '')) ? 'proj_wick_flame' : 'proj_bolt';
    s.events = []; r.bullets = [];
    let out;
    try { out = render.apply(this, arguments); } finally { if (H.fx(r) === s) s.events = events; if (this.raid === r) r.bullets = bullets; }
    if (this.raid !== r) return out;
    const ctx = g, z = this.camera.zoom, cx = this.camera.x, cy = this.camera.y, t = performance.now() / 1000;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    // splashes under everything else
    const tn = performance.now() / 1000;
    A.splashes = A.splashes.filter(p => tn - p.at < 0.5);
    for (const p of A.splashes) frame(ctx, 'splash', (tn - p.at) / 0.5, (p.x - cx) * z, (p.y - cy) * z, z * 1.1, 0, 0.9);
    // projectiles
    for (const b of bullets) {
      const x = (b.x - cx) * z, y = (b.y - cy) * z;
      if (x < -40 || y < -40 || x > VW + 40 || y > VH + 40) continue;
      const rot = Math.atan2(b.vy, b.vx), name = b._art || 'proj_bolt';
      if (frame(ctx, name, (t * 2.5) % 1, x, y, z * (name === 'proj_bolt' ? 1.25 : 1), rot, 1)) A.stats.projectiles++;
      else { ctx.strokeStyle = b.enemy ? '#dc906d' : '#f3dfad'; ctx.lineWidth = Math.max(1, 1.5 * z); ctx.beginPath(); ctx.moveTo(x - Math.cos(rot) * 18 * z, y - Math.sin(rot) * 18 * z); ctx.lineTo(x, y); ctx.stroke(); }
    }
    // hit effects + damage numbers
    for (const e of events) {
      const x = (e.x - cx) * z, y = (e.y - cy) * z;
      if (x < -60 || y < -60 || x > VW + 60 || y > VH + 60) continue;
      const a = 1 - e.life / e.max, kind = EFFECT[e.kind] ? e.kind : 'hit', [name, sc] = EFFECT[kind];
      if (frame(ctx, name, a, x, y, z * sc, 0, Math.min(1, e.life / 0.12))) A.stats.effects++;
      if (e.kind !== 'cover' && e.kind !== 'hostile') {
        ctx.globalAlpha = Math.min(1, e.life / 0.22);
        ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.shadowColor = '#1b211d'; ctx.shadowBlur = 3;
        ctx.fillStyle = e.kind === 'break' ? '#f6d078' : e.kind === 'armor' ? '#e5c19a' : '#f0e2cf';
        ctx.fillText(`${Math.round(e.amount)}${e.kind === 'break' ? ' · PART BROKEN' : e.kind === 'armor' ? ' · ARMOR' : e.part ? ' · ' + e.part : ''}`, x, y - 16 - a * 24);
        ctx.shadowBlur = 0; ctx.globalAlpha = 1;
      }
    }
    ctx.restore();
    return out;
  };

  // ---- 4. wading splashes ----------------------------------------------------------------------------------------
  let lastSplash = 0, lx = 0, ly = 0;
  const update = P.update;
  P.update = function (dt) {
    const out = update.apply(this, arguments);
    const r = this.raid, p = this.player;
    if (A.enabled && r && p && this.mode === 'play' && !this.panel) {
      const moved = Math.hypot(p.x - lx, p.y - ly); lx = p.x; ly = p.y;
      const now = performance.now() / 1000;
      if (moved > 0.4 && moved < 60 && now - lastSplash > 0.3 && this.isWater?.(p.x, p.y + 17)) {
        lastSplash = now; A.splashes.push({ x: p.x + (Math.random() - .5) * 6, y: p.y + 14, at: now }); A.stats.splashes++;
        if (A.splashes.length > 12) A.splashes.shift();
      }
    }
    return out;
  };

  const css = document.createElement('style');
  css.textContent = `.itemArt.swArtIcon{image-rendering:auto;object-fit:contain}`;
  document.head.appendChild(css);
})();
