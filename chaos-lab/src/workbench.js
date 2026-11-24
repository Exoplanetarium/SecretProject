export const BOARD={width:28,depth:22,margin:1.5,lessonLimit:64,freeLimit:256};
const moduleBounds={side:1.2,back:.85,front:.85};
const tableLampBounds={side:2.65,back:4.2,front:.85};
const instruments={
 motor:{side:1.7,back:3.3,front:.85},
 led:{side:1.28,back:2.15,front:.85},
 capacitor:{side:1.4,back:1.85,front:.85},
 photo:{side:1.2,back:1.30,front:.85},
 gear:{side:1.4,back:2.7,front:.85},
 servo:{side:1.45,back:2,front:.85},
 rgb:{side:1.2,back:1.95,front:.85},
 bell:{side:1.2,back:1.55,front:.85},
 jack:{side:1.2,back:1.9,front:.85},
 relay:{side:1.2,back:1.58,front:.85},
 coil:{side:1.25,back:1.65,front:.85},
 rail:{side:1.2,back:.85,front:.85},
 gate:{side:1.2,back:1.5,front:.85},
 latch:{side:1.2,back:1.5,front:.85},
 clock:{side:1.25,back:1.65,front:.85},
 display:{side:1.35,back:1.85,front:.85}
};
function bounds(kind,household){if(instruments[kind])return instruments[kind];return household&&kind==='lamp'?tableLampBounds:moduleBounds;}

export function boardPosition(x,z,free=false,kind,household=false){
 const snap=n=>Math.round(n*2)/2;
 const footprint=bounds(kind,household);
 if(!free&&footprint!==moduleBounds){
  const edgeX=Math.floor((BOARD.width/2-footprint.side)*2)/2;
  const backZ=Math.ceil((-BOARD.depth/2+footprint.back)*2)/2;
  return {x:Math.max(-edgeX,Math.min(edgeX,snap(x))),z:Math.max(backZ,Math.min(BOARD.depth/2-BOARD.margin,snap(z)))};
 }
 return {x:snap(free?x:Math.max(-BOARD.width/2+BOARD.margin,Math.min(BOARD.width/2-BOARD.margin,x))),z:snap(free?z:Math.max(-BOARD.depth/2+BOARD.margin,Math.min(BOARD.depth/2-BOARD.margin,z)))};
}
export function partFits(parts,x,z,kind,household=false,except=null){
 const moving=bounds(kind,household);
 return parts.every(p=>{
  if(p===except)return true;
  const other=bounds(p.kind,household);
  return Math.abs(p.x-x)>=moving.side+other.side||z-moving.back>=p.z+other.front||z+moving.front<=p.z-other.back;
 });
}
export function findSpace(parts,anchor={x:0,z:0},free=false,kind,household=false){
 const candidates=[];
 for(let z=-10;z<=10;z++)for(let x=-10;x<=10;x++)candidates.push({x:anchor.x+x*2.7,z:anchor.z+z*2.1,d:x*x+z*z});
 candidates.sort((a,b)=>a.d-b.d||a.z-b.z||a.x-b.x);
 for(const p of candidates){const pos=boardPosition(p.x,p.z,free,kind,household);if(partFits(parts,pos.x,pos.z,kind,household))return pos;}
 return null;
}
