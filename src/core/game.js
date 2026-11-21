class Game {
  constructor() {
    this.world = WORLD;
    this.save = loadStoredSave(); // see src/core/save.js
    this.quest = new QuestEngine(this);
    this.mapId = "hub";
    this.mode = "start";
    this.player = {
      x: 50 * T,
      y: 46 * T,
      hp: 100,
      st: 100,
      bleed: 0,
      wet: 0,
      angle: 0,
      weapon: 0,
      mag: [1, 3],
      roll: 0,
      rollCD: 0,
      iframes: 0,
      rollX: 0,
      rollY: 0,
      cooldown: 0,
      reload: 0,
      hit: 0,
    };
    this.camera = { x: 0, y: 0, zoom: 1, target: 1 };
    this.keys = {};
    this.mouse = { x: VW / 2 + 95, y: VH / 2, down: false };
    this.frameTime = 0;
    this.toastUntil = 0;
    this.dialogue = null;
    this.raid = null;
    this.panel = null;
    this.seed = 21;
    this.sound = false;
    this.npcRuntime = {};
    this.mapChangedAt = 0;
    this.mapSelection = null;
    this.mapMarkers = [];
    this.store();
  }
}
