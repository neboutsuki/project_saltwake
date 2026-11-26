// Survival operations: beacon, escalating waves, call-ins (stratagem codes), boat evac and the commission reward.
module.exports=`()=>{const c={},G=SALTWAKE_DEV.game,SV=window.saltwakeSurvival,T=32,dt=1/30;c.loaded=!!SV;
const backup=JSON.stringify(G.save),notify=G.notify;G.notify=()=>{};const errs=[];
const step=s=>{for(let t=0;t<s;t+=dt){if(!G.raid)return;try{G.update(dt)}catch(x){errs.push(String(x));return}}};
try{const C=G.world.content.living_expeditions.contracts;c.contracts=['surv_pilot','surv_market','surv_night'].every(id=>C.some(k=>k.id===id&&k.steps[0].kind==='survive'))&&!!LIVING_CONTRACTS.surv_pilot;
 if(G.raid)G.endRaid(true,'x');G.close();G.setArea('hub',33.5,27.6);G.mode='play';G.save.completedRaids=3;G.save.hunter={xp:5000,rank:8};
 const st=G.livingState();st.active={id:'surv_pilot'};G.beginRaid();G.close();G.mode='play';G.raid.living.eligible=true;
 const S=SV.ensure(G);c.stateIdle=!!S&&S.phase==='idle';
 // light the beacon at the site with E
 const p=G.player;p.x=S.site.x;p.y=S.site.y+20;G.interact();c.beaconLit=S.phase==='waves'&&!!S.zone;
 // waves spawn and escalate
 p.hp=100;p.iframes=999;step(4);const w1=G.raid.enemies.filter(e=>e.surv).length;c.firstWave=S.wave>=1&&w1>=3;
 S.next=0;step(.1);c.escalates=S.wave>=2&&G.raid.enemies.filter(e=>e.surv).length>w1;
 c.huntersKnow=G.raid.enemies.filter(e=>e.surv&&!e.dead).every(e=>e.awareness==='alert'&&Math.abs(e.lastSeenX-p.x)<1);
 // call-in code entry through the real keyboard (hold X, type), supply pod pickup
 const key=(type,code)=>window.dispatchEvent(new KeyboardEvent(type,{code,bubbles:true}));
 key('keydown','KeyX');for(const k of ['KeyS','KeyS','KeyW','KeyD'])key('keydown',k);key('keyup','KeyX');
 c.codeEntry=S.calls.some(x=>x.id==='supply')&&S.cd.supply>0&&!G.keys.KeyS;
 const call=S.calls.find(x=>x.id==='supply');step(4);c.podLands=S.pods.length===1;const ammo=Object.keys(S.pods[0]?.items||{}).length;
 const bag0=JSON.stringify(G.save.bag);p.x=S.pods[0].x;p.y=S.pods[0].y;step(.1);window.__pp={ammo,len:S.pods.length,raid:!!G.raid};c.podPickup=ammo>=3&&JSON.stringify(G.save.bag)!==bag0&&S.pods.length===0;
 // a wrong code resets
 SV.input(G,'U');SV.input(G,'U');c.wrongCodeResets=S.input.length===0;
 // mortar damages monsters around the mark; cannon is one big blast; friendly fire hurts the player
 const tgt=G.raid.enemies.find(e=>e.surv&&!e.dead);tgt.hp=tgt.maxHp=2000;tgt.x=p.x+200;tgt.y=p.y;const hp0=tgt.hp;
 SV.call(G,'cannon',tgt.x,tgt.y);step(3);c.cannonHits=tgt.hp<hp0-150&&SV.stats.blasts>0;
 S.cd.mortar=0;SV.call(G,'mortar',p.x+400,p.y);step(2.7);c.mortarShells=S.shells.length===6;step(4);
 p.iframes=0;p.hp=100;S.shells.push({x:p.x,y:p.y,t:.05,max:.9,R:58,dmg:150,ff:30});step(.2);c.mortarFriendlyFire=p.hp<100&&!!G.raid;p.iframes=999;p.hp=100;
 // evac: boat comes in, board at the shore circle, commission completes, raid ends as an extraction
 S.t=S.seconds;step(.1);c.evacPhase=S.phase==='evac'&&!!S.boat;S.evacT=.05;step(.2);c.boardPhase=S.phase==='board';
 const gold=G.save.gold,done=st.completed||0;p.x=S.zone.x;p.y=S.zone.y;p.hp=100;step(2.5);
 c.evacuated=!G.raid&&SV.stats.wins>=1&&(G.livingState().completed||0)>done&&G.save.gold>gold;
 G.close();G.mode='play';
 // HUD shows during a survival raid and hides after
 c.hudHidden=document.getElementById('swSurv')?.hidden!==false;
}catch(x){errs.push(String(x&&x.stack||x))}
finally{if(G.raid){G.endRaid(true,'x');G.close()}G.save=JSON.parse(backup);G.quest=new G.quest.constructor(G);G.notify=notify;G.store();G.mode='play'}
c.noErrors=errs.length===0;window.__svAudit={errs,stats:SV.stats};return c}`;
