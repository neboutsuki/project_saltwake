module.exports=`()=>{const G=SALTWAKE_DEV.game,S=window.saltwakePolish,A=saltwakeAlpha;const c={};
c.loaded=S?.revision==='0.30.0';c.title=!!window.SALTWAKE_BUILD&&document.title.includes(SALTWAKE_BUILD.label);
G.close?.();G.setArea('hub',34,36);G.mode='play';G.save.completedRaids=3;G.beginRaid();const r=G.raid;c.raid=!!r;
const pts=r.war.points;const q=pts.find(p=>G.walkable(p.x+40,p.y)&&G.hasSight(p.x,p.y,p.x+40,p.y));
G.player.x=q.x+40;G.player.y=q.y;const m=A.makeAltered(G,'brineworn_drifter',q.x,q.y,'qa-tele');r.enemies=[m];G.initSense?.(m);
m.awareness='alert';m.instinctAttack={id:'player',left:.2,total:.4};const before=S.stats.telegraphsDrawn;G.render(performance.now());c.telegraph=S.stats.telegraphsDrawn>before;
S.change({telegraphs:false});const b2=S.stats.telegraphsDrawn;G.render(performance.now());c.telegraphToggle=S.stats.telegraphsDrawn===b2;S.change({telegraphs:true});
G.player.iframes=0;const hp=G.player.hp,hits=S.stats.hits;G.hurtPlayer(10,0);c.damage=G.player.hp<hp;c.indicator=S.stats.hits===hits+1&&S.indicators.length>0&&Math.abs(S.indicators.at(-1).a-Math.PI)<.6;
G.player.hp=20;G.render(performance.now());G.player.hp=100;
// collision guard: teleport actor into a solid tile, it must be restored to its last valid tile
let solid=null;for(let dx=-400;dx<=400&&!solid;dx+=8)for(let dy=-400;dy<=400;dy+=8){if(!G.walkable(m.x+dx,m.y+dy)&&!G.isWater(m.x+dx,m.y+dy)){solid={x:m.x+dx,y:m.y+dy};break}}
m.instinctAttack=null;G.updateEnemies(.016);const vx=m.x,vy=m.y;const cr=S.stats.collisionRestores;m.x=solid.x;m.y=solid.y;G.updateEnemies(.016);c.collisionGuard=S.stats.collisionRestores===cr+1&&G.walkable(m.x,m.y);
// stuck recovery: freeze movement while alert and far, the route must be dropped
const us=S.stats.unstuck;G.player.x=m.x+300;G.player.y=m.y;const ox=m.x,oy=m.y;m.awareness='alert';for(let i=0;i<5;i++){r.time+=1.05;m.x=ox;m.y=oy;m.attackCD=9;G.updateEnemies(.001)}c.unstuck=S.stats.unstuck>us;
S.change({lightRes:'half'});c.halfLayer=NIGHT_LAYER.width===VW/2;let ok=true;try{G.render(performance.now())}catch(e){ok=false}c.halfRender=ok;S.change({lightRes:'full'});c.fullLayer=NIGHT_LAYER.width===VW&&!Object.prototype.hasOwnProperty.call(g,'drawImage');
c.settingsPersist=JSON.parse(localStorage.getItem('saltwake.polish.v1')).lightRes==='full';
G.graphicsPanel();c.settingsUI=!!document.getElementById('polishLight')&&!!document.getElementById('polishTele');G.close();
const bm=S.benchmark(60);c.benchmark=!!bm&&bm.frames===60;
const inv=JSON.stringify(G.save.inventory||G.save.bag||null);G.endRaid(true,'QA v030');c.extract=!G.raid&&G.mapId==='hub';c.noSaveSchemaChange=!('polish' in G.save);G.close();return c}`;
