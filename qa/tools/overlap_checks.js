// World hygiene: no overlapping or duplicate big scenery, no trees inside buildings, caches apart, no duplicate ids.
module.exports=`()=>{const c={},G=SALTWAKE_DEV.game,IS=window.saltwakeIsle,C=G.world.content;
const big=d=>/\\/(trees|rocks|props|arena)\\//.test(d.asset)&&!/stump|fallen_log|bone_pile|rock_small|mooring|chain_post|signpost/.test(d.asset);
const bad=m=>{const D=(m.scene?.decor||[]).filter(big);let n=0;for(let i=0;i<D.length;i++)for(let j=i+1;j<D.length;j++){const a=D[i],b=D[j];if(Math.abs(a.x-b.x)>8)continue;const d=Math.hypot(a.x-b.x,(a.y-b.y)*1.4);if(d<Math.min(a.w,b.w)*.42||a.asset===b.asset&&d<.4)n++}
 for(const d of D)if(/\\/trees\\//.test(d.asset))for(const b of m.buildings||[])if(d.x>b.x+.5&&d.x<b.x+b.w-.5&&d.y>b.y+.5&&d.y<b.y+b.h+.5)n++;
 const cs=m.containers||C.containers.filter(k=>k.mapId===m.id);for(let i=0;i<cs.length;i++)for(let j=i+1;j<cs.length;j++)if(Math.hypot(cs[i].x-cs[j].x,cs[i].y-cs[j].y)<1)n++;return n};
c.fixedMapsClean=['hub','quays','maw'].every(id=>bad(G.world.maps[id])===0);
let gen=0;for(const s of [1,2,3,4,5]){gen+=bad(IS.genIsle(s*977));for(const op of IS.OPS)gen+=bad(IS.genFront(s*131,op))}c.generatedMapsClean=gen===0;
const ids={};for(const k of ['npcs','containers','interactables','quests','items','enemies'])for(const x of C[k]||[]){const key=k+':'+x.id;ids[key]=(ids[key]||0)+1}
c.noDuplicateIds=Object.values(ids).every(n=>n===1);return c}`;
