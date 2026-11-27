// Monster behaviour layer (alarm, herd bolt, territorial warning, ambush, gull theft, flee, spacing) + living world.
module.exports=`()=>{const c={},G=SALTWAKE_DEV.game,AI=window.saltwakeMonsterAI,LF=window.saltwakeLife,T=32,dt=1/30;c.loaded=!!AI&&!!LF;
const backup=JSON.stringify(G.save),notify=G.notify;G.notify=()=>{};const errs=[];let spot=null;
const setup=()=>{if(G.raid){G.endRaid(true,'x');G.close()}G.close();G.setArea('hub',33.5,27.6);G.mode='play';G.save.completedRaids=3;G.save.destination='quays';G.beginRaid();G.close();G.mode='play';
 for(const e of G.raid.enemies){e.x=e.y=-99999;e.homeX=e.homeY=-99999}const p=G.player;p.hp=100;p.iframes=9999;
 if(!spot){for(let r=0;r<2400&&!spot;r+=48)for(let k=0;k<12&&!spot;k++){const x=p.x+Math.cos(k/12*6.283)*r,y=p.y+Math.sin(k/12*6.283)*r;let ok=true;for(let dx=-260;dx<=260&&ok;dx+=16)for(const dy of [-160,-80,0,80,160])if(!G.walkable(x+dx,y+dy))ok=false;if(ok)spot={x,y}}}
 p.x=spot.x;p.y=spot.y};
const mon=(type,dx,dy=0,id)=>{const base=G.raid.enemies.find(x=>x.type===type)||G.raid.enemies.find(x=>x.type!=='tidemaw');const e=Object.assign({},base,{id:id||'ai_'+type+'_'+Math.random(),type,parts:[],dead:false,hp:base.maxHp,maxHp:base.maxHp,x:G.player.x+dx,y:G.player.y+dy,homeX:G.player.x+dx,homeY:G.player.y+dy,provoked:false,aggro:0,attackCD:0,swWasAlert:false,swFled:false,swFlee:0,swBolt:0,swWarn:0,swWarned:false,swLoot:null});G.initSense?.(e);e.awareness='idle';G.raid.enemies.push(e);return e};
const run=s=>{for(let t=0;t<s;t+=dt)G.update(dt)};
try{
 // pack alarm
 setup();const a=mon('widow',200,0),b=mon('widow',260,40);a.awareness='alert';a.aggro=5;G.updateEnemies(dt);c.packAlarm=b.awareness==='alert';
 // grazer herd bolts away
 setup();const gz=mon('grazer',180,0);gz.awareness='alert';const d0=Math.hypot(gz.x-G.player.x,gz.y-G.player.y);run(.8);c.herdBolts=Math.hypot(gz.x-G.player.x,gz.y-G.player.y)>d0+20&&!gz.provoked;
 // brineback warns before charging, then gets provoked
 setup();const bb=mon('brineback',190,0);G.updateEnemies(dt);const warned=AI.stats.warnings>0&&!bb.provoked;run(2);c.territorial=warned&&bb.provoked===true;
 // widow ambush when you come close
 setup();const wd=mon('widow',120,0);G.updateEnemies(dt);c.ambush=wd.awareness==='alert'&&wd.provoked===true;
 // gull steals loot and drops it when killed
 setup();const gl=mon('gull',150,0);G.raid.drops.push({x:gl.x+60,y:gl.y,id:'scrap_metal',n:2,got:false});run(2.5);const stole=!!gl.swLoot;gl.hp=1;G.hitMonster(gl,99,{penetration:9},gl.x,gl.y);c.gullTheft=stole&&G.raid.drops.some(x=>x.id==='scrap_metal'&&!x.got);
 // wounded wildlife flees
 setup();const fb=mon('brineback',100,0);fb.provoked=true;fb.awareness='alert';fb.hp=fb.maxHp*.2;const f0=Math.hypot(fb.x-G.player.x,fb.y-G.player.y);run(1);c.fleesWounded=Math.hypot(fb.x-G.player.x,fb.y-G.player.y)>f0+15;
 // bodies keep apart
 setup();const s1=mon('widow',300,0),s2=mon('widow',302,1);run(.5);c.spacing=Math.hypot(s1.x-s2.x,s1.y-s2.y)>12;
 // living world: sway, smoke from a fire light, sea fx
 const sw0=LF.stats.swayed;for(let i=0;i<3;i++)G.render(performance.now());c.windSway=LF.stats.swayed>sw0;
 const vis=SALTWAKE_VIS[G.mapId];vis.lights.push({x:G.player.x/T,y:G.player.y/T,radius:150,strength:.9});const sm0=LF.stats.smoke;run(2);vis.lights.pop();c.smoke=LF.stats.smoke>sm0;
 try{G.render(performance.now())}catch(x){errs.push(String(x))}
}catch(x){errs.push(String(x&&x.stack||x))}
finally{if(G.raid){G.endRaid(true,'x');G.close()}G.save=JSON.parse(backup);G.quest=new G.quest.constructor(G);G.notify=notify;G.store();G.mode='play'}
c.noErrors=errs.length===0;window.__aiAudit={errs,stats:AI.stats,life:LF.stats};return c}`;
