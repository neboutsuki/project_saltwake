Object.assign(Game.prototype, {
  update(dt) {
    if (this.isPaused()) return;
    let p = this.player,
      m = this.mechanics();
    p.cooldown = Math.max(0, p.cooldown - dt);
    p.rollCD = Math.max(0, p.rollCD - dt);
    p.iframes = Math.max(0, p.iframes - dt);
    p.hit = Math.max(0, p.hit - dt);
    let old = p.reload;
    p.reload = Math.max(0, p.reload - dt);
    if (old > 0 && p.reload === 0 && p.weapon < 2) {
      const w = this.weapon();
      if (w) {
        let n = Math.min(
          w.magSize - p.mag[p.weapon],
          itemCount(this.save.bag, w.ammoId),
        );
        addItem(this.save.bag, w.ammoId, -n);
        p.mag[p.weapon] += n;
      }
    }
    let dx = Number(!!this.keys.KeyD) - Number(!!this.keys.KeyA),
      dy = Number(!!this.keys.KeyS) - Number(!!this.keys.KeyW),
      len = Math.hypot(dx, dy);
    if (p.roll > 0) {
      this.move(p.rollX * m.rollSpeed * dt, p.rollY * m.rollSpeed * dt);
      p.roll = Math.max(0, p.roll - dt);
    } else if (len) {
      const sprint =
        !!(this.keys.ShiftLeft || this.keys.ShiftRight) && p.st > 0;
      let penalty = weight(this.save.bag) > m.comfortWeight ? 0.78 : 1;
      let speed = (sprint ? m.sprintSpeed : m.playerSpeed) * penalty;
      this.move((dx / len) * speed * dt, (dy / len) * speed * dt);
      p.st = clamp(p.st + (sprint ? -28 : 17) * dt, 0, 100);
    } else p.st = clamp(p.st + 26 * dt, 0, 100);
    let target = this.aimWorld();
    p.angle = rad(target.y - (p.y - 8), target.x - p.x);
    if (this.mouse.down && this.raid) this.shoot();
    if (!this.raid) this.updateWanderingNPCs(dt);
    if (this.raid) {
      const r = this.raid;
      r.time += dt;
      const tideNow = this.tide();
      if (tideNow !== r.lastTide) {
        r.lastTide = tideNow;
        if (tideNow === "rising")
          this.notify(
            "WARNING · Rising tide: the salt cart track will close",
            4,
          );
        else if (tideNow === "high")
          this.notify(
            "HIGH TIDE · Lower wharves are flooded. Storm Gate stays inland",
            4,
          );
      }
      if (
        r.events.includes("e_rumors") &&
        !r.rumorAnnounced &&
        r.time > 70 &&
        this.player.x > 105 * T
      ) {
        r.rumorAnnounced = true;
        this.notify(
          "RUMOR · Wreckers falsely blame the Drowned King for the storm",
          5,
        );
      }
      if (r.time >= m.raidSeconds) {
        this.endRaid(false, "The storm surge closed the last safe route");
        return;
      }
      if (p.bleed > 0) {
        p.hp -= p.bleed * dt * 1.8;
        if (p.hp <= 0) {
          this.endRaid(false, "You bled out on the quays");
          return;
        }
      }
      if (this.isWater(p.x, p.y + 17)) {
        p.wet = clamp(p.wet + 12 * dt, 0, 100);
        if (p.wet > 70) p.st = clamp(p.st - 8 * dt, 0, 100);
      } else p.wet = clamp(p.wet - 6 * dt, 0, 100);
      if (this.mouse.down) this.shoot();
      this.updateEnemies(dt);
      this.updateBullets(dt);
      this.updateParticles(dt);
    }
  },
  updateParticles(dt) {
    let r = this.raid;
    if (!r) return;
    for (let i = r.particles.length - 1; i >= 0; i--) {
      let p = r.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.t -= dt;
      if (p.t <= 0) r.particles.splice(i, 1);
    }
  },
  bind() {
    document.addEventListener("keydown", (e) => {
      if (
        [
          "Space",
          "Tab",
          "ArrowUp",
          "ArrowDown",
          "ArrowLeft",
          "ArrowRight",
        ].includes(e.code)
      )
        e.preventDefault();
      if (e.target?.tagName === "INPUT") return;
      this.keys[e.code] = true;
      if (e.repeat) return;
      if (e.code === "Escape") {
        if (this.panel) this.close();
        else if (this.mode === "play") this.help();
        return;
      }
      if (this.mode !== "play") return;
      switch (e.code) {
        case "Space":
          this.roll();
          break;
        case "KeyE":
          this.interact();
          break;
        case "KeyR":
          this.reload();
          break;
        case "KeyF":
          this.heal();
          break;
        case "KeyQ":
          this.cycleWeapon();
          break;
        case "KeyG":
          this.factionPanel();
          break;
        case "Digit1":
        case "Digit2":
        case "Digit3":
        case "Digit4":
        case "Digit5":
        case "Digit6":
        case "Digit7":
        case "Digit8":
        case "Digit9":
        case "Digit0":
          this.useQuickSlot((Number(e.code.slice(5)) + 9) % 10);
          break;
        case "Tab":
          this.panel ? this.close() : this.showPack();
          break;
        case "KeyM":
          this.panel ? this.close() : this.mapPanel();
          break;
        case "KeyJ":
          this.panel ? this.close() : this.journal();
          break;
        case "Numpad0":
          this.camera.target = 1;
          break;
        case "Equal":
        case "NumpadAdd":
          this.camera.target = clamp(this.camera.target + 0.1, 0.7, 1.65);
          break;
        case "Minus":
        case "NumpadSubtract":
          this.camera.target = clamp(this.camera.target - 0.1, 0.7, 1.65);
          break;
      }
    });
    document.addEventListener("keyup", (e) => delete this.keys[e.code]);
    window.addEventListener("blur", () => {
      this.keys = {};
      this.mouse.down = false;
    });
    C.addEventListener("pointermove", (e) => {
      let r = C.getBoundingClientRect();
      this.mouse.x = ((e.clientX - r.left) * VW) / r.width;
      this.mouse.y = ((e.clientY - r.top) * VH) / r.height;
    });
    C.addEventListener("pointerdown", (e) => {
      if (e.button === 0 && this.mode === "play") {
        C.focus();
        this.mouse.down = true;
        this.shoot();
      }
    });
    window.addEventListener("pointerup", () => (this.mouse.down = false));
    C.addEventListener("contextmenu", (e) => e.preventDefault());
    C.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        this.camera.target = clamp(
          this.camera.target + (e.deltaY < 0 ? 0.1 : -0.1),
          0.7,
          1.65,
        );
      },
      { passive: false },
    );
    document.addEventListener("click", (e) => {
      let n = e.target.closest(
        "[data-act],[data-action],[data-ui],[data-quick]",
      );
      if (!n) return;
      if (n.dataset.quick !== undefined) {
        this.useQuickSlot(Number(n.dataset.quick));
        return;
      }
      if (n.dataset.act) this.doAction(n.dataset.act, n);
      else if (n.dataset.action) this.doAction(n.dataset.action, n);
      else if (n.dataset.ui) {
        if (this.mode === "start") return;
        switch (n.dataset.ui) {
          case "journal":
            this.journal();
            break;
          case "pack":
            this.showPack();
            break;
          case "map":
            this.mapPanel();
            break;
          case "system":
            this.systemPanel();
            break;
          case "factions":
            this.factionPanel();
            break;
          case "help":
            this.help();
        }
      }
    });
    $("panelLayer").addEventListener("pointerdown", (e) => {
      if (e.target.id === "panelLayer") this.close();
    });
    $("loadSave").addEventListener("change", (e) => {
      if (e.target.files[0]) this.applySave(e.target.files[0]);
      e.target.value = "";
    });
  },
  questOfferText(q) {
    const giver = this.world.content.npcs.find((n) => n.id === q.offeredBy);
    const where = giver
      ? "Offered by " + giver.name
      : "Check the contract board";
    return this.raid ? where + " · after you extract" : where;
  },
  hud() {
    let p = this.player,
      m = this.mechanics(),
      q = this.quest.current(),
      st = q && this.quest.progress(q);
    $("questName").textContent =
      q?.title?.toUpperCase() || "NO ACTIVE CONTRACT";
    $("questObjective").textContent = st
      ? st.description
      : q
        ? this.questOfferText(q)
        : "All known contracts complete";
    $("locationLabel").textContent =
      this.map().name.toUpperCase() +
      (this.currentZone() ? " · " + this.currentZone().name.toUpperCase() : "");
    $("hpText").textContent = Math.max(0, Math.round(p.hp));
    $("stText").textContent = Math.round(p.st);
    $("hpBar").style.width = clamp(p.hp, 0, 100) + "%";
    $("stBar").style.width = clamp(p.st, 0, 100) + "%";
    $("bleedText").textContent = p.bleed ? "BLEEDING" : "—";
    $("weightText").textContent =
      weight(this.save.bag).toFixed(1) + " / " + m.comfortWeight + " KG";
    $("coinsText").textContent = this.save.gold + " SCRIP";
    $("areaText").textContent =
      this.currentZone()?.name.toUpperCase() ||
      (this.raid ? "OUTER QUAYS · DANGER" : "SALVAGER’S REST · SAFE");
    $("statusText").textContent =
      p.rollCD > 0
        ? "ROLL COOLDOWN " + p.rollCD.toFixed(1) + "s"
        : "SPACE · DODGE READY";
    $("phaseText").textContent = this.raid
      ? this.tide() === "low"
        ? "LOW TIDE"
        : this.tide() === "rising"
          ? "RISING TIDE"
          : "HIGH TIDE"
      : "SAFE HARBOR";
    let t = this.raid?.time || 0;
    $("clockText").textContent = this.raid
      ? `${Math.floor(t / 60)
          .toString()
          .padStart(2, "0")}:${Math.floor(t % 60)
          .toString()
          .padStart(2, "0")} / ${(m.raidSeconds / 60).toFixed(0)}:00`
      : "WORLD TIME · DUSK";
    $("tideProgress").style.width = this.raid
      ? clamp((t / m.raidSeconds) * 100, 0, 100) + "%"
      : "0%";
    $("zoomText").textContent =
      "ZOOM " + Math.round(this.camera.zoom * 100) + "%";
    for (let i = 0; i < 2; i++)
      $("slot" + i).classList.toggle("selected", p.weapon === i);
    $("ammo0").textContent =
      (this.save.weapons.arbalest ? "" : "LOST · ") +
      p.mag[0] +
      " / " +
      itemCount(this.save.bag, "bolt");
    $("ammo1").textContent =
      (this.save.weapons.wickcaster ? "" : "LOST · ") +
      p.mag[1] +
      " / " +
      itemCount(this.save.bag, "wick_cell");
    let target = this.currentTarget();
    $("interactPrompt").hidden =
      !target || !!this.panel || this.mode !== "play";
    if (target)
      $("interactPrompt").textContent = "E · " + target.label.toUpperCase();
    this.renderQuickSlots();
  },
});
