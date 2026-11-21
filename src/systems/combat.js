Object.assign(Game.prototype,{
 weapon(){return this.world.content.weapons?.[this.player.weapon]},
 weaponOwned(slot){return slot===2||!!this.save.weapons[slot===0?'arbalest':'wickcaster']},
 switchWeapon(slot){if(!this.weaponOwned(slot)){this.notify('No weapon equipped in that slot');return}this.player.weapon=slot;this.player.reload=0},
 reload(){const p=this.player,w=this.weapon();if(this.isPaused()||!w||p.reload>0||p.mag[p.weapon]>=w.magSize||!itemCount(this.save.bag,w.ammoId))return;p.reload=w.reload;this.notify('Reloading '+w.name+'…',1.2)},
 shoot(){const p=this.player;if(this.isPaused()||!this.raid||p.cooldown>0||p.roll>0||p.reload>0)return;if(p.weapon===2){p.cooldown=.48;for(const e of this.raid.enemies){if(e.dead||distance(p.x,p.y,e.x,e.y)>47)continue;let angle=rad(e.y-p.y,e.x-p.x);if(Math.cos(angle-p.angle)>.15){this.hurtEnemy(e,12);break}}return}
 const w=this.weapon();if(!w||!this.weaponOwned(p.weapon))return;if(!p.mag[p.weapon]){this.reload();return}
 p.mag[p.weapon]--;p.cooldown=w.cooldown;const angle=p.angle+(Math.random()-.5)*w.spread;this.raid.bullets.push({x:p.x,y:p.y-8,vx:Math.cos(angle)*w.speed,vy:Math.sin(angle)*w.speed,t:Math.min(1.5,w.range/w.speed),damage:w.damage,enemy:false});for(const e of this.raid.enemies)if(!e.dead&&distance(e.x,e.y,p.x,p.y)<w.noise)e.aggro=4.2;
 this.raid.particles.push({x:p.x+Math.cos(angle)*21,y:p.y-8+Math.sin(angle)*21,vx:Math.cos(angle)*105,vy:Math.sin(angle)*105,t:.2,color:'#eecb83'});
 },
 hurtEnemy(e,dmg){e.hp-=dmg;e.aggro=5;if(e.hp>0)return;e.dead=true;this.raid.kills++;let def=this.world.content.enemies.find(q=>q.id===e.type);if(def?.drop)this.raid.drops.push({x:e.x,y:e.y,id:def.drop,n:1,got:false});this.notify(def?.name+' defeated');},
 hurtPlayer(dmg,bleed=0){let p=this.player;if(p.iframes>0)return;p.hp-=dmg;p.hit=.25;if(Math.random()<bleed)p.bleed=Math.max(p.bleed,1);if(p.hp<=0)this.endRaid(false,'You fell in the Outer Quays')},
 heal(){if(this.isPaused()||!itemCount(this.save.bag,'bandage')){this.notify('No bandages available');return}addItem(this.save.bag,'bandage',-1);this.player.hp=clamp(this.player.hp+this.mechanics().medicineHeal,0,100);this.player.bleed=0;this.notify('Wounds treated');if(!this.raid)this.store()}
});
