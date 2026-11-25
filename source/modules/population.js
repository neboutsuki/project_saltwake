/* SALTWAKE field population (v0.31): fills the large Outer Quays by district.
 * The map's "population" list (tools/make_maps.py) adds groups on top of the engine's eight wildlife spawns:
 *   [type, x, y, count, spread, when]   when = 'any' | 'day' | 'night' (raid start time decides)
 * No extra Wreckers (living hostile humans stay rare) and no Brineworn on the very first expedition.
 * Wildlife types (brineback, widow, gull, wrecker, grazer) are built like the engine's own spawns; Brineworn types use
 * the alpha layer's definitions. Every new actor gets the engine's perception state (initSense) and a walkable spot.
 * Extra loot containers are plain world data (content.containers, ids c_qx_*), so the loot system handles them.
 * window.saltwakePopulation exposes the last spawn report for QA.
 */
(() => {
  const P = Game.prototype;
  const POP = window.saltwakePopulation = { enabled: true, last: null };
  const BRINE = /^brineworn_/;
  function make(G, type, x, y, id, i) {
    if (BRINE.test(type)) return window.saltwakeAlpha?.makeAltered?.(G, type, x, y, id) || null;
    const d = (G.world.content.enemies || []).find(t => t.id === type); if (!d) return null;
    return { id, type, x, y, homeX: x, homeY: y, hp: d.health, maxHp: d.health, dead: false, aggro: 0, attackCD: 1.2, walk: i * 1.3, phase: i,
      factionId: type === 'wrecker' ? 'wreckers' : 'wildlife', actorType: type === 'wrecker' ? 'human' : 'monster', provoked: false };
  }
  const spawn = P.spawnEnemies;
  P.spawnEnemies = function () {
    const list = spawn.apply(this, arguments), m = this.world.maps.quays;
    if (!POP.enabled || !Array.isArray(list) || !m?.population) return list;
    const first = (this.save?.completedRaids || 0) === 0;   // the first expedition stays a gentle introduction
    const night = !!this.climateState?.().night, X = window.saltwakeTiles, report = { night, added: 0, byType: {} };
    const prevMap = this.mapId; this.mapId = 'quays';      // walk checks run against the field map
    try {
      let n = 0;
      m.population.forEach(([type, gx, gy, count, spread, when], gi) => {
        if ((when === 'day' && night) || (when === 'night' && !night)) return;
        if ((first && BRINE.test(type)) || type === 'wrecker') return;   // living hostile humans stay rare (project rule)
        for (let k = 0; k < count; k++) {
          const a = (gi * 7 + k * 2.4), r = spread ? spread * (.4 + .6 * ((k * 37 + gi * 11) % 10) / 10) : 0;
          let x = gx + Math.cos(a) * r, y = gy + Math.sin(a) * r;
          if (X?.nearestWalkable) [x, y] = X.nearestWalkable(this, x, y);
          const e = make(this, type, x * 32, y * 32, `pop_${type}_${gi}_${k}`, n++);
          if (!e) continue;
          try { this.initSense?.(e); } catch (err) { }
          list.push(e); report.added++; report.byType[type] = (report.byType[type] || 0) + 1;
        }
      });
    } finally { this.mapId = prevMap; }
    POP.last = report;
    return list;
  };
})();
