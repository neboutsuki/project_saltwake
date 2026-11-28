/* SALTWAKE weapon rack (v0.31).
 * - Every basic weapon is always yours: the rank I base of each ranged family (Bow, Arbalest, Wickcaster, Longwatch,
 *   Harpoon Gun) and the three melee weapons (Spear, Knife, Greataxe) are granted if you own no weapon of that family.
 * - Weapons are never lost. A failed expedition still loses what you carried in your pack (and armor worn), but the
 *   weapons you took (with their condition and modifications) stay yours and stay equipped.
 * - The Personal Stash shows a Weapon Rack: every weapon you own, with buttons to equip it as primary, secondary or
 *   melee right there.
 * window.saltwakeRack exposes helpers and counters for QA.
 */
(() => {
  const P = Game.prototype, A = window.SALTWAKE_ARMORY, W = window.saltwakeWeapons;
  const R = window.saltwakeRack = { stats: { granted: 0, kept: 0, equips: 0 } };
  if (!A) return;
  const node = id => A.weapons.find(w => w.id === id);
  const BASES = () => A.weapons.filter(w => w.rank === 1 && w.level === 1 && !w.parent);
  const MELEE_IDS = () => Object.keys(W?.MELEE || {});
  const melee = g => { const m = g.save.melee ||= { owned: { spear: 1 }, level: { spear: 1 }, equipped: 'spear' }; m.owned ||= {}; m.level ||= {}; return m; };

  // ---- always own the basics ---------------------------------------------------------------------------------------
  R.grantBasics = function (g) {
    if (!g?.save || typeof g.ensureArmory !== 'function' || R.busy) return 0;
    R.busy = true; let n = 0;
    try {
      const a = g.ensureArmory();
      for (const b of BASES()) {
        const has = Object.keys(a.owned || {}).some(id => (a.owned[id] || 0) > 0 && node(id)?.family === b.family);
        if (!has) { a.owned[b.id] = 1; a.condition && (a.condition[b.id] ??= 100); n++; }
      }
      const m = melee(g);
      for (const id of MELEE_IDS()) if (!m.owned[id]) { m.owned[id] = 1; m.level[id] ||= 1; n++; }
      if (n) { R.stats.granted += n; g.syncLegacyArms?.(); g.ensureQuickSlots?.(); }
    } finally { R.busy = false; }
    return n;
  };
  const ens = P.ensureArmory;
  if (ens) P.ensureArmory = function () { const a = ens.apply(this, arguments); if (!R.busy && !R.done && this.save) { R.done = true; try { R.grantBasics(this); } finally { R.done = false; } } return a; };

  // ---- weapons survive a failed expedition -------------------------------------------------------------------------
  const end = P.endRaid;
  P.endRaid = function (success, reason) {
    if (success || !this.raid) return end.apply(this, arguments);
    const a = this.ensureArmory(), snap = { equipped: [...a.equipped], owned: {}, condition: {}, mods: {} };
    for (const id of a.equipped) if (id) { snap.owned[id] = a.owned[id] || 1; if (a.condition && id in a.condition) snap.condition[id] = a.condition[id]; if (a.modifications && id in a.modifications) snap.mods[id] = a.modifications[id]; }
    const m = melee(this), mSnap = { owned: { ...m.owned }, equipped: m.equipped };
    const out = end.apply(this, arguments);
    const b = this.ensureArmory();
    for (const [id, n] of Object.entries(snap.owned)) { b.owned[id] = Math.max(b.owned[id] || 0, n); R.stats.kept++; }
    for (const [id, v] of Object.entries(snap.condition)) (b.condition ||= {})[id] = v;
    for (const [id, v] of Object.entries(snap.mods)) (b.modifications ||= {})[id] = v;
    b.equipped = snap.equipped;
    const m2 = melee(this); m2.owned = { ...mSnap.owned, ...m2.owned }; m2.equipped = mSnap.equipped;
    this.syncLegacyArms?.(); this.ensureQuickSlots?.(); this.store?.();
    return out;
  };

  // ---- weapon rack in the Personal Stash ---------------------------------------------------------------------------
  function rackHtml(g) {
    const a = g.ensureArmory(), m = melee(g);
    const ranged = Object.keys(a.owned || {}).filter(id => (a.owned[id] || 0) > 0 && node(id)).sort((x, y) => node(x).family.localeCompare(node(y).family) || node(x).rank - node(y).rank || node(x).level - node(y).level);
    const rows = ranged.map(id => { const n = node(id), slot = a.equipped.indexOf(id), cond = a.condition?.[id];
      return `<div class="swRackRow ${slot >= 0 ? 'on' : ''}"><span><b>${n.name}</b><small>${A.families[n.family]?.name || n.family}${cond != null ? ' · condition ' + Math.round(cond) + '%' : ''}${slot >= 0 ? ' · equipped ' + (slot ? 'secondary' : 'primary') : ''}</small></span>
        <button data-act="sw_rack" data-kind="ranged" data-id="${id}" data-slot="0" ${slot === 0 ? 'disabled' : ''}>Primary</button><button data-act="sw_rack" data-kind="ranged" data-id="${id}" data-slot="1" ${slot === 1 ? 'disabled' : ''}>Secondary</button></div>`; }).join('');
    const mrows = MELEE_IDS().filter(id => m.owned[id]).map(id => { const d = W.MELEE[id], on = m.equipped === id;
      return `<div class="swRackRow ${on ? 'on' : ''}"><span><b>${d.name}${(m.level[id] || 1) > 1 ? ' +' + (m.level[id] - 1) : ''}</b><small>Melee${on ? ' · equipped' : ''}</small></span><button data-act="sw_rack" data-kind="melee" data-id="${id}" ${on ? 'disabled' : ''}>Equip</button></div>`; }).join('');
    return `<section class="swRack"><h3>Weapon Rack</h3><p class="fine">Every weapon you own. Weapons are never lost, even if an expedition fails.</p><div class="swRackGrid">${rows}${mrows}</div></section>`;
  }
  const stash = P.stash;
  P.stash = function () {
    const out = stash.apply(this, arguments);
    try { const body = document.querySelector('#panel .panelBody'); if (body && this.panel === 'PERSONAL STASH' && !body.querySelector('.swRack')) body.insertAdjacentHTML('afterbegin', rackHtml(this)); } catch (e) { }
    return out;
  };
  const act = P.doAction;
  P.doAction = function (a, n) {
    if (a !== 'sw_rack') return act.apply(this, arguments);
    const id = n.dataset.id;
    if (n.dataset.kind === 'melee') { const m = melee(this); if (m.owned[id]) { m.equipped = id; R.stats.equips++; this.store?.(); this.notify?.(`Equipped ${W.MELEE[id].name}`); } }
    else { const a = this.ensureArmory(), slot = +n.dataset.slot, nd = node(id);
      if (nd && [0, 1].includes(slot) && a.owned[id] && !this.raid) {   // same swap rule as the forge: one physical weapon, two slots
        const other = a.equipped.indexOf(id); if (other !== -1 && other !== slot) { const t = a.equipped[slot]; a.equipped[slot] = id; a.equipped[other] = t; } else a.equipped[slot] = id;
        this.player.mag[slot] = 0; if (other !== -1 && other !== slot) this.player.mag[other] = 0;
        this.syncLegacyArms?.(); this.ensureQuickSlots?.(); this.store?.(); R.stats.equips++; this.notify?.(`Equipped ${nd.name} as ${slot ? 'secondary' : 'primary'}`); } }
    return this.stash();
  };
  const css = document.createElement('style');
  css.textContent = `.swRack{margin:0 0 14px;padding:12px 14px;border:1px solid rgba(255,255,255,.08);border-radius:10px;background:rgba(255,255,255,.03)}.swRack h3{margin:0 0 2px}
  .swRackGrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:6px;margin-top:8px}
  .swRackRow{display:flex;align-items:center;gap:6px;padding:6px 8px;border-radius:8px;background:rgba(0,0,0,.25);border:1px solid transparent}.swRackRow.on{border-color:rgba(232,209,143,.45)}
  .swRackRow span{flex:1;min-width:0}.swRackRow b{display:block;font-size:13px}.swRackRow small{opacity:.7;font-size:11px}.swRackRow button{padding:5px 9px;font-size:12px}`;
  document.head.appendChild(css);
})();
