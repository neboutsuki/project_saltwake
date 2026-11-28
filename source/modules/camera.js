/* SALTWAKE camera system (v0.32, upgraded v0.31-dev).
 * - Smooth damped follow (critically damped spring), snapped to device pixels.
 * - Mouse look: the view leans toward the cursor (far in the field, gently in town), plus movement lead, so you see
 *   where you aim and where you run.
 * - Dynamic framing: in a fight the camera eases out and shifts to keep nearby hunting monsters in view; a boss gets a
 *   wider shot that frames you both; in conversation it eases in on you and the person you talk to; sprinting pulls
 *   out a little. All of it on top of your own zoom.
 * - Impact: trauma shake on damage taken, a small zoom punch on kills.
 * - Player zoom: mouse wheel over the world or - / = (Alt+0 resets); range 0.7-1.6.
 * Plugs into the native render through Game.prototype.cameraFrame; map bounds clamping, the Longwatch aiming view
 * and per-map base scales are preserved (dynamic zoom steps aside while something else drives the zoom).
 * Settings: localStorage saltwake.camera.v1 {smooth, lookahead, mouselook, framing, shake, zoom}.
 */
(()=>{'use strict';
const P=Game.prototype,KEY='saltwake.camera.v1';
const ZMIN=.7,ZMAX=1.6;
let cfg={smooth:true,lookahead:true,mouselook:true,framing:true,shake:true,zoom:1};try{Object.assign(cfg,JSON.parse(localStorage.getItem(KEY))||{})}catch{}
cfg.zoom=Math.min(ZMAX,Math.max(ZMIN,+cfg.zoom||1));
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(cfg))}catch{}};
const st={x:null,y:null,lx:0,ly:0,trauma:0,t:0,map:null,px:0,py:0,fx:0,fy:0,dz:1,punch:0,kills:0,mine:null,stats:{framed:0,boss:0,talk:0,punches:0}};
const CAM=window.saltwakeCamera={state:st,get settings(){return {...cfg}},set(p){Object.assign(cfg,p);cfg.zoom=Math.min(ZMAX,Math.max(ZMIN,+cfg.zoom||1));save();applyZoom();return {...cfg}},shake(amount){if(cfg.shake)st.trauma=Math.min(1,st.trauma+amount)}};
const base=P.cameraScaleDefault;
P.cameraScaleDefault=function(...a){return (base?base.apply(this,a):.64)*cfg.zoom*(st.mult||1)};   // st.mult: dynamic framing + kill punch
function applyZoom(){const G=window.SALTWAKE_DEV?.game;if(!G?.camera)return;G.camera.target=G.cameraScaleDefault()}
const noise=(t,s)=>Math.sin(t*37.1+s)*.6+Math.sin(t*61.7+s*2.3)*.4;
P.cameraFrame=function(viewW,viewH){const p=this.player,now=performance.now()/1000,dt=Math.min(.1,st.t?now-st.t:0);st.t=now;
 const lw=this.longwatchView||{x:0,y:0},longwatch=!!(lw.x||lw.y),play=this.mode==='play'&&!this.panel;
 // Look-ahead: movement lead plus mouse look (the view leans toward the cursor; far in the field, gently in town).
 let tx=0,ty=0;if(cfg.lookahead&&!longwatch&&play){const vx=dt?(p.x-st.px)/dt:0,vy=dt?(p.y-st.py)/dt:0,sp=Math.hypot(vx,vy);
  tx=Math.max(-70,Math.min(70,vx*.28));ty=Math.max(-50,Math.min(50,vy*.28));
  if(cfg.mouselook&&this.mouse&&this.mouse.x>0&&this.mouse.y>0&&this.mouse.x<VW&&this.mouse.y<VH){
   const mx=(this.mouse.x-VW/2)/(VW/2),my=(this.mouse.y-VH/2)/(VH/2),m=Math.min(1,Math.hypot(mx,my)),ease=m*m*(3-2*m)/(m||1);   // smooth near the centre, strong at the edges
   const reach=this.raid?.26:.09;tx+=mx*ease*viewW*reach;ty+=my*ease*viewH*reach}
  else{const lead=Math.min(1,sp/170),aim=(this.raid?26:12)*(.35+.65*lead);tx+=Math.cos(p.angle||0)*aim;ty+=Math.sin(p.angle||0)*aim*.75}}
 st.px=p.x;st.py=p.y;
 const k=dt?1-Math.exp(-dt*3.2):1;st.lx+=(tx-st.lx)*k;st.ly+=(ty-st.ly)*k;
 // Dynamic framing: fights, bosses, conversations, sprint, kill punch -> a focus offset and a zoom multiplier.
 let fx=0,fy=0,dz=1;
 if(cfg.framing&&!longwatch){
  const r=this.raid;
  if(r&&play){const near=[];let boss=null;
   for(const e of r.enemies||[]){if(e.dead)continue;const d=Math.hypot(e.x-p.x,e.y-p.y);
    if(e.boss&&d<1000)boss=e;else if(d<520&&(/alert|searching|investigating/.test(e.awareness||'')||(e.aggro||0)>0||e.provoked))near.push([d,e])}
   near.sort((a,b)=>a[0]-b[0]);const pick=near.slice(0,4).map(n=>n[1]);
   const frame=(list,wgt,min)=>{let x0=p.x,x1=p.x,y0=p.y,y1=p.y;for(const e of list){x0=Math.min(x0,e.x);x1=Math.max(x1,e.x);y0=Math.min(y0,e.y-30);y1=Math.max(y1,e.y)}
    const cx=(x0+x1)/2,cy=(y0+y1)/2;fx=(cx-p.x)*wgt;fy=(cy-p.y)*wgt;const need=Math.max((x1-x0+260)/viewW,(y1-y0+220)/viewH);dz=Math.max(min,Math.min(1,1/need))};
   if(boss){frame([boss,...pick.slice(0,2)],.42,.72);st.stats.boss++}else if(pick.length){frame(pick,.3,.84);st.stats.framed++}
   if(this.keys?.ShiftLeft||this.keys?.ShiftRight)dz*=.96}
  if(this.dialogue?.npc&&this.mapId===this.dialogue.npc.mapId){const at=this.npcLocation?.(this.dialogue.npc);
   if(at&&Math.hypot(at.x-p.x,at.y-p.y)<300){fx=(at.x-p.x)*.5;fy=(at.y-p.y)*.5-18;dz=1.14;st.stats.talk++}}}
 // kill punch
 const kills=window.saltwakeImpact?.stats?.kills||0;if(kills>st.kills&&cfg.shake){st.punch=Math.min(.06,st.punch+.035);st.stats.punches++}st.kills=kills;st.punch=Math.max(0,st.punch-dt*.18);
 const kf=dt?1-Math.exp(-dt*1.8):1;st.fx+=(fx-st.fx)*kf;st.fy+=(fy-st.fy)*kf;st.dz+=(dz-st.dz)*(dt?1-Math.exp(-dt*1.4):1);
 // the base zoom (cameraScaleDefault) carries the framing multiplier, so every zoom owner (Longwatch included) agrees
 st.mult=Math.max(.6,Math.min(1.3,st.dz*(1+st.punch)));if(this.camera&&!longwatch&&Math.abs(this.camera.target-.55)>1e-6)this.camera.target=this.cameraScaleDefault();
 const gx=p.x-viewW/2+lw.x+st.lx+st.fx,gy=p.y-viewH/2+lw.y+st.ly+st.fy-6;
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
const sa=P.setArea;P.setArea=function(...a){const r=sa.apply(this,a);st.x=null;st.lx=st.ly=0;st.fx=st.fy=0;st.dz=1;st.mult=1;st.punch=0;st.trauma=0;return r};
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
 b.insertAdjacentHTML('beforeend',`<label class="engineCheck"><input id="camMouse" type="checkbox" ${cfg.mouselook?'checked':''}> Mouse look (view leans toward the cursor)</label><label class="engineCheck"><input id="camFrame" type="checkbox" ${cfg.framing?'checked':''}> Dynamic framing (fights, bosses, conversations)</label>`);$('camMouse').onchange=e=>CAM.set({mouselook:e.target.checked});$('camFrame').onchange=e=>CAM.set({framing:e.target.checked});$('camZoom').oninput=e=>CAM.set({zoom:+e.target.value});$('camSmooth').onchange=e=>CAM.set({smooth:e.target.checked});$('camLook').onchange=e=>CAM.set({lookahead:e.target.checked});$('camShake').onchange=e=>CAM.set({shake:e.target.checked})}return out};
applyZoom();
})();
