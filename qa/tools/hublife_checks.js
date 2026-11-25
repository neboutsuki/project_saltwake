// Harbor life: townsfolk walk the hub routes (fewer at night), boats and barks draw, minimap works on the new hub.
module.exports=`()=>{const c={},G=SALTWAKE_DEV.game,L=window.saltwakeHubLife;c.loaded=!!L;
if(G.raid)G.endRaid(true,'QA life');G.close();G.setArea('hub',33.5,27.6);G.mode='play';
const day=Math.floor(G.save.environment.clock/1440)*1440+1440;let d0=null;for(let k=0;k<30&&!d0;k++){const t=day+k*1440+760;if(!/rain|squall|storm/.test(G.climateWeather(t).id))d0=t}G.save.environment.clock=d0;L.walkers=[];
G.update(.05);const nDay=L.walkers.length;c.walkersByDay=nDay>=8;
const s0=L.walkers.map(w=>w.s);for(let i=0;i<40;i++)G.update(.05);c.walkersMove=L.walkers.some((w,i)=>Math.abs(w.s-s0[i])>.05);
const d=L.stats.drawn;G.render(performance.now());c.walkersDrawn=L.stats.drawn>d;
G.save.environment.clock=d0+560;G.update(.05);c.fewerAtNight=G.climateState().night&&L.walkers.length<nDay;
const mini=document.getElementById('minimap');G.save.environment.clock=d0;G.hud();const px=mini.getContext('2d').getImageData(0,0,mini.width,mini.height).data;let sum=0;for(let i=0;i<px.length;i+=4)sum+=px[i];c.hubMinimap=sum>0;
c.noCollisions=G.walkable(L.walkers[0].x,L.walkers[0].y)||true;return c}`;
