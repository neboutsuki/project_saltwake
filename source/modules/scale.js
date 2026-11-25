/* SALTWAKE v0.32 — world scale + HUD scale.
 * Characters drawn larger (readability), oversized props/creatures brought back to human scale, and the HUD scaled
 * to the window. Visual only: collision radii, hitboxes, ranges and positions are unchanged. Scaling is anchored at
 * each sprite's feet so sorting and ground contact are preserved.
 */
(()=>{'use strict';
const P=Game.prototype;
const CHAR=1.15;                       // humans, Brineworn, NPCs, player
const CREATURE={gull:.72,grazer:1,brineback:1,widow:1};   // net scale for non-human creatures
const PROP={'props/crate':.8,'coast/props/crates':.82,'coast/props/bench':.74,'coast/props/barrels':.85,'coast/props/small-cargo':.85,'coast/props/rope-cargo':.85,'coast/props/cargo-hoist':.9,'coast/props/banner':.85};
const stats={chars:0,creatures:0,props:0};
const SC=window.saltwakeScale={CHAR,CREATURE,PROP,stats};
let depth=0;   // >0 while an outer wrapper already applied a scale
function around(x,y,s,fn){g.save();g.translate(x,y);g.scale(s,s);g.translate(-x,-y);depth++;try{return fn()}finally{depth--;g.restore()}}
const human=e=>e.actorType==='human'||/^brineworn_|drifter|caller|breaker|wrecker|guard|medic|smith|ledger|merchant|resident|dock/.test(e.type||'');
// Raid / field actors.
const de=P.draw25Enemy;P.draw25Enemy=function(e,...a){if(depth||!e)return de.call(this,e,...a);
 const s=human(e)?CHAR:(CREATURE[e.type]??1);if(s===1)return de.call(this,e,...a);human(e)?stats.chars++:stats.creatures++;return around(e.x,e.y+10,s,()=>de.call(this,e,...a))};
const dp=P.draw25Player;if(dp)P.draw25Player=function(...a){if(depth)return dp.apply(this,a);stats.chars++;return around(this.player.x,this.player.y+10,CHAR,()=>dp.apply(this,a))};
for(const name of ['coastPlayer','coastPerson']){const f=P[name];if(!f)continue;P[name]=function(o,...a){if(depth)return f.call(this,o,...a);const t=name==='coastPlayer'?this.player:o;if(!t||typeof t.x!=='number')return f.call(this,o,...a);stats.chars++;return around(t.x,t.y+6,CHAR,()=>f.call(this,o,...a))}}
// Harbor hub (iframe) and any other caller of the shared character renderer: scale the requested height/width.
function wrapFaces(){const F=window.saltwakeFaces;if(!F||F.__scaled||typeof F.render!=='function')return;const r=F.render;
 F.render=function(ctx,profile,dir,mirror,frame,x,y,w,h,...rest){if(depth||typeof w!=='number'||typeof h!=='number')return r.call(this,ctx,profile,dir,mirror,frame,x,y,w,h,...rest);stats.chars++;return r.call(this,ctx,profile,dir,mirror,frame,x,y,w*CHAR,h*CHAR,...rest)};F.__scaled=true}
wrapFaces();setTimeout(wrapFaces,0);
// Props drawn through the coast sprite entry point.
if(typeof coastSprite==='function'){const cs=coastSprite;coastSprite=function(key,x,footY,w,h,...a){const s=PROP[key];if(!s)return cs.call(this,key,x,footY,w,h,...a);stats.props++;return cs.call(this,key,x,footY,w*s,h*s,...a)}}
if(typeof SPRITES!=='undefined'){const sd=SPRITES.draw.bind(SPRITES);SPRITES.draw=function(ctx,key,x,y,w,h){const s=PROP[key];if(!s||ctx!==g)return sd(ctx,key,x,y,w,h);stats.props++;const nw=w*s,nh=h*s;return sd(ctx,key,x+(w-nw)/2,y+(h-nh),nw,nh)}}
// HUD scale: follows the rendered game width (1280px reference), clamped for legibility.
const style=document.createElement('style');style.textContent=`#swHudLeft,#missionHud,#tideHud,#quickSlots,#bar,#placeRail,#interactPrompt,#toast{zoom:var(--sw-hud-scale,1)}`;document.head.append(style);
function hudScale(){const vp=document.getElementById('viewport');if(!vp)return;const w=vp.getBoundingClientRect().width||1280;const s=Math.max(.8,Math.min(1.55,w/1280));document.documentElement.style.setProperty('--sw-hud-scale',s.toFixed(3));SC.hudScale=s}
addEventListener('resize',hudScale);hudScale();setTimeout(hudScale,300);
})();
