// Quest integrity suite: run on every build so map/art/system changes can't silently break quests.
// Checks every quest and expedition contract references real data, that its targets are placed on a real map at a
// reachable spot, and plays every story quest start-to-finish through the real QuestEngine (save restored after).
module.exports=`()=>{const c={},G=SALTWAKE_DEV.game,C=G.world.content,T=32,bad=[];
const ids=a=>new Set((a||[]).map(x=>x.id));
const npcs=ids(C.npcs),conts=ids(C.containers),inter=ids(C.interactables),items=ids(C.items),quests=ids(C.quests);
const portals=new Set(Object.values(G.world.maps).flatMap(m=>(m.portals||[]).map(p=>p.id)));
const byId={};for(const a of [...C.npcs,...C.containers,...C.interactables])byId[a.id]=a;
const target={talk:npcs,give:npcs,loot:conts,interact:inter,extract:portals};
for(const q of C.quests){
 if(q.offeredBy&&!npcs.has(q.offeredBy))bad.push(q.id+': offeredBy '+q.offeredBy);
 for(const p of q.prerequisites||[])if(!quests.has(p))bad.push(q.id+': prerequisite '+p);
 if(!(q.stages||[]).length)bad.push(q.id+': no stages');
 for(const s of q.stages||[]){const set=target[s.type];if(!set)bad.push(q.id+'.'+s.id+': unknown stage type '+s.type);else if(!set.has(s.targetId))bad.push(q.id+'.'+s.id+': target '+s.targetId);if(!s.description)bad.push(q.id+'.'+s.id+': no description');if(s.type==='give'&&!items.has(s.itemId))bad.push(q.id+'.'+s.id+': give item '+s.itemId)}
 for(const it of q.rewards?.items||[])if(!items.has(it.itemId))bad.push(q.id+': reward item '+it.itemId)}
c.questReferences=bad.length===0;
// Prerequisite cycles
const seen={};const cyc=id=>{if(seen[id]===1)return true;if(seen[id]===2)return false;seen[id]=1;const q=C.quests.find(x=>x.id===id);const r=(q?.prerequisites||[]).some(cyc);seen[id]=2;return r};
c.noPrerequisiteCycles=!C.quests.some(q=>cyc(q.id));
// Guaranteed quest items exist; loot targets actually hold something.
c.questItemsExist=C.containers.every(k=>(k.guaranteedItems||[]).every(i=>items.has(i.itemId))&&(!k.lootTableId||C.lootTables.some(t=>t.id===k.lootTableId)));
// Placement: every quest target that lives on a map is on an existing map and reachable (walkable within 3 tiles).
const keepMap=G.mapId,unreach=[];
for(const q of C.quests)for(const s of q.stages||[]){const a=byId[s.targetId];if(!a)continue;
 if(!G.world.maps[a.mapId]){unreach.push(s.targetId+' (map '+a.mapId+')');continue}
 const M=G.world.maps[a.mapId];
 // The hub is drawn and collided by its own harbor renderer; people there stand inside their buildings. There a
 // target that belongs to a building needs that building must exist in the hub.
 if(a.mapId==='hub'){const okHub=(!a.buildingId||(M.buildings||[]).some(b=>b.id===a.buildingId));if(!okHub)unreach.push(s.targetId+' @hub building '+a.buildingId);continue}
 G.mapId=a.mapId;let ok=false;for(let r=0;r<=3&&!ok;r+=.5)for(let k=0;k<16&&!ok;k++){const an=k/16*Math.PI*2;ok=G.walkable((a.x+Math.cos(an)*r)*T,(a.y+Math.sin(an)*r)*T)}
 if(!ok)unreach.push(s.targetId+' @'+a.mapId+' '+a.x+','+a.y)}
G.mapId=keepMap;c.questTargetsReachable=unreach.length===0;
// Expedition contracts: kill/part targets are real monsters with that part; cache counts are achievable.
const en=Object.fromEntries(C.enemies.map(e=>[e.id,e]).concat(['brineworn_drifter','brineworn_caller','brineworn_breaker'].map(t=>[t,{parts:[]}]))),kinds=new Set(['cache','kill','part','trace','quiet_cache','escort','deliver','wound','hold','survive']),cbad=[];
const quaysCaches=C.containers.filter(k=>k.mapId==='quays').length;
for(const k of C.living_expeditions?.contracts||[]){if(!(k.steps||[]).length)cbad.push(k.id+': no steps');
 for(const s of k.steps||[]){if(!kinds.has(s.kind))cbad.push(k.id+': kind '+s.kind);
  if((s.kind==='kill'||s.kind==='part')&&!en[s.target])cbad.push(k.id+': monster '+s.target);
  if(s.kind==='part'&&en[s.target]&&!(en[s.target].parts||[]).some(p=>p.id===s.part))cbad.push(k.id+': part '+s.part);
  if(s.kind==='cache'&&s.need>quaysCaches+4)cbad.push(k.id+': needs '+s.need+' caches');
  if(!(s.need>0))cbad.push(k.id+': need '+s.need)}
 for(const it of k.reward?.items||[])if(!items.has(it.itemId))cbad.push(k.id+': reward '+it.itemId)}
c.contractReferences=cbad.length===0;
// Play every story quest start to finish through the real engine, in prerequisite order; restore the save after.
const backup=JSON.stringify(G.save),notify=G.notify;G.notify=()=>{};let played=0,stuck=[];
try{G.save.quests={};if(G.save.livingContracts)G.save.livingContracts.active=null;let guard=0,progress=true;
 while(progress&&guard++<50){progress=false;for(const q of C.quests){if(!G.quest.available(q))continue;
  if(!G.quest.accept(q.id)){stuck.push(q.id+': accept');continue}
  for(const s of q.stages){if(s.type==='give')addItem(G.save.bag,s.itemId,s.count||1);if(!G.quest.emit(s.type,s.targetId)){stuck.push(q.id+'.'+s.id);break}}
  if(G.quest.state(q.id)?.status==='done'){played++;progress=true}}}
 for(const q of C.quests)if(G.quest.state(q.id)?.status!=='done'&&!stuck.some(x=>x.startsWith(q.id)))stuck.push(q.id+': never available')}
finally{G.save=JSON.parse(backup);G.quest=new G.quest.constructor(G);G.notify=notify;G.store()}
c.allStoryQuestsCompletable=played===C.quests.length&&stuck.length===0;
window.__questAudit={bad,unreach,cbad,stuck,played};return c}`;
