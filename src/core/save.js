/* SALTWAKE player-save schema & migration.
 *
 * The player save is separate from the world database (data/generated/world.js).
 * It only stores player progression, keyed by stable content IDs, so world /
 * art updates never invalidate it.
 *
 * Rules for future changes:
 *  - Never rename SAVE_KEY. Add fields with defaults in normalizeSave().
 *  - If a breaking change is unavoidable, bump SAVE_VERSION and add a step to
 *    SAVE_MIGRATIONS that converts the previous version.
 *  - Unknown item / quest IDs are preserved (they may belong to newer content).
 */
"use strict";
const SAVE_VERSION = 4;
const SAVE_QUARANTINE_KEY = "saltwake.player.quarantine";
const QUICK_SLOT_COUNT = 10;

// version -> function(save) returning the save upgraded to version+1
const SAVE_MIGRATIONS = {};

const isPlainObject = (o) => !!o && typeof o === "object" && !Array.isArray(o);

function cleanStacks(inv) {
  const out = {};
  if (!isPlainObject(inv)) return out;
  for (const [id, n] of Object.entries(inv)) {
    const v = Math.floor(Number(n));
    if (v > 0) out[id] = v;
  }
  return out;
}

/** Returns a complete, current-version save, or throws if `raw` is not a SALTWAKE save. */
function normalizeSave(raw) {
  if (!isPlainObject(raw) || typeof raw.version !== "number")
    throw Error("Not a SALTWAKE player save");
  if (
    !isPlainObject(raw.quests) ||
    !(isPlainObject(raw.bag) || isPlainObject(raw.stash))
  )
    throw Error("Incompatible player save");
  if (raw.version > SAVE_VERSION)
    throw Error(
      `Save is from a newer build (v${raw.version}); update the game`,
    );
  let s = jsonCopy(raw);
  while (s.version < SAVE_VERSION) {
    const step = SAVE_MIGRATIONS[s.version];
    if (!step) throw Error("No migration from save version " + s.version);
    s = step(s);
  }
  const d = defaultSave();
  s.gold = Number.isFinite(s.gold) ? Math.max(0, Math.floor(s.gold)) : d.gold;
  s.bag = cleanStacks(s.bag);
  s.stash = cleanStacks(s.stash);
  // A save that never recorded weapons gets the starter kit; otherwise a
  // missing entry means that weapon is not owned.
  const hadWeapons = isPlainObject(s.weapons);
  s.weapons = hadWeapons ? s.weapons : d.weapons;
  s.weaponCondition = isPlainObject(s.weaponCondition) ? s.weaponCondition : {};
  for (const id of ["arbalest", "wickcaster"]) {
    s.weapons[id] = !!s.weapons[id];
    const c = Number(s.weaponCondition[id]);
    s.weaponCondition[id] = Number.isFinite(c)
      ? clamp(c, 0, 100)
      : s.weapons[id]
        ? 100
        : 0;
  }
  const slots = Array.isArray(s.quickSlots) ? s.quickSlots : d.quickSlots;
  s.quickSlots = slots
    .slice(0, QUICK_SLOT_COUNT)
    .map((x) => (typeof x === "string" ? x : null))
    .concat(Array(QUICK_SLOT_COUNT).fill(null))
    .slice(0, QUICK_SLOT_COUNT);
  for (const k of ["factionStanding", "stockSold", "flags"])
    s[k] = isPlainObject(s[k]) ? s[k] : {};
  for (const k of ["completedRaids", "failedRaids"])
    s[k] = Number.isFinite(s[k]) ? s[k] : 0;
  s.worldRevision = s.worldRevision ?? d.worldRevision;
  s.lastUpdate = s.lastUpdate || Date.now();
  return s;
}

/** Load the stored save; a stored save we cannot read is quarantined, never overwritten. */
function loadStoredSave() {
  const text = get(SAVE_KEY);
  if (!text) return defaultSave();
  try {
    return normalizeSave(JSON.parse(text));
  } catch (e) {
    put(SAVE_QUARANTINE_KEY, text);
    console.warn(
      "SALTWAKE: stored save unreadable, kept in " + SAVE_QUARANTINE_KEY,
      e,
    );
    return defaultSave();
  }
}
