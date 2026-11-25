// Character sprites: Ren Kagari as the player (field + harbor), story cast registered.
module.exports=`async ()=>{const c={},G=SALTWAKE_DEV.game,C=window.saltwakeCast;c.loaded=!!C&&C.enabled;
for(let i=0;i<40&&!C.ready();i++)await new Promise(r=>setTimeout(r,50));c.renReady=C.ready();
c.dirFromAim=C.dirOfAngle(0)==='right'&&C.dirOfAngle(Math.PI/2)==='down'&&C.dirOfAngle(Math.PI)==='left'&&C.dirOfAngle(-Math.PI/2)==='up';
G.close();G.setArea('hub',34,36);G.mode='play';G.save.completedRaids=3;G.beginRaid();const n0=C.stats.player;G.render(performance.now());c.fieldPlayerSprite=C.stats.player>n0;
const cv=document.createElement('canvas');cv.width=cv.height=96;const x=cv.getContext('2d');c.weaponArt=['art/weapons/arbalest','art/weapons/wickcaster','art/weapons/spear','ui/weapon_arbalest','art/icons/weapon_arbalest'].every(k=>!!SALTWAKE_ASSETS.images[k])&&!String(SALTWAKE_ASSETS.images['ui/weapon_arbalest']).includes('svg');c.castDraws=['captain_elda','master_rook','tess'].every(w=>C.draw(x,w,'idle','down',0,48,90,64));
G.endRaid(true,'QA cast');return c}`;
