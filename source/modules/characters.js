/* SALTWAKE characters (v0.31): sprite-sheet characters from the generated art.
 * Player = Ren Kagari (art/characters/story/ren_kagari_<dir>_walk.png, 6 frames of 64x64, feet at (32,60), 120 ms).
 *   Field: faces the aim direction, walks when moving (frame rate follows speed), stands on frame 0 when still (no
 *   idle art yet), dodge-roll squash and a white flash when hit. The weapon is shown by the HUD and the reticle.
 *   Harbor: the harbor frame's player draw is replaced the same way (it walks in its movement direction).
 * Story cast (Captain Elda, Harlan, Ivo, Kade, Lira, Marin, Master Rook, Mira, Soren, Tess) is registered with its
 *   idle (4 frames) and walk (8 frames, up/down) strips for use by NPCs (window.saltwakeCast.draw).
 * Visual only: positions, collision, timing and combat are unchanged. Scaling is applied outside (scale.js).
 */
(() => {
  const P = Game.prototype, IMGS = () => (window.SALTWAKE_ASSETS && window.SALTWAKE_ASSETS.images) || {};
  const C = window.saltwakeCast = { enabled: true, stats: { player: 0, hub: 0 }, player: 'ren_kagari' };
  try { if (localStorage.getItem('saltwake.cast') === 'off') C.enabled = false; } catch (e) { }
  const STRIPS = {
    ren_kagari: { walk: { frames: 6, ms: 120, dirs: { down: 'art/characters/story/ren_kagari_down_walk', up: 'art/characters/story/ren_kagari_up_walk',
      left: 'art/characters/story/ren_kagari_left_walk', right: 'art/characters/story/ren_kagari_right_walk' } } },
  };
  const CAST = ['captain_elda', 'harlan', 'ivo', 'kade', 'lira', 'marin', 'master_rook', 'mira', 'soren', 'tess'];
  for (const n of CAST) STRIPS[n] = {
    idle: { frames: 4, ms: 220, dirs: { down: `art/characters/story/${n}_down_idle`, up: `art/characters/story/${n}_up_idle`, left: `art/characters/story/${n}_left_idle`, right: `art/characters/story/${n}_right_idle` } },
    walk: { frames: 8, ms: 110, dirs: { down: `art/characters/story/${n}_down_walk`, up: `art/characters/story/${n}_up_walk` } },
  };
  // Harbor townsfolk (tools/bake_townsfolk.py): the cast art with their own clothes and hair, same style and scale.
  const FOLK = C.folk = ['folk_a', 'folk_b', 'folk_c', 'folk_d', 'folk_e', 'folk_f', 'folk_g', 'folk_h'];
  for (const n of FOLK) STRIPS[n] = {
    idle: { frames: 4, ms: 220, dirs: { down: `art/characters/townsfolk/${n}_down_idle`, up: `art/characters/townsfolk/${n}_up_idle`, left: `art/characters/townsfolk/${n}_left_idle`, right: `art/characters/townsfolk/${n}_right_idle` } },
    walk: { frames: 8, ms: 110, dirs: { down: `art/characters/townsfolk/${n}_down_walk`, up: `art/characters/townsfolk/${n}_up_walk` } },
  };
  const hashOf = t => { let h = 2166136261; for (const c of String(t)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  // which townsperson: walkers by their index (all different), everyone else by a stable hash of their id/role
  const folkFor = id => { const m = /^walker_(\d+)$/.exec(id || ''); return FOLK[(m ? +m[1] : hashOf(id)) % FOLK.length]; };
  C.folkFor = folkFor;
  // Full alias names (the single-file build inlines staged art that a module names in full):
  // 'art/characters/story/captain_elda_down_idle' 'art/characters/story/captain_elda_up_idle' 'art/characters/story/captain_elda_left_idle' 'art/characters/story/captain_elda_right_idle' 'art/characters/story/captain_elda_down_walk' 'art/characters/story/captain_elda_up_walk'
  // 'art/characters/story/harlan_down_idle' 'art/characters/story/harlan_up_idle' 'art/characters/story/harlan_left_idle' 'art/characters/story/harlan_right_idle' 'art/characters/story/harlan_down_walk' 'art/characters/story/harlan_up_walk'
  // 'art/characters/story/ivo_down_idle' 'art/characters/story/ivo_up_idle' 'art/characters/story/ivo_left_idle' 'art/characters/story/ivo_right_idle' 'art/characters/story/ivo_down_walk' 'art/characters/story/ivo_up_walk'
  // 'art/characters/story/kade_down_idle' 'art/characters/story/kade_up_idle' 'art/characters/story/kade_left_idle' 'art/characters/story/kade_right_idle' 'art/characters/story/kade_down_walk' 'art/characters/story/kade_up_walk'
  // 'art/characters/story/lira_down_idle' 'art/characters/story/lira_up_idle' 'art/characters/story/lira_left_idle' 'art/characters/story/lira_right_idle' 'art/characters/story/lira_down_walk' 'art/characters/story/lira_up_walk'
  // 'art/characters/story/marin_down_idle' 'art/characters/story/marin_up_idle' 'art/characters/story/marin_left_idle' 'art/characters/story/marin_right_idle' 'art/characters/story/marin_down_walk' 'art/characters/story/marin_up_walk'
  // 'art/characters/story/master_rook_down_idle' 'art/characters/story/master_rook_up_idle' 'art/characters/story/master_rook_left_idle' 'art/characters/story/master_rook_right_idle' 'art/characters/story/master_rook_down_walk' 'art/characters/story/master_rook_up_walk'
  // 'art/characters/story/mira_down_idle' 'art/characters/story/mira_up_idle' 'art/characters/story/mira_left_idle' 'art/characters/story/mira_right_idle' 'art/characters/story/mira_down_walk' 'art/characters/story/mira_up_walk'
  // 'art/characters/story/soren_down_idle' 'art/characters/story/soren_up_idle' 'art/characters/story/soren_left_idle' 'art/characters/story/soren_right_idle' 'art/characters/story/soren_down_walk' 'art/characters/story/soren_up_walk'
  // 'art/characters/story/tess_down_idle' 'art/characters/story/tess_up_idle' 'art/characters/story/tess_left_idle' 'art/characters/story/tess_right_idle' 'art/characters/story/tess_down_walk' 'art/characters/story/tess_up_walk'
  // Who looks like whom: harbor NPC id -> story character (appearance, animations and portrait). Names and dialogue
  // stay the NPC's own. Edit this table to recast someone.
  const CAST_OF = C.castOf = {
    n_dockmaster: 'captain_elda', n_quartermaster: 'harlan', n_clerk: 'marin', n_mechanic: 'master_rook', n_medic: 'soren',
    n_apprentice: 'lira', n_guard: 'kade', n_tidepilot: 'ivo', n_ropewright: 'mira', n_salvager: 'tess',
  };
  const FW = 64, FOOT = 60;

  const imgs = {};
  function img(a) { if (a in imgs) return imgs[a]; const s = IMGS()[a]; if (!s) return (imgs[a] = null); const im = new Image(); im.src = s; return (imgs[a] = im); }
  const ok = im => im && im.complete && im.naturalWidth > 0;
  // Pick a strip: wanted action/direction, falling back to idle, then walk frame 0, then down.
  function strip(who, action, dir) {
    const S = STRIPS[who]; if (!S) return null;
    for (const [a, d] of [[action, dir], ['idle', dir], ['walk', dir], [action, 'down'], ['walk', 'down']]) {
      const s = S[a], al = s && s.dirs[d], im = al && img(al);
      if (ok(im)) return { im, frames: s.frames, ms: s.ms, action: a, still: a === 'walk' && action !== 'walk', fw: s.fw || FW, fh: s.fh || FW, foot: s.foot || FOOT };
    }
    return null;
  }
  C.ready = who => !!strip(who || C.player, 'walk', 'down');
  const dirOfAngle = a => { const d = ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI); return d < Math.PI / 4 || d >= 7 * Math.PI / 4 ? 'right' : d < 3 * Math.PI / 4 ? 'down' : d < 5 * Math.PI / 4 ? 'left' : 'up'; };
  C.dirOfAngle = dirOfAngle;

  // Draw one frame with its feet at (x, footY); h = drawn frame height (frame is FW x FW).
  function blit(ctx, s, frame, x, footY, h, flash, squash) {
    const k = h / FW, f = Math.max(0, Math.min(s.frames - 1, frame | 0)), fw = s.fw || FW, fh = s.fh || FW, foot = s.foot || FOOT;
    ctx.save(); ctx.imageSmoothingEnabled = false; ctx.translate(x, footY);
    if (squash) ctx.scale(1 + squash * .25, 1 - squash * .3);
    if (flash) ctx.filter = 'brightness(2.4) saturate(.2)';
    ctx.drawImage(s.im, f * fw, 0, fw, fh, -fw / 2 * k, -foot * k, fw * k, fh * k);
    ctx.restore();
  }
  C.draw = (ctx, who, action, dir, t, x, footY, h) => { const s = strip(who, action, dir); if (!s) return false; blit(ctx, s, s.still ? 0 : Math.floor(t / s.ms) % s.frames, x, footY, h); return true; };

  // ---- field player ----------------------------------------------------------------------------------------------
  const motion = { x: 0, y: 0, dist: 0, moving: false, last: 0 };
  function fieldPlayer(game, footOffset) {
    const p = game.player, now = performance.now(), d = Math.hypot(p.x - motion.x, p.y - motion.y);
    if (d < 80) { motion.dist += d; if (d > .3) motion.last = now; } else motion.dist = 0;
    motion.x = p.x; motion.y = p.y;
    const moving = now - motion.last < 120, dir = dirOfAngle(p.angle || 0), s = strip(C.player, moving ? 'walk' : 'idle', dir);
    if (!s) return false;
    game.draw25Shadow?.(p.x, p.y + footOffset, 15, 6, .37);
    const frame = s.still ? 0 : moving ? Math.floor(motion.dist / 9) % s.frames : Math.floor(now / s.ms) % s.frames;
    const roll = p.roll > 0 ? Math.sin(Math.min(1, p.roll / .31) * Math.PI) : 0;
    const showWeapon = game.raid && !roll, behind = dir === 'up';
    if (showWeapon && behind) weapon(game, p, footOffset);
    blit(g, s, frame, p.x, p.y + footOffset, 64, p.hit > 0 && Math.floor(now / 60) % 2 === 0, roll);
    if (showWeapon && !behind) weapon(game, p, footOffset);
    C.stats.player++;
    return true;
  }
  // Weapon in hand: art/weapons/<name>, pointing at the aim, flipped when aiming left (never upside down).
  const WEAPON_ART = ['art/weapons/arbalest', 'art/weapons/wickcaster', 'art/weapons/spear'];   // by player.weapon slot
  const WEAPON_LEN = [46, 44, 62];
  function weapon(game, p, footOffset) {
    const q = window.saltwakeWeapons?.pose?.(game);
    const im = img(q?.alias || WEAPON_ART[p.weapon] || WEAPON_ART[0]); if (!ok(im)) return;
    const aim = p.angle || 0, len = q?.len || WEAPON_LEN[p.weapon] || 46, h = len * im.naturalHeight / im.naturalWidth;
    const left = Math.cos(aim) < 0;                       // flip by the aim, so a swing crossing the vertical never pops
    const b = q?.body || { dx: 0, dy: 0 };
    const one = (a, ext, sc, alpha) => {
      g.save(); g.imageSmoothingEnabled = false; if (alpha < 1) g.globalAlpha *= alpha;
      g.translate(p.x + b.dx + Math.cos(a) * (6 + ext), p.y + b.dy + footOffset - 30 + Math.sin(a) * (4 + ext * .8)); g.rotate(a); if (left) g.scale(1, -1);
      if (sc !== 1) g.scale(sc, sc);
      g.drawImage(im, -len * .32, -h / 2, len, h); g.restore();
    };
    for (const sm of q?.smear || []) one(sm.angle, sm.ext, q.scale || 1, Math.max(0, sm.alpha));
    one(q ? q.angle : aim, q?.ext || 0, q?.scale || 1, 1);
    C.stats.weapon = (C.stats.weapon || 0) + 1;
  }
  // Coast renderer (Quays and other field maps) and the older 2.5D renderer.
  const cp = P.coastPlayer;
  if (cp) P.coastPlayer = function () { if (C.enabled && C.ready() && fieldPlayer(this, 4)) return; return cp.apply(this, arguments); };
  const dp = P.draw25Player;
  P.draw25Player = function () {
    if (C.enabled && C.ready() && fieldPlayer(this, 17)) { if (!this.raid) this.text?.('YOU', this.player.x, this.player.y - 44, 9, '#d9d4b5'); return; }
    return dp.apply(this, arguments);
  };

  // ---- harbor player ---------------------------------------------------------------------------------------------
  const hub = { x: null, y: null, dist: 0, last: 0 };
  const npcMotion = {};
  function npc(ctx, who, dir, mirror, x, y, h, key = who) {
    const now = performance.now(), m = npcMotion[key] || (npcMotion[key] = { x, y, dist: 0, last: 0, since: now });
    const d = Math.hypot(x - m.x, y - m.y);
    if (d < 1.5) { m.dist += d; if (d > .004) { m.last = now; m.since = now; } } m.x = x; m.y = y;
    const moving = now - m.last < 160, D = dir === 'side' ? (mirror ? 'left' : 'right') : dir === 'back' ? 'up' : 'down';
    // walking up/down: walk strip; sideways: side idle with a small step bob; standing: idle
    const action = moving && (D === 'up' || D === 'down') ? 'walk' : 'idle';
    const s = strip(who, action, D); if (!s) return false;
    const fr = action === 'walk' ? Math.floor(m.dist / .16) % s.frames : Math.floor(now / s.ms) % s.frames;
    const bob = moving && action === 'idle' ? Math.abs(Math.sin(m.dist / .16 * Math.PI)) * h * .03 : 0;
    blit(ctx, s, fr, x, y - bob, h * FW / 52);
    C.stats.npc = (C.stats.npc || 0) + 1; return true;
  }
  C.npcAction = who => { const m = npcMotion[who]; if (!m) return null; return performance.now() - m.last < 160 ? 'moving' : 'idle'; };
  function wrapFaces() {
    const F = window.saltwakeFaces; if (!F || F.__cast || typeof F.render !== 'function') return; const r = F.render;
    const prof = F.profile;
    F.profile = function (role, a) { const p = prof.apply(this, arguments);
      if (a && CAST_OF[a.id]) p.cast = CAST_OF[a.id];
      else if (a?.id && role !== 'player' && role !== 'wrecker') { p.cast = folkFor(a.id); p.motionKey = a.id; }   // townsfolk, escorts
      return p; };
    F.render = function (ctx, profile, dir, mirror, frame, x, y, w, h, isPlayer) {
      if (isPlayer !== true && profile && profile.cast && C.enabled && npc(ctx, profile.cast, dir, mirror, x, y, h, profile.motionKey || profile.cast)) return true;
      if (isPlayer !== true || !C.enabled || !C.ready()) return r.apply(this, arguments);
      const now = performance.now(), d = hub.x === null ? 0 : Math.hypot(x - hub.x, y - hub.y);
      if (d < 1.5) { hub.dist += d; if (d > .004) hub.last = now; } hub.x = x; hub.y = y;
      const moving = now - hub.last < 140, D = dir === 'side' ? (mirror ? 'left' : 'right') : dir === 'back' ? 'up' : 'down';
      const s = strip(C.player, moving ? 'walk' : 'idle', D); if (!s) return r.apply(this, arguments);
      const fr = s.still ? 0 : moving ? Math.floor(hub.dist / .2) % s.frames : Math.floor(now / s.ms) % s.frames;
      blit(ctx, s, fr, x, y, h * FW / 52);   // h is the body height; the frame is 64 with a 52 px body
      C.stats.hub++;
    };
    F.__cast = true;
  }
  wrapFaces(); setTimeout(wrapFaces, 0);

  // Field renderer (hub as a normal map): NPCs drawn by coastPerson(x, y, faction, role) use their story character.
  const fieldNpc = {};
  const cp2 = P.coastPerson;
  if (cp2) P.coastPerson = function (x, y, faction, role) {
    if (C.enabled && typeof x === 'number' && role) {
      const n = (this.world.content.npcs || []).find(q => q.role === role && q.mapId === this.mapId);
      // story cast if they have one, otherwise a townsperson (friendly people only; hostile humans keep their art)
      const who = (n && CAST_OF[n.id]) || (!/wrecker|hostile|raider/i.test(String(faction) + role) ? folkFor('role:' + role) : null), mk = n ? n.id : 'role:' + role;
      if (who) {
        const now = performance.now(), m = fieldNpc[mk] || (fieldNpc[mk] = { x, y, dist: 0, last: 0, dir: 'down' }), d = Math.hypot(x - m.x, y - m.y);
        if (d < 60) { m.dist += d; if (d > .3) { m.last = now; m.dir = Math.abs(x - m.x) > Math.abs(y - m.y) ? (x < m.x ? 'left' : 'right') : y < m.y ? 'up' : 'down'; } }
        m.x = x; m.y = y;
        const moving = now - m.last < 160, action = moving && (m.dir === 'up' || m.dir === 'down') ? 'walk' : 'idle';
        const D = moving ? m.dir : 'down', s = strip(who, action, D);
        if (s) {
          this.draw25Shadow?.(x, y + 4, 15, 6, .32);
          const fr = action === 'walk' ? Math.floor(m.dist / 9) % s.frames : Math.floor(now / s.ms) % s.frames;
          const bob = moving && action === 'idle' ? Math.abs(Math.sin(m.dist / 9 * Math.PI)) * 2 : 0;
          blit(g, s, fr, x, y + 4 - bob, 64 * (window.saltwakeScale?.CHAR || 1.4));
          C.stats.npc = (C.stats.npc || 0) + 1; return;
        }
      }
    }
    return cp2.apply(this, arguments);
  };

  C.set = on => { C.enabled = !!on; try { localStorage.setItem('saltwake.cast', on ? 'on' : 'off'); } catch (e) { } };
  const gp = P.graphicsPanel;
  P.graphicsPanel = function () {
    const out = gp.apply(this, arguments), root = document.getElementById('panel')?.querySelector('.engineOptions');
    root?.insertAdjacentHTML('beforeend', `<label class="engineCheck"><input id="swCast" type="checkbox" ${C.enabled ? 'checked' : ''}> New character art (Ren)</label>`);
    const el = document.getElementById('swCast'); if (el) el.onchange = e => C.set(e.target.checked);
    return out;
  };
  for (const d of ['down', 'up', 'left', 'right']) img(STRIPS.ren_kagari.walk.dirs[d]);
})();
