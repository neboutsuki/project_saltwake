Object.assign(Game.prototype, {
  beginRaid() {
    if (this.raid) {
      this.notify("Expedition already active");
      return;
    }
    this.raid = {
      time: 0,
      seed: Date.now() % 65536,
      opened: [],
      drops: [],
      bullets: [],
      particles: [],
      kills: 0,
      lastTide: "low",
      events: [],
      rumorAnnounced: false,
      questSnapshot: jsonCopy(this.save.quests),
      bagSnapshot: jsonCopy(this.save.bag),
      enemies: this.spawnEnemies(),
    };
    for (const ev of this.world.content.worldEvents || [])
      if (
        ev.mapId === "quays" &&
        ev.probability < 1 &&
        Math.random() < ev.probability
      )
        this.raid.events.push(ev.id);
    this.player.hp = 100;
    this.player.st = 100;
    this.player.bleed = 0;
    this.player.wet = 0;
    this.ensureQuickSlots();
    this.player.mag = [
      Math.min(1, itemCount(this.save.bag, "bolt")),
      Math.min(3, itemCount(this.save.bag, "wick_cell")),
    ];
    addItem(this.save.bag, "bolt", -this.player.mag[0]);
    addItem(this.save.bag, "wick_cell", -this.player.mag[1]);
    this.setArea("quays", 8, 24);
    this.notify("OUTER QUAYS · Secure salvage and extract before high tide");
  },
  spawnEnemies() {
    const coords = [
      ["gull", 47, 45],
      ["brineback", 35, 56],
      ["brineback", 103, 72],
      ["widow", 141, 76],
      ["wrecker", 31, 73],
      ["wrecker", 116, 48],
      ["grazer", 19, 51],
      ["grazer", 105, 26],
    ];
    const wildlife = coords.map(([type, x, y], i) => {
      let d = this.world.content.enemies?.find((t) => t.id === type) || {
        health: 80,
        aggroRange: 200,
        speed: 70,
      };
      return {
        id: "e" + i,
        type,
        x: x * T,
        y: y * T,
        homeX: x * T,
        homeY: y * T,
        hp: d.health,
        maxHp: d.health,
        dead: false,
        aggro: 0,
        attackCD: 1.2,
        walk: i * 1.3,
        phase: i,
        factionId: type === "wrecker" ? "wreckers" : "wildlife",
        actorType: type === "wrecker" ? "human" : "monster",
        provoked: false,
      };
    });
    const agents = (this.world.content.factionAgents || []).map((n, i) => ({
      id: n.id,
      type: "human",
      actorType: "human",
      factionId: n.factionId,
      name: n.name,
      x: n.x * T,
      y: n.y * T,
      homeX: n.x * T,
      homeY: n.y * T,
      hp: 85,
      maxHp: 85,
      dead: false,
      aggro: 0,
      attackCD: i * 0.3,
      walk: i * 0.7,
      phase: i * 2,
      patrolRadius: n.radius || 5,
      weapon: n.weapon || null,
      provoked: false,
    }));
    return wildlife.concat(agents);
  },
  tide() {
    if (!this.raid) return "safe";
    const t = this.raid.time,
      m = this.mechanics();
    return t < m.lowTideUntil
      ? "low"
      : t < m.risingTideUntil
        ? "rising"
        : "high";
  },
  floodRise() {
    if (!this.raid) return 0;
    const t = this.raid.time,
      m = this.mechanics();
    return t < m.lowTideUntil
      ? 0
      : t < m.risingTideUntil
        ? ((t - m.lowTideUntil) / (m.risingTideUntil - m.lowTideUntil)) * 7
        : 7 +
          ((t - m.risingTideUntil) / (m.raidSeconds - m.risingTideUntil)) * 3;
  },
  coastY(x) {
    return (
      (this.map().waterStart - this.floodRise()) * T +
      Math.sin(x / 360) * 23 +
      Math.sin(x / 93) * 8
    );
  },
  dockAt(x, y) {
    const m = this.map();
    return m.docks.some((d) => {
      const onPier =
        x > d.x * T &&
        x < (d.x + d.w) * T &&
        y > d.y * T &&
        y < (d.y + d.h) * T;
      const bridgeX = (d.x + d.w * 0.5) * T;
      const onRaisedApproach =
        Math.abs(x - bridgeX) < 2.3 * T &&
        y > (m.waterStart - 14) * T &&
        y < d.y * T + 12;
      return onPier || onRaisedApproach;
    });
  },
  isWater(x, y) {
    return y > this.coastY(x) && !this.dockAt(x, y);
  },
  wallCollides(b, x, y, r = 11) {
    let x0 = b.x * T,
      y0 = b.y * T,
      x1 = (b.x + b.w) * T,
      y1 = (b.y + b.h) * T;
    if (x < x0 - r || x > x1 + r || y < y0 - r || y > y1 + r) return false;
    const thick = 17,
      door = (x0 + x1) / 2,
      open = Math.abs(x - door) < 45 - r / 3,
      north = b.doorSide === "north";
    return (
      x < x0 + thick + r ||
      x > x1 - thick - r ||
      (y < y0 + thick + r && !(north && open)) ||
      (y > y1 - thick - r && !(!north && open))
    );
  },
  walkable(x, y) {
    const m = this.map(),
      r = 11;
    if (x < r || y < r || x > m.w * T - r || y > m.h * T - r) return false;
    if (this.isWater(x, y)) return false;
    for (const b of m.buildings)
      if (this.wallCollides(b, x, y, r)) return false;
    for (const o of m.decor)
      if (["tree", "stone", "crate"].includes(o.type)) {
        let ox = (o.x + o.w * 0.45) * T,
          oy = (o.y + o.h * 0.55) * T;
        if (
          distance(x, y, ox, oy) <
          (o.type === "tree" ? 13 : o.type === "stone" ? 10 : 12) + r
        )
          return false;
      }
    return true;
  },
  portal(o) {
    if (this.mapId === "hub") {
      if (o.id === "hub.outer" || o.id === "hub.depart")
        this.open(
          "OUTER QUAYS DEPARTURE",
          `<p>Leave the protected harbor for the ruined quays. Extractions return you to Salvager's Rest.</p><p class="muted">A raid lasts ${Math.floor(this.mechanics().raidSeconds / 60)} minutes. Gear carried on death is lost.</p><button class="primary" data-act="deploy">DEPLOY INTO THE OUTER QUAYS</button>`,
        );
      else this.notify("Saltwatch proper will open in a later build");
      return;
    }
    if (!this.raid) return;
    const t = this.raid.time,
      phase = this.tide();
    let valid =
      o.id === "quays.west" ||
      o.id === "quays.storm" ||
      (o.id === "quays.cart" && phase === "low") ||
      (o.id === "quays.skiff" && phase !== "low");
    if (valid) this.endRaid(true, "Reached " + o.name);
    else
      this.notify(
        o.id === "quays.cart"
          ? "Cart track has flooded"
          : "Pilot skiff requires rising tide",
      );
  },
  endRaid(success, reason) {
    if (!this.raid) return;
    let raid = this.raid;
    if (success) {
      this.quest.emit("extract", "quays.west");
      this.save.completedRaids++;
      for (let i = 0; i < 2; i++)
        if (this.player.mag[i])
          addItem(
            this.save.bag,
            i === 0 ? "bolt" : "wick_cell",
            this.player.mag[i],
          );
      this.player.mag = [0, 0];
    } else {
      this.save.quests = raid.questSnapshot;
      this.save.bag = {};
      this.save.weapons = { arbalest: false, wickcaster: false };
      this.save.weaponCondition = { arbalest: 0, wickcaster: 0 };
      this.save.failedRaids++;
      this.player.mag = [0, 0];
    }
    this.raid = null;
    this.setArea("hub", 51, 61);
    this.player.hp = 100;
    this.player.st = 100;
    this.player.bleed = 0;
    this.ensureQuickSlots();
    this.store();
    this.open(
      success ? "EXTRACTION SUCCESS" : "EXPEDITION LOST",
      `<div class="callout">${safeText(reason)}</div><p>${success ? "Your gathered items remain in your backpack. Deposit them at the Personal Stash to secure them for future raids." : "Your equipped weapons, ammunition and backpack contents were lost. Items in your permanent stash survived."}</p><p><b>Creatures defeated:</b> ${raid.kills} &nbsp; <b>Opened containers:</b> ${raid.opened.length}</p><p class="muted">Successful raids: ${this.save.completedRaids} · Failed raids: ${this.save.failedRaids}</p>`,
    );
  },
});
