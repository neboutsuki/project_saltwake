// New commission kinds (escort, deliver, wound, hold) and the Wrecker-ledger story choice.
module.exports=`()=>{const c={},G=SALTWAKE_DEV.game,CT=window.saltwakeContracts,T=32,dt=1/30;c.loaded=!!CT;
const run=(id,fn)=>{if(G.raid)G.endRaid(true,'x');G.close();G.setArea('hub',33.5,27.6);G.mode='play';G.save.completedRaids=3;G.save.hunter={xp:5000,rank:8};
 const st=G.livingState();st.active={id};st.records={};const day=Math.floor(G.save.environment.clock/1440)*1440+1440;G.save.environment.clock=day+(/hold/.test(id)?1320:760);
 G.beginRaid();for(const e of G.raid.enemies){e.x=e.y=-9999}const l=G.raid.living;l.eligible=true;const out=fn(l);G.endRaid(true,'QA');G.close();G.mode='play';return out};
c.escortCompletes=run('escort_customs',l=>{const R=G.raid.contract,s=CT.SITES.customs;G.player.x=s.x*T;G.player.y=s.y*T;R.escort.x=s.x*T-30;R.escort.y=s.y*T;for(let i=0;i<10;i++)G.update(dt);return l.completed&&!l.failed});
c.escortCanFail=run('escort_customs',l=>{G.raid.contract.escort.hp=1;const m=G.raid.enemies.find(e=>!e.dead);m.x=G.raid.contract.escort.x;m.y=G.raid.contract.escort.y;m.aggro=5;for(let i=0;i<10;i++)G.update(dt);return l.failed});
c.deliverCompletes=run('deliver_medicine',l=>{const f=CT.SITES.fishmarket,t=CT.SITES.pilot;G.player.x=f.x*T;G.player.y=f.y*T;G.interact();const picked=G.raid.contract.cargo.picked;G.player.x=t.x*T;G.player.y=t.y*T;G.update(dt);return picked&&l.completed});
c.cargoBreaks=run('deliver_powder',l=>{const f=CT.SITES.camp;G.player.x=f.x*T;G.player.y=f.y*T;G.interact();for(let i=0;i<2;i++){G.player.iframes=0;G.player.hp=100;G.hurtPlayer(5,0)}return l.failed});
c.woundTags=run('wound_brineback',l=>{const e=G.raid.enemies.find(x=>x.type==='brineback');e.hp=e.maxHp*.5;G.hitMonster(e,e.maxHp*.2,{penetration:99});return !e.dead&&e.tagged&&l.completed});
c.holdCompletes=run('hold_beacon',l=>{const s=CT.SITES.beacon;let spawned=0;for(let i=0;i<32*30;i++){G.player.x=s.x*T;G.player.y=s.y*T;G.player.hp=100;G.update(dt)}spawned=G.raid.enemies.filter(e=>/^hold_/.test(e.id)).length;return l.completed&&spawned>0});
const keepQ=JSON.stringify(G.save.quests),keepF=JSON.stringify(G.save.flags||{}),gold=G.save.gold;G.save.quests.q_lost_crew={status:'done',stage:9};G.save.flags=G.save.flags||{};delete G.save.flags.wreckerLedger;
const n=G.world.content.npcs.find(x=>x.id==='n_salvager');G.talk(n);const offered=G.dialogue&&G.dialogue.node==='_ledger';window.saltwakeDialogue?.finishLine();G.choose(1);
c.storyChoice=offered&&G.save.flags.wreckerLedger==='wreckers'&&G.save.gold>gold;G.save.quests=JSON.parse(keepQ);G.save.flags=JSON.parse(keepF);G.save.gold=gold;
G.livingState().active=null;G.store();return c}`;
