/* SALTWAKE v0.35 — houses and terrain detail (image-based).
 * All art lives in image files (assets/weathered, assets/decals; pack "art-v031", made by tools/bake_art.py and
 * replaceable by hand-painted files). This module only chooses and places images:
 *   - buildings: when a building sprite is drawn, its "weathered/<alias>" image is drawn instead (falls back to the
 *     original if no weathered file exists). Field façades and harbor houses.
 *   - terrain: deterministic placement of "decals/*" sprites per 16-tile chunk on walkable land; puddle sprites fade
 *     in with surface wetness. Field terrain and the harbor ground canvas.
 * No collision, position or sort changes. Settings: localStorage saltwake.detail.v1 {houses, terrain}.
 */
(()=>{'use strict';
const KEY='saltwake.detail.v1';let cfg={houses:true,terrain:true};try{Object.assign(cfg,JSON.parse(localStorage.getItem(KEY))||{})}catch{}
const stats={houses:0,chunks:0,hubHouses:0,hubGround:0,missing:0};
const D=window.saltwakeDetail={stats,get settings(){return {...cfg}},set(p){Object.assign(cfg,p);try{localStorage.setItem(KEY,JSON.stringify(cfg))}catch{}return {...cfg}}};
const IMG=window.SALTWAKE_ASSETS.images;
function rng(seed){let s=(seed>>>0)||1;return()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return (s>>>0)/4294967296}}
const hashStr=str=>{let h=2166136261;for(const ch of String(str)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};
/* ---------- image lookup ---------- */
const WIDX=window.SALTWAKE_WEATHER_INDEX||{};const sigOf=u=>{if(!u)return '';if(!u.startsWith('data:')){const i=u.lastIndexOf('/assets/');if(i>=0)u=u.slice(i+1)}return u.length+':'+u.slice(-48)};
const loaded=new Map();
function image(alias){let im=loaded.get(alias);if(im===undefined){const url=IMG[alias];im=url?Object.assign(new Image(),{src:url}):null;loaded.set(alias,im)}return im&&im.complete&&im.naturalWidth?im:null}
const wcache=new WeakMap(),keyAlias=new Map();
// Cached per image object: reading img.src on an embedded image copies its whole data URL (100-300 KB) every time.
function weatheredFor(im){if(!im)return im;const hit=wcache.get(im);if(hit)return hit.complete&&hit.naturalWidth?hit:im;if(hit===null)return im;const alias=WIDX[sigOf(im.src)];const w=alias&&image(alias);if(alias){const el=loaded.get(alias);if(el)wcache.set(im,el)}else wcache.set(im,null);if(!w){stats.missing++;return im}return w}
const DECALS={salt:[1,2,3,4].map(i=>'decals/salt_crust_'+i),ash:[1,2,3,4].map(i=>'decals/ash_drift_'+i),crack:[1,2,3].map(i=>'decals/crack_'+i),pebbles:[1,2,3].map(i=>'decals/pebbles_'+i),puddle:[1,2,3].map(i=>'decals/puddle_'+i)};
const ready=()=>Object.values(DECALS).flat().every(a=>image(a));
/* ---------- buildings ---------- */
const P=Game.prototype,facade=P.coastFacade;
if(facade)P.coastFacade=function(b,view,room){
 if(!cfg.houses)return facade.call(this,b,view,room);
 const own=Object.prototype.hasOwnProperty.call(g,'drawImage'),di=g.drawImage,sd=SPRITES.draw;let done=false;
 g.drawImage=function(im,...a){if(!done&&im&&(im.width||0)>=120&&a.length>=4){done=true;stats.houses++;return di.call(this,weatheredFor(im),...a)}return di.call(this,im,...a)};
 SPRITES.draw=function(ctx,key,...a){if(!done&&ctx===g){let al=keyAlias.get(key);if(al===undefined){al=WIDX[sigOf(window.SALTWAKE_ASSETS.images[key])]||null;keyAlias.set(key,al)}const w=al&&image(al);if(w){done=true;stats.houses++;const [dx,dy,dw,dh]=a;di.call(g,w,dx,dy,dw,dh);return true}}return sd.call(this,ctx,key,...a)};
 try{return facade.call(this,b,view,room)}finally{if(own)g.drawImage=di;else delete g.drawImage;SPRITES.draw=sd}};
/* ---------- terrain ---------- */
function placeDecals(x,ox,oy,w,h,seed,ok,scale=1,set='ground'){const R=rng(seed);const area=(w/scale/512)*(h/scale/512);const cnt=k=>{const v=k*area;return Math.floor(v)+(R()<v%1?1:0)};
 const put=(list,size,alpha)=>{for(let k=0;k<8;k++){const a=ox+R()*w,b=oy+R()*h;if(!ok(a,b))continue;const im=image(list[(R()*list.length)|0]);if(!im)return;const s=size*(.7+R()*.6)*scale;
  x.save();x.globalAlpha=alpha*(.75+R()*.25);x.translate(a-ox,b-oy);if(R()<.5)x.scale(-1,1);x.imageSmoothingEnabled=false;x.drawImage(im,-s/2,-s/2,s,s);x.restore();return}};
 if(set==='ground'){for(let i=0;i<cnt(6);i++)put(DECALS.salt,96,.9);for(let i=0;i<cnt(5);i++)put(DECALS.ash,110,.9);for(let i=0;i<cnt(3);i++)put(DECALS.crack,90,.85);for(let i=0;i<cnt(10);i++)put(DECALS.pebbles,46,.9)}
 else for(let i=0;i<cnt(4);i++)put(DECALS.puddle,80,1)}
const chunks=new Map();
function chunk(G,map,cx,cy){const k=map+':'+cx+':'+cy;let c=chunks.get(k);if(c)return c;if(!ready())return null;const S=512;
 const ok=(a,b)=>{try{return G.walkable(a,b)&&!G.isWater(a,b)&&!G.isWater(a,b+12)}catch{return false}};
 const d=document.createElement('canvas');d.width=d.height=S;placeDecals(d.getContext('2d'),cx*S,cy*S,S,S,hashStr(k),ok,1,'ground');
 const p=document.createElement('canvas');p.width=p.height=S;placeDecals(p.getContext('2d'),cx*S,cy*S,S,S,hashStr(k)^0x51f,ok,1,'puddle');
 c={d,p};chunks.set(k,c);stats.chunks++;return c}
const terr=P.drawTerrain;
if(terr)P.drawTerrain=function(view){const out=terr.call(this,view);if(!cfg.terrain||!this.raid&&this.mapId==='hub')return out;
 const S=512,m=this.map(),x0=Math.max(0,Math.floor(view.x0/S)),x1=Math.min(Math.ceil(m.w*T/S),Math.ceil(view.x1/S)),y0=Math.max(0,Math.floor(view.y0/S)),y1=Math.min(Math.ceil(m.h*T/S),Math.ceil(view.y1/S));
 const wet=window.saltwakeSky?.state.wet||0;
 for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){const c=chunk(this,this.mapId,x,y);if(!c)continue;g.drawImage(c.d,x*S,y*S);if(wet>.15){g.save();g.globalAlpha=Math.min(1,(wet-.15)*1.6);g.drawImage(c.p,x*S,y*S);g.restore()}}
 return out};
/* ---------- harbor frame ---------- */
D.weatheredFor=weatheredFor;D.placeDecals=placeDecals;D.hash=hashStr;D.ready=ready;D.image=image;
function hub(){const f=document.getElementById('reunionHarbor');const w=f?.contentWindow;if(!w||w.__swDetail||!ready())return;let ok=false;try{ok=typeof w.eval==='function'&&w.document.readyState!=='loading'}catch{}if(!ok)return;
 try{w.__swParent=D;w.eval(`(()=>{if(window.__swDetail)return;window.__swDetail=true;const D=window.__swParent;
  if(typeof house==='function'){const h0=house;house=function(a){if(!D.settings.houses)return h0(a);const di=ctx.drawImage;let done=false;ctx.drawImage=function(im,...r){if(!done&&im&&(im.width||im.naturalWidth||0)>=80&&r.length>=4){done=true;D.stats.hubHouses++;return di.call(this,D.weatheredFor(im),...r)}return di.call(this,im,...r)};try{return h0(a)}finally{delete ctx.drawImage}}}
  const tryGround=()=>{try{if(typeof ground==='undefined'||!ground||!ground.width||!groundDone)return false;if(ground.__sw)return true;if(!D.settings.terrain)return true;const x=ground.getContext('2d');const sw=ground.width/W;const data=x.getImageData(0,0,ground.width,ground.height).data;
   const ok=(a,b)=>{const i=((Math.floor(b)*ground.width)+Math.floor(a))*4;if(i<0||i>=data.length)return false;const r=data[i],g=data[i+1],bl=data[i+2];return !(bl>r+8&&bl>=g-4)};
   const S=Math.round(16*sw);for(let y=0;y<ground.height;y+=S)for(let xx=0;xx<ground.width;xx+=S){const cw=Math.min(S,ground.width-xx),ch=Math.min(S,ground.height-y);const tmp=document.createElement('canvas');tmp.width=cw;tmp.height=ch;D.placeDecals(tmp.getContext('2d'),xx,y,cw,ch,D.hash('hub:'+xx+':'+y),ok,sw/32,'ground');x.drawImage(tmp,xx,y)}
   ground.__sw=true;D.stats.hubGround++;return true}catch(e){return false}};
  let n=0;const iv=setInterval(()=>{if(tryGround()||++n>80)clearInterval(iv)},250);})()`)}catch(e){stats.hubError=String(e).slice(0,120)}}
setInterval(hub,500);
const gp=P.graphicsPanel;P.graphicsPanel=function(...a){const out=gp.apply(this,a);const b=$('panel')?.querySelector('.engineOptions');if(b&&!$('detHouses')){
 b.insertAdjacentHTML('beforeend',`<label class="engineCheck"><input id="detHouses" type="checkbox" ${cfg.houses?'checked':''}> Weathered buildings (salt, ash, brine)</label><label class="engineCheck"><input id="detTerrain" type="checkbox" ${cfg.terrain?'checked':''}> Terrain detail (salt crusts, ash drifts, cracks, puddles)</label>`);
 $('detHouses').onchange=e=>D.set({houses:e.target.checked});$('detTerrain').onchange=e=>D.set({terrain:e.target.checked})}return out};
})();
