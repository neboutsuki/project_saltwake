// Sharp rendering: canvas at screen resolution with 1024x576 game coordinates; sharp pixel-art path survives other
// modules' temporary drawImage overrides.
module.exports=`()=>{const c={},H=window.saltwakeHiRes,C=document.getElementById('world'),G=SALTWAKE_DEV.game;c.loaded=!!H;
c.canvasScaled=C.width>=1024&&Math.abs(C.width/1024-H.scale)<.01;const t=(g.setTransform(1,0,0,1,0,0),g.getTransform());c.gameCoordsKept=Math.abs(t.a-H.scale)<1e-6;
c.overrideSurvivesDelete=(()=>{g.drawImage=function(){};delete g.drawImage;return g.drawImage!==CanvasRenderingContext2D.prototype.drawImage})();
G.close();G.setArea('hub',33.5,27.6);G.mode='play';const s0=H.stats.sharp;G.render(performance.now());c.sharpPathUsed=H.scale*G.camera.zoom<1.6||H.stats.sharp>s0;return c}`;
