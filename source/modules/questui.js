/* SALTWAKE quest display (v0.31).
 * - Journal / contract board: tabs (Story · Side · Commissions), quest cards with type tag, giver portrait and status;
 *   a detail view with the giver, summary, a step checklist (done / current / upcoming), rewards with item icons and
 *   Hunter XP, location, and Track / Accept / Show on map. The quest engine, stages and rewards are unchanged.
 * - Tracking: you choose the tracked quest (save.trackedQuest); the HUD tracker, map marker and world marker follow it.
 * - World marker: a diamond over the current objective when it is on screen, or an arrow at the screen edge pointing
 *   to it with the distance; "Other region" when it is on another map.
 * - Talking to a quest giver adds "Any work?" lines for their available quests (accept from the conversation).
 * window.saltwakeQuestUI exposes helpers for QA.
 */
(() => {
  const P = Game.prototype, T = 32, $ = id => document.getElementById(id);
  const UI = window.saltwakeQuestUI = { tab: 'story', stats: { markers: 0 } };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const QE = typeof QuestEngine !== 'undefined' ? QuestEngine : null;
  const LC = () => (typeof LIVING_CONTRACTS !== 'undefined' ? LIVING_CONTRACTS : {});
  const icon = id => { const im = window.saltwakeArt?.iconFor?.(id); return im ? `<img src="${im}" alt="">` : '<span class="swqNoIcon">◆</span>'; };
  const itemName = id => { try { return itemDef(id).name; } catch (e) { return id; } };
  const portrait = npc => npc ? window.saltwakeDialogue?.npcPortrait?.(npc)?.src : null;

  // ---- tracking ---------------------------------------------------------------------------------------------------
  if (QE) {
    const cur = QE.prototype.current;
    QE.prototype.current = function () {
      const id = this.game.save.trackedQuest, q = id && this.data(id);
      if (q && this.progress(q)) return q;
      return cur.apply(this, arguments);
    };
    const acc = QE.prototype.accept;
    QE.prototype.accept = function (id) { const ok = acc.apply(this, arguments); if (ok) this.game.save.trackedQuest = id; return ok; };
  }
  const tracked = g => g.quest?.current?.();

  // ---- journal ----------------------------------------------------------------------------------------------------
  const kindOf = q => q.kind === 'main' ? 'story' : 'side';
  function stepIcon(i, cur, done) { return done || i < cur ? '✓' : i === cur ? '◆' : '○'; }
  function detail(g, q, board) {
    const E = g.quest, st = E.state(q.id), stage = E.progress(q), done = st?.status === 'done', avail = E.available(q);
    const giver = g.world.content.npcs.find(n => n.id === q.offeredBy), pic = portrait(giver), loc = E.location(q);
    const hx = window.saltwakeHunter?.XP?.story || 0, isTr = tracked(g) === q;
    const steps = q.stages.map((s, i) => `<li class="${done || (st && i < st.stage) ? 'done' : st && i === st.stage ? 'now' : ''}"><span>${stepIcon(i, st ? st.stage : -1, done)}</span>${esc(s.description)}</li>`).join('');
    const rewards = `<div class="swqRewards"><span class="swqScrip">${q.rewards.coins || 0} scrip</span>${(q.rewards.items || []).map(r => `<span class="swqItem">${icon(r.itemId)}${r.quantity} × ${esc(itemName(r.itemId))}</span>`).join('')}${hx ? `<span class="swqXp">+${hx} XP</span>` : ''}</div>`;
    const where = loc ? `${esc(loc.name)} · ${esc(g.world.maps[loc.mapId]?.name || '')}` : '';
    const btn = done ? '<span class="swqDone">Completed</span>'
      : stage ? `<button data-act="swq_track" data-id="${esc(q.id)}" ${isTr ? 'disabled' : ''}>${isTr ? '◆ Tracked' : 'Track'}</button><button data-ui="map">Show on map</button>`
        : avail ? (board ? `<button class="primary" data-act="accept" data-id="${esc(q.id)}">Accept</button>` : `<p class="fine">Talk to ${esc(giver?.name || 'the giver')} or use the Contract Board to accept.</p>`) : '';
    return `<article class="swqDetail">
      <header>${pic ? `<img class="swqGiver" src="${pic}" alt="">` : ''}<div><span class="swqTag ${kindOf(q)}">${kindOf(q) === 'story' ? 'Story' : 'Side'}</span><h2>${esc(q.title)}</h2><small>From ${esc(giver?.name || 'the harbor')}${giver?.role ? ' · ' + esc(giver.role) : ''}</small></div></header>
      <p class="swqSummary">${esc(q.summary || '')}</p>
      <h4>Steps</h4><ol class="swqSteps">${steps}</ol>
      ${where && !done ? `<p class="swqWhere">◎ ${where}</p>` : ''}
      <h4>Rewards</h4>${rewards}
      <div class="swqActions">${btn}</div></article>`;
  }
  function commissions(g) {
    const s = g.livingState?.(), c = s?.active && LC()[s.active.id], l = g.raid?.living;
    if (!c) return `<p class="emptyNote">No commission carried. Pick one at the Contract Notice Board in Lantern Square.</p><p class="fine">${s?.completed || 0} commissions fulfilled.</p>`;
    const t = window.saltwakeHunter?.tierOf?.(c) || 1;
    const steps = c.steps.map((st, i) => { const cur = l ? l.step : 0, cnt = l && i === cur ? l.count : i < cur ? st.need : 0;
      return `<li class="${i < cur || l?.completed ? 'done' : i === cur ? 'now' : ''}"><span>${i < cur || l?.completed ? '✓' : i === cur ? '◆' : '○'}</span>${esc(st.label)} <b>${cnt}/${st.need}</b></li>`; }).join('');
    return `<article class="swqDetail"><header><div><span class="swqTag hunt">${esc(c.category)}</span> <span class="swTier">${'★'.repeat(t)}${'☆'.repeat(3 - t)}</span><h2>${esc(c.title)}</h2></div></header>
      <p class="swqSummary">${esc(c.description)}</p><h4>Steps</h4><ol class="swqSteps">${steps}</ol>
      <h4>Rewards</h4><div class="swqRewards"><span class="swqScrip">${c.reward.scrip} scrip</span>${(c.reward.items || []).map(r => `<span class="swqItem">${icon(r.itemId)}${r.quantity} × ${esc(itemName(r.itemId))}</span>`).join('')}<span class="swqXp">+${(window.saltwakeHunter?.XP?.tier || 50) * t} XP</span></div>
      <p class="fine">${l ? (l.completed ? 'Objective complete: extract alive to collect.' : 'Progress counts on this expedition.') : 'Progress counts once you deploy.'}</p></article>`;
  }
  P.journal = function (board = false) {
    const title = board ? 'CONTRACT NOTICE BOARD' : 'QUEST JOURNAL', E = this.quest, qs = this.world.content.quests;
    const tab = UI.tab, listOf = k => qs.filter(q => kindOf(q) === k && (E.state(q.id) || E.available(q)));
    const groups = { story: listOf('story'), side: listOf('side') };
    const order = q => E.progress(q) ? 0 : E.available(q) ? 1 : 2;
    let body;
    if (tab === 'commissions') body = `<div class="swqOne">${commissions(this)}</div>`;
    else {
      const list = groups[tab].slice().sort((a, b) => order(a) - order(b));
      let sel = list.find(q => q.id === this.journalChoice) || (board ? list.find(q => E.available(q)) : null) || list.find(q => q === tracked(this)) || list[0];
      this.journalChoice = sel?.id;
      const cards = list.map(q => { const st = E.state(q.id), done = st?.status === 'done', act = !!E.progress(q), giver = this.world.content.npcs.find(n => n.id === q.offeredBy), pic = portrait(giver);
        return `<button class="swqCard ${q === sel ? 'on' : ''} ${done ? 'done' : ''}" data-act="inspectquest" data-id="${esc(q.id)}">${pic ? `<img src="${pic}" alt="">` : '<span class="swqPic"></span>'}<span><b>${esc(q.title)}</b><small>${done ? 'Completed' : act ? `Step ${st.stage + 1} of ${q.stages.length}${q === tracked(this) ? ' · ◆ tracked' : ''}` : 'Available'}</small></span></button>`; }).join('');
      body = list.length ? `<div class="swqSplit"><nav class="swqList">${cards}</nav>${sel ? detail(this, sel, board) : ''}</div>` : '<p class="emptyNote">Nothing here yet. Talk to people in the harbor to find work.</p>';
    }
    const n = k => groups[k]?.filter(q => E.progress(q) || E.available(q)).length || 0;
    const tabs = `<nav class="swqTabs">${[['story', 'Story', n('story')], ['side', 'Side quests', n('side')], ['commissions', 'Commissions', this.livingState?.().active ? 1 : 0]].map(([k, l, c]) =>
      `<button data-act="swq_tab" data-tab="${k}" ${tab === k ? 'aria-current="page"' : ''}>${l}${c ? ` <i>${c}</i>` : ''}</button>`).join('')}${board ? '<button data-act="living_board" class="swqBoardBtn">Field commissions ›</button>' : ''}</nav>`;
    this.open(title, `<div class="swqWrap">${tabs}${body}</div>`);
  };
  const act = P.doAction;
  P.doAction = function (a, n) {
    if (a === 'swq_tab') { UI.tab = n.dataset.tab; this.journalChoice = null; return this.journal(this.panel === 'CONTRACT NOTICE BOARD'); }
    if (a === 'swq_track') { this.save.trackedQuest = n.dataset.id; this.store?.(); this.notify('Tracking: ' + (this.quest.data(n.dataset.id)?.title || ''), 2); return this.journal(this.panel === 'CONTRACT NOTICE BOARD'); }
    return act.apply(this, arguments);
  };

  // ---- dialogue: givers offer their available quests ---------------------------------------------------------------
  const talk = P.talk;
  P.talk = function (n) {
    const out = talk.apply(this, arguments), d = this.dialogue;
    if (!d || !n) return out;
    const offers = this.world.content.quests.filter(q => q.offeredBy === n.id && this.quest.available(q));
    const already = new Set(d.dialogue.nodes.flatMap(x => (x.choices || []).map(c => c.action?.questId)).filter(Boolean));
    const extra = offers.filter(q => !already.has(q.id));
    if (!extra.length) return out;
    const dl = JSON.parse(JSON.stringify(d.dialogue)), start = dl.nodes.find(x => x.id === dl.startNode);
    if (!start) return out;
    start.choices = start.choices || [];
    const bye = start.choices.findIndex(c => !c.next && !c.action), at = bye < 0 ? start.choices.length : bye;
    start.choices.splice(at, 0, ...extra.map(q => ({ text: `Any work for me? (${q.title})`, next: '_swq_' + q.id, action: { type: 'offer_quest', questId: q.id } })));
    for (const q of extra) dl.nodes.push({ id: '_swq_' + q.id, text: q.summary || q.title, choices: [{ text: 'I’ll see it done.' }] });
    d.dialogue = dl; this.dialogueView();
    return out;
  };

  // ---- world marker --------------------------------------------------------------------------------------------------
  function target(g) {
    const ex = UI.extraTarget?.(g); if (ex) return ex;
    const q = tracked(g); if (!q) return null;
    const loc = g.quest.location(q); if (!loc) return null;
    let x = loc.x * T, y = loc.y * T;
    if (loc.kind === 'talk' || loc.kind === 'available') { const n = g.world.content.npcs.find(k => k.name === loc.name); const at = n && g.npcLocation?.(n); if (at) { x = at.x; y = at.y; } }
    return { q, loc, x, y };
  }
  UI.target = target;
  const light = P.drawPinewallLight;
  P.drawPinewallLight = function (now) {
    const out = light.apply(this, arguments);
    if (this.mode !== 'play' || this.panel) return out;
    const t = target(this); if (!t) return out;
    const z = this.camera.zoom, p = this.player;
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
    if (t.loc.mapId !== this.mapId) { g.restore(); return out; }
    const X = (t.x - this.camera.x) * z, Y = (t.y - 70 - this.camera.y) * z, m = 34, dist = Math.round(Math.hypot(t.x - p.x, t.y - p.y) / T);
    const on = X > m && Y > m && X < VW - m && Y < VH - m, bob = Math.sin(now / 300) * 3;
    g.font = '600 11px system-ui,sans-serif'; g.textAlign = 'center';
    if (on) {
      if (dist > 2) { g.globalAlpha = .95; diamond(X, Y + bob, 7); g.fillStyle = 'rgba(255,240,200,.95)'; g.shadowColor = '#000'; g.shadowBlur = 3; g.fillText(dist + ' m', X, Y + bob - 13); }
    } else {
      const cx = VW / 2, cy = VH / 2, a = Math.atan2(Y - cy, X - cx), k = Math.min((VW / 2 - m) / Math.abs(Math.cos(a) || 1e-6), (VH / 2 - m) / Math.abs(Math.sin(a) || 1e-6));
      const ex = cx + Math.cos(a) * k, ey = cy + Math.sin(a) * k;
      g.save(); g.translate(ex, ey); g.rotate(a); g.fillStyle = 'rgba(232,209,143,.95)'; g.strokeStyle = 'rgba(20,16,10,.8)'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(14, 0); g.lineTo(-6, -9); g.lineTo(-2, 0); g.lineTo(-6, 9); g.closePath(); g.stroke(); g.fill(); g.restore();
      g.fillStyle = 'rgba(255,240,200,.95)'; g.shadowColor = '#000'; g.shadowBlur = 3; g.fillText(dist + ' m', ex - Math.cos(a) * 24, ey - Math.sin(a) * 24 + 4);
    }
    g.restore(); UI.stats.markers++;
    return out;
  };
  function diamond(x, y, r) { g.beginPath(); g.moveTo(x, y - r); g.lineTo(x + r, y); g.lineTo(x, y + r); g.lineTo(x - r, y); g.closePath(); g.fillStyle = 'rgba(232,209,143,.95)'; g.strokeStyle = 'rgba(20,16,10,.85)'; g.lineWidth = 2; g.stroke(); g.fill(); }

  // ---- HUD tracker: step count + distance --------------------------------------------------------------------------
  const hud = P.hud;
  P.hud = function () {
    const out = hud.apply(this, arguments), t = this.mode === 'play' && target(this), el = $('questObjective');
    if (el && t && t.q && t.q.stages) {
      const st = this.quest.state(t.q.id), d = t.loc.mapId === this.mapId ? Math.round(Math.hypot(t.x - this.player.x, t.y - this.player.y) / T) + ' m' : this.world.maps[t.loc.mapId]?.name;
      const tag = el.querySelector('.swqStep') || el.appendChild(Object.assign(document.createElement('span'), { className: 'swqStep' }));
      tag.textContent = ` · ${st ? st.stage + 1 : 1}/${t.q.stages.length} · ${d}`;
    }
    return out;
  };

  const css = document.createElement('style');
  css.textContent = `
  .swqWrap{display:flex;flex-direction:column;gap:12px;min-height:0}
  .swqTabs{display:flex;gap:6px;flex-wrap:wrap}.swqTabs button{padding:7px 14px;border-radius:999px}.swqTabs button[aria-current]{background:rgba(143,212,232,.2)!important;border-color:rgba(143,212,232,.6)!important}
  .swqTabs i{font-style:normal;font-size:11px;padding:1px 6px;border-radius:9px;background:rgba(232,209,143,.25);margin-left:4px}.swqBoardBtn{margin-left:auto}
  .swqSplit{display:grid;grid-template-columns:minmax(220px,300px) 1fr;gap:16px;min-height:0}
  .swqList{display:flex;flex-direction:column;gap:6px;overflow:auto;max-height:60vh;padding-right:4px}
  .swqCard{display:flex!important;gap:10px;align-items:center;text-align:left;padding:8px!important;border-radius:10px!important}
  .swqCard img,.swqPic{width:40px;height:40px;border-radius:8px;object-fit:cover;flex:none;background:rgba(255,255,255,.06)}
  .swqCard b{display:block;font-size:14px}.swqCard small{opacity:.7;font-size:12px}.swqCard.on{outline:1px solid rgba(143,212,232,.6);background:rgba(143,212,232,.12)!important}.swqCard.done{opacity:.55}
  .swqDetail header{display:flex;gap:14px;align-items:center}.swqGiver{width:84px;height:84px;border-radius:12px;object-fit:cover;border:1px solid rgba(255,255,255,.15)}
  .swqDetail h2{margin:4px 0 2px}.swqDetail h4{margin:16px 0 6px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;opacity:.7}
  .swqTag{font-size:11px;letter-spacing:.1em;text-transform:uppercase;padding:2px 8px;border-radius:6px;background:rgba(255,255,255,.08)}.swqTag.story{color:#e8d18f}.swqTag.side{color:#9ad4c0}.swqTag.hunt{color:#e89a7a}
  .swqSummary{line-height:1.5;margin:10px 0 0}
  .swqSteps{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}.swqSteps li{display:flex;gap:10px;align-items:baseline;opacity:.65}
  .swqSteps li span{width:16px;text-align:center;color:#8fd4e8}.swqSteps li.now{opacity:1;font-weight:600}.swqSteps li.now span{color:#e8d18f}.swqSteps li.done{opacity:.5;text-decoration:line-through}
  .swqRewards{display:flex;flex-wrap:wrap;gap:8px}.swqRewards>span{display:inline-flex;align-items:center;gap:6px;padding:5px 10px;border-radius:8px;background:rgba(255,255,255,.06)}
  .swqRewards img{width:22px;height:22px;object-fit:contain}.swqScrip{color:#e8d18f}.swqXp{color:#8fd4e8}
  .swqWhere{margin:12px 0 0;opacity:.8}.swqActions{display:flex;gap:8px;margin-top:16px}.swqDone{color:#9ad4c0}
  .swqOne{max-width:720px}.swqStep{opacity:.7;font-size:.9em}
  @media (max-width:760px){.swqSplit{grid-template-columns:1fr}.swqList{max-height:30vh}}`;
  document.head.appendChild(css);
})();
