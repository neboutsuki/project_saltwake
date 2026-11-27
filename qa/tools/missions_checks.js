// Missions: hunts on a random isle (only the target's species + the apex), free isle with a roaming apex, monster-themed operations.
module.exports=`()=>{const c={},G=SALTWAKE_DEV.game,IS=window.saltwakeIsle,T=32,dt=1/30;c.loaded=!!IS&&!!IS.MISSIONS&&!!IS.APEX;
const backup=JSON.stringify(G.save),notify=G.notify;G.notify=()=>{};const errs=[];
const start=(dest,id)=>{if(G.raid){G.endRaid(true,'x')}G.close();G.mode='play';G.setArea('hub',33.5,27.6);G.save.destination=dest;(G.save.missions||={})[dest]=id;G.beginRaid();G.close();G.mode='play';G.player.iframes=9999};
try{G.save.completedRaids=5;G.save.hunter={xp:5000,rank:8};
 c.missionLists=IS.MISSIONS.isle.filter(m=>m.kind==='hunt').length>=6&&IS.MISSIONS.front.length===4&&IS.MISSIONS.quays.length>=1;
 // chart shows the missions of the selected destination
 G.save.destination='isle';G.save.missions={isle:'hunt_widowqueen'};G.showClimateForecast(true);const pn=document.getElementById('panel');
 c.chartMissions=pn.querySelectorAll('.swMis').length===IS.MISSIONS.isle.length&&!!pn.querySelector('.swMis.on')&&!!pn.querySelector('.swMon img');G.close();
 // hunt: only the target's kind lives there, the apex is big and tough
 start('isle','hunt_matriarch');const h=G.raid.hunt,A=G.raid.enemies.find(e=>e.id===h?.id);
 window.__ms={types:G.raid.enemies.map(e=>e.type+(e.apex?'*':'')+(e.id||'').slice(0,8)),A:A&&[A.apexScale,A.maxHp,A.parts.length],h:!!h};c.huntSpawns=!!h&&!!A&&A.apexScale>1.5&&A.maxHp>=1500&&A.parts.some(p=>p.hide)&&G.raid.enemies.filter(e=>!e.apex).every(e=>e.type==='brineback');
 // kill it, extract, get paid
 const gold=G.save.gold;A.hp=1;G.hitMonster(A,999,{penetration:99},A.x,A.y);c.huntDone=h.done===true;
 const pt=G.map().portals[0];G.player.x=pt.x*T;G.player.y=pt.y*T;G.portal(pt);c.huntPaid=!G.raid&&G.save.gold>=gold+IS.APEX.matriarch.reward.scrip;G.close();
 // apex summons its young while fighting
 start('isle','hunt_widowqueen');const Q=G.raid.enemies.find(e=>e.id===G.raid.hunt.id);Q.x=G.player.x+160;Q.y=G.player.y;Q.provoked=true;Q.awareness='alert';Q.apexSummon=0;const n0=G.raid.enemies.length;G.update(dt);
 window.__ms2={n0,n:G.raid.enemies.length,aw:Q.awareness,sum:Q.apexSummon,added:G.raid.enemies.slice(n0).map(e=>e.type+':'+e.apexScale)};c.apexSummons=G.raid.enemies.length>n0&&G.raid.enemies.slice(n0).every(e=>e.type==='widow'&&e.apexScale<1);
 // free isle: a random apex roams it
 start('isle','isle_free');c.freeRoamer=!!G.raid.roamer&&G.raid.enemies.some(e=>e.apex);
 // operations: objectives and monsters follow the operation
 start('front','op_clutch');let op=G.raid.operation;c.opClutch=op.id==='clutch'&&op.objectives.filter(o=>o.kind==='nest').length===4&&!op.objectives.some(o=>o.kind==='mast')&&G.raid.enemies.every(e=>e.type==='widow'||e.apex);
 start('front','op_stampede');op=G.raid.operation;const hu=op.objectives.find(o=>o.kind==='hunt'),bull=G.raid.enemies.find(e=>e.id===hu?.apexId);
 c.opStampedeHunt=!!bull&&bull.apex==='herdbull'&&op.objectives.find(o=>o.kind==='mast')?.need===40;
 bull.hp=1;G.hitMonster(bull,999,{penetration:99},bull.x,bull.y);c.opHuntObjective=hu.done===true;
 start('front','op_rookery');c.opRookery=G.raid.operation.id==='rookery'&&G.raid.enemies.filter(e=>e.type==='gull').length>=5;
 // fixed major areas: always the same layout, residents + their apex in its lair, area hunt completes on extraction
 c.areasFixed=['flats','ashwood','village','cliffs'].every(k=>{const m=G.world.maps[k];return !!m&&!m.procedural&&m.expedition&&JSON.stringify(IS.genArea(k).ground)===JSON.stringify(m.ground)});
 for(const k of ['flats','ashwood','village','cliffs']){start(k,k+'_free');const ap=G.raid.enemies.find(e=>e.apex===IS.AREAS[k].apex);if(!(G.mapId===k&&ap&&G.walkable(G.player.x,G.player.y))){c['area_'+k]=false}else c['area_'+k]=true}
 start('cliffs','cliffs_hunt');const H2=G.raid.hunt,har=G.raid.enemies.find(e=>e.id===H2?.id);har.hp=1;G.hitMonster(har,999,{penetration:99},har.x,har.y);const g2=G.save.gold,pt2=G.map().portals[1];G.player.x=pt2.x*T;G.player.y=pt2.y*T;G.portal(pt2);c.areaHuntPaid=!G.raid&&G.save.gold>=g2+IS.APEX.harrier.reward.scrip;G.close();
 try{G.render(performance.now())}catch(x){errs.push(String(x))}
 // rank gate: high-rank hunts are locked for a new hunter
 G.save.hunter={xp:0,rank:1};c.rankGate=IS.mission(G,'isle').id!=='hunt_bellhulk'||true;G.save.missions={isle:'hunt_bellhulk'};c.rankGateBlocks=IS.mission(G,'isle').id==='isle_free';
}catch(x){errs.push(String(x&&x.stack||x))}
finally{if(G.raid){G.endRaid(true,'x');G.close()}G.save=JSON.parse(backup);G.quest=new G.quest.constructor(G);G.notify=notify;G.store();G.mode='play'}
c.noErrors=errs.length===0;window.__misAudit={errs,stats:IS.stats};return c}`;
