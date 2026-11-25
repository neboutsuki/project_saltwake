/* SALTWAKE dialogue presentation (v0.31).
 * Replaces the panel-style conversation with a speech box that floats above the speaker's head, with portraits:
 * the speaker's face on the LEFT, the player's face on the RIGHT. The active side is lit; the other is dimmed.
 * The existing dialogue engine stays authoritative: world dialogues, choose(), quest emits, actions and close()
 * are unchanged; only dialogueView() is replaced.
 *
 * Portrait art (image files, see docs/PORTRAITS.md):
 *   art/portraits/<npcId>.png            e.g. art/portraits/n_dockmaster.png
 *   art/portraits/<npcId>_<mood>.png     optional; a node can set "mood": "worried" etc.
 *   art/portraits/player_<body>.png      player (body from the save, else player_male), or art/portraits/player.png
 * Missing portraits fall back to ui/portrait_unknown.
 * Controls: Space/Enter/F finish the line, then continue; 1-9 pick a choice. There is no close button: you leave by
 * saying a farewell line (nodes without one get "Maybe next time." etc.); Esc still leaves quietly.
 */
(() => {
  const P = Game.prototype;
  const IMG = () => (window.SALTWAKE_ASSETS && window.SALTWAKE_ASSETS.images) || {};
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const D = window.saltwakeDialogue = { cps: 55, typing: null, stats: { opened: 0, anchoredHub: 0, anchoredFallback: 0 } };
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  function portrait(keys) {
    const im = IMG();
    for (const k of keys) if (k && im[k]) return { src: im[k], found: true };
    return { src: im['ui/portrait_unknown'] || '', found: false };
  }
  const FAREWELLS = ['Maybe next time.', 'I’ll pass.', 'Goodbye.', 'Another time.', 'I should go.'];
  const farewell = (npc, node) => FAREWELLS[[...(npc.id + node)].reduce((a, ch) => a + ch.charCodeAt(0), 0) % FAREWELLS.length];
  D.npcPortrait = (npc, mood) => portrait([mood && `art/portraits/${npc.id}_${mood}`, `art/portraits/${npc.id}`]);
  D.playerPortrait = g => {
    const body = g.save?.appearance?.body || g.save?.profile?.body || g.save?.body || 'male';
    return portrait([`art/portraits/player_${body}`, 'art/portraits/player', 'art/portraits/player_male']);
  };

  // Where is the speaker's head on screen? Harbor: read the harbor frame's own transform; else: lower centre.
  function headPoint(g, npc) {
    try {
      const frame = document.getElementById('reunionHarbor');
      if (g.mapId === 'hub' && frame && !frame.hidden && frame.contentWindow) {
        const w = frame.contentWindow, t = w.eval('transform'), cv = w.eval('c');
        const a = w.eval('scenePeople()').find(p => p.id === npc.id);
        if (a && t && cv) {
          const fr = frame.getBoundingClientRect(), cr = cv.getBoundingClientRect();
          const sx = cr.width / cv.width, sy = cr.height / cv.height;
          return { x: fr.left + cr.left + (a.x * t.z + t.ox) * sx, y: fr.top + cr.top + ((a.y - 1.55) * t.z + t.oy) * sy, anchored: true };
        }
      }
    } catch (e) { /* frame not ready: fall through */ }
    const v = document.getElementById('viewport')?.getBoundingClientRect() || { left: 0, top: 0, width: innerWidth, height: innerHeight };
    return { x: v.left + v.width / 2, y: v.top + v.height * 0.62, anchored: false };
  }

  function place(box, pt) {
    const v = document.getElementById('viewport')?.getBoundingClientRect() || { left: 0, top: 0, right: innerWidth, bottom: innerHeight };
    const r = box.getBoundingClientRect(), m = 12;
    let x = pt.x - r.width / 2, y = pt.y - r.height - 18, below = false;
    if (y < v.top + 70) { y = pt.y + 46; below = true; }                       // no room above the head: go below
    x = Math.max(v.left + m, Math.min(v.right - r.width - m, x));
    y = Math.max(v.top + m, Math.min(v.bottom - r.height - m, y));
    box.style.setProperty('left', x + 'px', 'important'); box.style.setProperty('top', y + 'px', 'important');
    box.classList.toggle('below', below);
    box.style.setProperty('--tail', Math.max(26, Math.min(r.width - 26, pt.x - x)) + 'px');
    box.classList.toggle('anchored', !!pt.anchored);
  }

  function type(el, text, done) {
    clearInterval(D.typing?.timer);
    if (reduced() || D.cps <= 0) { el.textContent = text; D.typing = null; done(); return; }
    let i = 0;
    D.typing = { el, text, done, timer: setInterval(() => {
      i = Math.min(text.length, i + Math.max(1, Math.round(D.cps / 30)));
      el.textContent = text.slice(0, i);
      if (i >= text.length) { clearInterval(D.typing.timer); D.typing = null; done(); }
    }, 1000 / 30) };
  }
  D.finishLine = () => { const t = D.typing; if (!t) return false; clearInterval(t.timer); t.el.textContent = t.text; D.typing = null; t.done(); return true; };

  P.dialogueView = function () {
    const d = this.dialogue; if (!d) return;
    const node = d.dialogue.nodes.find(n => n.id === d.node);
    if (!node) { this.close(); return; }
    const npc = d.npc, choices = node.choices || [];
    // No close button: leaving is a line you say. Nodes without a plain exit get a natural farewell.
    const hasExit = choices.some(c => !c.next && !c.action);
    const np = D.npcPortrait(npc, node.mood), pp = D.playerPortrait(this);
    this.open(npc.name, '');                                   // keeps pause, focus trap, Esc and inert HUD
    const layer = document.getElementById('panelLayer'), panel = document.getElementById('panel');
    layer.classList.add('sw-dialogue'); panel.dataset.section = 'dialogue';
    panel.setAttribute('aria-label', npc.name + ', ' + (npc.role || ''));
    panel.innerHTML = `
      <div class="swDlg">
        <figure class="swFace npc speaking ${np.found ? '' : 'placeholder'}"><img alt="" src="${np.src}"></figure>
        <div class="swDlgBody">
          <header><b>${esc(npc.name)}</b><span>${esc(npc.role || '')}</span></header>
          <p class="swLine" aria-live="polite"></p>
          <div class="swChoices" hidden>${choices.map((c, i) =>
            `<button type="button" data-act="choice" data-i="${i}"><kbd>${i + 1}</kbd>${esc(c.text)}</button>`).join('')}${hasExit ? '' :
            `<button type="button" data-act="close" class="farewell"><kbd>${choices.length + 1}</kbd>${esc(farewell(npc, d.node))}</button>`}</div>
          <footer class="swHint">Space · continue</footer>
        </div>
        <figure class="swFace player ${pp.found ? '' : 'placeholder'}"><img alt="" src="${pp.src}"></figure>
      </div>`;
    const box = panel, line = panel.querySelector('.swLine'), list = panel.querySelector('.swChoices');
    const showChoices = () => {
      list.hidden = false;
      panel.querySelector('.swFace.npc').classList.remove('speaking');
      panel.querySelector('.swFace.player').classList.add('speaking');
      const total = choices.length + (hasExit ? 0 : 1);
      panel.querySelector('.swHint').textContent = total > 1 ? '1–' + Math.min(9, total) + ' · choose' : 'Space · continue';
      place(box, D.anchor);
      list.querySelector('button')?.focus({ preventScroll: true });
    };
    D.anchor = headPoint(this, npc);
    line.textContent = node.text; place(box, D.anchor); line.textContent = '';   // size with the full line first
    // Follow the speaker while the conversation is open (harbor camera easing, people walking).
    cancelAnimationFrame(D.follow);
    const g = this, follow = () => {
      if (!document.getElementById('panelLayer')?.classList.contains('sw-dialogue') || g.dialogue?.npc !== npc) return;
      const pt = headPoint(g, npc);
      if (!D.anchor || Math.hypot(pt.x - D.anchor.x, pt.y - D.anchor.y) > 1.5) { D.anchor = pt; place(box, pt); }
      D.follow = requestAnimationFrame(follow);
    };
    D.follow = requestAnimationFrame(follow);
    type(line, '“' + node.text + '”', showChoices);
    D.stats.opened++; D.stats[D.anchor.anchored ? 'anchoredHub' : 'anchoredFallback']++;
  };

  function unstyle() {
    clearInterval(D.typing?.timer); D.typing = null; D.anchor = null; cancelAnimationFrame(D.follow);
    document.getElementById('panelLayer')?.classList.remove('sw-dialogue');
    const p = document.getElementById('panel'); if (p) { p.style.removeProperty('left'); p.style.removeProperty('top'); p.classList.remove('below', 'anchored'); p.removeAttribute('aria-label'); }
  }
  const close = P.close;
  P.close = function () { unstyle(); return close.apply(this, arguments); };
  // Any other page opened from a choice (shop, smithy, journal) drops the dialogue styling.
  const open = P.open;
  P.open = function () { if (document.getElementById('panelLayer')?.classList.contains('sw-dialogue')) unstyle(); return open.apply(this, arguments); };

  addEventListener('keydown', e => {
    const layer = document.getElementById('panelLayer');
    if (!layer || layer.hidden || !layer.classList.contains('sw-dialogue')) return;
    const k = e.key;
    if (k === ' ' || k === 'Enter' || k === 'f' || k === 'F') {
      if (D.finishLine()) { e.preventDefault(); e.stopImmediatePropagation(); return; }
      const only = layer.querySelectorAll('.swChoices button');
      if (k !== 'Enter' && only.length === 1) { e.preventDefault(); e.stopImmediatePropagation(); only[0].click(); }
    } else if (/^[1-9]$/.test(k)) {
      e.preventDefault(); e.stopImmediatePropagation();
      if (D.typing) { D.finishLine(); return; }
      layer.querySelectorAll('.swChoices button')[+k - 1]?.click();
    }
  }, true);
  addEventListener('resize', () => { const p = document.getElementById('panel'); if (D.anchor && document.getElementById('panelLayer')?.classList.contains('sw-dialogue')) place(p, D.anchor); });

  const css = document.createElement('style');
  // Selectors start with L/Q so they outrank the glass theme's "html.sw-glass #panelLayer #panel ..." rules.
  const L = ':is(html.sw-glass,html) #panelLayer.sw-dialogue', Q = L + ' #panel';
  css.textContent = `
  ${L}:not([hidden]){background:transparent!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;pointer-events:none;padding:0!important}
  ${Q}{position:fixed!important;right:auto!important;bottom:auto!important;transform:none!important;margin:0!important;display:block!important;
    width:min(660px,calc(100vw - 24px))!important;height:auto!important;max-height:none!important;min-height:0!important;
    padding:0!important;overflow:visible!important;pointer-events:auto;background:transparent!important;border:0!important;box-shadow:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important}
  ${Q} .swDlg{display:grid;grid-template-columns:84px 1fr 84px;gap:10px;align-items:end;position:relative;background:transparent!important}
  ${Q} .swDlgBody{position:relative;background:rgba(246,244,239,.74)!important;border:1px solid rgba(255,255,255,.75);border-radius:12px;
    padding:10px 14px 8px;box-shadow:0 8px 28px rgba(0,0,0,.35);color:#1c2224;min-height:84px;
    backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px)}
  ${Q} .swDlgBody::after{content:'';position:absolute;bottom:-9px;left:calc(var(--tail,50%) - 94px - 8px);
    width:16px;height:16px;background:rgba(246,244,239,.74);border:solid rgba(255,255,255,.75);border-width:0 1px 1px 0;transform:rotate(45deg)}
  ${Q}.below .swDlgBody::after{bottom:auto;top:-9px;transform:rotate(225deg)}
  ${Q}:not(.anchored) .swDlgBody::after{display:none}
  ${Q} .swDlgBody header{display:flex;align-items:baseline;gap:10px;margin:0 0 4px;border:0!important;padding:0!important}
  ${Q} .swDlgBody header b{font-size:15px;color:#14191b!important;letter-spacing:.02em}
  ${Q} .swDlgBody header span{font-size:12px;color:#4d6a72!important;flex:1}
  ${Q} .swLine{margin:0;font-size:15px;line-height:1.45;min-height:2.9em;color:#1c2224!important}
  ${Q} .swChoices{display:flex;flex-direction:column;gap:3px;margin-top:8px}
  ${Q} .swChoices[hidden]{display:none}
  ${Q} .swChoices button{all:unset;box-sizing:border-box;cursor:pointer;display:flex;gap:8px;align-items:center;padding:5px 8px;border-radius:6px;
    font-size:14px;color:#26302f!important;background:rgba(255,255,255,.45)!important;border:1px solid transparent!important}
  ${Q} .swChoices button:hover,${Q} .swChoices button:focus-visible{background:rgba(255,255,255,.92)!important;color:#0d1213!important;border-color:rgba(40,90,105,.45)!important}
  ${Q} .swChoices kbd{font:600 11px/1 ui-monospace,monospace;color:#3f6470!important;border:1px solid rgba(63,100,112,.45);border-radius:4px;padding:2px 5px;background:none}
  ${Q} .swChoices .farewell{color:#55605f!important;font-style:italic}
  ${Q} .swHint{font-size:11px;color:#66716f!important;text-align:right;margin-top:6px}
  ${Q} .swFace{margin:0;width:84px;height:84px;border-radius:10px;overflow:hidden;background:#15191b;
    border:2px solid rgba(246,244,239,.55);box-shadow:0 6px 18px rgba(0,0,0,.4);transition:filter .2s,opacity .2s,transform .2s;
    filter:grayscale(.6) brightness(.55);opacity:.85}
  ${Q} .swFace img{width:100%;height:100%;object-fit:cover;image-rendering:pixelated;display:block}
  ${Q} .swFace.player img{transform:scaleX(-1)}
  ${Q} .swFace.speaking{filter:none;opacity:1;transform:translateY(-3px);border-color:rgba(255,255,255,.95)}
  @media (max-width:560px){${Q} .swDlg{grid-template-columns:56px 1fr 56px}${Q} .swFace{width:56px;height:56px}}
  @media (prefers-reduced-motion:reduce){${Q} .swFace{transition:none}}`;
  document.head.appendChild(css);
})();
