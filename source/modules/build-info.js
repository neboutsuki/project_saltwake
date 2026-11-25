/* Build identity: version + build number + commit, shown on the title screen, as a faint in-game corner badge,
 * in Graphics & Performance and in the tab title. Values come from window.SALTWAKE_BUILD (written by build.py). */
(()=>{'use strict';
const B=window.SALTWAKE_BUILD||{version:'dev',build:0,commit:'local',date:'',label:'dev build'};
const full=`${B.label} (${B.commit})`;
document.title=`ASHEN WILDS: SALTWAKE | ${B.label}`;
const want=full+' · The Unseen War';let busy=false;
function stamp(){if(busy)return;busy=true;try{for(const el of document.querySelectorAll('.releaseNumber,#screen small,#screen *,body > * small'))if(el.children.length===0){const t=el.textContent.trim();if(t!==want&&/^v0\.\d+\.\d+.*Unseen War$/.test(t))el.textContent=want}}finally{busy=false}}
const badge=document.createElement('div');badge.id='swBuild';badge.textContent=B.label;badge.title=`${full} · built ${B.date}`;
const st=document.createElement('style');st.textContent='#swBuild{position:fixed;right:8px;bottom:6px;z-index:30;font:10px/1 ui-monospace,monospace;color:rgba(238,241,244,.38);pointer-events:none;letter-spacing:.04em;text-shadow:0 1px 2px #000}';
document.head.append(st);document.body.append(badge);
stamp();let pend=0;new MutationObserver(()=>{if(!pend)pend=requestAnimationFrame(()=>{pend=0;stamp()})}).observe(document.body,{subtree:true,childList:true});
window.saltwakeBuild=B;
const P=Game.prototype,gp=P.graphicsPanel;P.graphicsPanel=function(...a){const out=gp.apply(this,a);const b=$('panel')?.querySelector('.engineOptions');if(b&&!$('swBuildInfo'))b.insertAdjacentHTML('afterbegin',`<p id="swBuildInfo" class="engineNote">${full} · built ${B.date}</p>`);return out};
})();
