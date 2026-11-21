Object.assign(Game.prototype, {
  journal(board = false) {
    let parts = [];
    for (const q of this.world.content.quests) {
      let s = this.quest.state(q.id),
        st = this.quest.progress(q),
        ready = this.quest.available(q);
      if (!s && !ready) continue;
      parts.push(
        `<div class="card"><b>${safeText(q.title)}</b> <span class="badge">${s?.status === "done" ? "COMPLETE" : s ? "ACTIVE" : "AVAILABLE"}</span><p class="mutedLabel">${safeText(q.summary)}</p>${st ? `<p>› ${safeText(st.description)} <small class="mutedLabel">(${s.stage + 1}/${q.stages.length})</small></p>` : ""}${ready && board ? `<button data-act="accept" data-id="${q.id}">ACCEPT CONTRACT</button>` : ""}</div>`,
      );
    }
    this.open(
      board ? "CONTRACT NOTICE BOARD" : "QUEST JOURNAL",
      parts.join("") || "<p>No contracts available.</p>",
    );
  },
  showPack() {
    this.open(
      "EXPEDITION BACKPACK",
      `<div class="row"><span>Weight ${weight(this.save.bag).toFixed(1)} / ${this.mechanics().comfortWeight} kg comfortable</span><span>${this.save.gold} scrip</span></div><div class="scroll">${renderInventory(this.save.bag, (id, n) => (["bandage", "healing_tincture", "ration"].includes(id) ? `<button data-act="consume" data-id="${id}">USE</button>` : ""))}</div><p class="fine">Items carried into a raid can be lost. Use the Personal Stash in the hub for permanent storage.</p>`,
    );
  },
  mapPanel() {
    const m = this.map(),
      directory = (kind, records) =>
        records
          .map(
            (o) =>
              `<button class="mapPlace" data-act="mapselect" data-id="${safeText(kind + "|" + o.id)}"><span>${safeText(o.name)}</span><small>${kind === "building" ? "BUILDING" : kind === "area" ? "DISTRICT" : "PASSAGE / EXIT"}</small></button>`,
          )
          .join("");
    this.open(
      "REGIONAL FIELD MAP",
      `<p class="fine mapIntro">Every building, district and exit is named. Select a location from the directory or click its marker on the map.</p><div class="mapLayout"><div class="mapLeft"><canvas id="mapCanvas" width="760" height="510" aria-label="Labeled map of ${safeText(m.name)}. Click a location to identify it."></canvas><div class="mapLegend"><span><i class="legendDot you"></i> YOU</span><span><i class="legendDot building"></i> BUILDINGS</span><span><i class="legendDot area"></i> DISTRICTS</span><span><i class="legendDot exit"></i> EXITS</span></div><div id="mapDetails" class="callout mapDetails">Select a named location to see its position and distance.</div></div><div class="mapDirectory"><h3>Districts / Areas</h3>${directory("area", m.zones || [])}<h3>Buildings</h3>${directory("building", m.buildings)}<h3>Passages / Extractions</h3>${directory("exit", m.portals)}</div></div><p class="fine">Coordinates are fixed. Distance means straight-line distance, not a calculated walking route. Press <b>M</b> or <b>Esc</b> to return to gameplay.</p>`,
    );
    this.renderMapPanel();
    const c = $("mapCanvas");
    if (c) {
      c.height = Math.round((c.width * m.h) / m.w);
      c.style.aspectRatio = c.width + " / " + c.height;
      this.renderMapPanel();
    }
    c?.addEventListener("click", (e) => {
      const r = c.getBoundingClientRect(),
        x = ((e.clientX - r.left) / r.width) * c.width,
        y = ((e.clientY - r.top) / r.height) * c.height;
      let closest = null,
        score = Infinity;
      for (const entry of this.mapMarkers) {
        let d = Math.hypot(x - entry.px, y - entry.py);
        if (d < score) {
          score = d;
          closest = entry;
        }
      }
      if (closest && score < 40) {
        this.mapSelection = closest.id;
        this.renderMapPanel();
      }
    });
  },
  mapEntry() {
    if (!this.mapSelection) return null;
    const [kind, id] = this.mapSelection.split("|"),
      m = this.map();
    let group =
      kind === "area"
        ? m.zones
        : kind === "building"
          ? m.buildings
          : kind === "exit"
            ? m.portals
            : null;
    let item = group?.find((o) => o.id === id);
    if (!item) return null;
    return {
      kind,
      item,
      x: item.x + (item.w || 0) / 2,
      y: item.y + (item.h || 0) / 2,
    };
  },
  mapLabel(ctx, name, cx, cy, maxWidth, colors, selected = false) {
    const font = selected ? 11 : 10;
    ctx.font = `700 ${font}px system-ui`;
    const allowed = Math.max(54, Math.min(maxWidth, 174));
    let lines = [],
      line = "";
    for (const word of String(name).split(/\s+/)) {
      let next = line ? line + " " + word : word;
      if (line && ctx.measureText(next).width > allowed - 16) {
        lines.push(line);
        line = word;
      } else line = next;
    }
    if (line) lines.push(line);
    if (lines.length > 3) {
      lines = lines.slice(0, 3);
      lines[2] = lines[2].replace(/\s+\S+$/, "") + "…";
    }
    const w = Math.min(
        ctx.canvas.width - 8,
        Math.max(
          47,
          Math.max(...lines.map((t) => ctx.measureText(t).width)) + 14,
        ),
      ),
      h = lines.length * (font + 3) + 7;
    const x = clamp(cx - w / 2, 3, ctx.canvas.width - w - 3);
    const used = this.mapLabelRects || (this.mapLabelRects = []),
      overlap = (y0) =>
        used.some(
          (r) =>
            x < r.x + r.w + 3 &&
            x + w + 3 > r.x &&
            y0 < r.y + r.h + 3 &&
            y0 + h + 3 > r.y,
        );
    const candidates = [
      0,
      -h - 5,
      h + 5,
      -2 * h - 9,
      2 * h + 9,
      -3 * h - 14,
      3 * h + 14,
    ];
    let y = clamp(cy - h / 2, 3, ctx.canvas.height - h - 3);
    for (const off of candidates) {
      let yy = clamp(cy - h / 2 + off, 3, ctx.canvas.height - h - 3);
      if (!overlap(yy)) {
        y = yy;
        break;
      }
    }
    used.push({ x, y, w, h });
    ctx.fillStyle = selected ? "#e8bd75e9" : colors.bg;
    ctx.fillRect(x, y, w, h);
    ctx.lineWidth = selected ? 2 : 1;
    ctx.strokeStyle = selected ? "#fff4d3" : colors.line;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    ctx.fillStyle = selected ? "#23292a" : colors.text;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    lines.forEach((t, i) =>
      ctx.fillText(t, x + w / 2, y + 7 + (i + 0.5) * (font + 3), w - 9),
    );
  },
  renderMapPanel() {
    const c = $("mapCanvas");
    if (!c) return;
    const ctx = c.getContext("2d"),
      m = this.map(),
      sx = c.width / m.w,
      sy = c.height / m.h;
    ctx.fillStyle = "#625c4f";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = "#28565d";
    ctx.fillRect(0, m.waterStart * sy, c.width, c.height - m.waterStart * sy);
    // Soft, fixed district boundaries; drawn under all landmarks so they never obscure roads.
    for (const z of m.zones || []) {
      ctx.fillStyle = "#d5ad6c17";
      ctx.fillRect(z.x * sx, z.y * sy, z.w * sx, z.h * sy);
      ctx.strokeStyle = "#c5aa7870";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(
        z.x * sx + 0.5,
        z.y * sy + 0.5,
        z.w * sx - 1,
        z.h * sy - 1,
      );
    }
    ctx.setLineDash([]);
    ctx.strokeStyle = "#a78a68";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const road of m.roads) {
      ctx.beginPath();
      road.pts.forEach(([x, y], i) =>
        i ? ctx.lineTo(x * sx, y * sy) : ctx.moveTo(x * sx, y * sy),
      );
      ctx.lineWidth = Math.max(2, (road.width * (sx + sy)) / 2);
      ctx.stroke();
    }
    for (const dock of m.docks) {
      ctx.fillStyle = "#a98c66";
      ctx.fillRect(dock.x * sx, dock.y * sy, dock.w * sx, dock.h * sy);
    }
    for (const b of m.buildings) {
      ctx.fillStyle = "#3c3732";
      ctx.fillRect(b.x * sx - 1, b.y * sy - 1, b.w * sx + 2, b.h * sy + 2);
      ctx.fillStyle = "#986f59";
      ctx.fillRect(b.x * sx, b.y * sy, b.w * sx, b.h * sy);
    }
    this.mapMarkers = [];
    this.mapLabelRects = [];
    const track = (kind, item, px, py) =>
      this.mapMarkers.push({ id: kind + "|" + item.id, px, py });
    // Every area and building gets a permanent visible text label, including on the first opening of M.
    for (const z of m.zones || []) {
      let x = (z.x + z.w / 2) * sx,
        y = (z.y + Math.min(3, z.h * 0.2)) * sy;
      track("area", z, x, y);
      this.mapLabel(
        ctx,
        z.name.toUpperCase(),
        x,
        y,
        Math.max(86, z.w * sx * 0.75),
        { bg: "#213a36db", line: "#acc18b", text: "#dbefcc" },
        this.mapSelection === "area|" + z.id,
      );
    }
    for (const b of m.buildings) {
      let x = (b.x + b.w / 2) * sx,
        y = (b.y + b.h / 2) * sy;
      track("building", b, x, y);
      this.mapLabel(
        ctx,
        b.name,
        x,
        y,
        Math.max(58, b.w * sx - 4),
        { bg: "#182527ec", line: "#b68d6a", text: "#f7e3bd" },
        this.mapSelection === "building|" + b.id,
      );
    }
    for (const p of m.portals) {
      let x = p.x * sx,
        y = p.y * sy;
      track("exit", p, x, y);
      ctx.fillStyle = "#c2ebd9";
      ctx.beginPath();
      ctx.arc(x, y, 7, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = "#143c3a";
      ctx.lineWidth = 2;
      ctx.stroke();
      this.mapLabel(
        ctx,
        p.name,
        x,
        y - 21,
        124,
        { bg: "#183a3ceb", line: "#80c9b2", text: "#c5f4df" },
        this.mapSelection === "exit|" + p.id,
      );
    }
    const px = (this.player.x / T) * sx,
      py = (this.player.y / T) * sy;
    ctx.fillStyle = "#f5cf75";
    ctx.strokeStyle = "#24201a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(px, py, 7, 0, TAU);
    ctx.fill();
    ctx.stroke();
    this.mapLabel(ctx, "YOU", px, py - 18, 58, {
      bg: "#3f3320f0",
      line: "#e6bc72",
      text: "#ffe5a7",
    });
    const chosen = this.mapEntry();
    if (chosen) {
      const loc = $("mapDetails"),
        dx = chosen.x - this.player.x / T,
        dy = chosen.y - this.player.y / T,
        steps = Math.round(Math.hypot(dx, dy)),
        direction =
          (Math.abs(dx) > 4 ? (dx > 0 ? "E" : "W") : "") +
          (Math.abs(dy) > 4 ? (dy > 0 ? "S" : "N") : "");
      loc.textContent = `${chosen.item.name} · ${chosen.kind.toUpperCase()} · Tile ${Math.round(chosen.x)}, ${Math.round(chosen.y)} · About ${steps} tiles ${direction || "nearby"} from you`;
    } else
      $("mapDetails").textContent =
        "Select a named location on the map or from the directory to locate it.";
    document
      .querySelectorAll(".mapPlace")
      .forEach((n) =>
        n.classList.toggle("active", n.dataset.id === this.mapSelection),
      );
  },
  systemPanel() {
    this.open(
      "PLAYER SAVE",
      `<div class="callout">Your character, equipment, stash, money and finished quests save automatically in this browser. World editing and world updates are managed separately by the developer.</div><div class="actions"><button data-act="manualsave">SAVE PLAYER PROGRESS</button><button data-act="exportsave">EXPORT PLAYER BACKUP</button><button data-act="importsave">LOAD PLAYER BACKUP</button><button data-act="restoresave">RESTORE PREVIOUS PLAYER SAVE</button></div><p class="fine dangerText">Important: Browser storage may be cleared or differ between local HTML files. Export your player save before switching versions. Unextracted raid loot is not saved.</p>`,
    );
  },
  help() {
    this.open(
      "CONTROLS & GAMEPLAY",
      `<div class="cols"><div><h3>CONTROLS</h3><p>WASD move · Shift sprint<br>Space directional dodge<br>Mouse aim and left click fire<br>Q cycle primary / secondary · knife fallback<br>R reload · E interact / extract<br>1–0 use assigned quick slots · F bandage · Tab inventory · G factions<br>M map · J quests · Mouse wheel zoom</p></div><div><h3>GAMEPLAY LOOP</h3><p>Accept contracts in Salvager's Rest. Buy equipment and keep valuables in the secure stash. Enter the Outer Quays, loot and fight, and extract safely.</p><p class="muted">Death loses equipment and carried loot but not secure stash, money or completed quests. Quest progress earned during a failed raid is rolled back.</p></div></div><p class="callout">A first integrated systems build; additional enemy pathfinding, animation atlases and economy balancing remain future work.</p>`,
    );
  },
  async applySave(file) {
    try {
      let o = JSON.parse(await file.text());
      if (o?.version !== 4 || !o.bag || !o.quests || !o.stash)
        throw Error("Incompatible player save");
      put(BACKUP_KEY, JSON.stringify(this.save));
      this.save = o;
      this.save.quickSlots ||= QUICK_DEFAULT.slice();
      this.save.factionStanding ||= {};
      this.player.hp = 100;
      this.player.st = 100;
      this.raid = null;
      this.setArea("hub", 50, 46);
      this.store();
      this.notify("Player progress restored");
    } catch (e) {
      this.notify("Could not load save: " + e.message, 5);
    }
  },
  doAction(a, node) {
    switch (a) {
      case "close":
        this.close();
        return;
      case "start":
        this.start();
        return;
      case "deploy":
        this.beginRaid();
        return;
      case "choice":
        this.choose(Number(node.dataset.i));
        return;
      case "accept":
        this.quest.accept(node.dataset.id);
        this.journal(true);
        return;
      case "deposit":
        this.deposit(node.dataset.id, true);
        return;
      case "withdraw":
        this.withdraw(node.dataset.id);
        return;
      case "depositall":
        for (const k of Object.keys(this.save.bag))
          if (itemDef(k).category !== "quest") this.depositWithoutRefresh(k);
        this.store();
        this.stash();
        return;
      case "buy":
        this.buy(node.dataset.id);
        return;
      case "sell":
        this.sell(node.dataset.id);
        return;
      case "consume":
        this.consume(node.dataset.id);
        return;
      case "choosebind":
        this.quickBindMenu(node.dataset.id);
        return;
      case "assignquick":
        this.bindQuickSlot(Number(node.dataset.slot), node.dataset.id);
        this.showPack();
        return;
      case "clearquick":
        this.bindQuickSlot(Number(node.dataset.slot), null);
        this.showPack();
        return;
      case "repairall": {
        let cost = Object.entries(this.save.weaponCondition).reduce(
          (a, [id, v]) =>
            a + (this.save.weapons[id] ? Math.ceil((100 - v) * 0.5) : 0),
          0,
        );
        if (this.save.gold < cost) {
          this.notify("Not enough scrip");
          return;
        }
        this.save.gold -= cost;
        for (const k of Object.keys(this.save.weaponCondition))
          if (this.save.weapons[k]) this.save.weaponCondition[k] = 100;
        this.store();
        this.notify("Weapons serviced");
        this.close();
        return;
      }
      case "mapselect":
        this.mapSelection = node.dataset.id;
        this.renderMapPanel();
        return;
      case "exportsave":
        download("SALTWAKE_Player_Save.json", this.save);
        return;
      case "importsave":
        $("loadSave").click();
        return;
      case "manualsave":
        put(BACKUP_KEY, get(SAVE_KEY) || JSON.stringify(this.save));
        this.store();
        this.notify("Player progress saved (backup created)");
        return;
      case "restoresave": {
        let old = get(BACKUP_KEY);
        if (!old) {
          this.notify("No previous backup available");
          return;
        }
        if (
          !confirm(
            "Restore previous player save? Current progress will be replaced.",
          )
        )
          return;
        this.applySave({ text: async () => old });
        return;
      }
    }
  },
});
