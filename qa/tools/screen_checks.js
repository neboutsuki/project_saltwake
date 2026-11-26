// Fullscreen option + full-screen menus + the perf fixes (filter-free player outline, sprint dust outside the player).
module.exports=`()=>{const c={},G=SALTWAKE_DEV.game,SC=window.saltwakeScreen;c.loaded=!!SC&&typeof SC.toggle==='function';
const n=G.notify;G.notify=()=>{};try{G.close();G.mode='play';G.optionsMenu();const b=document.querySelector('#panel [data-act="sw_fullscreen"]');c.optionsButton=!!b;
 const r=document.getElementById('panel').getBoundingClientRect();c.menuFillsScreen=r.width>=window.innerWidth-2&&r.height>=window.innerHeight-2&&r.left<=1&&r.top<=1;
 G.journal();const r2=document.getElementById('panel').getBoundingClientRect();c.journalFillsScreen=r2.width>=window.innerWidth-2&&r2.height>=window.innerHeight-2;G.close();
 c.titleButton=!!document.querySelector('.tide-menu [data-act="sw_fullscreen"]')||!SC.supported;
 // perf: the player outline uses cached outlined frames (no canvas filter during the player draw)
 const P=window.saltwakePop;let filt=0;const desc=Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype,'filter');
 G.setArea('hub',33.5,27.6);G.mode='play';const ctx=document.getElementById('world').getContext('2d');Object.defineProperty(ctx,'filter',{configurable:true,get(){return desc.get.call(this)},set(v){if(v&&v!=='none')filt++;desc.set.call(this,v)}});
 try{G.coastPlayer?G.coastPlayer():G.draw25Player()}catch(e){}delete ctx.filter;c.outlineNoFilter=filt===0&&(P.stats.cached||0)>0;
}finally{G.notify=n;G.close();G.mode='play'}return c}`;
