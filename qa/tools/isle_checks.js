// Destinations: random isle (new layout each visit) and the fixed final arena with the Elder Tidemaw.
module.exports=`()=>{const c={},G=SALTWAKE_DEV.game,IS=window.saltwakeIsle,T=32,dt=1/30;c.loaded=!!IS;
const backup=JSON.stringify(G.save),notify=G.notify;G.notify=()=>{};const errs=[];
const near=(x,y)=>{for(let r=0;r<=2.5;r+=.5)for(let k=0;k<12;k++){const a=k/12*6.283;if(G.walkable((x+Math.cos(a)*r)*T,(y+Math.sin(a)*r)*T))return true}return false};
try{if(G.raid)G.endRaid(true,'x');G.close();G.setArea('hub',33.5,27.6);G.mode='play';G.save.completedRaids=3;
 const a=IS.genIsle(11),b=IS.genIsle(22),a2=IS.genIsle(11);c.randomPerSeed=JSON.stringify(a.ground)!==JSON.stringify(b.ground)&&JSON.stringify(a.ground)===JSON.stringify(a2.ground);
 c.isleContent=a.pois.length>=5&&a.containers.length>=8&&a.portals.length===2&&a.scene.decor.length>800&&a.procedural===true;
 // picker: locked final hunt until the Tidemaw is slain
 G.save.flags=G.save.flags||{};delete G.save.flags.tidemawSlain;c.mawLocked=!IS.unlocked(G,'maw')&&IS.unlocked(G,'isle');
 // an expedition to the isle: new map, walkable arrival, reachable caches and extractions, monsters, extraction works
 G.save.destination='isle';G.beginRaid();G.close();G.mode='play';const M=G.map();
 c.isleRaid=G.mapId==='isle'&&G.walkable(G.player.x,G.player.y)&&G.raid.enemies.length>=10&&G.raid.enemies.every(e=>e.id.startsWith('isle_'));
 c.isleReachable=M.portals.every(p=>near(p.x,p.y))&&M.containers.every(k=>near(k.x,k.y));
 c.isleOverview=!!M.overview&&!!SALTWAKE_ASSETS.images[M.overview];
 try{for(let i=0;i<20;i++)G.update(dt);G.render(performance.now())}catch(x){errs.push(String(x))}
 const firstSeed=M.seed;const p=M.portals[0];G.player.x=p.x*T;G.player.y=p.y*T;G.portal(p);c.isleExtracts=!G.raid;G.close();G.mode='play';
 G.beginRaid();G.close();G.mode='play';c.newLayoutNextVisit=G.mapId==='isle'&&G.map().seed!==firstSeed;G.endRaid(true,'x');G.close();G.mode='play';
 // the Maw: fixed, unlocked after the Tidemaw; the Elder Tidemaw starts in the arena and is tougher
 const mw=G.world.maps.maw;c.mawFixed=!!mw&&JSON.stringify(IS.genMaw().ground)===JSON.stringify(mw.ground)&&!mw.procedural&&!!window.saltwakeBoss.ARENAS.maw;
 G.save.flags.tidemawSlain=1;G.save.destination='maw';G.beginRaid();G.close();G.mode='play';c.mawRaid=G.mapId==='maw'&&G.walkable(G.player.x,G.player.y);
 const A=G.map().arena;G.player.x=A.cx*T;G.player.y=(A.cy+4)*T;G.player.hp=100;G.player.iframes=99;for(let i=0;i<10;i++)G.update(dt);const F=G.raid.tidemaw;
 const base=G.world.content.enemies.find(e=>e.id==='tidemaw').health;c.elderBoss=!!F&&F.e.elder===true&&F.e.maxHp>base*2;
 F.state='chase';F.e.burrowed=false;F.e.hp=1;G.hitMonster(F.e,500,{penetration:99},F.e.x,F.e.y);for(let i=0;i<4;i++)G.update(dt);c.elderSlain=(G.save.flags.elderSlain||0)>=1;
 G.endRaid(true,'x');G.close();
}catch(x){errs.push(String(x&&x.stack||x))}
finally{if(G.raid){G.endRaid(true,'x');G.close()}G.save=JSON.parse(backup);G.quest=new G.quest.constructor(G);G.notify=notify;G.store();G.mode='play'}
c.noErrors=errs.length===0;window.__isleAudit={errs,stats:IS.stats};return c}`;
