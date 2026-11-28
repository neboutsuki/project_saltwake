"""Build the Salvager's Rest (hub, compact) and Outer Quays (field, large) maps from the art pack.

    python tools/make_maps.py            # rewrite both maps in world/world.json + previews in docs/maps/
    python tools/make_maps.py --preview  # previews only

Everything is placed in tile units (1 tile = 32 world px). Art is drawn at ART_SCALE world px per art px, the same for
every object, so buildings, props, trees and characters share one scale.

Per map it writes, in the existing world schema (IDs of buildings, portals, features, NPCs, containers and
interactables are kept, only moved):
  w, h, waterStart, roads, spaces, zones, buildings (+ "art": facade alias), portals, features, docks
  decor     only collision helpers ("ghost": true; trees/stones/crates as small circles at object bases), which the
            engine's walking, sight and bullet checks already understand
  ground    paint list for the tile renderer (fill, areas, blobs, roads, rects)
  blocked   rects (tiles) that are not walkable: the edge scenery band, minus the exits
  scene     {decor: art objects drawn with depth sorting, lights, darkness} (replaces the old night-theme scene)
  arrivals  where the player appears: {default, legacy: [[oldx, oldy, newx, newy]]}
  spawns    enemy spawn points (index-matched to the engine's list)
"""
from pathlib import Path
import json, math, random, sys
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
WORLD = ROOT / 'world/world.json'
MAN = json.loads((ROOT / 'assets/manifest.json').read_text())
PATHS = {a: v['path'] for v in MAN.values() for a in v.get('aliases', []) if a.startswith('art/')}
ART_SCALE = 1.4
T = 32
_size = {}


def size(alias):
    if alias not in _size:
        _size[alias] = Image.open(ROOT / PATHS[alias]).size
    return _size[alias]


def tiles(alias, s=1.0):
    w, h = size(alias)
    return w * ART_SCALE * s / T, h * ART_SCALE * s / T


class Map:
    def __init__(self, mid, w, h, water, seed):
        self.id, self.w, self.h, self.water = mid, w, h, water
        self.rng = random.Random(seed)
        self.buildings, self.objects, self.ghosts, self.lights = [], [], [], []
        self.ground, self.roads, self.spaces, self.zones, self.blocked, self.docks = [], [], [], [], [], []
        self.portals, self.features, self.openings = [], [], []
        self.occ = set()          # tiles taken (no scatter here)
        self.paths = []           # (pts, width) kept clear of scatter

    # ---- occupancy ----
    def take(self, x0, y0, x1, y1):
        for y in range(int(math.floor(y0)), int(math.ceil(y1))):
            for x in range(int(math.floor(x0)), int(math.ceil(x1))):
                self.occ.add((x, y))

    def free(self, x, y, r=0.6):
        for yy in range(int(y - r), int(y + r) + 1):
            for xx in range(int(x - r), int(x + r) + 1):
                if (xx, yy) in self.occ:
                    return False
        if y > self.water - 2.5 or x < 1 or y < 1 or x > self.w - 1 or y > self.h - 1:
            return False
        for pts, wd in self.paths:
            for (ax, ay), (bx, by) in zip(pts, pts[1:]):
                if seg_dist(x, y, ax, ay, bx, by) < wd / 2 + r + .3:
                    return False
        return True

    # ---- content ----
    def building(self, bid, name, btype, art, cx, foot, depth=.4, s=1.0):
        dw, dh = tiles(art, s)
        bw, bh = round(dw * .86, 2), round(dh * depth, 2)
        b = {'id': bid, 'name': name, 'type': btype, 'x': round(cx - bw / 2, 2), 'y': round(foot - bh, 2), 'w': bw, 'h': bh,
             'variant': 0, 'art': art, 'artScale': s}
        self.buildings.append(b)
        self.take(cx - dw / 2, foot - dh * .55, cx + dw / 2, foot + 1.2)
        return b

    def obj(self, art, x, y, s=1.0, solid=None, mirror=False, light=None, take=True):
        dw, dh = tiles(art, s)
        o = {'asset': art, 'x': round(x, 2), 'y': round(y, 2), 'w': round(dw, 2), 'h': round(dh, 2), 'anchor': 'bottom'}
        if mirror:
            o['mirror'] = True
        self.objects.append(o)
        if solid:      # solid = ghost type ('tree' | 'stone' | 'crate'); circles along the base
            # trees block only at the trunk; rocks and props along a narrower base
            span = 0 if solid == 'tree' else dw * (.5 if solid == 'stone' else .6)
            n = 1 if solid == 'tree' else max(1, round(span / 1.1))
            for i in range(n):
                gx = x - span / 2 + span * (i + .5) / n
                self.ghosts.append({'type': solid, 'x': round(gx, 2), 'y': round(y - .25, 2)})
        if take:
            self.take(x - dw * .35, y - .8, x + dw * .35, y + .3)
        if light:
            self.lights.append({'x': round(x, 2), 'y': round(y - dh * .7, 2), 'radius': light, 'strength': .8})
        return o

    def scatter(self, arts, n, area, s=(.85, 1.15), solid=None, r=.8, near=None, tries=40):
        x0, y0, x1, y1 = area
        placed = 0
        for _ in range(n * tries):
            if placed >= n:
                break
            x, y = self.rng.uniform(x0, x1), self.rng.uniform(y0, y1)
            if near and not near(x, y):
                continue
            if not self.free(x, y, r):
                continue
            a = self.rng.choice(arts)
            self.obj(a, x, y, self.rng.uniform(*s), solid, self.rng.random() < .5)
            placed += 1
        return placed

    def clusters(self, arts, n_clusters, per, area, radius, s=(.8, 1.2), solid=None, r=.25, near=None):
        """Natural-looking patches: n_clusters centers, each with up to `per` items packed toward the middle."""
        x0, y0, x1, y1 = area
        total = 0
        for _ in range(n_clusters):
            cx, cy = self.rng.uniform(x0, x1), self.rng.uniform(y0, y1)
            if near and not near(cx, cy):
                continue
            for _ in range(per * 3):
                a, d = self.rng.uniform(0, 6.283), radius * (self.rng.random() ** .7)
                x, y = cx + math.cos(a) * d, cy + math.sin(a) * d * .8
                if not (x0 <= x <= x1 and y0 <= y <= y1) or not self.free(x, y, r):
                    continue
                self.obj(self.rng.choice(arts), x, y, self.rng.uniform(*s), solid, self.rng.random() < .5, take=solid is not None)
                total += 1
                if total and total % per == 0:
                    break
        return total

    def road(self, rid, pts, width, mat='cobble'):
        self.roads.append({'id': rid, 'width': width, 'pts': pts})
        self.ground.append({'road': pts, 'w': width, 'm': mat})
        self.paths.append((pts, width))

    def edge_band(self, side, thick, gaps=()):
        W, H = self.w, self.h
        rects = {'north': (0, 0, W, thick), 'west': (0, 0, thick, self.water), 'east': (W - thick, 0, thick, self.water)}
        x, y, w, h = rects[side]
        self.blocked.append([x, y, w, h])
        for g in gaps:
            self.openings.append(g)
        self.take(x, y, x + w, y + h)

    def json(self):
        decor = [{'id': f'{self.id}.ghost.{i}', 'name': 'collision', 'type': g['type'], 'x': g['x'], 'y': g['y'], 'w': 0, 'h': 0,
                  'variant': 0, 'ghost': True} for i, g in enumerate(self.ghosts)]
        return decor


def seg_dist(px, py, ax, ay, bx, by):
    dx, dy = bx - ax, by - ay
    L = dx * dx + dy * dy
    t = 0 if not L else max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / L))
    return math.hypot(px - ax - dx * t, py - ay - dy * t)


TREES_DARK = ['art/trees/ash_pine_01', 'art/trees/ash_pine_02', 'art/trees/ash_pine_03', 'art/trees/ash_pine_04']
TREES_COAST = ['art/trees/coastal_pine_01', 'art/trees/coastal_pine_02']
TREES_DEAD = ['art/trees/dead_tree_01', 'art/trees/dead_tree_02', 'art/trees/dead_tree_03']
TREES_BROAD = ['art/trees/broadleaf_01', 'art/trees/broadleaf_02']
GRASS = [f'art/plants/grass_tuft_0{i}' for i in range(1, 7)]
REEDS = [f'art/plants/reeds_0{i}' for i in range(1, 5)]
SHRUBS = [f'art/plants/shrub_0{i}' for i in range(1, 5)] + ['art/plants/fern_01', 'art/plants/fern_02', 'art/plants/fern_03']
FLOWERS = ['art/plants/flowers_01', 'art/plants/flowers_02', 'art/plants/flowers_03', 'art/plants/mushrooms_01', 'art/plants/mushrooms_02']
KELP = ['art/plants/kelp_pile_01', 'art/plants/kelp_pile_02']
ROCKS_S = ['art/rocks/rock_small_01', 'art/rocks/rock_small_02', 'art/rocks/rock_small_03']
ROCKS_L = ['art/rocks/rock_large_01', 'art/rocks/rock_large_02']
CRATES = ['art/props/crate_01', 'art/props/crate_02', 'art/props/crate_03', 'art/props/barrel_01', 'art/props/barrel_02']
TREELINE = ['art/edges/treeline_mass_01', 'art/edges/treeline_mass_02', 'art/edges/treeline_mass_03']
RUBBLE = ['art/edges/rubble_heap_01', 'art/edges/rubble_heap_02']


def edges(M, north=True, west=True, east=True, gaps_n=(), gaps_w=(), gaps_e=(), north_kind='trees'):
    """Edge scenery along the borders. Gaps are (from, to) tile ranges left open."""
    inside = lambda v, gaps: any(a <= v <= b for a, b in gaps)
    if north:
        x = -3
        while x < M.w + 3:
            if not inside(x, gaps_n):
                a = M.rng.choice(TREELINE)
                M.obj(a, x + 4, 4.3 + M.rng.uniform(0, 1.2), 1.0 + M.rng.uniform(-.05, .1), take=False, mirror=M.rng.random() < .5)
            x += 8.5
        for x0 in range(0, M.w, 3):        # a second, darker row of pines in front
            if inside(x0, gaps_n):
                continue
            M.obj(M.rng.choice(TREES_DARK), x0 + M.rng.uniform(0, 2), 7.2 + M.rng.uniform(0, 1.8), M.rng.uniform(.95, 1.2), 'tree', take=False)
        M.edge_band('north', 6, [])
        for a, b in gaps_n:
            M.openings.append([a, 0, b - a, 7])
    for side, on, gaps in (('west', west, gaps_w), ('east', east, gaps_e)):
        if not on:
            continue
        xe = 1.5 if side == 'west' else M.w - 1.5
        y = 8
        while y < M.water - 2:
            if not inside(y, gaps):
                near_shore = y > M.water - 16
                a = M.rng.choice(RUBBLE if near_shore else TREELINE)
                M.obj(a, xe, y + 4, 1.0, take=False, mirror=side == 'east')
                if not near_shore:
                    M.obj(M.rng.choice(TREES_DARK), xe + (2.5 if side == 'west' else -2.5), y + 5.5, M.rng.uniform(.9, 1.15), 'tree', take=False)
            y += 6.5
        M.edge_band(side, 4, [])
        for a, b in gaps:
            M.openings.append([0 if side == 'west' else M.w - 5, a, 5, b - a])


def shore_dress(M, x0, x1):
    """Beach clutter along the waterline."""
    for _ in range(int((x1 - x0) / 3)):
        x = M.rng.uniform(x0, x1)
        y = M.water - M.rng.uniform(.6, 3.2)
        if M.free(x, y, .5):
            M.obj(M.rng.choice(KELP + ROCKS_S + REEDS), x, y, M.rng.uniform(.8, 1.1), take=False)


# ====================================================================================================================
def hub():
    M = Map('hub', 72, 58, 48, 7)
    M.ground = [{'fill': 'soil'}, {'area': [0, 0, 72, 48], 'm': 'grass', 'alt': 'tall', 'p': .35, 'base': .45}]
    # Lantern Square
    M.spaces.append({'id': 'square', 'type': 'square', 'x': 26, 'y': 18, 'w': 20, 'h': 11, 'tag': 'Lantern Square'})
    M.ground.append({'rect': [26, 18, 20, 11], 'm': 'plaza'})
    M.take(26, 18, 46, 29)
    # roads: a town grid - north lane (homes), Lantern Square, Guild Row (clinic/ledger/forge), harbor promenade + quay
    M.road('north_gate', [[36, 0], [36, 18]], 4)
    M.road('south_dock', [[36, 29], [36, 47.5]], 4)
    M.road('north_lane', [[4, 18.5], [36, 18.2], [68, 18.5]], 2.6, 'gravel')
    M.road('guild_row', [[0, 31.6], [26, 31.6], [46, 31.6], [72, 31.8]], 3)
    M.road('promenade', [[3, 44.2], [36, 44.2], [69, 44.2]], 3, 'gravel')
    # buildings (IDs kept). Three rows, each facing its street: feet on 16.5 (north lane), 29.5 (Guild Row), 42.5 (market row)
    B = M.building
    B('hub.nhome1', 'Saltworker Home A', 'house', 'art/buildings/cottage_01', 8.5, 16.5)
    B('hub.nhome2', 'Saltworker Home B', 'house', 'art/buildings/cottage_02', 18, 16.5)
    B('hub.chapel', 'Tide Chapel', 'house', 'art/buildings/chapel', 28, 16.5)
    B('hub.guard', 'Harbor Guardhouse', 'office', 'art/buildings/stone_house_01', 44, 16.5)
    B('hub.player', 'Player Quarters', 'house', 'art/buildings/lodging', 54.5, 16.5)
    B('hub.stables', 'Cart Shelter', 'house', 'art/buildings/salt_shed_01', 65, 16.5, .45, .82)
    B('hub.clinic', 'Harbor Clinic', 'house', 'art/buildings/apothecary', 9, 29.5)
    B('hub.ledger', 'Ledger House / Contracts', 'office', 'art/buildings/ledger_house', 19.5, 29.5)
    B('hub.mech', 'Launcher Workshop', 'workshop', 'art/buildings/smithy', 52, 29.5)
    B('hub.tools', 'Tool Shed', 'workshop', 'art/buildings/utility_shack', 65.5, 29.5, .4, .85)
    B('hub.trade', 'Quartermaster Hall', 'merchant', 'art/buildings/trader_shop', 9.8, 42.5)
    B('hub.buyer', 'Salvage Buyer', 'warehouse', 'art/buildings/salvage_shed', 19.9, 42.5)
    B('hub.ration', 'Ration Vendor', 'merchant', 'art/buildings/market_stall_02', 28, 42.5)
    B('hub.hunt', 'Hunters’ Hall', 'office', 'art/buildings/hunt_hall', 52.3, 42.5, .4, .9)
    B('hub.store', 'Harbor Stores', 'warehouse', 'art/buildings/warehouse_01', 64.6, 42.5, .4, .72)
    B('hub.pilot', 'Pilot Station', 'office', 'art/buildings/pilot_shed', 28.5, 47.2, .45, .8)
    # square dressing
    o = M.obj
    o('art/props/fountain', 36, 24.5, 1.0, 'stone')
    for x, y in ((27.5, 19.5), (44.5, 19.5), (27.5, 28.5), (44.5, 28.5)):
        o('art/props/lantern_post_variant', x, y, 1.0, 'crate', light=150)
    o('art/props/notice_board', 31, 20.2, 1.0, 'crate')
    o('art/props/bench', 40.5, 20.4, 1.0)
    o('art/props/bench', 32, 28.2, 1.0)
    o('art/props/statue_hunter', 41, 27.8, .8, 'stone')
    o('art/props/well', 29.5, 25, 1.0, 'stone')
    o('art/props/signpost', 38.6, 30.8, 1.0)
    # market row: stalls beside the main road
    o('art/buildings/market_stall_03', 41, 42.5, 1.0, 'crate')
    o('art/props/supply_sacks', 32.3, 42.6, 1.0, 'crate')
    o('art/props/crate_stack', 44.4, 42.4, 1.0, 'crate')
    # forge yard between the smithy and the tool shed
    o('art/props/tool_rack', 59.5, 29.3, 1.0, 'crate')
    o('art/props/brazier', 45.6, 29.8, 1.0, 'crate', light=140)
    o('art/props/barrel_01', 58.6, 30.2, 1.0, 'crate')
    # homes
    o('art/props/fence_wood', 3.6, 18, 1.0)
    o('art/props/wheelbarrow', 13.4, 18.9, 1.0)
    o('art/props/hand_water_pump', 23.0, 18.2, 1.0, 'crate')
    o('art/props/storage_shelf', 59.8, 18.4, 1.0, 'crate')
    o('art/props/campfire', 49.4, 20.2, 1.0, None, light=170)
    # the quay: an open strip between the promenade and the water
    o('art/buildings/crane', 44, 47.3, .9, 'stone')
    o('art/props/fish_drying_rack', 9, 48.4, 1.0, 'crate')
    o('art/props/fish_cleaning_station', 14.5, 47.6, 1.0, 'crate')
    o('art/props/hand_cart', 17.4, 46.6, 1.0, 'crate')
    o('art/props/net_rack', 57, 48.2, 1.0, 'crate')
    o('art/props/carpenter_workbench', 62, 47, 1.0, 'crate')
    for x in (24, 40, 48.6, 66):
        o('art/props/bollard', x, 47.6, .5, 'crate', take=False)
    o('art/props/anchor', 69.6, 47, 1.0, take=False)
    for x, y in ((5, 45.6), (25.2, 45.6), (47.2, 45.6), (67.5, 45.6)):
        o('art/props/lantern_post', x, y, 1.0, 'crate', light=130)
    # docks (south)
    M.docks = [{'x': 34, 'y': 48, 'w': 4, 'h': 8}, {'x': 50, 'y': 48, 'w': 4, 'h': 7}, {'x': 20, 'y': 48, 'w': 4, 'h': 6}]
    # trees & ground cover
    M.scatter(TREES_COAST + TREES_BROAD, 7, (2, 20, 70, 31), solid='tree', r=1.4)
    M.scatter(TREES_COAST, 4, (2, 34, 70, 44), solid='tree', r=1.4)
    M.scatter(TREES_COAST + TREES_BROAD, 8, (2, 9, 70, 46), solid='tree', r=1.6)
    M.scatter(GRASS + FLOWERS, 160, (2, 8, 70, 46), r=.25)
    M.clusters(GRASS + FLOWERS + ['art/plants/fern_01', 'art/plants/fern_02'], 26, 9, (2, 9, 70, 46), 2.2)
    M.scatter(SHRUBS, 40, (2, 8, 70, 46), r=.45)
    M.scatter(ROCKS_S, 10, (2, 8, 70, 46), r=.4)
    shore_dress(M, 2, 70)
    # North: forest behind a town wall with the city gate on the north road
    for x in range(-3, M.w + 3, 8):
        M.obj(M.rng.choice(TREELINE), x + 4, 3.6 + M.rng.uniform(0, .8), 1.0, take=False, mirror=M.rng.random() < .5)
    for x in (5.6, 16.8, 27.6, 44.4, 55.2, 66.4):
        M.obj('art/edges/town_wall', x, 8.4, 1.0, take=False)
    M.obj('art/edges/town_gate', 36, 9.2, 1.0, take=False)
    M.blocked.append([0, 0, M.w, 7.6]); M.openings.append([33.5, 0, 5, 8.6]); M.take(0, 0, M.w, 8.6)
    edges(M, north=False, gaps_e=((28, 36),), west=True, gaps_w=((28, 35),))
    # garden fences in front of the homes, a little more street life
    for x, y in ((5, 18.2), (8.2, 18.2), (15, 18.2), (21.4, 18.2)):
        M.obj('art/props/fence_wood', x, y, .8, take=False)
    for x, y, a in ((14.1, 42.6, 'art/props/barrel_01'), (24.6, 42.6, 'art/props/crate_02'), (59.9, 42.6, 'art/props/crate_stack'), (71, 43, 'art/props/barrel_02'),
                    (25, 29.6, 'art/props/bench'), (47.2, 18.9, 'art/props/bench'), (13.9, 29.6, 'art/props/hanging_net_frame')):
        if M.free(x, y, .6):
            M.obj(a, x, y, 1.0, 'crate')
    # portals / features
    M.portals = [{'id': 'hub.north', 'name': 'Saltwatch City Gate', 'x': 36, 'y': 7.5, 'target': 'Saltwatch city (future)'},
                 {'id': 'hub.outer', 'name': 'Outer Quays Passage →', 'x': 69.5, 'y': 32, 'target': 'quays.west'},
                 {'id': 'hub.depart', 'name': 'Rest Docks — Departure', 'x': 36, 'y': 54, 'target': 'raid departures'}]
    M.features = [{'id': 'hub.lantern', 'name': 'Square Brazier', 'type': 'fixture', 'kind': 'lantern', 'x': 35.5, 'y': 21, 'w': 1, 'h': 1, 'variant': 0, 'hidden': True},
                  {'id': 'hub.well', 'name': 'Well', 'type': 'fixture', 'kind': 'cistern', 'x': 29, 'y': 24, 'w': 1, 'h': 1, 'variant': 0, 'hidden': True},
                  {'id': 'hub.board', 'name': 'Notice Board', 'type': 'fixture', 'kind': 'board', 'x': 30.5, 'y': 19.5, 'w': 1, 'h': 1, 'variant': 0, 'hidden': True},
                  {'id': 'hub.hoist', 'name': 'Harbor Crane', 'type': 'fixture', 'kind': 'hoist', 'x': 43.5, 'y': 46.5, 'w': 1, 'h': 1, 'variant': 0, 'hidden': True},
                  {'id': 'hub.tidepost', 'name': 'Tide Post', 'type': 'fixture', 'kind': 'tide', 'x': 39, 'y': 47, 'w': 1, 'h': 1, 'variant': 0, 'hidden': True}]
    M.zones = [{'id': 'square', 'name': 'Lantern Square', 'x': 24, 'y': 17, 'w': 24, 'h': 14},
               {'id': 'oldtown', 'name': 'Old Town', 'x': 0, 'y': 0, 'w': 72, 'h': 17},
               {'id': 'westrow', 'name': 'Clinic & Ledger Row', 'x': 0, 'y': 17, 'w': 24, 'h': 16},
               {'id': 'forge', 'name': 'Forge Yard', 'x': 48, 'y': 17, 'w': 24, 'h': 16},
               {'id': 'market', 'name': 'Market Row', 'x': 0, 'y': 33, 'w': 72, 'h': 12},
               {'id': 'docks', 'name': 'Rest Docks', 'x': 0, 'y': 45, 'w': 72, 'h': 13}]
    # Harbor life: townsfolk routes (walked back and forth), boats bobbing in the harbor
    M.life = {'routes': [
        [[29, 21.2], [43, 21.2], [43, 27.4], [29, 27.4], [29, 21.2]],          # around Lantern Square
        [[5, 44.3], [22, 44.2], [36, 44.4], [50, 44.2], [67, 44.3]],          # harbor promenade
        [[6, 18.8], [20, 18.6], [36, 18.6], [52, 18.8], [66, 18.8]],          # north lane (homes)
        [[36.4, 29.5], [36.4, 36], [36.4, 45.5], [36, 53]],                   # square to the departure pier
        [[46, 31.7], [56, 31.7], [68, 31.8]],                                 # Guild Row east (forge)
        [[26, 31.6], [16, 31.6], [5, 31.6]],                                  # Guild Row west (clinic, ledger)
        [[36, 7.5], [36, 13], [36, 18]],                                      # city gate road
        [[52, 47.6], [52, 53.5]],                                             # east pier
        [[22, 47.6], [22, 52.5]],                                             # west pier
    ], 'boats': [[44, 52.5], [58, 51], [12, 53], [28, 55.5]], 'day': 11, 'night': 4}
    # Daily routines (hublife.js): a street graph the townsfolk walk on, and places where they spend time.
    #   streets: chains of [x, y] nodes (consecutive nodes are linked); links: extra node-to-node connections.
    #   spots: [kind, x, y, facing, when, seconds-min, seconds-max]  when = day | evening | night | any | rain (sheltered)
    #   doors: where townsfolk go home at night and come out in the morning.
    M.life['streets'] = [
        [[4.5, 18.8], [8.5, 18.8], [13.5, 18.8], [18, 18.8], [23.5, 18.8], [28, 18.8], [31, 18.8], [36, 18.8], [41, 18.8], [44, 18.8], [49, 18.8], [54.5, 18.8], [60, 18.8], [65, 18.8], [67.5, 18.8]],   # north lane
        [[36, 18.8], [36, 21.4], [33, 24.4], [33.6, 27.6], [36, 28.6], [38.8, 27.6], [39.5, 24.4], [36, 21.4]],   # Lantern Square loop
        [[3, 31.8], [9, 31.8], [14.5, 31.8], [19.5, 31.8], [25, 31.8], [30, 31.8], [36, 31.8], [42, 31.8], [47, 31.8], [52, 31.8], [59.5, 31.8], [65.5, 31.8], [69, 31.8]],   # Guild Row
        [[36, 28.6], [36, 31.8], [36, 37.5], [36, 44.4]],   # main road
        [[4.5, 44.4], [9.8, 44.4], [14.5, 44.4], [19.9, 44.4], [22, 44.4], [28, 44.4], [32, 44.4], [36, 44.4], [41, 44.4], [44.5, 44.4], [48.5, 44.4], [52, 44.4], [57, 44.4], [60, 44.4], [64.6, 44.4], [68, 44.4]],   # promenade
        [[22, 44.4], [22, 47.8], [22, 51.6]], [[36, 44.4], [36, 47.8], [36, 50.5]], [[52, 44.4], [52, 47.8], [52, 52]],   # piers
        [[30, 31.8], [30, 29.6], [33.6, 27.6]], [[42, 31.8], [42, 29.6], [38.8, 27.6]],   # square to Guild Row
    ]
    M.life['spots'] = [
        ['read', 31, 21.5, 'up', 'day', 6, 14], ['read', 32.2, 21.6, 'up', 'day', 6, 12],
        ['rest', 40.6, 21.4, 'down', 'any', 8, 18], ['rest', 32, 28.9, 'down', 'any', 8, 18],
        ['water', 29.6, 26.4, 'up', 'day', 5, 9], ['fountain', 36, 26.6, 'up', 'any', 5, 12], ['fountain', 37.6, 26.4, 'left', 'evening', 6, 12],
        ['pray', 28, 17.8, 'up', 'evening', 8, 16], ['pray', 28.8, 17.9, 'up', 'dawn', 6, 12],
        ['shop', 28, 43.5, 'up', 'day', 6, 14], ['shop', 29.4, 43.6, 'up', 'day', 6, 12], ['shop', 41, 43.5, 'up', 'day', 6, 14], ['shop', 42.4, 43.6, 'up', 'day', 6, 12],
        ['shop', 9.8, 43.6, 'up', 'day', 6, 12], ['shop', 19.9, 43.6, 'up', 'day', 6, 12],
        ['forge', 53.6, 31.4, 'up', 'day', 8, 16], ['forge', 55.0, 31.6, 'left', 'day', 6, 12],
        ['work', 44.8, 46.2, 'up', 'day', 8, 18], ['work', 57, 46.4, 'down', 'day', 8, 18], ['work', 9, 46.6, 'down', 'day', 8, 18], ['work', 14.5, 46.2, 'down', 'day', 8, 16],
        ['sea', 22, 51.8, 'down', 'any', 10, 22], ['sea', 52, 52.2, 'down', 'any', 10, 22], ['sea', 36.8, 50.2, 'down', 'day', 8, 16],
        ['fire', 48.4, 21.3, 'right', 'evening', 10, 24], ['fire', 50.4, 21.4, 'left', 'evening', 10, 24], ['fire', 49.4, 22.2, 'up', 'night', 12, 26], ['fire', 48.3, 21.4, 'right', 'night', 12, 26],
        ['shelter', 28, 43.0, 'up', 'rain', 10, 20], ['shelter', 41, 43.0, 'up', 'rain', 10, 20], ['shelter', 53.2, 31.0, 'up', 'rain', 10, 20], ['shelter', 19.9, 43.2, 'up', 'rain', 8, 16],
        ['watch', 67.5, 31.8, 'right', 'night', 12, 24], ['watch', 36, 9.6, 'up', 'night', 12, 24],
    ]
    M.life['doors'] = [[8.5, 17.6], [18, 17.6], [65, 17.4], [9, 30.6], [19.9, 43.4], [64.6, 43.4]]

    M.arrivals = {'default': [36, 23.5], 'legacy': [[33.5, 27.6, 36, 30.5], [50, 46, 36, 30.5], [34.17, 36.6, 36, 44.5], [34, 36, 36, 30.5]],
                  'from': {'quays': [67, 32]}}
    return M


# ====================================================================================================================
def quays():
    M = Map('quays', 220, 150, 128, 11)
    M.ground = [{'fill': 'soil'},
                {'area': [0, 0, 220, 60], 'm': 'grass', 'alt': 'tall', 'p': .4, 'base': .55},
                {'area': [0, 60, 220, 50], 'm': 'soil', 'alt': 'gravel', 'p': .3, 'base': .35},
                {'area': [0, 108, 220, 20], 'm': 'sand', 'alt': 'gravel', 'p': .35, 'base': .6},
                {'blob': [34, 34, 22], 'm': 'salt', 'alt': 'mud', 'p': .25},
                {'blob': [20, 56, 10], 'm': 'salt'},
                {'blob': [36, 100, 18], 'm': 'mud', 'alt': 'soil', 'p': .3},
                {'blob': [200, 96, 14], 'm': 'cave', 'alt': 'gravel', 'p': .3},
                {'blob': [176, 104, 15], 'm': 'gravel', 'alt': 'sand', 'p': .3},
                {'area': [96, 8, 50, 14], 'm': 'ash', 'alt': 'tall', 'p': .4, 'base': .6}]
    # roads
    M.road('west', [[0, 62], [30, 64], [62, 66], [96, 66], [132, 64], [170, 66], [196, 70]], 6)
    M.road('customs', [[100, 8], [100, 30], [100, 46], [98, 66]], 5)
    M.road('salt', [[30, 64], [32, 48], [36, 34]], 4, 'gravel')
    M.road('wreckers', [[30, 64], [26, 82], [22, 104], [4, 112]], 4, 'gravel')
    M.road('market', [[62, 66], [70, 84], [86, 100]], 4)
    M.road('pier', [[98, 66], [100, 92], [104, 122]], 5)
    M.road('slip', [[132, 64], [150, 86], [166, 98]], 4, 'gravel')
    M.road('eastroad', [[170, 66], [190, 80], [200, 88]], 3.5, 'gravel')
    M.road('shore', [[40, 120], [80, 121], [120, 120], [160, 119], [190, 117]], 3.2, 'gravel')
    # spaces
    for s in ({'id': 'customsyard', 'type': 'square', 'x': 88, 'y': 46, 'w': 24, 'h': 10, 'tag': 'Customs Forecourt'},
              {'id': 'yard', 'type': 'yard', 'x': 14, 'y': 42, 'w': 22, 'h': 10, 'tag': 'Salt Yards'},
              {'id': 'reef', 'type': 'yard', 'x': 150, 'y': 96, 'w': 30, 'h': 16, 'tag': 'Boathouse Slip'},
              {'id': 'market', 'type': 'yard', 'x': 74, 'y': 92, 'w': 30, 'h': 12, 'tag': 'Old Fish Market'}):
        M.spaces.append(s)
        M.ground.append({'rect': [s['x'], s['y'], s['w'], s['h']], 'm': 'plaza' if s['type'] == 'square' else 'gravel'})
        M.take(s['x'], s['y'], s['x'] + s['w'], s['y'] + s['h'])
    B, o = M.building, M.obj
    # Customs Hill
    B('quays.warehouse', 'Customs Warehouse', 'warehouse', 'art/buildings/warehouse_01', 78, 44)
    B('quays.customs', 'Harbor Customs Office', 'office', 'art/buildings/customs_house', 100, 44)
    B('quays.harbormaster', 'Harbor Master’s Lodge', 'office', 'art/buildings/harbor_master', 120, 44)
    B('quays.store', 'Ruined Watch Store', 'warehouse', 'art/buildings/warehouse_ruined', 146, 50)
    o('art/buildings/rail_cart_track', 70, 49, 1.0, take=False)
    o('art/buildings/rail_cart_track', 82, 49, 1.0, take=False)
    o('art/props/cart_wreck', 88, 48.5, 1.0, 'crate')
    o('art/buildings/watch_beacon', 128, 30, 1.0, 'stone', light=200)
    # Salt Yards
    B('quays.salt', 'Old Saltworks', 'workshop', 'art/buildings/flats_pump_house', 22, 30)
    B('quays.salthouse', 'Salt Dryer Shed', 'warehouse', 'art/buildings/salt_shed_02', 16, 41)
    B('quays.saltshed', 'Salt Shed', 'warehouse', 'art/buildings/salt_shed_01', 48, 41)
    for x, y in ((40, 22), (52, 28), (44, 32)):
        o('art/buildings/flats_evaporation_pan', x, y, 1.0, take=True)
    o('art/props/salt_processing_trough', 30, 44, 1.0, 'crate')
    o('art/props/salt_sack_pile', 26, 46, 1.0, 'crate')
    # Wreckers' Camp
    B('quays.camp', 'Wreckers’ Store', 'warehouse', 'art/buildings/salvage_shed', 30, 94)
    for x, y, a in ((14, 98, 'art/buildings/wrecker_camp_tent_01'), (44, 100, 'art/buildings/wrecker_camp_tent_02'), (22, 108, 'art/buildings/wrecker_camp_tent_01')):
        o(a, x, y, 1.0, 'crate')
    o('art/props/campfire', 32, 102, 1.0, None, light=190)
    o('art/props/salvage_debris', 40, 108, 1.0, 'stone')
    o('art/props/bone_pile_01', 18, 103, 1.0)
    o('art/props/hand_cart', 10, 92, 1.0, 'crate')
    o('art/props/tent_supplies', 38, 96, 1.0, 'crate')
    # Warehouse Row / Crane Yard
    B('quays.warehouse2', 'Bonded Warehouse', 'warehouse', 'art/buildings/warehouse_02', 64, 84)
    B('quays.shed1', 'Quay Shed A', 'house', 'art/buildings/net_loft', 50, 84, .42)
    o('art/buildings/crane', 80, 80, 1.0, 'stone')
    o('art/props/cargo_platform', 84, 84, 1.0, 'crate')
    o('art/props/crate_stack', 72, 86.5, 1.0, 'crate')
    o('art/props/open_supply_crate', 76, 87, 1.0, 'crate')
    # Old Fish Market
    B('quays.fishmarket', 'Old Fish Market', 'merchant', 'art/buildings/fish_market', 89, 92)
    for x, y, a in ((78, 100, 'art/buildings/market_stall_01'), (86, 103, 'art/buildings/market_stall_04'), (96, 101, 'art/buildings/market_stall_03')):
        o(a, x, y, 1.0, 'crate')
    o('art/props/fish_basket', 82, 96, 1.0)
    o('art/props/fish_drying_rack', 102, 96, 1.0, 'crate')
    # Net-loft lanes
    B('quays.shed2', 'Quay Shed B', 'house', 'art/buildings/utility_shack', 118, 106)
    B('quays.pilot', 'Pilot Shed', 'office', 'art/buildings/pilot_shed', 64, 114)
    o('art/props/hanging_net_frame', 124, 110, 1.0, 'crate')
    o('art/props/net_rack', 70, 116, 1.0, 'crate')
    # Boathouse Slip (arena)
    B('quays.boathouse', 'Old Boathouse', 'workshop', 'art/buildings/boathouse', 168, 96)
    for x, y in ((154, 100), (182, 100), (154, 112), (182, 112)):
        o('art/arena/arena_pillar_01' if (x + y) % 2 else 'art/arena/arena_pillar_02', x, y, 1.0, 'stone')
    o('art/arena/pillar_broken', 168, 108, 1.0, 'stone')
    o('art/arena/harpoon_stuck', 160, 106, 1.0)
    o('art/arena/salt_boulder', 176, 106, 1.0, 'stone')
    # Lighthouse point & wrecks
    o('art/buildings/lighthouse_ruined', 206, 118, 1.0, 'stone', light=230)
    o('art/buildings/wreck_ship_01', 36, 126, 1.0, 'stone', take=True)
    o('art/buildings/wreck_ship_02', 144, 126, 1.0, 'stone', take=True)
    o('art/buildings/wreck_small', 186, 124, 1.0, 'stone')
    o('art/props/rowboat_damaged', 58, 124, 1.0)
    o('art/props/dinghy_wrecked', 128, 124.5, 1.0)
    o('art/props/rowboat', 112, 124, 1.0)
    # Caves (east) and ravine
    B('quays.caves', 'Salt Widow Cave Mouth', 'cave', 'art/rocks/cliff_rock_01', 204, 96, .5, 1.6)
    for x, y in ((196, 90), (212, 92), (198, 102), (214, 104)):
        o('art/rocks/cliff_rock_02' if x % 2 else 'art/rocks/cliff_rock_01', x, y, 1.0, 'stone')
    o('art/props/nest_02', 206, 108, 1.0)
    o('art/props/carcass_01', 196, 110, 1.0)
    for x in range(146, 222, 15):
        o('art/edges/ravine_edge', x, 31 + (x % 3) * .5, .9, 'stone', take=True)
    for x, y in ((84, 16), (140, 24), (180, 52), (24, 62.5), (60, 100)):
        o('art/props/stone_relic', x, y, .9, 'stone')
    # docks / piers
    M.docks = [{'x': 98, 'y': 128, 'w': 9, 'h': 22}, {'x': 74, 'y': 128, 'w': 7, 'h': 16}, {'x': 126, 'y': 128, 'w': 7, 'h': 18}, {'x': 160, 'y': 128, 'w': 6, 'h': 14}]
    for d in M.docks:
        for yy in (d['y'] - .3, d['y'] + d['h'] - .6):
            M.obj('art/props/mooring_post_rope', d['x'] - .4, yy, 1.0, take=False)
            M.obj('art/props/mooring_post_rope', d['x'] + d['w'] + .4, yy, 1.0, take=False)
    o('art/props/chain_post', 96, 127, 1.0, take=False)
    o('art/props/anchor', 110, 126.6, 1.0, take=False)
    # abandoned homes, ruins and shrines fill the open ground
    for art, cx, fy in (('art/buildings/cottage_03', 50, 58), ('art/buildings/cottage_04', 14, 78), ('art/buildings/stone_house_02', 138, 92),
                        ('art/buildings/ashwood_cabin', 176, 46), ('art/buildings/village_house_sunken_02', 178, 126),
                        ('art/buildings/village_house_sunken_01', 198, 126.5), ('art/buildings/village_house_sunken_03', 88, 126.5)):
        M.obj(art, cx, fy, .9, 'stone')
        M.ghosts += [{'type': 'stone', 'x': round(cx + dx, 2), 'y': round(fy - 1.6, 2)} for dx in (-2.4, -.8, .8, 2.4)]
    for art, x, y in (('art/buildings/ancient_ruin_arch_01', 192, 40), ('art/buildings/ancient_ruin_arch_02', 118, 18), ('art/buildings/shrine_01', 160, 56),
                      ('art/buildings/shrine_02', 58, 50), ('art/buildings/bone_well', 128, 80), ('art/buildings/ancient_ruin_arch_01', 66, 26)):
        M.obj(art, x, y, .9, 'stone')
    for x in (102.5, 77.5, 129.5, 163):
        M.obj('art/buildings/jetty_end', x, 148 if x == 102.5 else 143, .7, take=False)
    # tree groves
    for cx, cy, r, n in ((72, 30, 7, 10), (152, 40, 8, 12), (122, 84, 5, 6), (52, 106, 6, 7), (192, 62, 7, 9), (12, 28, 5, 6), (140, 108, 4, 4)):
        M.scatter(TREES_DARK + TREES_COAST + TREES_BROAD, n, (cx - r, cy - r, cx + r, cy + r), solid='tree', r=1.4)
        M.scatter(SHRUBS + FLOWERS, n * 2, (cx - r - 2, cy - r - 2, cx + r + 2, cy + r + 2), r=.4)
    # Customs Hill sits on a plateau: a cliff edge along its south side, one road up (the customs road)
    for x in (72.5, 85.5, 110.5, 123.5):
        M.obj('art/edges/cliff_straight', x, 59.2, .8, take=True)
    M.blocked += [[66, 55.2, 30.5, 3.6], [102.5, 55.2, 30.5, 3.6]]
    M.obj('art/props/signpost', 104.2, 60.5, 1.0)
    # fences and low walls divide the districts; gaps follow the roads
    for x in range(8, 62, 4):
        if not 27 <= x <= 35:
            M.obj('art/props/fence_wood' if x % 8 else 'art/props/broken_fence', x, 57.4, .9, take=False)
            M.ghosts.append({'type': 'crate', 'x': x, 'y': 57.1})
    for y in range(70, 112, 5):
        if not 98 <= y <= 106:
            M.obj('art/edges/rubble_heap_01' if y % 2 else 'art/edges/rubble_heap_02', 52, y + 3, .5, 'stone', take=False)
    for x in range(146, 192, 4):
        if not 158 <= x <= 166:
            M.obj('art/props/fence_iron', x, 91.2, .9, take=False)
            M.ghosts.append({'type': 'crate', 'x': x, 'y': 90.9})
    # landmarks
    M.obj('art/trees/giant_grove_tree_01', 150, 14.5, .85, 'tree', take=False)
    M.obj('art/trees/giant_grove_tree_02', 36, 13.5, .85, 'tree', take=False)
    M.obj('art/buildings/lighthouse', 214, 130, .8, take=False)
    M.obj('art/props/statue_hunter', 100, 63, .9, 'stone')
    # cargo clutter around the working districts
    for cx, cy, n in ((70, 90, 6), (90, 88, 4), (124, 70, 4), (30, 50, 4), (160, 100, 3), (112, 122, 5)):
        M.scatter(CRATES + ['art/props/crate_stack', 'art/props/supply_sacks', 'art/props/rope_coil', 'art/props/fish_basket'], n, (cx - 5, cy - 4, cx + 5, cy + 4), solid='crate', r=.7)
    # lanterns along the main road
    for x in range(14, 200, 22):
        o('art/props/lantern_post', x, 60.5 + (x % 3), 1.0, 'crate', light=150)
    o('art/props/signpost', 6, 59, 1.0)
    o('art/props/signpost', 100, 12, 1.0)
    # clutter near buildings
    for b in M.buildings:
        if b['id'] in ('quays.caves',):
            continue
        n = M.rng.randint(1, 3)
        for _ in range(n):
            x = b['x'] + M.rng.uniform(-1, b['w'] + 1)
            y = b['y'] + b['h'] + M.rng.uniform(1.2, 2.8)
            if M.free(x, y, .6):
                M.obj(M.rng.choice(CRATES + ['art/props/crate_stack', 'art/props/supply_sacks', 'art/props/barrel_02']), x, y, 1.0, 'crate')
    # forests: ashwood fringe north, coastal pines, dead trees in the salt yards
    M.scatter(TREES_DARK, 130, (6, 8, 214, 22), solid='tree', r=1.3)
    M.scatter(TREES_DARK + TREES_BROAD, 55, (130, 20, 216, 60), solid='tree', r=1.5)
    M.scatter(TREES_DEAD, 14, (6, 18, 64, 58), solid='tree', r=1.8)
    M.scatter(TREES_COAST, 60, (6, 56, 214, 116), solid='tree', r=1.7)
    # woodland copses on the open inland ground
    M.clusters(TREES_DARK + TREES_COAST + TREES_BROAD, 22, 6, (8, 12, 212, 112), 4.5, s=(.85, 1.2), solid='tree', r=1.2)
    M.scatter(ROCKS_L, 30, (6, 10, 214, 118), solid='stone', r=1.2)
    M.scatter(ROCKS_S, 120, (6, 10, 214, 124), r=.4)
    M.scatter(['art/rocks/salt_crystal_cluster_01', 'art/rocks/salt_crystal_cluster_02'], 22, (10, 14, 62, 60), solid='stone', r=.8)
    M.scatter(GRASS + FLOWERS, 1400, (4, 8, 216, 116), r=.22)
    M.clusters(GRASS + FLOWERS + ['art/plants/fern_01', 'art/plants/fern_02', 'art/plants/fern_03'], 170, 12, (4, 8, 216, 118), 2.6)   # meadows
    M.scatter(SHRUBS, 420, (4, 8, 216, 116), r=.45)
    M.scatter(REEDS, 60, (4, 112, 216, 127), r=.3)
    M.clusters(REEDS + KELP, 40, 8, (4, 114, 216, 127), 2.2)   # reed beds along the shore
    M.scatter(['art/trees/fallen_log_01', 'art/trees/fallen_log_02', 'art/trees/stump_01', 'art/trees/stump_02'], 26, (6, 10, 214, 60), solid='stone', r=1.0)
    M.scatter(['art/props/bone_pile_01', 'art/props/bone_pile_02', 'art/props/carcass_02', 'art/props/body_satchel'], 10, (10, 70, 214, 120), r=.8)
    shore_dress(M, 2, 218)
    edges(M, gaps_n=((96, 104),), gaps_w=((58, 66), (106, 116)), gaps_e=((62, 74),))
    # portals / features
    M.portals = [{'id': 'quays.west', 'name': '← Salvager’s Rest Passage', 'x': 3, 'y': 62, 'target': 'hub.outer'},
                 {'id': 'quays.storm', 'name': 'Storm Gate / Inland Exit', 'x': 100, 'y': 7, 'target': 'overland road'},
                 {'id': 'quays.cart', 'name': 'Salt Cart Track / Extraction', 'x': 3, 'y': 111, 'target': 'inland track'},
                 {'id': 'quays.skiff', 'name': 'Pilot Skiff / Extraction', 'x': 102.5, 'y': 147, 'target': 'sea departure'}]
    M.features = [{'id': 'quays.bell', 'name': 'Damaged Warning Bell', 'type': 'fixture', 'kind': 'board', 'x': 112, 'y': 52, 'w': 2, 'h': 2, 'variant': 2, 'hidden': True},
                  {'id': 'quays.pump', 'name': 'Brine Pump', 'type': 'fixture', 'kind': 'hoist', 'x': 34, 'y': 40, 'w': 2, 'h': 2, 'variant': 0, 'hidden': True},
                  {'id': 'quays.crane', 'name': 'Crane', 'type': 'fixture', 'kind': 'hoist', 'x': 80, 'y': 79, 'w': 2, 'h': 2, 'variant': 0, 'hidden': True},
                  {'id': 'quays.tidepost', 'name': 'Tide Post', 'type': 'fixture', 'kind': 'tide', 'x': 108, 'y': 126, 'w': 1, 'h': 1, 'variant': 0, 'hidden': True}]
    o('art/props/notice_board', 112.5, 54, 1.0, 'crate')
    o('art/props/hand_water_pump', 35, 41.5, 1.0, 'crate')
    M.zones = [{'id': 'westroad', 'name': 'West Passage', 'x': 0, 'y': 54, 'w': 40, 'h': 18},
               {'id': 'salt', 'name': 'Salt Yards', 'x': 4, 'y': 14, 'w': 60, 'h': 46},
               {'id': 'customs', 'name': 'Customs Hill', 'x': 64, 'y': 14, 'w': 70, 'h': 44},
               {'id': 'ashwood', 'name': 'Ashwood Edge', 'x': 0, 'y': 0, 'w': 220, 'h': 14},
               {'id': 'camp', 'name': 'Wreckers’ Camp', 'x': 4, 'y': 76, 'w': 50, 'h': 40},
               {'id': 'row', 'name': 'Warehouse Row', 'x': 40, 'y': 70, 'w': 54, 'h': 22},
               {'id': 'market', 'name': 'Old Fish Market', 'x': 70, 'y': 88, 'w': 40, 'h': 22},
               {'id': 'piers', 'name': 'Broken Quays', 'x': 40, 'y': 110, 'w': 140, 'h': 50},
               {'id': 'slip', 'name': 'Boathouse Slip', 'x': 146, 'y': 84, 'w': 44, 'h': 32},
               {'id': 'cave', 'name': 'Tidal Caverns', 'x': 188, 'y': 80, 'w': 32, 'h': 36},
               {'id': 'ridge', 'name': 'Ravine Ridge', 'x': 134, 'y': 14, 'w': 86, 'h': 44}]
    M.arrivals = {'default': [8, 62], 'legacy': [[8, 24, 8, 62]], 'from': {'hub': [8, 62]}}
    M.spawns = [[96, 106], [40, 50], [150, 78], [200, 104], [36, 104], [140, 60], [56, 30], [122, 22]]
    # Extra life by district (type, x, y, count, spread in tiles, when): when = 'any' | 'day' | 'night'
    M.population = [
        ['brineback', 50, 30, 1, 0, 'any'], ['grazer', 20, 22, 3, 3, 'day'],                      # Salt Yards
        ['grazer', 150, 20, 4, 4, 'day'], ['widow', 60, 16, 1, 0, 'night'],                       # Ashwood edge
        ['brineback', 112, 34, 1, 0, 'any'], ['grazer', 80, 30, 3, 3, 'day'],                    # Customs Hill outskirts
        ['widow', 30, 112, 1, 0, 'night'],                                                          # Wreckers' Camp (humans stay rare: the engine's own Wrecker lives here)
        ['gull', 90, 100, 3, 3, 'day'], ['gull', 120, 118, 3, 4, 'day'],                           # Fish market, quays
        ['brineback', 70, 118, 1, 0, 'any'], ['brineback', 180, 42, 1, 0, 'any'],                 # shore, ridge
        ['grazer', 196, 54, 3, 3, 'day'],                                                           # Ravine Ridge
        ['widow', 196, 108, 1, 0, 'any'], ['widow', 210, 98, 1, 0, 'night'],                       # Tidal Caverns
        ['brineworn_drifter', 100, 112, 3, 4, 'night'], ['brineworn_caller', 104, 116, 1, 0, 'night'],   # Broken Quays
        ['brineworn_breaker', 60, 96, 1, 0, 'night'], ['brineworn_drifter', 150, 90, 2, 3, 'night'],      # Warehouse Row, slip
        ['brineworn_drifter', 40, 64, 2, 3, 'night'],                                               # West Passage
    ]
    M.loot = [  # extra containers: id, name, x, y, loot table
        ['c_qx_harbormaster', 'Harbor Master\u2019s Strongbox', 'quays.harbormaster', 'customs_docs'],
        ['c_qx_saltshed', 'Salt Shed Sacks', 'quays.saltshed', 'dock_scrap'],
        ['c_qx_bonded', 'Bonded Cargo', 'quays.warehouse2', 'dock_scrap'],
        ['c_qx_fishmarket', 'Fishmonger\u2019s Chest', 'quays.fishmarket', 'provisions'],
        ['c_qx_pilot', 'Pilot\u2019s Locker', 'quays.pilot', 'provisions'],
        ['c_qx_netloft', 'Net Loft Tackle', 'quays.shed1', 'dock_scrap'],
        ['c_qx_shed2', 'Tool Crate', 'quays.shed2', 'dock_scrap'],
        ['c_qx_cottage', 'Abandoned Cottage Chest', (50, 59.8), 'provisions'],
        ['c_qx_cabin', 'Ashwood Cabin Cache', (176, 47.8), 'wrecker_cache'],
        ['c_qx_stonehouse', 'Collapsed House Chest', (138, 93.8), 'provisions'],
        ['c_qx_sunken', 'Sunken House Box', (172, 124.8), 'cave_salvage'],
        ['c_qx_lighthouse', 'Keeper\u2019s Box', (200, 119.4), 'customs_docs'],
        ['c_qx_wreck1', 'Wreck Hold', (44, 125.2), 'dock_scrap'],
        ['c_qx_wreck2', 'Wreck Captain\u2019s Chest', (152, 125.2), 'customs_docs'],
        ['c_qx_ruin', 'Ruin Offering Box', (192, 42.5), 'cave_salvage'],
    ]
    return M


# ====================================================================================================================
def place_content(world, H, Q):
    c = world['content']
    bid = {b['id']: b for b in H.buildings + Q.buildings}

    def front(b, dx=0, dy=1.2):
        return round(b['x'] + b['w'] / 2 + dx, 2), round(b['y'] + b['h'] + dy, 2)
    npc_at = {'n_dockmaster': ('hub.pilot', 3.2, -.4), 'n_clerk': ('hub.ledger', 0, 1.3), 'n_quartermaster': ('hub.trade', 0, 1.3),
              'n_mechanic': ('hub.mech', -2, 1.4), 'n_medic': ('hub.clinic', 0, 1.3), 'n_guard': ('hub.guard', 0, 1.3),
              'n_salvager': ('hub.store', -3, 1.4), 'n_apprentice': ('hub.mech', 3, 1.6)}
    free_npc = {'n_ropewright': (39.4, 45.6), 'n_tidepilot': (33, 46.5), 'n_crewhand': (55.4, 45.8)}
    for n in c['npcs']:
        if n['id'] in npc_at:
            b, dx, dy = npc_at[n['id']]
            n['x'], n['y'] = front(bid[b], dx, dy)
        elif n['id'] in free_npc:
            n['x'], n['y'] = free_npc[n['id']]
    it = {'i_contract_board': (31, 21.4), 'i_stash': front(bid['hub.player'], -2.5, 1.3), 'i_bed': front(bid['hub.player'], 2.5, 1.3),
          'i_workbench': front(bid['hub.mech'], 1, 1.4), 'i_departure': (36, 52.5),
          'i_cargo_inspect': front(bid['quays.customs'], -4, 1.3), 'i_cave_marker': (202, 100.5), 'i_warning_bell': (113, 54.5)}
    for i in c['interactables']:
        if i['id'] in it:
            i['x'], i['y'] = it[i['id']]
    ct = {'c_empty_skiff': front(bid['quays.boathouse'], -4, 1.5), 'c_pilot_ledger': front(bid['quays.warehouse'], -3, 1.4),
          'c_manifest': front(bid['quays.customs'], 4, 1.4), 'c_waterline': (206, 103), 'c_wake_report': front(bid['quays.store'], 0, 1.4),
          'c_wrecker_cache': front(bid['quays.camp'], 2, 1.4), 'c_rope_stack': (52, 90), 'c_cargo_scrap': front(bid['quays.warehouse'], 4, 1.4),
          'c_salt_barrels': front(bid['quays.salthouse'], 0, 1.4), 'c_pier_box': (162, 108), 'c_watch_crate': front(bid['quays.store'], -5, 1.4),
          'c_hub_supplies': front(bid['hub.trade'], 3, 1.4)}
    for k in c['containers']:
        if k['id'] in ct:
            k['x'], k['y'] = ct[k['id']]
    # faction patrols: spread over the new field
    homes = [(100, 58), (148, 70), (60, 70), (90, 108), (30, 88), (170, 112), (120, 30), (40, 40)]
    for i, a in enumerate([a for a in c.get('factionAgents', []) if a.get('mapId') == 'quays']):
        a['x'], a['y'] = homes[i % len(homes)]
        a['homeX'], a['homeY'] = a['x'], a['y']
    # ---- quest pack: story continuation + side quests on the new maps --------------------------------------------
    B_ = lambda b, dx=0, dy=1.4: front(bid[b], dx, dy)
    QC = [  # containers: id, name, at, loot table
        ('c_qs_hm_strongbox', 'Harbor Master\u2019s Seal Box', B_('quays.harbormaster', 3), 'customs_docs'),
        ('c_qs_slip_log', 'Boathouse Slip Logbook', B_('quays.boathouse', 4, 1.5), 'customs_docs'),
        ('c_qs_net_tackle', 'Net Loft Tackle Chest', B_('quays.shed1', 2.5), 'dock_scrap'),
        ('c_qs_tool_crate', 'Apprentice\u2019s Tool Crate', B_('quays.shed2', -2.5), 'dock_scrap'),
        ('c_qs_herb_cache', 'Medic\u2019s Herb Cache', (179, 48.2), 'provisions'),
        ('c_qs_herb_cache2', 'Ruin Herb Cache', (190.5, 43.2), 'provisions'),
        ('c_qs_fish_store', 'Salted Fish Store', B_('quays.fishmarket', 4), 'provisions'),
        ('c_qs_salt_sacks', 'Salt Shed Ration Sacks', B_('quays.saltshed', 3), 'provisions'),
        ('c_qs_crew_satchel', 'Missing Crew Satchel', (20, 104.5), 'wrecker_cache'),
        ('c_qs_crate_tally', 'Crane Yard Tally Crate', (86, 87.5), 'dock_scrap'),
        ('c_qs_gearbox', 'Saltworks Gearbox', B_('quays.salt', 2), 'dock_scrap'),
        ('c_qs_rail_parts', 'Rail Cart Parts', (76, 51), 'dock_scrap'),
        ('c_qs_keeper_log', 'Lighthouse Keeper\u2019s Log', (199, 121), 'customs_docs'),
    ]
    QI = [  # interactables (inspect): id, name, at
        ('i_qs_beacon', 'Watch Beacon Signal Fire', (128, 32.2)),
        ('i_qs_slip_marks', 'Harpoon Scars on the Slip', (161.5, 108.5)),
        ('i_qs_signpost_west', 'West Passage Waymark', (8, 60.8)),
        ('i_qs_signpost_storm', 'Storm Gate Waymark', (101.8, 13.8)),
        ('i_qs_lighthouse', 'Lighthouse Stump', (203, 121.5)),
        ('i_qs_pier_bell1', 'West Pier Buoy Bell', (77.5, 139)),
        ('i_qs_pier_bell2', 'East Pier Buoy Bell', (129.5, 142)),
        ('i_qs_wreck_marker', 'Wreck Crew Marker', (152, 121.5)),
        ('i_qs_shrine', 'Ridge Shrine', (160, 58.2)),
        ('i_qs_relic', 'Salt-Worn Relic', (85.5, 17.5)),
        ('i_qs_ridge_cairn', 'Ridge Cairn', (188.5, 42.5)),
    ]
    c['containers'] = [k for k in c['containers'] if not k['id'].startswith('c_qs_')] + [
        {'id': i, 'name': n, 'mapId': 'quays', 'x': round(x, 2), 'y': round(y, 2), 'lootTableId': t, 'respawn': 'raid'} for i, n, (x, y), t in QC]
    c['interactables'] = [k for k in c['interactables'] if not k['id'].startswith('i_qs_')] + [
        {'id': i, 'name': n, 'mapId': 'quays', 'x': round(x, 2), 'y': round(y, 2), 'kind': 'inspect'} for i, n, (x, y) in QI]
    X = ('extract', 'quays.west', 'Extract to Salvager\u2019s Rest')
    def mkq(qid, title, kind, giver, pre, summary, steps, coins, items):
        stages = []
        for i, (t, tid, desc) in enumerate(steps + [X, ('talk', giver, 'Report back to ' + next(n['name'] for n in c['npcs'] if n['id'] == giver))]):
            stages.append({'id': 'abcdefgh'[i], 'description': desc, 'type': t, 'targetId': tid, 'count': 1})
        return {'id': qid, 'title': title, 'kind': kind, 'offeredBy': giver, 'prerequisites': pre, 'summary': summary, 'stages': stages,
                'rewards': {'coins': coins, 'items': [{'itemId': a, 'quantity': b} for a, b in items]}}
    QS = [
        mkq('q_harbor_master_seal', 'The Harbor Master\u2019s Seal', 'main', 'n_clerk', ['q_cargo_without_name'],
          'The nameless cargo was cleared under a harbor master\u2019s seal. Find the seal box on Customs Hill and see what the watch beacon signalled that night.',
          [('loot', 'c_qs_hm_strongbox', 'Recover the seal box from the Harbor Master\u2019s Lodge'), ('interact', 'i_qs_beacon', 'Inspect the watch beacon on Customs Hill')], 280, [('lens', 1)]),
        mkq('q_slip_warnings', 'Warnings at the Slip', 'main', 'n_dockmaster', ['q_harbor_master_seal'],
          'The beacon pointed the crews to the Boathouse Slip. Something there scarred the stones and the crews stopped writing. Read the slip logbook.',
          [('interact', 'i_qs_slip_marks', 'Examine the harpoon scars on the Boathouse Slip'), ('loot', 'c_qs_slip_log', 'Recover the Boathouse Slip logbook')], 320, [('healing_tincture', 2)]),
        mkq('q_rope_for_mira', 'Good Rope Brings Boats Home', 'side', 'n_ropewright', [],
          'Mira needs sound tackle from the old net loft before the next tide. Most of the harbor\u2019s rope rotted in the storm.',
          [('loot', 'c_qs_net_tackle', 'Search the net loft on Warehouse Row')], 120, [('rope', 3)]),
        mkq('q_apprentice_tools', 'Ola\u2019s Lost Tools', 'side', 'n_apprentice', [],
          'Ola left a crate of good tools in a shed near the Old Fish Market when the bell rang. Iven does not know yet.',
          [('loot', 'c_qs_tool_crate', 'Find the tool crate by the quay shed')], 110, [('scrap_metal', 4)]),
        mkq('q_medic_herbs', 'Ash-Grown Remedies', 'side', 'n_medic', [],
          'Sera keeps two herb caches out past the Ashwood edge. The clinic is down to its last tinctures.',
          [('loot', 'c_qs_herb_cache', 'Recover the cache near the Ashwood cabin'), ('loot', 'c_qs_herb_cache2', 'Recover the cache under the ruin arch')], 150, [('healing_tincture', 1), ('bandage', 2)]),
        mkq('q_guard_patrol', 'Walk the Old Patrol', 'side', 'n_guard', [],
          'The watch used to mark three waymarks every night. Nobody has walked the route since the storm. Check that they still stand.',
          [('interact', 'i_qs_signpost_west', 'Check the West Passage waymark'), ('interact', 'i_qs_signpost_storm', 'Check the Storm Gate waymark'), ('interact', 'i_qs_lighthouse', 'Check the lighthouse stump')], 180, [('longbolt', 6)]),
        mkq('q_ridge_cairn', 'The Cairn on the Ridge', 'side', 'n_guard', ['q_guard_patrol'],
          'Orin swears the old watch left a cairn on Ravine Ridge for the dead of the Ninth Tide. See if it still stands.',
          [('interact', 'i_qs_ridge_cairn', 'Find the cairn on Ravine Ridge')], 150, [('salt_crystals', 3)]),
        mkq('q_rations', 'Short Rations', 'side', 'n_quartermaster', [],
          'Neral\u2019s count is short. There should still be salted fish at the market and sacks in the salt shed.',
          [('loot', 'c_qs_fish_store', 'Recover the salted fish store at the Old Fish Market'), ('loot', 'c_qs_salt_sacks', 'Recover ration sacks from the salt shed')], 140, [('ration', 3)]),
        mkq('q_buoy_bells', 'Bells on the Water', 'side', 'n_tidepilot', [],
          'Teren needs to know if the buoy bells on the west and east piers still ring. Without them nobody sails at night.',
          [('interact', 'i_qs_pier_bell1', 'Ring the west pier buoy bell'), ('interact', 'i_qs_pier_bell2', 'Ring the east pier buoy bell')], 160, [('lamp_oil', 2)]),
        mkq('q_lost_crew', 'Talla\u2019s Missing Crew', 'side', 'n_salvager', ['q_false_kings_wake'],
          'Talla\u2019s old crew marked the wreck they worked last. One of them carried a satchel to the Wreckers\u2019 Camp and never came back.',
          [('interact', 'i_qs_wreck_marker', 'Find the crew marker by the eastern wreck'), ('loot', 'c_qs_crew_satchel', 'Recover the crew satchel in the Wreckers\u2019 Camp')], 220, [('lens', 1)]),
        mkq('q_crate_tally', 'Every Crate Counted', 'side', 'n_crewhand', [],
          'Senn keeps the tally. A crate in the Crane Yard was never signed for.',
          [('loot', 'c_qs_crate_tally', 'Open the unsigned crate in the Crane Yard')], 100, [('scrap_metal', 3)]),
        mkq('q_saltworks_gears', 'Gears for the Forge', 'side', 'n_mechanic', [],
          'Iven needs good gears. The old saltworks pumps and the rail carts on Customs Hill had the best in the harbor.',
          [('loot', 'c_qs_gearbox', 'Salvage the saltworks gearbox'), ('loot', 'c_qs_rail_parts', 'Salvage the rail cart parts on Customs Hill')], 200, [('ship_gears', 2)]),
        mkq('q_keeper_log', 'The Keeper\u2019s Last Entry', 'side', 'n_clerk', ['q_second_record'],
          'The lighthouse keeper wrote everything down. Edda wants the log for the ledger before the salt eats it.',
          [('loot', 'c_qs_keeper_log', 'Recover the keeper\u2019s log at the lighthouse point')], 190, [('broken_compass', 1)]),
        mkq('q_ridge_shrine', 'Salt and Shrines', 'side', 'n_dockmaster', [],
          'Mara\u2019s mother left offerings at the ridge shrine. Mara wants to know if the relic near the Ashwood edge survived.',
          [('interact', 'i_qs_shrine', 'Visit the ridge shrine'), ('interact', 'i_qs_relic', 'Find the salt-worn relic near the Ashwood edge')], 130, [('salt_crystals', 2)]),
    ]
    QS.append(mkq('q_tidemaw', 'The Thing Under the Slip', 'main', 'n_dockmaster', ['q_slip_warnings'],
        'The logbook names it: the Tidemaw. It burrows under the Boathouse Slip and floods it when it rises. Break its gills before it calls the tide, and bring it down.',
        [('interact', 'i_qs_tidemaw', 'Slay the Tidemaw at the Boathouse Slip')], 600, [('masterwork_core', 1), ('healing_tincture', 2)]))
    # Story: the final hunt. The Maw is a map that appears on the Expedition Chart only while this quest is active.
    QS.append(mkq('q_into_the_maw', 'Into the Maw', 'main', 'n_tidepilot', ['q_tidemaw'],
        'The Tidemaw at the Slip was only a youngling. Teren has charted where the old ones go to die: a drowned crater the pilots call the Maw. While you carry this quest, the Maw is on the Expedition Chart at the Departure Pier. Sail there and end it.',
        [('interact', 'i_qs_elder', 'Slay the Elder Tidemaw in the Maw')], 1200, [('masterwork_core', 2), ('healing_tincture', 3)]))
    QS[-1]['destination'] = 'maw'
    c['interactables'] = [k for k in c['interactables'] if k['id'] != 'i_qs_elder'] + [
        {'id': 'i_qs_elder', 'name': 'The Elder\u2019s Wallow', 'mapId': 'maw', 'x': 60, 'y': 44, 'kind': 'inspect'}]
    c['interactables'] = [k for k in c['interactables'] if k['id'] != 'i_qs_tidemaw'] + [
        {'id': 'i_qs_tidemaw', 'name': 'The Tidemaw\u2019s Wallow', 'mapId': 'quays', 'x': 168, 'y': 112.5, 'kind': 'inspect'}]
    # boss, trophies, deep loot
    c['enemies'] = [e for e in c['enemies'] if e['id'] != 'tidemaw'] + [{
        'id': 'tidemaw', 'name': 'The Tidemaw', 'health': 2400, 'speed': 0, 'damage': 30, 'aggroRange': 0, 'attackRange': 0, 'attackCooldown': 2,
        'drop': 'tidemaw_jaw_plate', 'neutral': False, 'vision': 0, 'hearing': 0, 'bodyArmor': 38, 'staggerThreshold': 280, 'boss': True,
        'parts': [{'id': 'gill_left', 'name': 'Left gill sac', 'dx': 0, 'dy': 0, 'radius': 22, 'hp': 300, 'armor': 8, 'drop': 'tidemaw_gill'},
                  {'id': 'gill_right', 'name': 'Right gill sac', 'dx': 0, 'dy': 0, 'radius': 22, 'hp': 300, 'armor': 8, 'drop': 'tidemaw_gill'},
                  {'id': 'jaw', 'name': 'Jaw plate', 'dx': 0, 'dy': 0, 'radius': 24, 'hp': 420, 'armor': 70, 'drop': 'tidemaw_jaw_plate'},
                  {'id': 'tail', 'name': 'Tail', 'dx': 0, 'dy': 0, 'radius': 22, 'hp': 380, 'armor': 30, 'drop': 'tidemaw_tail_fin'}]}]
    have = {i['id'] for i in c['items']}
    for iid, nm, val, desc in (('tidemaw_gill', 'Tidemaw Gill Sac', 260, 'A ruptured teal gill sac. It still smells of the deep tide.'),
                               ('tidemaw_jaw_plate', 'Tidemaw Jaw Plate', 340, 'A crab-armored jaw plate studded with salt-crystal teeth.'),
                               ('tidemaw_tail_fin', 'Tidemaw Tail Fin', 300, 'A barnacled tail fin, heavy as a door.')):
        if iid not in have:
            c['items'].append({'id': iid, 'name': nm, 'category': 'monster_part', 'rarity': 'rare', 'baseValue': val, 'weight': 1.2, 'stackLimit': 10, 'description': desc})
    c['lootTables'] = [t for t in c['lootTables'] if t['id'] != 'deep_cache'] + [{'id': 'deep_cache', 'name': 'Deep Salvage', 'rolls': 3, 'entries': [
        {'itemId': 'lens', 'weight': 14, 'min': 1, 'max': 1}, {'itemId': 'pressure_seal', 'weight': 18, 'min': 1, 'max': 2},
        {'itemId': 'healing_tincture', 'weight': 16, 'min': 1, 'max': 1}, {'itemId': 'ship_gears', 'weight': 18, 'min': 1, 'max': 2},
        {'itemId': 'widow_claw', 'weight': 6, 'min': 1, 'max': 1}, {'itemId': 'masterwork_core', 'weight': 3, 'min': 1, 'max': 1},
        {'itemId': 'broken_compass', 'weight': 12, 'min': 1, 'max': 1}, {'itemId': 'salt_crystals', 'weight': 20, 'min': 2, 'max': 4}]}]
    RARE = [('c_rare_grove_west', 'Hunter\u2019s Cache under the Grove Tree', (38.5, 15.2)), ('c_rare_grove_east', 'Moss-Covered Strongbox', (152.5, 16.2)),
            ('c_rare_arch_north', 'Ruin Vault', (118, 19.6)), ('c_rare_arch_west', 'Old Arch Cache', (66, 27.6)),
            ('c_rare_ridge', 'Ravine Edge Satchel', (200, 34.5)), ('c_rare_caverns', 'Drowned Explorer\u2019s Chest', (212, 100.5))]
    c['containers'] = [k for k in c['containers'] if not k['id'].startswith('c_rare_')] + [
        {'id': i, 'name': n, 'mapId': 'quays', 'x': x, 'y': y, 'lootTableId': 'deep_cache', 'respawn': 'raid', 'rare': True} for i, n, (x, y) in RARE]
    # ---- errands: small jobs that run alongside your one quest (lost items, deliveries) ----------------------------
    LOST = [  # item id, item name, description, container id, container name, (x, y), owner, quest id, title, summary, coins
        ('olas_hammer', 'Ola\u2019s Hammer', 'A small smithing hammer with O.M. scratched into the grip.', 'c_er_hammer', 'Dropped Tool Bag', (88.5, 82.5), 'n_apprentice',
         'er_ola_hammer', 'Ola\u2019s Hammer', 'Ola dropped her first hammer by the crane when the bell rang. Iven gave it to her. She would rather not tell him.', 90),
        ('mara_locket', 'Tarnished Locket', 'A salt-green locket with a faded portrait of a sailor.', 'c_er_locket', 'Washed-Up Bundle', (56, 120.8), 'n_dockmaster',
         'er_mara_locket', 'The Tarnished Locket', 'Mara lost her mother\u2019s locket on the beach below the warehouses. The tide may have left it.', 110),
        ('senn_tally', 'Senn\u2019s Tally Book', 'A water-stained ledger of crates, names and dates.', 'c_er_tally', 'Soaked Satchel', (70.5, 88.6), 'n_crewhand',
         'er_senn_tally', 'The Tally Book', 'Senn left his tally book in the Bonded Warehouse yard. Without it, half the harbor\u2019s cargo is unaccounted for.', 80),
        ('neral_spectacles', 'Wire Spectacles', 'Bent wire spectacles, one lens cracked.', 'c_er_specs', 'Crushed Crate', (114, 47.6), 'n_quartermaster',
         'er_neral_specs', 'Neral\u2019s Spectacles', 'Neral lost his spectacles at the Harbor Master\u2019s Lodge counting stock. He can\u2019t read his own ledger.', 85),
        ('talla_compass', 'Brass Compass', 'A brass compass engraved with a crew\u2019s initials.', 'c_er_compass', 'Rusted Lockbox', (144, 58.5), 'n_salvager',
         'er_talla_compass', 'The Crew Compass', 'Talla\u2019s old crew compass was left at the ruined watch store. It points true even now.', 120),
    ]
    have = {i['id'] for i in c['items']}
    c['containers'] = [k for k in c['containers'] if not k['id'].startswith('c_er_')]
    ER = []
    for iid, nm, desc, cid, cname, (x, y), owner, qid, title, summary, coins in LOST:
        if iid not in have:
            c['items'].append({'id': iid, 'name': nm, 'category': 'quest', 'rarity': 'unique', 'baseValue': 0, 'weight': .2, 'stackLimit': 1, 'description': desc})
        c['containers'].append({'id': cid, 'name': cname, 'mapId': 'quays', 'x': x, 'y': y, 'lootTableId': 'dock_scrap', 'respawn': 'raid', 'guaranteedItems': [{'itemId': iid, 'quantity': 1}]})
        on = next(n['name'] for n in c['npcs'] if n['id'] == owner)
        ER.append({'id': qid, 'title': title, 'kind': 'errand', 'offeredBy': owner, 'prerequisites': [], 'summary': summary,
                   'stages': [{'id': 'a', 'description': f'Find the {nm.lower() if not nm.startswith(chr(79)) else nm} out on the Outer Quays', 'type': 'loot', 'targetId': cid, 'count': 1},
                              {'id': 'b', 'description': f'Return the {nm} to {on}', 'type': 'give', 'targetId': owner, 'itemId': iid, 'count': 1}],
                   'rewards': {'coins': coins, 'items': []}})
    DELIVER = [  # quest id, title, giver, item, count, summary, coins, reward items
        ('er_scrap_forge', 'Scrap for the Forge', 'n_mechanic', 'scrap_metal', 6, 'Iven\u2019s forge eats scrap faster than the harbor can find it. Six pieces will do.', 70, [('whetstone', 0)]),
        ('er_salt_kitchen', 'Salt for the Kitchen', 'n_quartermaster', 'salt_crystals', 4, 'The kitchen needs salt to cure the catch. Four handfuls of crystals.', 60, [('ration', 2)]),
        ('er_rope_docks', 'Rope for the Docks', 'n_crewhand', 'rope', 3, 'The cranes need new lines. Bring Senn three coils of rope.', 65, [('bandage', 1)]),
        ('er_feathers', 'Feathers for Fletching', 'n_guard', 'redhook_feather', 3, 'The watch fletches its own bolts. Three Redhook feathers, if you can get them.', 90, [('bolt', 8)]),
        ('er_lamp_oil', 'Oil for the Beacon', 'n_tidepilot', 'lamp_oil', 2, 'Teren keeps a lamp burning on the pilot pier. Two flasks of lamp oil.', 70, [('ration', 1)]),
        ('er_plate_hall', 'A Plate for the Hall', 'n_clerk', 'brineback_plate', 1, 'The Hunters\u2019 Hall wants a Brineback plate mounted over the door. Edda keeps the record.', 150, [('healing_tincture', 1)]),
        ('er_tincture', 'Ash Tea Leaves', 'n_medic', 'salt_crystals', 2, 'Sera brews her remedies in salted water. Two crystals for the clinic.', 50, [('bandage', 2)]),
    ]
    for qid, title, giver, item, n, summary, coins, items in DELIVER:
        gn = next(x['name'] for x in c['npcs'] if x['id'] == giver)
        ER.append({'id': qid, 'title': title, 'kind': 'errand', 'offeredBy': giver, 'prerequisites': [], 'summary': summary,
                   'stages': [{'id': 'a', 'description': f'Bring {n} \u00d7 {next(i["name"] for i in c["items"] if i["id"] == item)} to {gn}', 'type': 'give', 'targetId': giver, 'itemId': item, 'count': n}],
                   'rewards': {'coins': coins, 'items': [{'itemId': a, 'quantity': b} for a, b in items if b > 0]}})
    QS += ER
    c['quests'] = [q for q in c['quests'] if q['id'] not in {x['id'] for x in QS}] + QS
    # more repeatable commissions
    L = c['living_expeditions']['contracts']
    ADD = [
        {'id': 'gull_flock', 'title': 'Thin the Gull Flocks', 'category': 'HUNT', 'description': 'Redhook gulls are stripping the fish racks. Drive four of them off for good.', 'steps': [{'kind': 'kill', 'target': 'gull', 'need': 4, 'label': 'Defeat Redhook Gulls'}], 'reward': {'scrip': 110, 'items': [{'itemId': 'redhook_feather', 'quantity': 2}]}, 'weight': 7},
        {'id': 'cache_run', 'title': 'Salvage Run', 'category': 'SALVAGE', 'description': 'Open four salvage caches anywhere on the Quays and bring the haul home.', 'steps': [{'kind': 'cache', 'need': 4, 'label': 'Search salvage caches'}], 'reward': {'scrip': 150, 'items': [{'itemId': 'scrap_metal', 'quantity': 3}]}, 'weight': 8},
        {'id': 'track_survey', 'title': 'Read the Ground', 'category': 'TRACKING', 'description': 'The guild wants fresh tracks recorded across the Quays.', 'steps': [{'kind': 'trace', 'need': 4, 'label': 'Inspect coastal tracks'}], 'reward': {'scrip': 130, 'items': [{'itemId': 'ration', 'quantity': 2}]}, 'weight': 7},
        {'id': 'grazer_horns', 'title': 'Shed Horns', 'category': 'PART BREAK', 'description': 'The apothecary pays for grazer horn. Break one without killing the herd.', 'steps': [{'kind': 'part', 'target': 'grazer', 'part': 'horn', 'need': 1, 'label': 'Break a Grazer horn'}], 'reward': {'scrip': 120, 'items': [{'itemId': 'shed_horn', 'quantity': 1}]}, 'weight': 6},
        {'id': 'gull_beaks', 'title': 'Redhook Beaks', 'category': 'PART BREAK', 'description': 'The smith wants two cracked Redhook beaks for fletching tools.', 'steps': [{'kind': 'part', 'target': 'gull', 'part': 'beak', 'need': 2, 'label': 'Break Redhook beaks'}], 'reward': {'scrip': 170, 'items': [{'itemId': 'redhook_beak', 'quantity': 1}]}, 'weight': 5},
        {'id': 'tusk_trophy', 'title': 'Tusk for the Hall', 'category': 'PART BREAK', 'tier': 2, 'description': 'The Hunters\u2019 Hall wants a Brineback tusk broken in the field.', 'steps': [{'kind': 'part', 'target': 'brineback', 'part': 'tusk', 'need': 1, 'label': 'Break a Brineback tusk'}], 'reward': {'scrip': 240, 'items': [{'itemId': 'brineback_tusk', 'quantity': 1}]}, 'weight': 5},
        {'id': 'wrecker_cache', 'title': 'Wrecker Stash', 'category': 'STEALTH', 'tier': 2, 'description': 'Wreckers hid scrip in the camp. Open two caches and get out before they notice.', 'steps': [{'kind': 'quiet_cache', 'need': 2, 'label': 'Open caches without raising an alarm'}], 'reward': {'scrip': 280, 'items': [{'itemId': 'smoke_pot', 'quantity': 1}]}, 'weight': 4},
        {'id': 'widow_shell', 'title': 'Widow Shell Sample', 'category': 'PART BREAK', 'tier': 3, 'description': 'Crack a Salt Widow\u2019s shell for the clinic\u2019s study of brine poison.', 'steps': [{'kind': 'part', 'target': 'widow', 'part': 'shell', 'need': 1, 'label': 'Break a Salt Widow shell'}], 'reward': {'scrip': 360, 'items': [{'itemId': 'salt_widow_shell', 'quantity': 1}]}, 'weight': 4},
        {'id': 'night_callers', 'title': 'Silence the Callers', 'category': 'NIGHT HUNT', 'tier': 3, 'conditions': {'period': ['night']}, 'description': 'A Caller is drawing Brineworn to the quays. Find it at night and end the song.', 'steps': [{'kind': 'kill', 'target': 'brineworn_caller', 'need': 1, 'label': 'Defeat the Brineworn Caller'}], 'reward': {'scrip': 340, 'items': [{'itemId': 'healing_tincture', 'quantity': 1}]}, 'weight': 4},
        {'id': 'brineback_double', 'title': 'Two Bulls, One Tide', 'category': 'HUNT', 'tier': 2, 'description': 'Two Brinebacks have been seen on the shore at low tide. Bring both down.', 'steps': [{'kind': 'kill', 'target': 'brineback', 'need': 2, 'label': 'Defeat Brinebacks', 'tide': 'low'}], 'reward': {'scrip': 230, 'items': [{'itemId': 'brineback_plate', 'quantity': 1}]}, 'weight': 5},
    ]
    ADD += [
        {'id': 'escort_customs', 'title': 'Records Run', 'category': 'ESCORT', 'description': 'A guild clerk must reach the Customs Forecourt to copy the old records. Walk them there and keep the beasts off.', 'steps': [{'kind': 'escort', 'target': 'customs', 'need': 1, 'label': 'Escort the clerk to the Customs Forecourt'}], 'reward': {'scrip': 150, 'items': [{'itemId': 'bandage', 'quantity': 2}]}, 'weight': 6},
        {'id': 'escort_lighthouse', 'title': 'The Keeper\u2019s Heir', 'category': 'ESCORT', 'tier': 2, 'description': 'The keeper\u2019s son wants to see the lighthouse stump one last time. It is a long walk through the quays.', 'steps': [{'kind': 'escort', 'target': 'lighthouse', 'need': 1, 'label': 'Escort the keeper\u2019s son to the lighthouse'}], 'reward': {'scrip': 300, 'items': [{'itemId': 'lens', 'quantity': 1}]}, 'weight': 5},
        {'id': 'deliver_medicine', 'title': 'Medicine for the Pilot', 'category': 'DELIVERY', 'description': 'A crate of tinctures waits at the Old Fish Market. The pilot at the shed needs it unbroken. Do not get hit more than twice.', 'steps': [{'kind': 'deliver', 'from': 'fishmarket', 'target': 'pilot', 'hits': 3, 'need': 1, 'label': 'Carry the fragile crate to the Pilot Shed'}], 'reward': {'scrip': 160, 'items': [{'itemId': 'healing_tincture', 'quantity': 1}]}, 'weight': 6},
        {'id': 'deliver_powder', 'title': 'Volatile Cargo', 'category': 'DELIVERY', 'tier': 2, 'description': 'Wreckers left blasting powder in their camp. The guild wants it at the Slip gate before the tide. One hit and it is gone.', 'steps': [{'kind': 'deliver', 'from': 'camp', 'target': 'slip_edge', 'hits': 2, 'need': 1, 'label': 'Carry the powder to the Boathouse Slip gate'}], 'reward': {'scrip': 320, 'items': [{'itemId': 'smoke_pot', 'quantity': 2}]}, 'weight': 4},
        {'id': 'wound_brineback', 'title': 'Tag a Bull', 'category': 'CAPTURE', 'tier': 2, 'description': 'The guild wants a Brineback tagged alive. Wound it badly without killing it and it will run with the tag.', 'steps': [{'kind': 'wound', 'target': 'brineback', 'need': 1, 'label': 'Wound a Brineback below a third of its health, but keep it alive'}], 'reward': {'scrip': 280, 'items': [{'itemId': 'brineback_plate', 'quantity': 1}]}, 'weight': 5},
        {'id': 'wound_widow', 'title': 'Mark the Widow', 'category': 'CAPTURE', 'tier': 3, 'description': 'A tagged Widow could lead the guild to her nest. Wound one and let it flee.', 'steps': [{'kind': 'wound', 'target': 'widow', 'need': 1, 'label': 'Wound a Salt Widow and let it flee'}], 'reward': {'scrip': 420, 'items': [{'itemId': 'widow_claw', 'quantity': 1}]}, 'weight': 4},
        {'id': 'hold_beacon', 'title': 'Keep the Beacon Lit', 'category': 'DEFENSE', 'tier': 2, 'conditions': {'period': ['night']}, 'description': 'The watch beacon must burn tonight. Hold the beacon for thirty seconds while the Brineworn come.', 'steps': [{'kind': 'hold', 'target': 'beacon', 'need': 30, 'label': 'Hold the watch beacon'}], 'reward': {'scrip': 300, 'items': [{'itemId': 'lamp_oil', 'quantity': 3}]}, 'weight': 4},
        {'id': 'hold_shrine', 'title': 'Vigil at the Shrine', 'category': 'DEFENSE', 'tier': 3, 'conditions': {'period': ['night']}, 'description': 'Keep the night vigil at the ridge shrine. Forty-five seconds. They will come.', 'steps': [{'kind': 'hold', 'target': 'shrine', 'need': 45, 'label': 'Keep the vigil at the ridge shrine'}], 'reward': {'scrip': 440, 'items': [{'itemId': 'healing_tincture', 'quantity': 2}]}, 'weight': 3},
    ]
    # Survival operations (Helldivers-style): light a signal beacon, survive escalating waves, then reach the boat.
    ADD += [
        {'id': 'surv_pilot', 'title': 'Hold the Pilot Shed', 'category': 'SURVIVAL', 'description': 'Light the signal fire at the Pilot Shed and hold out until the guild boat comes. Every beast on the quays will hear it. You get call-ins: supply drops, mortar barrage, harbor cannon.', 'steps': [{'kind': 'survive', 'target': 'pilot', 'seconds': 150, 'need': 1, 'label': 'Light the beacon at the Pilot Shed and survive until evac'}], 'reward': {'scrip': 280, 'items': [{'itemId': 'healing_tincture', 'quantity': 1}, {'itemId': 'scrap_metal', 'quantity': 4}]}, 'weight': 6},
        {'id': 'surv_market', 'title': 'Siege of the Fish Market', 'category': 'SURVIVAL', 'tier': 2, 'description': 'The guild needs the Old Fish Market held while a crew salvages the ice-house. Longer, harder waves.', 'steps': [{'kind': 'survive', 'target': 'fishmarket', 'seconds': 210, 'need': 1, 'label': 'Light the beacon at the Old Fish Market and survive until evac'}], 'reward': {'scrip': 460, 'items': [{'itemId': 'brineback_plate', 'quantity': 1}, {'itemId': 'salt_crystals', 'quantity': 4}]}, 'weight': 5},
        {'id': 'surv_night', 'title': 'The Long Night', 'category': 'SURVIVAL', 'tier': 3, 'conditions': {'period': ['night']}, 'description': 'At night the Brineworn come in numbers. Hold the Customs Forecourt until dawn boat. Bring everything.', 'steps': [{'kind': 'survive', 'target': 'customs', 'seconds': 270, 'need': 1, 'label': 'Light the beacon at the Customs Forecourt and survive until evac'}], 'reward': {'scrip': 720, 'items': [{'itemId': 'masterwork_core', 'quantity': 1}, {'itemId': 'healing_tincture', 'quantity': 2}]}, 'weight': 4},
    ]
    L[:] = [k for k in L if k['id'] not in {a['id'] for a in ADD}] + ADD
    # extra field loot
    c['containers'] = [k for k in c['containers'] if not k['id'].startswith('c_qx_')]
    for cid, name, at, table in getattr(Q, 'loot', []):
        x, y = front(bid[at], 0, 1.4) if isinstance(at, str) else at
        k = {'id': cid, 'name': name, 'mapId': 'quays', 'x': x, 'y': y, 'lootTableId': table, 'respawn': 'raid'}
        if isinstance(at, str):
            k['buildingId'] = at
        c['containers'].append(k)
    # every service building is closed scenery; no interiors
    art = world['graphics'].setdefault('coastArt', {}).setdefault('buildings', {})
    for b in H.buildings + Q.buildings:
        art.setdefault(b['id'], {})
        art[b['id']]['accessMode'] = 'outdoor-service'
    world['graphics']['coastArt']['localArtSlices'] = []


def to_world(M, old):
    m = dict(old)
    m.update({'w': M.w, 'h': M.h, 'waterStart': M.water, 'shore': M.water, 'roads': M.roads, 'spaces': M.spaces, 'zones': M.zones,
              'buildings': M.buildings, 'portals': M.portals, 'features': M.features, 'docks': M.docks, 'decor': M.json(),
              'terrainTiles': [], 'ground': M.ground, 'blocked': M.blocked, 'openings': M.openings,
              'scene': {'darkness': .34, 'ambience': (old.get('scene') or {}).get('ambience'), 'lights': M.lights,
                        'decor': sorted(M.objects, key=lambda o: o['y'])},
              'arrivals': M.arrivals, 'tilemap': True, 'overview': f'art/maps/{M.id}'})
    if getattr(M, 'spawns', None):
        m['spawns'] = M.spawns
    if getattr(M, 'life', None):
        m['life'] = M.life
    if getattr(M, 'population', None):
        m['population'] = M.population
    return m


# ---- preview ---------------------------------------------------------------------------------------------------------
COL = {'soil': (92, 78, 62), 'grass': (82, 92, 62), 'tall': (104, 104, 70), 'gravel': (112, 108, 100), 'cobble': (88, 86, 84),
       'plaza': (128, 124, 118), 'salt': (168, 112, 104), 'mud': (70, 60, 52), 'sand': (150, 140, 120), 'cave': (76, 76, 80), 'ash': (110, 108, 104)}


def preview(M, path, px=8, debug=True):
    im = Image.new('RGB', (M.w * px, M.h * px), COL['soil'])
    d = ImageDraw.Draw(im)
    grid = paint(M)
    for (x, y), m in grid.items():
        d.rectangle([x * px, y * px, x * px + px - 1, y * px + px - 1], fill=COL.get(m, (90, 90, 90)))
    d.rectangle([0, M.water * px, M.w * px, M.h * px], fill=(38, 64, 72))
    for dk in M.docks:
        d.rectangle([dk['x'] * px, dk['y'] * px, (dk['x'] + dk['w']) * px, (dk['y'] + dk['h']) * px], fill=(120, 92, 64))
    for r in M.blocked if debug else []:
        d.rectangle([r[0] * px, r[1] * px, (r[0] + r[2]) * px, (r[1] + r[3]) * px], outline=(200, 60, 60))
    for r in M.openings if debug else []:
        d.rectangle([r[0] * px, r[1] * px, (r[0] + r[2]) * px, (r[1] + r[3]) * px], outline=(60, 220, 120))
    k = px / T
    for o in sorted(M.objects + [{'asset': b['art'], 'x': b['x'] + b['w'] / 2, 'y': b['y'] + b['h'], 'w': tiles(b['art'], b['artScale'])[0], 'h': tiles(b['art'], b['artScale'])[1]} for b in M.buildings], key=lambda o: o['y']):
        a = Image.open(ROOT / PATHS[o['asset']]).convert('RGBA')
        w, h = max(1, int(o['w'] * px)), max(1, int(o['h'] * px))
        a = a.resize((w, h), Image.LANCZOS)
        if o.get('mirror'):
            a = a.transpose(Image.FLIP_LEFT_RIGHT)
        im.paste(a, (int(o['x'] * px - w / 2), int(o['y'] * px - h)), a)
    if not debug:
        im.save(path, quality=86) if str(path).endswith('.webp') else im.save(path)
        return
    for b in M.buildings:
        d.rectangle([b['x'] * px, b['y'] * px, (b['x'] + b['w']) * px, (b['y'] + b['h']) * px], outline=(255, 220, 80))
        d.text((b['x'] * px + 2, (b['y'] + b['h']) * px + 2), b['id'].split('.')[1], fill=(255, 240, 160))
    for p in M.portals:
        d.ellipse([p['x'] * px - 6, p['y'] * px - 6, p['x'] * px + 6, p['y'] * px + 6], outline=(80, 220, 255), width=3)
        d.text((p['x'] * px + 8, p['y'] * px - 6), p['id'], fill=(120, 230, 255))
    im.save(path)


def noise(x, y, s):
    def h(i, j):
        n = (i * 374761393 + j * 668265263 + s * 2147483647) & 0xFFFFFFFF
        n = ((n ^ (n >> 13)) * 1274126177) & 0xFFFFFFFF
        return ((n ^ (n >> 16)) & 0xFFFFFFFF) / 4294967296
    xi, yi = math.floor(x), math.floor(y)
    xf, yf = x - xi, y - yi
    xf, yf = xf * xf * (3 - 2 * xf), yf * yf * (3 - 2 * yf)
    a, b, c, d = h(xi, yi), h(xi + 1, yi), h(xi, yi + 1), h(xi + 1, yi + 1)
    return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf


def paint(M):
    """Python mirror of the JS ground paint (preview only)."""
    g = {}
    for y in range(M.h):
        for x in range(M.w):
            cx, cy = x + .5, y + .5
            mat = 'soil'
            for op in M.ground:
                if 'fill' in op:
                    mat = op['fill']
                elif 'area' in op:
                    ax, ay, aw, ah = op['area']
                    if ax <= cx < ax + aw and ay <= cy < ay + ah:
                        n = noise(x / 7, y / 7, 3)
                        mat = op.get('alt') if op.get('alt') and n > 1 - op.get('p', .3) else op['m'] if n > 1 - op.get('base', 1) or op.get('base') is None else mat
                elif 'blob' in op:
                    bx, by, r = op['blob']
                    rr = r * (.75 + .5 * noise(x / 5, y / 5, 7))
                    if math.hypot(cx - bx, cy - by) < rr:
                        mat = op.get('alt') if op.get('alt') and noise(x / 6, y / 6, 5) > 1 - op.get('p', .3) else op['m']
                elif 'rect' in op:
                    ax, ay, aw, ah = op['rect']
                    if ax <= cx < ax + aw and ay <= cy < ay + ah:
                        mat = op['m']
                elif 'road' in op:
                    pts = op['road']
                    if any(seg_dist(cx, cy, *pts[i - 1], *pts[i]) <= op['w'] / 2 for i in range(1, len(pts))):
                        mat = op['m']
            if cy > M.water - 2.6:
                mat = 'sand'
            g[(x, y)] = mat
    return g


def main():
    H, Q = hub(), quays()
    out = ROOT / 'docs/maps'
    out.mkdir(parents=True, exist_ok=True)
    preview(H, out / 'salvagers_rest.png', 10)
    preview(Q, out / 'outer_quays.png', 6)
    # clean overview images for the in-game minimap and map screen (asset aliases art/maps/<id>)
    art = ROOT / 'assets/art/maps'
    art.mkdir(parents=True, exist_ok=True)
    man = json.loads((ROOT / 'assets/manifest.json').read_text())
    import hashlib
    for M_, px in ((H, 8), (Q, 6)):
        f = art / f'{M_.id}.webp'
        preview(M_, f, px, debug=False)
        man[f'art_map_{M_.id}'] = {'path': f'assets/art/maps/{M_.id}.webp', 'mime': 'image/webp', 'aliases': [f'art/maps/{M_.id}'], 'pack': 'art-new',
                                   'sha256': hashlib.sha256(f.read_bytes()).hexdigest()}
    (ROOT / 'assets/manifest.json').write_text(json.dumps(man, indent=1))
    if '--preview' in sys.argv:
        print('previews written')
        return
    world = json.loads(WORLD.read_text())
    world['maps']['hub'] = to_world(H, world['maps']['hub'])
    world['maps']['quays'] = to_world(Q, world['maps']['quays'])
    world['maps']['quays']['desc'] = 'The ruined commercial waterfront south-west of the Rest: Salt Yards, Customs Hill, Warehouse Row, the Old Fish Market, the Wreckers’ Camp, the Broken Quays and the Boathouse Slip. North is the Ashwood; south is the sea.'
    world['maps']['hub']['desc'] = 'Salvager’s Rest: a compact walled harbor town around Lantern Square. North is the city road, south the Rest Docks, east the passage to the Outer Quays.'
    place_content(world, H, Q)
    # Overlap pass: drop big scenery that overlaps other big scenery (or exact duplicates), and trees standing inside
    # building footprints; their collision helpers go with them.
    import re as _re
    BIG = _re.compile(r'/(trees|rocks|props|arena)/')
    SMALLISH = _re.compile(r'stump|fallen_log|bone_pile|rock_small')
    for mid in ('hub', 'quays'):
        m = world['maps'][mid]; dec = m['scene']['decor']; kept, removed = [], []
        for d in dec:
            if BIG.search(d['asset']) and not SMALLISH.search(d['asset']):
                clash = any(abs(k['x'] - d['x']) < 6 and ((k['asset'] == d['asset'] and ((k['x'] - d['x']) ** 2 + ((k['y'] - d['y']) * 1.4) ** 2) ** .5 < .4) or
                            ((k['x'] - d['x']) ** 2 + ((k['y'] - d['y']) * 1.4) ** 2) ** .5 < min(k['w'], d['w']) * .42) for k in kept if BIG.search(k['asset']) and not SMALLISH.search(k['asset']))
                inside = '/trees/' in d['asset'] and any(b['x'] + .5 < d['x'] < b['x'] + b['w'] - .5 and b['y'] + .5 < d['y'] < b['y'] + b['h'] + .5 for b in m.get('buildings', []))
                if clash or inside: removed.append(d); continue
            kept.append(d)
        m['scene']['decor'] = kept
        if removed:
            gone = [(r['x'], r['y']) for r in removed]
            m['decor'] = [g for g in m['decor'] if not (g.get('ghost') and any(abs(g['x'] - x) < .7 and -1.2 < (g['y'] - y) < .6 for x, y in gone))]
        print(mid, 'overlap pass removed', len(removed))
    world['layoutRelease'] = 'tilemap-v0.31.0'
    WORLD.write_text(json.dumps(world, indent=1, ensure_ascii=False))
    print('hub', H.w, H.h, len(H.buildings), 'buildings', len(H.objects), 'objects', len(H.ghosts), 'colliders')
    print('quays', Q.w, Q.h, len(Q.buildings), 'buildings', len(Q.objects), 'objects', len(Q.ghosts), 'colliders')


if __name__ == '__main__':
    main()
