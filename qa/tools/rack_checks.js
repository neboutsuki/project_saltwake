// Weapon rack: every basic weapon is owned, the stash lists and equips them, a failed expedition keeps weapons
// (and their condition) but loses carried items.
module.exports=`async()=>{const c={},G=SALTWAKE_DEV.game,A=window.SALTWAKE_ARMORY,W=window.saltwakeWeapons;const n=G.notify;G.notify=()=>{};
 try{G.close();G.setArea('hub',54,18);G.mode='play';const a=G.ensureArmory();
  const bases=A.weapons.filter(w=>w.rank===1&&w.level===1&&!w.parent);c.allRangedBasics=bases.every(b=>Object.keys(a.owned).some(id=>a.owned[id]>0&&A.weapons.find(w=>w.id===id)?.family===b.family));
  c.allMeleeBasics=Object.keys(W.MELEE).every(id=>G.save.melee.owned[id]);
  G.stash();c.rackShown=document.querySelectorAll('#panel .swRackRow').length>=bases.length+Object.keys(W.MELEE).length;
  G.doAction('sw_rack',{dataset:{kind:'ranged',id:'harpoon_I1',slot:'1'}});c.rackEquips=G.ensureArmory().equipped[1]==='harpoon_I1';
  G.doAction('sw_rack',{dataset:{kind:'melee',id:'greataxe'}});c.rackEquipsMelee=G.save.melee.equipped==='greataxe';G.close();
  G.save.destination='quays';G.beginRaid();G.close();G.mode='play';const eq=[...G.ensureArmory().equipped];G.ensureArmory().condition.harpoon_I1=63;addItem(G.save.bag,'rope',4);
  G.endRaid(false,'qa');const b=G.ensureArmory();c.failKeepsWeapons=eq.every((id,i)=>!id||(b.equipped[i]===id&&b.owned[id]>0))&&b.condition.harpoon_I1===63&&G.save.melee.equipped==='greataxe';
  c.failLosesItems=!G.save.bag.rope;G.close();
 }finally{G.notify=n;G.close()}return c}`;
