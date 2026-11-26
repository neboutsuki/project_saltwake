/* SALTWAKE screen (v0.31): fullscreen without F11, and menus that fill the whole screen.
 * - Fullscreen toggle in Options (top of the Game column), on the title menu, and with Alt+Enter. The choice is
 *   remembered (saltwake.fullscreen): browsers only allow fullscreen after a click/key, so a remembered "on" is
 *   re-applied on your first click or key press.
 * - While fullscreen, Esc is reserved for the game where the browser supports it (Keyboard Lock), so Esc still opens
 *   the menu; hold Esc to leave fullscreen. Otherwise Esc leaves fullscreen as usual.
 * - The menu book (journal, backpack, map, factions, options, smithy, every panel) now covers the whole screen.
 * window.saltwakeScreen exposes toggle() and state for QA.
 */
(() => {
  const P = Game.prototype, $ = id => document.getElementById(id), KEY = 'saltwake.fullscreen';
  const pref = () => { try { return localStorage.getItem(KEY) === 'on'; } catch (e) { return false; } };
  const setPref = v => { try { localStorage.setItem(KEY, v ? 'on' : 'off'); } catch (e) { } };
  const SC = window.saltwakeScreen = { stats: { toggles: 0 }, get full() { return !!document.fullscreenElement; } };
  async function enter() {
    const el = document.documentElement; if (!el.requestFullscreen) return false;
    try { await el.requestFullscreen({ navigationUI: 'hide' }); } catch (e) { return false; }
    try { await navigator.keyboard?.lock?.(['Escape']); } catch (e) { }
    return true;
  }
  async function exit() { try { navigator.keyboard?.unlock?.(); } catch (e) { } try { if (document.fullscreenElement) await document.exitFullscreen(); } catch (e) { } }
  SC.toggle = async () => { SC.stats.toggles++; if (document.fullscreenElement) { setPref(false); await exit(); } else { setPref(true); await enter(); } refresh(); };
  SC.supported = !!document.documentElement.requestFullscreen;
  // re-apply a remembered fullscreen on the first user gesture
  const once = () => { if (pref() && !document.fullscreenElement) enter(); window.removeEventListener('pointerdown', once, true); window.removeEventListener('keydown', once, true); };
  window.addEventListener('pointerdown', once, true); window.addEventListener('keydown', once, true);
  window.addEventListener('keydown', e => { if (e.altKey && e.key === 'Enter') { e.preventDefault(); SC.toggle(); } }, true);
  document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement) setPref(false); refresh(); });
  function label() { return document.fullscreenElement ? 'Exit fullscreen' : 'Fullscreen'; }
  function refresh() { for (const b of document.querySelectorAll('[data-act="sw_fullscreen"]')) b.textContent = label(); }

  // Options page + title menu buttons
  const opt = P.optionsMenu;
  if (opt) P.optionsMenu = function () {
    const out = opt.apply(this, arguments);
    const settings = [...($('panel')?.querySelectorAll('.swOptions h3') || [])].find(h => h.textContent === 'Settings');
    if (SC.supported && settings && !$('panel').querySelector('[data-act="sw_fullscreen"]')) settings.insertAdjacentHTML('afterend', `<button data-act="sw_fullscreen">${label()}</button>`);
    return out;
  };
  const act = P.doAction;
  P.doAction = function (a) { if (a === 'sw_fullscreen') { SC.toggle(); return; } return act.apply(this, arguments); };
  // title screen menu
  const addTitle = () => { const m = document.querySelector('.tide-menu'); if (!m || !SC.supported || m.querySelector('[data-act="sw_fullscreen"]')) return;
    const opts = [...m.querySelectorAll('button')].find(b => /options/i.test(b.textContent)); const html = `<button data-act="sw_fullscreen">${label()}</button>`;
    if (opts) opts.insertAdjacentHTML('afterend', html); else m.insertAdjacentHTML('beforeend', html); };
  addTitle(); setTimeout(addTitle, 500); setTimeout(addTitle, 2000);
  document.addEventListener('click', e => { const b = e.target.closest?.('.tide-menu [data-act="sw_fullscreen"]'); if (b) { e.stopImmediatePropagation(); e.preventDefault(); SC.toggle(); } }, true);

  // Menus fill the whole screen
  const css = document.createElement('style');
  css.textContent = `
  #panelLayer:not([hidden]),html.sw-glass #panelLayer:not([hidden]){position:fixed!important;inset:0!important;padding:0!important;z-index:40!important;align-items:stretch!important;justify-content:stretch!important}
  #panelLayer #panel,html.sw-glass #panelLayer #panel,html.sw-glass #panelLayer #panel.widePanel{width:100vw!important;max-width:none!important;height:100vh!important;height:100dvh!important;max-height:none!important;margin:0!important;border-radius:0!important;border-left:0!important;border-right:0!important}
  #panelLayer #panel .panelBody{padding-left:clamp(16px,3vw,56px)!important;padding-right:clamp(16px,3vw,56px)!important}
  #panelLayer #panel .panelHead{padding-left:clamp(16px,3vw,56px)!important;padding-right:clamp(16px,3vw,56px)!important}`;
  document.head.appendChild(css);
})();
