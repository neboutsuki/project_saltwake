// SALTWAKE audit regression suite (deterministic). Loaded by run_qa.js as suite "audit".
// Each key must be === true. Failure details are written to window.SALTWAKE_AUDIT for diagnosis.
module.exports=`async()=>{
const G=SALTWAKE_DEV.game,C=G.world.content,c={},detail={};window.SALTWAKE_AUDIT=detail;
const errs=[];const onErr=e=>errs.push(String(e.message||e.reason||e));addEventListener('error',onErr);addEventListener('unhandledrejection',onErr);
const rnd=Math.random;let seed=1234567;Math.random=()=>((seed=(seed*1103515245+12345)%2147483648)/2147483648);
const fail=(k,v)=>{(detail[k]||=[]).push(v)};
const hubIds=new Set(),cid=new Set(C.containers.map(o=>o.id)),iid=new Set(C.interactables.map(o=>o.id)),nid=new Set(C.npcs.map(o=>o.id));
const items=new Set(C.items.map(i=>i.id)),maps=Object.keys(G.world.maps);
try{
// ---- map loading
// Hub geometry is authoritative in the harbor iframe plan (saltwakeReunion.hub()); quays uses G.walkable.
for(let i=0;i<60&&!saltwakeReunion.hub();i++)await new Promise(r=>setTimeout(r,50));
const H=saltwakeReunion.hub();c.harborBridgeLoaded=!!SALTWAKE_DEV.game.world.maps.hub.tilemap||(!!H&&!!H.plan&&typeof H.walk==='function');
const ok=(id,x,y)=>id==='hub'&&H?H.walk(x/T,y/T):(G.mapId===id||G.setArea(id,...SPAWN[id]),G.walkable(x,y)&&!G.isWater(x,y));
const SPAWN={hub:H?H.plan.spawn:[33.5,27.6],quays:[8,24]};for(const id of Object.keys(G.world.maps))if(!SPAWN[id])SPAWN[id]=G.world.maps[id].arrivals?.default||[8,8];
const DEST={hub:['quays',8,24],quays:['hub',...SPAWN.hub]};for(const id of Object.keys(G.world.maps))if(!DEST[id])DEST[id]=['hub',...SPAWN.hub];
const dims=id=>id==='hub'&&H?[H.plan.w,H.plan.h]:[G.world.maps[id].w,G.world.maps[id].h];
const portals=id=>id==='hub'&&H?H.plan.portals:G.world.maps[id].portals;
c.worldHasMaps=maps.length>=2&&maps.includes('hub')&&maps.includes('quays');
c.allMapsLoad=maps.every(id=>{try{G.setArea(id,...(SPAWN[id]||[1,1]));return G.mapId===id&&G.map().id===id&&Array.isArray(G.map().portals)}catch(e){fail('allMapsLoad',id+':'+e);return false}});
c.defaultSpawnsWalkable=maps.every(id=>{const r=ok(id,SPAWN[id][0]*T,SPAWN[id][1]*T);if(!r)fail('defaultSpawnsWalkable',id);return r});
if(H)H.state.room=null;
// ---- BFS reachability (half-tile grid)
const S=16,reach={};
for(const id of maps){G.setArea(id,...SPAWN[id]);const[mw,mh]=dims(id),W=Math.ceil(mw*T/S),Hh=Math.ceil(mh*T/S),seen=new Uint8Array(W*Hh);
 const st=Math.floor(SPAWN[id][0]*T/S)+Math.floor(SPAWN[id][1]*T/S)*W;const q=[st];seen[st]=1;
 for(let h=0;h<q.length;h++){const i=q[h],x=i%W,y=(i/W)|0;for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=W||ny>=Hh)continue;const j=nx+ny*W;if(seen[j])continue;seen[j]=2;if(ok(id,nx*S+S/2,ny*S+S/2)){seen[j]=1;q.push(j)}}}
 reach[id]={n:q.length,near(px,py,R){const r=Math.ceil(R/S),cx=Math.floor(px/S),cy=Math.floor(py/S);for(let y=cy-r;y<=cy+r;y++)for(let x=cx-r;x<=cx+r;x++){if(x<0||y<0||x>=W||y>=Hh)continue;if(seen[x+y*W]===1&&Math.hypot(x*S+S/2-px,y*S+S/2-py)<=R)return true}return false}}}
G.setArea('quays',...SPAWN.quays);
c.bfsCoversArea=maps.every(id=>reach[id].n>200);
const portalWalk=(id,p)=>{for(let r=0;r<=40;r+=8)for(let a=0;a<8;a++)if(ok(id,p.x*T+Math.cos(a*Math.PI/4)*r,p.y*T+Math.sin(a*Math.PI/4)*r))return true;return false};
c.portalTilesWalkable=maps.every(id=>portals(id).every(p=>{const r=portalWalk(id,p);if(!r)fail('portalTilesWalkable',id+':'+p.id+'@'+p.x+','+p.y);return r}));
c.portalsReachable=maps.every(id=>portals(id).every(p=>{const r=reach[id].near(p.x*T,p.y*T,80);if(!r)fail('portalsReachable',id+':'+p.id+'@'+p.x+','+p.y);return r}));
c.portalDestinationsWalkable=maps.every(id=>{const[dm,d0,d1]=DEST[id];const r=ok(dm,d0*T,d1*T);if(!r)fail('portalDestinationsWalkable',id+'->'+dm+'@'+d0+','+d1);return r});
c.hubPortalsMirrorPlan=portals('hub').every(p=>{const q=G.world.maps.hub.portals.find(a=>a.id===p.id);return q&&q.x===p.x&&q.y===p.y});
c.extractionTargetsAreQuaysPortals=C.quests.flatMap(q=>q.stages).filter(s=>s.type==='extract').every(s=>G.world.maps.quays.portals.some(p=>p.id===s.targetId));
// hub objects use harbor anchors; interior anchors are reached through building doors and are only required to exist.
const pos=o=>{if(o.mapId==='hub'&&H){const a=H.plan.anchors[o.id];return a?(a.interior?'interior':a):null}return o};
const objReach=(list,key)=>list.every(o=>{if(!reach[o.mapId])return true;const p=pos(o);if(p==='interior')return true;const r=!!p&&reach[o.mapId].near(p.x*T,p.y*T,56);if(!r)fail(key,o.mapId+':'+o.id+'@'+(p?p.x+','+p.y:'no-anchor'));return r});
c.containersReachable=objReach(C.containers,'containersReachable');
c.interactablesReachable=objReach(C.interactables,'interactablesReachable');
c.npcsReachable=objReach(C.npcs,'npcsReachable');
c.factionAgentHomesReachable=objReach(C.factionAgents.map(a=>({...a,x:a.homeX??a.x,y:a.homeY??a.y})),'factionAgentHomesReachable');
c.questTargetsReachable=C.quests.every(q=>q.stages.every(s=>{const o=C.containers.find(x=>x.id===s.targetId)||C.interactables.find(x=>x.id===s.targetId)||C.npcs.find(x=>x.id===s.targetId);if(!o)return true;const r=objReach([o],'questTargetsReachable');if(!r)fail('questTargetsReachable',q.id+'/'+(s.id||s.type));return r}));
c.entityMapIdsExist=[...C.containers,...C.interactables,...C.npcs,...C.factionAgents,...C.worldEvents].every(o=>{const r=maps.includes(o.mapId);if(!r)fail('entityMapIdsExist',o.id+':'+o.mapId);return r});
// ---- data integrity
const qids=new Set(C.quests.map(q=>q.id));
c.questIdsUnique=qids.size===C.quests.length;
c.questGiversExist=C.quests.every(q=>!q.offeredBy||nid.has(q.offeredBy));
c.questPrereqsExist=C.quests.every(q=>(q.prerequisites||[]).every(p=>qids.has(p)&&p!==q.id));
const tgt={talk:nid,give:nid,loot:cid,interact:iid,extract:new Set(maps.flatMap(m=>G.world.maps[m].portals.map(p=>p.id)))};
c.questStageTargetsExist=C.quests.every(q=>q.stages.every(s=>{const r=tgt[s.type]?.has(s.targetId);if(!r)fail('questStageTargetsExist',q.id+'/'+s.id+':'+s.type+':'+s.targetId);return r}));
c.questRewardItemsExist=C.quests.every(q=>(q.rewards?.items||[]).every(i=>items.has(i.itemId)));
const lt=new Set(C.lootTables.map(t=>t.id));
c.containerLootValid=C.containers.every(o=>(!o.lootTableId||lt.has(o.lootTableId))&&(o.guaranteedItems||[]).every(i=>items.has(i.itemId)));
c.lootTableItemsExist=C.lootTables.every(t=>t.entries.every(e=>{const r=items.has(e.itemId);if(!r)fail('lootTableItemsExist',t.id+':'+e.itemId);return r}));
c.shopStockItemsExist=C.shops.every(s=>nid.has(s.ownerNpcId)&&s.stock.every(i=>items.has(i.itemId)));
const dl=new Set(C.dialogues.map(d=>d.id));
c.npcDialoguesExist=C.npcs.every(n=>!n.dialogueId||dl.has(n.dialogueId));
c.weaponItemsExist=C.weapons.every(w=>items.has(w.itemId)&&items.has(w.ammoId));
c.enemyDropsExist=C.enemies.every(e=>(!e.drop||items.has(e.drop))&&(e.parts||[]).every(p=>(!p.drop||items.has(p.drop))&&(!p.rareDrop||items.has(p.rareDrop))));
c.contentIdsUnique=['items','containers','interactables','npcs','enemies','lootTables'].every(k=>new Set(C[k].map(o=>o.id)).size===C[k].length);
// ---- raid spawns & drops
G.setArea('hub',34,36);G.mode='play';G.save.completedRaids=2;G.beginRaid();const R=G.raid;
c.raidEnemiesOnWalkable=R.enemies.every(e=>{const r=ok('quays',e.x,e.y);if(!r)fail('raidEnemiesOnWalkable',e.id+':'+e.type+'@'+Math.round(e.x)+','+Math.round(e.y));return r});
c.raidEnemiesReachable=R.enemies.every(e=>{const r=reach.quays.near(e.x,e.y,64);if(!r)fail('raidEnemiesReachable',e.id+'@'+Math.round(e.x)+','+Math.round(e.y));return r});
for(const e of R.enemies.slice())if(!e.dead)try{G.hurtEnemy(e,1e6)}catch(x){fail('killAll',String(x))}
c.raidDropsValid=R.drops.length>0&&R.drops.every(d=>{const r=items.has(d.id)&&reach.quays.near(d.x,d.y,40);if(!r)fail('raidDropsValid',d.id+'@'+Math.round(d.x)+','+Math.round(d.y));return r});
G.endRaid(true,'QA audit');G.close();
// ---- raid loop x5
const tot=o=>Object.values(o||{}).reduce((a,b)=>a+b,0);
const bag0=JSON.stringify(G.save.bag),stash0=JSON.stringify(G.save.stash),runs=[];let loopOk=true,uniq=true,leak=true;
for(let i=0;i<5;i++){G.setArea('hub',34,36);G.beginRaid();const r=G.raid;if(!r){loopOk=false;break}runs.push(r.enemies.length);uniq&&=new Set(r.enemies.map(e=>e.id)).size===r.enemies.length;leak&&=!r.enemies.some(e=>e.dead)&&r.drops.length===0;G.endRaid(true,'QA loop '+i);G.close();loopOk&&=!G.raid&&G.mapId==='hub'}
c.raidLoopCompletes=loopOk&&runs.length===5;
c.raidLoopNoActorGrowth=uniq&&leak&&Math.max(...runs)<=Math.min(...runs)+4&&Math.max(...runs)<200;
c.raidLoopNoItemDuplication=JSON.stringify(G.save.bag)===bag0&&JSON.stringify(G.save.stash)===stash0;
if(!c.raidLoopNoItemDuplication)fail('raidLoopNoItemDuplication',bag0+' -> '+JSON.stringify(G.save.bag)+' | '+stash0+' -> '+JSON.stringify(G.save.stash));
// ---- save round-trip
G.save.bag={scrap_metal:7,rope:2,bolt:5};G.save.stash={ration:4,bandage:1};G.save.flags={...G.save.flags,qaAudit:'x1'};
const vac=chronicle.vacant;chronicle.setVacant(false);G.store();const raw=chronicle.get(SAVE_KEY);chronicle.setVacant(vac),saved=JSON.parse(raw);
c.saveSerializes=saved.bag.scrap_metal===7&&saved.stash.ration===4&&saved.flags.qaAudit==='x1';
G.save.bag={};G.save.stash={};G.save.flags={};
await G.applySave({text:async()=>raw});
c.saveRoundTripInventory=G.save.bag.scrap_metal===7&&G.save.bag.rope===2&&G.save.bag.bolt===5;
c.saveRoundTripStash=G.save.stash.ration===4&&G.save.stash.bandage===1;
c.saveRoundTripFlags=G.save.flags?.qaAudit==='x1';
c.applySaveLandsWalkable=G.mapId==='hub'&&!G.raid&&(!H||(H.state.room===null&&H.walk(H.state.x,H.state.y)));
}catch(e){c.EXCEPTION=String(e&&e.stack||e).slice(0,400)}
Math.random=rnd;removeEventListener('error',onErr);removeEventListener('unhandledrejection',onErr);
c.noPageErrorsDuringAudit=errs.length===0;if(errs.length)fail('noPageErrorsDuringAudit',errs.slice(0,5));
for(const k in c)if(c[k]!==true&&detail[k])c[k]='FAIL '+JSON.stringify(detail[k]).slice(0,600);
return c}`;
