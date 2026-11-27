/* SALTWAKE preloading (v0.31).
 * - Title screen: every map is painted once and saved (saltwakeTiles.prepareAll), with a progress bar under the menu.
 *   After the first run this finishes instantly.
 * - Entering a map (new game, continue, expedition, return to the harbor): a loading screen holds the game until all
 *   of that map's ground is in memory (saltwakeTiles.loadMap), so nothing is painted or previewed during play.
 * - QA runs (window.SALTWAKE_QA) skip the loading pause.
 * window.saltwakePreload exposes state for QA.
 */
(() => {
  const P = Game.prototype, TX = window.saltwakeTiles, $ = id => document.getElementById(id);
  if (!TX?.loadMap) return;
  const PL = window.saltwakePreload = { loading: false, prepared: false, stats: { loads: 0 } };
  const css = document.createElement('style');
  css.textContent = `
  #swLoading{position:fixed;inset:0;z-index:60;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;background:radial-gradient(circle at 50% 45%,#16232a,#06090b);color:#e9e2d0;font:600 15px system-ui,sans-serif;letter-spacing:.06em}
  #swLoading[hidden]{display:none}#swLoading b{font-size:22px;letter-spacing:.14em;text-transform:uppercase}#swLoading small{opacity:.65;font-weight:500}
  .swBar{width:min(420px,70vw);height:6px;border-radius:6px;background:rgba(255,255,255,.1);overflow:hidden}.swBar i{display:block;height:100%;width:0;background:linear-gradient(90deg,#8fd4e8,#e8d18f);transition:width .15s}
  #swPrep{position:fixed;left:24px;bottom:20px;z-index:61;width:260px;padding:10px 12px;border-radius:10px;background:rgba(8,12,15,.7);border:1px solid rgba(255,255,255,.08);font:500 12px system-ui,sans-serif;color:#c6d0d4;display:flex;flex-direction:column;gap:7px}#swPrep .swBar{width:100%;height:4px}`;
  document.head.appendChild(css);
  const ov = document.createElement('div'); ov.id = 'swLoading'; ov.hidden = true; ov.innerHTML = '<b>Loading</b><div class="swBar"><i></i></div><small></small>'; document.body.appendChild(ov);
  const qa = () => !!window.SALTWAKE_QA;

  // ---- title screen: prepare every map once -------------------------------------------------------------------
  function prepUI() { let el = $('swPrep'); if (!el) { el = document.createElement('div'); el.id = 'swPrep'; el.innerHTML = '<span>Preparing maps…</span><div class="swBar"><i></i></div>'; document.body.appendChild(el); } return el; }
  function startPrepare() {
    const G = window.SALTWAKE_DEV?.game; if (!G || PL.preparing) return; PL.preparing = true;
    TX.prepareAll(G, (d, n) => { const el = prepUI(); if (!el) return; const k = n ? d / n : 1; el.querySelector('i').style.width = Math.round(k * 100) + '%'; el.querySelector('span').textContent = k >= 1 ? 'Maps ready' : `Preparing maps… ${Math.round(k * 100)}%`; })
      .then(ok => { PL.prepared = true; const el = $('swPrep'); if (el) { if (ok) { el.querySelector('span').textContent = 'Maps ready'; el.querySelector('i').style.width = '100%'; setTimeout(() => el.remove(), 1500); } else el.remove(); } });
  }
  setTimeout(startPrepare, 300);

  // ---- entering a map: loading screen until the whole map is in memory ----------------------------------------
  async function load(G, id) {
    if (qa() || TX.mapLoaded(G, id)) return;
    const name = G.world.maps[id]?.name || 'map', bar = ov.querySelector('i'), note = ov.querySelector('small');
    PL.loading = true; PL.stats.loads++; ov.hidden = false; ov.querySelector('b').textContent = 'Loading ' + name; bar.style.width = '0%'; note.textContent = '';
    try { await TX.loadMap(G, id, (d, n) => { bar.style.width = Math.round(d / n * 100) + '%'; note.textContent = `${d} / ${n}`; }); }
    finally { PL.loading = false; ov.hidden = true; }
  }
  PL.load = load;
  const setArea = P.setArea;
  P.setArea = function (id) { const out = setArea.apply(this, arguments); if (this.world.maps[id]?.tilemap) load(this, id); return out; };
  const paused = P.isPaused;
  P.isPaused = function () { return (PL.loading && !qa()) || paused.apply(this, arguments); };
})();
