module.exports=`()=>{const c={},G=SALTWAKE_DEV.game;
c.glassTheme=document.documentElement.classList.contains('sw-glass')&&!!window.saltwakeTheme;
c.themeToggle=saltwakeTheme.set('classic')==='classic'&&!document.documentElement.classList.contains('sw-glass')&&saltwakeTheme.set('glass')==='glass';
c.portraitRemoved=!document.querySelector('.tide-portrait');
G.setArea('hub',34,36);G.mode='play';G.save.completedRaids=3;G.beginRaid();const s0={...saltwakeEnvFx.stats};G.render(performance.now());
c.windSway=saltwakeEnvFx.stats.swayed>s0.swayed;c.contactShadows=saltwakeEnvFx.stats.shadowed>s0.shadowed;
saltwakeEnvFx.set({wind:false});const s1=saltwakeEnvFx.stats.swayed;G.render(performance.now());c.windToggle=saltwakeEnvFx.stats.swayed===s1;saltwakeEnvFx.set({wind:true});
G.graphicsPanel();c.settingsUI=!!document.getElementById('swTheme')&&!!document.getElementById('envWind');G.close();
G.endRaid(true,'QA v031');c.extract=!G.raid;return c}`;
