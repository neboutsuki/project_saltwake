/* SALTWAKE v0.35 — houses and terrain detail pass (lore: Red Salt Coast, ashfall, brine).
 * Buildings: baked light (upper-left sun), ground-contact grime/AO, brine staining at the footing, rain-run salt
 * streaks, ash settling on roofs and a fine material dither. Applied to the field façade sprites (coastFacade) and to
 * the harbor's procedurally generated houses (architecture() inside the harbor frame).
 * Terrain: deterministic procedural decals per 16-tile chunk (red-salt crusts, ash drifts, crack networks, pebbles),
 * plus rain puddles that appear with surface wetness. Applied to the field terrain and the harbor ground canvas.
 * Pure presentation: no collision, position or sort changes. Settings: localStorage saltwake.detail.v1 {houses,terrain}.
 */
(()=>{'use strict';
const KEY='saltwake.detail.v1';let cfg={houses:true,terrain:true};try{Object.assign(cfg,JSON.parse(localStorage.getItem(KEY))||{})}catch{}
const stats={houses:0,chunks:0,hubHouses:0,hubGround:0};
const D=window.saltwakeDetail={stats,get settings(){return {...cfg}},set(p){Object.assign(cfg,p);try{localStorage.setItem(KEY,JSON.stringify(cfg))}catch{}return {...cfg}}};
function rng(seed){let s=(seed>>>0)||1;return()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return (s>>>0)/4294967296}}
const hashStr=str=>{let h=2166136261;for(const ch of String(str)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};
function stip(x,cx,cy,r,col,dens,R,px=1,flat=.6,stretch=1){const n=Math.round(r*r*dens);x.fillStyle=col;for(let i=0;i<n;i++){const a=R()*6.283,d=r*Math.sqrt(R());const xx=cx+Math.cos(a)*d*stretch,yy=cy+Math.sin(a)*d*flat;x.fillRect(Math.round(xx/px)*px,Math.round(yy/px)*px,px,px)}}
/* ---------- buildings ---------- */
function weather(src,seed,unit=1){const w=src.width||src.naturalWidth,h=src.height||src.naturalHeight;if(!w||!h)return src;
 const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.imageSmoothingEnabled=false;x.drawImage(src,0,0,w,h);
 x.globalCompositeOperation='source-atop';const R=rng(seed);const px=Math.max(1,Math.round(unit));
 // baked sun: warm from upper-left, cool shade lower-right
 let gr=x.createLinearGradient(0,0,w,h);gr.addColorStop(0,'rgba(255,222,176,.2)');gr.addColorStop(.45,'rgba(0,0,0,0)');gr.addColorStop(1,'rgba(14,18,32,.32)');x.fillStyle=gr;x.fillRect(0,0,w,h);
 // footing grime / ambient occlusion
 gr=x.createLinearGradient(0,h*.68,0,h);gr.addColorStop(0,'rgba(10,9,9,0)');gr.addColorStop(1,'rgba(10,9,9,.52)');x.fillStyle=gr;x.fillRect(0,h*.68,w,h*.32);
 // brine staining along the footing
 for(let i=0;i<Math.max(3,w/40);i++)stip(x,R()*w,h*(.9+R()*.08),6+R()*14*unit,'rgba(86,118,96,.22)',.6,R,px,.45,1.6);
 // rain-run salt streaks down the walls (start under the eaves)
 for(let i=0;i<w/9;i++){const sx=Math.round(R()*w/px)*px,sy=h*(.38+R()*.3),len=h*(.08+R()*.22);x.fillStyle=`rgba(236,224,214,${.08+R()*.12})`;x.fillRect(sx,sy,px,len);if(R()<.4){x.fillStyle='rgba(30,24,22,.08)';x.fillRect(sx+px,sy,px,len*.7)}}
 // ash settled on the roof (upper part), lighter on top-facing slopes
 for(let i=0;i<w*h/420;i++){const yy=R()*h*.45;x.fillStyle=`rgba(210,204,196,${.1+R()*.2*(1-yy/(h*.45))})`;x.fillRect(Math.round(R()*w/px)*px,Math.round(yy/px)*px,px,px)}
 // red-salt bloom on a few spots
 for(let i=0;i<2;i++)stip(x,R()*w,h*(.55+R()*.35),4+R()*7*unit,'rgba(214,150,138,.14)',.6,R,px,.7);
 // fine material dither
 for(let i=0;i<w*h/60;i++){x.fillStyle=R()<.5?'rgba(0,0,0,.05)':'rgba(255,255,255,.035)';x.fillRect(Math.round(R()*w/px)*px,Math.round(R()*h/px)*px,px,px)}
 x.globalCompositeOperation='source-over';return c}
const fieldCache=new WeakMap();
function weathered(im){let c=fieldCache.get(im);if(!c){c=weather(im,hashStr(im.src?.slice(-64)||im.width+'x'+im.height),Math.max(1,(im.width||300)/300));fieldCache.set(im,c);stats.houses++}return c}
const P=Game.prototype,facade=P.coastFacade;
if(facade)P.coastFacade=function(b,view,room){
 if(!cfg.houses)return facade.call(this,b,view,room);
 // ground-contact shadow band in front of the wall, under the sprite
 const x=b.x*T,y=b.y*T,w=b.w*T,h=b.h*T,front=y+h;g.save();const gr=g.createLinearGradient(0,front-4,0,front+18);gr.addColorStop(0,'rgba(8,8,10,.34)');gr.addColorStop(1,'rgba(8,8,10,0)');g.fillStyle=gr;g.fillRect(x-6,front-4,w+12,22);g.restore();
 const own=Object.prototype.hasOwnProperty.call(g,'drawImage'),di=g.drawImage,sd=SPRITES.draw;let done=false;
 g.drawImage=function(im,...a){if(!done&&im&&(im.width||0)>=120&&a.length>=4){done=true;return di.call(this,weathered(im),...a)}return di.call(this,im,...a)};
 SPRITES.draw=function(ctx,key,...a){if(!done&&ctx===g&&/^(coast\/buildings|prefab|buildings)\//.test(key)){const im=SPRITES.image(key);if(im){done=true;const [dx,dy,dw,dh]=a;di.call(g,weathered(im),dx,dy,dw,dh);return true}}return sd.call(this,ctx,key,...a)};
 try{return facade.call(this,b,view,room)}finally{if(own)g.drawImage=di;else delete g.drawImage;SPRITES.draw=sd}};
/* ---------- terrain ---------- */
function patch(x,cx,cy,r,col,dens,R,px,flat,stretch){const n=4+(R()*4|0),ang=R()*6.283;for(let i=0;i<n;i++){const d=r*.75*Math.sqrt(R()),a=ang+(R()-.5)*2.2;const sx=cx+Math.cos(a)*d*stretch,sy=cy+Math.sin(a)*d*flat;stip(x,sx,sy,r*(.28+R()*.38),col,dens*(.5+R()*.8),R,px,flat,stretch*(.8+R()*.5))}}
function decals(x,ox,oy,w,h,seed,px,ok,scale=1){const R=rng(seed);const pick=()=>{for(let k=0;k<6;k++){const a=ox+R()*w,b=oy+R()*h;if(ok(a,b))return [a-ox,b-oy]}return null};
 const area=(w/scale/512)*(h/scale/512),s=scale,cnt=k=>{const v=k*area;return Math.floor(v)+(R()<v%1?1:0)};
 for(let i=0;i<cnt(6);i++){const p=pick();if(!p)continue;const r=(18+R()*34)*s;patch(x,p[0],p[1],r,'rgba(226,208,200,.09)',.55,R,px,.55,1.2);patch(x,p[0],p[1],r*.8,'rgba(206,140,128,.08)',.4,R,px,.55,1.2);stip(x,p[0],p[1],r*.7,'rgba(255,246,240,.42)',.012,R,px,.55)}
 for(let i=0;i<cnt(5);i++){const p=pick();if(!p)continue;const r=(22+R()*36)*s;patch(x,p[0],p[1],r,'rgba(70,68,66,.1)',.5,R,px,.38,1.9);patch(x,p[0]-r*.3,p[1]-r*.06,r*.55,'rgba(180,174,166,.08)',.4,R,px,.3,2.1)}
 x.strokeStyle='rgba(34,27,23,.28)';x.lineWidth=px;
 for(let i=0;i<cnt(3);i++){const p=pick();if(!p)continue;const walk=(sx,sy,a,n,depth)=>{x.beginPath();x.moveTo(sx,sy);for(let k=0;k<n;k++){a+=(R()-.5)*.9;sx+=Math.cos(a)*6*s;sy+=Math.sin(a)*3.6*s;x.lineTo(Math.round(sx/px)*px,Math.round(sy/px)*px);if(depth<2&&R()<.18){x.stroke();walk(sx,sy,a+(R()<.5?1:-1)*.9,4+R()*5|0,depth+1);x.beginPath();x.moveTo(sx,sy)}}x.stroke()};walk(p[0],p[1],R()*6.28,6+R()*8|0,0)}
 for(let i=0;i<cnt(34);i++){const p=pick();if(!p)continue;const q=Math.max(px,Math.round(2*s));x.fillStyle='rgba(30,26,24,.32)';x.fillRect(Math.round(p[0]/px)*px,Math.round(p[1]/px)*px,q*2,q);x.fillStyle='rgba(220,212,200,.22)';x.fillRect(Math.round(p[0]/px)*px,Math.round(p[1]/px)*px-q,q*2,q)}}
function puddles(x,ox,oy,w,h,seed,px,ok){const R=rng(seed^0x51f);const s=w/512;for(let i=0;i<4*s*s;i++){for(let k=0;k<6;k++){const a=ox+R()*w,b=oy+R()*h;if(!ok(a,b))continue;const rx=(10+R()*22)*s,ry=rx*(.35+R()*.15),cx=a-ox,cy=b-oy;
 x.fillStyle='rgba(34,48,60,.55)';x.beginPath();x.ellipse(cx,cy,rx,ry,0,0,6.283);x.fill();x.fillStyle='rgba(120,145,165,.22)';x.beginPath();x.ellipse(cx-rx*.15,cy-ry*.2,rx*.6,ry*.45,0,0,6.283);x.fill();
 x.strokeStyle='rgba(185,200,212,.35)';x.lineWidth=px;x.beginPath();x.ellipse(cx,cy,rx,ry,0,3.5,5.9);x.stroke();break}}}
const chunks=new Map();
function chunk(G,map,cx,cy){const k=map+':'+cx+':'+cy;let c=chunks.get(k);if(c)return c;const S=512;
 const ok=(a,b)=>{try{return G.walkable(a,b)&&!G.isWater(a,b)&&!G.isWater(a,b+12)}catch{return false}};
 const d=document.createElement('canvas');d.width=d.height=S;decals(d.getContext('2d'),cx*S,cy*S,S,S,hashStr(k),2,ok);
 const p=document.createElement('canvas');p.width=p.height=S;puddles(p.getContext('2d'),cx*S,cy*S,S,S,hashStr(k),2,ok);
 c={d,p};chunks.set(k,c);stats.chunks++;return c}
const terr=P.drawTerrain;
if(terr)P.drawTerrain=function(view){const out=terr.call(this,view);if(!cfg.terrain||!this.raid&&this.mapId==='hub')return out;
 const S=512,m=this.map(),x0=Math.max(0,Math.floor(view.x0/S)),x1=Math.min(Math.ceil(m.w*T/S),Math.ceil(view.x1/S)),y0=Math.max(0,Math.floor(view.y0/S)),y1=Math.min(Math.ceil(m.h*T/S),Math.ceil(view.y1/S));
 const wet=window.saltwakeSky?.state.wet||0;
 for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){const c=chunk(this,this.mapId,x,y);g.drawImage(c.d,x*S,y*S);if(wet>.15){g.save();g.globalAlpha=Math.min(1,(wet-.15)*1.6);g.drawImage(c.p,x*S,y*S);g.restore()}}
 return out};
/* ---------- harbor frame ---------- */
function hub(){const f=document.getElementById('reunionHarbor');const w=f?.contentWindow;if(!w||w.__swDetail)return;let ok=false;try{ok=typeof w.eval==='function'&&w.document.readyState!=='loading'}catch{}if(!ok)return;
 try{w.__swParent=D;w.eval(`(()=>{if(window.__swDetail)return;window.__swDetail=true;const D=window.__swParent;
  if(typeof house==='function'){const h0=house;house=function(a){if(!D.settings.houses)return h0(a);const di=ctx.drawImage;let done=false;ctx.drawImage=function(im,...r){if(!done&&im&&(im.width||im.naturalWidth||0)>=80&&r.length>=4){done=true;return di.call(this,D.weatheredFor(im,a.id),...r)}return di.call(this,im,...r)};try{return h0(a)}finally{delete ctx.drawImage}}}
  if(false&&typeof architecture==='function'){const a0=architecture;architecture=function(a,night){const c=a0(a,night);try{if(D.settings.houses){const out=D.weather(c,D.hash(a.id||'h'),1);D.stats.hubHouses++;return out}}catch(e){}return c};try{architectureCache.clear()}catch(e){}}
  const tryGround=()=>{try{if(typeof ground==='undefined'||!ground||!ground.width)return false;if(ground.__sw)return true;if(!D.settings.terrain)return true;const x=ground.getContext('2d');const sw=ground.width/W;const data=x.getImageData(0,0,ground.width,ground.height).data;
   const ok=(a,b)=>{const i=((Math.floor(b)*ground.width)+Math.floor(a))*4;if(i<0||i>=data.length)return false;const r=data[i],g=data[i+1],bl=data[i+2];return !(bl>r+8&&bl>=g-4)};
   const S=Math.round(16*sw);for(let y=0;y<ground.height;y+=S)for(let xx=0;xx<ground.width;xx+=S){const cw=Math.min(S,ground.width-xx),ch=Math.min(S,ground.height-y);const tmp=document.createElement('canvas');tmp.width=cw;tmp.height=ch;D.decals(tmp.getContext('2d'),xx,y,cw,ch,D.hash('hub:'+xx+':'+y),1,ok,sw/32);x.drawImage(tmp,xx,y)}
   ground.__sw=true;D.stats.hubGround++;return true}catch(e){return false}};
  let n=0;const iv=setInterval(()=>{if(tryGround()||++n>80)clearInterval(iv)},250);})()`)}catch(e){stats.hubError=String(e).slice(0,120)}}
D.weather=weather;D.weatheredFor=(im,id)=>{let c=fieldCache.get(im);if(!c){c=weather(im,hashStr(id||'h'),Math.max(1,(im.width||im.naturalWidth||300)/300));fieldCache.set(im,c);stats.hubHouses++}return c};D.decals=decals;D.hash=hashStr;
setInterval(hub,500);
const gp=P.graphicsPanel;P.graphicsPanel=function(...a){const out=gp.apply(this,a);const b=$('panel')?.querySelector('.engineOptions');if(b&&!$('detHouses')){
 b.insertAdjacentHTML('beforeend',`<label class="engineCheck"><input id="detHouses" type="checkbox" ${cfg.houses?'checked':''}> Weathered buildings (salt, ash, brine)</label><label class="engineCheck"><input id="detTerrain" type="checkbox" ${cfg.terrain?'checked':''}> Terrain detail (salt crusts, ash drifts, cracks, puddles)</label>`);
 $('detHouses').onchange=e=>D.set({houses:e.target.checked});$('detTerrain').onchange=e=>D.set({terrain:e.target.checked})}return out};
})();
