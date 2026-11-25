// Day/night lighting, camera feel and movement feel.
module.exports=`()=>{const c={},G=SALTWAKE_DEV.game,D=window.saltwakeDayNight,M=window.saltwakeMovement;c.loaded=!!D&&!!M;
if(G.raid)G.endRaid(true,'QA feel');G.close();G.setArea('hub',33.5,27.6);G.mode='play';
const amb=m=>D.ambientAt(m);c.nightIsDarkBlue=amb(60)[3]>.9&&amb(60)[2]>amb(60)[0];c.dayIsNeutral=amb(720)[3]===0&&amb(720)[0]>250;
c.sunsetIsWarm=amb(1090)[0]>amb(1090)[2]+60;c.dawnIsWarm=amb(380)[0]>amb(380)[2];
const day=Math.floor(G.save.environment.clock/1440)*1440+1440;G.save.environment.clock=day+1320;
const f0=D.stats.frames;for(let i=0;i<3;i++)G.render(performance.now());c.nightLightingRuns=D.active&&D.stats.frames>f0&&D.stats.lights>0;
const p=G.player,dt=1/60;p.x=36*32;p.y=31*32;M.vel.x=M.vel.y=0;G.keys.KeyD=true;const x0=p.x;G.update(dt);const first=(p.x-x0)/dt;for(let i=0;i<15;i++)G.update(dt);const x1=p.x;G.update(dt);const full=(p.x-x1)/dt;
G.keys.KeyD=false;c.accelerates=first<full*.6&&full>140;const x2=p.x;for(let i=0;i<12;i++)G.update(dt);const glide=p.x-x2;c.stopsQuickly=glide>0&&glide<20;
const cam=saltwakeCamera;const f=G.cameraFrame(800,450);c.cameraPixelSnapped=Math.abs(f.x*G.camera.zoom-Math.round(f.x*G.camera.zoom))<1e-6;
c.nightNearBlack=D.ambientAt(60)[0]<20&&D.ambientAt(60)[2]<30;G.save.completedRaids=3;G.beginRaid();const e0=D.stats.eyes||0;G.lanternOn=false;const en=G.raid.enemies.find(e=>!e.dead);en.x=G.player.x-220;en.y=G.player.y-140;for(let i=0;i<3;i++)G.render(performance.now());c.monsterEyesInDark=(D.stats.eyes||0)>e0;G.lanternOn=true;G.endRaid(true,'QA feel');
G.save.environment.clock=day+760;return c}`;
