Object.assign(Game.prototype, {
  currentTarget() {
    let p = this.player,
      choices = [];
    for (const n of this.world.content.npcs) {
      if (n.mapId !== this.mapId) continue;
      let np = this.npcLocation(n),
        d = distance(p.x, p.y, np.x, np.y);
      if (d < 78)
        choices.push({ d, kind: "npc", value: n, label: "Talk to " + n.name });
    }
    for (const o of this.world.content.interactables) {
      if (o.mapId !== this.mapId) continue;
      let d = distance(p.x, p.y, o.x * T, o.y * T);
      if (d < 76)
        choices.push({ d, kind: "interact", value: o, label: "Use " + o.name });
    }
    for (const o of this.world.content.containers) {
      if (o.mapId !== this.mapId || this.raid?.opened.includes(o.id)) continue;
      let d = distance(p.x, p.y, o.x * T, o.y * T);
      if (d < 72)
        choices.push({
          d,
          kind: "container",
          value: o,
          label: "Search " + o.name,
        });
    }
    if (this.raid)
      for (const e of this.raid.enemies) {
        if (
          e.dead ||
          e.actorType !== "human" ||
          this.hostility("player", e.factionId)
        )
          continue;
        let d = distance(p.x, p.y, e.x, e.y);
        if (d < 67)
          choices.push({
            d,
            kind: "faction-agent",
            value: e,
            label: "Talk to " + e.name,
          });
      }
    if (this.raid)
      for (const o of this.raid.drops) {
        if (o.got) continue;
        let d = distance(p.x, p.y, o.x, o.y);
        if (d < 55)
          choices.push({
            d,
            kind: "drop",
            value: o,
            label: "Recover " + itemDef(o.id).name,
          });
      }
    for (const o of this.map().portals) {
      let d = distance(p.x, p.y, o.x * T, o.y * T);
      if (d < 86) choices.push({ d, kind: "portal", value: o, label: o.name });
    }
    return choices.sort((a, b) => a.d - b.d)[0] || null;
  },
  interact() {
    if (this.isPaused()) return;
    let t = this.currentTarget();
    if (!t) {
      this.notify("Nothing within reach");
      return;
    }
    if (t.kind === "npc") {
      this.quest.emit("talk", t.value.id);
      this.talk(t.value);
    } else if (t.kind === "faction-agent") this.talkFactionAgent(t.value);
    else if (t.kind === "container") this.loot(t.value);
    else if (t.kind === "interact") this.useInteractable(t.value);
    else if (t.kind === "drop") {
      let o = t.value;
      addItem(this.save.bag, o.id, o.n);
      o.got = true;
      this.notify("Recovered " + itemDef(o.id).name);
    } else this.portal(t.value);
  },
  rollLoot(table) {
    let result = {},
      t = this.world.content.lootTables.find((x) => x.id === table);
    if (!t) return result;
    for (let i = 0; i < (t.rolls || 1); i++) {
      let weight = t.entries.reduce((a, x) => a + x.weight, 0),
        r = Math.random() * weight,
        e =
          t.entries.find((x) => (r -= x.weight) < 0) ||
          t.entries[t.entries.length - 1];
      if (e)
        addItem(
          result,
          e.itemId,
          e.min + Math.floor(Math.random() * (e.max - e.min + 1)),
        );
    }
    for (const it of t.guaranteed || [])
      addItem(result, it.itemId, it.quantity || 1);
    return result;
  },
  loot(o) {
    let items = this.rollLoot(o.lootTableId);
    for (const k of o.guaranteedItems || [])
      addItem(items, k.itemId, k.quantity || 1);
    let haul = Object.entries(items)
      .map(([k, v]) => itemDef(k).name + " ×" + v)
      .join(", ");
    if (weight(this.save.bag) + weight(items) > this.mechanics().hardWeight) {
      this.notify("Too much weight · Drop items or return later");
      return;
    }
    for (const [k, v] of Object.entries(items)) addItem(this.save.bag, k, v);
    if (this.raid) this.raid.opened.push(o.id);
    this.quest.emit("loot", o.id);
    this.notify("Looted " + o.name + ": " + (haul || "empty"));
    this.store();
  },
  useInteractable(o) {
    this.quest.emit("interact", o.id);
    switch (o.kind) {
      case "quest_board":
        this.journal(true);
        break;
      case "stash":
        this.stash();
        break;
      case "rest":
        this.player.hp = 100;
        this.player.st = 100;
        this.player.bleed = 0;
        this.notify("Rested and recovered");
        this.store();
        break;
      case "repair":
        this.repair();
        break;
      case "travel":
        this.open(
          "DEPARTURE REGISTRY",
          '<p>Depart for the Outer Quays. Your backpack and weapons are at risk; items in the secure stash are safe.</p><button class="primary" data-act="deploy">BEGIN EXPEDITION</button>',
        );
        break;
      default:
        this.open(
          o.name,
          `<p>${safeText(o.name)} · inspected.</p><p class="muted">A clue in the harbor records may connect this to a contract.</p>`,
        );
    }
  },
  talk(n) {
    const d = this.world.content.dialogues.find((x) => x.id === n.dialogueId);
    if (!d) {
      this.notify(n.name + " has nothing to say");
      return;
    }
    this.dialogue = { npc: n, dialogue: d, node: d.startNode };
    this.dialogueView();
  },
  dialogueView() {
    let d = this.dialogue;
    if (!d) return;
    let node = d.dialogue.nodes.find((n) => n.id === d.node);
    if (!node) {
      this.close();
      return;
    }
    let choices = node.choices || [];
    let html = `<p><b>${safeText(d.npc.role)}</b></p><div class="callout">“${safeText(node.text)}”</div><div class="hr"></div>${choices.map((c, i) => `<button class="itemButton" data-act="choice" data-i="${i}">${safeText(c.text)}<span>›</span></button>`).join("")}`;
    this.open(d.npc.name, html);
  },
  choose(i) {
    let d = this.dialogue;
    if (!d) return;
    let node = d.dialogue.nodes.find((n) => n.id === d.node),
      ch = node?.choices?.[i];
    if (!ch) return;
    const a = ch.action;
    if (a) {
      if (a.type === "offer_quest") {
        let did = this.quest.accept(a.questId);
        if (did) this.quest.emit("talk", d.npc.id);
      }
      if (a.type === "turn_in") this.quest.emit("talk", d.npc.id);
      if (a.type === "issue_kit") {
        if (!this.save.weapons.arbalest && !this.save.weapons.wickcaster) {
          this.save.weapons.arbalest = true;
          this.save.weaponCondition.arbalest = 48;
          addItem(this.save.bag, "bolt", 6);
          this.store();
          this.notify("Emergency kit issued: worn arbalest + six bolts");
        } else {
          this.notify(
            "Loaner kit only available when both ranged weapons are lost",
          );
        }
      }
      if (a.type === "open_shop") {
        this.shop(a.shopId);
        return;
      }
    }
    if (ch.next) {
      d.node = ch.next;
      this.dialogueView();
    } else this.close();
  },
});
