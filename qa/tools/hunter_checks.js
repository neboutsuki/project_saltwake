// Hunter Rank: XP sources, banking on extraction (half on death), rank gates in the smithy and on the board.
module.exports=`()=>{const c={},G=SALTWAKE_DEV.game,H=window.saltwakeHunter;c.loaded=!!H;
const keep=JSON.stringify(G.save.hunter||null);G.save.hunter={xp:0,rank:1};
if(G.raid)G.endRaid(true,'x');G.close();G.setArea('hub',33.5,27.6);G.mode='play';G.save.completedRaids=3;G.beginRaid();
const e=G.raid.enemies.find(x=>x.type==='brineback'&&!x.dead);e.hp=1;G.hitMonster(e,999,{penetration:99},e.x,e.y);
c.killXpPending=(G.raid.hunterXp||0)>=H.KILL.brineback&&G.save.hunter.xp===0;
G.endRaid(true,'QA hunter');c.bankedOnExtract=G.save.hunter.xp>=H.KILL.brineback+H.XP.extract;G.close();G.mode='play';
const x0=G.save.hunter.xp;G.beginRaid();G.raid.hunterXp=100;G.endRaid(false,'QA fall');c.halfOnDeath=G.save.hunter.xp-x0===50;G.close();G.mode='play';
c.rankFromXp=H.rankOf(0)===1&&H.rankOf(120)===2&&H.rankOf(2600)===8;
G.save.hunter={xp:0,rank:1};const n=(typeof ARMORY!=='undefined'?ARMORY:null)?.weapons.find(w=>w.rank===2);c.weaponGate=!!n&&G.canForgeNode(n)===false;
G.save.hunter={xp:900,rank:5};c.tiersAndOffers=H.tierOf({steps:[{kind:'kill',target:'widow',need:1}]})===3&&H.tierOf({steps:[{kind:'cache',need:1}]})===1;
G.save.hunter=JSON.parse(keep)||{xp:0,rank:1};G.store();return c}`;
