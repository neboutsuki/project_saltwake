// Menu: Esc opens the book, Options tab, sub-pages return to Options, no menu bar in play, exit flow.
module.exports=`()=>{const c={},G=SALTWAKE_DEV.game,M=window.saltwakeMenu;c.loaded=!!M;
const esc=()=>document.dispatchEvent(new KeyboardEvent('keydown',{code:'Escape',key:'Escape',bubbles:true,cancelable:true}));
G.close();G.setArea('hub',34,36);G.mode='play';M.last='options';
c.barHiddenInPlay=getComputedStyle(document.getElementById('bar')).display==='none';
esc();c.escOpensMenu=G.panel==='OPTIONS · FIELD MENU'&&!!document.querySelector('#panel .swOptions');
const tabs=[...document.querySelectorAll('#panel .bookCategories button')].map(b=>b.dataset.ui);c.optionsTabLast=tabs.join()==='player,journal,pack,map,factions,options';
const P=document.getElementById('panel');const has=t=>[...P.querySelectorAll('.swOptions button')].some(b=>b.textContent.trim()===t);
c.hasSettings=['Resume','Save game','Controls','Sound','Graphics & performance','Back to main menu','Exit to desktop'].every(has);
P.querySelector('[data-go=audio_settings]').click();c.soundOpens=G.panel==='AUDIO SETTINGS'&&!!P.querySelector('.swOptBack');
esc();c.escBackToOptions=G.panel==='OPTIONS · FIELD MENU';
esc();c.escCloses=!G.panel;
G.journal();esc();c.escClosesJournal=!G.panel;esc();c.reopensLastTab=G.panel==='QUEST JOURNAL'&&[...document.querySelectorAll('#panel .bookCategories button')].some(b=>b.dataset.ui==='options');
document.querySelector('#panel [data-ui=options]').click();c.tabClickOpensOptions=G.panel==='OPTIONS · FIELD MENU';
G.close();G.doAction('sprint_menu');c.fieldMenuRedirects=G.panel==='OPTIONS · FIELD MENU';G.close();
window.saltwakeReunion?.key('escape');c.harborEscOpensMenu=!!G.panel&&G.panel!=='HARBOR CONTROLS';G.close();
G.save.completedRaids=3;G.beginRaid();G.optionsMenu();c.mainMenuLockedInRaid=P.querySelector('[data-act=swopt_title]').disabled;
P.querySelector('[data-act=swopt_exit]').click();c.exitWarnsInRaid=!document.getElementById('swExitConfirm').hidden&&!!G.raid;
G.close();G.endRaid(true,'QA menu');G.mode='play';G.close();M.last='options';return c}`;
