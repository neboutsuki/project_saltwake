// Ambient life + density: leaves by day, fireflies at night, dense scenery.
module.exports=`()=>{const c={},G=SALTWAKE_DEV.game,A=window.saltwakeAmbient;c.loaded=!!A;
c.denseQuays=(G.world.maps.quays.scene.decor||[]).length>3000;c.denseHub=(G.world.maps.hub.scene.decor||[]).length>250;
if(G.raid)G.endRaid(true,'x');G.close();G.save.completedRaids=3;G.beginRaid();G.close();G.mode='play';G.player.x=150*32;G.player.y=44*32;
const day=Math.floor(G.save.environment.clock/1440)*1440+1440;let d0=day+760;for(let k=0;k<30;k++){if(!/rain|squall|storm/.test(G.climateWeather(day+k*1440+760).id)){d0=day+k*1440+760;break}}
G.save.environment.clock=d0;A.leaves=[];A.flies=[];for(let i=0;i<300;i++){G.update(1/30)}G.render(performance.now());c.leavesByDay=A.leaves.length>0;c.noFirefliesByDay=A.flies.length===0;
G.save.environment.clock=d0+580;G.render(performance.now());for(let i=0;i<120;i++)G.update(1/30);G.render(performance.now());c.firefliesAtNight=A.flies.length>0;
G.endRaid(true,'QA ambient');G.close();G.mode='play';return c}`;
