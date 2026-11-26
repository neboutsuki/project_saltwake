/* SALTWAKE v0.32 — camera system.
 * Smooth damped follow, aim/movement look-ahead, player-controlled zoom (mouse wheel over the world, or - / =),
 * and trauma-based screen shake on damage. Plugs into the native render through Game.prototype.cameraFrame;
 * map bounds clamping, Longwatch aiming offset and locked per-map base scales are preserved.
 * Settings: localStorage saltwake.camera.v1 {smooth, lookahead, shake, zoom}.
 */
(()=>{'use strict';
const P=Game.prototype,KEY='saltwake.camera.v1';
const ZMIN=.8,ZMAX=1.45;
let cfg={smooth:true,lookahead:true,shake:true,zoom:1};try{Object.assign(cfg,JSON.parse(localStorage.getItem(KEY))||{})}catch{}
cfg.zoom=Math.min(ZMAX,Math.max(ZMIN,+cfg.zoom||1));
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(cfg))}catch{}};
const st={x:null,y:null,lx:0,ly:0,trauma:0,t:0,map:null,px:0,py:0};
const CAM=window.saltwakeCamera={state:st,get settings(){return {...cfg}},set(p){Object.assign(cfg,p);cfg.zoom=Math.min(ZMAX,Math.max(ZMIN,+cfg.zoom||1));save();applyZoom();return {...cfg}},shake(amount){if(cfg.shake)st.trauma=Math.min(1,st.trauma+amount)}};
const base=P.cameraScaleDefault;
P.cameraScaleDefault=function(...a){return (base?base.apply(this,a):.64)*cfg.zoom};
function applyZoom(){const G=window.SALTWAKE_DEV?.game;if(!G?.camera)return;G.camera.target=G.cameraScaleDefault()}
const noise=(t,s)=>Math.sin(t*37.1+s)*.6+Math.sin(t*61.7+s*2.3)*.4;
P.cameraFrame=function(viewW,viewH){const p=this.player,now=performance.now()/1000,dt=Math.min(.1,st.t?now-st.t:0);st.t=now;
 const lw=this.longwatchView||{x:0,y:0};
 // Look-ahead: mostly toward where you are walking (eased), a little toward the aim; none while standing and aiming
 // close. Longwatch already shifts the view itself.
 let tx=0,ty=0;if(cfg.lookahead&&!this.longwatchView&&this.mode==='play'){const vx=dt?(p.x-st.px)/dt:0,vy=dt?(p.y-st.py)/dt:0,sp=Math.hypot(vx,vy);
  const lead=Math.min(1,sp/170),aim=(this.raid?26:12)*(.35+.65*lead);
  tx=Math.cos(p.angle||0)*aim+Math.max(-70,Math.min(70,vx*.3));ty=Math.sin(p.angle||0)*aim*.75+Math.max(-50,Math.min(50,vy*.3))}
 st.px=p.x;st.py=p.y;
 const k=dt?1-Math.exp(-dt*2.6):1;st.lx+=(tx-st.lx)*k;st.ly+=(ty-st.ly)*k;
 const gx=p.x-viewW/2+lw.x+st.lx,gy=p.y-viewH/2+lw.y+st.ly-6;
 if(!cfg.smooth||st.x===null||st.map!==this.mapId||Math.hypot(gx-st.x,gy-st.y)>600){st.x=gx;st.y=gy;st.vx=st.vy=0;st.map=this.mapId}
 else{ // critically damped spring: smooth start and stop, no overshoot
  const w=7.5,f=1+2*w*dt+.48*w*w*dt*dt+.235*w*w*w*dt*dt*dt,ex=1/f;
  for(const [a,v,g] of [['x','vx',gx],['y','vy',gy]]){const c=st[a]-g,tmp=((st[v]||0)+w*c)*dt;st[v]=((st[v]||0)-w*tmp)*ex;st[a]=g+(c+tmp)*ex}}
 let sx=0,sy=0;if(st.trauma>0){const a=st.trauma*st.trauma*11;sx=noise(now,1)*a;sy=noise(now,7)*a;st.trauma=Math.max(0,st.trauma-dt*1.5)}
 // snap to whole screen pixels so pixel art does not shimmer while the camera glides
 // snap to real device pixels (render scale x zoom), not to 1024x576 pixels: the coarser grid made the ground step
 const z=(this.camera?.zoom||1)*(window.saltwakeHiRes?.enabled!==false?(window.saltwakeHiRes?.scale||1):1),snap=v=>Math.round(v*z)/z;
 return {x:snap(st.x),y:snap(st.y),sx,sy}};
// Snap on map changes / teleports.
const sa=P.setArea;P.setArea=function(...a){const r=sa.apply(this,a);st.x=null;st.lx=st.ly=0;st.trauma=0;return r};
// Screen shake on damage taken.
const hurt=P.hurtPlayer;P.hurtPlayer=function(...a){const hp=this.player.hp,r=hurt.apply(this,a);const d=hp-this.player.hp;if(d>0)CAM.shake(Math.min(.65,.18+d/45));return r};
// Zoom input: wheel over the world canvas (outside menus/aim), and - / = keys.
function zoomBy(f){CAM.set({zoom:cfg.zoom*f})}
const canvas=document.getElementById('world');
canvas?.addEventListener('wheel',e=>{const G=SALTWAKE_DEV.game;if(G.mode!=='play'||G.panel)return;e.preventDefault();zoomBy(e.deltaY<0?1.08:1/1.08)},{passive:false});
addEventListener('keydown',e=>{const G=window.SALTWAKE_DEV?.game;if(!G||G.mode!=='play'||G.panel||/INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName||''))return;
 if(e.key==='-'||e.key==='_'){zoomBy(1/1.1)}else if(e.key==='='||e.key==='+'){zoomBy(1.1)}else if(e.key==='0'&&e.altKey){CAM.set({zoom:1})}});
const gp=P.graphicsPanel;P.graphicsPanel=function(...a){const out=gp.apply(this,a);const b=$('panel')?.querySelector('.engineOptions');if(b&&!$('camSmooth')){
 b.insertAdjacentHTML('beforeend',`<label>Camera zoom <input id="camZoom" type="range" min="${ZMIN}" max="${ZMAX}" step="0.05" value="${cfg.zoom}"></label><label class="engineCheck"><input id="camSmooth" type="checkbox" ${cfg.smooth?'checked':''}> Smooth camera follow</label><label class="engineCheck"><input id="camLook" type="checkbox" ${cfg.lookahead?'checked':''}> Look ahead toward aim</label><label class="engineCheck"><input id="camShake" type="checkbox" ${cfg.shake?'checked':''}> Screen shake on hits</label>`);
 $('camZoom').oninput=e=>CAM.set({zoom:+e.target.value});$('camSmooth').onchange=e=>CAM.set({smooth:e.target.checked});$('camLook').onchange=e=>CAM.set({lookahead:e.target.checked});$('camShake').onchange=e=>CAM.set({shake:e.target.checked})}return out};
applyZoom();
})();
