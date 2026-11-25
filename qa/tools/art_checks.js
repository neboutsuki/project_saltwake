// Art hookup: item icons, projectile sprites, hit-effect sprites, wading splashes, cut puddle decals.
module.exports=`async ()=>{const c={},G=SALTWAKE_DEV.game,A=window.saltwakeArt,I=SALTWAKE_ASSETS.images;c.loaded=!!A;
c.iconExact=/swArtIcon/.test(inventoryArt('bandage'))&&inventoryArt('bandage').includes(I['art/icons/bandage'].slice(0,40));
c.iconStandIn=/swArtIcon/.test(inventoryArt('brineback_plate'));
c.iconFallback=!/swArtIcon/.test(inventoryArt('pilot_ledger'));
c.vfxInBuild=['hit_spark','part_break_burst','smoke_puff','splash','proj_bolt','proj_wick_flame'].every(n=>!!I['art/vfx/'+n]);
c.puddlesFromArt=['decals/puddle_1','decals/puddle_2','decals/puddle_3'].every(k=>!!I[k]);
for(let i=0;i<40&&!A.ready();i++)await new Promise(r=>setTimeout(r,50));c.spritesDecode=A.ready();
G.close();G.setArea('hub',34,36);G.mode='play';G.save.completedRaids=3;G.beginRaid();const r=G.raid,p=G.player,H=saltwakeHunt;
const s0={...A.stats};r.bullets.push({x:p.x+30,y:p.y-8,vx:900,vy:0,t:1,damage:0,enemy:false});H.fx(r).events.push({x:p.x+40,y:p.y,kind:'break',amount:5,part:'x',life:.4,max:.58});
G.render(performance.now());c.projectileSprite=A.stats.projectiles>s0.projectiles;c.effectSprite=A.stats.effects>s0.effects;
c.bulletsRestored=r.bullets.length>=1&&r.bullets[0]._art==='proj_bolt';c.eventsRestored=H.fx(r).events.some(e=>e.kind==='break');
r.bullets.length=0;const w=G.isWater;G.isWater=()=>true;const sp=A.stats.splashes;for(let i=0;i<4;i++){p.x+=6;G.update(.11)}G.isWater=w;c.wadingSplash=A.stats.splashes>sp;
G.endRaid(true,'QA art');return c}`;
