#!/usr/bin/env node
/* SALTWAKE browser QA.
 *
 *   node tests/qa.js [--shots DIR]
 *
 * Runs the real game from file:// in headless Chromium (Playwright) and checks:
 *   - JS errors, failed resource loads, missing/undecodable images
 *   - reachability of every NPC, interactable, container, portal, faction
 *     agent and building interior, using the game's own walkable() function
 *   - controls: WASD, Space roll, Q weapon cycle, 1-0 quick slots, R reload
 *   - quest progression, extraction, death penalties
 *   - player-save migration, export (committed state only) and import
 * With --shots it also writes gameplay screenshots for visual review.
 * Exit code is non-zero if any check fails.
 */
"use strict";
const path = require("path");
const fs = require("fs");
const { chromium } = require("playwright");

const ROOT = path.resolve(__dirname, "..");
const URL = "file://" + path.join(ROOT, "index.html");
const shotsArg = process.argv.indexOf("--shots");
const SHOTS = shotsArg > 0 ? path.resolve(process.argv[shotsArg + 1]) : null;

let failures = 0;
const results = [];
function check(name, ok, detail = "") {
  results.push([ok ? "PASS" : "FAIL", name, detail]);
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
}

async function openGame(browser, { save } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const problems = [];
  page.on("pageerror", (e) => problems.push("pageerror: " + e.message));
  page.on("console", (m) => m.type() === "error" && problems.push("console: " + m.text()));
  page.on("requestfailed", (r) => problems.push("requestfailed: " + r.url()));
  if (save !== undefined)
    await page.addInitScript((s) => localStorage.setItem("saltwake.player.v04", s), JSON.stringify(save));
  await page.goto(URL);
  await page.waitForFunction(() => window.SALTWAKE_DEV);
  return { ctx, page, problems };
}

async function start(page) {
  await page.click("[data-action=start]");
  await page.waitForTimeout(300);
}

async function hold(page, key, ms) {
  await page.keyboard.down(key);
  await page.waitForTimeout(ms);
  await page.keyboard.up(key);
}

(async () => {
  const browser = await chromium.launch();

  // ---------------------------------------------------------------- resources
  {
    const { ctx, page, problems } = await openGame(browser);
    await start(page);
    await page.waitForTimeout(1500);
    const broken = await page.evaluate(async () => {
      const lib = window.SPRITES_FOR_QA || null;
      const imgs = Object.entries(window.SALTWAKE_ASSETS.images);
      const bad = [];
      await Promise.all(
        imgs.map(
          ([k, src]) =>
            new Promise((res) => {
              const im = new Image();
              im.onload = () => (im.naturalWidth ? res() : (bad.push(k), res()));
              im.onerror = () => (bad.push(k + " -> " + src), res());
              im.src = src;
            }),
        ),
      );
      return { bad, total: imgs.length, lib };
    });
    check("all manifest images load", broken.bad.length === 0, `${broken.total} images; broken: ${broken.bad.join(", ")}`);
    check("geometry lock intact at runtime", await page.evaluate(() => SALTWAKE_DEV.geometryLock));
    check("no JS errors on boot", problems.length === 0, problems.join(" | "));
    await ctx.close();
  }

  // ------------------------------------------------------------- reachability
  {
    const { ctx, page } = await openGame(browser);
    await start(page);
    for (const [mapId, sx, sy] of [["hub", 50, 46], ["quays", 8, 24]]) {
      const r = await page.evaluate(
        ([mapId, sx, sy]) => {
          const game = SALTWAKE_DEV.game, T = 32, S = 8;
          game.mapId = mapId;
          const m = game.map(), W = Math.ceil((m.w * T) / S), H = Math.ceil((m.h * T) / S);
          const seen = new Uint8Array(W * H), q = [];
          const sxC = Math.floor((sx * T) / S), syC = Math.floor((sy * T) / S);
          seen[syC * W + sxC] = 1; q.push(syC * W + sxC);
          while (q.length) {
            const c = q.pop(), x = c % W, y = (c / W) | 0;
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
              const nx = x + dx, ny = y + dy;
              if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
              const i = ny * W + nx;
              if (seen[i]) continue;
              if (!game.walkable(nx * S + S / 2, ny * S + S / 2)) { seen[i] = 2; continue; }
              seen[i] = 1; q.push(i);
            }
          }
          // a target is reachable if some reachable cell lies within `reach` px
          const near = (px, py, reach) => {
            const r = Math.ceil(reach / S), cx = Math.floor(px / S), cy = Math.floor(py / S);
            for (let y = cy - r; y <= cy + r; y++)
              for (let x = cx - r; x <= cx + r; x++)
                if (x >= 0 && y >= 0 && x < W && y < H && seen[y * W + x] === 1 &&
                    Math.hypot(x * S + S / 2 - px, y * S + S / 2 - py) <= reach) return true;
            return false;
          };
          const C = game.world.content, bad = [];
          let n = 0;
          const test = (label, px, py, reach) => { n++; if (!near(px, py, reach)) bad.push(label); };
          for (const o of C.npcs) if (o.mapId === mapId) test("npc " + o.id, o.x * T, o.y * T, 70);
          for (const o of C.interactables) if (o.mapId === mapId) test("interactable " + o.id, o.x * T, o.y * T, 70);
          for (const o of C.containers) if (o.mapId === mapId) test("container " + o.id, o.x * T, o.y * T, 66);
          for (const o of C.factionAgents || []) if (o.mapId === mapId) test("agent " + o.id, o.x * T, o.y * T, 60);
          for (const o of m.portals) test("portal " + o.id, o.x * T, o.y * T, 80);
          for (const b of m.buildings) if (b.type !== "cave")
            test("interior " + b.id, (b.x + b.w / 2) * T, (b.y + b.h / 2) * T, 64);
          game.mapId = "hub";
          return { bad, n };
        },
        [mapId, sx, sy],
      );
      check(`${mapId}: all ${r.n} interaction targets & interiors reachable on foot`, r.bad.length === 0, r.bad.join(", "));
    }
    await ctx.close();
  }

  // ----------------------------------------------------------------- controls
  {
    const { ctx, page, problems } = await openGame(browser);
    await start(page);
    const p0 = await page.evaluate(() => ({ ...SALTWAKE_DEV.game.player }));
    await hold(page, "d", 400);
    await hold(page, "s", 300);
    const p1 = await page.evaluate(() => ({ ...SALTWAKE_DEV.game.player }));
    check("WASD moves the player", p1.x > p0.x + 20 && p1.y > p0.y + 10, `dx=${(p1.x - p0.x).toFixed(0)} dy=${(p1.y - p0.y).toFixed(0)}`);
    await page.keyboard.press("Space");
    const rolled = await page.evaluate(() => SALTWAKE_DEV.game.player.roll > 0 || SALTWAKE_DEV.game.player.rollCD > 0);
    check("Space starts a dodge roll", rolled);
    const w0 = await page.evaluate(() => SALTWAKE_DEV.game.player.weapon);
    await page.keyboard.press("q");
    const w1 = await page.evaluate(() => SALTWAKE_DEV.game.player.weapon);
    await page.keyboard.press("q");
    const w2 = await page.evaluate(() => SALTWAKE_DEV.game.player.weapon);
    check("Q cycles primary/secondary", w0 === 0 && w1 === 1 && w2 === 0, `${w0}->${w1}->${w2}`);
    await page.evaluate(() => { SALTWAKE_DEV.save.weapons = { arbalest: false, wickcaster: false }; SALTWAKE_DEV.game.ensureQuickSlots(); });
    await page.keyboard.press("q");
    check("knife fallback when both ranged weapons lost", (await page.evaluate(() => SALTWAKE_DEV.game.player.weapon)) === 2);
    await page.evaluate(() => { SALTWAKE_DEV.save.weapons = { arbalest: true, wickcaster: true }; SALTWAKE_DEV.game.ensureQuickSlots(); });
    await page.evaluate(() => { SALTWAKE_DEV.game.player.hp = 40; });
    const b0 = await page.evaluate(() => SALTWAKE_DEV.save.bag.bandage);
    await page.waitForTimeout(1200); // let roll cooldown/pauses settle
    await page.keyboard.press("1");
    const after = await page.evaluate(() => ({ hp: SALTWAKE_DEV.game.player.hp, b: SALTWAKE_DEV.save.bag.bandage }));
    check("quick slot 1 uses a bandage", after.hp > 40 && after.b === b0 - 1, JSON.stringify(after));
    for (const k of ["2", "3", "4", "5", "6", "7", "8", "9", "0"]) await page.keyboard.press(k);
    check("all 10 quick slot keys handled without errors", problems.length === 0, problems.join(" | "));
    // zoom
    await page.mouse.move(640, 400);
    await page.mouse.wheel(0, -300);
    await page.waitForTimeout(400);
    check("mouse wheel zooms camera", (await page.evaluate(() => SALTWAKE_DEV.game.camera.target)) > 1);
    await ctx.close();
  }

  // ------------------------------------------- quest + extraction + persistence
  {
    const { ctx, page, problems } = await openGame(browser);
    await start(page);
    const res = await page.evaluate(() => {
      const g = SALTWAKE_DEV.game;
      g.quest.accept("q_empty_skiff");
      g.quest.emit("talk", "n_dockmaster");
      g.beginRaid();
      const inRaid = g.mapId === "quays" && !!g.raid;
      const box = g.world.content.containers.find((c) => c.id === "c_empty_skiff");
      g.loot(box);
      const hasTag = !!g.save.bag.empty_skiff_tag;
      const stored = JSON.parse(localStorage.getItem("saltwake.player.v04"));
      const notCommittedYet = !stored.bag.empty_skiff_tag;
      g.endRaid(true, "QA extraction");
      g.close();
      const after = JSON.parse(localStorage.getItem("saltwake.player.v04"));
      return {
        inRaid, hasTag, notCommittedYet,
        stage: g.save.quests.q_empty_skiff.stage,
        savedTag: !!after.bag.empty_skiff_tag,
        back: g.mapId,
      };
    });
    check("raid starts on Outer Quays", res.inRaid);
    check("quest loot recovered", res.hasTag);
    check("raid loot not committed to save before extraction", res.notCommittedYet);
    check("extraction keeps loot & advances quest", res.savedTag && res.stage === 3 && res.back === "hub", JSON.stringify(res));
    const done = await page.evaluate(() => {
      const g = SALTWAKE_DEV.game;
      g.quest.emit("talk", "n_dockmaster");
      return g.save.quests.q_empty_skiff.status;
    });
    check("quest completes on turn-in", done === "done");
    check("no JS errors in quest/extraction flow", problems.length === 0, problems.join(" | "));
    await ctx.close();
  }

  // --------------------------------------------------------------------- death
  {
    const { ctx, page } = await openGame(browser);
    await start(page);
    const res = await page.evaluate(() => {
      const g = SALTWAKE_DEV.game;
      const stashBefore = JSON.stringify(g.save.stash), gold = g.save.gold;
      g.beginRaid();
      g.save.bag.scrap_metal = 5;
      g.player.iframes = 0;
      g.hurtPlayer(9999);
      g.close();
      const stored = JSON.parse(localStorage.getItem("saltwake.player.v04"));
      return {
        bagEmpty: Object.keys(g.save.bag).length === 0,
        weaponsLost: !g.save.weapons.arbalest && !g.save.weapons.wickcaster,
        stashKept: JSON.stringify(g.save.stash) === stashBefore,
        goldKept: g.save.gold === gold,
        persisted: Object.keys(stored.bag).length === 0 && stored.failedRaids === 1,
        knife: g.player.weapon === 2,
      };
    });
    check("death loses carried loot & weapons, keeps stash/scrip", Object.values(res).every(Boolean), JSON.stringify(res));
    await ctx.close();
  }

  // ------------------------------------------------------------- save compat
  {
    // A minimal legacy v0.4-era save: no quickSlots, factionStanding, stockSold, weaponCondition.
    const legacy = { version: 4, gold: 77, bag: { bandage: 1 }, stash: { rope: 2 }, quests: { q_empty_skiff: { status: "done", stage: 4 } }, weapons: { arbalest: true } };
    const { ctx, page, problems } = await openGame(browser, { save: legacy });
    await start(page);
    const res = await page.evaluate(() => {
      const s = SALTWAKE_DEV.save;
      return { gold: s.gold, quest: s.quests.q_empty_skiff?.status, slots: s.quickSlots?.length, sold: typeof s.stockSold, cond: typeof s.weaponCondition?.arbalest, wick: s.weapons.wickcaster };
    });
    check("legacy save migrates with progress intact", res.gold === 77 && res.quest === "done" && res.slots === 10 && res.sold === "object" && res.cond === "number" && res.wick === false, JSON.stringify(res));
    await page.evaluate(() => SALTWAKE_DEV.game.shop("shop_quartermaster"));
    check("shop opens on migrated save", problems.length === 0, problems.join(" | "));
    // export during a raid must contain only committed (pre-raid) state
    await page.evaluate(() => { const g = SALTWAKE_DEV.game; g.close(); g.beginRaid(); g.save.bag.lens = 9; });
    const [dl] = await Promise.all([page.waitForEvent("download"), page.evaluate(() => SALTWAKE_DEV.game.doAction("exportsave"))]);
    const exported = JSON.parse(fs.readFileSync(await dl.path(), "utf8"));
    check("export mid-raid excludes unextracted loot", !exported.bag.lens, JSON.stringify(exported.bag));
    // import round-trip
    await page.evaluate(() => SALTWAKE_DEV.game.endRaid(false, "qa"));
    const tmp = path.join(require("os").tmpdir(), "saltwake_qa_import.json");
    fs.writeFileSync(tmp, JSON.stringify({ ...exported, gold: 4321 }));
    await page.setInputFiles("#loadSave", tmp);
    await page.waitForTimeout(300);
    check("import restores exported save", (await page.evaluate(() => SALTWAKE_DEV.save.gold)) === 4321);
    const bad = path.join(require("os").tmpdir(), "saltwake_qa_bad.json");
    fs.writeFileSync(bad, JSON.stringify({ hello: "world" }));
    await page.setInputFiles("#loadSave", bad);
    await page.waitForTimeout(300);
    check("import rejects non-save files", (await page.evaluate(() => SALTWAKE_DEV.save.gold)) === 4321);
    check("no JS errors in save flows", problems.length === 0, problems.join(" | "));
    await ctx.close();
  }

  // ------------------------------------------------------- combat sanity
  {
    const { ctx, page, problems } = await openGame(browser);
    await start(page);
    const res = await page.evaluate(async () => {
      const g = SALTWAKE_DEV.game;
      g.beginRaid();
      g.raid.enemies.forEach((e) => (e.dead = true)); // isolate a single target
      const e = g.raid.enemies.find((x) => x.type === "brineback");
      e.dead = false;
      g.player.x = e.x - 150; g.player.y = e.y;
      g.player.weapon = 1; g.player.mag[1] = 3; g.player.cooldown = 0;
      const hp0 = e.hp;
      g.player.angle = 0;
      g.mouse.x = 512 + 150; g.mouse.y = 288; // aim right (zoom 1, centered-ish)
      g.player.angle = Math.atan2(e.y - (g.player.y - 8), e.x - g.player.x);
      g.shoot();
      for (let i = 0; i < 40; i++) g.updateBullets(1 / 60);
      return { hp0, hp1: e.hp };
    });
    check("projectiles hit creatures", res.hp1 < res.hp0, JSON.stringify(res));
    const water = await page.evaluate(() => {
      // fire across open water: a bolt must keep flying over water (it used to stop at the shoreline)
      const g = SALTWAKE_DEV.game, T = 32, m = g.map();
      const y = (m.waterStart + 3) * T, x = 40 * T;
      if (!g.isWater(x, y)) return { skipped: true };
      g.raid.bullets.length = 0;
      g.raid.bullets.push({ x, y, vx: 600, vy: 0, t: 1, damage: 1, enemy: false });
      for (let i = 0; i < 10; i++) g.updateBullets(1 / 60);
      return { alive: g.raid.bullets.length === 1 };
    });
    check("projectiles fly over open water", water.skipped || water.alive, JSON.stringify(water));
    check("no JS errors in combat", problems.length === 0, problems.join(" | "));
    await ctx.close();
  }

  // ------------------------------------------------------------- screenshots
  if (SHOTS) {
    fs.mkdirSync(SHOTS, { recursive: true });
    const { ctx, page } = await openGame(browser);
    await start(page);
    const spots = [
      ["hub", 50, 46, "hub_square"], ["hub", 51, 36, "hub_market_lane"], ["hub", 30, 36, "hub_quartermaster"],
      ["hub", 70, 41, "hub_ledger"], ["hub", 35, 60, "hub_workyard"], ["hub", 55, 62, "hub_docks"],
      ["hub", 50, 18, "hub_north"], ["hub", 90, 51, "hub_outer_passage"],
    ];
    for (const [m, x, y, name] of spots) {
      await page.evaluate(([m, x, y]) => SALTWAKE_DEV.setPlayer(m, x, y), [m, x, y]);
      await page.waitForTimeout(900);
      await page.screenshot({ path: path.join(SHOTS, name + ".png") });
    }
    await page.evaluate(() => SALTWAKE_DEV.startRaid());
    for (const [x, y, name] of [[8, 24, "quays_start"], [40, 50, "quays_yards"], [100, 70, "quays_wharf"], [140, 76, "quays_caves"], [70, 30, "quays_north"]]) {
      await page.evaluate(([x, y]) => SALTWAKE_DEV.setPlayer("quays", x, y), [x, y]);
      await page.waitForTimeout(900);
      await page.screenshot({ path: path.join(SHOTS, name + ".png") });
    }
    await page.evaluate(() => { SALTWAKE_DEV.game.camera.target = 0.7; });
    await page.waitForTimeout(900);
    await page.screenshot({ path: path.join(SHOTS, "quays_north_zoomout.png") });
    await ctx.close();
    console.log("screenshots written to", SHOTS);
  }

  await browser.close();
  console.log(`\n${results.length - failures}/${results.length} checks passed`);
  process.exit(failures ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(2);
});
