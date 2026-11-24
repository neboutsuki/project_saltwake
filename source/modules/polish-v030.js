/* SALTWAKE v0.30.0 — The Unseen War: combat readability, actor robustness and render performance.
 * Presentation + safety layer over the native actor engine. No new actors, loot, damage or save schema.
 * Settings live in their own localStorage key so the player save (saltwake.player.v04) is untouched.
 */
(()=>{'use strict';
const P=Game.prototype,KEY='saltwake.polish.v1';
const defaults={telegraphs:true,damageDir:true,lowHealth:true,lightRes:'full'};
const normalize=o=>({telegraphs:o?.telegraphs!==false,damageDir:o?.damageDir!==false,lowHealth:o?.lowHealth!==false,lightRes:o?.lightRes==='half'?'half':'full'});
let settings={...defaults};try{settings=normalize(JSON.parse(localStorage.getItem(KEY)))}catch{}
const stats={telegraphsDrawn:0,hits:0,unstuck:0,collisionRestores:0,lightRes:settings.lightRes};
const S=window.saltwakePolish={revision:'0.30.0',stats,get settings(){return {...settings}},normalize};
S.change=patch=>{settings=normalize({...settings,...patch});try{localStorage.setItem(KEY,JSON.stringify(settings))}catch{}applyLightRes();return {...settings}};
const hostileToPlayer=(G,e)=>!!(G.hostility?.(G.actorFaction(e),'player')||e.provoked);
const targetOf=(G,e)=>{const w=e.instinctAttack;if(!w)return null;if(w.id==='player')return G.player;return G.raid?.enemies.find(a=>a.id===w.id&&!a.dead)||null};

/* 1. Ground strike telegraphs. The existing timer ring above the head is kept; this adds a readable
 * wedge on the ground toward the actual target, so the player can read direction and dodge timing. */
const drawEnemy=P.draw25Enemy;
P.draw25Enemy=function(e){
 if(settings.telegraphs&&this.raid&&e.instinctAttack&&!e.dead){const t=targetOf(this,e);
  if(t&&this.hasSight(this.player.x,this.player.y,e.x,e.y)){const w=e.instinctAttack,prog=clamp(1-w.left/(w.total||.42),0,1),a=Math.atan2(t.y-e.y,t.x-e.x),len=clamp(distance(e.x,e.y,t.x,t.y)+14,34,78),spread=.42,late=prog>.72;
   g.save();g.translate(e.x,e.y+4);g.scale(1,.62);
   g.fillStyle=late?`rgba(226,86,62,${.16+.22*prog})`:`rgba(233,173,100,${.08+.16*prog})`;
   g.beginPath();g.moveTo(0,0);g.arc(0,0,len,a-spread,a+spread);g.closePath();g.fill();
   g.fillStyle=late?'rgba(255,120,90,.38)':'rgba(255,214,150,.26)';g.beginPath();g.moveTo(0,0);g.arc(0,0,len*prog,a-spread,a+spread);g.closePath();g.fill();
   g.strokeStyle=late?'rgba(255,140,105,.75)':'rgba(240,196,128,.5)';g.lineWidth=1.4;g.beginPath();g.arc(0,0,len,a-spread,a+spread);g.stroke();
   g.restore();stats.telegraphsDrawn++;}}
 return drawEnemy.call(this,e);
};

/* 2. Damage direction + low-health feedback (screen space, drawn after the native frame). */
const indicators=[];
const hurt=P.hurtPlayer;
P.hurtPlayer=function(...args){const r=this.raid,p=this.player,before=p.hp;const out=hurt.apply(this,args);
 if(r&&p.hp<before){stats.hits++;let src=null,best=70;
  for(const b of r.bullets||[]){if(!b.enemy)continue;const d=distance(b.x,b.y,p.x,p.y);if(d<best){best=d;src={x:b.x-(b.vx||0)*.05,y:b.y-(b.vy||0)*.05}}}
  if(!src){best=180;for(const e of r.enemies){if(e.dead||!hostileToPlayer(this,e))continue;const d=distance(e.x,e.y,p.x,p.y);if(d<best){best=d;src=e}}}
  if(src){indicators.push({a:Math.atan2(src.y-p.y,src.x-p.x),t:1,dmg:before-p.hp});if(indicators.length>6)indicators.shift()}}
 return out};
S.indicators=indicators;
let lastRender=0;
const render=P.render;
P.render=function(t,...rest){const out=render.call(this,t,...rest);const dt=lastRender?Math.min(.1,(t-lastRender)/1000):0;lastRender=t;
 if(this.mode!=='play'||!this.raid){indicators.length=0;return out}
 const p=this.player,z=this.camera.zoom,px=(p.x-this.camera.x)*z,py=(p.y-12-this.camera.y)*z;
 g.save();g.setTransform(1,0,0,1,0,0);
 if(settings.lowHealth&&p.hp>0&&p.hp<30){const k=(30-p.hp)/30,pulse=.55+.45*Math.sin((t||0)*.006);const v=g.createRadialGradient(VW/2,VH/2,VH*.32,VW/2,VH/2,VW*.62);v.addColorStop(0,'rgba(120,20,16,0)');v.addColorStop(1,`rgba(120,20,16,${(.18+.22*k)*pulse})`);g.fillStyle=v;g.fillRect(0,0,VW,VH)}
 if(settings.damageDir){for(let i=indicators.length-1;i>=0;i--){const d=indicators[i];d.t-=dt*.9;if(d.t<=0){indicators.splice(i,1);continue}
  const r=58,w=.34;g.strokeStyle=`rgba(236,92,70,${.85*d.t})`;g.lineWidth=5+Math.min(6,d.dmg*.25);g.lineCap='round';g.beginPath();g.arc(px,py,r,d.a-w,d.a+w);g.stroke();
  g.fillStyle=`rgba(255,150,120,${.9*d.t})`;g.beginPath();const tx=px+Math.cos(d.a)*(r+11),ty=py+Math.sin(d.a)*(r+11);g.moveTo(tx,ty);g.lineTo(px+Math.cos(d.a-.12)*(r+2),py+Math.sin(d.a-.12)*(r+2));g.lineTo(px+Math.cos(d.a+.12)*(r+2),py+Math.sin(d.a+.12)*(r+2));g.closePath();g.fill()}}
 g.restore();return out};

/* 3. Actor robustness: collision guard + stuck recovery on top of the native field pathing.
 * Keeps last valid position per actor; an actor pushed into a solid tile is restored. A pursuing
 * actor that has not moved for ~3s drops its cached route so the native planner repaths. */
const track=new WeakMap();
const upd=P.updateEnemies;
P.updateEnemies=function(dt){const r=this.raid;const out=upd.call(this,dt);if(!r||this.raid!==r)return out;
 for(const e of r.enemies){if(e.dead||e.warDeparted)continue;let s=track.get(e);
  if(!s){s={x:e.x,y:e.y,sx:e.x,sy:e.y,at:r.time,still:0};track.set(e,s)}
  if(this.walkable(e.x,e.y))
   {s.x=e.x;s.y=e.y}
  else if(this.walkable(s.x,s.y)&&!e.flying&&e.type!=='gull'){e.x=s.x;e.y=s.y;stats.collisionRestores++;const f=typeof fieldStates!=='undefined'&&fieldStates.get(e);if(f){f.path=null;f.nextPath=0}}
  if(r.time-s.at>=1){const moved=distance(e.x,e.y,s.sx,s.sy),chasing=e.awareness==='alert'||e.awareness==='searching'||e.awareness==='investigating';
   s.still=moved<4&&chasing&&!e.instinctAttack&&distance(e.x,e.y,this.player.x,this.player.y)>70?s.still+1:0;
   if(s.still>=3){s.still=0;const f=typeof fieldStates!=='undefined'&&fieldStates.get(e);if(f){f.path=null;f.nextPath=0}if(e.war){e.war.goal=null}stats.unstuck++}
   s.sx=e.x;s.sy=e.y;s.at=r.time}}
 return out};

/* 4. Optional half-resolution lighting layer (soft gradients; ~4x fewer composited pixels). */
const nativeSet=CanvasRenderingContext2D.prototype.setTransform,nativeDraw=CanvasRenderingContext2D.prototype.drawImage;
function applyLightRes(){if(typeof NIGHT_LAYER==='undefined')return;const half=settings.lightRes==='half',w=half?VW/2:VW,h=half?VH/2:VH;stats.lightRes=settings.lightRes;
 if(NIGHT_LAYER.width!==w){NIGHT_LAYER.width=w;NIGHT_LAYER.height=h}
 if(half){NG.setTransform=function(a,b,c,d,e,f){if(typeof a==='object')return nativeSet.call(this,a);return nativeSet.call(this,a*.5,b*.5,c*.5,d*.5,e*.5,f*.5)};
  g.drawImage=function(im,...a){if(im===NIGHT_LAYER&&a.length===2)return nativeDraw.call(this,im,a[0],a[1],VW,VH);return nativeDraw.call(this,im,...a)};nativeSet.call(NG,.5,0,0,.5,0,0)}
 else{delete NG.setTransform;delete g.drawImage;nativeSet.call(NG,1,0,0,1,0,0)}}
applyLightRes();

/* 5. Benchmark: deterministic CPU timing of simulation + full render, used by QA. */
S.benchmark=function(frames=300){const G=SALTWAKE_DEV.game;if(!G.raid)return null;const up=[],rd=[];for(let i=0;i<frames;i++){let a=performance.now();G.raid.time+=1/60;G.update(1/60);let b=performance.now();G.render(performance.now());up.push(b-a);rd.push(performance.now()-b)}
 const st=a=>{a.sort((x,y)=>x-y);return {mean:+(a.reduce((s,v)=>s+v,0)/a.length).toFixed(2),p95:+a[Math.floor(a.length*.95)].toFixed(2)}};return {frames,actors:G.raid.enemies.length,update:st(up),render:st(rd)}};

/* 6. Settings UI, appended to the existing Graphics & Performance panel. */
const gp=P.graphicsPanel;
P.graphicsPanel=function(...a){const out=gp.apply(this,a);const body=$('panel')?.querySelector('.engineOptions');if(!body)return out;
 body.insertAdjacentHTML('beforeend',`<label>Lighting resolution<select id="polishLight"><option value="full" ${settings.lightRes==='full'?'selected':''}>Full · original</option><option value="half" ${settings.lightRes==='half'?'selected':''}>Half · faster on integrated GPUs</option></select></label><label class="engineCheck"><input id="polishTele" type="checkbox" ${settings.telegraphs?'checked':''}> Ground strike telegraphs</label><label class="engineCheck"><input id="polishDir" type="checkbox" ${settings.damageDir?'checked':''}> Damage direction indicator</label><label class="engineCheck"><input id="polishLow" type="checkbox" ${settings.lowHealth?'checked':''}> Low-health vignette</label>`);
 $('polishLight').onchange=e=>S.change({lightRes:e.target.value});$('polishTele').onchange=e=>S.change({telegraphs:e.target.checked});$('polishDir').onchange=e=>S.change({damageDir:e.target.checked});$('polishLow').onchange=e=>S.change({lowHealth:e.target.checked});return out};
const act=P.doAction;P.doAction=function(a,n){const out=act.call(this,a,n);
 if(a==='engine_reset')S.change(defaults);
 if(a==='alpha_fieldnotes')$('panel')?.querySelector('.alpha-report')?.insertAdjacentHTML('beforeend','<h3>Reading an attack</h3><p>When a hostile winds up, a wedge on the ground shows where the blow will land; it turns red just before the strike. Roll out of the wedge rather than away from the attacker. A red arc around you points toward whatever just hurt you.</p>');
 return out};
})();
