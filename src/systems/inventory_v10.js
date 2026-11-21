/* SALTWAKE v0.10 inventory, loadout and quick-slot layer.
 * 10 keyboard action slots are separate from the two ranged equipment slots.
 * Everything persists in the existing v4 player-save format.
 */
'use strict';
const QUICK_DEFAULT=['bandage','ration','healing_tincture','bolt','wick_cell',null,null,null,null,null];
const QUICK_ALLOWED=new Set(['medicine','food','ammunition','consumable']);
const QUICK_KEY_LABELS=['1','2','3','4','5','6','7','8','9','0'];
Object.assign(Game.prototype,{
 ensureQuickSlots(){
  if(!Array.isArray(this.save.quickSlots))this.save.quickSlots=QUICK_DEFAULT.slice();
  this.save.quickSlots=(this.save.quickSlots.slice(0,10).concat(Array(10).fill(null))).slice(0,10);
  const owned=[0,1].filter(i=>this.weaponOwned(i));
  if(this.player.weapon===2&&owned.length)this.player.weapon=owned[0];
  if(!owned.length)this.player.weapon=2;
 },
 cycleWeapon(){
  if(this.isPaused())return;
  const owned=[0,1].filter(i=>this.weaponOwned(i));
  if(!owned.length){this.player.weapon=2;this.notify('Both ranged weapons lost · emergency knife only');return}
  const i=owned.indexOf(this.player.weapon);this.player.weapon=owned[(i+1)%owned.length];
  this.player.reload=0;
  this.notify((this.weapon()?.name||'Weapon')+' equipped · Q to swap',1.2);
 },
 bindQuickSlot(slot,id){
  if(!(slot>=0&&slot<10))return false;
  if(id!==null&&(!itemDef(id)||!QUICK_ALLOWED.has(itemDef(id).category))){this.notify('This item cannot be assigned to a quick slot');return false}
  this.ensureQuickSlots();
  this.save.quickSlots[slot]=id;
  this.store();this.quickRenderSignature='';this.notify(id?'Assigned '+itemDef(id).name+' to '+QUICK_KEY_LABELS[slot]:'Cleared quick slot '+QUICK_KEY_LABELS[slot]);
  return true;
 },
 useQuickSlot(slot){
  if(this.isPaused())return;
  this.ensureQuickSlots();const id=this.save.quickSlots[slot];
  if(!id){this.notify('Quick slot '+QUICK_KEY_LABELS[slot]+' is empty');return}
  if(!itemCount(this.save.bag,id)){this.notify('No '+itemDef(id).name+' remaining');return}
  if(id==='bolt'||id==='wick_cell'){
   const w=this.weapon();if(w?.ammoId===id)this.reload();
   else this.notify('Equip the matching launcher, then reload');
   return;
  }
  if(id==='bandage'){
   this.heal();return;
  }
  if(id==='healing_tincture'){
   if(this.player.hp>=100){this.notify('Already at full health');return}
   addItem(this.save.bag,id,-1);this.player.hp=clamp(this.player.hp+60,0,100);
  }else if(id==='ration'){
   if(this.player.st>=99){this.notify('Stamina already full');return}
   addItem(this.save.bag,id,-1);this.player.st=clamp(this.player.st+48,0,100);
  }else if(id==='lamp_oil'){
   this.notify('Lamp oil is reserved for future lantern/crafting use');return;
  }else{this.notify('Cannot use this item in the field');return}
  this.notify('Used '+itemDef(id).name);if(!this.raid)this.store();this.quickRenderSignature='';
 },
 renderQuickSlots(){
  const el=$('quickSlots');if(!el||this.mode!=='play')return;
  this.ensureQuickSlots();
  const sig=JSON.stringify(this.save.quickSlots)+'|'+this.save.quickSlots.map(id=>id?(this.save.bag[id]||0):0).join(',');
  if(this.quickRenderSignature===sig)return;this.quickRenderSignature=sig;
  el.innerHTML=this.save.quickSlots.map((id,i)=>{
   const n=id?itemCount(this.save.bag,id):0,def=id?itemDef(id):null;
   const short=id?(id==='healing_tincture'?'TINCT':id==='wick_cell'?'CELL':id==='bandage'?'BAND':id==='ration'?'RAT':id==='bolt'?'BOLT':id==='lamp_oil'?'OIL':def.name.slice(0,4).toUpperCase()):'—';
   return `<button type="button" class="quickSlot ${id&&n?'hasItem':''}" data-quick="${i}" title="${id?safeText(def.name):'Empty slot'}"><small>${QUICK_KEY_LABELS[i]}</small><b>${safeText(short)}</b><em>${n||''}</em></button>`;
  }).join('');
 },
 showPack(){
  this.ensureQuickSlots();
  const defs=Object.entries(this.save.bag).filter(([,n])=>n>0).sort((a,b)=>itemDef(a[0]).name.localeCompare(itemDef(b[0]).name));
  const cells=Array.from({length:48},(_,i)=>{
   const entry=defs[i];if(!entry)return '<div class="invCell empty"></div>';
   const [id,n]=entry;const def=itemDef(id);
   return `<div class="invCell ${safeText(def.rarity||'common')}" title="${safeText(def.description||'')}"><b>${safeText(def.name)}</b><small>×${n}</small><button data-act="choosebind" data-id="${safeText(id)}">BIND</button>${['bandage','healing_tincture','ration'].includes(id)?`<button data-act="consume" data-id="${safeText(id)}">USE</button>`:''}</div>`;
  }).join('');
  const slots=this.save.quickSlots.map((id,i)=>`<button data-act="clearquick" data-slot="${i}" class="bindSlot">${QUICK_KEY_LABELS[i]} · ${id?safeText(itemDef(id).name):'EMPTY'} <small>${id?'× CLEAR':''}</small></button>`).join('');
  this.open('BACKPACK & LOADOUT',`<div class="row"><span>Carried weight <b>${weight(this.save.bag).toFixed(1)} / ${this.mechanics().comfortWeight} kg</b></span><span>${this.save.gold} scrip</span></div>
   <div class="loadout"><div><strong>PRIMARY · ARBALEST</strong><small>${this.save.weapons.arbalest?'Equipped · Q cycles':'Lost · seek a replacement'}</small></div><div><strong>SECONDARY · WICKCASTER</strong><small>${this.save.weapons.wickcaster?'Equipped · Q cycles':'Lost · seek a replacement'}</small></div></div>
   <p class="fine">Only one primary and one secondary ranged weapon. The knife is an automatic fallback when both are unavailable.</p>
   <h3>INVENTORY · ${defs.length} / 48 STACKS</h3><div class="inventoryGrid">${cells}</div>
   <h3>ACTION BAR · 1–0</h3><div class="quickBindGrid">${slots}</div><p class="fine">Select BIND on an item, then a quick slot. Q cycles ranged weapons; numbers use items. Quest evidence cannot go on the action bar.</p>`);
 },
 quickBindMenu(id){
  const def=itemDef(id);if(!QUICK_ALLOWED.has(def.category)){this.notify('Only consumables and ammunition can be bound');return}
  const actions=QUICK_KEY_LABELS.map((key,i)=>`<button data-act="assignquick" data-slot="${i}" data-id="${safeText(id)}">${key} · ${safeText(this.save.quickSlots[i]?itemDef(this.save.quickSlots[i]).name:'Empty')}</button>`).join('');
  this.open('BIND '+def.name.toUpperCase(),`<p>Choose a key for ${safeText(def.name)}.</p><div class="quickBindGrid">${actions}</div>`);
 }
});
