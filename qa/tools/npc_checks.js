// NPC life and voices: townsfolk routines (activities, chats, greetings, going home at night), story NPC greetings that
// react to time and the last expedition, the "How are you holding up?" personal lines, and passing call-outs.
module.exports=`async()=>{const c={},G=SALTWAKE_DEV.game,L=window.saltwakeHubLife,V=window.saltwakeVoice;const n0=G.notify;G.notify=()=>{};
 try{if(G.raid)G.endRaid(true,'qa');G.close();G.setArea('hub',36,30);G.mode='play';
  const day=Math.floor(G.save.environment.clock/1440)*1440+1440;let d0=null;for(let k=0;k<30&&!d0;k++){const t=day+k*1440+640;if(!/rain|squall|storm/.test(G.climateWeather(t).id))d0=t}
  G.save.environment.clock=d0;G.update(.05);c.graph=(G.world.maps.hub.life.spots||[]).length>=20&&(G.world.maps.hub.life.streets||[]).length>=5;
  const a0=L.stats.activities||0,ch0=L.stats.chats||0,gr0=L.stats.greets||0;G.player.x=36*32;G.player.y=31.8*32;
  for(let i=0;i<1500;i++){G.update(1/15);if(i===700){G.player.x=36*32;G.player.y=44.4*32}}
  c.townsfolkDoThings=(L.stats.activities||0)>a0;c.townsfolkChat=(L.stats.chats||0)>ch0;c.townsfolkGreet=(L.stats.greets||0)>gr0;
  c.onStreets=L.walkers.every(w=>w.x>0&&w.y>0&&w.x<72*32&&w.y<56*32);
  const nDay=L.walkers.length;G.save.environment.clock=d0+700;G.update(.05);c.homeAtNight=L.walkers.length<nDay&&L.all.some(w=>w.hidden);
  G.save.environment.clock=d0;G.update(.05);
  const n=G.world.content.npcs.find(x=>x.id==='n_medic');G.save.npcMem={};G.talk(n);let node=G.dialogue.dialogue.nodes.find(x=>x.id===G.dialogue.node);
  c.firstMeeting=node.text.startsWith('Sera Moll');const ci=node.choices.findIndex(x=>x.action?.type==='sw_chat');c.chatOption=ci>=0;
  G.choose(ci);const t1=G.dialogue.dialogue.nodes.find(x=>x.id===G.dialogue.node).text;G.close();G.talk(n);node=G.dialogue.dialogue.nodes.find(x=>x.id===G.dialogue.node);G.choose(node.choices.findIndex(x=>x.action?.type==='sw_chat'));
  const t2=G.dialogue.dialogue.nodes.find(x=>x.id===G.dialogue.node).text;G.close();c.personalLinesAdvance=t1!==t2&&V.NPC.n_medic.chat.includes(t1)&&V.NPC.n_medic.chat.includes(t2);
  G.talk(n);c.contextGreeting=!G.dialogue.dialogue.nodes.find(x=>x.id===G.dialogue.node).text.startsWith('Sera Moll');G.close();
  G.save.destination='quays';G.beginRaid();G.close();G.endRaid(false,'qa');G.close();G.setArea('hub',36,30);G.mode='play';
  G.talk(n);c.remembersFailure=V.NPC.n_medic.greet.fail.includes(G.dialogue.dialogue.nodes.find(x=>x.id===G.dialogue.node).text);G.close();
  G.talk(n);c.commentsOnce=!V.NPC.n_medic.greet.fail.includes(G.dialogue.dialogue.nodes.find(x=>x.id===G.dialogue.node).text);G.close();
  c.allStoryNpcsVoiced=G.world.content.npcs.filter(x=>x.mapId==='hub').every(x=>V.NPC[x.id]&&V.NPC[x.id].chat.length>=5);
  const k=G.world.content.npcs.find(x=>x.id==='n_mechanic'),at=G.npcLocation(k);V.lastCall={};V.cd=0;G.player.x=at.x+70;G.player.y=at.y+30;const calls=V.stats.calls;for(let i=0;i<5;i++)G.update(1/15);c.storyCallOuts=V.stats.calls>calls;
 }finally{G.notify=n0;G.close()}return c}`;
