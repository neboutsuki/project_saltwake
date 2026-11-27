// Map preloading: whole-map load into memory on entry, loading screen pauses play, title-screen preparation.
module.exports=`async()=>{const c={},G=SALTWAKE_DEV.game,TX=window.saltwakeTiles,PL=window.saltwakePreload;c.loaded=!!PL&&typeof TX.loadMap==='function';
 const n=G.notify;G.notify=()=>{};try{G.close();G.setArea('hub',33.5,27.6);G.mode='play';
  let steps=0;const ok=await TX.loadMap(G,'hub',()=>steps++);c.hubLoadsWhole=ok&&TX.mapLoaded(G,'hub');
  // the loading screen pauses the game while a map loads (QA mode skips it, so test the pause directly)
  PL.loading=true;window.SALTWAKE_QA=false;const p1=G.isPaused();PL.loading=false;window.SALTWAKE_QA=true;c.loadingPauses=p1===true&&!G.isPaused();
  c.overlay=!!document.getElementById('swLoading');
 }finally{G.notify=n}return c}`;
