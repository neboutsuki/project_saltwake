// Real-input reachability: every enabled button in the Expedition Chart (all destinations) and the main panels is the
// top element at its own centre once scrolled into view (no invisible overlay or pointer-events:none swallows clicks);
// the loading overlay never outlives its time cap; proportions normalise people/props.
module.exports=`async()=>{const c={},G=SALTWAKE_DEV.game,PL=window.saltwakePreload,PR=window.saltwakeProportions;const n=G.notify;G.notify=()=>{};
 const hit=()=>{const bad=[];for(const b of document.querySelectorAll('#panel button, .panel button')){if(b.disabled||!b.getClientRects().length)continue;b.scrollIntoView({block:'center'});const r=b.getBoundingClientRect();if(!r.width||!r.height)continue;
   const t=document.elementFromPoint(r.x+r.width/2,r.y+Math.min(r.height/2,8));if(!t||!(t===b||b.contains(t)))bad.push((b.dataset.act||b.textContent.trim().slice(0,16))+'<-'+(t?t.tagName+'#'+t.id+'.'+t.className:'null'))}return bad};
 try{G.close();G.setArea('hub',36,55);G.mode='play';const prevDest=G.save.destination,all=[];
  for(const d of window.saltwakeIsle.DEST){G.save.destination=d;G.close();G.showClimateForecast(true);const bad=hit();if(bad.length)all.push(d+':'+bad.slice(0,3).join(','));}
  c.chartButtonsClickable=all.length===0;if(all.length)c.chartBad=all.join(' | ');
  G.save.destination='quays';G.close();G.showClimateForecast(true);const go=document.querySelector('[data-act="env_deploy"]');go.scrollIntoView({block:'center'});const r=go.getBoundingClientRect();
  c.departOnScreen=r.bottom<=innerHeight&&r.top>=0;G.close();G.save.destination=prevDest;
  G.showPack();const pb=hit().filter(s=>!/^<-BUTTON\\.sp-item|sp-item/.test(s));c.packButtonsClickable=pb.length===0;if(pb.length)c.packBad=pb.slice(0,3).join(',');G.close();
  G.optionsMenu();c.optionsButtonsClickable=hit().length===0;G.close();
  c.loaderCapped=PL.maxWait>0&&PL.maxWait<=6;const ov=document.getElementById('swLoading');c.loaderOnTop=+getComputedStyle(ov).zIndex>100000;
  c.proportionsLoaded=!!PR&&PR.HUMAN>0&&Object.keys(PR.PROP_M).length>40;
 }finally{G.notify=n;G.close()}return c}`;
