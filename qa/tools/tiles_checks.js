// Tile maps (v0.31): new Salvager's Rest (compact) and Outer Quays (large) from tools/make_maps.py.
module.exports=`async ()=>{const c={},G=SALTWAKE_DEV.game,X=window.saltwakeTiles,T=32;c.loaded=!!X&&X.enabled;
const H=G.world.maps.hub,Q=G.world.maps.quays;c.mapsAreTilemaps=!!H.tilemap&&!!Q.tilemap;c.hubCompact=H.w*H.h<Q.w*Q.h/5;c.quaysLarge=Q.w>=200&&Q.h>=140;
G.close();G.setArea('hub',33.5,27.6);G.mode='play';c.harborFrameOff=document.getElementById('reunionHarbor').hidden===true&&!!G.world.maps.hub.tilemap;
c.hubArrivalWalkable=G.walkable(G.player.x,G.player.y);
for(let i=0;i<60&&!X.ready;i++){G.render(performance.now());await new Promise(r=>setTimeout(r,50))}c.ready=X.ready;
const f0=X.stats.facades;G.render(performance.now());c.hubFacadesDrawn=X.stats.facades>f0;c.hubPlaza=X.materialAt(36,22,G)==='plaza';
c.hubNpcsReachable=G.world.content.npcs.filter(n=>n.mapId==='hub').every(n=>{const [x,y]=X.nearestWalkable(G,n.x,n.y);return Math.hypot(x-n.x,y-n.y)<2.5});
G.save.completedRaids=3;G.beginRaid();c.raidArrival=G.mapId==='quays'&&G.walkable(G.player.x,G.player.y)&&G.player.x<20*T;
c.spawnsMoved=G.raid.enemies.filter(e=>/^e[0-9]+$/.test(e.id)).every(e=>Math.abs(e.x/T-Q.spawns[+e.id.slice(1)][0])<.01);
c.roadIsCobble=X.materialAt(15,63,G)==='cobble';c.plazaIsStone=X.materialAt(100,50,G)==='plaza';c.shoreIsSand=X.materialAt(60,126,G)==='sand';
const ch=X.buildChunk(2,1,G);c.chunkBuilds=!!ch&&ch.width===512;
c.sceneObjects=(SALTWAKE_VIS.quays?.decor||[]).length>1000&&(SALTWAKE_VIS.hub?.decor||[]).length>100;
c.northEdgeBlocks=!G.walkable(40*T,2*T);c.stormGateOpen=G.walkable(100*T,4*T);
c.westEdgeBlocks=!G.walkable(1*T,40*T);c.westPassageOpen=G.walkable(1.5*T,62*T);c.innerStillWalkable=G.walkable(15*T,63*T);
c.buildingsSolid=Q.buildings.filter(b=>b.art).every(b=>!G.walkable((b.x+b.w/2)*T,(b.y+b.h/2)*T));
const w=G.map().portals.every(p=>{for(let r=0;r<=3;r+=.5)for(let k=0;k<12;k++){const a=k/12*Math.PI*2;if(G.walkable((p.x+Math.cos(a)*r)*T,(p.y+Math.sin(a)*r)*T))return true}return false});c.exitsReachable=w;
G.endRaid(true,'QA tiles');c.backInHub=G.mapId==='hub'&&G.walkable(G.player.x,G.player.y);return c}`;
