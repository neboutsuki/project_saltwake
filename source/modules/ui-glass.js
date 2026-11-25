/* SALTWAKE v0.31 — "Glass" UI theme.
 * Dark translucent panels over a full-bleed game view. Pure presentation: no game state is read or written
 * except the theme preference (localStorage saltwake.ui.theme). Classic theme remains available in settings.
 */
(()=>{'use strict';
const KEY='saltwake.ui.theme';
let theme='glass';try{theme=localStorage.getItem(KEY)==='classic'?'classic':'glass'}catch{}
const css=`
html.sw-glass{
 --gl-bg:rgba(8,11,15,.46);--gl-bg-strong:rgba(9,12,17,.72);--gl-bg-solid:rgba(10,13,18,.9);
 --gl-edge:rgba(255,255,255,.09);--gl-edge-hi:rgba(255,255,255,.18);
 --gl-text:#eef1f4;--gl-muted:#9aa5ae;--gl-dim:#6c7780;
 --gl-accent:#8fd4e8;--gl-accent-soft:rgba(143,212,232,.16);--gl-warm:#f0b56a;--gl-danger:#ef6f5e;--gl-ok:#7fd6a4;
 --gl-blur:blur(14px) saturate(1.25);--gl-radius:12px;--gl-shadow:0 8px 32px rgba(0,0,0,.35);
 --ui-gold:var(--gl-accent);--ui-text:var(--gl-text);--ui-muted:var(--gl-muted);--ui-edge:var(--gl-edge-hi);
 --ui-surface:var(--gl-bg);--ui-raised:rgba(255,255,255,.05);--ui-red:var(--gl-danger);--ui-green:var(--gl-ok);
 --gold:var(--gl-accent);--ink:var(--gl-text);--muted:var(--gl-muted);--line:var(--gl-edge-hi);--panel:var(--gl-bg-strong)}
html.sw-glass body{background:#05070a!important;color:var(--gl-text)!important;font-family:Inter,'Segoe UI',system-ui,sans-serif!important}
/* Full-bleed game view: no web-page frame. */
html.sw-glass #shell{max-width:none!important;width:100%!important;border:0!important;box-shadow:none!important;background:#05070a!important}
html.sw-glass #viewport{background:#05070a!important}
/* Top bar becomes a floating glass pill. */
html.sw-glass #bar{position:absolute!important;top:10px!important;left:50%!important;right:auto!important;transform:translateX(-50%);z-index:9;
 min-height:0!important;padding:4px 6px!important;gap:4px!important;border-radius:999px!important;
 background:var(--gl-bg)!important;backdrop-filter:var(--gl-blur);-webkit-backdrop-filter:var(--gl-blur);
 border:1px solid var(--gl-edge)!important;box-shadow:var(--gl-shadow)!important;pointer-events:auto}
html.sw-glass #bar .wordmark{display:none!important}
html.sw-glass #bar nav{gap:2px!important}
html.sw-glass #bar nav button{background:transparent!important;border:0!important;border-radius:999px!important;color:var(--gl-muted)!important;
 padding:5px 11px!important;font-size:12px!important;font-weight:600!important;letter-spacing:.02em;box-shadow:none!important;transition:background .15s,color .15s}
html.sw-glass #bar nav button:hover,html.sw-glass #bar nav button:focus-visible,html.sw-glass #bar nav button[aria-current],html.sw-glass #bar nav button.active{background:rgba(255,255,255,.08)!important;color:var(--gl-text)!important}
html.sw-glass kbd{background:rgba(255,255,255,.07)!important;border:1px solid var(--gl-edge)!important;color:var(--gl-muted)!important;border-radius:4px!important;box-shadow:none!important;font-size:10px!important}
/* Shared glass surface for every HUD block. */
html.sw-glass #missionHud,html.sw-glass #tideHud,html.sw-glass .vitals,html.sw-glass .weaponReadout,html.sw-glass #toast,html.sw-glass #interactPrompt,html.sw-glass #field-readout,html.sw-glass #engineMonitor{
 background:var(--gl-bg)!important;backdrop-filter:var(--gl-blur);-webkit-backdrop-filter:var(--gl-blur);
 border:1px solid var(--gl-edge)!important;border-radius:var(--gl-radius)!important;box-shadow:var(--gl-shadow)!important;color:var(--gl-text)!important}
html.sw-glass #missionHud{border-left:1px solid var(--gl-edge)!important}

html.sw-glass #missionHud .questMeta,html.sw-glass #trackerLabel,html.sw-glass .eyebrow,html.sw-glass .weaponState span{color:var(--gl-accent)!important;letter-spacing:.14em!important}
html.sw-glass #questName{color:var(--gl-text)!important;font-family:inherit!important;font-weight:700!important}
html.sw-glass #questObjective,html.sw-glass #clockText,html.sw-glass #weatherReadout{color:var(--gl-muted)!important}
html.sw-glass #minimap,html.sw-glass #chartMap{border-radius:8px!important;border:1px solid var(--gl-edge)!important;background:rgba(0,0,0,.25)!important}
html.sw-glass #lanternToggle,html.sw-glass #chartToggle{background:rgba(255,255,255,.04)!important;border:1px solid var(--gl-edge)!important;border-radius:8px!important;color:var(--gl-text)!important}
html.sw-glass #hud{left:14px!important;right:14px!important;bottom:14px!important}
html.sw-glass .meter .track,html.sw-glass .track{background:rgba(255,255,255,.08)!important;border:0!important;border-radius:999px!important;height:6px!important;overflow:hidden}
html.sw-glass #hpBar,html.sw-glass .meter .health{background:linear-gradient(90deg,#d9534a,#f08a6a)!important;border-radius:999px!important}
html.sw-glass #stBar,html.sw-glass .meter .stamina{background:linear-gradient(90deg,#5fbf9a,#9fe3c1)!important;border-radius:999px!important}
html.sw-glass .meter span{color:var(--gl-muted)!important;font-size:11px!important;text-transform:uppercase;letter-spacing:.1em}
html.sw-glass .meter b{color:var(--gl-text)!important;font-variant-numeric:tabular-nums}
html.sw-glass #quickSlots{filter:none!important}
html.sw-glass #quickSlots>*{background:var(--gl-bg)!important;backdrop-filter:var(--gl-blur);-webkit-backdrop-filter:var(--gl-blur);border:1px solid var(--gl-edge)!important;border-radius:10px!important;box-shadow:0 4px 14px rgba(0,0,0,.3)!important}
html.sw-glass #quickSlots>*:hover{border-color:var(--gl-edge-hi)!important}
html.sw-glass #weaponName{color:var(--gl-text)!important;font-family:inherit!important}
html.sw-glass #ammoText{color:var(--gl-accent)!important;font-variant-numeric:tabular-nums}
html.sw-glass #placeRail{position:absolute!important;left:50%!important;top:52px!important;bottom:auto!important;transform:translateX(-50%);background:transparent!important;border:0!important;
 color:var(--gl-muted)!important;font-size:11px!important;pointer-events:none;z-index:2;text-shadow:0 1px 3px #000;white-space:nowrap;gap:8px!important;min-height:0!important}
html.sw-glass #placeRail>:not(#locationLabel):not(.placePin){display:none!important}
html.sw-glass .meter{grid-template-columns:62px 1fr 30px!important;column-gap:8px!important}
html.sw-glass .meter span{font-size:10px!important;letter-spacing:.08em!important}
html.sw-glass #shell:has(#panelLayer:not([hidden])) #bar,html.sw-glass #shell:has(#panelLayer:not([hidden])) #placeRail{display:none!important}
html.sw-glass #panelLayer #panel .panelBody,html.sw-glass #panelLayer #panel>div{background:transparent!important}
/* Menus: a centered glass sheet over the dimmed, blurred game instead of a full-screen page. */
html.sw-glass #panelLayer:not([hidden]){display:flex!important;align-items:center!important;justify-content:center!important;background:rgba(3,5,8,.5)!important;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);padding:3vh 3vw!important}
html.sw-glass #panelLayer #panel{width:min(1180px,100%)!important;height:min(90vh,900px)!important;max-height:94vh!important;display:flex!important;flex-direction:column!important;margin:auto!important;
 background:var(--gl-bg-strong)!important;backdrop-filter:var(--gl-blur);-webkit-backdrop-filter:var(--gl-blur);
 border:1px solid var(--gl-edge)!important;border-top:1px solid var(--gl-edge-hi)!important;border-radius:16px!important;box-shadow:0 24px 80px rgba(0,0,0,.55)!important;overflow:hidden!important}
html.sw-glass #panelLayer #panel h1,html.sw-glass #panelLayer #panel h2,html.sw-glass #panelLayer #panel h3,html.sw-glass #panelLayer #panelTitle{color:var(--gl-text)!important;font-family:inherit!important;font-weight:700!important;letter-spacing:.01em}
html.sw-glass #panelLayer #panel>header,html.sw-glass #panelLayer #panel .panelHead,html.sw-glass #panelLayer #panel nav{background:transparent!important;border-color:var(--gl-edge)!important}
html.sw-glass #panelLayer #panel section,html.sw-glass #panelLayer #panel .card,html.sw-glass #panelLayer #panel .callout,html.sw-glass #panelLayer #panel [class*=card],html.sw-glass #panelLayer #panel [class*=Card],html.sw-glass #panelLayer #panel aside,html.sw-glass #panelLayer #panel fieldset{
 background:rgba(255,255,255,.035)!important;border:1px solid var(--gl-edge)!important;border-radius:10px!important;box-shadow:none!important}
html.sw-glass #panelLayer #panel button,html.sw-glass .tide-menu button,html.sw-glass #screen button,html.sw-glass .tide-prologue button{
 background:rgba(255,255,255,.05)!important;border:1px solid var(--gl-edge)!important;border-radius:8px!important;color:var(--gl-text)!important;box-shadow:none!important;transition:background .15s,border-color .15s}
html.sw-glass #panelLayer #panel button:hover,html.sw-glass .tide-menu button:hover,html.sw-glass #screen button:hover{background:rgba(255,255,255,.1)!important;border-color:var(--gl-edge-hi)!important}
html.sw-glass #panelLayer #panel button.primary,html.sw-glass #panelLayer #panel button[class*=primary],html.sw-glass #panelLayer #panel [aria-selected=true],html.sw-glass #panelLayer #panel .active{background:var(--gl-accent-soft)!important;border-color:rgba(143,212,232,.45)!important;color:#dff4fa!important}
html.sw-glass #panelLayer #panel input,html.sw-glass #panelLayer #panel select,html.sw-glass #panelLayer #panel textarea{background:rgba(0,0,0,.3)!important;border:1px solid var(--gl-edge)!important;border-radius:8px!important;color:var(--gl-text)!important}
html.sw-glass #panelLayer #panel input:focus,html.sw-glass #panelLayer #panel select:focus{outline:2px solid rgba(143,212,232,.5)!important;outline-offset:1px}
html.sw-glass #panelLayer #panel small,html.sw-glass #panelLayer #panel .fine,html.sw-glass #panelLayer #panel p{color:var(--gl-muted)}
html.sw-glass #panelLayer #panel b,html.sw-glass #panelLayer #panel strong{color:var(--gl-text)}
html.sw-glass #panelLayer #panel ::-webkit-scrollbar{width:8px;height:8px}html.sw-glass #panelLayer #panel ::-webkit-scrollbar-thumb{background:rgba(255,255,255,.14);border-radius:8px}
html.sw-glass #panelLayer #panel::-webkit-scrollbar{width:8px}html.sw-glass #panelLayer #panel::-webkit-scrollbar-thumb{background:rgba(255,255,255,.14);border-radius:8px}
html.sw-glass #panelLayer #panel .entryRow[aria-pressed="true"],html.sw-glass #panelLayer #panel .mapPlace.active,html.sw-glass #panelLayer #panel .modeSwitch button[aria-pressed="true"]{background:var(--gl-accent-soft)!important;border:1px solid rgba(143,212,232,.4)!important;box-shadow:none!important;color:#e6f6fb!important}
html.sw-glass #panelLayer #panel .entryRow{border-bottom-color:var(--gl-edge)!important}
html.sw-glass #panelLayer #panel .panelBody .inkPrimary{background:var(--gl-accent)!important;color:#071318!important;border-color:var(--gl-accent)!important}
html.sw-glass #panelLayer #panel .mapDirectory,html.sw-glass #panelLayer #panel .callout{background:rgba(255,255,255,.035)!important;border-color:var(--gl-edge)!important}
html.sw-glass #panelLayer #panel [style*="border-top"]{border-top-color:var(--gl-edge)!important}
/* Title screen: keep the painting, frost the menu column. */
html.sw-glass #screenBox{background:linear-gradient(90deg,rgba(5,8,12,.78),rgba(5,8,12,.35) 55%,transparent)!important;border:0!important;box-shadow:none!important}
html.sw-glass .tide-menu button{text-align:left;padding:13px 18px!important;font-weight:600!important;backdrop-filter:var(--gl-blur);-webkit-backdrop-filter:var(--gl-blur);background:rgba(10,14,20,.45)!important}
html.sw-glass .tide-menu button:disabled{opacity:.45}
html.sw-glass #screen h1{letter-spacing:.06em}
html.sw-glass #screen .eyebrow{color:var(--gl-accent)!important}
html.sw-glass .tide-prologue .tide-training{background:var(--gl-bg-strong)!important;backdrop-filter:var(--gl-blur);border:1px solid var(--gl-edge)!important;border-radius:16px!important}

/* ---- Neutralize the legacy green/gold palette ---- */
html.sw-glass #shell,html.sw-glass #panelLayer #panel,html.sw-glass #screen,html.sw-glass .tide-prologue{color:var(--gl-text)!important}
html.sw-glass :is(#shell,#screen,.tide-prologue) :is(p,span,small,em,i,div,dt,dd,li,td,th,label,h1,h2,h3,h4,h5,b,strong,button,a,article,section,aside,header):not([class*=danger]):not([class*=warn]):not([class*=bad]):not([class*=alert]):not([class*=red]):not([class*=good]):not([class*=rare]):not([class*=epic]):not([class*=legend]):not([class*=uncommon]):not([class*=hostile]):not([class*=friend]){color:var(--gl-text)!important}
html.sw-glass :is(#shell,#screen,.tide-prologue) :is(small,dt,label,.fine,.titleStory,.titleLocation,.pi-weapon-numbers,.sp-cap,.sp-count,.folioPlace,.meter span,#questDestination,#envEffectText,#clockText,#weatherReadout,.vitalFlags,.chevron,.sk-heading small,.pi-progress,.pi-rank,.pi-id,.questReward,[class*=note],[class*=hint],[class*=sub],[class*=muted],[class*=desc],[class*=meta]):not([class*=danger]):not([class*=warn]){color:var(--gl-muted)!important}
html.sw-glass :is(#shell,#screen,.tide-prologue) :is(.eyebrow,.voyage-kicker,.pi-kicker,.eq-group-label,.sk-heading,[class*=kicker],[class*=eyebrow],[class*=label]:not(label)){color:var(--gl-accent)!important;letter-spacing:.14em}
html.sw-glass #screen h1{color:#f4f7f9!important;text-shadow:0 4px 30px rgba(0,0,0,.55)}
/* Card-like surfaces inside menus and the profile/prologue screens. */
html.sw-glass :is(#panelLayer,#screen,.tide-prologue) :is(.pi-card,.pi-stat,.pi-weapon,.pi-status,.nextStep,.itemHero,.inspection,.path-status,.sp-grid,.sp-tools,.faces-preview,.tide-profile-row,.factionEntry,.eq-slot,.eq-icon,.packTools,.sealArt,.tide-card,.tide-training,.questReward,.sk-panel,[class*=card],[class*=Card],[class*=tile],[class*=Tile]){
 background:rgba(255,255,255,.04)!important;background-image:none!important;border-color:var(--gl-edge)!important;box-shadow:none!important}
html.sw-glass :is(#panelLayer,#screen) :is(.eq-slot.eq-empty){background:rgba(255,255,255,.015)!important;border-style:dashed!important}
html.sw-glass :is(#panelLayer,#screen) :is(.pi-weapon.pi-held,.eq-slot.eq-active,.active,[aria-pressed=true],[aria-selected=true],[aria-current],.selected,.is-selected,.current){
 background:var(--gl-accent-soft)!important;border-color:rgba(143,212,232,.45)!important;box-shadow:none!important}
html.sw-glass #panelLayer #panel :is(button,[role=tab]){box-shadow:none!important}
html.sw-glass #panelLayer #panel :is(button,[role=tab])::after{background:var(--gl-accent)!important;border-color:var(--gl-accent)!important}
html.sw-glass :is(#panelLayer,#screen) :is(.pi-metertrack){background:rgba(255,255,255,.08)!important;border:0!important;border-radius:999px!important}
html.sw-glass :is(#panelLayer,#screen) :is(.pi-metertrack>*,.pi-meter i,.pi-progress i,progress){background:var(--gl-accent)!important}
html.sw-glass :is(#panelLayer,#screen) .pi-status.good{background:rgba(127,214,164,.1)!important;border-color:rgba(127,214,164,.35)!important;color:var(--gl-ok)!important}
html.sw-glass :is(#panelLayer,#screen) .badge{background:rgba(255,255,255,.07)!important;border-color:var(--gl-edge)!important}
html.sw-glass :is(#panelLayer,#screen) :is(blockquote,.callout,[style*=border-left]){border-left-color:var(--gl-accent)!important}
html.sw-glass :is(#panelLayer,#screen) b{border-color:var(--gl-edge)!important}
html.sw-glass .tide-prologue{background:rgba(3,5,8,.82)!important;background-image:none!important}
html.sw-glass #tideSteps>*{background:rgba(255,255,255,.05)!important;border-color:var(--gl-edge)!important}
/* HUD leftovers. */
html.sw-glass .tideDot{background:var(--gl-accent)!important;box-shadow:0 0 8px rgba(143,212,232,.6)!important}
html.sw-glass :is(#alphaGoal,#environmentMission,#sprintLoad){border-color:var(--gl-edge)!important;background:rgba(255,255,255,.04)!important}
html.sw-glass #voyageHintText{background:rgba(255,255,255,.05)!important;border:1px solid var(--gl-edge)!important;border-radius:8px!important}
html.sw-glass .quickSlot,html.sw-glass .quickSlot *{color:var(--gl-text)!important}
html.sw-glass #stBar,html.sw-glass .meter .stamina{background:linear-gradient(90deg,#4fa3c7,#8fd4e8)!important}
html.sw-glass #awarenessText{color:var(--gl-text)!important}
html.sw-glass #voyageHint button,html.sw-glass #missionHud button[data-act=voyage_hide]{background:rgba(255,255,255,.06)!important;border:1px solid var(--gl-edge)!important;border-radius:6px!important;color:var(--gl-muted)!important}
html.sw-glass #panelLayer #panel .badge{color:var(--gl-text)!important;background:rgba(255,255,255,.07)!important;border:1px solid var(--gl-edge)!important;border-radius:999px!important}
html.sw-glass #panelLayer #panel .repTrack{background:rgba(255,255,255,.08)!important;border:0!important;border-radius:999px!important;overflow:hidden}
html.sw-glass #panelLayer #panel progress,html.sw-glass #panelLayer #panel meter{appearance:none;-webkit-appearance:none;height:6px;border:0;border-radius:999px;background:rgba(255,255,255,.08)!important;overflow:hidden}
html.sw-glass #panelLayer #panel progress::-webkit-progress-bar{background:rgba(255,255,255,.08);border-radius:999px}
html.sw-glass #panelLayer #panel progress::-webkit-progress-value{background:linear-gradient(90deg,#4fa3c7,#8fd4e8);border-radius:999px}
html.sw-glass #panelLayer #panel meter::-webkit-meter-bar{background:rgba(255,255,255,.08);border:0;border-radius:999px}
html.sw-glass #panelLayer #panel meter::-webkit-meter-optimum-value{background:#8fd4e8}
html.sw-glass #panelLayer #panel .sp-item.sp-selected{outline-color:var(--gl-accent)!important;box-shadow:0 0 0 1px rgba(143,212,232,.35),0 0 14px rgba(143,212,232,.25)!important}
html.sw-glass #panelLayer #panel :is(.eq-heading,.sk-heading,.sk-empty,dl.numbers,hr,kbd,span[class=""],.itemHero){border-color:var(--gl-edge)!important}
html.sw-glass #panelLayer #panel hr{background:var(--gl-edge)!important;border:0;height:1px}
html.sw-glass :is(#fieldHarborMap,#mapCanvas,#pathMap,#minimap){filter:saturate(.45) brightness(.92) contrast(1.05);border-radius:10px}
html.sw-glass #panelLayer #panel :is(#fieldHarborMap,#mapCanvas,#pathMap){border:1px solid var(--gl-edge)!important}
html.sw-glass ::selection{background:rgba(143,212,232,.3)}
/* Perf: no live backdrop blur over the animating game view (cost scales with screen size); menus keep it. */
html.sw-glass :is(#bar,#quickSlots>*,#toast,#interactPrompt,#field-readout,#engineMonitor,#missionHud,#tideHud,.vitals,.weaponReadout){backdrop-filter:none!important;-webkit-backdrop-filter:none!important}
html.sw-glass #bar{background:rgba(8,11,15,.62)!important}html.sw-glass #quickSlots>*{background:rgba(8,11,15,.6)!important}
@media (prefers-reduced-transparency:reduce){html.sw-glass{--gl-bg:rgba(10,13,18,.92);--gl-bg-strong:rgba(10,13,18,.97)}}
@media (max-width:760px){html.sw-glass #bar{top:6px!important;max-width:96vw;overflow-x:auto}html.sw-glass #bar nav button{padding:4px 7px!important;font-size:11px!important}}
`;
const style=document.createElement('style');style.id='sw-glass-theme';style.textContent=css;document.head.append(style);
const apply=()=>{document.documentElement.classList.toggle('sw-glass',theme==='glass');document.documentElement.dataset.uiTheme=theme};apply();
window.saltwakeTheme={get theme(){return theme},set(t){theme=t==='classic'?'classic':'glass';try{localStorage.setItem(KEY,theme)}catch{}apply();return theme}};
const P=Game.prototype,gp=P.graphicsPanel;
P.graphicsPanel=function(...a){const out=gp.apply(this,a);const body=$('panel')?.querySelector('.engineOptions');if(body&&!$('swTheme')){
 body.insertAdjacentHTML('afterbegin',`<label>Interface theme<select id="swTheme"><option value="glass" ${theme==='glass'?'selected':''}>Glass · dark translucent (default)</option><option value="classic" ${theme==='classic'?'selected':''}>Classic · original panels</option></select></label>`);
 $('swTheme').onchange=e=>window.saltwakeTheme.set(e.target.value)}return out};
})();
