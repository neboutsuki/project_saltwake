/* SALTWAKE v0.31 — HUD layout (hunter-style).
 * Upper left: vitals + status, equipped weapon card (translucent silhouette + ammunition) directly below.
 * Upper right: quest tracker with a quest-type tag (HUNT / RECOVERY / EXPEDITION / CONTACT / INVESTIGATE ...).
 * Lower left: tide / weather / minimap panel.
 * Pure presentation: existing HUD elements are re-parented, never recreated, so all game updates by id still work.
 */
(()=>{'use strict';
const P=Game.prototype;
// Icons are image files (assets/ui/*.svg, pack art-v031); the HUD only references them.
const ART=window.SALTWAKE_ASSETS.images,ui=n=>ART['ui/'+n]||'';
const img=(n,cls='')=>ui(n)?`<img class="${cls}" src="${ui(n)}" alt="" draggable="false">`:'';
const SIL={arbalest:img('weapon_arbalest'),wickcaster:img('weapon_wickcaster'),spear:img('weapon_spear'),unknown:''};
const AMMO={bolt:img('ammo_bolt'),cell:img('ammo_cell')};
for(const n of ['heart','stamina','bleed'])document.documentElement.style.setProperty('--sw-icon-'+n,`url("${ui(n)}")`);
const weaponKind=t=>/arbalest/i.test(t)?'arbalest':/wick/i.test(t)?'wickcaster':/spear|melee/i.test(t)?'spear':'unknown';
const css=`
#swHudLeft{position:absolute;top:14px;left:14px;width:262px;display:flex;flex-direction:column;gap:8px;z-index:4;pointer-events:none}
#swHudLeft>*{position:static!important;width:auto!important;max-width:none!important;margin:0!important;pointer-events:auto}
#swHudLeft .vitals{min-height:0!important;height:auto!important;padding:10px 12px!important}
#swHudLeft .weaponReadout{display:grid!important;grid-template-columns:64px 1fr!important;grid-template-rows:auto auto auto!important;column-gap:12px!important;row-gap:2px!important;align-items:center;min-height:0!important;height:auto!important;padding:10px 12px!important;text-align:left}
#swHudLeft .weaponReadout #uiWeaponArt{display:none!important}
#swHudLeft .weaponReadout>:not(#swWeaponSil){grid-column:2!important;grid-row:auto!important}
#swHudLeft .weaponReadout #weaponName{font-size:15px!important;line-height:1.2}
#swHudLeft .weaponReadout>small:not(#ammoText),#swHudLeft .weaponReadout>p{font-size:10px!important;color:#6c7780!important}
#swWeaponSil{grid-column:1!important;grid-row:1/span 5!important;width:64px;height:64px;color:rgba(255,255,255,.82);filter:drop-shadow(0 0 6px rgba(143,212,232,.25))}
#swWeaponSil img{width:100%;height:100%;opacity:.82;image-rendering:auto}
#swAmmo{display:flex;align-items:center;gap:6px;font-variant-numeric:tabular-nums}
#swAmmo img{width:16px;height:16px;opacity:.85}
#swAmmo b{font-size:15px}#swAmmo small{color:var(--gl-muted,#9aa5ae)}
#swHudLeft .weaponReadout #ammoText{display:none!important}
#hud{position:absolute!important;left:0!important;right:0!important;bottom:14px!important;top:auto!important;display:flex!important;justify-content:center!important;align-items:flex-end!important;pointer-events:none;grid-template-columns:none!important}
#hud #quickSlots{position:static!important;transform:none!important;margin:0 auto!important;pointer-events:auto}
#missionHud{top:14px!important;right:14px!important;left:auto!important;width:min(300px,34vw)!important;max-width:34vw!important}
#tideHud{top:auto!important;bottom:14px!important;left:14px!important;right:auto!important}
#swQuestType{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:0 0 6px}
#swQuestType .tag{font-size:10px;font-weight:800;letter-spacing:.14em;padding:3px 8px;border-radius:999px;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.06);color:#eef1f4}
#swQuestType .tag.hunt{background:rgba(239,111,94,.16);border-color:rgba(239,111,94,.5);color:#ffc9bf}
#swQuestType .tag.recovery{background:rgba(240,181,106,.14);border-color:rgba(240,181,106,.45);color:#ffe2b8}
#swQuestType .tag.expedition{background:rgba(143,212,232,.15);border-color:rgba(143,212,232,.45);color:#d9f3fb}
#swQuestType .tag.contact,#swQuestType .tag.investigate{background:rgba(180,160,240,.13);border-color:rgba(180,160,240,.4);color:#e2dbff}
#swQuestType .tag.main{background:transparent;color:#9aa5ae}
#swQuestType .target{font-size:11px;color:#eef1f4;width:100%}
#swQuestType .target b{color:#ffc9bf}

/* ---- Minimal HUD (v0.31b): icons + bars, no panels or labels ---- */
#swHudLeft{gap:10px;width:240px}
#swHudLeft .vitals,#swHudLeft .weaponReadout{background:none!important;border:0!important;box-shadow:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;padding:0!important}
#swHudLeft .meter{display:grid!important;grid-template-columns:18px 1fr 30px!important;align-items:center;column-gap:8px!important;margin:0 0 6px!important}
#swHudLeft .meter>span{font-size:0!important;width:18px;height:18px;background:center/contain no-repeat;filter:drop-shadow(0 1px 2px #000)}
#swHudLeft .meter:nth-of-type(1)>span{background-image:var(--sw-icon-heart)}
#swHudLeft .meter:nth-of-type(2)>span{background-image:var(--sw-icon-stamina)}
#swHudLeft .meter .track{height:8px!important;background:rgba(0,0,0,.45)!important;box-shadow:0 0 0 1px rgba(255,255,255,.08),0 2px 6px rgba(0,0,0,.4)}
#swHudLeft .meter b{font-size:12px!important;text-shadow:0 1px 3px #000;color:#eef1f4!important}
#swHudLeft #sprintLoad{display:none!important}
#swHudLeft .vitalFlags{display:flex!important;gap:6px;min-height:0!important;margin-top:2px}
#swHudLeft #bleedText:not([hidden]){font-size:0!important;width:22px;height:22px;border-radius:50%;background:rgba(200,40,40,.35) center/14px no-repeat var(--sw-icon-bleed);box-shadow:0 0 0 1px rgba(255,107,94,.6),0 0 10px rgba(255,80,70,.5);animation:swPulse 1s ease-in-out infinite}
#swHudLeft #statusText:not([hidden]){font-size:10px!important;padding:2px 7px;border-radius:999px;background:rgba(0,0,0,.4);color:#eef1f4!important;text-shadow:none}
@keyframes swPulse{50%{opacity:.55}}
#swHudLeft .weaponReadout{grid-template-columns:56px auto!important;justify-content:start;column-gap:10px!important;cursor:pointer}
#swHudLeft .weaponReadout>.weaponState,#swHudLeft .weaponReadout>#weaponName,#swHudLeft .weaponReadout>#sprintAmmo,#swHudLeft .weaponReadout>small:not(#ammoText),#swHudLeft .weaponReadout>p{display:none!important}
#swWeaponSil{width:56px!important;height:56px!important;grid-row:1!important;color:rgba(255,255,255,.75)!important;filter:drop-shadow(0 1px 3px rgba(0,0,0,.8))!important}
#swAmmo{grid-row:1!important;align-self:center;text-shadow:0 1px 3px #000}
#swAmmo b{font-size:22px!important;color:#fff!important}#swAmmo small{font-size:13px!important;color:rgba(255,255,255,.65)!important}
#swAmmo img{width:18px!important;height:18px!important;filter:drop-shadow(0 1px 2px #000)}
/* Round minimap, single info line, lantern icon. */
html #tideHud,html.sw-glass #tideHud{background:none!important;border:0!important;box-shadow:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;padding:0!important;width:auto!important;max-width:none!important;display:flex!important;flex-direction:column;align-items:center;gap:6px}
#tideHud>:not(#chartBody):not(#swMapInfo){display:none!important}
#tideHud #chartBody{display:block!important;position:relative}
#tideHud #chartMap{display:block!important;width:150px!important;height:150px!important;padding:0!important;border-radius:50%!important;overflow:hidden!important;border:2px solid rgba(255,255,255,.18)!important;box-shadow:0 4px 18px rgba(0,0,0,.5),inset 0 0 0 1px rgba(0,0,0,.4)!important;background:rgba(8,11,15,.6)!important;position:relative}
#tideHud #minimap{position:absolute;left:50%;top:50%;height:150px!important;width:auto!important;max-width:none!important;transform:translate(-50%,-50%);border:0!important;border-radius:0!important}
#swMapInfo{display:flex;align-items:center;gap:8px;font-size:12px;color:#eef1f4;text-shadow:0 1px 3px #000;white-space:nowrap}
#swMapInfo .dot{width:7px;height:7px;border-radius:50%;background:#8fd4e8;box-shadow:0 0 6px #8fd4e8}
#swMapInfo .timer{color:#ffd0a0}
#swLantern{width:26px;height:26px;border-radius:50%;border:1px solid rgba(255,255,255,.15);background:rgba(0,0,0,.4);display:grid;place-items:center;cursor:pointer;padding:0;position:absolute;right:-4px;bottom:4px;z-index:2}
#swLantern img{width:15px;height:15px;opacity:.4}
#swLantern.lit{border-color:rgba(255,190,110,.6);box-shadow:0 0 10px rgba(255,170,80,.5)}#swLantern.lit img{opacity:1;filter:sepia(1) saturate(4) hue-rotate(-12deg) brightness(1.1)}

/* ---- Simple quest tracker (v0.31c): type tag, title, objective. Full details live in the Journal. ---- */
html #missionHud,html.sw-glass #missionHud{background:none!important;border:0!important;box-shadow:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;padding:0!important;text-align:right;width:min(300px,34vw)!important}
#missionHud>:not(#swQuestType):not(#questName):not(#questObjective){display:none!important}
#missionHud #swQuestType{justify-content:flex-end;margin:0 0 4px}
#missionHud #swQuestType .tag:not(:first-child){display:none}
#missionHud #swQuestType .target{text-align:right;text-shadow:0 1px 3px #000}
#missionHud #questName{display:block;width:100%;text-align:right;background:none!important;border:0!important;padding:0!important;font-size:17px!important;color:#fff!important;text-shadow:0 1px 4px #000,0 0 12px rgba(0,0,0,.6);cursor:pointer}
#missionHud #questObjective{margin:2px 0 0!important;font-size:12.5px!important;color:rgba(238,241,244,.85)!important;text-shadow:0 1px 3px #000}
#missionHud #questObjective::before{content:'◆ ';color:#8fd4e8;font-size:9px;vertical-align:1px}
`;
const style=document.createElement('style');style.id='sw-hud-layout';style.textContent=css;document.head.append(style);
function mount(){const hud=$('hud'),vp=$('viewport');if(!hud||!vp||$('swHudLeft'))return;const box=document.createElement('div');box.id='swHudLeft';
 const vit=hud.querySelector('.vitals'),wpn=hud.querySelector('.weaponReadout');if(vit)box.append(vit);if(wpn){box.append(wpn);const s=document.createElement('span');s.id='swWeaponSil';s.setAttribute('aria-hidden','true');wpn.prepend(s);const a=document.createElement('span');a.id='swAmmo';wpn.append(a)}
 vp.append(box);
 const mh=$('missionHud');if(mh&&!$('swQuestType')){const t=document.createElement('div');t.id='swQuestType';mh.querySelector('#questName')?.before(t)}}
mount();
const TYPE={kill:['hunt','HUNT'],hunt:['hunt','HUNT'],loot:['recovery','RECOVERY'],cache:['recovery','SALVAGE'],extract:['expedition','EXPEDITION'],talk:['contact','CONTACT'],interact:['investigate','INVESTIGATE'],trace:['investigate','TRACKING'],quiet_cache:['recovery','STEALTH SALVAGE']};
const enemyName=id=>{const e=(SALTWAKE_DEV.world.content.enemies||[]).find(e=>e.id===id||e.type===id);return e?.name||String(id||'').replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())};
function questInfo(G){const tags=[];let target='';
 const r=G.raid,liv=r?.living,lc=liv&&(G.world.content.living_expeditions?.contracts||[]).find(c=>c.id===liv.id);
 if(lc){const step=lc.steps[liv.step||0]||lc.steps[0];const cat=String(lc.category||'');const t=TYPE[step?.kind]||['expedition','EXPEDITION'];
  tags.push([/HUNT|PART BREAK/.test(cat)?'hunt':/SALVAGE/.test(cat)?'recovery':/TRACK|SURVEY/.test(cat)?'investigate':t[0],cat||t[1]]);
  if(step?.kind==='kill')target=`Target: <b>${safe(enemyName(step.target))}</b> × ${step.need||1}`;}
 const q=G.quest?.current?.();if(q){const pr=G.save?.quests?.[q.id];const st=pr&&pr.status==='active'?q.stages[pr.stage]:q.stages[0];const t=TYPE[st?.type]||['expedition','EXPEDITION'];
  if(!lc)tags.push(t);if(st?.type==='kill'&&!target)target=`Target: <b>${safe(enemyName(st.targetId))}</b> × ${st.count||1}`;if(q.kind==='main')tags.push(['main','MAIN STORY'])}
 if(r&&!tags.some(t=>t[0]==='expedition'))tags.push(['expedition','ON EXPEDITION']);
 return {tags,target}}
const safe=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

const LANTERN=img('lantern');
function mountMap(){const th=$('tideHud'),body=$('chartBody');if(!th||!body||$('swMapInfo'))return;const info=document.createElement('div');info.id='swMapInfo';th.append(info);
 const b=document.createElement('button');b.id='swLantern';b.type='button';b.title='Lantern (T)';b.setAttribute('aria-label','Toggle lantern');b.innerHTML=LANTERN;b.onclick=e=>{e.stopPropagation();SALTWAKE_DEV.game.toggleLantern?.()};body.append(b)}
let lastInfo='';
function updateMap(G){mountMap();const info=$('swMapInfo');if(!info)return;const phase=$('phaseText')?.textContent||'',clock=($('clockText')?.textContent||'').split('·')[0].trim(),wx=($('weatherReadout')?.textContent||'').trim().split(/\s+/)[0]||'',ex=($('sprintTime')?.textContent||'').match(/\d+:\d\d/);
 const html=`<span class="dot"></span><span>${safe(phase)}</span><span>${safe(wx)}</span><span>${safe(clock)}</span>${ex&&G.raid?`<span class="timer">⏱ ${ex[0]}</span>`:''}`;if(html!==lastInfo){lastInfo=html;info.innerHTML=html}
 const l=$('swLantern');if(l){const lit=G.lanternOn!==false;l.classList.toggle('lit',lit);l.hidden=!G.raid&&G.mapId==='hub'?false:false}}
let lastQ='',lastW='';
const hud=P.hud;P.hud=function(...a){const out=hud.apply(this,a);mount();updateMap(this);
 const box=$('swQuestType');if(box){const {tags,target}=questInfo(this);const html=tags.map(([c,l])=>`<span class="tag ${c}">${safe(l)}</span>`).join('')+(target?`<div class="target">${target}</div>`:'');if(html!==lastQ){lastQ=html;box.innerHTML=html}}
 const name=$('weaponName')?.textContent||'',ammo=$('ammoText')?.textContent||'',kind=weaponKind(name);const sig=kind+'|'+ammo;
 if(sig!==lastW){lastW=sig;const s=$('swWeaponSil');if(s)s.innerHTML=SIL[kind];const am=$('swAmmo');if(am){const m=ammo.match(/(\d+)\s*\/\s*(\d+)/);const icon=kind==='wickcaster'?AMMO.cell:kind==='arbalest'?AMMO.bolt:'';
   const n=ammo.match(/\d+/);am.innerHTML=m?`${icon}<b>${m[1]}</b><small>/ ${m[2]}</small>`:kind==='spear'?'':n?`${icon}<b>${n[0]}</b>`:''}}
 return out};
window.saltwakeHudLayout={questInfo:G=>questInfo(G||SALTWAKE_DEV.game),weaponKind};
})();
