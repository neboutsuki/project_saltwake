Object.assign(Game.prototype, {
  move(x, y) {
    const p = this.player,
      steps = Math.max(1, Math.ceil(Math.hypot(x, y) / 8));
    for (let i = 0; i < steps; i++) {
      let dx = x / steps,
        dy = y / steps;
      if (this.walkable(p.x + dx, p.y)) p.x += dx;
      if (this.walkable(p.x, p.y + dy)) p.y += dy;
    }
  },
  aimWorld(sx = this.mouse.x, sy = this.mouse.y) {
    return {
      x: this.camera.x + sx / this.camera.zoom,
      y: this.camera.y + sy / this.camera.zoom,
    };
  },
  roll() {
    let p = this.player,
      m = this.mechanics();
    if (this.isPaused() || p.roll > 0 || p.rollCD > 0 || p.st < m.rollStamina)
      return;
    let dx = (this.keys.KeyD ? 1 : 0) - (this.keys.KeyA ? 1 : 0),
      dy = (this.keys.KeyS ? 1 : 0) - (this.keys.KeyW ? 1 : 0),
      length = Math.hypot(dx, dy);
    if (!length) {
      dx = Math.cos(p.angle);
      dy = Math.sin(p.angle);
    } else {
      dx /= length;
      dy /= length;
    }
    p.rollX = dx;
    p.rollY = dy;
    p.st -= m.rollStamina;
    p.roll = m.rollDuration;
    p.iframes = m.rollInvulnerability;
    p.rollCD = m.rollCooldown;
    p.reload = 0;
  },
});
