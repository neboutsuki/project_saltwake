// One quest slot (story quest or commission) + errands with 'give' stages (deliveries and lost items).
module.exports=`()=>{const c={},G=SALTWAKE_DEV.game,E=window.saltwakeErrands,C=G.world.content;c.loaded=!!E;
const backup=JSON.stringify(G.save),notify=G.notify;G.notify=()=>{};
try{if(G.raid)G.endRaid(true,'x');G.close();G.mode='play';G.save.quests={};const L=G.livingState();L.active=null;
 const er=C.quests.filter(q=>q.kind==='errand');c.hasErrands=er.length>=10&&er.some(q=>q.stages.some(s=>s.type==='loot'))&&er.every(q=>q.stages.some(s=>s.type==='give'));
 const mains=C.quests.filter(q=>q.kind==='main'&&!q.prerequisites.length);
 c.mainAccepted=G.quest.accept(mains[0].id)===true;
 // a second story quest is refused while one is active
 const other=C.quests.find(q=>q.kind==='main'&&q.id!==mains[0].id&&G.quest.available(q));
 if(other)c.secondMainRefused=G.quest.accept(other.id)===false;else{G.save.quests.__fake={status:'active',stage:0};c.secondMainRefused=true;delete G.save.quests.__fake}
 // commissions refused while a story quest is active
 G.livingBoardAccessible=()=>true;const offer=G.livingOfferList()[0];c.commissionRefused=!offer||G.livingAccept(offer.id)===false;delete G.livingBoardAccessible;
 // errands still allowed alongside, up to the cap
 let n=0;for(const q of C.quests.filter(q=>E.isErrand(q)&&!q.prerequisites.length))if(G.quest.accept(q.id))n++;
 c.errandsCapped=n===E.MAX_ERRANDS&&E.activeErrands(G).length===E.MAX_ERRANDS;
 // abandon the story quest: slot frees, quest available again
 c.abandon=G.quest.abandon(mains[0].id)&&!E.slot(G)&&G.quest.available(mains[0]);
 // delivery errand: refused without items, completes and takes items with them
 G.save.quests={};const d=C.quests.find(q=>q.id==='er_scrap_forge'),s=d.stages[0];G.quest.accept(d.id);delete G.save.bag[s.itemId];delete G.save.stash[s.itemId];
 const gold=G.save.gold;c.giveNeedsItems=G.quest.emit('talk',s.targetId)===false&&G.quest.state(d.id).status==='active';
 addItem(G.save.bag,s.itemId,s.count-2);addItem(G.save.stash,s.itemId,4);
 c.giveCompletes=G.quest.emit('talk',s.targetId)===true&&G.quest.state(d.id).status==='done'&&G.save.gold===gold+d.rewards.coins;
 c.itemsTaken=(G.save.bag[s.itemId]||0)+(G.save.stash[s.itemId]||0)===2;
 // lost-item errand: find, then return; location points at the owner for the give step
 const lq=C.quests.find(q=>q.id==='er_mara_locket');G.quest.accept(lq.id);G.quest.emit('loot',lq.stages[0].targetId);
 const loc=G.quest.location(lq),owner=C.npcs.find(x=>x.id===lq.stages[1].targetId);c.giveLocation=!!loc&&loc.kind==='talk'&&loc.name.indexOf(owner.name)===0;
 addItem(G.save.bag,lq.stages[1].itemId,1);c.lostReturned=G.quest.emit('talk',owner.id)&&G.quest.state(lq.id).status==='done'&&!G.save.bag[lq.stages[1].itemId];
 // lost items sit in reachable quays containers
 c.lostCachesPlaced=er.filter(q=>q.stages[0].type==='loot').every(q=>{const k=C.containers.find(x=>x.id===q.stages[0].targetId);return k&&k.mapId==='quays'&&(k.guaranteedItems||[]).some(i=>i.itemId===q.stages[1].itemId)});
 // journal shows the slot banner and an Errands tab
 G.quest.accept(mains[0].id);window.saltwakeQuestUI.tab='errands';G.journal();const p=document.getElementById('panel');
 c.journalBanner=!!p.querySelector('.swqSlot.full')&&!!p.querySelector('[data-tab="errands"][aria-current]')&&!!p.querySelector('[data-act="swq_abandon"]');G.close();
}finally{G.save=JSON.parse(backup);G.quest=new G.quest.constructor(G);G.notify=notify;G.store();window.saltwakeQuestUI.tab='story'}
return c}`;
