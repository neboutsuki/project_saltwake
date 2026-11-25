module.exports=`async()=>{const c={},G=SALTWAKE_DEV.game,K=saltwakeSky.state,wait=ms=>new Promise(r=>setTimeout(r,ms));
G.setArea('hub',34,36);G.mode='play';const env=G.ensureClimate();const iv=SALTWAKE_ENV.weatherIntervalMinutes;
let base=0;for(let d=0;d<200;d++){const cl=d*iv;if(G.climateWeather(cl).id!==G.climateWeather(cl+iv).id){base=cl;break}}
env.clock=base+iv-200;await wait(150);c.noBlendEarly=K.blend<.01;
env.clock=base+iv-25;await wait(150);c.frontBlending=K.blend>.3&&K.blend<1&&K.next!==K.weather;
env.clock=720+1440*3;await wait(150);const noon={e:K.sunElev,x:K.expo};c.noonSun=noon.e>.95;
env.clock=1320+1440*3;await wait(150);c.nightDark=K.sunElev===0&&K.night>.9&&K.expo<noon.x;c.moonIcon=K.icon==='☾';
env.clock=420+1440*3;await wait(150);const am=K.shadow.shear;env.clock=1000+1440*3;await wait(150);c.shadowsFollowSun=am>0&&K.shadow.shear<0;
c.goldenWarm=K.tint[0]>K.tint[2];
G.save.completedRaids=3;G.beginRaid();G.raid.weatherOverride='rain';K.wet=0;await wait(700);c.wetBuilds=K.wet>0&&K.rain>.5;
G.raid.weatherOverride='squall';await wait(200);c.squallRainFull=K.rain>.95&&K.ash<.05;
G.raid.weatherOverride='fog';await wait(200);c.fogDense=K.fog>.9;
G.raid.weatherOverride='clear';await wait(200);c.clearDry=K.rain===0;
G.endRaid(true,'QA sky');return c}`;
