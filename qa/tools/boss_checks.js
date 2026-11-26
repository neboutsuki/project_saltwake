// Tidemaw boss: starts in the Slip, attacks, phase 2, gills cancel the Riptide, harpoon throw-back, leash, kill,
// quest step, deep loot table.
module.exports=`()=>{const c={},G=SALTWAKE_DEV.game,B=window.saltwakeBoss;c.loaded=!!B;
if(G.raid)G.endRaid(true,'x');G.close();G.setArea('hub',33.5,27.6);G.mode='play';G.save.completedRaids=3;G.beginRaid();
for(const e of G.raid.enemies)if(!e.boss){e.x=e.y=-9999}const p=G.player;p.x=162*32;p.y=98*32;
const states=new Set();for(let i=0;i<240;i++){p.hp=100;p.iframes=0;G.update(1/30);const F=B.fight(G);if(F)states.add(F.state)}
const F=B.fight(G),e=F&&F.e;c.startsInSlip=!!e&&e.type==='tidemaw';c.attacks=['lunge_tele','spit_tele','tail_tele'].some(s=>states.has(s));
e.hp=e.maxHp*.55;G.update(1/30);c.phaseTwo=F.phase===2;F.ripAt=0;F.state='chase';F.next=0;G.update(1/30);c.riptideWindup=F.state==='riptide';
for(const id of ['gill_left','gill_right']){G.hitMonster(e,120,{hitPartId:id,partPower:3,penetration:99})}for(let i=0;i<3;i++)G.update(1/30);c.gillsCancelRiptide=F.state==='stun'&&e.parts.filter(q=>/^gill/.test(q.id)).every(q=>q.broken);
F.harpoons.push({x:p.x+20,y:p.y,t:0});G.interact();c.harpoonPickup=p.harpoon===true;const h0=e.hp;const aim=()=>{p.angle=Math.atan2(e.y-(p.y-8),e.x-p.x)};aim();G.aimWorld=()=>({x:e.x,y:e.y});G.shoot();for(let i=0;i<30;i++){G.update(1/30)}delete G.aimWorld;c.harpoonHits=e.hp<h0;
p.x=120*32;p.y=80*32;for(let i=0;i<10;i++)G.update(1/30);c.leash=F.state==='away';p.x=162*32;p.y=98*32;for(let i=0;i<60;i++){p.hp=100;G.update(1/30)}
const keep=JSON.stringify(G.save.quests);G.save.quests={q_tidemaw:{status:'active',stage:0}};
e.hp=1;e.burrowed=false;F.state='chase';G.hitMonster(e,999,{penetration:99});G.update(1/30);c.killFinishes=F.done&&G.save.flags.tidemawSlain>0;c.questAdvanced=G.save.quests.q_tidemaw.stage===1;
G.save.quests=JSON.parse(keep);c.deepLootTable=G.world.content.lootTables.some(t=>t.id==='deep_cache')&&G.world.content.containers.filter(k=>k.rare).length>=6;
G.endRaid(true,'QA boss');G.close();G.mode='play';return c}`;
