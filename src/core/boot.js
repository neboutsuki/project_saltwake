const GEOMETRY_AT_BOOT = geometryOf(WORLD);
const game = new Game();
game.bind();
window.SALTWAKE_DEV = {
  get game() {
    return game;
  },
  get world() {
    return game.world;
  },
  get save() {
    return game.save;
  },
  get raid() {
    return game.raid;
  },
  setPlayer: (map, x, y) => game.setArea(map, x, y),
  startRaid: () => game.beginRaid(),
  advanceTide: (seconds) => {
    if (game.raid) game.raid.time += seconds;
  },
  emit: (type, id) => game.quest.emit(type, id),
  get geometryLock() {
    return geometryOf(game.world) === GEOMETRY_AT_BOOT;
  },
};
requestAnimationFrame((t) => game.tick(t));
