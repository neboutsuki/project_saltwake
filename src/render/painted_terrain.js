/* Painted ground chunks v0.10: pre-baked image assets from source-painted tiles.
 * Only the tidal flood is drawn dynamically on top; map geometry is untouched.
 */
'use strict';
Object.assign(Game.prototype,{
 drawTerrain(v){
  const map=this.map(),w=map.w,h=map.h;let tileSize=16*T;
  const ix0=Math.max(0,Math.floor(v.x0/tileSize)),iy0=Math.max(0,Math.floor(v.y0/tileSize));
  const ix1=Math.min(Math.ceil(w/16),Math.ceil(v.x1/tileSize)),iy1=Math.min(Math.ceil(h/16),Math.ceil(v.y1/tileSize));
  for(let iy=iy0;iy<iy1;iy++)for(let ix=ix0;ix<ix1;ix++){
   const key='painted/'+this.mapId+'/'+ix+'/'+iy;
   const x=ix*tileSize,y=iy*tileSize,
    width=Math.min(tileSize,map.w*T-x),height=Math.min(tileSize,map.h*T-y);
   if(!SPRITES.draw(g,key,x,y,width,height))this.fill(x,y,width,height,'#7a6253');
  }
  // Dynamic coastline and storm surge: composited using separate water images.
  const x0=clamp(Math.floor(v.x0/T)-1,0,w),y0=clamp(Math.floor(v.y0/T)-1,0,h),
   x1=clamp(Math.ceil(v.x1/T)+1,0,w),y1=clamp(Math.ceil(v.y1/T)+1,0,h);
  const wet=(x,y)=>y*T+T*.53>this.coastY(x*T+T*.5);
  for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
   if(!wet(x,y))continue;
   const bits=(wet(x,y-1)?1:0)|(wet(x+1,y)?2:0)|(wet(x,y+1)?4:0)|(wet(x-1,y)?8:0);
   const phase=(x%8)+(y%8)*8;
   this.drawAtlasTile('atlas/water_overlays',bits+phase*16,x*T,y*T,16);
   if(!(bits&1)){g.fillStyle='rgba(202,214,198,.25)';g.fillRect(x*T+4,y*T+6,23,1)}
  }
 },
 drawRoads(){/* Already painted into the external ground layer. */}
});
