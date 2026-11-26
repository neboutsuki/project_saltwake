/* SALTWAKE quest slot + errands (v0.31), Monster-Hunter style.
 * - One quest at a time: a story quest OR a field commission fills the single quest slot. Finish or abandon it before
 *   taking another.
 * - Errands run alongside it (side quests and the new 'errand' kind, up to MAX_ERRANDS). They never touch the story.
 * - New stage type 'give': hand an item to a person (deliveries, returning lost belongings). It completes when you
 *   talk to that person while carrying the items (backpack first, then the secure stash). The items are taken.
 * - Abandon: the active story quest (progress resets, it can be accepted again) and the carried commission.
 * - Journal: Story · Errands · Commissions tabs with a "Quest slot" banner.
 * window.saltwakeErrands exposes helpers for QA.
 */
(() => {
  const QE = typeof QuestEngine !== 'undefined' ? QuestEngine : null;
  if (!QE) return;
  const P = Game.prototype, MAX_ERRANDS = 5;
  const ER = window.saltwakeErrands = { MAX_ERRANDS, stats: { given: 0, refused: 0 } };
  const isErrand = q => q && (q.kind === 'errand' || q.kind === 'side');
  const isMain = q => q && !isErrand(q);
  const itemName = id => { try { return itemDef(id).name; } catch (e) { return id; } };
  const quests = g => g.world.content.quests;

  ER.activeMain = g => quests(g).find(q => isMain(q) && g.quest.progress(q)) || null;
  ER.activeErrands = g => quests(g).filter(q => isErrand(q) && g.quest.progress(q));
  ER.commission = g => g.livingState?.().active || null;
  ER.slot = g => { const m = ER.activeMain(g); if (m) return { kind: 'story', title: m.title, id: m.id };
    const c = ER.commission(g); return c ? { kind: 'commission', title: c.title, id: c.id } : null; };
  ER.have = (g, id) => (g.save.bag?.[id] || 0) + (g.raid ? 0 : (g.save.stash?.[id] || 0));
  ER.isErrand = isErrand;

  // ---- accepting: one quest slot, errands capped ------------------------------------------------------------------
  const accept = QE.prototype.accept;
  QE.prototype.accept = function (id) {
    const q = this.data(id), g = this.game;
    if (q && this.available(q)) {
      if (isMain(q)) {
        const s = ER.slot(g);
        if (s) { ER.stats.refused++; g.notify(`One quest at a time · finish or abandon “${s.title}” first`, 4); return false; }
      } else if (ER.activeErrands(g).length >= MAX_ERRANDS) {
        ER.stats.refused++; g.notify(`You can carry ${MAX_ERRANDS} errands at once · finish one first`, 4); return false;
      }
    }
    const ok = accept.apply(this, arguments);
    if (ok && isErrand(q)) g.notify('ERRAND ACCEPTED · ' + q.title);
    return ok;
  };
  const livingAccept = P.livingAccept;
  if (livingAccept) P.livingAccept = function () {
    const m = ER.activeMain(this);
    if (m) { ER.stats.refused++; this.notify(`One quest at a time · finish or abandon “${m.title}” first`, 4); return false; }
    return livingAccept.apply(this, arguments);
  };

  // ---- 'give' stages ----------------------------------------------------------------------------------------------
  function take(g, id, n) {
    const fromBag = Math.min(n, g.save.bag?.[id] || 0);
    if (fromBag) addItem(g.save.bag, id, -fromBag);
    if (n - fromBag) addItem(g.save.stash, id, -(n - fromBag));
  }
  const emit = QE.prototype.emit;
  QE.prototype.emit = function (kind, id) {
    let any = kind === 'give' ? false : emit.apply(this, arguments);
    if (kind !== 'talk' && kind !== 'give') return any;
    const g = this.game;
    for (const q of quests(g)) {
      const st = this.state(q.id), stage = this.progress(q);
      if (!stage || stage.type !== 'give' || stage.targetId !== id) continue;
      const need = stage.count || 1;
      if (ER.have(g, stage.itemId) < need) {
        g.notify(`${q.title} · bring ${need} × ${itemName(stage.itemId)} (you have ${ER.have(g, stage.itemId)})`, 3.5); continue;
      }
      take(g, stage.itemId, need); ER.stats.given++;
      st.stage++; any = true;
      g.notify(`HANDED OVER · ${need} × ${itemName(stage.itemId)}`);
      if (st.stage >= q.stages.length) this.finish(q.id);
    }
    if (any) g.store();
    return any;
  };
  const location = QE.prototype.location;
  QE.prototype.location = function (q) {
    const stage = q && this.progress(q);
    if (!stage || stage.type !== 'give') return location.apply(this, arguments);
    stage.type = 'talk';
    try { const l = location.apply(this, arguments); return l && { ...l, kind: 'talk' }; } finally { stage.type = 'give'; }
  };
  // Story quest goes back to "available"; its quest items stay with you.
  QE.prototype.abandon = function (id) {
    const q = this.data(id), s = this.state(id);
    if (!q || s?.status !== 'active') return false;
    if (this.game.raid) { this.game.notify('You can only abandon quests in the harbor'); return false; }
    delete this.game.save.quests[id];
    if (this.game.save.trackedQuest === id) this.game.save.trackedQuest = null;
    this.game.notify('QUEST ABANDONED · ' + q.title); this.game.store(); return true;
  };

  // ---- journal: Errands tab, slot banner, abandon ---------------------------------------------------------------
  const UI = window.saltwakeQuestUI;
  const journal = P.journal;
  P.journal = function (board = false) {
    if (UI && UI.tab === 'side') UI.tab = 'errands';
    const tab = UI?.tab;
    if (UI && tab === 'errands') UI.tab = 'side';               // questui groups errands under its 'side' list
    const out = journal.apply(this, arguments);
    if (UI) UI.tab = tab;
    const panel = document.getElementById('panel'), wrap = panel?.querySelector('.swqWrap');
    if (!wrap) return out;
    for (const b of wrap.querySelectorAll('.swqTabs [data-tab]')) {
      if (b.dataset.tab === 'side') { b.dataset.tab = 'errands'; b.firstChild.textContent = 'Errands'; }
      if (b.dataset.tab === 'errands' && tab === 'errands') b.setAttribute('aria-current', 'page');
    }
    for (const t of wrap.querySelectorAll('.swqTag.side')) t.textContent = 'Errand';
    const s = ER.slot(this), e = ER.activeErrands(this).length;
    const banner = document.createElement('div'); banner.className = 'swqSlot' + (s ? ' full' : '');
    banner.innerHTML = s
      ? `<span>Quest</span><b></b><small>${s.kind === 'story' ? 'Story quest' : 'Commission'} · one at a time</small><button data-act="swq_abandon" data-kind="${s.kind}" data-id="">Abandon</button><em>Errands ${e}/${MAX_ERRANDS}</em>`
      : `<span>Quest</span><b>Slot free</b><small>Take a story quest or a commission</small><em>Errands ${e}/${MAX_ERRANDS}</em>`;
    if (s) { banner.querySelector('b').textContent = s.title; banner.querySelector('button').dataset.id = s.id; if (this.raid) banner.querySelector('button').disabled = true; }
    wrap.insertBefore(banner, wrap.firstChild.nextSibling);
    // Accept buttons on story quests are disabled while the slot is taken.
    const sel = this.journalChoice && this.quest.data(this.journalChoice);
    if (sel && isMain(sel) && s) for (const b of wrap.querySelectorAll('[data-act="accept"]')) { b.disabled = true; b.title = 'Finish or abandon your current quest first'; }
    if (sel && isErrand(sel) && this.quest.progress(sel) && !this.raid) {
      const acts = wrap.querySelector('.swqActions');
      if (acts) acts.insertAdjacentHTML('beforeend', `<button data-act="swq_abandon" data-kind="errand" data-id="${sel.id}">Drop errand</button>`);
    }
    if (sel && this.quest.progress(sel)?.type === 'give') {
      const st = this.quest.progress(sel), have = ER.have(this, st.itemId), now = wrap.querySelector('.swqSteps li.now');
      if (now) now.insertAdjacentHTML('beforeend', ` <b class="swqHave ${have >= (st.count || 1) ? 'ok' : ''}">${Math.min(have, st.count || 1)}/${st.count || 1}</b>`);
    }
    return out;
  };
  const act = P.doAction;
  P.doAction = function (a, n) {
    if (a === 'swq_tab' && n.dataset.tab === 'errands') { if (UI) UI.tab = 'errands'; this.journalChoice = null; return this.journal(this.panel === 'CONTRACT NOTICE BOARD'); }
    if (a === 'swq_abandon') {
      if (n.dataset.kind === 'commission') {
        if (this.raid) { this.notify('You can only abandon a commission in the harbor'); return; }
        this.livingState().active = null; this.store(); this.notify('COMMISSION ABANDONED');
      } else this.quest.abandon(n.dataset.id);
      return this.journal(this.panel === 'CONTRACT NOTICE BOARD');
    }
    return act.apply(this, arguments);
  };
  // Commission board: tell the player why the accept buttons are locked.
  const board = P.livingBoard;
  if (board) P.livingBoard = function () {
    const out = board.apply(this, arguments), m = ER.activeMain(this);
    if (m) { const body = document.querySelector('#panel .panelBody');
      if (body) { for (const b of body.querySelectorAll('[data-act="living_accept"]')) b.disabled = true;
        body.insertAdjacentHTML('afterbegin', `<p class="swqLock">One quest at a time · you are on “${String(m.title).replace(/[<>&"]/g, '')}”. Finish or abandon it in the journal to take a commission.</p>`); } }
    return out;
  };

  const css = document.createElement('style');
  css.textContent = `
  .swqSlot{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:8px 12px;border-radius:10px;background:rgba(143,212,232,.08);border:1px dashed rgba(143,212,232,.35)}
  .swqSlot.full{background:rgba(232,209,143,.1);border:1px solid rgba(232,209,143,.45)}
  .swqSlot span{font-size:11px;letter-spacing:.12em;text-transform:uppercase;opacity:.7}.swqSlot b{font-size:15px}.swqSlot small{opacity:.7}
  .swqSlot em{margin-left:auto;font-style:normal;font-size:12px;opacity:.8}.swqSlot button{padding:4px 10px}
  .swqHave{margin-left:6px;color:#e89a7a}.swqHave.ok{color:#9ad4c0}
  .swqSplit>.swqList{display:flex!important;flex-direction:column!important;flex-wrap:nowrap!important;overflow-x:hidden;grid-template-columns:none!important}.swqSplit>.swqList>.swqCard{flex:none!important}
  .swqLock{padding:8px 12px;border-radius:8px;background:rgba(232,154,122,.12);border:1px solid rgba(232,154,122,.4)}`;
  document.head.appendChild(css);
})();
