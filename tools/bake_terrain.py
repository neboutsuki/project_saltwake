#!/usr/bin/env python3
"""SALTWAKE ground baker (v0.11).

Paints the ground layer of each map into 512x512 PNG chunks
(assets/painted_maps/<map>_<ix>_<iy>.png, 1 art pixel = 1 world pixel at 100% zoom).

Inputs (read-only, never modified):
  data/graphics/terrain_layers/<map>.json   per-tile material ids + road mask
  data/maps/<map>.json                      road polylines, buildings, waterline

Why a synthesizer instead of tiling textures: every pixel is generated from
world-space noise, so nothing repeats and material borders follow organic,
noise-warped curves instead of the 32px tile grid. Colours are snapped to
small hand-picked ramps with ordered dithering so the result reads as pixel
art rather than a blurred photo texture.

The baker only changes *pictures*. Collision, positions and IDs come from the
map JSON at runtime and are untouched; a different seed or palette can be
re-baked at any time.

  python tools/bake_terrain.py            # bake all maps
  python tools/bake_terrain.py hub        # one map
  python tools/bake_terrain.py hub --preview out.png   # also save a downscaled overview

Requires numpy, scipy, Pillow.
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage
from scipy.spatial import cKDTree

ROOT = Path(__file__).resolve().parent.parent
T = 32
CHUNK = 512
OUT = ROOT / "assets" / "painted_maps"


def hexramp(*cols):
    return np.array([[int(c[i:i + 2], 16) for i in (1, 3, 5)] for c in cols], np.float32)


# Dark -> light ramps. Muted, warm dusk palette of the Red Salt Coast.
RAMPS = {
    "soil": hexramp("#2b201b", "#3a2a22", "#48342a", "#573f31", "#674a38", "#76563f", "#866348"),
    "grass": hexramp("#20231a", "#29301f", "#333b24", "#3e4529", "#4a502f", "#585a35", "#67653c"),
    "salt": hexramp("#45362f", "#554339", "#665246", "#776255", "#887366", "#998578", "#aa988b"),
    "gravel": hexramp("#3a322c", "#463d35", "#52483f", "#5f5449", "#6c6054", "#7a6d5f"),
    "mud": hexramp("#1d1917", "#26211d", "#302923", "#3b322a", "#473c32", "#54473b"),
    "stone": hexramp("#211c19", "#302925", "#3f3731", "#4f463e", "#60564c", "#71675b", "#83786a", "#958a7a"),
    "wall": hexramp("#1b1a19", "#2b2927", "#3b3835", "#4c4844", "#5e5953", "#706a63", "#837c73"),
    "shore": hexramp("#1c1f1e", "#242826", "#2d322f", "#373c37", "#434740", "#50534a"),
}
BAYER = (np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]], np.float32) + 0.5) / 16 - 0.5


class Noise:
    def __init__(self, seed, h, w):
        self.rng = np.random.default_rng(seed)
        self.h, self.w = h, w

    def value(self, cell, sy=None):
        """Smooth value noise with feature size `cell` px (sy: vertical size, for streaks)."""
        sy = sy or cell
        gh, gw = int(self.h / sy) + 3, int(self.w / cell) + 3
        g = self.rng.random((gh, gw), dtype=np.float32)
        z = ndimage.zoom(g, (sy, cell), order=3, prefilter=False)
        return z[: self.h, : self.w] - 0.5

    def fbm(self, cell, octaves=4, gain=0.5):
        out = np.zeros((self.h, self.w), np.float32)
        amp, total = 1.0, 0.0
        for _ in range(octaves):
            if cell < 1.5:
                break
            out += amp * self.value(cell)
            total += amp
            amp *= gain
            cell /= 2
        return out / total

    def unit(self, cell, octaves=4):
        """fbm rescaled to unit standard deviation (for warps / thresholds)."""
        f = self.fbm(cell, octaves)
        return f / (f.std() + 1e-6)

    def white(self):
        return self.rng.random((self.h, self.w), dtype=np.float32)


def quantize(lum, ramp, ox=0, oy=0):
    """Map luminance 0..1 onto a palette ramp with 4x4 ordered dithering."""
    h, w = lum.shape
    n = len(ramp)
    bay = np.tile(BAYER, (h // 4 + 2, w // 4 + 2))[oy % 4 : oy % 4 + h, ox % 4 : ox % 4 + w]
    idx = np.clip(np.floor(lum * n + bay * 0.9), 0, n - 1).astype(np.int32)
    return ramp[idx]


def emboss(height, k=1.0):
    """Top-left light: positive where the surface faces the light."""
    return (height - np.roll(np.roll(height, 1, 0), 1, 1)) * k


def seg_distance(px, py, ax, ay, bx, by):
    dx, dy = bx - ax, by - ay
    t = np.clip(((px - ax) * dx + (py - ay) * dy) / max(dx * dx + dy * dy, 1e-6), 0, 1)
    return np.hypot(px - (ax + t * dx), py - (ay + t * dy))


def voronoi(points, ys, xs):
    tree = cKDTree(points)
    d, i = tree.query(np.stack([ys, xs], -1), k=2, workers=-1)
    return d[:, 0], d[:, 1], i[:, 0]


def bake(map_id, preview=None):
    m = json.loads((ROOT / "data" / "maps" / f"{map_id}.json").read_text())
    layer = json.loads((ROOT / "data" / "graphics" / "terrain_layers" / f"{map_id}.json").read_text())
    tw, th = m["w"], m["h"]
    W, H = tw * T, th * T
    seed = int(m.get("seed", 1))
    nz = Noise(seed, H, W)
    print(f"[{map_id}] {W}x{H}px")

    base = np.array(layer["base"], np.int32).reshape(th, tw)
    road_tiles = np.array(layer["roads"], np.float32).reshape(th, tw)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)

    # ---- material field: blurred tile indicators + per-material warp noise
    warp_x = nz.unit(300, 3) * 55 + nz.unit(70, 2) * 12
    warp_y = nz.unit(300, 3) * 55 + nz.unit(70, 2) * 12
    sy = np.clip(((yy + warp_y) / T).astype(np.int32), 0, th - 1)
    sx = np.clip(((xx + warp_x) / T).astype(np.int32), 0, tw - 1)
    warped = base[sy, sx]
    weights = []
    for k in range(4):
        wk = ndimage.gaussian_filter((warped == k).astype(np.float32), 22)
        # fine noise makes materials interpenetrate over ~10-20px instead of a hard seam
        weights.append(wk + nz.unit(110, 4) * 0.16 + nz.value(6) * 0.22 + nz.value(2.5) * 0.12 + (0.1 if k == 0 else 0))
    material = np.argmax(np.stack(weights), 0)
    del weights, sy, sx, warped
    # scattered transition band: patches of each material break up into clumps
    # that thin out into the surrounding soil over ~12px
    for k in (2, 3, 1):
        soft = ndimage.gaussian_filter((material == k).astype(np.float32), 6)
        r = np.clip(0.5 + nz.value(3) * 1.6 + (nz.white() - 0.5) * 0.35, 0.02, 0.98)
        band = (soft > 0.03) & (soft < 0.97)
        material[band & (material == 0) & (soft > r)] = k
        material[band & (material == k) & (soft < r)] = 0

    # ---- shared relief
    relief = emboss(nz.fbm(24, 3), 4.0) + emboss(nz.value(4), 0.9) + nz.value(6) * 0.12
    broad = nz.fbm(220, 3)
    speck = nz.white()

    img = np.zeros((H, W, 3), np.float32)

    # packed soil with dry grass / moss patches
    lum = 0.5 + broad * 0.32 + nz.unit(40, 3) * 0.075 + nz.unit(9, 2) * 0.06 + nz.value(2) * 0.08
    peb = speck > 0.9955  # pebbles: lit pixel with a shadow pixel to the SE
    peb = peb | np.roll(peb, 1, 1)
    lum += peb * 0.26 - np.roll(np.roll(peb, 1, 0), 1, 1) * (~peb) * 0.24
    lum -= (speck < 0.006) * 0.2  # grit
    soil = quantize(np.clip(lum, 0, 0.999), RAMPS["soil"])
    veg = np.zeros((th, tw), np.float32)
    for o in m["decor"]:
        if o["type"] in ("grass", "shrub", "tree"):
            veg[min(int(o["y"]), th - 1), min(int(o["x"]), tw - 1)] += 1.0 if o["type"] != "tree" else 1.6
    veg = ndimage.gaussian_filter(veg, 1.6)
    veg = ndimage.zoom(veg, T, order=1)[:H, :W]
    grass_amt = nz.unit(150, 4) * 0.11 + broad * 0.4 + np.clip(veg * 10, 0, 1) * 0.3 + 0.01
    blades = nz.value(2, sy=7) + nz.value(1.5, sy=4) * 0.6  # vertical streaks read as blades
    glum = 0.5 + blades * 0.9 + relief * 0.5 + broad * 0.3
    grass = quantize(np.clip(glum, 0, 0.999), RAMPS["grass"])
    img[:] = soil

    # salt flat with polygonal crust cracks
    lum = 0.6 + broad * 0.25 + nz.fbm(30, 3) * 0.18 + relief * 0.6
    salt = quantize(np.clip(lum, 0, 0.999), RAMPS["salt"])

    # gravel: tiny voronoi pebbles
    # mud: dark, smooth, occasional puddles
    lum = 0.45 + broad * 0.3 + nz.fbm(36, 3) * 0.2 + relief * 0.35
    mud = quantize(np.clip(lum, 0, 0.999), RAMPS["mud"])

    for k, tex in ((1, salt), (3, mud)):
        sel = material == k
        img[sel] = tex[sel]
    del salt, mud, soil

    # salt cracks
    sel = material == 1
    if sel.any():
        ys, xs = np.nonzero(sel)
        npts = len(ys) // 700 + 8
        pts = np.stack([nz.rng.random(npts) * H, nz.rng.random(npts) * W], 1)
        pts = pts[sel[np.clip(pts[:, 0].astype(int), 0, H - 1), np.clip(pts[:, 1].astype(int), 0, W - 1)]]
        if len(pts) > 3:
            d1, d2, _ = voronoi(pts, ys.astype(np.float32), xs.astype(np.float32))
            crack = (d2 - d1) < 1.0
            img[ys[crack], xs[crack]] = RAMPS["salt"][2]
            rim = ((d2 - d1) >= 1.0) & ((d2 - d1) < 2.0)
            img[ys[rim], xs[rim]] = RAMPS["salt"][5]
            crystals = speck[ys, xs] > 0.97
            img[ys[crystals], xs[crystals]] = RAMPS["salt"][6]

    sel = material == 2
    if sel.any():
        ys, xs = np.nonzero(sel)
        n = int(len(ys) / 14) + 4  # ~4px pebbles, seeded inside the gravel area
        pick = nz.rng.integers(0, len(ys), n)
        pts = np.stack([ys[pick] + nz.rng.random(n), xs[pick] + nz.rng.random(n)], 1).astype(np.float32)
        tree_pts = pts
        d1, d2, ci = voronoi(tree_pts, ys.astype(np.float32), xs.astype(np.float32))
        tone = nz.rng.random(len(tree_pts)).astype(np.float32)[ci]
        vy = ys - tree_pts[ci, 0]
        vx = xs - tree_pts[ci, 1]
        lum = 0.45 + (tone - 0.5) * 0.3 - (vx + vy) * 0.03 + broad[ys, xs] * 0.25
        lum[(d2 - d1) < 0.8] -= 0.22
        img[ys, xs] = quantize(np.clip(lum, 0, 0.999)[None, :], RAMPS["gravel"])[0]

    # grass only on soil, away from roads/buildings (mask applied after roads)
    grass_amt = grass_amt + nz.value(3) * 0.3

    # ---- roads: polyline distance field unioned with the tile road mask
    road = np.zeros((H, W), np.float32)
    for r in m["roads"]:
        half = r["width"] * T / 2
        pts = r["pts"]
        for (ax, ay), (bx, by) in zip(pts, pts[1:]):
            x0, x1 = (min(ax, bx) * T - half - 40), (max(ax, bx) * T + half + 40)
            y0, y1 = (min(ay, by) * T - half - 40), (max(ay, by) * T + half + 40)
            x0, y0 = max(int(x0), 0), max(int(y0), 0)
            x1, y1 = min(int(x1), W), min(int(y1), H)
            if x1 <= x0 or y1 <= y0:
                continue
            d = seg_distance(xx[y0:y1, x0:x1], yy[y0:y1, x0:x1], ax * T, ay * T, bx * T, by * T)
            road[y0:y1, x0:x1] = np.maximum(road[y0:y1, x0:x1], 1 - d / half)
    # (the per-tile road mask is a stair-stepped copy of these polylines; not used)
    road_val = road + nz.fbm(18, 3) * 0.32 + nz.value(5) * 0.08
    on_road = road_val > 0.12
    grass_amt -= np.clip(road_val + 0.6, 0, 1) * 0.6  # thins out near roads

    # building footprints: no grass inside or right around them
    shadow = np.zeros((H, W), np.float32)
    for b in m["buildings"]:
        x0, y0 = int(b["x"] * T), int(b["y"] * T)
        x1, y1 = int((b["x"] + b["w"]) * T), int((b["y"] + b["h"]) * T)
        # the prefab sprite spans x-5..x+w+5, y-36..y+h+25 (see drawStructures)
        shadow[max(y0 - 30, 0) : min(y1 + 25, H), max(x0 - 5, 0) : min(x1 + 5, W)] = 1
    for d in m.get("docks", []):
        pass

    near_bld = ndimage.gaussian_filter(ndimage.maximum_filter(shadow, size=(60, 40)), 14)
    grass_amt -= near_bld * 0.6
    grass_mask = (material != 1) & (grass_amt > 0.07) & ~on_road
    img[grass_mask] = grass[grass_mask]
    del grass

    # cobblestones
    ys, xs = np.nonzero(on_road)
    if len(ys):
        spacing = 12.5
        gy, gx = np.mgrid[0 : H + spacing : spacing * 0.86, 0 : W + spacing : spacing]
        gx = gx + (np.arange(gx.shape[0])[:, None] % 2) * spacing / 2
        pts = np.stack([gy.ravel(), gx.ravel()], 1).astype(np.float32)
        pts += (nz.rng.random(pts.shape, dtype=np.float32) - 0.5) * spacing * 0.7
        d1, d2, ci = voronoi(pts, ys.astype(np.float32), xs.astype(np.float32))
        tone = nz.rng.random(len(pts)).astype(np.float32)
        keep = nz.rng.random(len(pts)).astype(np.float32)
        rv = road_val[ys, xs]
        # stones thin out toward the ragged road edge (worn, missing setts)
        cy = np.clip(pts[ci, 0].astype(int), 0, H - 1)
        cx = np.clip(pts[ci, 1].astype(int), 0, W - 1)
        cell_rv = road_val[cy, cx]
        present = keep[ci] < np.clip((cell_rv - 0.12) * 2.6, 0, 1)
        vy = ys - pts[ci, 0]
        vx = xs - pts[ci, 1]
        edge = d2 - d1
        dome = np.clip(edge / 5.0, 0, 1)  # 0 at joint -> 1 in the middle of a sett
        lum = 0.4 + (tone[ci] - 0.5) * 0.3 + dome * 0.14
        lum += -(vx + vy) / spacing * 0.3 * (1.15 - dome)  # lit NW rim, shaded SE rim
        lum += broad[ys, xs] * 0.25 + relief[ys, xs] * 0.2
        lum = np.where(edge < 1.4, 0.04, lum)  # mortar / dirt joint
        stones = quantize(np.clip(lum, 0, 0.999)[None, :], RAMPS["stone"])[0]
        stones[edge < 1.4] = RAMPS["soil"][1]
        # moss in some joints
        mossy = (edge < 1.1) & (nz.value(30)[ys, xs] > 0.22)
        stones[mossy] = RAMPS["grass"][2]
        # missing setts leave the ground beneath, slightly darker (worn hollow)
        img[ys, xs] = np.where(present[:, None], stones, img[ys, xs] * 0.82)
        del d1, d2, ci

    # ---- shoreline: ground darkens and gets wet toward the static waterline
    coast = m["waterStart"] * T + np.sin(xx[0] / 360) * 23 + np.sin(xx[0] / 93) * 8
    dist_up = coast[None, :] - yy  # >0 above the water line
    wet = np.clip(1 - dist_up / (3.5 * T), 0, 1) * (dist_up > -T)
    wet = np.clip(wet + nz.fbm(26, 3) * 0.6 * (wet > 0), 0, 1)
    shore_lum = np.clip(0.55 + relief * 0.8 + broad * 0.3, 0, 0.999)
    shore = quantize(shore_lum, RAMPS["shore"])
    wsel = wet > 0.55
    img[wsel] = shore[wsel]
    blend = (wet > 0.25) & ~wsel
    img[blend] = img[blend] * 0.72 + shore[blend] * 0.28
    below = dist_up < -T * 0.5
    img[below] = RAMPS["shore"][1]
    del shore

    # seawall: a band of dressed blocks capping the harbour edge. Hub: intact.
    # Quays: storm-broken, with gaps where the wall has collapsed.
    cap_top, cap_bot = 26.0, 2.0  # px above the static waterline
    band = (dist_up < cap_top) & (dist_up > -cap_bot)
    if map_id != "hub":
        band &= ndimage.zoom(nz.rng.random((1, W // 96 + 3)), (1, 96), order=0)[0, :W][None, :] > 0.35
    ys, xs = np.nonzero(band)
    if len(ys):
        du = dist_up[ys, xs]
        course = (du // 9).astype(np.int32)  # 3 courses of ~9px
        blen = 22 + (course % 2) * 5
        bx = (xs + course * 11) % blen
        bid = (xs + course * 11) // blen + course * 997
        jitter = np.sin(bid * 12.9898) * 0.5 + 0.5
        lum = 0.48 + (jitter - 0.5) * 0.3 + relief[ys, xs] * 0.4
        lum -= (du % 9 < 1.2) * 0.4 + (bx < 1.2) * 0.4  # joints
        lum += ((du % 9) > 7.5) * 0.18  # lit top edge of each course
        lum = np.where(du < 4, lum - 0.25, lum)  # damp foot of the wall
        img[ys, xs] = quantize(np.clip(lum, 0, 0.999)[None, :], RAMPS["wall"])[0]
        lip = (du >= cap_top - 2) & (du < cap_top)
        img[ys[lip], xs[lip]] = RAMPS["wall"][6]

    # ---- soft contact shadow cast south-east of buildings (sun from NW, dusk)
    sh = ndimage.shift(shadow, (7, 6), order=0)
    sh = ndimage.gaussian_filter(sh, 5) * (1 - shadow)
    img *= (1 - 0.38 * np.clip(sh, 0, 1))[..., None]

    # ---- gentle vignette of large-scale light so open ground is not flat
    img *= (0.94 + broad * 0.22)[..., None]
    out = np.clip(img, 0, 255).astype(np.uint8)

    OUT.mkdir(parents=True, exist_ok=True)
    keys = {}
    for iy in range((H + CHUNK - 1) // CHUNK):
        for ix in range((W + CHUNK - 1) // CHUNK):
            tile = out[iy * CHUNK : (iy + 1) * CHUNK, ix * CHUNK : (ix + 1) * CHUNK]
            im = Image.fromarray(tile, "RGB").quantize(colors=128, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
            name = f"{map_id}_{ix}_{iy}.png"
            im.save(OUT / name, optimize=True)
            keys[f"painted/{map_id}/{ix}/{iy}"] = f"assets/painted_maps/{name}"
    if preview:
        Image.fromarray(out).save(preview)
    return keys


def update_manifest(keys):
    p = ROOT / "assets" / "manifest.json"
    man = json.loads(p.read_text())
    man["images"].update(keys)
    p.write_text(json.dumps(man, indent=2) + "\n")


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    preview = sys.argv[sys.argv.index("--preview") + 1] if "--preview" in sys.argv else None
    if preview in args:
        args.remove(preview)
    maps = args or ["hub", "quays"]
    keys = {}
    for mid in maps:
        keys.update(bake(mid, preview))
    update_manifest(keys)
    print("manifest updated:", len(keys), "chunks. Now run: python tools/build.py")


if __name__ == "__main__":
    main()
