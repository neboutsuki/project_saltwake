// Monster attack telegraphs: per-monster moves with readable wind-ups, honest hit shapes, charge/pounce/aim-lock.
module.exports=`()=>{const c={},G=SALTWAKE_DEV.game,TG=window.saltwakeTelegraphs,dt=1/60;c.loaded=!!TG&&typeof instinctWindup==='function';
const backup=JSON.stringify(G.save),notify=G.notify;G.notify=()=>{};const errs=[];let spot=null;
const setup=()=>{if(G.raid)G.endRaid(true,'x');G.close();G.setArea('hub',33.5,27.6);G.mode='play';G.save.completedRaids=3;G.beginRaid();G.close();G.mode='play';
 for(const e of G.raid.enemies){e.x=e.y=-99999;e.homeX=e.homeY=-99999}const p=G.player;p.hp=100;p.iframes=0;p.roll=0;
 if(!spot){for(let r=0;r<2400&&!spot;r+=48)for(let k=0;k<12&&!spot;k++){const x=p.x+Math.cos(k/12*6.283)*r,y=p.y+Math.sin(k/12*6.283)*r;let ok=true;for(let dx=-200;dx<=260&&ok;dx+=16)for(const dy of [-160,-80,0,80,160])if(!G.walkable(x+dx,y+dy))ok=false;if(ok)spot={x,y}}}
 p.x=spot.x;p.y=spot.y};
const mon=(type,dx,dy=0)=>{let e=G.raid.enemies.find(x=>x.type===type);if(!e){e=G.raid.enemies.find(x=>x.type!=='tidemaw');e=Object.assign({},e,{id:'qa_'+type,type,parts:[]});G.raid.enemies.push(e)}
 e.x=e.homeX=G.player.x+dx;e.y=e.homeY=G.player.y+dy;e.dead=false;e.hp=e.maxHp;e.attackCD=0;e.staggerTime=0;e.swTele=null;e.swDash=null;e.swLeap=null;e.instinctAttack=null;e.weakened=false;return e};
const W=(e,range=46)=>window.instinctWindup(G,e,{kind:'player',x:G.player.x,y:G.player.y},range,dt);
const until=(f,max=2)=>{for(let t=0;t<max;t+=dt){if(f())return true}return false};
try{
 setup();
 // bite: readable wind-up, lands when you stay in the wedge
 let e=mon('brineback',40),p=G.player;W(e);c.biteWindup=e.swTele?.m.id==='bite'&&e.instinctAttack.total>=.5;
 let hp=p.hp;until(()=>{W(e);return !e.swTele});c.biteHits=p.hp<hp;
 // whiff: step out of the wedge after it locks
 e=mon('brineback',40);W(e);until(()=>{W(e);return e.swTele?.locked});p.x+=90;hp=p.hp;const wh=TG.stats.whiffs;until(()=>{W(e);return !e.swTele});
 c.biteWhiffs=p.hp===hp&&TG.stats.whiffs===wh+1;p.x-=90;
 // rolling i-frames still protect
 e=mon('brineback',40);W(e);until(()=>{W(e);return e.instinctAttack.left<.05});p.iframes=.3;hp=p.hp;until(()=>{W(e);return !e.swTele});c.iframesProtect=p.hp===hp;p.iframes=0;
 // tusk charge: lane wind-up then a dash down it
 setup();p=G.player;e=mon('brineback',150);W(e,46);c.chargeChosen=e.swTele?.m.id==='charge'&&e.swTele.m.kind==='lane';
 until(()=>{W(e,46);return !!e.swDash});c.chargeDashes=!!e.swDash;hp=p.hp;until(()=>{G.update(dt);return !e.swDash},1);c.chargeHits=p.hp<hp;
 // wall stun: a charge that runs into a wall stuns the brineback
 setup();p=G.player;let wall=null;for(let k=0;k<16&&!wall;k++){const a=k/16*6.283;for(let d=40;d<900;d+=8){const x=p.x+Math.cos(a)*d,y=p.y+Math.sin(a)*d;if(!G.walkable(x,y)){wall={a,d};break}}}
 if(wall){e=mon('brineback',Math.cos(wall.a)*(wall.d-70),Math.sin(wall.a)*(wall.d-70));p.x-=Math.cos(wall.a)*300;p.y-=Math.sin(wall.a)*300;const ws=TG.stats.wallStuns;
  e.swDash={a:wall.a,t:.4,speed:560,m:TG.MOVES.brineback[0],hitDone:false,sx:e.x,sy:e.y};e.instinctAttack={id:'player',left:99,total:99,moving:true};until(()=>{G.update(dt);return !e.swDash},.6);
  c.wallStun=TG.stats.wallStuns===ws+1&&e.staggerTime>0}else c.wallStun=false;
 // widow pounce: leaps to where you stood; moving away makes it miss
 setup();p=G.player;e=mon('widow',120);W(e,46);c.pounceChosen=e.swTele?.m.id==='pounce';until(()=>{W(e,46);return e.swTele?.locked});const lx=e.swTele.tx;
 p.y+=130;hp=p.hp;until(()=>{W(e,46);return !!e.swLeap});until(()=>{G.update(dt);return !e.swLeap},1);c.pounceLands=Math.abs(e.x-lx)<30;c.pounceDodged=p.hp===hp;
 // gull spit: aim locks, the shot goes where you were
 setup();p=G.player;e=mon('gull',150);let fired=false;W(e,230);c.spitAim=e.swTele?.m.kind==='aim';until(()=>{W(e,230);return e.swTele?.locked});const ax=e.swTele.tx,ay=e.swTele.ty;
 p.y+=100;until(()=>{fired=W(e,230);return fired});const n=G.raid.bullets.length;G.makeBullet(e,{kind:'player',x:p.x,y:p.y},7,310);const b=G.raid.bullets[n];
 c.spitLocked=fired&&!!b&&Math.abs(Math.atan2(b.vy,b.vx)-Math.atan2(ay-e.y,ax-e.x))<.15;
 // breaker slam: circle in front
 setup();p=G.player;e=mon('brineworn_breaker',50);W(e,46);c.slamCircle=e.swTele?.m.kind==='circle'&&e.swTele.m.wind>=.8;
 // drawing
 const d0=TG.stats.drawn;try{G.render(performance.now())}catch(x){errs.push(String(x))}c.drawn=TG.stats.drawn>d0;
 // the boss keeps its own logic
 const fake={type:'tidemaw',x:p.x+40,y:p.y,attackCD:0,instinctAttack:null};window.instinctWindup(G,fake,{kind:'player',x:p.x,y:p.y},46,dt);c.bossUntouched=!fake.swTele;
 // monsters really wind up and attack through the normal AI
 setup();p=G.player;e=mon('brineback',45);G.initSense&&G.initSense(e);e.provoked=true;e.awareness='alert';e.aggro=5;e.facing=Math.PI;const w0=TG.stats.windups;hp=p.hp;
 until(()=>{G.update(dt);return p.hp<hp},4);c.liveAttack=TG.stats.windups>w0&&p.hp<hp;
}catch(x){errs.push(String(x&&x.stack||x))}
finally{if(G.raid){G.endRaid(true,'x');G.close()}G.save=JSON.parse(backup);G.quest=new G.quest.constructor(G);G.notify=notify;G.store();G.mode='play'}
c.noErrors=errs.length===0;window.__tgAudit={errs,stats:TG.stats};return c}`;
