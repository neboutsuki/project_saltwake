"use strict";
const $ = (id) => document.getElementById(id),
  WORLD = window.SALTWAKE_WORLD,
  SAVE_KEY = "saltwake.player.v04",
  BACKUP_KEY = "saltwake.player.backup.v04";
const T = 32,
  VW = 1024,
  VH = 576,
  TAU = Math.PI * 2;
const C = $("world"),
  g = C.getContext("2d", { alpha: false });
g.imageSmoothingEnabled = false;
const min = (x, a) => Math.min(x, a),
  max = (x, a) => Math.max(x, a),
  clamp = (n, a, b) => Math.max(a, Math.min(b, n)),
  distance = (a, b, c, d) => Math.hypot(a - c, b - d),
  rad = Math.atan2;
const get = (k) => {
    try {
      return localStorage.getItem(k);
    } catch (e) {
      return null;
    }
  },
  put = (k, v) => {
    try {
      localStorage.setItem(k, v);
      return true;
    } catch (e) {
      return false;
    }
  };
const jsonCopy = (x) => JSON.parse(JSON.stringify(x));
const tokenHash = (x, y, s = 0) => {
  let a = Math.sin(x * 127.1 + y * 311.7 + s * 19.39) * 43758.5453;
  return a - Math.floor(a);
};
const safeText = (t) =>
  String(t ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
function itemDef(id) {
  return (
    game.world.content.items.find((x) => x.id === id) || {
      id,
      name: id,
      weight: 0.1,
      baseValue: 0,
    }
  );
}
const download = (name, object) => {
  const data = JSON.stringify(object, null, 2),
    blob = new Blob([data], { type: "application/json" }),
    u = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = u;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(u), 1500);
};
const itemCount = (inv, id) => inv[id] || 0;
function addItem(inv, id, n) {
  inv[id] = (inv[id] || 0) + n;
  if (inv[id] <= 0) delete inv[id];
}
function weight(inv) {
  return Object.entries(inv || {}).reduce(
    (total, [id, n]) => total + itemDef(id).weight * n,
    0,
  );
}
function renderInventory(inv, buttonFn) {
  const list = Object.entries(inv || {})
    .filter(([, n]) => n > 0)
    .sort((a, b) => itemDef(a[0]).name.localeCompare(itemDef(b[0]).name));
  if (!list.length) return '<p class="muted">Nothing here.</p>';
  return list
    .map(
      ([id, n]) =>
        `<div class="item"><span><strong>${safeText(itemDef(id).name)}</strong> ×${n}<br><small class="mutedLabel">${(itemDef(id).weight * n).toFixed(1)} kg · ${itemDef(id).category}</small></span>${buttonFn ? buttonFn(id, n) : ""}</div>`,
    )
    .join("");
}
function defaultSave() {
  return {
    version: 4,
    worldRevision: 3,
    gold: 230,
    bag: { bolt: 14, wick_cell: 12, bandage: 3, ration: 2 },
    stash: { bolt: 14, bandage: 3, rope: 3 },
    weapons: { arbalest: true, wickcaster: true },
    weaponCondition: { arbalest: 100, wickcaster: 100 },
    quests: {},
    quickSlots: [
      "bandage",
      "ration",
      "healing_tincture",
      "bolt",
      "wick_cell",
      null,
      null,
      null,
      null,
      null,
    ],
    factionStanding: {},
    completedRaids: 0,
    failedRaids: 0,
    flags: {},
    lastUpdate: Date.now(),
  };
}
function validateWorld(p) {
  if (!p || !p.maps?.hub || !p.maps?.quays || !p.content)
    throw Error("Invalid SALTWAKE world project");
  for (const id of ["hub", "quays"]) {
    let m = p.maps[id];
    if (
      !Array.isArray(m.buildings) ||
      !Array.isArray(m.portals) ||
      !Array.isArray(m.decor) ||
      !m.w ||
      !m.h
    )
      throw Error("Missing map geometry: " + id);
  }
  for (const type of [
    "npcs",
    "items",
    "quests",
    "containers",
    "dialogues",
    "interactables",
    "lootTables",
    "shops",
  ])
    if (!Array.isArray(p.content[type]))
      throw Error("Missing content collection: " + type);
  let seen = new Set();
  for (const col of ["npcs", "quests", "containers", "interactables"])
    for (const o of p.content[col]) {
      if (seen.has(o.id)) throw Error("Duplicate content ID " + o.id);
      seen.add(o.id);
      if (o.mapId && !p.maps[o.mapId]) throw Error("Missing map for " + o.id);
    }
  return true;
}
function geometryOf(p) {
  return JSON.stringify(
    Object.entries(p.maps).map(([id, m]) => [
      id,
      m.w,
      m.h,
      m.waterStart,
      m.buildings.map((o) => [o.id, o.type, o.x, o.y, o.w, o.h]),
      m.roads,
      m.docks,
      m.portals.map((o) => [o.id, o.x, o.y, o.target]),
      m.spaces,
      m.features.map((o) => [o.id, o.type, o.kind, o.x, o.y, o.w, o.h]),
      m.decor.map((o) => [o.id, o.type, o.x, o.y, o.w, o.h]),
    ]),
  );
}
let savedPlayer;
try {
  savedPlayer = JSON.parse(get(SAVE_KEY) || "null");
} catch (e) {
  savedPlayer = null;
}
