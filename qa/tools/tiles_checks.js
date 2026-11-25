// Outer Quays tile map (stage A): ground materials, new art in use, natural edges block, exits stay open.
module.exports=`async ()=>{const c={},G=SALTWAKE_DEV.game,X=window.saltwakeTiles;c.loaded=!!X&&X.enabled;
G.close();G.setArea('hub',34,36);G.mode='play';G.save.completedRaids=3;G.beginRaid();const T=32;
for(let i=0;i<60&&!X.ready;i++){G.render(performance.now());await new Promise(r=>setTimeout(r,50))}c.ready=X.ready;
c.roadIsCobble=X.materialAt(12,25)==='cobble';c.plazaIsStone=X.materialAt(80,46)==='plaza';c.shoreIsSand=X.materialAt(60,88)==='sand';
const ch=X.buildChunk(2,1);c.chunkBuilds=!!ch&&ch.width===512;
const s0={...X.stats};G.player.x=80*T;G.player.y=46*T;for(let i=0;i<6;i++)G.render(performance.now());
c.newArtDrawn=X.stats.sprites>s0.sprites&&X.stats.facades>s0.facades;
G.player.x=40*T;G.player.y=5*T;for(let i=0;i<4;i++)G.render(performance.now());c.edgesDrawn=X.stats.edges>s0.edges;
c.northEdgeBlocks=!G.walkable(40*T,1*T);c.stormGateOpen=G.walkable(76*T,1.5*T);
c.westEdgeBlocks=!G.walkable(.8*T,50*T);c.westPassageOpen=G.walkable(.8*T,24*T);
c.innerStillWalkable=G.walkable(12*T,25*T);
const w=G.map().portals.every(p=>{for(let r=0;r<=3;r+=.5)for(let k=0;k<12;k++){const a=k/12*Math.PI*2;if(G.walkable((p.x+Math.cos(a)*r)*T,(p.y+Math.sin(a)*r)*T))return true}return false});c.exitsReachable=w;
G.endRaid(true,'QA tiles');return c}`;
