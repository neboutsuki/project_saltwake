// Graphics pass: soft ground blending (painter v2), water/shoreline effects, pier shadows on water only, atmosphere
// (cloud shadows, sun shafts, fog, wet ground, embers, building contact shadows), flash lights, full-res ash/rain.
module.exports=`async()=>{const c={},G=SALTWAKE_DEV.game,TX=window.saltwakeTiles,A=window.saltwakeAtmo,DN=window.saltwakeDayNight,FX=window.saltwakeEnvFx||{};const n=G.notify;G.notify=()=>{};
 try{if(G.raid)G.endRaid(true,'qa');G.close();G.setArea('hub',36,44);G.mode='play';await TX.loadMap(G,'hub');
  const S=window.saltwakeSky.state;S.sunElev=.8;S.cloud=.45;S.rain=.5;S.wet=.7;S.fog=.4;S.minute=1050;
  const s0=JSON.parse(JSON.stringify(A.stats)),g0=TX.stats.dockShadows||0;for(let i=0;i<4;i++){G.update(1/30);G.render(performance.now())}
  c.cloudShadows=A.stats.clouds>s0.clouds;c.wetGround=A.stats.wet>s0.wet;c.fogBanks=A.stats.fog>s0.fog;c.sunShafts=A.stats.shafts>s0.shafts;c.buildingContactShadow=A.stats.ao>s0.ao;
  c.glintsOnWater=(TX.stats.glints||0)>0;c.pierShadowOnWater=(TX.stats.dockShadows||0)>g0;
  const before=DN.stats.flashes||0;DN.flash(G.player.x,G.player.y,150);c.flashLights=(DN.stats.flashes||0)>before&&DN.flashes.length>0;
  const ash=FX.ashCanvas;c.ashFullRes=!!ash&&ash.width>=VW;
 }finally{G.notify=n}return c}`;
