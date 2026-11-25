// v0.31 systems pass: pack alert, hit-stop, danger cue.
module.exports=`()=>{const c={},G=SALTWAKE_DEV.game,S=window.saltwakeSystems;c.loaded=!!S;
G.setArea('hub',34,36);G.mode='play';G.save.completedRaids=3;G.beginRaid();const r=G.raid,p=G.player;
const live=r.enemies.filter(e=>!e.dead&&!(G.world.content.enemies.find(t=>t.id===e.type)||{}).neutral);
const a=live[0],b=live.find(e=>e!==a)||null;
if(a&&b){const ot=b.type;b.type=a.type;b.x=a.x+60;b.y=a.y;b.aggro=0;const n=S.stats.packAlerts;G.hitMonster(a,5,{},a.x,a.y);c.packAlert=b.aggro>0&&S.stats.packAlerts>n;b.type=ot}else c.packAlert=true;
if(a){const h=S.stats.hitStops;a.hp=Math.max(a.hp,200);G.hitMonster(a,60,{penetration:99},a.x,a.y);c.hitStop=S.stats.hitStops>h&&S.hitStop>0;
 const t0=r.time;G.update(.016);c.hitStopSlowsSim=(r.time-t0)<.016||r.time===t0;S.hitStop=0;
 a.x=p.x+80;a.y=p.y;a.aggro=3;G.update(.3);c.dangerCue=S.danger()&&document.getElementById('tideHud').classList.contains('sw-danger')}
G.endRaid(true,'QA systems');G.update(.3);c.dangerClears=!S.danger();return c}`;
