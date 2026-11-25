/* SALTWAKE v0.33 — GPU post-processing pipeline (WebGL2).
 * Takes the finished frame of whichever scene is live (field canvas #world, or the harbor frame's #map canvas) and
 * re-presents it through: pixel-art sharpening, bloom from light sources, tilt-shift depth of field (diorama depth),
 * an ashen filmic grade (cool slate shadows, warm ember highlights, drained mid-tones), vignette and fine grain.
 * The source canvases keep rendering and receiving input underneath; this overlay never takes pointer events.
 * Falls back silently (no overlay) when WebGL2 is unavailable. Settings: localStorage saltwake.post.v1.
 */
(()=>{'use strict';
const KEY='saltwake.post.v1';
let cfg={on:true,tilt:true,bloom:true,grain:true};try{Object.assign(cfg,JSON.parse(localStorage.getItem(KEY))||{})}catch{}
const stats={frames:0,errors:0,source:'',ms:0};
const POST=window.saltwakePost={stats,resume(){paused=false;guardT=0},get settings(){return {...cfg}},get active(){return active},set(p){Object.assign(cfg,p);try{localStorage.setItem(KEY,JSON.stringify(cfg))}catch{}sync();return {...cfg}}};
let active=false;
const vp=document.getElementById('viewport');if(!vp)return;
const cv=document.createElement('canvas');cv.id='swPost';cv.setAttribute('aria-hidden','true');
const st=document.createElement('style');st.textContent='#swPost{position:absolute;pointer-events:none;image-rendering:auto}html.sw-post-ash #swAsh{visibility:hidden}#swPost[hidden]{display:none}';document.head.append(st);
const gl=cv.getContext('webgl2',{alpha:false,antialias:false,premultipliedAlpha:false,preserveDrawingBuffer:false});
if(!gl){stats.errors++;return}
function place(){const ash=document.getElementById('swAsh');const anchor=document.getElementById('reunionHarbor')||document.getElementById('world');if(ash)ash.before(cv);else anchor?.after(cv)}
place();
const VS=`#version 300 es
in vec2 p;out vec2 uv;void main(){uv=p*.5+.5;uv.y=1.-uv.y;gl_Position=vec4(p,0.,1.);}`;
const DOWN=`#version 300 es
precision mediump float;in vec2 uv;out vec4 o;uniform sampler2D src;uniform vec2 px;
void main(){vec3 c=texture(src,uv+px*vec2(-1,-1)).rgb+texture(src,uv+px*vec2(1,-1)).rgb+texture(src,uv+px*vec2(-1,1)).rgb+texture(src,uv+px*vec2(1,1)).rgb;o=vec4(c*.25,1.);}`;
const BLUR=`#version 300 es
precision mediump float;in vec2 uv;out vec4 o;uniform sampler2D src;uniform vec2 dir;
void main(){vec3 c=texture(src,uv).rgb*.227;c+=(texture(src,uv+dir*1.385).rgb+texture(src,uv-dir*1.385).rgb)*.316;c+=(texture(src,uv+dir*3.231).rgb+texture(src,uv-dir*3.231).rgb)*.07;o=vec4(c,1.);}`;
const FINAL=`#version 300 es
precision highp float;in vec2 uv;out vec4 o;uniform sampler2D src;uniform sampler2D soft;uniform vec2 px;uniform float t;uniform vec4 fx;uniform vec2 res;
uniform vec3 tint;uniform float expo;uniform vec4 wx;uniform vec2 wind;uniform vec2 cam;uniform float night;uniform sampler2D ash;uniform float ashOn;
float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*vn(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}
void main(){
 vec3 c=texture(src,uv).rgb;
 vec3 n=texture(src,uv+vec2(px.x,0)).rgb+texture(src,uv-vec2(px.x,0)).rgb+texture(src,uv+vec2(0,px.y)).rgb+texture(src,uv-vec2(0,px.y)).rgb;
 c=clamp(c+(c-n*.25)*.32,0.,1.);
 vec3 s=texture(soft,uv).rgb;
 float d=smoothstep(.26,.54,abs(uv.y-.5))*fx.x;c=mix(c,s,d*.62);
 // wx: x=fog y=wet z=flash w=cloud
 vec2 wp=uv*vec2(res.x/res.y,1.)+cam;
 float cs=fbm(wp*1.3-wind*t*.035);c*=1.-wx.w*.16*smoothstep(.35,.75,cs)*(1.-night);
 float l0=dot(c,vec3(.299,.587,.114));
 c*=1.-wx.y*.14*(1.-l0);c+=wx.y*pow(l0,3.)*.22*vec3(.85,.9,1.);
 float th=.52-.06*night;vec3 b=max(s-vec3(th),0.);float bl=dot(b,vec3(.33));c+=fx.y*(b*(1.35+night*.25)+vec3(1.,.62,.32)*bl*(.9+night*.3));
 c*=tint*expo;
 float fg=fbm(wp*vec2(2.2,3.4)+vec2(-wind.x,wind.y)*t*.06+t*.01);float fd=wx.x*(.3+.7*fg)*(.65+.35*uv.y);
 c=mix(c,vec3(.6,.64,.66)*tint*expo*1.05,clamp(fd*.62,0.,.8));
 float l=dot(c,vec3(.299,.587,.114));
 c=mix(vec3(l),c,.84);
 c=c*c*(3.-2.*c)*.28+c*.72;
 c+=vec3(-.012,.0,.022)*(1.-smoothstep(0.,.45,l));
 c+=vec3(.03,.012,-.02)*smoothstep(.55,1.,l);
 c+=wx.z*vec3(.78,.84,1.)*.45;
 if(ashOn>.5){vec4 a=texture(ash,uv);c=mix(c,a.rgb*tint*expo*1.1,a.a);}
 vec2 q=uv-.5;c*=1.-dot(q,q)*(.75+night*.2);
 c+=(h(uv*res+fract(t))-.5)*.035*fx.z;
 o=vec4(c,1.);}`;
const lerp1=(a,b,t)=>a+(b-a)*t;
function prog(vs,fs){const p=gl.createProgram();for(const [type,src] of [[gl.VERTEX_SHADER,vs],[gl.FRAGMENT_SHADER,fs]]){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));gl.attachShader(p,s)}gl.bindAttribLocation(p,0,'p');gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));return p}
let P1,P2,P3;try{P1=prog(VS,DOWN);P2=prog(VS,BLUR);P3=prog(VS,FINAL)}catch(e){stats.errors++;console.warn('post-fx disabled',e);return}
const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
function tex(filter){const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,filter);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,filter);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);return t}
const srcT=tex(gl.LINEAR),ashT=tex(gl.NEAREST);let layoutDirty=true,lastEl=null,layoutAt=0,lastStamp=-2,lastSrc=null;
new ResizeObserver(()=>{layoutDirty=true}).observe(vp);addEventListener('resize',()=>{layoutDirty=true});
function target(w,h){const t=tex(gl.LINEAR);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,null);const f=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,f);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,t,0);return {t,f,w,h}}
let A=null,B=null,size='';
function ensure(sw,sh){const w=Math.max(1,sw>>2),h=Math.max(1,sh>>2),k=w+'x'+h;if(k===size)return;size=k;for(const r of [A,B])if(r){gl.deleteTexture(r.t);gl.deleteFramebuffer(r.f)}A=target(w,h);B=target(w,h)}
function pass(p,out,w,h,setup){gl.useProgram(p);gl.bindFramebuffer(gl.FRAMEBUFFER,out?out.f:null);gl.viewport(0,0,w,h);setup(p);gl.drawArrays(gl.TRIANGLE_STRIP,0,4)}
const u=(p,n)=>gl.getUniformLocation(p,n);
function sourceCanvas(){const G=window.SALTWAKE_DEV?.game;const f=document.getElementById('reunionHarbor');
 if(f&&!f.hidden&&vp.classList.contains('reunion-hub')){try{const c=f.contentDocument?.getElementById('map');if(c)return [c,f]}catch{}}
 const w=document.getElementById('world');return w&&!vp.classList.contains('reunion-hub')?[w,w]:null}
function sync(){if(!cfg.on){cv.hidden=true;active=false;document.documentElement.classList.remove('sw-post-ash')}}
// Performance guard: if the game runs below 45 fps for ~3 s with the enhanced renderer on, pause the renderer for this
// session and tell the player (it can be re-enabled in Graphics & Performance).
let guardT=0,guardN=0,paused=false;POST.guard={get paused(){return paused}};
function guard(t){if(!active){guardT=0;guardN=0;return}if(!guardT){guardT=t;guardN=0;return}guardN++;const span=t-guardT;if(span<3000)return;const fps=guardN*1000/span;stats.fps=fps;guardT=t;guardN=0;
 if(fps<45&&cfg.guard!==false){paused=true;cv.hidden=true;active=false;document.documentElement.classList.remove('sw-post-ash');stats.guarded=(stats.guarded||0)+1;window.SALTWAKE_DEV?.game?.notify?.(`Enhanced renderer paused (${Math.round(fps)} fps). Re-enable it in Field menu › Graphics & Performance.`,6)}}
function frame(t){requestAnimationFrame(frame);guard(t);const G=window.SALTWAKE_DEV?.game;if(paused)return;
 if(!cfg.on||!G||G.mode!=='play'||document.hidden){if(!cv.hidden){cv.hidden=true;active=false;document.documentElement.classList.remove('sw-post-ash')}return}
 const pair=sourceCanvas();if(!pair){cv.hidden=true;active=false;document.documentElement.classList.remove('sw-post-ash');return}const [src,el]=pair;if(el.nextElementSibling!==cv){el.after(cv);const ash=document.getElementById('swAsh');if(ash)cv.after(ash)}
 const t0=performance.now();
 try{
  if(layoutDirty||el!==lastEl||t-layoutAt>1000){layoutDirty=false;lastEl=el;layoutAt=t;const vr=vp.getBoundingClientRect(),er=el.getBoundingClientRect();
   Object.assign(cv.style,{left:(er.left-vr.left)+'px',top:(er.top-vr.top)+'px',width:er.width+'px',height:er.height+'px'})}
  // Process at the scene's own resolution; the browser scales the result (was display size x DPR: up to 10x the pixels).
  const W=src.width,H=src.height;if(cv.width!==W||cv.height!==H){cv.width=W;cv.height=H}
  // Harbor idles at ~8 scene redraws/s: re-upload and re-blur only when its frame actually changed.
  const hs=src!==document.getElementById('world')?window.saltwakePerf?.hubStats?.():null,stamp=hs?hs.renders:-1;const fresh=!hs||stamp!==lastStamp||src!==lastSrc;lastStamp=stamp;lastSrc=src;
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,srcT);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);if(fresh){gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,src);stats.uploads=(stats.uploads||0)+1}
  ensure(src.width,src.height);
  const ashC=window.saltwakeEnvFx?.ashCanvas,ashOn=!!(ashC&&window.saltwakeEnvFx.ashLive);if(ashOn){gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,ashT);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,ashC);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,srcT)}
  if(fresh){pass(P1,A,A.w,A.h,p=>{gl.bindTexture(gl.TEXTURE_2D,srcT);gl.uniform1i(u(p,'src'),0);gl.uniform2f(u(p,'px'),1/src.width,1/src.height)});
  for(let i=0;i<2;i++){pass(P2,B,B.w,B.h,p=>{gl.bindTexture(gl.TEXTURE_2D,A.t);gl.uniform1i(u(p,'src'),0);gl.uniform2f(u(p,'dir'),(1+i)/A.w,0)});
   pass(P2,A,A.w,A.h,p=>{gl.bindTexture(gl.TEXTURE_2D,B.t);gl.uniform1i(u(p,'src'),0);gl.uniform2f(u(p,'dir'),0,(1+i)/A.h)})}}
  pass(P3,null,W,H,p=>{gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,A.t);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,srcT);
   gl.uniform1i(u(p,'src'),0);gl.uniform1i(u(p,'soft'),1);gl.uniform1i(u(p,'ash'),2);gl.uniform1f(u(p,'ashOn'),ashOn?1:0);gl.uniform2f(u(p,'px'),1/src.width,1/src.height);gl.uniform1f(u(p,'t'),t/1000);gl.uniform2f(u(p,'res'),W,H);
   gl.uniform4f(u(p,'fx'),cfg.tilt?1:0,cfg.bloom?1:0,cfg.grain?1:0,0);const K=window.saltwakeSky?.state,GG=window.SALTWAKE_DEV?.game,field=src===document.getElementById('world');const ex=K?(field?lerp1(1,K.expo,.4):lerp1(1,K.expo,.75-.68*K.night)):1;gl.uniform3f(u(p,'tint'),...(K?K.tint.map(v=>lerp1(1,v,field?.75:1-.55*K.night)):[1,1,1]));gl.uniform1f(u(p,'expo'),ex);gl.uniform4f(u(p,'wx'),K?.fog||0,K?.wet||0,K?.flash||0,K?.cloud||0);gl.uniform2f(u(p,'wind'),K?.wind.x||0,K?.wind.y||0);gl.uniform1f(u(p,'night'),K?.night||0);gl.uniform2f(u(p,'cam'),field&&GG?.camera?GG.camera.x/1100:0,field&&GG?.camera?GG.camera.y/1100:0)});
  if(cv.hidden)cv.hidden=false;active=true;document.documentElement.classList.toggle('sw-post-ash',ashOn);stats.frames++;stats.source=src===document.getElementById('world')?'field':'harbor';
 }catch(e){stats.errors++;if(stats.errors>30){cfg.on=false;sync()}}
 stats.ms=stats.ms*.9+(performance.now()-t0)*.1}
requestAnimationFrame(frame);
// When the GPU grade is live, the 2D/CSS grades step aside so the image is not graded twice.
const gs=document.createElement('style');document.head.append(gs);setInterval(()=>{const on=active;gs.textContent='';if(window.saltwakeEnvFx)window.saltwakeEnvFx.gpuGrade=on},250);
const P=Game.prototype,gp=P.graphicsPanel;P.graphicsPanel=function(...a){const out=gp.apply(this,a);const b=$('panel')?.querySelector('.engineOptions');if(b&&!$('postOn')){
 b.insertAdjacentHTML('afterbegin',`<label class="engineCheck"><input id="postOn" type="checkbox" ${cfg.on?'checked':''}> Enhanced renderer (GPU bloom, depth, grade)${paused?' — paused for performance':''}</label><label class="engineCheck"><input id="postTilt" type="checkbox" ${cfg.tilt?'checked':''}> Depth of field (tilt-shift)</label><label class="engineCheck"><input id="postBloom" type="checkbox" ${cfg.bloom?'checked':''}> Light bloom</label><label class="engineCheck"><input id="postGrain" type="checkbox" ${cfg.grain?'checked':''}> Film grain</label>`);
 $('postOn').onchange=e=>{POST.set({on:e.target.checked});if(e.target.checked)POST.resume()};$('postTilt').onchange=e=>POST.set({tilt:e.target.checked});$('postBloom').onchange=e=>POST.set({bloom:e.target.checked});$('postGrain').onchange=e=>POST.set({grain:e.target.checked})}return out};
})();
