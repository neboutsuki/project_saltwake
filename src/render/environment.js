/* SALTWAKE modular terrain renderer v1.
 * Tile images are independent PNGs. Frozen map geometry -> derived tile layer.
 * No building, road centerline, object or quest coordinates are modified.
 */
"use strict";
const ENV_TILE_MATERIALS = ["packed_soil", "salt_flat", "gravel", "wet_mud"];
Object.assign(Game.prototype, {
  terrainMap() {
    return window.SALTWAKE_TERRAIN?.[this.mapId] || null;
  },
  drawAtlasTile(key, slot, px, py, cols = 4) {
    const atlas = SPRITES.image(key);
    if (!atlas) return false;
    const sx = (slot % cols) * T,
      sy = Math.floor(slot / cols) * T;
    g.drawImage(atlas, sx, sy, T, T, px, py, T, T);
    return true;
  },
  drawDocks(v) {
    const map = this.map();
    const planks = "atlas/dock_wood";
    for (let n = 0; n < map.docks.length; n++) {
      const d = map.docks[n],
        x = d.x * T,
        y = d.y * T,
        w = d.w * T,
        h = d.h * T;
      const cx = x + w / 2,
        bridgeTop = (map.waterStart - 14) * T;
      const bw = 4 * T,
        bx = Math.round(cx - bw / 2),
        bh = Math.max(0, y - bridgeTop + 16);
      const drawDockSurface = (xx, yy, ww, hh) => {
        if (!this.visible(xx, yy, ww, hh, v) || ww <= 0 || hh <= 0) return;
        this.fill(xx - 5, yy + 5, ww + 10, hh + 10, "rgba(22,34,36,.64)");
        for (let ty = yy; ty < yy + hh; ty += T) {
          for (let tx = xx; tx < xx + ww; tx += T) {
            let slot = (Math.floor(tx / T) % 8) + (Math.floor(ty / T) % 8) * 8;
            const aw = Math.min(T, xx + ww - tx),
              ah = Math.min(T, yy + hh - ty);
            const atlas = SPRITES.image(planks);
            if (atlas)
              g.drawImage(
                atlas,
                (slot % 8) * T,
                Math.floor(slot / 8) * T,
                aw,
                ah,
                tx,
                ty,
                aw,
                ah,
              );
            else this.fill(tx, ty, aw, ah, "#765845");
          }
        }
        // Timber edge/rim and support posts: deliberately positioned along structure.
        this.fill(xx, yy, ww, 3, "#a18a6b");
        this.fill(xx, yy + hh - 3, ww, 3, "#473a2e");
        this.fill(xx, yy, 4, hh, "#755e48");
        this.fill(xx + ww - 4, yy, 4, hh, "#4b3d34");
        for (let py = yy + 4 * T; py < yy + hh - 10; py += 4 * T) {
          this.fill(xx, py, 7, 13, "#4d4033");
          this.fill(xx + ww - 7, py, 7, 13, "#4d4033");
          this.fill(xx + 3, py + 3, 3, 5, "#c2a585");
          this.fill(xx + ww - 6, py + 3, 3, 5, "#c2a585");
        }
      };
      drawDockSurface(bx, bridgeTop, bw, bh);
      drawDockSurface(x, y, w, h);
    }
  },
});
