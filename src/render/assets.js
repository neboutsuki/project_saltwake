// Bitmap renderer. These external PNG assets, not JS pixels, define the appearance.
class SpriteLibrary {
 constructor(manifest) {this.images={};this.patterns={};for(const [key,path] of Object.entries(manifest.images)){
 const img=new Image();img.src=path;img.addEventListener('load',()=>{this.patterns={}});this.images[key]=img;
 }}
 image(key){const im=this.images[key];return im&&im.complete&&im.naturalWidth?im:null}
 draw(ctx,key,x,y,w,h){const im=this.image(key);if(!im)return false;ctx.drawImage(im,x,y,w,h);return true}
 pattern(ctx,key){if(this.patterns[key])return this.patterns[key];const im=this.image(key);if(!im)return null;return this.patterns[key]=ctx.createPattern(im,'repeat')}
}
const SPRITES=new SpriteLibrary(window.SALTWAKE_ASSETS);
