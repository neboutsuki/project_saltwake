// Quest display: many quests, journal tabs and detail, tracking, giver offers in dialogue, world marker.
module.exports=`()=>{const c={},G=SALTWAKE_DEV.game,U=window.saltwakeQuestUI,C=G.world.content;c.loaded=!!U;
c.manyQuests=C.quests.length>=19&&C.living_expeditions.contracts.length>=24;
const keep=JSON.stringify(G.save.quests),kt=G.save.trackedQuest;
if(G.raid)G.endRaid(true,'x');G.close();G.setArea('hub',33.5,27.6);G.mode='play';G.save.quests={};
G.quest.accept('q_empty_skiff');G.quest.accept('q_rations');c.acceptTracks=G.save.trackedQuest==='q_rations'&&G.quest.current().id==='q_rations';
U.tab='story';G.journal();const P=document.getElementById('panel');c.journalTabs=P.querySelectorAll('.swqTabs button').length>=3&&!!P.querySelector('.swqDetail .swqSteps li.now');
c.rewardsShown=!!P.querySelector('.swqRewards .swqScrip');
G.doAction('swq_track',{dataset:{id:'q_empty_skiff'}});c.trackButton=G.quest.current().id==='q_empty_skiff';G.close();
const n=C.npcs.find(x=>x.id==='n_tidepilot');G.talk(n);c.giverOffers=!!G.dialogue&&G.dialogue.dialogue.nodes.some(x=>x.id==='_swq_q_buoy_bells');G.close();
const m=U.stats.markers;G.render(performance.now());c.worldMarker=U.stats.markers>m;
G.save.quests=JSON.parse(keep);G.save.trackedQuest=kt;G.store();return c}`;
