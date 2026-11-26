/* SALTWAKE Hunter Rank (v0.31): the long-term goal of the hunting loop.
 * XP: monster kills, part breaks, extraction, fulfilled commissions (by tier) and story quests. XP earned on an
 *   expedition is pending until you extract; if you fall, half of it is kept.
 * Ranks HR1-HR8. Rank gates progression:
 *   weapon rank 2 / 3 / 4  -> HR2 / HR4 / HR6     armor sets: Redhook HR1, Brineback HR2, Salt Widow HR3
 *   masterwork modifications -> HR5               commissions: tier 1-3 need HR1-3; +1 offer at HR3 and HR5
 * The commission board shows type, threat tier, target, rewards and XP, and locks tiers above your rank.
 * Save: save.hunter = {xp, rank}. window.saltwakeHunter exposes the tables for QA.
 */
(() => {
  const P = Game.prototype;
  const LC = () => (typeof LIVING_CONTRACTS !== 'undefined' ? LIVING_CONTRACTS : null), LD = () => (typeof LIVING_DATA !== 'undefined' ? LIVING_DATA : null);
  const RANKS = [0, 120, 300, 550, 900, 1350, 1900, 2600];
  const KILL = { gull: 4, grazer: 6, brineback: 35, widow: 45, wrecker: 20, human: 10, brineworn_drifter: 15, brineworn_caller: 25, brineworn_breaker: 35 };
  const WEAPON_HR = { 1: 1, 2: 2, 3: 4, 4: 6 }, ARMOR_HR = { harbor: 1, redhook: 1, brineback: 2, widow: 3 }, MOD_HR = 5;
  const XP = { part: 15, extract: 20, story: 100, tier: 50 };
  const HU = window.saltwakeHunter = { RANKS, KILL, WEAPON_HR, ARMOR_HR, MOD_HR, XP, stats: { kills: 0, parts: 0, rankups: 0 } };

  const state = g => { const h = g.save.hunter ||= { xp: 0, rank: 1 }; return h; };
  const rankOf = xp => { let r = 1; for (let i = 0; i < RANKS.length; i++) if (xp >= RANKS[i]) r = i + 1; return r; };
  HU.rankOf = rankOf; HU.rank = g => state(g).rank; HU.state = state;
  HU.next = g => { const h = state(g); return h.rank >= RANKS.length ? null : RANKS[h.rank]; };
  const tierOf = c => c.tier || (c.steps || []).reduce((t, s) => Math.max(t, s.target === 'widow' || /^brineworn/.test(s.target || '') || s.kind === 'quiet_cache' ? 3 : s.target === 'brineback' || s.kind === 'part' ? 2 : 1), 1);
  HU.tierOf = tierOf;

  function bank(g, amount, why) {
    if (!(amount > 0)) return;
    const h = state(g), before = h.rank; h.xp += Math.round(amount); h.rank = rankOf(h.xp);
    if (h.rank > before) { HU.stats.rankups++; g.notify?.(`HUNTER RANK ${h.rank} · ${unlocks(h.rank)}`, 6); }
    g.store?.();
  }
  function unlocks(r) {
    const u = [];
    for (const [k, v] of Object.entries(WEAPON_HR)) if (v === r && k > 1) u.push(`rank ${k} weapons`);
    for (const [k, v] of Object.entries(ARMOR_HR)) if (v === r && k !== 'harbor' && k !== 'redhook') u.push(`${(typeof ARMORY !== 'undefined' && ARMORY.armorSets?.[k]?.name) || k} armor`);
    if (r === MOD_HR) u.push('masterwork modifications');
    if (r <= 3) u.push(`tier ${r} commissions`);
    if (r === 3 || r === 5) u.push('one more commission on the board');
    return u.length ? 'Unlocked: ' + u.join(', ') : 'Stronger standing with the harbor';
  }
  HU.unlocks = unlocks;
  const pend = (g, n) => { if (g.raid) { g.raid.hunterXp = (g.raid.hunterXp || 0) + n; } else bank(g, n); };

  // kills and part breaks (by the player's hits)
  const hit = P.hitMonster;
  P.hitMonster = function (e) {
    const alive = e && !e.dead, broken = new Set((e?.parts || []).filter(p => p.broken).map(p => p.id));
    const out = hit.apply(this, arguments);
    if (!e || !this.raid) return out;
    if (alive && e.dead) { pend(this, KILL[e.type] ?? 10); HU.stats.kills++; }
    const nb = (e.parts || []).filter(p => p.broken && !broken.has(p.id)).length;
    if (nb) { pend(this, XP.part * nb); HU.stats.parts += nb; }
    return out;
  };
  // commissions + extraction
  const end = P.endRaid;
  P.endRaid = function (success) {
    const r = this.raid, done0 = this.livingState?.().completed || 0, active = r?.living && LC()?.[r.living.id];
    const out = end.apply(this, arguments);
    if (!r) return out;
    let xp = r.hunterXp || 0;
    const fulfilled = (this.livingState?.().completed || 0) > done0;
    if (success) { xp += XP.extract; if (fulfilled) xp += XP.tier * tierOf(active || {}); }
    else xp = Math.floor(xp / 2);
    const before = state(this).rank;
    bank(this, xp);
    r.hunterXp = 0;
    const body = document.getElementById('panel')?.querySelector('.panelBody');
    if (body && xp > 0) body.insertAdjacentHTML('afterbegin', `<div class="swHrDebrief"><b>+${xp} Hunter XP</b>${success ? '' : ' <span>(half kept: you fell)</span>'}${state(this).rank > before ? ` · <b>Hunter Rank ${state(this).rank}</b>` : ''}${bar(this)}</div>`);
    return out;
  };
  // story quests
  const QE = window.QuestEngine || (typeof QuestEngine !== 'undefined' ? QuestEngine : null);
  if (QE) { const fin = QE.prototype.finish; QE.prototype.finish = function (id) { const ok = fin.apply(this, arguments); if (ok !== false && this.state(id)?.status === 'done') bank(this.game, XP.story); return ok; }; }

  // gates in the smithy
  const can = P.canForgeNode;
  if (can) P.canForgeNode = function (node) { if (node && state(this).rank < (WEAPON_HR[node.rank] || 1)) return false; return can.apply(this, arguments); };
  const forgeArmor = P.forgeArmor;
  if (forgeArmor) P.forgeArmor = function (id) {
    const piece = typeof armPiece === 'function' ? armPiece(id) : null, need = piece ? ARMOR_HR[piece.set] || 1 : 1;
    if (state(this).rank < need) { this.notify(`Requires Hunter Rank ${need}`); return; }
    return forgeArmor.apply(this, arguments);
  };
  const mw = P.masterwork;
  if (mw) P.masterwork = function () { if (state(this).rank < MOD_HR) { this.notify(`Masterwork modifications require Hunter Rank ${MOD_HR}`); return; } return mw.apply(this, arguments); };
  const panel = P.armoryPanel;
  if (panel) P.armoryPanel = function () {
    const out = panel.apply(this, arguments), root = document.getElementById('panel'), hr = state(this).rank;
    if (!root) return out;
    root.querySelector('.panelBody')?.insertAdjacentHTML('afterbegin', `<div class="swHrLine">Hunter Rank <b>${hr}</b>${bar(this)}</div>`);
    for (const b of root.querySelectorAll('[data-act=forgeweapon][data-id]')) { const n = typeof armNode === 'function' && armNode(b.dataset.id), need = n ? WEAPON_HR[n.rank] || 1 : 1;
      if (hr < need) { b.disabled = true; b.textContent = `Requires HR ${need}`; } }
    for (const b of root.querySelectorAll('[data-act=forgearmor][data-id]')) { const p = typeof armPiece === 'function' && armPiece(b.dataset.id), need = p ? ARMOR_HR[p.set] || 1 : 1;
      if (hr < need) { b.disabled = true; b.textContent = `Requires HR ${need}`; } }
    if (hr < MOD_HR) for (const b of root.querySelectorAll('[data-act=forgemod]')) { b.disabled = true; b.textContent = `Requires HR ${MOD_HR}`; }
    return out;
  };

  // commission board: tiers, targets, XP, locks; more offers at higher rank
  const offers = P.livingOfferList;
  if (offers) P.livingOfferList = function () {
    const L = LD(), base = L?.offersPerWindow, hr = state(this).rank;
    if (L) L.offersPerWindow = base + (hr >= 3 ? 1 : 0) + (hr >= 5 ? 1 : 0);
    try { return offers.apply(this, arguments); } finally { if (L) L.offersPerWindow = base; }
  };
  const accept = P.livingAccept;
  if (accept) P.livingAccept = function (id) { const c = LC()?.[id]; if (c && tierOf(c) > state(this).rank) { this.notify(`Requires Hunter Rank ${tierOf(c)}`); return; } return accept.apply(this, arguments); };
  const TYPE = { HUNT: 'hunt', SALVAGE: 'salvage', SURVEY: 'survey', STEALTH: 'stealth', NIGHT: 'night' };
  const targetText = c => (c.steps || []).map(s => s.kind === 'kill' ? `Hunt ${s.need} × ${name(s.target)}` : s.kind === 'part' ? `Break a ${name(s.target)} ${s.part}` : s.label).join(' → ');
  const name = t => ({ brineback: 'Brineback', widow: 'Salt Widow', gull: 'Redhook Gull', grazer: 'Grazer', brineworn_drifter: 'Brineworn Drifter', brineworn_caller: 'Brineworn Caller', brineworn_breaker: 'Brineworn Breaker' }[t] || t);
  const board = P.livingBoard;
  if (board) P.livingBoard = function () {
    const out = board.apply(this, arguments), root = document.getElementById('panel'), hr = state(this).rank;
    if (!root || !LC()) return out;
    root.querySelector('.livingBoardIntro')?.insertAdjacentHTML('afterbegin', `<div class="swHrLine">Hunter Rank <b>${hr}</b>${bar(this)}</div>`);
    for (const card of root.querySelectorAll('.livingCard')) {
      const title = card.querySelector('h3')?.textContent, c = Object.values(LC()).find(k => k.title === title); if (!c) continue;
      const t = tierOf(c), xp = XP.tier * t, type = TYPE[c.category] || String(c.category || '').toLowerCase();
      card.querySelector('.row')?.insertAdjacentHTML('afterbegin', `<span class="swTier" title="Threat tier ${t}">${'★'.repeat(t)}${'☆'.repeat(3 - t)}</span>`);
      const lt = card.querySelector('.livingType'); if (lt) lt.dataset.type = type;
      card.querySelector('h3')?.insertAdjacentHTML('afterend', `<p class="swTarget">${targetText(c)}</p>`);
      card.querySelector('.fine')?.insertAdjacentHTML('beforeend', ` · <b>+${xp} XP</b>`);
      const b = card.querySelector('[data-act=living_accept]');
      if (b && t > hr) { b.disabled = true; b.textContent = `Requires Hunter Rank ${t}`; card.classList.add('swLocked'); }
    }
    return out;
  };
  // player info shows rank
  const info = P.playerInfo;
  if (info) P.playerInfo = function () { const out = info.apply(this, arguments); document.getElementById('panel')?.querySelector('.panelBody')?.insertAdjacentHTML('afterbegin', `<div class="swHrLine">Hunter Rank <b>${state(this).rank}</b> · ${state(this).xp} XP${bar(this)}<small>Next: ${unlocks(Math.min(8, state(this).rank + 1))}</small></div>`); return out; };

  function bar(g) {
    const h = state(g), lo = RANKS[h.rank - 1], hi = RANKS[h.rank] ?? lo, f = hi > lo ? (h.xp - lo) / (hi - lo) : 1;
    return `<span class="swHrBar" title="${hi > lo ? `${h.xp - lo} / ${hi - lo} XP to HR ${h.rank + 1}` : 'Max rank'}"><i style="width:${Math.round(f * 100)}%"></i></span>`;
  }
  const css = document.createElement('style');
  css.textContent = `.swHrLine,.swHrDebrief{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin:0 0 12px;padding:8px 12px;border-radius:8px;background:rgba(143,212,232,.08);border:1px solid rgba(143,212,232,.22)}
  .swHrLine small{flex-basis:100%;opacity:.75}.swHrDebrief span{opacity:.7}
  .swHrBar{flex:1;min-width:120px;height:6px;border-radius:3px;background:rgba(255,255,255,.12);overflow:hidden}.swHrBar i{display:block;height:100%;background:linear-gradient(90deg,#8fd4e8,#e8d18f)}
  .swTier{color:#e8c46a;letter-spacing:1px;margin-right:6px}.swTarget{font-weight:600;margin:2px 0 6px}
  .livingCard.swLocked{opacity:.55}.livingType[data-type=hunt]{color:#e89a7a}.livingType[data-type=salvage]{color:#a9d4a0}.livingType[data-type=survey]{color:#9ac8e8}`;
  document.head.appendChild(css);
})();
