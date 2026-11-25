/* SALTWAKE v0.34 — sky, time of day and weather presentation.
 * Built on the existing deterministic climate (save.environment.clock, COAST_CLIMATE weather buckets and periods).
 * Gameplay modifiers (sight, hearing, spread, wet rate, tide timing) are untouched; this layer only presents them:
 *   - continuous sun model with colour keyframes (night, pre-dawn, dawn, morning, noon, golden hour, sunset, blue hour);
 *   - weather fronts that blend into the next bucket over the final in-game hour instead of switching instantly;
 *   - wind (direction drifts, gusts), rain with surface wetness that builds and dries, fog density, cloud cover,
 *     lightning flashes in squalls, and ash intensity per weather;
 *   - sun-driven cast-shadow direction/length/strength, consumed by environment-fx.
 * The GPU renderer (post-fx) consumes window.saltwakeSky.state. When the GPU path is unavailable the original 2D
 * weather overlays stay in charge (ownsWeather=false).
 */
(()=>{'use strict';
const E=window.SALTWAKE_ENV||{weather:[],weatherIntervalMinutes:300};
const LOOK={clear:{rain:0,fog:0,cloud:.08,wind:.35,ash:.55},overcast:{rain:0,fog:.1,cloud:.7,wind:.55,ash:1},fog:{rain:0,fog:1,cloud:.6,wind:.15,ash:.25},
 rain:{rain:.6,fog:.22,cloud:.88,wind:.9,ash:.08},squall:{rain:1,fog:.3,cloud:1,wind:1.9,ash:0,storm:1}};
// minute-of-day, tint rgb, exposure
const KEYS=[[0,[.52,.62,.95],.66],[300,[.62,.64,.92],.7],[350,[1.12,.8,.74],.84],[430,[1.08,.96,.88],.95],[720,[1,1,1],1.02],[930,[1.17,.95,.76],1],
 [1060,[1.22,.8,.6],.88],[1130,[.78,.74,.98],.74],[1220,[.52,.62,.95],.66],[1440,[.52,.62,.95],.66]];
const lerp=(a,b,t)=>a+(b-a)*t,sm=t=>t*t*(3-2*t);
function keyAt(m){for(let i=0;i<KEYS.length-1;i++){const [a,ca,ea]=KEYS[i],[b,cb,eb]=KEYS[i+1];if(m>=a&&m<=b){const t=sm((m-a)/(b-a||1));return {tint:ca.map((v,k)=>lerp(v,cb[k],t)),expo:lerp(ea,eb,t)}}}return {tint:[1,1,1],expo:1}}
const S={minute:0,sunElev:0,tint:[1,1,1],expo:1,night:0,weather:'clear',next:'clear',blend:0,rain:0,fog:0,cloud:0,ash:1,wind:{x:.35,y:.05,s:.35},wet:0,flash:0,
 shadow:{shear:-.62,len:.42,alpha:.3},label:'',icon:'☀'};
let ownsWeather=false;
const SKY=window.saltwakeSky={state:S,get ownsWeather(){return ownsWeather},forecast,stats:{ticks:0,flashes:0}};
function weatherAt(G,clock){try{return G.climateWeather(clock)}catch{return E.weather[0]}}
function forecast(G=window.SALTWAKE_DEV?.game){if(!G)return null;const c=G.climateClock(),iv=E.weatherIntervalMinutes||300,left=iv-((c%iv)+iv)%iv;const nw=weatherAt(G,c+left+1);return {next:nw,inMinutes:Math.round(left)}}
let last=0,gust=0,windA=.15,nextFlash=0;
function tick(t){requestAnimationFrame(tick);const G=window.SALTWAKE_DEV?.game;if(!G?.climateClock)return;
 const dt=last?Math.min(.1,(t-last)/1000):0;last=t;SKY.stats.ticks++;
 ownsWeather=!!window.saltwakePost?.active;
 const clock=G.climateClock(),m=((clock%1440)+1440)%1440;S.minute=m;
 // Sun: rises ~05:30, sets ~18:30; elevation 0..1.
 const day=(m-330)/780;S.sunElev=day>0&&day<1?Math.sin(day*Math.PI):0;
 const k=keyAt(m);
 // Weather blend: the next bucket's front rolls in over the last 60 in-game minutes.
 const iv=E.weatherIntervalMinutes||300,pos=((clock%iv)+iv)%iv,override=G.raid?.weatherOverride;
 const cur=G.climateState().weather,nxt=override?cur:weatherAt(G,clock+(iv-pos)+1);const b=override?0:sm(Math.max(0,(pos-(iv-60))/60));
 S.weather=cur.id;S.next=nxt.id;S.blend=b;const A=LOOK[cur.id]||LOOK.clear,B=LOOK[nxt.id]||LOOK.clear,mix=key=>lerp(A[key]||0,B[key]||0,b);
 S.rain=mix('rain');S.cloud=mix('cloud');S.ash=mix('ash');const storm=mix('storm');
 const mist=(m>300&&m<480)?sm(1-Math.abs(m-390)/90)*.35:0;S.fog=Math.min(1,mix('fog')+mist);
 // Clouds flatten colour and light.
 S.night=1-sm(Math.min(1,S.sunElev*3));
 S.tint=k.tint.map((v,i)=>lerp(v,[.86,.9,.95][i],S.cloud*.55));S.expo=k.expo*(1-.14*S.cloud)*(1-.06*S.rain);
 // Wind: slowly wandering direction, weather strength, gusts.
 windA+=(Math.sin(t/23000)*.002+(Math.random()-.5)*.0015);gust+=(Math.random()-.5)*dt*1.4;gust*=.985;const ws=mix('wind')*(1+Math.max(-.4,Math.min(.6,gust)));
 S.wind={x:Math.cos(windA)*ws,y:Math.sin(windA)*ws*.35,s:ws};
 // Surface wetness builds in rain and dries slowly afterwards (faster in sun and wind).
 S.wet=Math.max(0,Math.min(1,S.wet+dt*(S.rain>.05?S.rain*.08:-(.006+.01*S.sunElev+.004*ws))));
 // Lightning in squall fronts.
 if(storm>.2&&t>nextFlash){S.flash=.9+Math.random()*.4;nextFlash=t+5000+Math.random()*9000/storm;SKY.stats.flashes++}
 S.flash=Math.max(0,S.flash-dt*3.2);
 // Sun-driven cast shadows: swing west→east through the day; long at dawn/dusk; faint under cloud; moonlit at night.
 const az=Math.max(-1,Math.min(1,(m-720)/390));S.shadow={shear:-az*.95-.1,len:.28+(1-S.sunElev)*.5,alpha:S.sunElev>0?(.16+.2*S.sunElev)*(1-.7*S.cloud):.07};
 S.icon=S.sunElev>.05?(S.cloud>.6?'☁':'☀'):'☾';
}
requestAnimationFrame(tick);
// HUD: sun/moon glyph and the incoming front in the minimap info line.
const P=Game.prototype,hud=P.hud;let lastF='';
P.hud=function(...a){const out=hud.apply(this,a);const info=document.getElementById('swMapInfo');if(info){const f=forecast(this);const sig=S.icon+'|'+(f?.next?.id||'')+(f?Math.ceil(f.inMinutes/60):'');
 let el=document.getElementById('swSkyInfo');if(!el){el=document.createElement('span');el.id='swSkyInfo';info.prepend(el)}
 if(sig!==lastF){lastF=sig;const cur=this.climateState().weather;el.innerHTML=`<span title="${S.sunElev>0?'Sun':'Moon'}">${S.icon}</span>`+(f&&f.next.id!==cur.id?`<span style="opacity:.75" title="Incoming: ${f.next.name}">→${f.next.icon} ${Math.max(1,Math.ceil(f.inMinutes/60))}h</span>`:'')}}return out};
})();
