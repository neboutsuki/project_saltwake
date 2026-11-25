// Node Playwright QA runner: node qa/tools/run_qa.js <build.html> [out-prefix]
const {chromium}=require('playwright');const fs=require('fs'),path=require('path');
const file=path.resolve(process.argv[2]||'playable/SALTWAKE_v0.30.0-alpha.1_Unseen_War.html');
const out=process.argv[3]||file.replace(/\.html$/,'');
const suites=[['legacy',require('./legacy_checks.js')]];
try{suites.push(['sky',require('./sky_checks.js')])}catch(e){}
try{suites.push(['v031',require('./v031_checks.js')])}catch(e){}
try{suites.push(['v030',require('./v030_checks.js')])}catch(e){}
try{suites.push(['audit',require('./audit_checks.js')])}catch(e){}
(async()=>{const b=await chromium.launch({args:['--no-sandbox','--disable-dev-shm-usage']});
const page=await b.newPage({viewport:{width:1280,height:800}});const errors=[];page.on('pageerror',e=>errors.push(String(e)));
await page.addInitScript(()=>{const d=new Map();Object.defineProperty(window,'localStorage',{value:{getItem:k=>d.has(k)?d.get(k):null,setItem:(k,v)=>d.set(k,String(v)),removeItem:k=>d.delete(k),clear:()=>d.clear(),key:i=>[...d.keys()][i]??null,get length(){return d.size}}})});
await page.goto('about:blank');await page.setContent(fs.readFileSync(file,'utf8'),{waitUntil:'load',timeout:90000});
await page.waitForFunction('window.SALTWAKE_DEV && window.saltwakeWar');await page.waitForTimeout(500);
const report={checks:{},page_errors:errors};
for(const [n,src] of suites){try{const c=await page.evaluate("("+src+")()");for(const k in c)report.checks[n+'.'+k]=c[k]}catch(e){report.checks[n+'.EXCEPTION']=String(e).slice(0,300)}}
await page.waitForTimeout(300);await page.screenshot({path:out+'.png'});await b.close();
fs.writeFileSync(out+'.qa.json',JSON.stringify(report,null,2));
const fails=Object.entries(report.checks).filter(([k,v])=>v!==true);console.log(JSON.stringify({total:Object.keys(report.checks).length,fails,errors},null,1));process.exit(fails.length||errors.length?1:0)})();
