/* SALTWAKE weapon data additions (v0.31). Runs before the armory/smithy scripts index ARMORY, so the new nodes appear
 * in every forge view: the Harpoon Gun family (fires bolts; reels small monsters in, anchors big ones) and rank V
 * "Tidemaw" upgrades at the end of every branch, forged from Tidemaw parts. Behaviour lives in weapons.js.
 */
(() => {
  const ARMORY = window.SALTWAKE_ARMORY;
  if (ARMORY && !ARMORY.families.harpoon) {
    ARMORY.families.harpoon = { name: 'Harpoon Gun', ammoId: 'bolt', damage: 64, cooldown: .9, reload: 1.6, magSize: 1, speed: 760, spread: .03, noise: 300, range: 620, penetration: 20, stagger: 1.6, partPower: 1.2, baseCost: 200,
      branches: { reelhook: { name: 'Reelhook', description: 'Barbed line: reels heavier monsters in and holds them longer.', bonus: { stagger: 1.25 }, discovery: 'widow_claw' },
        anchorline: { name: 'Anchorline', description: 'Tidemaw-sinew line: anchors big monsters far longer and breaks parts.', bonus: { partPower: 1.35, penetration: 1.3 }, discovery: 'tidemaw_tail_fin' } } };
    const add = n => ARMORY.weapons.push({ discovery: null, ...n });
    add({ id: 'harpoon_I1', name: 'Harpoon Gun I · 1', family: 'harpoon', rank: 1, level: 1, branch: null, parent: null, materials: { scrap_metal: 5, rope: 4 }, price: 200 });
    add({ id: 'harpoon_I2', name: 'Harpoon Gun I · 2', family: 'harpoon', rank: 1, level: 2, branch: null, parent: 'harpoon_I1', materials: { scrap_metal: 4, rope: 2 }, price: 90 });
    add({ id: 'harpoon_I3', name: 'Harpoon Gun I · 3', family: 'harpoon', rank: 1, level: 3, branch: null, parent: 'harpoon_I2', materials: { scrap_metal: 5, rope: 2 }, price: 110 });
    const extra = { reelhook: ['widow_claw', 'salt_widow_shell'], anchorline: ['tidemaw_tail_fin', 'brineback_plate'] };
    for (const br of ['reelhook', 'anchorline']) {
      let parent = 'harpoon_I3';
      for (const r of [2, 3]) for (const l of [1, 2, 3]) {
        const id = `harpoon_${br}_R${r}L${l}`, [a, b] = extra[br];
        add({ id, name: `${ARMORY.families.harpoon.branches[br].name} ${r === 2 ? 'II' : 'III'} · ${l}`, family: 'harpoon', rank: r, level: l, branch: br, parent,
          materials: { scrap_metal: 4 + r + l, rope: r, [a]: r - 1, ...(r === 3 ? { [b]: 1 } : {}) }, price: 100 + r * 30 + l * 20, discovery: r === 2 && l === 1 ? ARMORY.families.harpoon.branches[br].discovery : null });
        parent = id;
      }
    }
    // Rank V: the apex of every branch that reaches R4 L3, forged from Tidemaw parts.
    const TIDE = { bow: 'Tidecaller', arbalest: 'Tidebreaker', wickcaster: 'Tideflare', longwatch: 'Tidewatch' };
    for (const tip of ARMORY.weapons.filter(n => n.rank === 4 && n.level === 3 && n.branch)) {
      const br = ARMORY.families[tip.family].branches[tip.branch];
      add({ id: `${tip.family}_${tip.branch}_R5L1`, name: `${TIDE[tip.family] || 'Tide'} ${br.name} V`, family: tip.family, rank: 5, level: 1, branch: tip.branch, parent: tip.id,
        materials: { scrap_metal: 12, tidemaw_gill: 2, tidemaw_jaw_plate: 1, tidemaw_tail_fin: 1 }, price: 420, apex: true });
    }
  }
})();
