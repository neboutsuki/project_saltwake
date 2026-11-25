/* SALTWAKE v0.31 — living environment rendering.
 * Wind sway for vegetation (weather-driven), soft contact shadows for props, and a cinematic colour grade.
 * Presentation only: positions, collisions and sort order are untouched (sway is a skew anchored at the foot).
 * Settings: localStorage saltwake.envfx.v1 {wind, shadows, grade}.
 */
(()=>{'use strict';
const KEY='saltwake.envfx.v1';
let cfg={wind:true,shadows:true,grade:true};try{Object.assign(cfg,JSON.parse(localStorage.getItem(KEY))||{})}catch{}
const stats={swayed:0,shadowed:0};
const FX=window.saltwakeEnvFx={stats,get settings(){return {...cfg}},set(p){Object.assign(cfg,p);try{localStorage.setItem(KEY,JSON.stringify(cfg))}catch{}return {...cfg}}};
const FOLIAGE=/foliage\/|vegetation\/|ashen25d\/|grass|reed|scrub|flowers|bracken|brush|sapling|pine|tree|fern|weed/;
const NO_SHADOW=/foliage|vegetation|ashen25d|grass|reed|scrub|flowers|bracken|brush|actors\/|doorway|awning|rope-net|smoke|banner|sign|shore-debris|forest-debris|lantern/;
function wind(){const G=window.SALTWAKE_DEV?.game;let w='calm';try{w=G?.climateState?.().weather.id||'calm'}catch{}return w==='squall'?2.3:w==='rain'?1.5:w==='fog'?.6:1}
function swayAngle(key,x,h){const t=performance.now()/1000,str=wind();const tall=h>90;const amp=(tall?.018:.06)*str;const freq=tall?.9:1.7;
 return (Math.sin(t*freq+x*.021)+.35*Math.sin(t*freq*2.3+x*.047))*amp}
function contact(x,footY,w){const r=Math.max(8,w*.42);g.save();g.translate(x,footY-1);g.scale(1,.28);const gr=g.createRadialGradient(0,0,0,0,0,r);gr.addColorStop(0,'rgba(10,9,8,.34)');gr.addColorStop(.6,'rgba(10,9,8,.14)');gr.addColorStop(1,'rgba(10,9,8,0)');g.fillStyle=gr;g.beginPath();g.arc(0,0,r,0,Math.PI*2);g.fill();g.restore();stats.shadowed++}
// coastSprite(key,x,footY,width,height,mirror) is the shared sprite entry point of the coast renderer.
// Projected silhouette shadows: each tall sprite casts its real outline away from a low sun (upper-left).
const sil=new Map();
function silhouette(im){let c=sil.get(im);if(c)return c;c=document.createElement('canvas');c.width=im.width;c.height=im.height;const x=c.getContext('2d');x.drawImage(im,0,0);x.globalCompositeOperation='source-in';x.fillStyle='#0b0a0c';x.fillRect(0,0,c.width,c.height);sil.set(im,c);return c}
const CAST=/foliage\/|ashen25d\/|vegetation\/(tall|short)-pine|coastal-pine|blossom-tree|props\/(lantern|banner|cargo-hoist|warning-bell|brazier|iron-bollard|anchor-sign|barrels|crates|bench|worktable|rope-cargo|small-cargo|noticeboard)|buildings\//;
function cast(key,x,footY,w,h){if(!cfg.shadows||!CAST.test(key)||h<30)return;const im=SPRITES.image(key);if(!im||!im.width)return;const sc=Math.min(w/im.width,h/im.height),dw=im.width*sc,dh=im.height*sc;
 g.save();g.globalAlpha=h>120?.26:.3;g.translate(x,footY-2);g.transform(1,0,-.62,.42,0,0);g.drawImage(silhouette(im),-dw/2,-dh,dw,dh);g.restore();stats.cast=(stats.cast||0)+1}
if(typeof coastSprite==='function'){const base=coastSprite;
 coastSprite=function(key,x,footY,width,height,mirror=false){
  const foliage=FOLIAGE.test(key);cast(key,x,footY,width,height);
  if(cfg.shadows&&!foliage&&!NO_SHADOW.test(key)&&key.startsWith('coast/props/'))contact(x,footY,width);
  if(!cfg.wind||!foliage)return base.call(this,key,x,footY,width,height,mirror);
  const a=swayAngle(key,x,height);g.save();g.translate(x,footY);g.transform(1,0,-a,1,0,0);g.translate(-x,-footY);
  try{stats.swayed++;return base.call(this,key,x,footY,width,height,mirror)}finally{g.restore()}};}
// SPRITES.draw(ctx,key,x,y,w,h) is used by painted/2.5D scene decor (top-left anchored).
if(typeof SPRITES!=='undefined'){const sd=SPRITES.draw.bind(SPRITES);
 SPRITES.draw=function(ctx,key,x,y,w,h){if(!cfg.wind||ctx!==g||!FOLIAGE.test(key))return sd(ctx,key,x,y,w,h);
  const fx=x+w/2,fy=y+h,a=swayAngle(key,fx,h);ctx.save();ctx.translate(fx,fy);ctx.transform(1,0,-a,1,0,0);ctx.translate(-fx,-fy);try{stats.swayed++;return sd(ctx,key,x,y,w,h)}finally{ctx.restore()}};}
// Colour grade: cool shadows / warm light, applied once per frame in screen space after the scene.
const P=Game.prototype,render=P.render;
// Ashen Wilds grade: drained colour, warm ash-grey haze, darker horizon toward the sea (bottom), cool shadows.
P.render=function(t,...r){const out=render.call(this,t,...r);if(!cfg.grade||this.mode!=='play'||FX.gpuGrade)return out;
 g.save();g.setTransform(1,0,0,1,0,0);
 g.globalCompositeOperation='saturation';g.fillStyle='rgba(128,128,128,.24)';g.fillRect(0,0,VW,VH);
 g.globalCompositeOperation='soft-light';g.fillStyle='rgba(150,128,110,.22)';g.fillRect(0,0,VW,VH);
 g.globalCompositeOperation='source-over';const v=g.createLinearGradient(0,0,0,VH);v.addColorStop(0,'rgba(196,186,170,.07)');v.addColorStop(.55,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(18,22,26,.16)');g.fillStyle=v;g.fillRect(0,0,VW,VH);
 g.restore();return out};
// Brine miasma: a faint green-grey haze pooling at the feet of mutated Brineworn (lore: brine-tainted former humans).
const de=P.draw25Enemy;P.draw25Enemy=function(e,...a){if(cfg.grade&&e&&!e.dead&&/brineworn|brineback/.test(e.type||'')){const t=performance.now()/1000;g.save();g.translate(e.x,e.y+6);g.scale(1,.4);const r=34+Math.sin(t*1.7+e.x)*4;const gr=g.createRadialGradient(0,0,0,0,0,r);gr.addColorStop(0,'rgba(110,170,135,.22)');gr.addColorStop(1,'rgba(110,170,135,0)');g.fillStyle=gr;g.beginPath();g.arc(0,0,r,0,Math.PI*2);g.fill();g.restore()}return de.call(this,e,...a)};
// Ashfall: screen-space overlay above both the field canvas and the harbor frame (below HUD). Parallax follows the field camera.
const ash=document.createElement('canvas');ash.id='swAsh';ash.width=VW;ash.height=VH;ash.setAttribute('aria-hidden','true');
const ashStyle=document.createElement('style');ashStyle.textContent='#swAsh{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:1}';document.head.append(ashStyle);
document.getElementById('viewport')?.prepend(ash);document.getElementById('world')?.after(ash);
const actx=ash.getContext('2d');const flakes=[];let seed=7;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
for(let i=0;i<140;i++)flakes.push({x:rnd()*VW,y:rnd()*VH,z:.35+rnd()*.9,s:1.2+rnd()*2.2,ph:rnd()*6.28,ember:rnd()<.06});
let lastT=0,lastCam=null;stats.ashFrames=0;
function ashLoop(t){requestAnimationFrame(ashLoop);const G=window.SALTWAKE_DEV?.game;const on=cfg.ash!==false&&cfg.grade&&G&&G.mode==='play'&&!G.panel&&!document.hidden;
 if(!on){if(lastT){actx.clearRect(0,0,VW,VH);lastT=0}return}
 const dt=lastT?Math.min(.05,(t-lastT)/1000):0;lastT=t;const w=wind();let cx=0,cy=0;
 if(G.raid&&G.camera){if(lastCam){cx=(G.camera.x-lastCam.x)*(G.camera.zoom||1);cy=(G.camera.y-lastCam.y)*(G.camera.zoom||1)}lastCam={x:G.camera.x,y:G.camera.y}}else lastCam=null;
 actx.clearRect(0,0,VW,VH);
 for(const f of flakes){f.ph+=dt*1.3;f.x+=(14*w+Math.sin(f.ph)*9)*f.z*dt-cx*f.z;f.y+=(16+8*f.z)*f.z*dt-cy*f.z;
  if(f.y>VH+4){f.y=-4;f.x=rnd()*VW}if(f.y<-6)f.y=VH+4;if(f.x>VW+4)f.x=-4;if(f.x<-6)f.x=VW+4;
  if(f.ember){const a=.35+.3*Math.sin(f.ph*2.3);actx.fillStyle=`rgba(232,120,70,${a*f.z})`;actx.fillRect(f.x,f.y,f.s*1.1,f.s*1.1)}
  else{actx.fillStyle=`rgba(222,216,206,${.30+.4*f.z})`;actx.fillRect(f.x,f.y,f.s*f.z*1.5,f.s*f.z*1.2)}}
 stats.ashFrames++}
requestAnimationFrame(ashLoop);
const hubStyle=document.createElement('style');document.head.append(hubStyle);const hubGrade=()=>{hubStyle.textContent=cfg.grade?'#reunionHarbor{filter:saturate(.78) sepia(.1) contrast(1.06) brightness(.97)}':''};hubGrade();const set0=FX.set;FX.set=p=>{const r=set0(p);hubGrade();return r};
const gp=P.graphicsPanel;P.graphicsPanel=function(...a){const out=gp.apply(this,a);const b=$('panel')?.querySelector('.engineOptions');if(b&&!$('envWind')){
 b.insertAdjacentHTML('beforeend',`<label class="engineCheck"><input id="envWind" type="checkbox" ${cfg.wind?'checked':''}> Wind-swayed vegetation</label><label class="engineCheck"><input id="envShadow" type="checkbox" ${cfg.shadows?'checked':''}> Prop contact shadows</label><label class="engineCheck"><input id="envGrade" type="checkbox" ${cfg.grade?'checked':''}> Ashen colour grade</label><label class="engineCheck"><input id="envAsh" type="checkbox" ${cfg.ash!==false?'checked':''}> Falling ash</label>`);
 $('envWind').onchange=e=>FX.set({wind:e.target.checked});$('envShadow').onchange=e=>FX.set({shadows:e.target.checked});$('envGrade').onchange=e=>FX.set({grade:e.target.checked});$('envAsh').onchange=e=>FX.set({ash:e.target.checked})}return out};
})();
