// node qa/tools/bench.js <build.html> : headless CPU benchmark of raid simulation + render.
const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch({args:['--no-sandbox']});const p=await b.newPage({viewport:{width:1280,height:800}});const errs=[];p.on('pageerror',e=>errs.push(String(e)));
await p.addInitScript(()=>{const d=new Map();Object.defineProperty(window,'localStorage',{value:{getItem:k=>d.has(k)?d.get(k):null,setItem:(k,v)=>d.set(k,String(v)),removeItem:k=>d.delete(k),clear:()=>d.clear(),key:i=>null,get length(){return d.size}}})});
await p.setContent(fs.readFileSync(process.argv[2],'utf8'),{waitUntil:'load',timeout:90000});await p.waitForFunction('window.SALTWAKE_DEV');await p.waitForTimeout(500);
const r=await p.evaluate((process_env_half)=>{const G=SALTWAKE_DEV.game;G.setArea('hub',34,36);G.mode='play';G.save.completedRaids=3;G.beginRaid();if(process_env_half)saltwakePolish.change({lightRes:'half'});const R=G.raid;const n=R.enemies.length;
const frame=()=>{let a=performance.now();R.time+=1/60;G.update(1/60);let b=performance.now();G.render(performance.now());let c=performance.now();return [b-a,c-b]};
for(let i=0;i<60;i++)frame();let up=[],rd=[];for(let i=0;i<600;i++){const[x,y]=frame();up.push(x);rd.push(y)}
const st=a=>{a.sort((x,y)=>x-y);return {mean:+(a.reduce((s,v)=>s+v,0)/a.length).toFixed(3),p95:+a[Math.floor(a.length*.95)].toFixed(3),max:+a[a.length-1].toFixed(3)}};
return {lightRes:saltwakePolish?.settings.lightRes,enemies:n,update:st(up),render:st(rd),map:G.mapId}},process.argv[3]==='half');
console.log(JSON.stringify({...r,errors:errs}));await b.close()})();
