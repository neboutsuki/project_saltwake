Object.assign(Game.prototype, {
  render(now) {
    if (this.toastUntil && now > this.toastUntil) {
      $("toast").hidden = true;
      this.toastUntil = 0;
    }
    this.camera.zoom += (this.camera.target - this.camera.zoom) * 0.18;
    let m = this.map(),
      viewW = VW / this.camera.zoom,
      viewH = VH / this.camera.zoom;
    this.camera.x = clamp(this.player.x - viewW / 2, 0, m.w * T - viewW);
    this.camera.y = clamp(this.player.y - viewH / 2, 0, m.h * T - viewH);
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = "#263b3b";
    g.fillRect(0, 0, VW, VH);
    g.setTransform(this.camera.zoom, 0, 0, this.camera.zoom, 0, 0);
    g.translate(-this.camera.x, -this.camera.y);
    let view = {
      x0: this.camera.x - 100,
      y0: this.camera.y - 100,
      x1: this.camera.x + viewW + 100,
      y1: this.camera.y + viewH + 100,
    };
    this.drawTerrain(view);
    this.drawRoads();
    this.drawDocks(view);
    this.drawDecor(view, false);
    this.drawStructures(view);
    this.drawFixtures(view);
    this.drawContent(view);
    this.drawDecor(view, true);
    this.drawActors(view);
    g.setTransform(1, 0, 0, 1, 0, 0);
    if (!this.panel && this.mode === "play" && this.raid) {
      g.strokeStyle = "#f7e8cc";
      g.lineWidth = 1;
      let x = this.mouse.x,
        y = this.mouse.y;
      g.beginPath();
      g.moveTo(x - 10, y);
      g.lineTo(x - 3, y);
      g.moveTo(x + 3, y);
      g.lineTo(x + 10, y);
      g.moveTo(x, y - 10);
      g.lineTo(x, y - 3);
      g.moveTo(x, y + 3);
      g.lineTo(x, y + 10);
      g.stroke();
    }
  },
  visible(x, y, w, h, v) {
    return x < v.x1 && y < v.y1 && x + w > v.x0 && y + h > v.y0;
  },
  fill(x, y, w, h, color) {
    g.fillStyle = color;
    g.fillRect(Math.round(x), Math.round(y), Math.ceil(w), Math.ceil(h));
  },
  text(txt, x, y, size = 11, color = "#e9ddc4", align = "center") {
    g.font = `bold ${size}px monospace`;
    g.textAlign = align;
    g.fillStyle = "#151916";
    g.fillText(txt, x + 1, y + 1);
    g.fillStyle = color;
    g.fillText(txt, x, y);
  },
  drawDecor(v, front) {
    for (const o of this.map().decor) {
      let x = o.x * T,
        y = o.y * T,
        w = o.w * T,
        h = o.h * T;
      if (!this.visible(x - 20, y - 95, w + 40, h + 120, v)) continue;
      const isFront = ["tree", "lantern", "crate"].includes(o.type);
      if (front !== isFront) continue;
      const variant = this.world.graphics?.overrides?.[o.id] ?? o.variant ?? 0;
      const key =
        o.type === "tree"
          ? variant % 2 === 0
            ? "vegetation/tall-pine"
            : "vegetation/short-pine"
          : o.type === "shrub"
            ? variant % 2
              ? "vegetation/red-scrub-b"
              : "vegetation/red-scrub"
            : o.type === "grass"
              ? variant % 2
                ? "vegetation/dry-grass-b"
                : "vegetation/dry-grass"
              : o.type === "stone"
                ? variant % 3 === 1
                  ? "props/rock-pile-b"
                  : variant % 3 === 0
                    ? "props/rock-pile"
                    : "props/large-boulder"
                : o.type === "crate"
                  ? variant % 2
                    ? "props/crate-b"
                    : "props/crate"
                  : o.type === "lantern"
                    ? "props/lantern"
                    : null;
      let sw = w,
        sh = h,
        sy = y;
      if (o.type === "tree") {
        sw = Math.max(w * 1.35, 55);
        sh = Math.max(h * 1.8, 85);
        sy = y + h - sh;
      }
      if (o.type === "grass") {
        sw = Math.max(w * 1.1, 14);
        sh = Math.max(h * 0.95, 13);
        sy = y + h - sh;
      }
      if (o.type === "lantern") {
        sw = Math.max(w, 32);
        sh = Math.max(h * 2.25, 70);
        sy = y + h - sh;
      }
      if (o.type === "stone") {
        sw = w * 1.1;
        sh = h * 1.05;
        sy = y + h - sh;
      }
      if (key && !SPRITES.draw(g, key, x + (w - sw) / 2, sy, sw, sh))
        this.fill(x, y, w, h, "#777266");
    }
  },
  drawStructures(v) {
    let roofColor =
      this.world.graphics?.roof === "slate"
        ? "#62686c"
        : this.world.graphics?.roof === "red"
          ? "#91534a"
          : "#8c554b";
    for (const b of this.map().buildings) {
      let x = b.x * T,
        y = b.y * T,
        w = b.w * T,
        h = b.h * T;
      if (!this.visible(x - 45, y - 50, w + 80, h + 100, v)) continue;
      let p = this.player,
        inside =
          p.x > x + 20 && p.x < x + w - 20 && p.y > y + 20 && p.y < y + h - 14;
      let variant = this.world.graphics?.overrides?.[b.id] ?? b.variant;
      const imageId = SPRITES.image("prefab/" + b.id)
        ? "prefab/" + b.id
        : b.type === "workshop"
          ? "buildings/workshop"
          : b.type === "warehouse"
            ? "buildings/warehouse"
            : b.type === "office"
              ? "buildings/stone-house"
              : b.type === "cave"
                ? "props/large-boulder"
                : variant % 3 === 1
                  ? "buildings/stone-house"
                  : "buildings/wood-house";
      if (!inside && SPRITES.draw(g, imageId, x - 5, y - 36, w + 10, h + 61)) {
        const fontSize = w < 470 ? 11 : 14,
          cy = y + 38,
          titleWidth = b.name.length * fontSize * 0.64 + 20;
        this.fill(
          x + w / 2 - titleWidth / 2,
          cy - fontSize,
          titleWidth,
          fontSize + 8,
          "#1a2426db",
        );
        this.text(b.name.toUpperCase(), x + w / 2, cy, fontSize, "#fff0d0");
        continue;
      }
      if (inside && SPRITES.draw(g, "interior/" + b.id, x, y, w, h)) {
        this.fill(x + w / 2 - 90, y + 29, 180, 23, "rgba(26,33,32,.74)");
        this.text(b.name.toUpperCase(), x + w / 2, y + 44, 11, "#f6dfb0");
        continue;
      }

      this.fill(x + 11, y + 16, w + 8, h + 13, "#1a2627");
      this.fill(x, y, w, h, "#8e806d");
      this.fill(x + 18, y + 18, w - 36, h - 36, "#554d41");
      for (let ix = x + 25; ix < x + w - 20; ix += 58)
        for (let iy = y + 24; iy < y + h - 18; iy += 54) {
          this.fill(ix, iy, Math.min(30, x + w - ix - 20), 3, "#716555");
        }
      let doorX = x + w / 2,
        northDoor = b.doorSide === "north";
      this.fill(x, y, 17, h, "#98866d");
      this.fill(x + w - 17, y, 17, h, "#94806a");
      const wallY = northDoor ? y : y + h - 17,
        otherY = northDoor ? y + h - 17 : y;
      this.fill(x, otherY, w, 17, "#c0ac8e");
      this.fill(x, wallY, w / 2 - 43, 17, "#b5a083");
      this.fill(doorX + 43, wallY, w / 2 - 43, 17, "#b5a083");
      this.fill(doorX - 41, wallY + 1, 82, 16, "#392f29");
      this.fill(doorX - 33, wallY + 3, 66, 13, "#5b4734");
      for (let i = 0; i < 3; i++) {
        let sx = x + 33 + i * ((w - 66) / 3);
        this.fill(sx, y + h - 52, 24, 24, "#2f3431");
        this.fill(sx + 4, y + h - 48, 16, 17, "#b59669");
        this.fill(sx + 11, y + h - 47, 3, 16, "#3e4038");
      }
      if (!inside) {
        g.save();
        g.globalAlpha = 0.94;
        this.fill(x + 7, y - 24, w - 14, h - 10, "#463a35");
        let col =
          variant === 1 ? "#745654" : variant === 2 ? "#745f50" : roofColor;
        this.fill(x + 15, y - 17, w - 30, h - 25, col);
        this.fill(
          x + 23,
          y - 9,
          w - 46,
          h - 41,
          variant === 0 ? "#975f54" : col,
        );
        for (let ix = x + 22; ix < x + w - 18; ix += 17)
          this.fill(ix, y - 14, 4, h - 31, "#5c3b36");
        g.restore();
      }
      if (northDoor) {
        this.fill(doorX - 37, y - 25, 74, 11, "#262e2a");
        this.fill(doorX - 30, y - 23, 60, 8, "#b5916c");
        this.text("ENTRY", doorX, y - 17, 9, "#f6dfb0");
      }
      let fontSize = w < 470 ? 11 : 14;
      let labelY = inside ? y + 40 : y + 42;
      this.fill(
        doorX - (b.name.length * fontSize * 0.34 + 12),
        labelY - fontSize,
        b.name.length * fontSize * 0.68 + 24,
        fontSize + 8,
        "#222829c8",
      );
      this.text(b.name.toUpperCase(), doorX, labelY, fontSize, "#f0d4a9");
      if (!northDoor) this.fill(doorX - 33, y + h - 10, 66, 5, "#bea17a");
    }
  },
  /** Draw a sprite at its natural size with its bottom-centre at (cx, bottom). */
  drawNative(key, cx, bottom, scale = 1) {
    const im = SPRITES.image(key);
    if (!im) return false;
    const w = im.naturalWidth * scale,
      h = im.naturalHeight * scale;
    g.drawImage(im, Math.round(cx - w / 2), Math.round(bottom - h), w, h);
    return true;
  },
  drawFixtures(v) {
    for (const o of this.map().features) {
      let x = o.x * T,
        y = o.y * T,
        w = o.w * T,
        h = o.h * T;
      if (!this.visible(x, y, w, h, v)) continue;
      const fixtureAsset =
        o.kind === "lantern" || o.kind === "tide"
          ? "props/lantern"
          : o.kind === "cistern"
            ? "props/barrel"
            : o.kind === "hoist" || o.kind === "board"
              ? "props/pier"
              : null;
      // Props are drawn at native pixel size (1 art px = 1 world px), anchored
      // to the bottom-centre of their footprint, so every sprite shares the
      // same texel density as actors and terrain. The footprint is unchanged.
      const cx = x + w / 2,
        base = y + h - 6;
      if (o.kind === "cistern" && SPRITES.image("props/barrel")) {
        // a rainwater cistern reads as a cluster of storage casks
        for (const [dx, dy] of [
          [-24, -14],
          [22, -16],
          [0, 0],
        ])
          this.drawNative("props/barrel", cx + dx, base + dy);
        continue;
      }
      if (fixtureAsset && this.drawNative(fixtureAsset, cx, base)) continue;
      this.fill(x + 8, y + 12, w - 5, h - 3, "#2f3430");
      this.fill(
        x,
        y,
        w - 7,
        h - 8,
        o.kind === "lantern"
          ? "#a26f50"
          : o.kind === "cistern"
            ? "#617779"
            : "#7b6652",
      );
      this.fill(
        x + 11,
        y + 11,
        w - 28,
        h - 25,
        o.kind === "lantern" ? "#e7b36f" : "#3f4743",
      );
    }
    for (const p of this.map().portals) {
      let x = p.x * T,
        y = p.y * T;
      if (!this.visible(x - 75, y - 80, 150, 160, v)) continue;
      g.strokeStyle =
        p.id === "quays.cart" && this.tide() !== "low" ? "#9a6657" : "#b0d1aa";
      g.lineWidth = 4;
      g.strokeRect(x - 27, y - 27, 54, 54);
      this.fill(x - 18, y - 43, 36, 5, "#b3c9a7");
      this.text(p.name.toUpperCase().slice(0, 28), x, y - 56, 11, "#e6d9b9");
    }
  },
  drawContent(v) {
    for (const n of this.world.content.npcs) {
      if (n.mapId !== this.mapId) continue;
      let np = this.npcLocation(n),
        x = np.x,
        y = np.y;
      if (!this.visible(x - 30, y - 65, 60, 100, v)) continue;
      this.drawFactionHuman(x, y, n.factionId || "licensed_salvagers", n.role);
      this.text(n.name, x, y - 40, 11, "#eee5d6");
    }
    for (const o of this.world.content.interactables) {
      if (o.mapId !== this.mapId) continue;
      let x = o.x * T,
        y = o.y * T;
      if (!this.visible(x - 28, y - 30, 56, 60, v)) continue;
      if (
        o.kind === "rest" &&
        SPRITES.draw(g, "props/bedroll", x - 39, y - 22, 78, 50)
      ) {
        this.text("REST", x, y - 32, 11, "#f5ddb4");
      } else if (
        o.kind === "stash" &&
        SPRITES.draw(g, "props/chest", x - 30, y - 24, 60, 45)
      ) {
        this.text("STASH", x, y - 32, 11, "#f5ddb4");
      } else if (o.kind === "rest") {
        this.fill(x - 28, y - 14, 56, 29, "#644b38");
        this.fill(x - 23, y - 10, 46, 22, "#b8a88e");
        this.fill(x - 19, y - 8, 12, 17, "#e4d5b2");
        this.fill(x - 4, y - 7, 25, 17, "#777e79");
        this.text("REST", x, y - 25, 10, "#f5ddb4");
      } else if (o.kind === "stash") {
        this.fill(x - 21, y - 15, 42, 29, "#49382c");
        this.fill(x - 18, y - 13, 36, 26, "#96734f");
        this.fill(x - 5, y - 12, 10, 25, "#c8ac79");
        this.fill(x - 19, y - 7, 38, 3, "#c7a879");
        this.text("STASH", x, y - 24, 10, "#f5ddb4");
      } else {
        this.fill(x - 15, y - 7, 30, 22, "#574536");
        this.fill(x - 12, y - 8, 24, 9, "#ba956c");
        this.text(
          o.kind === "travel" ? "↗" : o.kind === "quest_board" ? "!" : "E",
          x,
          y + 5,
          13,
          "#fff0ca",
        );
      }
    }
    for (const o of this.world.content.containers) {
      if (o.mapId !== this.mapId || this.raid?.opened.includes(o.id)) continue;
      let x = o.x * T,
        y = o.y * T;
      if (!this.visible(x - 25, y - 30, 50, 60, v)) continue;
      if (!SPRITES.draw(g, "props/chest", x - 20, y - 23, 42, 36))
        this.fill(x - 13, y - 10, 28, 23, "#927354");
    }
    if (this.raid)
      for (const o of this.raid.drops) {
        if (o.got) continue;
        if (!this.visible(o.x - 15, o.y - 15, 30, 30, v)) continue;
        this.fill(o.x - 8, o.y - 7, 16, 10, "#d0ac76");
        this.fill(o.x - 4, o.y - 4, 6, 4, "#fae0a9");
      }
  },
  drawHuman(x, y, hostile = false, role = "") {
    const key = hostile
      ? "actors/wrecker"
      : role === "player"
        ? "actors/player-idle"
        : "actors/harbor-npc";
    if (SPRITES.draw(g, key, x - 22, y - 33, 44, 54)) return;
    this.fill(x - 11, y + 12, 23, 5, "#1d2627");
    this.fill(
      x - 8,
      y - 10,
      17,
      24,
      hostile ? "#82554d" : role === "Dockmaster" ? "#566768" : "#5c6461",
    );
    this.fill(x - 6, y + 9, 5, 12, "#3c3938");
    this.fill(x + 3, y + 9, 5, 12, "#343c3b");
    this.fill(x - 7, y - 23, 15, 13, "#b99b7a");
    this.fill(x - 10, y - 27, 21, 6, hostile ? "#b65a51" : "#434c4b");
    this.fill(x - 11, y - 12, 5, 17, "#9a7a5b");
  },
  drawFactionHuman(x, y, factionId, role = "") {
    const key =
      factionId === "player"
        ? "actors/player-idle"
        : factionId === "harbor_compact"
          ? "actors/compact"
          : factionId === "licensed_salvagers"
            ? "actors/salvager"
            : factionId === "neutral_crews"
              ? "actors/crew"
              : "actors/wrecker";
    if (!SPRITES.draw(g, key, x - 22, y - 34, 44, 54))
      this.drawHuman(x, y, factionId === "wreckers", role);
  },
  drawEnemy(e) {
    let x = e.x,
      y = e.y;
    if (e.actorType === "human") {
      this.drawFactionHuman(x, y, e.factionId);
      this.text(
        e.name || e.type,
        x,
        y - 43,
        9,
        e.factionId === "wreckers" ? "#efa89b" : "#d8ddc3",
      );
      return;
    }
    const key =
      e.type === "brineback"
        ? "actors/brineback"
        : e.type === "gull"
          ? "actors/gull"
          : e.type === "widow"
            ? "actors/widow"
            : e.type === "grazer"
              ? "actors/grazer"
              : null;
    if (
      key &&
      SPRITES.draw(
        g,
        key,
        x - (e.type === "brineback" ? 49 : 35),
        y - (e.type === "brineback" ? 36 : 29),
        e.type === "brineback"
          ? 104
          : e.type === "widow"
            ? 92
            : e.type === "gull"
              ? 74
              : 82,
        e.type === "brineback" ? 76 : e.type === "widow" ? 66 : 56,
      )
    )
      return;
    if (e.type === "wrecker") {
      this.drawFactionHuman(x, y, e.factionId || "wreckers");
      return;
    }
    if (e.type === "gull") {
      this.fill(x - 7, y - 10, 16, 23, "#bfc1b5");
      this.fill(x - 24, y - 5, 17, 6, "#858d89");
      this.fill(x + 8, y - 5, 17, 6, "#949994");
      this.fill(x + 1, y + 12, 5, 7, "#cb695c");
      return;
    }
    if (e.type === "widow") {
      this.fill(x - 20, y - 12, 40, 27, "#b6aca0");
      this.fill(x - 13, y - 17, 25, 30, "#e3d2bb");
      for (let i = -2; i <= 2; i++)
        this.fill(x + i * 12 - 5, y - 25, 5, 44, "#938c80");
      return;
    }
    this.fill(
      x - 27,
      y - 17,
      56,
      31,
      e.type === "brineback" ? "#85534a" : "#857659",
    );
    this.fill(
      x - 14,
      y - 21,
      29,
      13,
      e.type === "brineback" ? "#bb7a6b" : "#aa9275",
    );
    this.fill(x + 20, y - 10, 17, 17, "#6f4b41");
    this.fill(x + 33, y - 12, 7, 5, "#d2bea0");
    if (e.type === "brineback")
      for (let i = -19; i < 16; i += 10)
        this.fill(x + i, y - 26, 10, 9, "#c4b19e");
    else this.fill(x - 4, y - 32, 4, 14, "#b6a38a");
  },
  drawActors(v) {
    if (this.raid) {
      for (const e of this.raid.enemies)
        if (!e.dead && this.visible(e.x - 60, e.y - 60, 120, 120, v)) {
          this.drawEnemy(e);
          if (e.aggro > 0) {
            this.fill(e.x - 20, e.y - 42, 40, 4, "#483d3a");
            this.fill(e.x - 20, e.y - 42, 40 * (e.hp / e.maxHp), 4, "#bc695d");
          }
        }
      for (const b of this.raid.bullets)
        this.fill(b.x - 3, b.y - 3, 8, 4, b.enemy ? "#ff9570" : "#f6e0a7");
      for (const p of this.raid.particles) this.fill(p.x, p.y, 5, 3, p.color);
    }
    let p = this.player;
    this.drawFactionHuman(p.x, p.y, "player");
    if (p.roll > 0) {
      g.save();
      g.strokeStyle = "#e4d3aa";
      g.lineWidth = 3;
      g.beginPath();
      g.arc(p.x, p.y, 28, 0, TAU);
      g.stroke();
      g.restore();
    }
    g.save();
    g.translate(p.x, p.y - 9);
    g.rotate(p.angle);
    this.fill(
      4,
      -3,
      p.weapon === 2 ? 18 : 33,
      p.weapon === 2 ? 4 : 6,
      p.weapon === 2 ? "#d8cfac" : "#2c3232",
    );
    this.fill(14, -2, p.weapon === 2 ? 7 : 22, 2, "#c8ab7d");
    g.restore();
  },
  tick(time) {
    let dt = Math.min(0.034, (time - this.frameTime) / 1000 || 0);
    this.frameTime = time;
    this.update(dt);
    this.render(time);
    this.hud();
    requestAnimationFrame((t) => this.tick(t));
  },
});
