// Dialogue presentation: speech box above the speaker, portraits left (speaker) / right (player), typing, keys.
module.exports=`()=>{const c={},G=SALTWAKE_DEV.game,D=window.saltwakeDialogue;c.loaded=!!D;
G.close();G.setArea('hub',34,36);G.mode='play';
const n=G.world.content.npcs.find(x=>x.id==='n_dockmaster');const key=k=>dispatchEvent(new KeyboardEvent('keydown',{key:k,bubbles:true,cancelable:true}));
const keep=D.cps;D.cps=55;G.talk(n);const L=document.getElementById('panelLayer'),P=document.getElementById('panel');
c.opensAsSpeechBox=!L.hidden&&L.classList.contains('sw-dialogue')&&!!P.querySelector('.swDlgBody');
c.portraitsBothSides=!!P.querySelector('.swFace.npc img')&&!!P.querySelector('.swFace.player img')&&P.querySelector('.swFace.npc').getBoundingClientRect().left<P.querySelector('.swFace.player').getBoundingClientRect().left;
c.fallbackPortrait=P.querySelector('.swFace.npc img').getAttribute('src')!=='';
c.choicesWaitForLine=P.querySelector('.swChoices').hidden===true;
key(' ');c.skipTyping=!D.typing&&P.querySelector('.swChoices').hidden===false&&/seawall/.test(P.querySelector('.swLine').textContent);
c.playerSideLit=P.querySelector('.swFace.player').classList.contains('speaking')&&!P.querySelector('.swFace.npc').classList.contains('speaking');
const r=P.getBoundingClientRect();c.boxPositioned=P.style.getPropertyValue('left')!==''&&Math.abs(r.left-parseFloat(P.style.getPropertyValue('left')))<1;
c.gamePaused=G.isPaused();
const n0=G.dialogue.node;key('3');c.numberKeyChooses=G.dialogue&&G.dialogue.node!==n0;
D.finishLine();key(' ');c.singleChoiceContinues=!G.dialogue||G.dialogue.node!=='tides';
G.close();c.closeCleansUp=L.hidden&&!L.classList.contains('sw-dialogue')&&P.style.getPropertyValue('left')===''&&!D.typing;
G.journal();c.otherPanelsUnaffected=!L.classList.contains('sw-dialogue');G.close();D.cps=keep;return c}`;
