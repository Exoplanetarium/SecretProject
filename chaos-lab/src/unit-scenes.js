import * as T from 'three';
import {softenRoom} from './reading-room.js';

const finish=(color,metalness=.12)=>new T.MeshStandardMaterial({color,roughness:.55,metalness});
function mesh(parent,geo,mat,x,y,z){
 const m=new T.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
}
const box=(g,m,x,y,z,w,h,d)=>mesh(g,new T.BoxGeometry(w,h,d),m,x,y,z);
function barrel(g,m,x,y,z,r,length){
 const b=mesh(g,new T.CylinderGeometry(r,r,length,40),m,x,y,z);b.rotation.x=Math.PI/2;return b;
}
const ring=(g,m,x,y,z,r,t)=>mesh(g,new T.TorusGeometry(r,t,10,56),m,x,y,z);
function spoke(g,m,x,y,z,length,width,angle){
 const b=box(g,m,x,y,z,width,length,.13);b.rotation.z=angle;return b;
}
function group(parent,x,y,z){
 const object=new T.Group();object.position.set(x,y,z);parent.add(object);return object;
}
function tube(parent,material,points,radius){
 const curve=new T.CatmullRomCurve3(points.map(point=>new T.Vector3(...point)));
 return mesh(parent,new T.TubeGeometry(curve,Math.max(12,points.length*4),radius,7,false),material,0,0,0);
}
function screw(parent,metal,slot,x,y,z,size=.09){
 barrel(parent,metal,x,y,z,size,.055);
 const cut=box(parent,slot,x,y,z+.03,size*1.4,size*.21,.012);cut.rotation.z=.55;
}

// Gear flanks, root lands and tips share a single extruded outline.
function cog(parent,metal,hub,x,y,z,pitch,teeth){
 const wheel=group(parent,x,y,z),outline=new T.Shape();
 for(let i=0;i<teeth;i++){
  for(const [j,radius] of [[0,pitch-.06],[.24,pitch-.06],[.38,pitch+.06],[.62,pitch+.06],[.76,pitch-.06]]){
   const a=2*Math.PI*(i+j)/teeth,px=Math.cos(a)*radius,py=Math.sin(a)*radius;
   if(i===0&&j===0)outline.moveTo(px,py);else outline.lineTo(px,py);
  }
 }
 outline.closePath();
 if(teeth>=16)for(let i=0;i<4;i++){
  const a=i*Math.PI/2,hole=new T.Path();
  hole.absarc(Math.sin(a)*pitch*.55,Math.cos(a)*pitch*.55,pitch*.17,0,Math.PI*2,true);
  outline.holes.push(hole);
 }
 mesh(wheel,new T.ExtrudeGeometry(outline,{depth:.13,bevelEnabled:false,curveSegments:8}),metal,0,0,0);
 barrel(wheel,hub,0,0,.10,pitch*.29,.22);return wheel;
}

function photocell(part,g,paint,rim){
 const ceramic=paint('#efab71'),trace=paint('#783720'),pad=paint('#daa447',.48);
 for(const side of [-1,1]){
  tube(g,rim,[[side*.75,.30,-.20],[side*.75,.51,-.50],[side*.43,.72,-.73],[side*.43,1.18,-.72]],.052);
 }
 const face=group(g,0,1.46,-.78);face.rotation.x=-.38;
 barrel(face,pad,0,0,0,1.04,.19);barrel(face,ceramic,0,0,.11,.99,.12);
 // The photoconductive track folds across the copper-colored face of the ceramic disc.
 const path=new T.Path();path.moveTo(-.48,.62);path.lineTo(.37,.62);
 for(let i=0;i<5;i++){
  const y=.62-i*.25,side=i%2===0?1:-1,x=side*(i===0||i===4?.37:.56);
  path.lineTo(x,y);path.absarc(x,y-.125,.125,Math.PI/2,-Math.PI/2,side===1);
  path.lineTo(-side*(i===4?.37:.50),y-.25);
 }
 const points=path.getPoints(12).map(v=>new T.Vector3(v.x,v.y,.185));
 const line=new T.CurvePath();
 for(let i=1;i<points.length;i++)if(points[i].distanceToSquared(points[i-1])>1e-8)line.add(new T.LineCurve3(points[i-1],points[i]));
 mesh(face,new T.TubeGeometry(line,120,.048,6,false),trace,0,0,0);
 for(const [x,y] of [[-.5,.62],[-.39,-.63]])barrel(face,pad,x,y,.19,.10,.04);
 part.sensorFace=ceramic;
}

function gearMotor(part,g,paint,steel,rim){
 const enamel=paint('#236967'),brass=paint('#dba758',.52),pinion=paint('#d4814b',.5);
 box(g,steel,0,.30,-1.12,2.68,.32,2.62);
 box(g,enamel,0,.68,-1.28,1.8,.58,1.85);
 barrel(g,rim,-.59,1.42,-1.65,.55,1.6);
 for(const z of [-2.40,-1.08])barrel(g,steel,-.59,1.42,z,.58,.13);
 for(const x of [-.80,-.38])box(g,brass,x,1.41,-2.52,.13,.23,.17);
 box(g,enamel,0,1.42,-.74,2.47,1.86,.70);
 box(g,steel,0,1.42,-.36,2.33,1.72,.10);
 for(const x of [-1.07,1.07])for(const y of [.70,2.14])screw(g,rim,steel,x,y,-.28,.071);
 part.pinion=cog(g,pinion,steel,-.64,1.37,-.24,.33,10);
 part.outputGear=cog(g,brass,rim,.35,1.37,-.24,.66,20);
 part.pinion.rotation.z=Math.PI/10;
 barrel(part.outputGear,steel,0,0,.25,.14,.28);
 box(part.outputGear,rim,0,.085,.40,.20,.042,.034);
}

function positionalServo(part,g,paint,steel,rim){
 const cobalt=paint('#255781'),dark=paint('#1f3749'),ivory=paint('#f8e9bd'),copper=paint('#c77943');
 const unit=group(g,-.40,0,-.75);
 box(unit,cobalt,0,.87,0,1.20,1.13,1.0);
 box(unit,dark,0,1.43,0,1.24,.16,1.04);
 box(unit,cobalt,0,1.55,0,1.16,.14,.95);
 box(unit,dark,0,.94,.505,.73,.43,.025);
 for(let i=0;i<3;i++)box(unit,rim,-.15+i*.15,.94,.525,.048,.26,.02);
 for(const x of [-.48,.48])for(const y of [.49,1.27])screw(unit,rim,dark,x,y,.516,.052);
 for(const x of [-.71,.71]){
  box(unit,cobalt,x,.49,0,.30,.13,.40);
  mesh(unit,new T.CylinderGeometry(.065,.065,.04,12),rim,x,.58,0);
 }
 const horn=group(unit,-.10,1.68,0);
 mesh(horn,new T.CylinderGeometry(.23,.23,.13,28),ivory,0,0,0);
 box(horn,ivory,0,.01,-.48,.28,.115,.97);
 mesh(horn,new T.CylinderGeometry(.14,.14,.115,24),ivory,0,.01,-.97);
 for(const z of [-.38,-.64,-.91])mesh(horn,new T.CylinderGeometry(.043,.043,.013,12),dark,0,.075,z);
 mesh(horn,new T.CylinderGeometry(.085,.085,.045,18),rim,0,.09,0);
 part.servoHorn=horn;
 const panel=group(g,.73,.63,-.41);panel.rotation.x=-.24;
 box(panel,steel,0,0,-.07,.66,.68,.43);barrel(panel,ivory,0,0,.18,.24,.12);
 const pointer=group(panel,0,0,.27);box(pointer,copper,0,.10,0,.045,.16,.033);part.dialMark=pointer;
 for(const [i,material] of [copper,ivory,dark].entries()){
  tube(g,material,[[-.40+i*.07,.62,-1.22],[-.16+i*.07,.43,-1.57],[.59+i*.07,.37,-1.49],[.68+i*.06,.55,-.82]],.032);
 }
}

function stageMixer(part,g,paint,steel,rim){
 const shell=paint('#423d51'),bezel=paint('#424653'),diffuser=paint('#585a62');
 box(g,steel,0,.58,-.92,.30,.70,.35);
 for(const x of [-1.01,1.01])box(g,rim,x,1.22,-.91,.14,1.02,.23);
 box(g,rim,0,.75,-.91,2.16,.17,.24);
 const head=group(g,0,1.78,-1.02);head.rotation.x=-.18;
 barrel(head,shell,0,0,-.12,1,.99);
 for(const z of [-.51,-.31,-.11])ring(head,steel,0,0,z,.99,.045);
 barrel(head,bezel,0,0,.43,.99,.17);ring(head,rim,0,0,.53,.95,.055);
 // Three emitters share a housing and a frosted mixing lens at the center.
 part.emitters=['#ec4947','#58b66c','#537dda'].map((color,i)=>{
  const a=(i-1)*2*Math.PI/3,x=.56*Math.sin(a),y=.56*Math.cos(a),led=paint(color);
  led.emissive.set(color);led.emissiveIntensity=0;
  barrel(head,steel,x,y,.53,.265,.08);
  const lens=mesh(head,new T.SphereGeometry(.204,24,14),led,x,y,.584);lens.scale.z=.40;
  return led;
 });
 barrel(head,diffuser,0,0,.55,.29,.11);
 for(const r of [.11,.21])ring(head,diffuser,0,0,.612,r,.015);
 part.mixLens=diffuser;
}

function thresholdBell(part,g,paint,steel,rim){
 const bronze=paint('#c89956',.65),burgundy=paint('#713a34'),coil=paint('#bd7150',.48);
 box(g,burgundy,0,.45,-.65,2.05,.30,1.66);
 box(g,steel,-.24,.72,-.83,.29,.54,.34);
 // The hollow skirt and visible central nut read as a struck metal gong.
 const gong=group(g,-.20,1.38,-.77);gong.rotation.x=-.24;
 const profile=[[.03,.25],[.13,.25],[.31,.22],[.52,.15],[.65,.05],[.73,-.10],[.74,-.21],[.70,-.23],[.68,-.10]];
 const shell=mesh(gong,new T.LatheGeometry(profile.reverse().map(([r,h])=>new T.Vector2(r,h)),48),bronze,0,0,.07);
 shell.rotation.x=Math.PI/2;
 screw(gong,rim,steel,0,0,.34,.12);
 barrel(g,coil,.67,.77,-.62,.22,.48);
 for(const z of [-.84,-.40])barrel(g,steel,.67,.77,z,.24,.06);
 const hammer=group(g,.70,.84,-.60);
 tube(hammer,rim,[[0,0,0],[.12,.23,-.02],[.09,.49,0],[-.05,.66,.01]],.044);
 mesh(hammer,new T.SphereGeometry(.135,20,12),steel,-.05,.66,.01);part.hammer=hammer;
 part.strikeTime=0;
}

function testSocket(g,paint,steel,rim){
 const insulator=paint('#385868'),sleeve=paint('#b48542',.47),rubber=paint('#282d32');
 const panel=group(g,0,.93,-.62);panel.rotation.x=-.32;
 box(panel,insulator,0,0,-.21,1.98,1.16,.70);
 box(panel,steel,0,0,.16,1.84,1,.065);
 for(const x of [-.43,.43]){
  barrel(panel,sleeve,x,0,.22,.30,.12);
  ring(panel,rim,x,0,.29,.228,.036);barrel(panel,rubber,x,0,.29,.18,.035);
 }
 for(const x of [-.77,.77])for(const y of [-.36,.36])screw(panel,rim,steel,x,y,.21,.056);
 tube(g,rubber,[[.38,.68,-1.0],[.49,.62,-1.52],[0,.46,-1.71],[-.40,.52,-1.56]],.085);
 barrel(g,insulator,-.43,.53,-1.38,.14,.38);barrel(g,rim,-.43,.53,-1.06,.075,.33);
}

function sensorRelay(part,g,paint,steel,rim){
 const bakelite=paint('#56372c'),copper=paint('#bd6a38',.46),brass=paint('#d3ab5d',.56);
 box(g,bakelite,0,.44,-.70,2.1,.28,1.64);
 for(const x of [-.72,.16])box(g,steel,x,.99,-.78,.13,.88,.69);
 const coil=group(g,-.29,1.04,-.78);coil.rotation.y=Math.PI/2;
 barrel(coil,copper,0,0,0,.34,.80);
 for(let i=0;i<9;i++)ring(coil,copper,0,0,-.36+i*.087,.337,.027);
 for(const z of [-.44,.44])barrel(coil,steel,0,0,z,.38,.08);
 box(g,brass,.62,.85,-.73,.12,.56,.22);
 box(g,rim,.55,1.10,-.73,.22,.08,.24);
 const arm=group(g,-.66,1.53,-.75);
 box(arm,steel,.59,0,0,1.25,.09,.24);barrel(arm,brass,1.15,-.07,0,.09,.15);
 arm.rotation.z=.08;part.contactArm=arm;
}

function makeCanvas(w,h){
 if(typeof document==='undefined')return null;
 const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;return canvas;
}

function drawPlate(ctx,w,h,bg,fg,text,font){
 ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
 ctx.fillStyle=fg;ctx.font=font;ctx.textAlign='center';ctx.textBaseline='middle';
 const metrics=ctx.measureText(text);
 const dy=Number.isFinite(metrics.actualBoundingBoxAscent)&&Number.isFinite(metrics.actualBoundingBoxDescent)
  ?(metrics.actualBoundingBoxAscent-metrics.actualBoundingBoxDescent)/2:0;
 ctx.fillText(text,w/2,h/2+dy,w-16);
}

function coilRelay(part,g,paint,steel,rim){
 const bakelite=paint('#4a332a'),copper=paint('#bd6a38',.46),brass=paint('#d8af5c',.58);
 box(g,bakelite,0,.42,-.92,2.16,.26,1.34);
 for(const x of [-.68,.18])box(g,steel,x,.96,-.96,.14,.84,.66);
 const coil=group(g,-.25,1.02,-.96);coil.rotation.y=Math.PI/2;
 barrel(coil,copper,0,0,0,.33,.78);
 for(let i=0;i<8;i++)ring(coil,copper,0,0,-.34+i*.095,.335,.026);
 for(const z of [-.42,.42])barrel(coil,steel,0,0,z,.37,.08);
 box(g,brass,.64,.82,-.82,.12,.54,.20);
 box(g,rim,.64,.96,-1.18,.12,.80,.20);
 box(g,rim,.58,1.12,-.82,.22,.07,.22);
 box(g,brass,.58,1.38,-1.18,.22,.07,.22);
 const arm=group(g,-.62,1.50,-.98);
 box(arm,steel,.58,0,0,1.22,.09,.36);barrel(arm,brass,1.14,-.06,0,.09,.30);
 arm.rotation.z=.09;part.coilArm=arm;
}

function pushButton(part,g,paint,steel,rim){
 const brass=paint('#c89c52',.6),dark=paint('#383430');
 box(g,dark,0,.35,-.04,1.10,.15,.64);
 barrel(g,rim,0,.43,-.04,.34,.18).rotation.x=0;
 const cap=mesh(g,new T.CylinderGeometry(.27,.29,.22,24),brass,0,.58,-.04);
 part.plunger=cap;
}

function busBar(g,paint,steel){
 const brass=paint('#cca254',.65);
 box(g,brass,0,.36,.04,2.04,.14,.32);
 for(let i=0;i<4;i++){
  const x=((i/3)-.5)*1.74;
  box(g,brass,x,.31,.29,.16,.07,.24);
  screw(g,brass,steel,x,.44,.04,.07);
 }
}

function logicGate(part,g,paint,steel,rim){
 const body=paint('#262c38'),brass=paint('#c99d53',.58),jewel=paint('#aa6c33');
 jewel.emissive.set('#ffbd4a');jewel.emissiveIntensity=0;
 box(g,body,0,.64,-.95,1.88,.76,1.06);
 box(g,brass,0,1.03,-.95,1.92,.06,1.10);
 for(const x of [-.82,.82])for(const z of [-1.4,-.5])screw(g,rim,steel,x,1.07,z,.055);
 const lamp=mesh(g,new T.SphereGeometry(.14,16,12),jewel,0,.70,-.39);
 lamp.scale.z=.45;part.gateJewel=jewel;
 const canvas=makeCanvas(256,128);
 if(canvas){
  const ctx=canvas.getContext('2d'),tex=new T.CanvasTexture(canvas);
  tex.colorSpace=T.SRGBColorSpace;
  drawPlate(ctx,256,128,'#1b212c','#f3dfb0',part.gateMode||'NAND','bold 68px monospace');
  const plate=mesh(g,new T.PlaneGeometry(1.42,.71),new T.MeshBasicMaterial({map:tex}),0,1.065,-.95);
  plate.rotation.x=-Math.PI/2;plate.userData.ownedMaterial=true;
  part.gateCanvas=canvas;part.gateCtx=ctx;part.gateTex=tex;part.shownMode=part.gateMode||'NAND';
 }
}

function memoryLatch(part,g,paint,steel,rim){
 const slate=paint('#2d3a4b'),brass=paint('#cba055',.58),jewel=paint('#8a5a2c');
 jewel.emissive.set('#ffbe4c');jewel.emissiveIntensity=0;
 box(g,slate,0,.68,-.95,1.92,.84,1.06);
 box(g,brass,0,1.11,-.95,1.96,.06,1.10);
 for(const x of [-.84,.84])for(const z of [-1.4,-.5])screw(g,rim,steel,x,1.15,z,.055);
 barrel(g,steel,0,1.16,-.72,.26,.08).rotation.x=0;
 const bulb=mesh(g,new T.SphereGeometry(.20,18,12),jewel,0,1.21,-.72);
 bulb.scale.y=.55;part.latchJewel=jewel;
 const canvas=makeCanvas(256,96);
 if(canvas){
  const ctx=canvas.getContext('2d'),tex=new T.CanvasTexture(canvas);
  tex.colorSpace=T.SRGBColorSpace;
  drawPlate(ctx,256,96,'#232e3d','#e8d39f','D LATCH','bold 48px monospace');
  const plate=mesh(g,new T.PlaneGeometry(1.42,.53),new T.MeshBasicMaterial({map:tex}),0,1.145,-1.18);
  plate.rotation.x=-Math.PI/2;plate.userData.ownedMaterial=true;
 }
}

function pulseClock(part,g,paint,steel,rim){
 const brass=paint('#bd914a',.6),face=paint('#f4ead0'),lampMat=paint('#8f5f32');
 lampMat.emissive.set('#ffc14d');lampMat.emissiveIntensity=0;
 box(g,steel,0,.78,-1.02,1.96,1.02,1.14);
 box(g,brass,0,1.32,-1.02,2.04,.08,1.20);
 barrel(g,brass,0,.92,-.42,.44,.10);barrel(g,face,0,.92,-.36,.38,.08);
 const hand=group(g,0,.92,-.31);
 box(hand,steel,0,.13,0,.04,.26,.03);part.clockNeedle=hand;
 const lamp=mesh(g,new T.SphereGeometry(.17,18,12),lampMat,0,1.42,-.74);
 lamp.scale.y=.65;part.clockLamp=lampMat;
}

function bitReadout(part,g,paint,steel,rim){
 const body=paint('#222a36'),brass=paint('#c69b51',.6);
 const housing=group(g,0,.98,-1.14);housing.rotation.x=-.35;
 box(housing,body,0,0,0,2.24,1.18,.78);
 box(housing,brass,0,0,.38,2.28,1.22,.06);
 box(housing,body,0,0,.40,1.98,.94,.05);
 const canvas=makeCanvas(256,128);
 if(canvas){
  const ctx=canvas.getContext('2d'),tex=new T.CanvasTexture(canvas);
  tex.colorSpace=T.SRGBColorSpace;
  drawPlate(ctx,256,128,'#131922','#49525e','0','bold 82px monospace');
  const screen=mesh(housing,new T.PlaneGeometry(1.88,.86),new T.MeshBasicMaterial({map:tex}),0,0,.435);
  screen.userData.ownedMaterial=true;
  part.displayCanvas=canvas;part.displayCtx=ctx;part.displayTex=tex;
  part.shownValue=-1;part.shownOn=false;
 }
 part.bitLamps=[0,1,2,3].map(i=>{
  const x=((i/4)-.5)*1.96;
  const mat=paint('#5b4d38');mat.emissive.set('#ffc154');mat.emissiveIntensity=0;
  mesh(g,new T.SphereGeometry(.11,14,10),mat,x,.34,.18).scale.y=.6;
  return mat;
 });
}

function diodeModule(part,g,paint,steel,rim){
 const body=paint('#2c2825'),band=paint('#eae2cc'),jewel=paint('#7a5b32');
 jewel.emissive.set('#ffc358');jewel.emissiveIntensity=0;
 for(const x of [-.91,.91])box(g,rim,x,.44,0,.1,.36,.1);
 const cyl=barrel(g,body,0,.62,0,.22,1.18);cyl.rotation.z=Math.PI/2;cyl.rotation.x=0;
 const cathode=barrel(g,band,.36,.62,0,.232,.18);cathode.rotation.z=Math.PI/2;cathode.rotation.x=0;
 mesh(g,new T.SphereGeometry(.09,14,10),jewel,0,.85,0).scale.y=.55;
 part.diodeGlow=jewel;
}

function spdtSwitch(part,g,paint,steel,rim){
 const brass=paint('#d3ab5d',.58);
 box(g,steel,0,.38,0,1.45,.16,.70);
 for(const x of [-.62,.62])box(g,brass,x,.54,0,.16,.24,.28);
 const arm=group(g,0,.52,0);
 const bar=box(arm,brass,-.26,.22,0,.68,.11,.13);
 bar.rotation.z=-.52;
 arm.rotation.y=part.throwB?Math.PI:0;
 arm.userData.spdt=part;
 bar.userData.spdt=part;
 part.spdtLever=arm;
}

function potentiometer(part,g,paint,steel,rim){
 const body=paint('#354049'),brass=paint('#c89d52',.6),ivory=paint('#f8edd1');
 const mount=group(g,0,.82,-.34);mount.rotation.x=-.35;
 barrel(mount,body,0,0,0,.62,.42);
 barrel(mount,brass,0,0,.28,.40,.22);
 const dial=group(mount,0,0,.40);
 box(dial,ivory,0,.16,0,.07,.24,.04);
 part.potKnob=dial;
}

function glassFuse(part,g,paint,steel,rim){
 const brass=paint('#cfa356',.62),glass=new T.MeshStandardMaterial({color:'#dceced',roughness:.18,transparent:true,opacity:.55}),wire=paint('#e69b52');
 wire.emissive.set('#ff8f32');wire.emissiveIntensity=0;
 for(const x of [-.76,.76]){
  box(g,brass,x,.46,0,.16,.38,.36);
  const cap=barrel(g,rim,x*.82,.60,0,.17,.22);cap.rotation.z=Math.PI/2;cap.rotation.x=0;
 }
 const tubeMesh=barrel(g,glass,0,.60,0,.16,1.02);tubeMesh.rotation.z=Math.PI/2;tubeMesh.rotation.x=0;
 tubeMesh.userData.ownedMaterial=true;
 const filament=barrel(g,wire,0,.60,0,.028,.96);filament.rotation.z=Math.PI/2;filament.rotation.x=0;
 part.fuseGlass=glass;
 part.fuseWire=filament;
 part.fuseWireMat=wire;
}

function voltMeter(part,g,paint,steel,rim){
 const housing=paint('#5a3d28'),cream=paint('#f5ebd2'),needleMat=paint('#b64836');
 const boxGrp=group(g,0,.92,-.86);boxGrp.rotation.x=-.34;
 box(boxGrp,housing,0,0,0,2.08,1.22,.76);
 box(boxGrp,cream,0,.06,.39,1.76,.86,.05);
 for(let i=-3;i<=3;i++){
  const a=i*.34;
  spoke(boxGrp,steel,.46*Math.sin(a),-.10+.46*Math.cos(a),.43,.10,.03,-a);
 }
 const needle=group(boxGrp,0,-.14,.44);
 spoke(needle,needleMat,0,.28,0,.56,.04,0);
 part.meterNeedle=needle;
 const canvas=makeCanvas(256,64);
 if(canvas){
  const ctx=canvas.getContext('2d'),tex=new T.CanvasTexture(canvas);
  tex.colorSpace=T.SRGBColorSpace;
  drawPlate(ctx,256,64,'#efe2c0','#4f3924','0.0 V','bold 42px monospace');
  const screen=mesh(boxGrp,new T.PlaneGeometry(1.48,.34),new T.MeshBasicMaterial({map:tex}),0,-.30,.43);
  screen.userData.ownedMaterial=true;
  part.meterCanvas=canvas;part.meterCtx=ctx;part.meterTex=tex;part.shownMeter='';
 }
}

function npnTransistor(part,g,paint,steel,rim){
 const brass=paint('#c89d54',.58),body=paint('#2a2f38'),copper=paint('#bd6d3c',.5),jewel=paint('#7a5730');
 jewel.emissive.set('#ffb847');jewel.emissiveIntensity=0;
 box(g,brass,0,1.02,-.84,1.32,.66,.22);
 for(const x of [-.48,-.24,0,.24,.48])box(g,brass,x,1.02,-1.04,.10,.66,.22);
 box(g,body,0,.86,-.64,.96,.68,.32);
 mesh(g,new T.SphereGeometry(.12,14,10),jewel,0,.92,-.46).scale.z=.5;
 for(const [lx,tx] of [[-.26,-.87],[0,0],[.26,.87]]){
  tube(g,copper,[[lx,.54,-.62],[lx*.9,.44,-.18],[tx,.34,.55]],.038);
 }
 part.transJewel=jewel;
}

function ballCannon(part,g,paint,steel,rim){
 const copper=paint('#c88246',.62),iron=paint('#29252a',.35),brass=paint('#d8b062',.6),jewel=paint('#8a5c28');
 jewel.emissive.set('#ff9d3b');jewel.emissiveIntensity=0;
 box(g,iron,0,.54,-.24,1.62,.56,1.05);
 for(const x of [-.58,.58])box(g,copper,x,1.02,-.26,.16,.62,.52);
 const barrelGrp=group(g,0,1.18,-.26);
 barrelGrp.rotation.z=.56;
 const tubeMesh=mesh(barrelGrp,new T.CylinderGeometry(.30,.36,1.48,24),brass,.32,0,0);
 tubeMesh.rotation.z=-Math.PI/2;
 const muzzle=mesh(barrelGrp,new T.TorusGeometry(.31,.06,10,24),copper,1.06,0,0);
 muzzle.rotation.y=Math.PI/2;
 mesh(barrelGrp,new T.SphereGeometry(.18,14,10),jewel,-.44,0,0);
 const plateMat=new T.MeshBasicMaterial({color:'#efe2c0'});
 const plate=makeCanvas(256,64);
 if(plate){
  const ctx=plate.getContext('2d');
  drawPlate(ctx,256,64,'#1b181d','#f4cf88','0.0 V','bold 42px monospace');
  const tex=new T.CanvasTexture(plate);tex.colorSpace=T.SRGBColorSpace;
  plateMat.map=tex;plateMat.needsUpdate=true;
  part.cannonCtx=ctx;part.cannonTex=tex;
 }
 const panel=group(g,0,.56,.30);
 panel.rotation.x=-.22;
 box(panel,iron,0,0,-.02,1.18,.34,.08);
 const screen=mesh(panel,new T.PlaneGeometry(1.06,.26),plateMat,0,0,.025);
 screen.userData.ownedMaterial=true;
 part.cannonJewel=jewel;
}

export const themeColors={
 radio:{top:'#78a99c',edge:'#264d4c',accent:'#eca85d',sky:'#cadaac'},
 theater:{top:'#564665',edge:'#272339',accent:'#e297e3',sky:'#463958'},
 factory:{top:'#738490',edge:'#2a3944',accent:'#e97930',sky:'#a9b9bb'},
 observatory:{top:'#3c4d63',edge:'#1f293a',accent:'#e5b869',sky:'#182133'},
 proving:{top:'#3c3633',edge:'#1c191d',accent:'#d88c4a',sky:'#161419'},
 greenhouse:{top:'#e0b882',edge:'#1b5142',accent:'#f0a830',sky:'#9fdcf2'}
};
export function unitRoom(theme){
 const colors=themeColors[theme],room=new T.Scene();
 room.background=new T.Color(colors.sky);room.fog=new T.FogExp2(colors.sky,theme==='greenhouse'?.0028:.013);
 room.add(new T.HemisphereLight(theme==='greenhouse'?'#fffef4':'#fff7ea',theme==='greenhouse'?'#7ab882':'#70798d',theme==='greenhouse'?3.0:2.5));
 const light=new T.DirectionalLight('#fff3cc',theme==='greenhouse'?2.5:2);light.position.set(-14,26,18);room.add(light);
 const steel=finish(colors.edge),panel=finish(colors.top),accent=finish(colors.accent),silver=finish('#bfcbca'),ink=finish('#242e3a');
 const floorMat=theme==='greenhouse'?finish('#cbb796',.08):panel;
 box(room,floorMat,0,-9,0,theme==='greenhouse'?184:170,1,theme==='greenhouse'?172:170);
 if(theme!=='greenhouse'){
  box(room,steel,0,6,-33,76,33,1);
  for(const x of [-13,13])for(const z of [-10,10])box(room,steel,x,-4.5,z,.75,9,.75);
 }
 if(theme==='factory'){
  const pane=new T.MeshBasicMaterial({color:'#c4dadb'});
  for(let i=0;i<8;i++){const x=-29+i*8;box(room,pane,x,6,-32.3,7.5,12,.3);box(room,steel,x,6,-31.9,7.5,.24,.32);}
  for(const x of [-27,-4,22]){box(room,steel,x,5,-20,.85,29,1);box(room,accent,x,-4.2,-20,1,8,1.1);}
  box(room,accent,0,10,-19,72,1.1,1.5);
  box(room,steel,9,8.9,-19,3.5,1.2,2.5);
  for(const x of [8.5,9.5])box(room,ink,x,5,-19,.14,7.3,.14);
  ring(room,accent,9,.8,-19,.9,.24);
  for(let i=0;i<3;i++){
   const x=-17+i*12;
   box(room,panel,x,-4,-26,8,6,5);
   barrel(room,ink,x,-.5,-24,2.2,2);ring(room,silver,x,-.5,-22.8,1.7,.18);
  }
 }else if(theme==='radio'){
  box(room,silver,0,3,-32.2,51,17,.5);
  for(let i=0;i<5;i++){const x=-22+i*10;
   box(room,steel,x,2,-27,8,5.5,4);
   box(room,panel,x-.8,2.3,-24.9,4.8,3.2,.15);
   for(let j=0;j<2;j++)barrel(room,accent,x+2.6,1+j*1.7,-24.6,.52,.45);
   for(let j=0;j<9;j++)box(room,silver,x-2.8+j*.47,2+Math.sin(j*.8)*.7,-24.75,.44,.13,.15);
  }
  for(const y of [-1.1,7.5])box(room,steel,0,y,-27,60,.45,6);
  for(let i=0;i<9;i++){const x=-20+i*5;box(room,panel,x,9,-28,3.8,2.7,3);box(room,accent,x,9,-26.4,1.3,.48,.1);}
 }else if(theme==='observatory'){
  const night=new T.MeshBasicMaterial({color:'#071022'}),star=new T.MeshBasicMaterial({color:'#ffe7a0'}),lineGold=new T.MeshBasicMaterial({color:'#a48244'}),brass=finish('#c89a50',.58);
  for(const x of [-15,0,15]){
   box(room,night,x,7,-32.2,10,14,.3);
   box(room,brass,x,14.1,-31.9,10.5,.45,.45);
   box(room,brass,x,-.1,-31.9,10.5,.45,.45);
   const pts=[];
   for(let s=0;s<7;s++){
    const sx=x-3.4+((s*3.1)%6.8),sy=2.8+((s*4.3)%8.4);
    mesh(room,new T.SphereGeometry(.15,8,6),star,sx,sy,-31.9);
    pts.push([sx,sy]);
   }
   for(let s=0;s<4;s++){
    const [x1,y1]=pts[s],[x2,y2]=pts[s+1];
    const len=Math.hypot(x2-x1,y2-y1);
    const seg=box(room,lineGold,(x1+x2)/2,(y1+y2)/2,-31.95,len,.05,.04);
    seg.rotation.z=Math.atan2(y2-y1,x2-x1);
   }
  }
  for(const rx of [-19,0,19]){
   const arch=mesh(room,new T.TorusGeometry(13,.22,8,28,Math.PI),brass,rx,13.5,-24);
   arch.rotation.y=Math.PI/2;arch.castShadow=false;
  }
  const scope=group(room,-16,1.5,-22);scope.rotation.y=.52;
  for(const a of [-.45,0,.45]){const leg=box(scope,ink,Math.sin(a)*1.4,-3.8,Math.cos(a)*1.4,.28,8.5,.28);leg.rotation.z=-Math.sin(a)*.25;leg.rotation.x=Math.cos(a)*.2;}
  const tubeGrp=group(scope,0,0,0);tubeGrp.rotation.x=.55;
  barrel(tubeGrp,brass,0,0,0,.95,7.2);barrel(tubeGrp,accent,0,0,3.6,1.15,.5);barrel(tubeGrp,ink,0,0,-3.7,.45,.9);
  for(let i=0;i<4;i++){
   const x=10+i*5.5;
   box(room,ink,x,1,-27,4.5,14,4);
   box(room,brass,x,8.2,-27,4.7,.25,4.2);
   for(let r=0;r<4;r++)box(room,accent,x-1.2+r*.8,5-r*1.5,-24.9,.45,.25,.12);
  }
 }else if(theme==='proving'){
  const slate=finish('#242024',.28),copper=finish('#c88044',.62),glow=new T.MeshBasicMaterial({color:'#ffcf82',transparent:true,opacity:.14,depthWrite:false});
  for(const x of [-18,0,18]){
   box(room,slate,x,5,-31.8,11,14,.6);
   box(room,copper,x,12.2,-31.4,11.6,.45,.75);
   box(room,copper,x-5.4,5,-31.4,.45,14,.75);
   box(room,copper,x+5.4,5,-31.4,.45,14,.75);
   box(room,panel,x,5,-32.2,9.2,12.2,.25);
  }
  box(room,copper,0,11.2,-19,64,.55,.8);
  for(const x of [-15,0,15]){
   box(room,steel,x,10.6,-19,1.2,.8,1.2);
   const hood=mesh(room,new T.CylinderGeometry(.55,.95,1.1,16),copper,x,9.7,-19);
   hood.castShadow=false;
   const beam=mesh(room,new T.CylinderGeometry(.8,4.6,10.5,18,1,true),glow,x,4.1,-19);
   beam.castShadow=false;
  }
  for(const x of [-25,25]){
   box(room,slate,x,1,-24,3.8,18,3.8);
   box(room,copper,x,10.2,-24,4.2,.35,4.2);
  }
 }else if(theme==='greenhouse'){
  const glass=new T.MeshBasicMaterial({color:'#e8fbf7',transparent:true,opacity:.18,depthWrite:false,side:T.DoubleSide});
  const iron=finish('#1b5142',.44),terracotta=finish('#cc633f',.08),cedar=finish('#b87d4b',.12),stone=finish('#e6dbc3',.06);
  const leafDark=finish('#246b3e',.08),leafMid=finish('#3da355',.08),leafBright=finish('#7dd45a',.08);
  const jewelMats=['#f7b733','#f06c5b','#3fc7be','#84d252','#a480f2'].map(c=>new T.MeshBasicMaterial({color:c,transparent:true,opacity:.56,depthWrite:false,side:T.DoubleSide}));
  const bloomMats=['#ffaa2b','#f25c54','#ea63a5','#a77bf3','#4ea8f5'].map(c=>finish(c,.12));
  const bark=finish('#7c5234',.15);
  const addPlant=(px,py,pz,scale=1,ci=0)=>{
   const bush=group(room,px,py,pz);
   mesh(bush,new T.SphereGeometry(1.5*scale,10,8),leafDark,0,.6*scale,0);
   mesh(bush,new T.SphereGeometry(1.18*scale,10,8),leafMid,-.95*scale,.95*scale,.35*scale);
   mesh(bush,new T.SphereGeometry(1.1*scale,10,8),leafBright,.9*scale,1.2*scale,-.3*scale);
   mesh(bush,new T.SphereGeometry(.42*scale,8,6),bloomMats[ci%5],-.55*scale,1.8*scale,.55*scale);
   mesh(bush,new T.SphereGeometry(.38*scale,8,6),bloomMats[(ci+1)%5],.65*scale,1.95*scale,.25*scale);
   mesh(bush,new T.SphereGeometry(.35*scale,8,6),bloomMats[(ci+2)%5],.05*scale,2.1*scale,-.4*scale);
  };
  // Vivid outdoor sunny lawn extending past all 4 glass walls + tiled conservatory floor
  box(room,finish('#6eb95d',.06),0,-9.7,0,280,.8,280);
  for(let px=-72;px<=72;px+=18)for(let pz=-66;pz<=66;pz+=18){
   box(room,stone,px,-8.48,pz,15,.08,15);
  }
  box(room,iron,0,-8.45,70.5,160,.1,1.6);box(room,iron,0,-8.45,-70.5,160,.1,1.6);
  box(room,iron,76.5,-8.45,0,1.6,.1,142);box(room,iron,-76.5,-8.45,0,1.6,.1,142);
  // 360-degree conservatory walls extending cleanly to eaves y = 72 so top-down cameras stay unobstructed
  for(const sz of [-1,1]){
   const z=sz*80;
   box(room,terracotta,0,-5.15,z,172,6.7,1.4);
   box(room,stone,0,-1.6,z,173,.55,2);
   for(let i=0;i<8;i++){
    const x=-70+i*20;
    box(room,glass,x,15.85,z,19.3,34.3,.2);
    box(room,jewelMats[i%5],x,37.5,z,19.3,8.2,.2);
    box(room,glass,x,56.9,z,19.3,29.8,.2);
    box(room,iron,x-10,35.2,z,.65,73.6,.8);
    for(const h of [14,33.2,42,72])box(room,iron,x,h,z,20,.42,.6);
    const arch=mesh(room,new T.TorusGeometry(9.6,.34,8,20,Math.PI),iron,x,33.2,z);
    arch.castShadow=false;
   }
   box(room,iron,80,35.2,z,.65,73.6,.8);
   // Gable end stained-glass sunburst & diagonal rafters above eaves (y = 72..104)
   const gAngle=Math.atan2(32,86),gLen=Math.hypot(32,86);
   for(const side of [-1,1]){
    const r=box(room,iron,side*43,88,z,gLen,.75,.85);
    r.rotation.z=-side*gAngle;
   }
   for(const [gy,gw,gi] of [[76.5,148,0],[84.5,108,2],[93.5,64,4],[100,24,1]]){
    box(room,jewelMats[gi],0,gy,z,gw,7.6,.22);
    box(room,iron,0,gy-3.8,z,gw+4,.48,.65);
   }
  }
  for(const sx of [-1,1]){
   const x=sx*86;
   box(room,terracotta,x,-5.15,0,1.4,6.7,160);
   box(room,stone,x,-1.6,0,2,.55,161);
   for(let j=0;j<6;j++){
    const z=-62.5+j*25;
    box(room,glass,x,15.85,z,.2,34.3,24.2);
    box(room,jewelMats[(j+1)%5],x,37.5,z,.2,8.2,24.2);
    box(room,glass,x,56.9,z,.2,29.8,24.2);
    box(room,iron,x,35.2,z-12.5,.8,73.6,.65);
    for(const h of [14,33.2,42,72])box(room,iron,x,h,z,.6,.42,25);
    const arch=mesh(room,new T.TorusGeometry(12.1,.36,8,20,Math.PI),iron,x,33.2,z);
    arch.rotation.y=Math.PI/2;arch.castShadow=false;
   }
   box(room,iron,x,35.2,75,.8,73.6,.65);
  }
  // High pitched glass skylight roof (eaves y = 72 at x = +-86, ridge y = 104 at x = 0) with clear overhead airspace
  const roofAngle=Math.atan2(32,86),roofLen=Math.hypot(32,86);
  for(const side of [-1,1]){
   const rg=box(room,glass,side*43,88,0,roofLen+1,.24,162);
   rg.rotation.z=-side*roofAngle;rg.castShadow=false;
   for(let k=0;k<5;k++){
    const st=box(room,jewelMats[(k+2)%5],side*43,87.85,-60+k*30,roofLen-4,.22,6.5);
    st.rotation.z=-side*roofAngle;st.castShadow=false;
   }
  }
  for(let rz=-80;rz<=80;rz+=20){
   for(const side of [-1,1]){
    const rf=box(room,iron,side*43,87.6,rz,roofLen+1,.75,.75);
    rf.rotation.z=-side*roofAngle;
   }
  }
  box(room,accent,0,104,0,1.2,1.3,164);
  // Colorful perimeter cedar planter beds & flowering pots strictly outside |x| >= 75 or |z| >= 69
  for(const sz of [-1,1]){
   box(room,cedar,0,-6.2,sz*73,144,4.6,5.4);
   for(let i=-4;i<=4;i++){
    const px=i*15;
    addPlant(px,-4.0,sz*73,1.65,Math.abs(i)+sz+3);
   }
  }
  for(const sx of [-1,1]){
   box(room,cedar,sx*79.5,-6.2,0,5.4,4.6,128);
   for(let j=-3;j<=3;j++){
    const pz=j*18;
    addPlant(sx*79.5,-4.0,pz,1.65,Math.abs(j)+sx+4);
   }
  }
  // Tall corner terracotta urns & multi-tier botanical palms
  for(const [cx,cz,ci] of [[-78,-72,0],[78,-72,1],[-78,72,2],[78,72,3]]){
   mesh(room,new T.CylinderGeometry(2.6,1.8,4.6,14),terracotta,cx,-6.2,cz);
   mesh(room,new T.CylinderGeometry(.38,.52,15,8),bark,cx,1.5,cz);
   addPlant(cx,8.2,cz,2.4,ci);
  }
  // Perimeter wall-mounted hanging brass flower baskets (horizontal wall brackets leave overhead view open)
  for(const [hx,hy,hz,ci] of [[-75,29,-40,0],[-75,29,0,2],[-75,29,40,4],[75,29,-40,1],[75,29,0,3],[75,29,40,0],[-40,31,-69,2],[0,31,-69,4],[40,31,-69,1],[-40,31,69,3],[0,31,69,0],[40,31,69,2]]){
   if(Math.abs(hx)===75)box(room,accent,Math.sign(hx)*80.5,hy+1.8,hz,11.2,.2,.2);
   else box(room,accent,hx,hy+1.8,Math.sign(hz)*74.5,.2,.2,11.2);
   mesh(room,new T.CylinderGeometry(.08,.08,2.2,8),accent,hx,hy+.7,hz);
   mesh(room,new T.CylinderGeometry(2.2,1.3,1.7,12),terracotta,hx,hy-.6,hz);
   addPlant(hx,hy+.2,hz,1.35,ci);
  }
  // Blossoming garden trees ringing ALL 4 exterior glass walls
  const canopyPalette=[leafMid,leafBright,finish('#f792b8',.08),finish('#a07bf5',.08),finish('#f5c43d',.08),leafDark];
  const outerTrees=[
   ...[-68,-40,-12,16,44,70].flatMap((tx,i)=>[[tx,-95,i],[tx,95,i+2]]),
   ...[-56,-28,0,28,56].flatMap((tz,i)=>[[-101,tz,i+1],[101,tz,i+3]])
  ];
  for(const [ox,oz,ti] of outerTrees){
   const tree=group(room,ox,-9,oz);
   mesh(tree,new T.CylinderGeometry(1.1,1.6,17,8),bark,0,8.5,0);
   mesh(tree,new T.SphereGeometry(8.5,10,8),canopyPalette[ti%canopyPalette.length],0,18,0);
   mesh(tree,new T.SphereGeometry(6.2,10,8),canopyPalette[(ti+1)%canopyPalette.length],3.8,21,2.2);
   mesh(tree,new T.SphereGeometry(5.8,10,8),leafMid,-3.6,16.5,-2.0);
  }
 }else{
  box(room,ink,0,2,-27,49,15,1);
  const curtain=finish('#652c50');
  for(const side of [-1,1])for(let i=0;i<7;i++){
   const fold=mesh(room,new T.CylinderGeometry(.95,1.15,22,16),curtain,side*(17+i*1.3),3,-24);fold.scale.z=.65;
  }
  for(const y of [7,9])box(room,silver,0,y,-20,57,.22,.28);
  for(let i=-5;i<=5;i++)spoke(room,silver,i*4.5,8,-20,4.7,.15,i%2?.99:-.99);
  for(let i=0;i<5;i++){
   const x=-16+i*8;box(room,ink,x,6.5,-20,.3,2,.4);barrel(room,ink,x,5.2,-19,1.25,2.3);
   barrel(room,new T.MeshBasicMaterial({color:['#fb9c83','#a69dec','#99d9dc'][i%3]}),x,5.2,-17.8,1,.12);
  }
 }
 return softenRoom(room);
}

export function makeUnitPart(part,g){
 // These materials belong to one removable instrument.
 const mats=[];
 const paint=(c,m)=>{const value=finish(c,m);mats.push(value);return value;};
 const steel=paint('#374952',.48),rim=paint('#afb9b6',.6);
 if(part.kind==='motor'){
  const orange=paint('#d96826'),blue=paint('#33606b'),mark=paint('#ffdf7c');
  box(g,steel,0,.28,-1.2,3.1,.45,3.15);
  box(g,blue,0,.84,-1.7,1.55,1.1,1.9);
  barrel(g,blue,0,2.15,-1.7,1.22,2.55);
  for(let i=0;i<8;i++)barrel(g,steel,0,2.15,-2.8+i*.25,1.28,.082);
  barrel(g,orange,0,2.15,-.55,1.27,.45);barrel(g,rim,0,2.15,-.16,.31,.55);
  box(g,orange,0,3.51,-1.9,1.02,.49,1.1);
  box(g,steel,0,3.78,-1.9,1.08,.09,1.16);
  for(const x of [-.74,.74])for(const y of [1.45,2.85])screw(g,rim,steel,x,y,-.30,.085);
  const wheel=new T.Group();wheel.position.set(0,2.15,.1);g.add(wheel);
  ring(wheel,orange,0,0,0,1.39,.18);barrel(wheel,steel,0,0,0,.33,.32);
  for(let i=0;i<3;i++)spoke(wheel,rim,0,0,0,2.6,.13,i*Math.PI/3);
  box(wheel,mark,0,1.37,.15,.31,.32,.1);part.rotor=wheel;
 }else if(part.kind==='capacitor'){
  const green=paint('#246964'),paper=paint('#fbefd0'),red=paint('#b65a44');
  box(g,green,0,1.35,-1,2.55,2.3,1.35);
  // Two metal capacitor cans rise above the meter chassis.
  for(const x of [-.65,.65]){
   mesh(g,new T.CylinderGeometry(.39,.39,.94,28),rim,x,2.95,-1.21);
   for(const y of [2.57,3.3])mesh(g,new T.CylinderGeometry(.41,.41,.065,28),steel,x,y,-1.21);
   box(g,steel,x,3.43,-1.21,.38,.025,.035);
  }
  barrel(g,rim,0,1.62,-.29,.96,.15);
  barrel(g,paper,0,1.62,-.17,.85,.12);
  for(let i=0;i<7;i++){const a=-1.12+i*.37;spoke(g,steel,.67*Math.sin(a),1.55+.67*Math.cos(a),-.07,.14,.045,-a);}
  const needle=new T.Group();needle.position.set(0,1.42,-.02);g.add(needle);spoke(needle,red,0,.37,0,.78,.055,0);
  barrel(g,steel,0,1.42,.04,.09,.1);part.needle=needle;
 }else if(part.kind==='led'){
  const green=part.color==='green',shell=paint('#443b52'),lens=paint(green?'#357850':'#ab4b43');
  lens.emissive.set(green?'#3eff72':'#ff392e');lens.emissiveIntensity=0;
  box(g,steel,0,.7,-.9,.28,1.2,.36);
  for(const x of [-1.03,1.03])box(g,rim,x,1.45,-.92,.15,1.15,.24);
  box(g,rim,0,.9,-.92,2.1,.18,.25);barrel(g,shell,0,2,-1.15,1,1.6);
  for(let i=0;i<4;i++)ring(g,steel,0,2,-1.8+i*.33,1,.055);
  barrel(g,lens,0,2,-.31,.83,.13);ring(g,rim,0,2,-.19,.88,.07);
  for(let i=1;i<4;i++)ring(g,lens,0,2,-.19,i*.2,.022);
  part.lens=lens;
 }else if(part.kind==='photo')photocell(part,g,paint,rim);
 else if(part.kind==='gear')gearMotor(part,g,paint,steel,rim);
 else if(part.kind==='servo')positionalServo(part,g,paint,steel,rim);
 else if(part.kind==='rgb')stageMixer(part,g,paint,steel,rim);
 else if(part.kind==='bell')thresholdBell(part,g,paint,steel,rim);
 else if(part.kind==='jack')testSocket(g,paint,steel,rim);
 else if(part.kind==='relay')sensorRelay(part,g,paint,steel,rim);
 else if(part.kind==='coil')coilRelay(part,g,paint,steel,rim);
 else if(part.kind==='button')pushButton(part,g,paint,steel,rim);
 else if(part.kind==='rail')busBar(g,paint,steel);
 else if(part.kind==='gate')logicGate(part,g,paint,steel,rim);
 else if(part.kind==='latch')memoryLatch(part,g,paint,steel,rim);
 else if(part.kind==='clock')pulseClock(part,g,paint,steel,rim);
 else if(part.kind==='display')bitReadout(part,g,paint,steel,rim);
 else if(part.kind==='diode')diodeModule(part,g,paint,steel,rim);
 else if(part.kind==='spdt')spdtSwitch(part,g,paint,steel,rim);
 else if(part.kind==='pot')potentiometer(part,g,paint,steel,rim);
 else if(part.kind==='fuse')glassFuse(part,g,paint,steel,rim);
 else if(part.kind==='meter')voltMeter(part,g,paint,steel,rim);
 else if(part.kind==='transistor')npnTransistor(part,g,paint,steel,rim);
 else if(part.kind==='cannon')ballCannon(part,g,paint,steel,rim);
 g.userData.instrumentMaterials=mats;
}

// In linear light, each channel contributes independently to the mixed cue.
function channelLevel(state,id,index,powered){
 const amps=powered?state.currents[id+'/'+index]||0:0;
 return T.MathUtils.clamp(amps*7,0,1);
}
export function rgbCue(state,partId,powered,targetColor){
 return targetColor.setRGB(channelLevel(state,partId,0,powered),channelLevel(state,partId,1,powered),channelLevel(state,partId,2,powered));
}
const sunlitCeramic=new T.Color('#efab71'),shadedCeramic=new T.Color('#835a49');
export function updateDeviceVisual(part,state,activity,powered,elapsed=0){
 if(part.sensorFace){
  const shade=T.MathUtils.clamp(((state.light?.[part.id]??600)-600)/9400,0,1);
  part.sensorFace.color.lerpColors(sunlitCeramic,shadedCeramic,shade);
 }else if(part.mixLens){
  rgbCue(state,part.id,powered,part.mixLens.emissive);
  part.mixLens.emissiveIntensity=3;
  for(const [i,led] of part.emitters.entries())led.emissiveIntensity=channelLevel(state,part.id,i,powered)*4;
 }else if(part.outputGear){
  const speed=powered?(state.currents[part.id]||0)*14:0;
  part.outputGear.rotation.z-=speed*elapsed;
  part.pinion.rotation.z+=speed*elapsed*2;
 }else if(part.servoHorn){
  if(part.dial!==undefined){
   const v=powered?Math.abs((state.voltages?.[part.id+':0']||0)-(state.voltages?.[part.id+':1']||0)):0;
   const deg=v>3?part.dial:(part.heldDeg??0);
   part.heldDeg=deg;
   part.servoHorn.rotation.y=-T.MathUtils.degToRad(deg);
   part.dialMark.rotation.z=-T.MathUtils.degToRad(part.dial||0);
  }else{
   part.servoHorn.rotation.y=-T.MathUtils.degToRad(activity.gate||0);
   part.dialMark.rotation.z=-T.MathUtils.degToRad(activity.dial||0);
  }
 }else if(part.hammer){
  const voltage=powered?(state.voltages[part.id+':0']||0)-(state.voltages[part.id+':1']||0):0;
  if(voltage>=3&&!part.wasRinging)part.strikeTime=.44;
  part.wasRinging=voltage>=3;
  part.strikeTime=Math.max(0,part.strikeTime-elapsed);
  part.hammer.rotation.z=.04+.34*Math.sin((.44-part.strikeTime)*45)*part.strikeTime/.44;
 }else if(part.contactArm){
  const closed=powered&&(state.relayContacts?.[part.id]??Math.abs(state.currents[part.id]||0)>.001);
  part.contactArm.rotation.z=closed?-.24:.08;
 }else if(part.coilArm){
  part.coilArm.rotation.z=powered&&part.energized?-.24:.09;
 }else if(part.plunger){
  part.plunger.position.y=part.closed?.46:.58;
 }else if(part.gateJewel){
  part.gateJewel.emissiveIntensity=powered&&part.outputHigh?3:0;
  const mode=part.gateMode||'NAND';
  if(part.gateCtx&&part.shownMode!==mode){
   part.shownMode=mode;
   drawPlate(part.gateCtx,256,128,'#1b212c','#f3dfb0',mode,'bold 68px monospace');
   part.gateTex.needsUpdate=true;
  }
 }else if(part.latchJewel){
  part.latchJewel.emissiveIntensity=powered&&part.bit?3.2:0;
 }else if(part.clockNeedle){
  const hz=part.clockHz||1,phase=(part.phase||0)*hz;
  part.clockNeedle.rotation.z=-phase*Math.PI*2;
  part.clockLamp.emissiveIntensity=powered&&part.high?3:0;
 }else if(part.bitLamps){
  const val=powered?(state.displayValues?.[part.id]??0):0;
  for(let i=0;i<4;i++)part.bitLamps[i].emissiveIntensity=powered&&((val>>i)&1)?2.8:0;
  if(part.displayCtx&&(part.shownValue!==val||part.shownOn!==powered)){
   part.shownValue=val;part.shownOn=powered;
   drawPlate(part.displayCtx,256,128,'#131922',powered?'#ffca67':'#49525e',powered?String(val):'-','bold 82px monospace');
   part.displayTex.needsUpdate=true;
  }
 }else if(part.diodeGlow){
  const amps=powered?(state.currents[part.id]||0):0;
  part.diodeGlow.emissiveIntensity=amps>.01?Math.min(2.8,amps*8):0;
 }else if(part.spdtLever){
  part.spdtLever.rotation.y=part.throwB?Math.PI:0;
 }else if(part.potKnob){
  const t=Math.max(0,Math.min(1,part.wiper??.5));
  part.potKnob.rotation.z=(.5-t)*Math.PI*1.5;
 }else if(part.fuseWire){
  const blown=!!part.blown;
  part.fuseWire.visible=!blown;
  const load=powered&&!blown?Math.abs(state.currents[part.id]||0)/(part.fuseRating||.35):0;
  part.fuseWireMat.emissiveIntensity=load>.6?Math.min(2.5,(load-.6)*4):0;
  part.fuseGlass.color.set(blown?'#4e4945':'#dceced');
  part.fuseGlass.opacity=blown?.75:.55;
 }else if(part.meterNeedle){
  const v=powered?(state.meterVoltages?.[part.id]??((state.voltages?.[part.id+':0']||0)-(state.voltages?.[part.id+':1']||0))):0;
  const clamped=T.MathUtils.clamp(v/6,-1,1);
  part.meterNeedle.rotation.z=-clamped*1.05;
  const txt=(v>=.05?'+':v<=-.05?'':'')+v.toFixed(1)+' V';
  if(part.meterCtx&&part.shownMeter!==txt){
   part.shownMeter=txt;
   drawPlate(part.meterCtx,256,64,'#efe2c0','#4f3924',txt,'bold 42px monospace');
   part.meterTex.needsUpdate=true;
  }
 }else if(part.transJewel){
  part.transJewel.emissiveIntensity=powered&&part.conducting?2.6:0;
 }else if(part.cannonJewel){
  const v=powered?Math.abs((state.voltages?.[part.id+':0']||0)-(state.voltages?.[part.id+':1']||0)):0;
  const sweet=v>=3.8&&v<=4.7;
  part.cannonJewel.emissive.set(part.discharging?'#fff0b5':sweet?'#57d176':'#ff9d3b');
  part.cannonJewel.emissiveIntensity=part.discharging?4.2:powered?Math.min(2.6,v/2.4):0;
  const txt=powered?v.toFixed(1)+' V':'0.0 V';
  if(part.cannonCtx&&part.shownCannon!==txt){
   part.shownCannon=txt;
   drawPlate(part.cannonCtx,256,64,'#1b181d',sweet&&powered?'#93f2a8':'#f4cf88',txt,'bold 42px monospace');
   part.cannonTex.needsUpdate=true;
  }
 }
}
