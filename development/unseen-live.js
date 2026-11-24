/* SALTWAKE v0.30.0 candidate — Unseen War, native raid actor ownership. */
(()=>{'use strict';
const P=Game.prototype, sites=['quays.salthouse','quays.customs','quays.store','quays.boathouse','quays.warehouse'];
const W=window.saltwakeWar={revision:'0.30.0-alpha.1'};
const human=e=>e.actorType==='human', alive=e=>!e.dead&&!e.warDeparted;
const dist=(a,b)=>distance(a.x,a.y,b.x,b.y);
const rand=state=>{state.seed=(Math.imul(state.seed,1664525)+1013904223)>>>0;return state.seed/4294967296};
function event(r,e,type,extra={}){const w=r.war;if(!w)return;w.counts[type]=(w.counts[type]||0)+1;w.events.push({at:Math.round(r.time),actor:e.id,type,...extra});if(w.events.length>64)w.events.shift()}
function valid(G,p){return G.walkable(p.x,p.y)&&!G.isWater(p.x,p.y)&&!(G.map().buildings||[]).some(b=>p.x>=b.x*T-14&&p.x<=(b.x+b.w)*T+14&&p.y>=b.y*T-14&&p.y<=(b.y+b.h)*T+14)&&!(G.map().portals||[]).some(o=>distance(p.x,p.y,o.x*T,o.y*T)<150)}
W.points=G=>sites.flatMap(id=>{let b=G.map().buildings.find(b=>b.id===id);if(!b)return [];return [[b.x-2,b.y+b.h*.5],[b.x+b.w+2,b.y+b.h*.5],[b.x+b.w*.5,b.y-2],[b.x+b.w*.5,b.y+b.h+2]].map(([x,y])=>({id,x:x*T,y:y*T})).filter(p=>valid(G,p))});
W.prepare=(G,r)=>{if(r.war)return r.war;let w=r.war={seed:(r.seed^0x83e211)>>>0,points:W.points(G),events:[],counts:{},next:0};if(r.alpha?.first)return w;for(const e of r.enemies.filter(human)){e.war={state:'patrol',goal:null,until:0,cargo:null};event(r,e,'patrol_started')}return w};
function setState(r,e,state){if(e.war.state!==state){e.war.state=state;event(r,e,state)}}
function opponents(G,e){return G.raid.enemies.filter(o=>o!==e&&alive(o)&&saltwakeAlpha.actorHostile(G,e,o)&&dist(e,o)<380&&G.hasSight(e.x,e.y,o.x,o.y))}
function goal(G,e,w){let p=w.points.filter(p=>valid(G,p)&&dist(e,p)>90&&dist(e,p)<850);if(!p.length)p=w.points.filter(p=>valid(G,p)&&dist(e,p)>90);p.sort((a,b)=>dist(e,a)-dist(e,b));return p.length?p[Math.floor(rand(w)*Math.min(3,p.length))]:null}
function retreatGoal(G,e,threats,w){let p=w.points.filter(p=>valid(G,p)&&dist(e,p)<900&&dist(e,p)>80);let score=p=>Math.min(...threats.map(o=>dist(p,o)))-dist(e,p)*.22;p.sort((a,b)=>score(b)-score(a));if(p.length&&score(p[0])>Math.min(...threats.map(o=>dist(e,o))))return p[0];let t=threats[0];if(!t)return e.war.goal;let a=Math.atan2(e.y-t.y,e.x-t.x);for(let d of [0,.65,-.65,1.3,-1.3,2]){let p={x:e.x+Math.cos(a+d)*160,y:e.y+Math.sin(a+d)*160,id:'fallback'};if(valid(G,p))return p}return null}
W.plan=(G,e)=>{const r=G.raid,w=r?.war,s=e.war;if(!w||!s||!alive(e))return;const threats=opponents(G,e),p=G.player;if((e.provoked||G.hostility(G.actorFaction(e),'player'))&&e.awareness==='alert'&&dist(e,p)<270&&G.hasSight(e.x,e.y,p.x,p.y))threats.push(p);threats.sort((a,b)=>dist(e,a)-dist(e,b));
 if(threats.length&&(e.hp/e.maxHp<.34||!e.weapon&&human(e))){if(s.state!=='retreat'||!s.goal||dist(e,s.goal)<30){s.goal=retreatGoal(G,e,threats,w);s.until=r.time+8}setState(r,e,'retreat');return}
 if(s.state==='retreat'&&r.time<s.until){if(!s.goal||dist(e,s.goal)<30){s.goal=goal(G,e,w)}return}
 if(threats.length){setState(r,e,'engaged');s.goal=null;return}
 if(['alert','searching','investigating','suspicious','returning'].includes(e.awareness)&&s.state!=='retreat'){setState(r,e,'investigating');return}
 // Existing world drops are the only cargo source; no quest containers or synthetic rewards.
 if(!s.cargo){const d=r.drops.filter(d=>d.warSalvage&&!d.got&&d.n>0&&dist(e,d)<220&&G.hasSight(e.x,e.y,d.x,d.y)).sort((a,b)=>dist(e,a)-dist(e,b))[0];if(d){if(dist(e,d)<32){s.cargo={id:d.id,n:d.n};d.got=true;event(r,e,'salvage_claimed',{item:d.id,n:d.n});s.goal=null}else{s.goal={x:d.x,y:d.y,id:'salvage'};setState(r,e,'salvaging');return}}}
 if(s.goal&&dist(e,s.goal)<38){if(s.goal.id!=='salvage'&&s.state!=='ambush'&&e.factionId==='wreckers'&&rand(w)<.55){setState(r,e,'ambush');s.until=r.time+7;return}if(s.state==='ambush'&&r.time<s.until)return;s.goal=null}
 if(s.state==='ambush'&&r.time<s.until)return;
 if(!s.goal||s.goal.id==='salvage'||!valid(G,s.goal))s.goal=goal(G,e,w);
 setState(r,e,'patrol');};
W.move=(G,e,dt,retreat=false)=>{let s=e.war,p=s?.goal;if(!p||!valid(G,p))return false;const d=dist(e,p);if(d<22)return true;e.facing=Math.atan2(p.y-e.y,p.x-e.x);fieldMove(G,e,p.x,p.y,Math.min(d,(retreat?73:39)*dt));return true};
W.releaseCargo=(G,e)=>{let c=e.war?.cargo;if(!c)return false;e.war.cargo=null;G.raid.drops.push({x:e.x,y:e.y,id:c.id,n:c.n,got:false,warSalvage:true});event(G.raid,e,'cargo_dropped',{item:c.id,n:c.n});return true};
const begin=P.beginRaid;P.beginRaid=function(...a){const prior=this.raid,out=begin.apply(this,a);if(!prior&&this.raid&&this.mapId==='quays')W.prepare(this,this.raid);return out};
const update=P.updateEnemies;P.updateEnemies=function(dt){let r=this.raid;if(r?.war&&this.mapId==='quays'&&!this.isPaused()&&r.time>=r.war.next){r.war.next=r.time+.65;for(const e of r.enemies)if(e.war&&alive(e))W.plan(this,e)}return update.call(this,dt)};
const kill=P.killActorByFaction;P.killActorByFaction=function(e,a){if(e.dead)return;const r=this.raid,n=r?.drops.length||0,out=kill.call(this,e,a);if(r?.war&&e.dead){for(const d of r.drops.slice(n))d.warSalvage=true;W.releaseCargo(this,e);event(r,e,'faction_casualty',{aggressor:a?.id||null})}return out};
const hit=P.hitMonster;P.hitMonster=function(e,...a){const prior=e.dead,r=this.raid,out=hit.call(this,e,...a);if(r?.war&&!prior&&e.dead)W.releaseCargo(this,e);return out};
const hurt=P.hurtEnemy;P.hurtEnemy=function(e,...a){const prior=e.dead,r=this.raid,out=hurt.call(this,e,...a);if(r?.war&&!prior&&e.dead)W.releaseCargo(this,e);return out};
const end=P.endRaid;P.endRaid=function(success,...a){const r=this.raid,w=r?.war,remaining=r?.enemies.filter(e=>e.war&&alive(e)).length||0,out=end.call(this,success,...a);if(w&&!this.raid){const c=w.counts,summary={patrols:c.patrol_started||0,clashes:c.faction_casualty||0,retreats:c.retreat||0,claimed:c.salvage_claimed||0,survivors:remaining};if(success){this.save.flags.unseenWarLast=summary;this.store()}$('panel')?.querySelector('.panelBody')?.insertAdjacentHTML('beforeend',`<section class="alpha-report"><h3>Unseen War · Expedition activity</h3><p>${summary.patrols} patrols · ${summary.clashes} faction combat casualties · ${summary.retreats} retreats · ${summary.claimed} salvage claims · ${summary.survivors} surviving patrol members.</p><small>Activity recorded during this expedition only. Field actors reset on the next departure.</small></section>`)}return out};
const action=P.doAction;P.doAction=function(a,n){const out=action.call(this,a,n);if(a==='alpha_fieldnotes')$('panel')?.querySelector('.alpha-report')?.insertAdjacentHTML('beforeend','<h3>The Unseen War</h3><p>Rare human scouts choose exterior routes, stop to ambush, fight other factions, retreat when hurt and may claim remains from faction combat. Cargo can be recovered if its carrier falls. Quest containers are never claimed by NPCs. No human patrols or Brineworn on the first expedition.</p>');return out};
})();
