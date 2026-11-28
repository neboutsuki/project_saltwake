// Camera: mouse look, fight framing (shift + zoom out to fit spread-out hunters), boss framing, conversation close-up,
// kill punch, and the zoom returning to normal. Uses a simulated clock (the camera is time-based).
module.exports=`async()=>{const c={},G=SALTWAKE_DEV.game,C=window.saltwakeCamera;const n0=G.notify;G.notify=()=>{};
 const realNow=performance.now;let fake=performance.now();performance.now=()=>fake;const step=n=>{for(let i=0;i<n;i++){fake+=33;G.update(1/30);G.render(fake)}};
 try{if(G.raid)G.endRaid(true,'qa');G.close();G.save.destination='quays';G.save.completedRaids=Math.max(5,G.save.completedRaids||0);G.beginRaid();G.close();G.mode='play';
  const p=G.player;p.x=100*32;p.y=80*32;for(const e of G.raid.enemies){e.x=e.y=-99999}
  G.mouse.x=VW/2;G.mouse.y=VH/2;step(60);const x0=G.camera.x,z0=G.camera.zoom;G.mouse.x=VW-8;step(60);c.mouseLook=G.camera.x-x0>120;G.mouse.x=VW/2;step(60);
  const es=G.raid.enemies.filter(e=>!e.boss).slice(0,2);es.forEach((e,i)=>{e.x=p.x+(i?-450:450);e.y=p.y+(i?160:-160);e.awareness='alert';e.attackCD=99;e.staggerTime=99});
  step(120);c.fightZoomOut=G.camera.zoom<z0*.97;es.forEach(e=>{e.x=e.y=-99999});step(200);c.zoomReturns=Math.abs(G.camera.zoom-z0)<z0*.02;
  const k=window.saltwakeImpact.stats.kills;window.saltwakeImpact.stats.kills=k+1;step(2);c.killPunch=C.state.punch>0;step(60);
  G.endRaid(true,'qa');G.close();G.setArea('hub',36,40);G.mode='play';step(40);const n=G.world.content.npcs.find(x=>x.id==='n_mechanic'),at=G.npcLocation(n);p.x=at.x+90;p.y=at.y+60;step(60);
  const hz=G.camera.zoom;G.talk(n);step(70);c.talkCloseUp=G.camera.zoom>hz*1.05;G.close();step(140);c.talkReturns=Math.abs(G.camera.zoom-hz)<hz*.02;
  c.settings=['mouselook','framing'].every(k=>k in C.settings);
 }finally{performance.now=realNow;G.notify=n0;G.close()}return c}`;
