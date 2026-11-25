// Dodge: eased burst, buffer, perfect dodge, cooldown, stamina denial feedback, ghosts.
module.exports=`()=>{const c={},G=SALTWAKE_DEV.game,D=window.saltwakeDodge,p=G.player,dt=1/60;c.loaded=!!D;
if(G.raid)G.endRaid(true,'x');G.close();G.setArea('hub',33.5,27.6);G.mode='play';p.x=36*32;p.y=31*32;p.st=100;p.rollCD=0;p.roll=0;
G.keys.KeyD=true;G.roll();G.update(dt);const x1=p.x;G.update(dt);const early=(p.x-x1)/dt;for(let i=0;i<12;i++)G.update(dt);const x2=p.x;G.update(dt);const late=(p.x-x2)/dt;G.keys.KeyD=false;
c.burstThenEase=early>600&&late<early*.5;c.ghostTrail=D.ghosts.length>0;c.shortCooldown=Math.abs(G.mechanics().rollCooldown-1.05)<1e-9&&p.rollCD<=.75;
for(let i=0;i<30;i++)G.update(dt);p.st=100;p.rollCD=.1;const b=D.stats.buffered;G.roll();for(let i=0;i<12;i++)G.update(dt);c.bufferedDodge=D.stats.buffered>b;
for(let i=0;i<40;i++)G.update(dt);G.close();G.save.completedRaids=3;G.beginRaid();p.st=100;p.rollCD=0;p.roll=0;G.roll();G.update(dt);const hp=p.hp,st=p.st,pf=D.stats.perfect;G.hurtPlayer(25,0);c.perfectDodge=D.stats.perfect>pf&&p.hp===hp&&p.st>st;
for(let i=0;i<60;i++)G.update(dt);p.st=5;p.rollCD=0;const dn=D.stats.denied;G.roll();c.staminaDenied=D.stats.denied>dn&&p.roll<=0;p.st=100;G.endRaid(true,'QA dodge');return c}`;
