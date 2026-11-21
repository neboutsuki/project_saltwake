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
  drawTerrain(v) {
    const map = this.map(),
      d = this.terrainMap();
    if (!d || d.w !== map.w || d.h !== map.h) {
      const x0 = Math.max(0, v.x0),
        y0 = Math.max(0, v.y0),
        x1 = Math.min(map.w * T, v.x1),
        y1 = Math.min(map.h * T, v.y1);
      g.fillStyle = SPRITES.pattern(g, "terrain/earth") || "#7d5c46";
      g.fillRect(x0, y0, x1 - x0, y1 - y0);
      return;
    }
    const x0 = clamp(Math.floor(v.x0 / T), 0, d.w),
      y0 = clamp(Math.floor(v.y0 / T), 0, d.h),
      x1 = clamp(Math.ceil(v.x1 / T), 0, d.w),
      y1 = clamp(Math.ceil(v.y1 / T), 0, d.h);
    // Prefer world-positioned hand-baked map paintings (external PNG chunks),
    // not a repeating runtime texture. Preserve dynamic tide as an overlay.
    const cx0 = Math.floor(x0 / 16),
      cx1 = Math.ceil(x1 / 16),
      cy0 = Math.floor(y0 / 16),
      cy1 = Math.ceil(y1 / 16);
    let painted = true;
    for (let cy = cy0; cy < cy1; cy++)
      for (let cx = cx0; cx < cx1; cx++) {
        const key = `painted/${this.mapId}/${cx}/${cy}`;
        const im = SPRITES.image(key);
        if (!im) {
          painted = false;
          break;
        }
      }
    if (painted) {
      for (let cy = cy0; cy < cy1; cy++)
        for (let cx = cx0; cx < cx1; cx++) {
          const im = SPRITES.image(`painted/${this.mapId}/${cx}/${cy}`);
          g.drawImage(im, cx * 16 * T, cy * 16 * T);
        }
      // Water follows the same frozen coastline and tide simulation as gameplay.
      const wet = (nx, ny) => ny * T + T * 0.53 > this.coastY(nx * T + T * 0.5);
      for (let y = y0; y < y1; y++)
        for (let x = x0; x < x1; x++)
          if (wet(x, y)) {
            const px = x * T,
              py = y * T;
            const bits =
              (wet(x, y - 1) ? 1 : 0) |
              (wet(x + 1, y) ? 2 : 0) |
              (wet(x, y + 1) ? 4 : 0) |
              (wet(x - 1, y) ? 8 : 0);
            if (
              !this.drawAtlasTile(
                "atlas/water_overlays",
                bits + ((x % 8) + (y % 8) * 8) * 16,
                px,
                py,
                16,
              )
            )
              this.fill(px, py, T, T, "#30545a");
            if (!(bits & 1)) {
              g.fillStyle = "rgba(206,225,213,.22)";
              g.fillRect(px + ((x * 13) % 11), py + 9, 12, 2);
            }
          }
      return;
    }
    for (let y = y0; y < y1; y++) {
      const py = y * T;
      for (let x = x0; x < x1; x++) {
        const i = y * d.w + x,
          px = x * T,
          variant = d.variants[i];
        const kind = ENV_TILE_MATERIALS[d.base[i]] || "packed_soil";
        if (
          !this.drawAtlasTile("atlas/" + kind, (x % 8) + (y % 8) * 8, px, py, 8)
        )
          this.fill(px, py, T, T, "#9a7860");
        if (d.roads[i]) {
          const slot = d.roadBits[i] + ((x % 8) + (y % 8) * 8) * 16;
          this.drawAtlasTile("atlas/road_overlays", slot, px, py, 16);
        }
        const wet = (nx, ny) =>
          ny * T + T * 0.53 > this.coastY(nx * T + T * 0.5);
        if (wet(x, y)) {
          const bits =
            (wet(x, y - 1) ? 1 : 0) |
            (wet(x + 1, y) ? 2 : 0) |
            (wet(x, y + 1) ? 4 : 0) |
            (wet(x - 1, y) ? 8 : 0);
          this.drawAtlasTile(
            "atlas/water_overlays",
            bits + ((x % 8) + (y % 8) * 8) * 16,
            px,
            py,
            16,
          );
          // Small irregular foam details only along exposed coastline.
          if (!(bits & 1)) {
            g.fillStyle = "rgba(182,208,197,.32)";
            g.fillRect(px + ((x * 13) % 9), py + 9, 11, 2);
            g.fillRect(px + 18, py + 13, 6, 1);
          }
        }
      }
    }
  },
  drawRoads() {
    // Road occupancy and all junction shapes baked into environment tile layers.
    // This method intentionally does not stroke broad lines on the ground.
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
