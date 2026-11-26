/* SALTWAKE commission types (v0.31): four new kinds of field commission on top of the existing hunt / salvage /
 * part-break / tracking / stealth steps. All progress still goes through the engine's livingAdvance(), and the reward
 * is still paid on a safe extraction.
 *   escort  - a salvager walks with you to a site. Monsters near them hurt them; if they fall the commission fails.
 *   deliver - pick up fragile cargo (E) and bring it to a site; take more hits than the cargo allows and it breaks.
 *   wound   - bring a monster below 35% health without killing it; it is tagged and flees (capture-style hunt).
 *   hold    - stand at a site for N seconds while Brineworn come for you (defense, usually at night).
 * Sites are named points on the Outer Quays (SITES). A marker points to the current site.
 * Also: a story choice. After Talla's Missing Crew, Talla asks what to do with the Wreckers' ledger; the answer
 * changes faction standing and the reward (save.flags.wreckerLedger).
 * window.saltwakeContracts exposes the site table and state for QA.
 */
(() => {
  const P = Game.prototype, T = 32;
  const SITES = {
    lighthouse: { x: 203, y: 121.5, name: 'the lighthouse stump' }, customs: { x: 100, y: 52, name: 'the Customs Forecourt' },
    pilot: { x: 64, y: 116, name: 'the Pilot Shed' }, slip_edge: { x: 162, y: 89, name: 'the Boathouse Slip gate' },
    fishmarket: { x: 90, y: 97, name: 'the Old Fish Market' }, camp: { x: 30, y: 98, name: 'the Wreckers’ Camp' },
    beacon: { x: 128, y: 32.5, name: 'the watch beacon' }, shrine: { x: 160, y: 59, name: 'the ridge shrine' },
  };
  const CT = window.saltwakeContracts = { SITES, stats: { escorts: 0, delivered: 0, broken: 0, tagged: 0, held: 0 } };
  const LC = () => (typeof LIVING_CONTRACTS !== 'undefined' ? LIVING_CONTRACTS : {});
  const cur = g => { const l = g.raid?.living, c = l && LC()[l.id]; if (!c || l.failed || l.completed || !l.eligible) return null; const s = c.steps[l.step]; return s ? { l, c, s } : null; };
  CT.current = cur;
  const near = (g, site, r) => Math.hypot(g.player.x - site.x * T, g.player.y - site.y * T) < r * T;
  const nearestOpen = (g, x, y) => window.saltwakeTiles?.nearestWalkable ? window.saltwakeTiles.nearestWalkable(g, x, y) : [x, y];
  function fail(g, l, why) { l.failed = true; g.notify('COMMISSION FAILED · ' + why, 4); }

  // set-up when an expedition starts
  const begin = P.beginRaid;
  P.beginRaid = function () {
    const out = begin.apply(this, arguments), r = this.raid; if (!r) return out;
    r.contract = {};
    const k = cur(this); if (!k) return out;
    if (k.s.kind === 'escort') { const [x, y] = nearestOpen(this, this.player.x / T + 1.2, this.player.y / T + .6);
      r.contract.escort = { x: x * T, y: y * T, hp: 100, max: 100, dist: 0, last: 0, face: 'front', mirror: false,
        profile: window.saltwakeFaces?.profile('dock', { id: 'escort', color: '5f7a86' }) }; this.notify(`Escort the salvager to ${SITES[k.s.target]?.name}. Keep monsters off them.`, 4); }
    if (k.s.kind === 'deliver') r.contract.cargo = { picked: false, hits: 0, limit: k.s.hits || 3 };
    if (k.s.kind === 'hold') r.contract.hold = { t: 0, wave: 4 };
    return out;
  };

  // per-frame logic
  const upd = P.update;
  P.update = function (dt) {
    const out = upd.apply(this, arguments);
    if (!this.raid || this.isPaused?.() || this.mapId !== 'quays') return out;
    const k = cur(this), R = this.raid.contract || (this.raid.contract = {}); dt = Math.min(.1, dt || 0);
    if (!k) return out;
    const site = SITES[k.s.target], p = this.player;
    if (k.s.kind === 'escort' && R.escort) {
      const e = R.escort, d = Math.hypot(p.x - e.x, p.y - e.y);
      if (d > 56) { const a = Math.atan2(p.y - e.y, p.x - e.x), v = Math.min(d - 50, 175 * dt), nx = e.x + Math.cos(a) * v, ny = e.y + Math.sin(a) * v;
        const prev = this.mapId; let ok = true; try { ok = this.walkable(nx, ny); } catch (err) { }
        if (ok) { e.x = nx; e.y = ny; e.dist += v / T; e.last = performance.now(); } else if (d > 260) { e.x = p.x - Math.cos(a) * 40; e.y = p.y - Math.sin(a) * 40; }
        if (Math.abs(Math.cos(a)) > Math.abs(Math.sin(a))) { e.face = 'side'; e.mirror = Math.cos(a) < 0; } else e.face = Math.sin(a) < 0 ? 'back' : 'front'; }
      for (const m of this.raid.enemies) if (!m.dead && !m.boss && (m.aggro > 0 || m.awareness === 'alert') && Math.hypot(m.x - e.x, m.y - e.y) < 46) { e.hp -= 9 * dt; e.hurt = .2; }
      e.hurt = Math.max(0, (e.hurt || 0) - dt);
      if (e.hp <= 0) { fail(this, k.l, 'The salvager fell'); R.escort = null; }
      else if (site && Math.hypot(e.x - site.x * T, e.y - site.y * T) < 3.2 * T) { CT.stats.escorts++; R.escort = null; this.livingAdvance('escort', k.s.target); }
    }
    if (k.s.kind === 'deliver' && R.cargo?.picked && site && near(this, site, 3)) { CT.stats.delivered++; R.cargo.picked = false; R.cargo.done = true; this.livingAdvance('deliver', k.s.target); }
    if (k.s.kind === 'hold' && site && R.hold) {
      if (near(this, site, 4.5)) {
        R.hold.t += dt; R.hold.wave -= dt;
        if (R.hold.wave <= 0) { R.hold.wave = 9; for (let i = 0; i < 2; i++) { const a = Math.random() * 6.28, [x, y] = nearestOpen(this, site.x + Math.cos(a) * 9, site.y + Math.sin(a) * 7);
          const m = window.saltwakeAlpha?.makeAltered?.(this, Math.random() < .2 ? 'brineworn_breaker' : 'brineworn_drifter', x * T, y * T, 'hold_' + Math.round(Math.random() * 1e6));
          if (m) { try { this.initSense?.(m); } catch (err) { } m.aggro = 6; m.awareness = 'alert'; m.provoked = true; this.raid.enemies.push(m); } } }
        while (R.hold.t >= 1) { R.hold.t -= 1; this.livingAdvance('hold', k.s.target); if (!cur(this) || cur(this).s.kind !== 'hold') { CT.stats.held++; break; } }
      }
    }
    return out;
  };
  // deliver: pick up with E at the pickup site; hits break it
  const interact = P.interact;
  P.interact = function () {
    const k = this.raid && cur(this), R = this.raid?.contract;
    if (k && k.s.kind === 'deliver' && R?.cargo && !R.cargo.picked && !R.cargo.done && near(this, SITES[k.s.from] || {}, 2.5)) {
      R.cargo.picked = true; R.cargo.hits = 0; this.notify(`Fragile cargo taken · Bring it to ${SITES[k.s.target]?.name}. It survives ${R.cargo.limit - 1} hit${R.cargo.limit - 1 === 1 ? '' : 's'}.`, 4); return;
    }
    return interact.apply(this, arguments);
  };
  const hurt = P.hurtPlayer;
  P.hurtPlayer = function () {
    const before = this.player.hp, out = hurt.apply(this, arguments), R = this.raid?.contract, k = this.raid && cur(this);
    if (k && R?.cargo?.picked && this.player.hp < before) { R.cargo.hits++; if (R.cargo.hits >= R.cargo.limit) { R.cargo.picked = false; CT.stats.broken++; fail(this, k.l, 'The cargo broke'); } else this.notify(`Cargo jolted · ${R.cargo.limit - R.cargo.hits} more hit${R.cargo.limit - R.cargo.hits === 1 ? '' : 's'} and it breaks`, 2.2); }
    return out;
  };
  // wound: below 35% health and alive -> tagged, flees
  const hit = P.hitMonster;
  P.hitMonster = function (e) {
    const k = this.raid && cur(this), alive = e && !e.dead;
    const out = hit.apply(this, arguments);
    if (k && k.s.kind === 'wound' && alive && !e.dead && !e.tagged && e.type === k.s.target && e.hp <= e.maxHp * .35) {
      e.tagged = true; e.aggro = 0; e.provoked = false; e.awareness = 'idle'; e.homeX = e.x + (e.x - this.player.x) * 4; e.homeY = e.y + (e.y - this.player.y) * 4;
      CT.stats.tagged++; this.notify('Tagged! It flees, wounded and marked for the guild.', 3); this.livingAdvance('wound', e.type);
    }
    return out;
  };

  // marker target for the quest UI + escort drawing
  const UI = window.saltwakeQuestUI;
  if (UI) UI.extraTarget = g => {
    const k = g.raid && cur(g); if (!k || !['escort', 'deliver', 'hold'].includes(k.s.kind)) return null;
    const R = g.raid.contract || {}, siteId = k.s.kind === 'deliver' && !R.cargo?.picked ? k.s.from : k.s.target, s = SITES[siteId];
    return s ? { q: null, loc: { mapId: 'quays', name: s.name }, x: s.x * T, y: s.y * T + 40 } : null;
  };
  const scene = P.drawCoastScene;
  P.drawCoastScene = function () {
    const out = scene.apply(this, arguments), R = this.raid?.contract;
    if (R?.escort && window.saltwakeFaces) { const e = R.escort, fr = performance.now() - e.last < 150 ? Math.floor(e.dist / .22) % 4 : 0, bh = 52 * 1.4;
      g.save(); if (e.hurt) g.filter = 'brightness(1.8)'; window.saltwakeFaces.render(g, e.profile, e.face, e.mirror, fr, e.x, e.y + 2, bh * 40 / 56, bh); g.restore();
      g.save(); g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(e.x - 18, e.y - 82, 36, 5); g.fillStyle = '#9ad4c0'; g.fillRect(e.x - 18, e.y - 82, 36 * Math.max(0, e.hp / e.max), 5); g.restore(); }
    const k = this.raid && cur(this);
    if (k?.s.kind === 'hold') { const s = SITES[k.s.target]; if (s) { g.save(); g.strokeStyle = near(this, s, 4.5) ? 'rgba(232,209,143,.8)' : 'rgba(232,209,143,.35)'; g.setLineDash([10, 8]); g.lineWidth = 2;
      g.beginPath(); g.ellipse(s.x * T, s.y * T, 4.5 * T, 3.4 * T, 0, 0, Math.PI * 2); g.stroke(); g.restore(); } }
    if (k?.s.kind === 'deliver' && R?.cargo && !R.cargo.picked && !R.cargo.done) { const s = SITES[k.s.from]; if (s) { g.save(); g.fillStyle = 'rgba(232,209,143,.9)'; g.fillRect(s.x * T - 10, s.y * T - 16, 20, 16); g.strokeStyle = '#2a2016'; g.strokeRect(s.x * T - 10, s.y * T - 16, 20, 16);
      if (near(this, s, 2.5)) { g.fillStyle = 'rgba(255,240,200,.95)'; g.font = '600 12px system-ui'; g.textAlign = 'center'; g.fillText('E · take the fragile cargo', s.x * T, s.y * T - 24); } g.restore(); } }
    return out;
  };

  // ---- story choice: the Wreckers' ledger --------------------------------------------------------------------------
  const talk = P.talk;
  P.talk = function (n) {
    const out = talk.apply(this, arguments), d = this.dialogue;
    if (!d || n?.id !== 'n_salvager') return out;
    const done = this.quest.state('q_lost_crew')?.status === 'done', f = this.save.flags = this.save.flags || {};
    if (!done || f.wreckerLedger) return out;
    const dl = JSON.parse(JSON.stringify(d.dialogue));
    dl.nodes.push({ id: '_ledger', text: 'The satchel held more than letters. A Wrecker ledger: every boat they stripped, every guild captain who looked away. The Guild would hang them with it. The Wreckers would pay well to have it back. Your call.',
      choices: [{ text: 'Give it to the Guild. They should answer for it.', action: { type: 'swq_choice', key: 'wreckerLedger', value: 'guild' } },
                { text: 'Sell it back to the Wreckers. Scrip feeds the harbor.', action: { type: 'swq_choice', key: 'wreckerLedger', value: 'wreckers' } },
                { text: 'Burn it. Some debts are better forgotten.', action: { type: 'swq_choice', key: 'wreckerLedger', value: 'burn' } }] });
    dl.startNode = '_ledger'; d.dialogue = dl; d.node = '_ledger'; this.dialogueView();
    return out;
  };
  const choose = P.choose;
  P.choose = function (i) {
    const d = this.dialogue, node = d?.dialogue.nodes.find(n => n.id === d.node), ch = node?.choices?.[i];
    if (ch?.action?.type === 'swq_choice') {
      const f = this.save.flags = this.save.flags || {}; f[ch.action.key] = ch.action.value;
      const R = { guild: [['licensed_salvagers', 15], ['wreckers', -20], 220], wreckers: [['wreckers', 20], ['licensed_salvagers', -10], 380], burn: [['neutral_crews', 10], null, 120] }[ch.action.value];
      this.save.gold += R[2]; for (const [id, amt] of [R[0], R[1]].filter(Boolean)) this.changeStanding?.(id, amt, 'The Wrecker ledger');
      this.notify(`Choice made · +${R[2]} scrip`, 3); this.store?.(); this.close(); return;
    }
    return choose.apply(this, arguments);
  };
})();
