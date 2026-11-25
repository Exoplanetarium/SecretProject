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
 display:{side:1.35,back:1.85,front:.85},
 diode:{side:1.2,back:1.05,front:.85},
 spdt:{side:1.2,back:1.15,front:.85},
 pot:{side:1.2,back:1.35,front:.85},
 fuse:{side:1.2,back:1.1,front:.85},
 meter:{side:1.25,back:1.65,front:.85},
 transistor:{side:1.2,back:1.45,front:.85},
 cannon:{side:1.35,back:1.75,front:.85}
};
function bounds(kind,household){if(instruments[kind])return instruments[kind];return household&&kind==='lamp'?tableLampBounds:moduleBounds;}
export function rotatedBounds(kind,household=false,rotation=0){
 const {side,back,front}=bounds(kind,household);
 const r=((Number(rotation)||0)%4+4)%4;
 if(r===1)return {left:front,right:back,back:side,front:side};
 if(r===2)return {left:side,right:side,back:front,front:back};
 if(r===3)return {left:back,right:front,back:side,front:side};
 return {left:side,right:side,back,front};
}

export function boardPosition(x,z,free=false,kind,household=false,rotation=0){
 const snap=n=>Math.round(n*2)/2;
 if(free)return {x:snap(x),z:snap(z)};
 const b=rotatedBounds(kind,household,rotation);
 const minX=Math.max(-BOARD.width/2+BOARD.margin,Math.ceil((-BOARD.width/2+b.left)*2)/2);
 const maxX=Math.min(BOARD.width/2-BOARD.margin,Math.floor((BOARD.width/2-b.right)*2)/2);
 const minZ=Math.max(-BOARD.depth/2+BOARD.margin,Math.ceil((-BOARD.depth/2+b.back)*2)/2);
 const maxZ=Math.min(BOARD.depth/2-BOARD.margin,Math.floor((BOARD.depth/2-b.front)*2)/2);
 return {x:Math.max(minX,Math.min(maxX,snap(x))),z:Math.max(minZ,Math.min(maxZ,snap(z)))};
}
export function partFits(parts,x,z,kind,household=false,except=null,rotation=0){
 const moving=rotatedBounds(kind,household,rotation);
 return parts.every(p=>{
  if(p===except)return true;
  const other=rotatedBounds(p.kind,household,p.rotation||0);
  return x-moving.left>=p.x+other.right||x+moving.right<=p.x-other.left||z-moving.back>=p.z+other.front||z+moving.front<=p.z-other.back;
 });
}
export function findSpace(parts,anchor={x:0,z:0},free=false,kind,household=false,rotation=0){
 const candidates=[];
 for(let z=-10;z<=10;z++)for(let x=-10;x<=10;x++)candidates.push({x:anchor.x+x*2.7,z:anchor.z+z*2.1,d:x*x+z*z});
 candidates.sort((a,b)=>a.d-b.d||a.z-b.z||a.x-b.x);
 for(const p of candidates){const pos=boardPosition(p.x,p.z,free,kind,household,rotation);if(partFits(parts,pos.x,pos.z,kind,household,null,rotation))return pos;}
 return null;
}
