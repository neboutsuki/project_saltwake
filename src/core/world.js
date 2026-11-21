Object.assign(Game.prototype,{
 map(){return this.world.maps[this.mapId]},
 currentZone(){let x=this.player.x/T,y=this.player.y/T;const candidates=(this.map().zones||[]).filter(z=>x>=z.x&&x<z.x+z.w&&y>=z.y&&y<z.y+z.h);return candidates.sort((a,b)=>a.w*a.h-b.w*b.h)[0]||null},
 mechanics(){return this.world.content.mechanics||{playerSpeed:170,sprintSpeed:255,rollSpeed:420,rollDuration:.31,rollStamina:28,rollInvulnerability:.23,rollCooldown:1.05,comfortWeight:18,hardWeight:34,raidSeconds:600,lowTideUntil:205,risingTideUntil:435}},
 store(){this.save.lastUpdate=Date.now();
 // Never commit provisional expedition loot or quest progress before a safe extraction.
 const committed=this.raid?{...this.save,bag:this.raid.bagSnapshot,quests:this.raid.questSnapshot}:this.save;
 return put(SAVE_KEY,JSON.stringify(committed))},
 notify(message,t=2.9){$('toast').textContent=message;$('toast').hidden=false;this.toastUntil=performance.now()+t*1000},
 open(title,body,footer=''){this.panel=title;$('panel').classList.toggle('widePanel',title==='REGIONAL FIELD MAP');$('panel').innerHTML=`<div class="eyebrow">SALTWAKE · ${safeText(this.map().name)}</div><h2>${safeText(title)}</h2>${body}${footer?`<div class="hr"></div><div class="actions">${footer}</div>`:''}<div class="hr"></div><button data-act="close">RETURN TO GAME · ESC</button>`;$('panelLayer').hidden=false;this.mouse.down=false},
 close(){this.panel=null;$('panelLayer').hidden=true;this.dialogue=null},
 isPaused(){return this.mode!=='play'||!!this.panel},
 pos(obj){return {x:obj.x*T,y:obj.y*T}},
 setArea(id,x,y){this.mapSelection=null;this.mapId=id;this.player.x=x*T;this.player.y=y*T;this.camera.x=this.player.x-VW/2;this.camera.y=this.player.y-VH/2;this.mode='play';this.close();this.mouse.down=false;$('mapTitle').textContent=this.map().name.toUpperCase()+' · RED SALT COAST';this.mapChangedAt=performance.now()},
 start(){this.mode='play';$('screen').hidden=true;this.setArea('hub',50,46);this.notify('SALVAGER’S REST · Press M to find named buildings, districts and exits',4);this.store()}
});
