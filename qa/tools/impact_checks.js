// Impact pass: left/right facing with mirrored part hitboxes, shot feedback, hit flash/knockback/splats, kills + corpses.
module.exports=`()=>{const c={},G=SALTWAKE_DEV.game,IM=window.saltwakeImpact,dt=1/60;c.loaded=!!IM;
const backup=JSON.stringify(G.save),notify=G.notify;G.notify=()=>{};const errs=[];
try{if(G.raid)G.endRaid(true,'x');G.close();G.setArea('hub',33.5,27.6);G.mode='play';G.save.completedRaids=3;G.beginRaid();G.close();G.mode='play';
 const p=G.player;for(const e of G.raid.enemies){e.x=e.y=-99999;e.homeX=e.homeY=-99999}
 let spot=null;for(let r=0;r<2400&&!spot;r+=48)for(let k=0;k<12&&!spot;k++){const x=p.x+Math.cos(k/12*6.283)*r,y=p.y+Math.sin(k/12*6.283)*r;let ok=true;for(let dx=-60;dx<=340&&ok;dx+=16)for(const dy of [-40,0,40])if(!G.walkable(x+dx,y+dy))ok=false;if(ok)spot={x,y}}
 p.x=spot.x;p.y=spot.y;
 // facing: a brineback facing left mirrors its tusk hitbox
 const e=G.raid.enemies.find(x=>x.type==='brineback');e.x=p.x+120;e.y=p.y;e.dead=false;e.hp=e.maxHp=500;e.attackCD=99;
 e.facing=0;e.swSide=undefined;IM.syncParts(e);const tR=e.parts.find(x=>x.id==='tusk').dx;e.facing=Math.PI;IM.syncParts(e);const tL=e.parts.find(x=>x.id==='tusk').dx;
 c.partsMirror=tR>0&&tL<0&&IM.sideOf(e)===-1;
 // a hit flashes, knocks back, splats, marks the crosshair
 const x0=e.x,s0=IM.stats.splats;G.hitMonster(e,40,{vx:900,vy:0,fam:'arbalest',weaponId:'arbalest_I1',penetration:15},e.x,e.y);
 c.hitFeedback=e.swFlash>performance.now()&&e.x>x0&&IM.stats.splats>s0&&!!IM.marker&&!IM.marker.kill;
 // a kill leaves a corpse and a red marker
 const k0=IM.stats.corpses;e.hp=5;G.hitMonster(e,400,{vx:900,vy:0,fam:'arbalest',penetration:15},e.x,e.y);c.killCorpse=e.dead&&IM.stats.corpses===k0+1&&IM.marker.kill;
 // firing kicks the camera and blooms the spread; bloom recovers
 const A=G.ensureArmory();A.owned.arbalest_I1=1;A.equipped[0]='arbalest_I1';p.roll=0;p.weapon=0;p.mag[0]=1;p.cooldown=0;p.reload=0;const sp0=G.environmentSpread();const f0=IM.stats.fired;G.mouse.down=false;G.shoot();G.update(dt);
 c.firedFeedback=IM.stats.fired===f0+1&&IM.bloom>0&&G.environmentSpread()>sp0;for(let i=0;i<90;i++)G.update(dt);c.bloomRecovers=IM.bloom===0;
 // drawing with corpses, decals and a flipped monster
 try{G.render(performance.now());G.drawCoastScene&&0}catch(x){errs.push(String(x))}
 const live=G.raid.enemies.find(x=>x.type==='widow');if(live){live.x=p.x+80;live.y=p.y;live.dead=false;live.hp=live.maxHp;live.swFlash=performance.now()+80;try{G.render(performance.now())}catch(x){errs.push(String(x))}}
 c.renders=errs.length===0;
 G.endRaid(true,'QA');G.close();c.cleared=IM.decals.length===0||(G.update(dt),IM.decals.length===0);
}catch(x){errs.push(String(x&&x.stack||x))}
finally{if(G.raid){G.endRaid(true,'x');G.close()}G.save=JSON.parse(backup);G.quest=new G.quest.constructor(G);G.notify=notify;G.store();G.mode='play'}
c.noErrors=errs.length===0;window.__imAudit={errs,stats:IM.stats};return c}`;
