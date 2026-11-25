/* SALTWAKE menu (v0.31): Esc opens the field menu, an Options tab, and no menu bar during play.
 * - The top menu bar is hidden while playing. Shortcuts still work (J journal, Tab backpack, M map, G factions,
 *   K smithy, L weather).
 * - Esc during play opens the menu book on the last tab you used (Options the first time). Esc again closes it. Esc on a
 *   settings page opened from Options goes back to Options.
 * - The book gets an Options tab after Factions (LB/RB and PageUp/PageDown cycle through it). It holds: Resume, Save
 *   game, Controls, Sound, Graphics, interface and accessibility settings, Weather, Field guide, Back to main menu and
 *   Exit to desktop.
 * - The old "Field menu" action (and the controller Menu button) opens Options.
 * Existing pages (audio, graphics, saves, help) are reused unchanged.
 */
(() => {
  const P = Game.prototype, $ = id => document.getElementById(id);
  const M = window.saltwakeMenu = { last: 'options', child: null, stats: { escOpened: 0 } };
  const TITLE = 'OPTIONS · FIELD MENU';
  const PAGES = { player: 'playerInfo', journal: 'journal', pack: 'showPack', map: 'mapPanel', factions: 'factionPanel' };

  // ---- Options tab in the book nav ------------------------------------------------------------------------------
  function addTab(current) {
    const cats = $('panel')?.querySelector('.bookNav .bookCategories');
    if (!cats || cats.querySelector('[data-ui="options"]')) return;
    cats.insertAdjacentHTML('beforeend', `<button type="button" data-ui="options" ${current ? 'aria-current="page"' : ''}>Options</button>`);
  }
  const open = P.open;
  P.open = function (title) {
    const out = open.apply(this, arguments);
    const sec = $('panel')?.dataset.section;
    if (PAGES[sec]) { M.last = sec; addTab(false); }
    if (M.child && title !== M.child && title !== TITLE) M.child = null;
    return out;
  };

  function bookNav() {
    return `<nav class="bookNav" aria-label="Field menus"><button type="button" class="bookArrow" data-book-step="-1" aria-label="Previous category" title="Previous category (Page Up / LB)"><span aria-hidden="true">‹</span><kbd>LB</kbd></button><div class="bookCategories">${
      [['player', 'Player info'], ['journal', 'Quest journal'], ['pack', 'Backpack'], ['map', 'Field map'], ['factions', 'Factions'], ['options', 'Options']]
        .map(([id, n]) => `<button type="button" data-ui="${id}" ${id === 'options' ? 'aria-current="page"' : ''}>${n}</button>`).join('')
    }</div><button type="button" class="bookArrow" data-book-step="1" aria-label="Next category" title="Next category (Page Down / RB)"><kbd>RB</kbd><span aria-hidden="true">›</span></button></nav>`;
  }

  P.optionsMenu = function () {
    M.last = 'options'; M.child = null;
    const raid = !!this.raid, prefs = window.saltwakeVoyage?.prefs || {}, theme = window.saltwakeTheme?.theme;
    const has = a => typeof a === 'function';
    this.open(TITLE, '');
    const panel = $('panel');
    panel.dataset.section = 'options';
    const head = panel.querySelector('.panelHead');
    if (head) { const h = head.querySelector('h2'); if (h) h.textContent = 'Options'; }
    const body = panel.querySelector('.panelBody') || panel;
    head?.insertAdjacentHTML('afterend', bookNav());
    body.innerHTML = `
      <section class="swOptions">
        <div class="swOptCol">
          <h3>Game</h3>
          <button data-act="close" class="primary">Resume</button>
          <button data-act="swopt_child" data-go="field_saves">Save game</button>
          <button data-act="swopt_child" data-go="help">Controls</button>
          <h3>Settings</h3>
          <button data-act="swopt_child" data-go="audio_settings">Sound</button>
          <button data-act="swopt_child" data-go="engine_settings">Graphics &amp; performance</button>
          <label class="swOptCheck"><input type="checkbox" id="swOptTheme" ${theme !== 'classic' ? 'checked' : ''}> Dark glass interface</label>
          <label class="swOptCheck"><input type="checkbox" id="swOptLarge" ${prefs.large ? 'checked' : ''}> Larger menu text</label>
          <label class="swOptCheck"><input type="checkbox" id="swOptHints" ${prefs.guide ? 'checked' : ''}> First-voyage hints</label>
        </div>
        <div class="swOptCol">
          <h3>Field</h3>
          <button data-act="swopt_child" data-go="env_forecast">Weather &amp; tide forecast</button>
          ${has(this.doAction) ? '<button data-act="swopt_child" data-go="alpha_guide">Coastal field guide</button><button data-act="swopt_child" data-go="alpha_fieldnotes">Field notes</button>' : ''}
          <h3>Leave</h3>
          <button data-act="swopt_title" ${raid ? 'disabled' : ''}>Back to main menu</button>
          ${raid ? '<p class="fine">Extract first: the main menu is closed during an expedition.</p>' : ''}
          <button data-act="swopt_exit" class="danger">Exit to desktop</button>
          <div id="swExitConfirm" hidden></div>
        </div>
      </section>`;
    const on = (id, f) => { const el = $(id); if (el) el.onchange = e => f(e.target.checked); };
    on('swOptTheme', v => window.saltwakeTheme?.set(v ? 'glass' : 'classic'));
    on('swOptLarge', v => window.saltwakeVoyage?.setPrefs({ large: v }));
    on('swOptHints', v => window.saltwakeVoyage?.setPrefs({ guide: v }));
    panel.querySelector('.swOptions button')?.focus({ preventScroll: true });
  };

  function exitToDesktop(g) {
    if (g.raid) {
      const box = $('swExitConfirm');
      if (box && box.hidden) {
        box.hidden = false;
        box.innerHTML = '<p class="callout">You are on an expedition. Leaving now abandons it: anything found on this run is lost.</p><button data-act="swopt_exit_now" class="danger">Leave anyway</button>';
        return;
      }
    }
    leave(g);
  }
  function leave(g) {
    try { g.store(); } catch (e) { /* storage blocked: still leave */ }
    g.close(); g.mode = 'start'; g.keys = {}; g.mouse.down = false;
    try { window.close(); } catch (e) { /* browsers only close windows they opened */ }
    setTimeout(() => {
      if (document.getElementById('swGoodbye')) return;
      document.body.insertAdjacentHTML('beforeend', `<div id="swGoodbye" role="dialog" aria-modal="true" aria-label="Game closed">
        <div><h2>Progress saved</h2><p>You can close this tab now.</p><button type="button" id="swGoodbyeBack">Back to game</button></div></div>`);
      $('swGoodbyeBack').onclick = () => { $('swGoodbye').remove(); $('screen').hidden = false; };
      $('swGoodbyeBack').focus();
    }, 250);
  }

  const action = P.doAction;
  P.doAction = function (a, n) {
    if (a === 'sprint_menu') return this.mode === 'play' ? this.optionsMenu() : undefined;
    if (a === 'swopt_child') {
      const go = n?.dataset.go;
      if (go === 'help') this.help(); else action.call(this, go, n);
      if (this.panel && this.panel !== TITLE) { M.child = this.panel; injectBack(); }
      return;
    }
    if (a === 'swopt_title') { if (!this.raid) return action.call(this, 'tide_return', n); return this.notify('Extract before returning to the main menu'); }
    if (a === 'swopt_exit') return exitToDesktop(this);
    if (a === 'swopt_exit_now') return leave(this);
    if (a === 'swopt_back') return this.optionsMenu();
    return action.apply(this, arguments);
  };
  function injectBack() {
    const head = $('panel')?.querySelector('.panelHead');
    if (head && !head.querySelector('.swOptBack')) head.insertAdjacentHTML('afterbegin', '<button type="button" class="swOptBack" data-act="swopt_back">← Options</button>');
  }

  // Options tab clicks (the game's own data-ui switch has no "options" case).
  document.addEventListener('click', e => {
    const b = e.target.closest?.('[data-ui="options"]'); if (!b) return;
    e.preventDefault(); e.stopImmediatePropagation(); window.SALTWAKE_DEV?.game.optionsMenu();
  }, true);

  // Esc: open the menu during play; from an Options sub-page go back to Options.
  addEventListener('keydown', e => {
    if (e.code !== 'Escape' || e.ctrlKey || e.metaKey || e.altKey) return;
    const g = window.SALTWAKE_DEV?.game; if (!g || g.mode !== 'play') return;
    if ($('panelLayer')?.classList.contains('sw-dialogue')) return;          // conversations: Esc leaves (game default)
    if (g.panel && M.child && g.panel === M.child) { e.preventDefault(); e.stopImmediatePropagation(); if (!e.repeat) g.optionsMenu(); return; }
    if (g.panel) return;                                                       // game default: close
    e.preventDefault(); e.stopImmediatePropagation(); if (e.repeat) return;
    openMenu(g);
  }, true);
  function openMenu(g) {
    M.stats.escOpened++;
    const fn = PAGES[M.last]; if (fn && typeof g[fn] === 'function') g[fn](); else g.optionsMenu();
  }
  M.open = () => { const g = window.SALTWAKE_DEV?.game; if (g && g.mode === 'play' && !g.panel) openMenu(g); };
  // In the harbor, keys are read inside the harbor frame and forwarded here; its Esc used to open Controls.
  const R = window.saltwakeReunion;
  if (R && typeof R.key === 'function') { const key = R.key; R.key = function (k) { if (k === 'escape') return M.open(); return key.apply(this, arguments); }; }

  const css = document.createElement('style');
  css.textContent = `
  #shell #bar{display:none!important}
  .swOptions{display:grid;grid-template-columns:1fr 1fr;gap:28px;padding:6px 4px 10px}
  .swOptCol{display:flex;flex-direction:column;gap:8px;min-width:0}
  .swOptCol h3{margin:10px 0 2px;font-size:12px;letter-spacing:.14em;text-transform:uppercase;opacity:.7}
  .swOptCol h3:first-child{margin-top:0}
  .swOptCol>button{text-align:left;padding:10px 14px;font-size:15px}
  .swOptCol>button[disabled]{opacity:.45;cursor:not-allowed}
  .swOptCol .danger{color:#f0b3a8}
  .swOptCheck{display:flex;gap:10px;align-items:center;font-size:14px;padding:4px 2px;cursor:pointer}
  .swOptBack{margin-right:12px}
  #swGoodbye{position:fixed;inset:0;z-index:100;display:grid;place-items:center;background:#0b0f11;color:#dfe7e9;text-align:center}
  #swGoodbye h2{margin:0 0 8px}#swGoodbye button{margin-top:18px;padding:10px 18px}
  @media (max-width:640px){.swOptions{grid-template-columns:1fr}}`;
  document.head.appendChild(css);
})();
