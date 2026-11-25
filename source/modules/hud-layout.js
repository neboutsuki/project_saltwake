/* SALTWAKE v0.31 — HUD layout (hunter-style).
 * Upper left: vitals + status, equipped weapon card (translucent silhouette + ammunition) directly below.
 * Upper right: quest tracker with a quest-type tag (HUNT / RECOVERY / EXPEDITION / CONTACT / INVESTIGATE ...).
 * Lower left: tide / weather / minimap panel.
 * Pure presentation: existing HUD elements are re-parented, never recreated, so all game updates by id still work.
 */
(()=>{'use strict';
const P=Game.prototype;
const SIL={
 arbalest:'<svg viewBox="0 0 64 64"><path d="M6 30h40l6-4h6v12h-6l-6-4H6z"/><path d="M30 10c6 6 8 14 8 22s-2 16-8 22l-3-2c5-6 7-13 7-20s-2-14-7-20z"/><path d="M30 12 22 32l8 20" fill="none" stroke="currentColor" stroke-width="1.6"/><rect x="40" y="34" width="5" height="14" rx="1.5"/></svg>',
 wickcaster:'<svg viewBox="0 0 64 64"><rect x="6" y="26" width="34" height="12" rx="3"/><rect x="40" y="23" width="12" height="18" rx="2"/><path d="M52 29h7v6h-7z"/><rect x="14" y="38" width="7" height="14" rx="2"/><path d="M46 23c0-6 4-8 6-12 1 4-1 7-3 9z"/><circle cx="30" cy="32" r="2.5" fill="#0006"/></svg>',
 spear:'<svg viewBox="0 0 64 64"><path d="M8 56 46 18l3 3L11 59z"/><path d="M44 12 58 6l-6 14-6 2-4-4z"/><rect x="18" y="40" width="9" height="3" transform="rotate(-45 22 41)"/></svg>',
 unknown:'<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="14"/></svg>'};
const AMMO={
 bolt:'<svg viewBox="0 0 24 24"><path d="M3 21 17 7l2 2L5 23z"/><path d="M16 4l6-2-2 6-2 1-3-3z"/><path d="M3 18l3 3-4 1z"/></svg>',
 cell:'<svg viewBox="0 0 24 24"><rect x="7" y="4" width="10" height="17" rx="2"/><rect x="10" y="1" width="4" height="3"/><path d="M12 8l-2 5h3l-2 5" fill="none" stroke="#000a" stroke-width="1.5"/></svg>'};
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
#swWeaponSil svg{width:100%;height:100%;fill:currentColor}
#swAmmo{display:flex;align-items:center;gap:6px;font-variant-numeric:tabular-nums}
#swAmmo svg{width:16px;height:16px;fill:rgba(255,255,255,.8)}
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
let lastQ='',lastW='';
const hud=P.hud;P.hud=function(...a){const out=hud.apply(this,a);mount();
 const box=$('swQuestType');if(box){const {tags,target}=questInfo(this);const html=tags.map(([c,l])=>`<span class="tag ${c}">${safe(l)}</span>`).join('')+(target?`<div class="target">${target}</div>`:'');if(html!==lastQ){lastQ=html;box.innerHTML=html}}
 const name=$('weaponName')?.textContent||'',ammo=$('ammoText')?.textContent||'',kind=weaponKind(name);const sig=kind+'|'+ammo;
 if(sig!==lastW){lastW=sig;const s=$('swWeaponSil');if(s)s.innerHTML=SIL[kind];const am=$('swAmmo');if(am){const m=ammo.match(/(\d+)\s*\/\s*(\d+)/);const icon=kind==='wickcaster'?AMMO.cell:kind==='arbalest'?AMMO.bolt:'';
   am.innerHTML=m?`${icon}<b>${m[1]}</b><small>/ ${m[2]}</small>`:kind==='spear'?'<small>Melee · no ammunition</small>':`${icon}<small>${safe(ammo)}</small>`}}
 return out};
window.saltwakeHudLayout={questInfo:G=>questInfo(G||SALTWAKE_DEV.game),weaponKind};
})();
