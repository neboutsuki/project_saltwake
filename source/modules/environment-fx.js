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
if(typeof coastSprite==='function'){const base=coastSprite;
 coastSprite=function(key,x,footY,width,height,mirror=false){
  const foliage=FOLIAGE.test(key);
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
P.render=function(t,...r){const out=render.call(this,t,...r);if(!cfg.grade||this.mode!=='play')return out;
 g.save();g.setTransform(1,0,0,1,0,0);g.globalCompositeOperation='soft-light';g.fillStyle='rgba(70,96,128,.16)';g.fillRect(0,0,VW,VH);
 g.globalCompositeOperation='overlay';const v=g.createLinearGradient(0,0,0,VH);v.addColorStop(0,'rgba(255,214,170,.06)');v.addColorStop(1,'rgba(20,30,45,.10)');g.fillStyle=v;g.fillRect(0,0,VW,VH);g.restore();return out};
const hubStyle=document.createElement('style');document.head.append(hubStyle);const hubGrade=()=>{hubStyle.textContent=cfg.grade?'#reunionHarbor{filter:contrast(1.06) saturate(.93) brightness(.98)}':''};hubGrade();const set0=FX.set;FX.set=p=>{const r=set0(p);hubGrade();return r};
const gp=P.graphicsPanel;P.graphicsPanel=function(...a){const out=gp.apply(this,a);const b=$('panel')?.querySelector('.engineOptions');if(b&&!$('envWind')){
 b.insertAdjacentHTML('beforeend',`<label class="engineCheck"><input id="envWind" type="checkbox" ${cfg.wind?'checked':''}> Wind-swayed vegetation</label><label class="engineCheck"><input id="envShadow" type="checkbox" ${cfg.shadows?'checked':''}> Prop contact shadows</label><label class="engineCheck"><input id="envGrade" type="checkbox" ${cfg.grade?'checked':''}> Cinematic colour grade</label>`);
 $('envWind').onchange=e=>FX.set({wind:e.target.checked});$('envShadow').onchange=e=>FX.set({shadows:e.target.checked});$('envGrade').onchange=e=>FX.set({grade:e.target.checked})}return out};
})();
