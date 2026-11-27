// Destinations: random isle (new layout each visit) and the fixed final arena with the Elder Tidemaw.
module.exports=`()=>{const c={},G=SALTWAKE_DEV.game,IS=window.saltwakeIsle,T=32,dt=1/30;c.loaded=!!IS;
const backup=JSON.stringify(G.save),notify=G.notify;G.notify=()=>{};const errs=[];
const near=(x,y)=>{for(let r=0;r<=2.5;r+=.5)for(let k=0;k<12;k++){const a=k/12*6.283;if(G.walkable((x+Math.cos(a)*r)*T,(y+Math.sin(a)*r)*T))return true}return false};
try{if(G.raid)G.endRaid(true,'x');G.close();G.setArea('hub',33.5,27.6);G.mode='play';G.save.completedRaids=3;
 const a=IS.genIsle(11),b=IS.genIsle(22),a2=IS.genIsle(11);c.randomPerSeed=JSON.stringify(a.ground)!==JSON.stringify(b.ground)&&JSON.stringify(a.ground)===JSON.stringify(a2.ground);
 c.isleContent=a.pois.length>=5&&a.containers.length>=8&&a.portals.length===2&&a.scene.decor.length>800&&a.procedural===true;
 // picker: locked final hunt until the Tidemaw is slain
 G.save.flags=G.save.flags||{};delete G.save.quests.q_into_the_maw;c.mawLocked=!IS.unlocked(G,'maw')&&IS.unlocked(G,'isle');
 // an expedition to the isle: new map, walkable arrival, reachable caches and extractions, monsters, extraction works
 G.save.destination='isle';G.beginRaid();G.close();G.mode='play';const M=G.map();
 c.isleRaid=G.mapId==='isle'&&G.walkable(G.player.x,G.player.y)&&G.raid.enemies.length>=10&&G.raid.enemies.every(e=>e.id.startsWith('isle_')||e.apex)&&G.raid.enemies.some(e=>e.apex);
 c.isleReachable=M.portals.every(p=>near(p.x,p.y))&&M.containers.every(k=>near(k.x,k.y));
 c.isleOverview=!!M.overview&&!!SALTWAKE_ASSETS.images[M.overview];
 try{for(let i=0;i<20;i++)G.update(dt);G.render(performance.now())}catch(x){errs.push(String(x))}
 const firstSeed=M.seed;const p=M.portals[0];G.player.x=p.x*T;G.player.y=p.y*T;G.portal(p);c.isleExtracts=!G.raid;G.close();G.mode='play';
 G.beginRaid();G.close();G.mode='play';c.newLayoutNextVisit=G.mapId==='isle'&&G.map().seed!==firstSeed;G.endRaid(true,'x');G.close();G.mode='play';
 // the expedition chart: one departure point, full-screen chart with every destination
 G.close();G.mode='play';G.setArea('hub',33.5,27.6);G.save.destination='front';G.showClimateForecast(true);const pn=document.getElementById('panel');
 c.chart=!!pn.querySelector('.swChart .swSea')&&pn.querySelectorAll('.swNode').length===IS.DEST.length-1&&!pn.querySelector('.swNode.t-maw')&&!!pn.querySelector('.swNode.on.t-front')&&!!pn.querySelector('[data-act="env_deploy"]');G.close();
 const outer=G.world.maps.hub.portals.find(p=>p.id==='hub.outer');G.mode='play';G.portal(outer);c.singleDeparture=!G.panel&&!G.raid;
 // the Brinefront operation: objectives -> call extraction -> hold -> boat
 G.save.destination='front';G.beginRaid();G.close();G.mode='play';const op=G.raid.operation,FM=G.map();
 c.frontRaid=G.mapId==='front'&&!!op&&op.objectives.length===4&&FM.procedural===true&&G.walkable(G.player.x,G.player.y)&&op.objectives.every(o=>near(o.x,o.y))&&near(FM.evac.x,FM.evac.y);
 const SVv=window.saltwakeSurvival,S=SVv.ensure(G);c.frontOpsPhase=S.phase==='ops';G.player.iframes=9999;
 G.player.x=FM.evac.x*T;G.player.y=FM.evac.y*T;G.interact();c.extractLockedUntilDone=S.phase==='ops';
 for(const o of op.objectives){G.player.x=o.x*T;G.player.y=(o.y+1)*T;G.interact();if(o.kind==='nest'){for(let i=0;i<6/dt&&!o.done;i++)G.update(dt)}else{for(let i=0;i<27/dt&&!o.done;i++){G.player.x=o.x*T;G.player.y=(o.y+1)*T;G.update(dt)}}}
 c.objectivesDone=op.objectives.every(o=>o.done)&&op.allDone;
 G.player.x=FM.evac.x*T;G.player.y=FM.evac.y*T;G.interact();c.extractionCalled=S.phase==='waves';
 const gold=G.save.gold;S.t=S.seconds;G.update(dt);S.evacT=.05;G.update(dt);G.update(dt);G.player.x=S.zone.x;G.player.y=S.zone.y;for(let i=0;i<2.5/dt&&G.raid;i++)G.update(dt);
 c.frontWin=!G.raid&&G.save.gold>=gold+250;G.close();G.mode='play';
 // the Maw: fixed, unlocked after the Tidemaw; the Elder Tidemaw starts in the arena and is tougher
 const mw=G.world.maps.maw;c.mawFixed=!!mw&&JSON.stringify(IS.genMaw().ground)===JSON.stringify(mw.ground)&&!mw.procedural&&!!window.saltwakeBoss.ARENAS.maw;
 G.save.quests.q_into_the_maw={status:'active',stage:0};G.showClimateForecast(true);c.mawOnChartWithQuest=!!document.querySelector('#panel .swNode.t-maw');G.close();G.mode='play';G.save.destination='maw';G.beginRaid();G.close();G.mode='play';c.mawRaid=G.mapId==='maw'&&G.walkable(G.player.x,G.player.y);
 const A=G.map().arena;G.player.x=A.cx*T;G.player.y=(A.cy+4)*T;G.player.hp=100;G.player.iframes=99;for(let i=0;i<10;i++)G.update(dt);const F=G.raid.tidemaw;
 const base=G.world.content.enemies.find(e=>e.id==='tidemaw').health;c.elderBoss=!!F&&F.e.elder===true&&F.e.maxHp>base*2;
 F.state='chase';F.e.burrowed=false;F.e.hp=1;G.hitMonster(F.e,500,{penetration:99},F.e.x,F.e.y);for(let i=0;i<4;i++)G.update(dt);c.elderSlain=(G.save.flags.elderSlain||0)>=1&&G.save.quests.q_into_the_maw.stage>=1;
 G.endRaid(true,'x');G.close();
}catch(x){errs.push(String(x&&x.stack||x))}
finally{if(G.raid){G.endRaid(true,'x');G.close()}G.save=JSON.parse(backup);G.quest=new G.quest.constructor(G);G.notify=notify;G.store();G.mode='play'}
c.noErrors=errs.length===0;window.__isleAudit={errs,stats:IS.stats};return c}`;
