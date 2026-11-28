// Townsfolk use the cast art style: every harbor walker and the escort profile get a baked townsfolk look
// (art/characters/townsfolk/*), story NPCs keep their cast member, and all people normalise to one height.
module.exports=`async()=>{const c={},G=SALTWAKE_DEV.game,F=window.saltwakeFaces,C=window.saltwakeCast,L=window.saltwakeHubLife,I=SALTWAKE_ASSETS.images;const n=G.notify;G.notify=()=>{};
 try{c.folkArt=C.folk.length===8&&C.folk.every(f=>['down_idle','up_idle','left_idle','right_idle','down_walk','up_walk'].every(k=>!!I['art/characters/townsfolk/'+f+'_'+k]));
  G.close();G.setArea('hub',36,40);G.mode='play';for(let i=0;i<20;i++)G.update(1/30);G.render(performance.now());G.render(performance.now());
  c.walkersStyled=L.walkers.length>0&&L.walkers.every(w=>C.folk.includes(w.profile?.cast));
  const looks=new Set(L.walkers.slice(0,8).map(w=>w.profile.cast));c.walkersVaried=looks.size>=Math.min(8,L.walkers.length);
  c.escortStyled=C.folk.includes(F.profile('dock',{id:'escort'}).cast);
  c.storyKeepsCast=F.profile('ledger',{id:'n_clerk'}).cast==='marin';
  const fac=Object.entries(window.saltwakeProportions.factors).filter(([k])=>/^face:folk_/.test(k)).map(([,v])=>v);c.folkNormalised=fac.length>0&&fac.every(v=>v>.7&&v<1.4);
 }finally{G.notify=n}return c}`;
