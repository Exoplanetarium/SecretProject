export const BOARD={width:28,depth:22,margin:1.5,lessonLimit:64,freeLimit:128};
export function boardPosition(x,z,free=false){
 const snap=n=>Math.round(n*2)/2;
 return {x:snap(free?x:Math.max(-BOARD.width/2+BOARD.margin,Math.min(BOARD.width/2-BOARD.margin,x))),z:snap(free?z:Math.max(-BOARD.depth/2+BOARD.margin,Math.min(BOARD.depth/2-BOARD.margin,z)))};
}
export function findSpace(parts,anchor={x:0,z:0},free=false){
 const occupied=(x,z)=>parts.some(p=>Math.abs(p.x-x)<2.4&&Math.abs(p.z-z)<1.7);
 const candidates=[];
 for(let z=-10;z<=10;z++)for(let x=-10;x<=10;x++)candidates.push({x:anchor.x+x*2.7,z:anchor.z+z*2.1,d:x*x+z*z});
 candidates.sort((a,b)=>a.d-b.d||a.z-b.z||a.x-b.x);
 for(const p of candidates){const pos=boardPosition(p.x,p.z,free);if(!occupied(pos.x,pos.z))return pos;}
 return null;
}
