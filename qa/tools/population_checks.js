// Field population: district groups, day/night variants, first-raid and human-rarity rules, extra loot.
module.exports=`()=>{const c={},G=SALTWAKE_DEV.game,POP=window.saltwakePopulation,Q=G.world.maps.quays;c.loaded=!!POP&&Array.isArray(Q.population);
const run=(mins,raids)=>{if(G.raid)G.endRaid(true,'QA pop');G.close();G.setArea('hub',33.5,27.6);G.mode='play';G.save.environment.clock=Math.floor(G.save.environment.clock/1440)*1440+1440+mins;G.save.completedRaids=raids;G.beginRaid();const r={rep:POP.last,en:G.raid.enemies.slice(),night:G.climateState().night};return r};
const d=run(760,3);c.dayPopulation=!d.night&&d.rep.added>=15&&(d.rep.byType.grazer||0)>0;c.allOnWalkableGround=d.en.every(e=>G.walkable(e.x,e.y));c.humansStayRare=d.en.filter(e=>e.actorType==='human'&&/^(e[0-9]|pop_)/.test(e.id)).length<=2;
const n=run(1320,3);c.nightPopulation=n.night&&(n.rep.byType.brineworn_drifter||0)>0&&!(n.rep.byType.grazer);
const f=run(1320,0);c.firstRaidNoBrineworn=!Object.keys(f.rep.byType).some(k=>/^brineworn_/.test(k));
c.extraLoot=G.world.content.containers.filter(k=>k.mapId==='quays').length>=25;
G.endRaid(true,'QA pop');G.save.completedRaids=3;return c}`;
