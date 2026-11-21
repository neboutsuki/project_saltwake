/* SALTWAKE v0.10 — data-driven harbor factions, relationship AI,
 * local patrols, ambient citizens, and contextual interaction.
 * All humans/monsters share one target-selection and projectile simulator.
 */
"use strict";
const SALT_FACTION_FRIEND = "licensed_salvagers";
Object.assign(Game.prototype, {
  faction(id) {
    return this.world.content.factions?.find((f) => f.id === id) || null;
  },
  standing(id) {
    const base = this.faction(id)?.playerStanding || 0;
    return this.save.factionStanding?.[id] ?? base;
  },
  hostility(a, b) {
    if (a === b) return false;
    if (a === "player") return b === "wildlife" || this.standing(b) < -20;
    if (b === "player") return a === "wildlife" || this.standing(a) < -20;
    if (a === "wildlife" || b === "wildlife")
      return a === "wildlife" || b === "wildlife";
    return (
      (this.faction(a)?.hostileTo || []).includes(b) ||
      (this.faction(b)?.hostileTo || []).includes(a)
    );
  },
  changeStanding(id, amount, reason = "") {
    const old = this.standing(id);
    this.save.factionStanding[id] = clamp(old + amount, -100, 100);
    this.notify(
      `${this.faction(id)?.name || id}: ${amount > 0 ? "+" : ""}${amount} standing ${reason}`,
      3,
    );
    if (!this.raid) this.store();
  },
  factionPanel() {
    const html = (this.world.content.factions || [])
      .map((f) => {
        const rep = this.standing(f.id),
          label = rep >= 30 ? "Friendly" : rep < -20 ? "Hostile" : "Neutral";
        return `<div class="factionEntry" style="border-left:4px solid ${f.color}"><header><b>${safeText(f.name)}</b><span class="badge">${label} · ${rep > 0 ? "+" : ""}${rep}</span></header><p>${safeText(f.description)}</p><div class="repTrack"><i style="width:${(rep + 100) / 2}%;background:${f.color}"></i></div><small class="mutedLabel">Opposition: ${(f.hostileTo || []).map((x) => safeText(this.faction(x)?.name || x)).join(", ") || "None recorded"}</small></div>`;
      })
      .join("");
    this.open(
      "FACTIONS & REPUTATION",
      `<p class="fine">Prototype factions based on local Red Salt Coast politics. Hostile groups fight each other during raids; attacking a friendly guard or salvager makes that group hostile.</p>${html}`,
    );
  },
  npcLocation(n) {
    let p = this.npcRuntime[n.id];
    return p || { x: n.x * T, y: n.y * T };
  },
  updateWanderingNPCs(dt) {
    if (this.raid || this.mapId !== "hub") return;
    this.npcTime = (this.npcTime || 0) + dt;
    for (const n of this.world.content.npcs) {
      if (n.mapId !== "hub" || !n.wandering) continue;
      let state = this.npcRuntime[n.id];
      if (!state) {
        state = {
          x: n.x * T,
          y: n.y * T,
          tx: n.x * T,
          ty: n.y * T,
          rest: 0,
          phase: Math.abs([...n.id].reduce((a, c) => a + c.charCodeAt(0), 0)),
        };
        this.npcRuntime[n.id] = state;
      }
      state.rest -= dt;
      if (
        state.rest <= 0 ||
        distance(state.x, state.y, state.tx, state.ty) < 6
      ) {
        state.rest = 2 + (Math.sin(this.npcTime * 1.1 + state.phase) + 1) * 2;
        const nx = n.x * T + Math.sin(this.npcTime * 0.9 + state.phase) * 38;
        const ny = n.y * T + Math.cos(this.npcTime * 0.7 + state.phase) * 30;
        if (this.walkable(nx, ny)) {
          state.tx = nx;
          state.ty = ny;
        } else {
          state.tx = n.x * T;
          state.ty = n.y * T;
        }
      }
      const d = distance(state.x, state.y, state.tx, state.ty);
      if (d > 4) {
        const vel = Math.min(d, 22 * dt);
        const xx = state.x + ((state.tx - state.x) / d) * vel,
          yy = state.y + ((state.ty - state.y) / d) * vel;
        if (this.walkable(xx, yy)) {
          state.x = xx;
          state.y = yy;
        }
      }
    }
  },
  talkFactionAgent(e) {
    if (this.hostility("player", e.factionId) || e.aggro > 0) {
      this.notify("They are too hostile to speak");
      return;
    }
    const f = this.faction(e.factionId);
    this.open(
      e.name || "Harbor Patrol",
      `<div class="callout">${e.factionId === "harbor_compact" ? "Keep the shipping lanes secure. Wreckers have been attacking salvage crews." : e.factionId === "licensed_salvagers" ? "Stay clear of Wrecker territory. We help legitimate crews when we can." : "I am keeping my head down until the tide shifts."}</div><p class="fine">Faction: ${safeText(f?.name || e.factionId)} · Standing: ${this.standing(e.factionId)}</p>`,
    );
  },
  actorFaction(e) {
    return e.factionId || (e.type === "wrecker" ? "wreckers" : "wildlife");
  },
  makeBullet(from, target, damage, speed = 445) {
    const dir = rad(target.y - from.y, target.x - from.x);
    this.raid.bullets.push({
      x: from.x,
      y: from.y - 5,
      vx: Math.cos(dir) * speed,
      vy: Math.sin(dir) * speed,
      t: 1.25,
      damage,
      enemy: true,
      sourceId: from.id,
      factionId: this.actorFaction(from),
    });
  },
  factionTarget(e) {
    const faction = this.actorFaction(e);
    if (e.type === "grazer" && !e.provoked) return null;
    let result = null,
      best = Infinity,
      p = this.player;
    const dp = distance(e.x, e.y, p.x, p.y);
    if (this.hostility(faction, "player") && dp < 410) {
      best = dp;
      result = { kind: "player", x: p.x, y: p.y, hp: p.hp };
    }
    for (const other of this.raid.enemies) {
      if (other.id === e.id || other.dead) continue;
      const opposite = this.actorFaction(other);
      let hostile = this.hostility(faction, opposite);
      if (other.type === "grazer" && !other.provoked) hostile = false;
      if (e.type === "grazer")
        hostile = !!e.provoked && other.id === e.lastAttacker;
      if (!hostile) continue;
      const d = distance(e.x, e.y, other.x, other.y);
      if (d < best && d < 420) {
        best = d;
        result = { kind: "actor", actor: other, x: other.x, y: other.y };
      }
    }
    return result;
  },
  updateEnemies(dt) {
    const r = this.raid;
    if (!r) return;
    for (const e of r.enemies) {
      if (e.dead) continue;
      const def = this.world.content.enemies.find((x) => x.id === e.type) || {};
      e.attackCD = Math.max(0, (e.attackCD || 0) - dt);
      e.walk = (e.walk || 0) + dt;
      const target = this.factionTarget(e);
      const human = this.actorFaction(e) !== "wildlife";
      const spd = e.type === "human" ? 65 : def.speed || 66;
      if (target) {
        e.aggro = 3;
        const d = distance(e.x, e.y, target.x, target.y),
          a = rad(target.y - e.y, target.x - e.x);
        const desired =
          e.type === "gull"
            ? 120
            : human && e.weapon
              ? 135
              : (def.attackRange || 35) * 0.8;
        // Patrols hold firing distance; wildlife rushes. Non-player factions fight each other.
        let mv = 0;
        if (d > desired + 14) mv = spd * dt;
        else if (human && d < 70) mv = -spd * 0.35 * dt;
        if (
          e.type === "brineback" &&
          d < 155 &&
          d > 55 &&
          (e.chargeCD || 0) <= 0
        ) {
          e.chargeTime = 0.32;
          e.chargeCD = 2.9;
        }
        if (e.chargeTime > 0) {
          mv = spd * 2.6 * dt;
          e.chargeTime = Math.max(0, e.chargeTime - dt);
        }
        e.chargeCD = Math.max(0, (e.chargeCD || 0) - dt);
        if (e.factionId === "neutral_crews" && !e.weapon) {
          mv = -spd * 0.7 * dt;
          e.attackCD = Math.max(e.attackCD, 1.1);
        }
        if (mv) {
          let dx = Math.cos(a) * mv,
            dy = Math.sin(a) * mv;
          if (this.walkable(e.x + dx, e.y)) e.x += dx;
          if (this.walkable(e.x, e.y + dy)) e.y += dy;
        }
        if (e.attackCD <= 0) {
          if (e.type === "gull" && d < 230) {
            this.makeBullet(e, target, 7, 310);
            e.attackCD = 1.9;
          } else if (human && e.weapon && d < 270) {
            this.makeBullet(
              e,
              target,
              e.factionId === "wreckers" ? 13 : 11,
              e.weapon === "wickcaster" ? 480 : 520,
            );
            e.attackCD = 1.25 + (e.phase % 5) * 0.18;
          } else if (d < (def.attackRange || 39) + 7) {
            if (target.kind === "player") {
              this.hurtPlayer(
                def.damage || 14,
                e.type === "widow" ? 0.36 : 0.08,
              );
              if (e.type === "brineback")
                this.player.wet = clamp(this.player.wet + 17, 0, 100);
            } else {
              target.actor.hp -= def.damage || 14;
              target.actor.aggro = 4;
              if (target.actor.hp <= 0)
                this.killActorByFaction(target.actor, e);
            }
            e.attackCD = def.attackCooldown || 1.4;
          }
        }
      } else {
        e.aggro = Math.max(0, (e.aggro || 0) - dt);
        // Small slow patrol arcs; do not roam across the map or into unrelated districts.
        const radius = (e.patrolRadius || 2) * T,
          cx = e.homeX,
          cy = e.homeY;
        if (human) {
          const ox = Math.sin(e.walk * 0.36 + (e.phase || 0)) * radius * 0.42,
            oy = Math.cos(e.walk * 0.39 + (e.phase || 0)) * radius * 0.28;
          const targetX = cx + ox,
            targetY = cy + oy,
            delta = distance(e.x, e.y, targetX, targetY);
          if (delta > 7) {
            const a = rad(targetY - e.y, targetX - e.x),
              dx = Math.cos(a) * spd * 0.3 * dt,
              dy = Math.sin(a) * spd * 0.3 * dt;
            if (this.walkable(e.x + dx, e.y)) e.x += dx;
            if (this.walkable(e.x, e.y + dy)) e.y += dy;
          }
        } else if (e.walk % 8 < 3) {
          const a = rad(cy - e.y, cx - e.x) + Math.sin(e.phase + e.walk) * 1.8,
            dx = Math.cos(a) * spd * 0.17 * dt,
            dy = Math.sin(a) * spd * 0.17 * dt;
          if (this.walkable(e.x + dx, e.y)) e.x += dx;
          if (this.walkable(e.x, e.y + dy)) e.y += dy;
        }
      }
    }
  },
  killActorByFaction(e, aggressor) {
    e.dead = true;
    const def = this.world.content.enemies.find((x) => x.id === e.type);
    // Drops remain lootable, but faction firefights do not count as player kills.
    if (def?.drop)
      this.raid.drops.push({ x: e.x, y: e.y, id: def.drop, n: 1, got: false });
  },
  hurtEnemy(e, dmg) {
    const faction = this.actorFaction(e);
    if (faction !== "wildlife" && faction !== "wreckers" && !e.provoked) {
      e.provoked = true;
      if (faction !== "neutral_crews")
        this.changeStanding(faction, -60, "for attacking one of their members");
      else this.changeStanding(faction, -45, "for attacking a civilian");
      // retaliation is remembered by the entire faction for the active raid.
      this.save.factionStanding[faction] = Math.min(
        this.standing(faction),
        -35,
      );
    }
    e.provoked = true;
    e.lastAttacker = "player";
    e.hp -= dmg;
    e.aggro = 5;
    if (e.hp > 0) return;
    e.dead = true;
    this.raid.kills++;
    const def = this.world.content.enemies.find((x) => x.id === e.type);
    const drop = def?.drop || (faction !== "wildlife" ? "scrap_metal" : null);
    if (drop)
      this.raid.drops.push({ x: e.x, y: e.y, id: drop, n: 1, got: false });
    this.notify((def?.name || e.name || e.type) + " defeated");
  },
  updateBullets(dt) {
    const r = this.raid;
    if (!r) return;
    for (let i = r.bullets.length - 1; i >= 0; i--) {
      const b = r.bullets[i];
      b.t -= dt;
      const prevx = b.x,
        prevy = b.y;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      let hit = false;
      if (
        this.projectileBlocked(b.x, b.y) ||
        this.projectileBlocked((prevx + b.x) / 2, (prevy + b.y) / 2)
      )
        hit = true;
      if (!hit && b.enemy) {
        if (
          this.hostility(b.factionId || "wreckers", "player") &&
          distance(b.x, b.y, this.player.x, this.player.y - 7) < 20
        ) {
          this.hurtPlayer(b.damage, 0.07);
          hit = true;
        }
        if (!hit)
          for (const e of r.enemies) {
            if (e.dead || e.id === b.sourceId) continue;
            if (
              !this.hostility(b.factionId || "wreckers", this.actorFaction(e))
            )
              continue;
            if (
              distance(b.x, b.y, e.x, e.y) < (e.type === "brineback" ? 30 : 20)
            ) {
              e.hp -= b.damage;
              e.aggro = 4;
              if (e.hp <= 0)
                this.killActorByFaction(
                  e,
                  r.enemies.find((q) => q.id === b.sourceId),
                );
              hit = true;
              break;
            }
          }
      } else if (!hit)
        for (const e of r.enemies) {
          if (
            !e.dead &&
            distance(b.x, b.y, e.x, e.y) < (e.type === "brineback" ? 31 : 22)
          ) {
            this.hurtEnemy(e, b.damage);
            const key = this.player.weapon === 1 ? "wickcaster" : "arbalest";
            this.save.weaponCondition[key] = Math.max(
              1,
              (this.save.weaponCondition[key] || 100) - 0.3,
            );
            hit = true;
            break;
          }
        }
      if (hit || b.t <= 0) r.bullets.splice(i, 1);
    }
  },
});
