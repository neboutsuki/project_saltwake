/* SALTWAKE v0.31 systems pass (layers on the existing engine; no parallel AI or combat).
 * 1. Pack alert: when a monster is hurt, nearby monsters of the same kind join the fight (Barnacle-Hound style packs,
 *    Brineworn groups). Neutral prey are not dragged in.
 * 2. Hit-stop: a short slow-down on heavy hits and part breaks, so strong blows feel heavy. Real time keeps running;
 *    only the simulation slows for a few frames.
 * 3. Danger cue: the round minimap gets a red pulse while an alerted monster is close (icon-only HUD, no text).
 * window.saltwakeSystems exposes settings and counters for QA.
 */
(() => {
  const P = Game.prototype;
  const S = window.saltwakeSystems = {
    packRadius: 260, packAggro: 3.5, hitStopHeavy: 0.045, hitStopBreak: 0.09, hitStopScale: 0.12,
    dangerRadius: 420, enabled: { pack: true, hitStop: true, danger: true },
    stats: { packAlerts: 0, hitStops: 0 }, hitStop: 0,
  };
  const defOf = (g, e) => (g.world?.content?.enemies || []).find(t => t.id === e.type) || {};

  const hit = P.hitMonster;
  P.hitMonster = function (e, damage, meta, x, y) {
    const r = this.raid, before = e && e.hp, broken = new Set((e?.parts || []).filter(p => p.broken).map(p => p.id));
    const out = hit.apply(this, arguments);
    if (!r || !e || this.raid !== r) return out;
    const dealt = Math.max(0, (before || 0) - e.hp);
    // Pack alert
    if (S.enabled.pack && dealt > 0) {
      for (const o of r.enemies) {
        if (o === e || o.dead || o.type !== e.type) continue;
        if (defOf(this, o).neutral) continue;
        if (Math.hypot(o.x - e.x, o.y - e.y) > S.packRadius) continue;
        if ((o.aggro || 0) < S.packAggro) { o.aggro = S.packAggro; S.stats.packAlerts++; }
      }
    }
    // Hit-stop
    if (S.enabled.hitStop) {
      const brokeNow = (e.parts || []).some(p => p.broken && !broken.has(p.id));
      const stop = brokeNow || (e.dead && before > 0) ? S.hitStopBreak : dealt >= 18 ? S.hitStopHeavy : 0;
      if (stop > S.hitStop) { S.hitStop = stop; S.stats.hitStops++; }
    }
    return out;
  };

  let dangerT = 0, dangerOn = false;
  const update = P.update;
  P.update = function (dt) {
    if (S.hitStop > 0) { const real = dt; dt *= S.hitStopScale; S.hitStop = Math.max(0, S.hitStop - real); }
    const out = update.call(this, dt);
    dangerT -= dt;
    if (dangerT <= 0) {
      dangerT = 0.25;
      let on = false;
      const r = this.raid, p = this.player;
      if (S.enabled.danger && r && p && this.mode === 'play') {
        for (const e of r.enemies) {
          if (e.dead || !(e.aggro > 0 || e.awareness === 'alert')) continue;
          if (defOf(this, e).neutral && e.hp >= e.max) continue;
          if (Math.hypot(e.x - p.x, e.y - p.y) < S.dangerRadius) { on = true; break; }
        }
      }
      if (on !== dangerOn) { dangerOn = on; document.getElementById('tideHud')?.classList.toggle('sw-danger', on); }
    }
    return out;
  };
  S.danger = () => dangerOn;

  const css = document.createElement('style');
  css.textContent = `
  #tideHud.sw-danger{animation:swDanger 1.1s ease-in-out infinite}
  @keyframes swDanger{0%,100%{box-shadow:0 0 0 2px rgba(220,70,60,.55),0 0 14px rgba(220,70,60,.35)}
   50%{box-shadow:0 0 0 2px rgba(220,70,60,.9),0 0 26px rgba(220,70,60,.6)}}
  @media (prefers-reduced-motion:reduce){#tideHud.sw-danger{animation:none;box-shadow:0 0 0 2px rgba(220,70,60,.8)}}`;
  document.head.appendChild(css);
})();
