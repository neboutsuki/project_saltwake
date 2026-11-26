// Weapons overhaul: melee combos + heavy, knife backstab, greataxe sweep, charged ranged specials, pierce, harpoon reel/
// anchor, hit feel, forge additions (melee tab, harpoon tree, rank V Tidemaw upgrades).
module.exports=`()=>{const c={},G=SALTWAKE_DEV.game,W=window.saltwakeWeapons,T=32,dt=1/60;c.loaded=!!W;
const backup=JSON.stringify(G.save),notify=G.notify;G.notify=()=>{};const errs=[];
const step=(s)=>{for(let t=0;t<s;t+=dt){try{G.update(dt)}catch(e){errs.push(String(e));break}}};
let spot=null;
const setup=()=>{if(G.raid)G.endRaid(true,'x');G.close();G.setArea('hub',33.5,27.6);G.mode='play';G.save.completedRaids=3;G.beginRaid();G.close();G.mode='play';
 for(const e of G.raid.enemies){e.x=e.y=-99999;e.homeX=e.homeY=-99999}G.player.hp=100;G.player.st=100;G.player.cooldown=0;G.mouse.down=false;W.stop=0;
 if(!spot){const p=G.player;for(let r=0;r<2400&&!spot;r+=48)for(let k=0;k<12&&!spot;k++){const x=p.x+Math.cos(k/12*6.283)*r,y=p.y+Math.sin(k/12*6.283)*r;let ok=true;for(let dx=-60;dx<=340&&ok;dx+=16)for(const dy of [-40,0,40])if(!G.walkable(x+dx,y+dy))ok=false;if(ok)spot={x,y}}}
 G.player.x=spot.x;G.player.y=spot.y;G.player.angle=0};
const put=(e,dx,dy=0)=>{e.x=e.homeX=G.player.x+dx;e.y=e.homeY=G.player.y+dy;e.dead=false;e.hp=e.maxHp=Math.max(e.maxHp||0,400);e.aggro=0;e.awareness='unaware';e.attackCD=99;e.staggerGrace=0;return e};
const aim=()=>{G.player.angle=0;const z=G.camera.zoom;G.mouse.x=(G.player.x+300-G.camera.x)*z;G.mouse.y=(G.player.y-8-G.camera.y)*z};
const pick=f=>G.raid.enemies.find(f);
const melee=id=>{G.save.melee={owned:{spear:1,knife:1,greataxe:1},level:{},equipped:id};G.player.weapon=2};
try{
 c.spotFound=(setup(),!!spot);
 // light combo: three taps chain to the finisher
 melee('spear');let e=put(pick(x=>x.type!=='tidemaw'),62);let hp0=e.hp,c0=W.stats.combo3;
 for(let i=0;i<3;i++){aim();G.player.cooldown=0;W.startMelee(G,false);step(.45)}
 c.spearCombo=W.stats.combo3===c0+1&&e.hp<hp0;
 // heavy: hold to charge, release to strike; hits harder than a light
 setup();melee('spear');e=put(pick(x=>x.type!=='tidemaw'),62);hp0=e.hp;const h0=W.stats.heavy;aim();G.mouse.down=true;G.shoot();step(.75);G.mouse.down=false;step(.7);
 const heavyDmg=hp0-e.hp;c.heavyCharge=W.stats.heavy===h0+1&&heavyDmg>30;
 // knife backstab on an unaware monster
 setup();melee('knife');e=put(pick(x=>x.type!=='tidemaw'),40);hp0=e.hp;const b0=W.stats.backstabs;aim();W.startMelee(G,false);step(.3);c.knifeBackstab=W.stats.backstabs===b0+1&&hp0-e.hp>20;
 // greataxe sweep hits everything in the arc
 setup();melee('greataxe');const two=G.raid.enemies.filter(x=>x.type!=='tidemaw').slice(0,2);put(two[0],60,-30);put(two[1],60,30);const a0=two[0].hp,a1=two[1].hp;aim();W.startMelee(G,false);step(.6);
 c.axeSweep=two[0].hp<a0&&two[1].hp<a1;
 // charged ranged: full charge = special with pierce
 setup();const A=G.ensureArmory();A.owned.bow_I1=1;A.equipped[0]='bow_I1';G.player.weapon=0;G.player.mag[0]=1;addItem(G.save.bag,'arrow',10);G.player.reload=0;
 const s0=W.stats.specials,bl=G.raid.bullets.length;aim();G.mouse.down=true;G.shoot();step(.8);G.mouse.down=false;G.update(dt);
 const shot=G.raid.bullets.find(b=>b.fam==='bow');c.chargedSpecial=W.stats.specials===s0+1&&!!shot&&shot.pierce===2;
 // quick tap still fires a normal shot immediately
 setup();G.player.weapon=0;G.player.mag[0]=1;G.player.cooldown=0;aim();G.mouse.down=false;const n0=G.raid.bullets.length;G.shoot();c.tapFires=G.raid.bullets.length===n0+1&&!G.raid.bullets[n0].pierce;
 // pierce: one arrow through two monsters in a line
 setup();const line=G.raid.enemies.filter(x=>x.type!=='tidemaw').slice(0,2);put(line[0],120);put(line[1],240);const l0=line[0].hp,l1=line[1].hp;
 G.raid.bullets.push({x:G.player.x+20,y:G.player.y,vx:900,vy:0,t:1,damage:60,enemy:false,weaponId:'bow_I1',fam:'bow',pierce:1,penetration:4,stagger:.5,partPower:1});step(.5);
 c.pierce=line[0].hp<l0&&line[1].hp<l1;
 // harpoon: small monsters are reeled in, big ones anchored
 setup();const small=pick(x=>x.type!=='tidemaw'&&x.type!=='brineback');put(small,260);small.hp=small.maxHp=200;const d0=small.x-G.player.x;
 G.raid.bullets.push({x:G.player.x+20,y:G.player.y,vx:760,vy:0,t:1,damage:20,enemy:false,weaponId:'harpoon_I1',fam:'harpoon',penetration:20,stagger:1,partPower:1});step(.8);
 c.harpoonReel=W.stats.pulls>0&&small.x-G.player.x<d0-60;
 setup();const big=pick(x=>x.type==='brineback')||pick(x=>x.type!=='tidemaw');put(big,200);big.hp=big.maxHp=900;big.slowed=false;
 G.raid.bullets.push({x:G.player.x+20,y:G.player.y,vx:760,vy:0,t:1,damage:20,enemy:false,weaponId:'harpoon_I1',fam:'harpoon',penetration:20,stagger:1,partPower:1});step(.4);
 c.harpoonAnchor=big.slowed===true&&!!big.swAnchor;
 // hit feel fired, and hitstop never stalls the game
 c.hitFeel=W.stats.hitstops>3&&W.stats.shakes>3&&W.stop<.3;
 // drawing with every weapon, mid-attack and mid-charge
 let drew=true;for(const id of ['spear','knife','greataxe']){setup();melee(id);aim();W.startMelee(G,false);step(.1);try{G.render(performance.now())}catch(x){drew=false;errs.push(String(x))}
  G.mouse.down=true;step(.2);G.mouse.down=false;G.player.cooldown=0;try{G.render(performance.now())}catch(x){drew=false}}
 c.renders=drew;
 G.endRaid(true,'QA');G.close();G.mode='play';
 // forge: harpoon tree + rank V Tidemaw upgrades + melee tab crafting
 const fam=Object.keys(ARMORY.families);c.harpoonFamily=fam.includes('harpoon')&&ARMORY.weapons.filter(n=>n.family==='harpoon').length===15;
 const r5=ARMORY.weapons.filter(n=>n.rank===5);c.rankFive=r5.length===8&&r5.every(n=>n.materials.tidemaw_gill&&ARMORY.weapons.some(p=>p.id===n.parent));
 c.materialSources=G.armoryRequirements({tidemaw_gill:99}).indexOf('swwSrc')>0;
 const sa=G.smithyAllowed;G.smithyAllowed=()=>true;G.save.melee={owned:{spear:1},level:{},equipped:'spear'};G.save.gold=9999;addItem(G.save.bag,'scrap_metal',20);addItem(G.save.bag,'rope',5);
 G.armoryPanel('melee');const nodes=document.querySelectorAll('#panel .armNode').length;G.doAction('sww_craft',{dataset:{id:'knife'}});
 c.meleeCraft=nodes>=3&&G.save.melee.owned.knife===1&&G.save.melee.equipped==='knife';
 G.doAction('sww_up',{dataset:{id:'knife'}});c.meleeTab=!!document.querySelector('#panel [data-tab="melee"][aria-pressed="true"]');
 G.armorySelectedFamily='harpoon';G.armorySelectedNode=null;G.armoryPanel('weapons');c.harpoonTree=document.querySelectorAll('#panel .smithTreeNode').length===15;
 G.armorySelectedFamily='arbalest';G.armorySelectedNode='arbalest_redhook_R5L1';G.armoryPanel('weapons');c.rankFiveTree=!!document.querySelector('#panel .smithTreeNode[data-id="arbalest_redhook_R5L1"]')&&document.querySelector('#panel .panelBody').textContent.indexOf('undefined')<0;
 G.smithyAllowed=sa;G.close();
}catch(x){errs.push(String(x&&x.stack||x))}
finally{if(G.raid){G.endRaid(true,'x');G.close()}G.mouse.down=false;G.save=JSON.parse(backup);G.quest=new G.quest.constructor(G);G.notify=notify;G.store();G.mode='play'}
c.noErrors=errs.length===0;window.__weaponsAudit={errs,stats:W.stats};return c}`;
