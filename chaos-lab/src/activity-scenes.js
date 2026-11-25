import * as T from 'three';

const paint = (color, metalness = .12) => new T.MeshStandardMaterial({color, metalness, roughness: .56});
const clamp = T.MathUtils.clamp;
const up = new T.Vector3(0, 1, 0);

function mesh(parent, geometry, material, x = 0, y = 0, z = 0) {
  const object = new T.Mesh(geometry, material);
  object.position.set(x, y, z);
  object.castShadow = object.receiveShadow = true;
  parent.add(object);
  return object;
}

function box(parent, material, x, y, z, width, height, depth) {
  return mesh(parent, new T.BoxGeometry(width, height, depth), material, x, y, z);
}

function rod(parent, material, from, to, radius) {
  const direction = new T.Vector3().subVectors(to, from);
  const tube = mesh(parent, new T.CylinderGeometry(radius, radius, direction.length(), 16), material);
  tube.position.addVectors(from, to).multiplyScalar(.5);
  tube.quaternion.setFromUnitVectors(up, direction.normalize());
  return tube;
}

function group(parent, x = 0, y = 0, z = 0) {
  const result = new T.Group();
  result.position.set(x, y, z);
  parent.add(result);
  return result;
}

// Reuse the same soft-edged profile for the shade footprint and the stage wash.
function poolTexture() {
  const size = 64, pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const r = Math.hypot((2*x+1)/size-1, (2*y+1)/size-1);
      const fade = 1 - T.MathUtils.smoothstep(r, .18, 1);
      const offset = (y*size+x)*4;
      pixels.fill(Math.round(255*fade), offset, offset+4);
    }
  }
  const map = new T.DataTexture(pixels, size, size);
  map.magFilter = map.minFilter = T.LinearFilter;
  map.needsUpdate = true;
  return map;
}

function shadeBench(root) {
  const brass = paint('#ad8443', .65), dark = paint('#423930'), teal = paint('#335f58');
  const V = (x,y,z) => new T.Vector3(x,y,z);
  for (const x of [-6.9,6.9]) {
    box(root,dark,x,.23,-2.1,1,.20,.92);
    rod(root,brass,V(x,.3,-2.1),V(x,2.9,-2.1),.1);
    mesh(root,new T.SphereGeometry(.17,18,12),brass,x,2.92,-2.1);
  }
  rod(root,brass,V(-6.9,2.69,-2.1),V(6.9,2.69,-2.1),.085);
  const slider = group(root);
  const screen = group(slider,0,2.2,-1.71);
  screen.name='shade-handle';
  screen.rotation.x = -.67;
  box(screen,brass,0,0,0,2.45,1.31,.12);
  box(screen,teal,0,0,.07,2.27,1.13,.055);
  for (let n = -2; n <= 2; n++) {
    box(screen,dark,0,n*.19,.115,2.03,.048,.09).rotation.x = -.28;
  }
  // The meter's lamp casts the soft footprint below the carriage.
  screen.traverse(object => { object.castShadow = false; });
  for (const x of [-.83,.83]) {
    const eye = mesh(slider,new T.TorusGeometry(.15,.045,8,20),brass,x,2.7,-2.1);
    eye.rotation.y = Math.PI/2;
  }
  const shadow = mesh(slider,new T.PlaneGeometry(5.3,5.8),new T.MeshBasicMaterial({
    color:'#362b40', map:poolTexture(), transparent:true, opacity:.54, depthWrite:false
  }),0,.137,0);
  shadow.rotation.x = -Math.PI/2;
  shadow.castShadow = false;
  return activity => { slider.position.x = activity.shadow; };
}

function stageCurtain(root) {
  const brass = paint('#bc9254',.6), steel = paint('#34383e',.38);
  const cloth = paint('#635863',0);
  cloth.roughness = .93;
  cloth.emissiveMap = poolTexture();
  cloth.emissiveIntensity = 2.4;
  cloth.side = T.DoubleSide;
  const width = 10.2, height = 4.1;
  const geometry = new T.PlaneGeometry(width,height,96,12);
  const pos = geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), top = (y + height/2)/height;
    const fold = Math.cos((x/width+.5)*Math.PI*20);
    pos.setXYZ(i,x,y+(1-top)*.09*fold,.17*fold*(1.25-top*.35));
  }
  geometry.computeVertexNormals();
  mesh(root,geometry,cloth,0,2.55,-5.8);
  const V = (x,y,z) => new T.Vector3(x,y,z);
  rod(root,brass,V(-5.75,4.75,-5.8),V(5.75,4.75,-5.8),.09);
  for (const x of [-5.42,5.42]) {
    box(root,steel,x,.24,-5.8,.79,.22,1.28);
    rod(root,steel,V(x,.35,-5.8),V(x,4.76,-5.8),.08);
    mesh(root,new T.SphereGeometry(.17,18,12),brass,x,4.75,-5.8);
  }
  for (let i=0; i<11; i++) {
    const eye=mesh(root,new T.TorusGeometry(.135,.028,6,16),brass,-5.05+i*1.01,4.68,-5.8);
    eye.rotation.y=Math.PI/2;
  }
  return (activity, parts, state, powered) => {
    const rgb=parts.find(p=>p.kind==='rgb');
    const channel = i => powered && rgb ? Math.pow(clamp((state?.currents?.[rgb.id+'/'+i]||0)/.09,0,1),.72) : 0;
    cloth.emissive.setRGB(channel(0),channel(1),channel(2));
  };
}

function makeCrate(parent, heavy) {
  const crate = group(parent), wood=paint('#ba844d'), batten=paint('#e2ac68'), band=paint('#394d4d',.45);
  box(crate,wood,0,.50,0,1.04,.88,.96);
  for(const z of [-.5,.5]) {
    for (const x of [-.43,.43]) box(crate,batten,x,.50,z,.12,.96,.07);
    box(crate,batten,0,.5,z,1.14,.105,.08).rotation.z=.66;
  }
  for (const x of [-.31,.31]) {
    box(crate,heavy?band:batten,x,.961,0,.11,.055,.99);
    if(heavy)for(const z of [-.51,.51])box(crate,band,x,.51,z,.11,.9,.04);
  }
  return crate;
}

function sortingBins(parent, pivotHeight, colors) {
  const sorter=group(parent,0,0,-1.55);
  const forkY=.94;
  const {rail,steel,accent}=colors;
  for (const side of [-1,1]) {
    const endX=side*2.32, endZ=-2.32;
    const chute=group(sorter,0,pivotHeight,0);
    chute.rotation.y=-side*Math.PI/4;
    const length=Math.hypot(endX,endZ);
    const deck=group(chute);
    deck.rotation.x=-Math.atan2(pivotHeight-forkY,length);
    const span=Math.hypot(length,pivotHeight-forkY);
    box(deck,rail,0,-.07,-span/2,1.25,.13,span);
    for (const x of [-.65,.65])box(deck,steel,x,.10,-span/2,.09,.32,span);
    const bin=group(sorter,endX*1.13,0,endZ*1.13);
    const enamel=paint(side<0?'#3c7473':'#b56135',.23);
    box(bin,enamel,0,.28,0,2.16,.23,1.85);
    for(const x of [-1.02,1.02])box(bin,enamel,x,.68,0,.12,.86,1.85);
    for(const z of [-.86,.86])box(bin,enamel,0,.60,z,2.05,.72,.13);
    for(const x of [-1.03,1.03])box(bin,rail,x,1.12,0,.15,.10,1.93);
    box(bin,rail,0,.99,.89,2.15,.09,.14);
    // A single punched arrow is readable on either bin even at workbench scale.
    box(bin,rail,-side*.04,.68,.947,.49,.085,.045);
    for(const sign of [-1,1])box(bin,rail,side*.15,.68+sign*.073,.947,.29,.085,.045).rotation.z=-side*sign*.62;
  }
  const paddle=group(sorter,0,pivotHeight+.05,0);
  box(paddle,accent,0,.29,-.87,.17,.50,1.74);
  box(paddle,rail,0,.54,-.87,.21,.06,1.76);
  mesh(sorter,new T.CylinderGeometry(.21,.23,.27,24),steel,0,pivotHeight+.12,0);
  return paddle;
}

function makeBevelGear(parent, brass, steel, x, y, z, axis) {
  const gear = group(parent, x, y, z);
  const cone = mesh(gear, new T.CylinderGeometry(.16, .32, .16, 18), brass);
  const hub = mesh(gear, new T.CylinderGeometry(.11, .11, .12, 16), steel);
  const teeth = 10;
  if (axis === 'x') {
    cone.rotation.z = -Math.PI / 2;
    hub.rotation.z = -Math.PI / 2;
    hub.position.x = -.10;
    for (let i = 0; i < teeth; i++) {
      const holder = group(gear);
      holder.rotation.x = i * Math.PI * 2 / teeth;
      box(holder, brass, 0, .25, 0, .18, .045, .055).rotation.z = -Math.PI / 4;
    }
  } else {
    cone.rotation.x = -Math.PI / 2;
    hub.rotation.x = -Math.PI / 2;
    hub.position.z = .10;
    for (let i = 0; i < teeth; i++) {
      const holder = group(gear);
      holder.rotation.z = (i + .5) * Math.PI * 2 / teeth;
      box(holder, brass, 0, .25, 0, .055, .045, .18).rotation.x = -Math.PI / 4;
    }
  }
  return gear;
}

function makeDriveHead(machine, rollerLocal, colors) {
  const {steel, rail, accent, brass} = colors;
  const rollerY = rollerLocal.y, rollerZ = rollerLocal.z;
  box(machine, rail, 1.46, .21, rollerZ, .70, .15, .62);
  const colH = Math.max(.1, rollerY - .46);
  box(machine, steel, 1.46, .28 + colH / 2, rollerZ, .34, colH, .34);
  box(machine, steel, 1.48, rollerY - .18, rollerZ + .16, .66, .12, .74);
  box(machine, steel, 1.26, rollerY, rollerZ, .22, .34, .34);
  mesh(machine, new T.CylinderGeometry(.14, .14, .26, 16), rail, 1.26, rollerY, rollerZ).rotation.z = Math.PI / 2;
  mesh(machine, new T.CylinderGeometry(.095, .095, .64, 16), steel, 1.36, rollerY, rollerZ).rotation.z = Math.PI / 2;
  const rollerBevel = makeBevelGear(machine, brass, steel, 1.50, rollerY, rollerZ, 'x');
  box(machine, steel, 1.74, rollerY, rollerZ + .44, .28, .28, .20);
  mesh(machine, new T.CylinderGeometry(.13, .13, .24, 16), rail, 1.74, rollerY, rollerZ + .44).rotation.x = Math.PI / 2;
  const inputBevel = makeBevelGear(machine, brass, steel, 1.74, rollerY, rollerZ + .24, 'z');
  mesh(inputBevel, new T.CylinderGeometry(.088, .088, .44, 16), steel, 0, 0, .18).rotation.x = Math.PI / 2;
  const engagedZ = rollerZ + .47, disengagedZ = rollerZ + .54;
  const clutch = mesh(machine, new T.CylinderGeometry(.145, .145, .11, 16), accent, 1.74, rollerY, engagedZ);
  clutch.rotation.x = Math.PI / 2;
  const anchor = new T.Object3D();
  anchor.position.set(1.74, rollerY, rollerZ + .61);
  machine.add(anchor);
  return {rollerBevel, inputBevel, clutch, engagedZ, disengagedZ, anchor};
}

function makePulley(parent, brass, steel, x, y, z, radius, width = .13) {
  const pulley = group(parent, x, y, z);
  const drum = mesh(pulley, new T.CylinderGeometry(radius - .02, radius - .02, width, 24), steel);
  drum.rotation.x = Math.PI / 2;
  for (const side of [-1, 1]) {
    const flange = mesh(pulley, new T.CylinderGeometry(radius + .055, radius + .055, .032, 24), brass, 0, 0, side * (width / 2));
    flange.rotation.x = Math.PI / 2;
  }
  mesh(pulley, new T.CylinderGeometry(.095, .095, width + .06, 16), steel).rotation.x = Math.PI / 2;
  for (let i = 0; i < 4; i++) {
    const angle = i * Math.PI / 2;
    mesh(pulley, new T.CylinderGeometry(.028, .028, width + .05, 8), steel,
      Math.cos(angle) * radius * .58, Math.sin(angle) * radius * .58, 0).rotation.x = Math.PI / 2;
  }
  return pulley;
}

function makeVbelt(parent, c1, r1, c2, r2, z, rubber, cleatMat, cleatCount = 16) {
  const dx = c2.x - c1.x, dy = c2.y - c1.y, d = Math.hypot(dx, dy);
  const base = Math.atan2(dy, dx);
  const alpha = Math.acos(clamp((r1 - r2) / d, -.99, .99));
  const aTop = base + alpha, aBot = base - alpha;
  const arc1 = Math.PI * 2 - 2 * alpha, arc2 = 2 * alpha;
  const Ls = Math.sqrt(Math.max(0, d * d - (r1 - r2) ** 2));
  const L1 = r1 * arc1, L2 = r2 * arc2, perimeter = L1 + Ls + L2 + Ls;

  function pointAt(s, offset) {
    const u = ((s % perimeter) + perimeter) % perimeter;
    const R1 = r1 + offset, R2 = r2 + offset;
    if (u < L1) {
      const theta = aTop + u / r1;
      return {x: c1.x + R1 * Math.cos(theta), y: c1.y + R1 * Math.sin(theta), angle: theta + Math.PI / 2};
    }
    if (u < L1 + Ls) {
      const t = (u - L1) / Ls;
      const x1 = c1.x + R1 * Math.cos(aBot), y1 = c1.y + R1 * Math.sin(aBot);
      const x2 = c2.x + R2 * Math.cos(aBot), y2 = c2.y + R2 * Math.sin(aBot);
      return {x: x1 + (x2 - x1) * t, y: y1 + (y2 - y1) * t, angle: aBot + Math.PI / 2};
    }
    if (u < L1 + Ls + L2) {
      const theta = aBot + (u - L1 - Ls) / r2;
      return {x: c2.x + R2 * Math.cos(theta), y: c2.y + R2 * Math.sin(theta), angle: theta + Math.PI / 2};
    }
    const t = (u - L1 - Ls - L2) / Ls;
    const x1 = c2.x + R2 * Math.cos(aTop), y1 = c2.y + R2 * Math.sin(aTop);
    const x2 = c1.x + R1 * Math.cos(aTop), y2 = c1.y + R1 * Math.sin(aTop);
    return {x: x1 + (x2 - x1) * t, y: y1 + (y2 - y1) * t, angle: aTop + Math.PI / 2};
  }

  const samples = 56, outerPts = [], innerPts = [];
  for (let i = 0; i < samples; i++) {
    const p = pointAt((i / samples) * perimeter, .026);
    outerPts.push(new T.Vector2(p.x, p.y));
  }
  for (let i = samples - 1; i >= 0; i--) {
    const p = pointAt((i / samples) * perimeter, -.026);
    innerPts.push(new T.Vector2(p.x, p.y));
  }
  const shape = new T.Shape(outerPts);
  shape.holes.push(new T.Path(innerPts));
  const band = mesh(parent, new T.ExtrudeGeometry(shape, {depth: .105, bevelEnabled: false}), rubber, 0, 0, z - .0525);
  band.castShadow = true;

  const cleats = new T.InstancedMesh(new T.BoxGeometry(.045, .028, .125), cleatMat, cleatCount);
  cleats.castShadow = true;
  parent.add(cleats);

  const matrix = new T.Matrix4(), pos = new T.Vector3(), quat = new T.Quaternion();
  const zAxis = new T.Vector3(0, 0, 1), scaleOne = new T.Vector3(1, 1, 1);

  return {
    update(offset) {
      for (let i = 0; i < cleatCount; i++) {
        const p = pointAt((i / cleatCount) * perimeter + offset, .03);
        pos.set(p.x, p.y, z);
        quat.setFromAxisAngle(zAxis, p.angle);
        matrix.compose(pos, quat, scaleOne);
        cleats.setMatrixAt(i, matrix);
      }
      cleats.instanceMatrix.needsUpdate = true;
    }
  };
}

function makeMotorPto(root, side, colors) {
  const {steel, rail, brass, rubber, cleat} = colors;
  const pto = group(root);
  const hubRadius = .235, jackRadius = .435, beltZ = .37, jackX = side * 1.56, jackY = .72;
  mesh(pto, new T.CylinderGeometry(.09, .09, .24, 16), steel, 0, 2.15, .25).rotation.x = Math.PI / 2;
  const hubPulley = makePulley(pto, brass, steel, 0, 2.15, beltZ, hubRadius, .13);
  const jackPulley = makePulley(pto, brass, steel, jackX, jackY, beltZ, jackRadius, .13);
  const belt = makeVbelt(pto, {x: 0, y: 2.15}, hubRadius, {x: jackX, y: jackY}, jackRadius, beltZ, rubber, cleat, 18);

  box(pto, steel, side * 1.46, .34, -.16, .38, .22, 1.05);
  box(pto, steel, jackX, .52, -.12, .26, .44, .56);
  mesh(pto, new T.CylinderGeometry(.14, .14, .48, 16), rail, jackX, jackY, -.12).rotation.x = Math.PI / 2;

  const jackShaft = group(pto, jackX, jackY, -.08);
  mesh(jackShaft, new T.CylinderGeometry(.082, .082, 1.02, 16), steel).rotation.x = Math.PI / 2;
  for (const dx of [-.082, .082]) box(jackShaft, brass, dx, 0, -.05, .026, .026, .84);

  const anchor = new T.Object3D();
  anchor.position.set(jackX, jackY, -.59);
  pto.add(anchor);
  return {group: pto, hubPulley, jackPulley, jackShaft, belt, hubRadius, jackRadius, anchor};
}

function makeGearPto(root, colors) {
  const {steel, rail, accent, brass, rubber, cleat} = colors;
  const pto = group(root);
  const hubRadius = .35, jackRadius = .21, beltZ = .24, hubX = .35, hubY = 1.37, jackX = 1.46, jackY = 1.02;
  mesh(pto, new T.CylinderGeometry(.095, .095, .24, 16), steel, hubX, hubY, .12).rotation.x = Math.PI / 2;
  const hubPulley = makePulley(pto, brass, steel, hubX, hubY, beltZ, hubRadius, .12);
  const jackPulley = makePulley(pto, brass, steel, jackX, jackY, beltZ, jackRadius, .12);
  const belt = makeVbelt(pto, {x: hubX, y: hubY}, hubRadius, {x: jackX, y: jackY}, jackRadius, beltZ, rubber, cleat, 14);

  box(pto, steel, 1.40, .30, -1.12, .30, .22, 2.62);
  for (const bz of [-.02, -2.16]) {
    box(pto, steel, jackX, .64, bz, .22, .72, .24);
    mesh(pto, new T.CylinderGeometry(.135, .135, .26, 16), rail, jackX, jackY, bz).rotation.x = Math.PI / 2;
  }

  const jackShaft = group(pto, jackX, jackY, -1.06);
  mesh(jackShaft, new T.CylinderGeometry(.078, .078, 2.74, 16), steel).rotation.x = Math.PI / 2;
  for (const dx of [-.078, .078]) box(jackShaft, brass, dx, 0, 0, .026, .026, 2.45);
  mesh(jackShaft, new T.CylinderGeometry(.125, .125, .10, 16), accent, 0, 0, -.03).rotation.x = Math.PI / 2;

  const anchor = new T.Object3D();
  anchor.position.set(jackX, jackY, -2.43);
  pto.add(anchor);
  return {group: pto, hubPulley, jackPulley, jackShaft, belt, hubRadius, jackRadius, anchor};
}

function makeDriveShaft(root, colors) {
  const {steel, rail, accent, brass} = colors;
  const shaftGroup = group(root);
  const spinner = group(shaftGroup);
  const innerRod = mesh(spinner, new T.CylinderGeometry(.068, .068, 1, 14), rail);

  const outerSleeve = group(spinner);
  mesh(outerSleeve, new T.CylinderGeometry(.102, .102, 1, 16), steel);
  for (const [rx, rz] of [[.102, 0], [-.102, 0], [0, .102], [0, -.102]]) {
    box(outerSleeve, brass, rx, 0, rz, .032, .96, .032);
  }

  const collars = Array.from({length: 3}, () => {
    const c = group(spinner);
    mesh(c, new T.CylinderGeometry(.145, .145, .11, 18), brass);
    mesh(c, new T.CylinderGeometry(.155, .155, .045, 18), accent);
    box(c, steel, 0, 0, 0, .33, .044, .044);
    box(c, steel, 0, 0, 0, .044, .044, .33);
    return c;
  });

  const makeUJoint = () => {
    const j = group(spinner);
    mesh(j, new T.CylinderGeometry(.052, .052, .22, 12), brass).rotation.z = Math.PI / 2;
    mesh(j, new T.CylinderGeometry(.052, .052, .22, 12), brass).rotation.x = Math.PI / 2;
    for (const s of [-1, 1]) {
      box(j, steel, s * .10, 0, 0, .04, .16, .07);
      box(j, steel, 0, 0, s * .10, .07, .16, .04);
    }
    return j;
  };
  const uJointA = makeUJoint(), uJointB = makeUJoint();
  const dir = new T.Vector3();

  return {
    update(from, to, angle, visible) {
      shaftGroup.visible = visible;
      if (!visible) return;
      dir.subVectors(to, from);
      const dist = dir.length();
      if (dist < .08) { shaftGroup.visible = false; return; }
      shaftGroup.position.addVectors(from, to).multiplyScalar(.5);
      shaftGroup.quaternion.setFromUnitVectors(up, dir.divideScalar(dist));
      spinner.rotation.y = angle;
      innerRod.scale.y = Math.max(.05, dist - .20);
      outerSleeve.scale.y = Math.max(.05, dist * .54);
      collars[0].position.y = -dist * .30;
      collars[1].position.y = 0;
      collars[2].position.y = dist * .30;
      uJointA.position.y = -dist / 2 + .04;
      uJointB.position.y = dist / 2 - .04;
    }
  };
}

function machineBench(root, lesson) {
  const steel=paint('#374d55',.54), rail=paint('#b3bfbb',.68), accent=paint('#d5853e',.3), brass=paint('#dba758',.56);
  const rubber=paint('#303b3d'), cleat=paint('#677879',.25);
  const driveColors={steel,rail,accent,brass,rubber,cleat};
  // Leave the belt beside the tall flywheel so the crate is visible from the wiring position.
  const machine=group(root,-4.5,0,-5.7);
  machine.rotation.y=-.40;
  const sorting=lesson.id==='dispatch'||lesson.id==='servo-gate';
  if(sorting){
    machine.position.z=-5.25;
    machine.scale.setScalar(.90);
  }
  const loaded=lesson.id!=='belt-drive';
  const startZ=3.65, endZ=-1.55, low=.84, high=loaded?2.00:low;
  const span=Math.hypot(startZ-endZ,high-low);
  const slope=Math.atan2(high-low,startZ-endZ);
  const bed=group(machine,0,(low+high)/2,(startZ+endZ)/2);
  bed.rotation.x=slope;
  box(bed,rubber,0,0,0,1.88,.22,span);
  const treads=new T.InstancedMesh(new T.BoxGeometry(1.77,.038,.085),cleat,16);
  const matrix=new T.Matrix4();
  bed.add(treads);
  const rollers=[];
  for(const z of [-span/2,span/2]){
    const drum=mesh(bed,new T.CylinderGeometry(.23,.23,2.06,24),rubber,0,-.10,z);
    drum.rotation.z=Math.PI/2;
    for(const x of [-1.08,1.08]){
      const hub=group(bed,x,-.10,z);
      const axle=mesh(hub,new T.CylinderGeometry(.16,.16,.13,16),rail);
      axle.rotation.z=Math.PI/2;
      box(hub,steel,Math.sign(x)*.07,0,0,.02,.22,.045);
      rollers.push(hub);
    }
  }
  for(const x of [-.99,.99]) {
    box(bed,steel,x,-.10,0,.15,.43,span+.16);
    box(bed,accent,x,.113,0,.17,.065,span+.16);
    for(const t of [.09,.88]) {
      const z=T.MathUtils.lerp(startZ,endZ,t), h=T.MathUtils.lerp(low,high,t)-.24;
      box(machine,steel,x,h/2+.1,z,.15,h,.22);
      box(machine,rail,x,.21,z,.51,.15,.55);
    }
  }
  const hasDirect=lesson.id!=='servo-gate', hasGeared=lesson.id==='loaded-drive'||lesson.id==='dispatch';
  bed.updateMatrix();
  const frontRollerLocal=new T.Vector3(1.08,-.10,span/2).applyMatrix4(bed.matrix);
  const backRollerLocal=new T.Vector3(1.08,-.10,-span/2).applyMatrix4(bed.matrix);
  const frontHead=hasDirect?makeDriveHead(machine,frontRollerLocal,driveColors):null;
  const backHead=hasGeared?makeDriveHead(machine,backRollerLocal,driveColors):null;
  const motorPtoLeft=hasDirect?makeMotorPto(root,-1,driveColors):null;
  const motorPtoRight=hasDirect?makeMotorPto(root,1,driveColors):null;
  const directShaft=hasDirect?makeDriveShaft(root,driveColors):null;
  const gearPto=hasGeared?makeGearPto(root,driveColors):null;
  const gearedShaft=hasGeared?makeDriveShaft(root,driveColors):null;
  machine.updateMatrixWorld(true);
  const frontTarget=new T.Vector3(), backTarget=new T.Vector3();
  if(frontHead)frontHead.anchor.getWorldPosition(frontTarget);
  if(backHead)backHead.anchor.getWorldPosition(backTarget);
  const ptoWorld=new T.Vector3(), gearWorld=new T.Vector3();
  const paddle=sorting?sortingBins(machine,high+.13,{rail,steel,accent}):null;
  const crate=lesson.id==='servo-gate'?null:makeCrate(machine,loaded);
  // The beam sits at the arrival end of the dispatch belt.
  let beam=null;
  if(lesson.id==='dispatch'){
    const z=T.MathUtils.lerp(startZ,endZ,.88), y=T.MathUtils.lerp(low,high,.88)+.61;
    for(const x of [-1.16,1.16]){
      box(machine,steel,x,y-.35,z,.17,.74,.22);
      box(machine,accent,x,y,z,.31,.27,.35);
    }
    beam=box(machine,new T.MeshBasicMaterial({color:'#ee6757',transparent:true,opacity:.62}),0,y,z,2.15,.036,.036);
    beam.castShadow=false;
  }
  let restingBin=null, beltTravel=0, lastUpdate=performance.now();
  return (a,parts,state,on) => {
    const position=clamp(a.position,0,1);
    const beltEnd=lesson.id==='dispatch'?.84:1;
    const progress=Math.min(1,position/beltEnd);
    const now=performance.now();
    if(on)beltTravel+=(a.speed||0)*Math.min((now-lastUpdate)/1000,.2)/beltEnd;
    lastUpdate=now;
    if(position<1)restingBin=null;
    if(crate){
      crate.position.set(0,T.MathUtils.lerp(low,high,progress)+.12,T.MathUtils.lerp(startZ,endZ,progress));
      crate.rotation.x=slope;
      if(position>beltEnd){
        const t=(position-beltEnd)/(1-beltEnd);
        const side=restingBin??(Math.abs(a.gate)>=30?Math.sign(a.gate):0);
        if(position===1)restingBin=side;
        crate.position.x=side*2.61*t;
        crate.position.z=endZ-2.62*t;
        crate.position.y=T.MathUtils.lerp(high+.12,.37,t);
        crate.rotation.x=slope*(1-t);
      }
    }
    if(paddle)paddle.rotation.y=-T.MathUtils.degToRad(a.gate);
    if(beam)beam.visible=on&&!(position>=.73&&position<=.92);
    for(let i=0;i<treads.count;i++){
      const phase=(i/treads.count-beltTravel)%1;
      matrix.makeTranslation(0,.126,(((phase+1)%1)-.5)*span);
      treads.setMatrixAt(i,matrix);
    }
    treads.instanceMatrix.needsUpdate=true;
    const rollerAngle=-beltTravel*span/.23;
    for(const hub of rollers)hub.rotation.x=rollerAngle;

    if(hasDirect){
      const motor=parts?.find(p=>p.kind==='motor');
      const directVolt=on&&motor?Math.abs(((state?.voltages?.[motor.id+':0']||0)-(state?.voltages?.[motor.id+':1']||0))/6):0;
      const stalled=on&&loaded&&directVolt>.4&&!a.speed;
      const engaged=!loaded||stalled;
      frontHead.rollerBevel.rotation.x=rollerAngle;
      frontHead.clutch.position.z=engaged?frontHead.engagedZ:frontHead.disengagedZ;
      if(!motor){
        motorPtoLeft.group.visible=false;
        motorPtoRight.group.visible=false;
        directShaft.update(frontTarget,frontTarget,0,false);
      }else{
        const useRight=motor.x<frontTarget.x-1.2;
        const activePto=useRight?motorPtoRight:motorPtoLeft;
        motorPtoLeft.group.visible=!useRight;
        motorPtoRight.group.visible=useRight;
        activePto.group.position.set(motor.x,.14,motor.z);
        activePto.group.updateMatrixWorld(true);
        activePto.anchor.getWorldPosition(ptoWorld);
        let shaftAngle=0, hubAngle=motor.rotor?.rotation.z??0;
        if(!loaded){
          shaftAngle=rollerAngle;
          if(!motor.rotor)hubAngle=rollerAngle*(activePto.jackRadius/activePto.hubRadius);
        }else if(stalled){
          shaftAngle=Math.sin(now*.06)*.024;
        }
        frontHead.inputBevel.rotation.z=shaftAngle;
        activePto.hubPulley.rotation.z=hubAngle;
        activePto.jackPulley.rotation.z=shaftAngle;
        activePto.jackShaft.rotation.z=shaftAngle;
        activePto.belt.update(shaftAngle*activePto.jackRadius);
        directShaft.update(ptoWorld,frontTarget,shaftAngle,true);
      }
    }

    if(hasGeared){
      const gear=parts?.find(p=>p.kind==='gear');
      const gearedVolt=on&&gear?Math.abs(((state?.voltages?.[gear.id+':0']||0)-(state?.voltages?.[gear.id+':1']||0))/6):0;
      const gearedActive=on&&gearedVolt>.24&&Math.abs(a.speed||0)>0;
      backHead.rollerBevel.rotation.x=rollerAngle;
      backHead.clutch.position.z=gearedActive?backHead.engagedZ:backHead.disengagedZ;
      if(!gear){
        gearPto.group.visible=false;
        gearedShaft.update(backTarget,backTarget,0,false);
      }else{
        gearPto.group.visible=true;
        gearPto.group.position.set(gear.x,.14,gear.z);
        gearPto.group.updateMatrixWorld(true);
        gearPto.anchor.getWorldPosition(gearWorld);
        const hubAngle=gear.outputGear?.rotation.z??0;
        const shaftAngle=gearedActive?rollerAngle:hubAngle*(gearPto.hubRadius/gearPto.jackRadius);
        backHead.inputBevel.rotation.z=gearedActive?rollerAngle:0;
        gearPto.hubPulley.rotation.z=hubAngle;
        gearPto.jackPulley.rotation.z=shaftAngle;
        gearPto.jackShaft.rotation.z=shaftAngle;
        gearPto.belt.update(shaftAngle*gearPto.jackRadius);
        gearedShaft.update(gearWorld,backTarget,shaftAngle,true);
      }
    }
  };
}

function observatoryRack(root) {
  const frame=paint('#1d2738',.32),walnut=paint('#4e3628',.12),brass=paint('#c69a50',.62);
  const rack=group(root,0,0,-7.8);
  box(rack,walnut,0,2.2,0,9.4,4.4,1.3);
  box(rack,frame,0,2.2,.56,8.8,3.9,.32);
  for(const x of [-4.6,4.6])box(rack,brass,x,2.2,.68,.24,4.4,.28);
  box(rack,brass,0,4.45,.12,9.7,.22,1.5);
  box(rack,frame,0,4.8,.05,3.2,.5,1.0);
  const feedLamps=[0,1,2,3,4].map(i=>{
    const m=paint('#3b3228',.1);
    m.emissive.set('#f0b652');m.emissiveIntensity=.05;
    box(rack,brass,-3.0+i*1.5,1.0,.74,.92,.44,.12);
    box(rack,m,-3.0+i*1.5,1.0,.79,.74,.28,.08);
    return m;
  });
  const coreBays=[0,1,2,3,4,5].map(i=>{
    const m=paint('#243242',.15);
    m.emissive.set('#ffcb6b');m.emissiveIntensity=.08;
    const x=-3.35+i*1.34;
    box(rack,brass,x,2.9,.74,1.06,1.8,.12);
    box(rack,m,x,2.9,.79,.86,1.56,.08);
    return m;
  });
  const scope=group(rack,0,6.2,.25);
  const outer=mesh(scope,new T.TorusGeometry(1.15,.08,10,40),brass,0,0,0);
  const inner=mesh(scope,new T.TorusGeometry(.78,.055,8,32),brass,0,0,0);
  const starMat=paint('#7a623c',.2);
  starMat.emissive.set('#ffd97a');starMat.emissiveIntensity=.15;
  mesh(scope,new T.OctahedronGeometry(.28,0),starMat,0,0,0);
  let last=performance.now();
  return (a,parts,state,on,progress)=>{
    const now=performance.now(),dt=Math.min(.15,(now-last)/1000);last=now;
    const feeds=progress?.feeds||[],cores=progress?.cores||[];
    for(let i=0;i<feedLamps.length;i++)feedLamps[i].emissiveIntensity=feeds[i]?.online?1.6:.06;
    for(let i=0;i<coreBays.length;i++)coreBays[i].emissiveIntensity=cores[i]?.online?1.8:.08;
    const booted=!!progress?.coreBooted;
    const activeVal=on&&Object.values(state?.displayValues||{}).some(v=>v>0);
    starMat.emissiveIntensity=booted?2.8:activeVal?1.4:.18;
    const spin=booted?1.1:activeVal?.35:0;
    outer.rotation.z+=spin*dt;
    inner.rotation.z-=spin*1.4*dt;
  };
}

function makeBasketballMesh(orange, seamMat) {
  const g=new T.Group();
  mesh(g,new T.SphereGeometry(.26,18,14),orange,0,0,0);
  const s1=mesh(g,new T.TorusGeometry(.262,.015,6,20),seamMat,0,0,0);
  const s2=mesh(g,new T.TorusGeometry(.262,.015,6,20),seamMat,0,0,0);
  s2.rotation.y=Math.PI/2;
  return g;
}

function drawCourtScore(ctx,text,lit) {
  ctx.fillStyle='#19161a';ctx.fillRect(0,0,256,128);
  ctx.strokeStyle='#c98948';ctx.lineWidth=4;ctx.strokeRect(4,4,248,120);
  ctx.fillStyle=lit?'#8ff0a4':'#ffd57a';
  ctx.font='bold 72px monospace';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText(text,128,66);
}

function basketballCourt(root) {
  const court=group(root,0,0,-6.2);
  const slate=paint('#292428',.32),copper=paint('#c88246',.6),brass=paint('#d8af5c',.58),wood=paint('#d4aa74',.08);
  const rubber=paint('#20252a',.1),cleatMat=paint('#c78d4a',.4),orange=paint('#df6924',.12),seam=paint('#2a1d17',.1);
  const netMat=paint('#efe5d0',.05),arcMat=new T.MeshBasicMaterial({color:'#ffca6b',transparent:true,opacity:.48});

  box(court,slate,0,.22,0,14.8,.22,2.8);
  box(court,copper,0,.35,1.32,14.8,.08,.12);
  box(court,copper,0,.35,-1.32,14.8,.08,.12);

  // Return conveyor track sloping from under the hoop back to the cannon hopper
  const trackLen=10.6;
  const track=group(court,0,.58,0);
  track.rotation.z=-.022;
  box(track,rubber,0,0,0,trackLen,.14,.84);
  for(const z of [-.48,.48])box(track,copper,0,.10,z,trackLen,.14,.09);
  for(const x of [-trackLen/2,trackLen/2]){
    const rl=mesh(track,new T.CylinderGeometry(.16,.16,.92,16),brass,x,0,0);
    rl.rotation.x=Math.PI/2;
  }
  const cleatCount=20;
  const cleats=new T.InstancedMesh(new T.BoxGeometry(.09,.06,.78),cleatMat,cleatCount);
  track.add(cleats);
  const dummy=new T.Object3D();

  // Left side cannon turret + 3-ball magazine rack
  const launcher=group(court,-5.5,.34,0);
  box(launcher,slate,0,.35,0,1.6,.70,1.4);
  const barrel=mesh(launcher,new T.CylinderGeometry(.32,.38,1.55,22),brass,.36,1.02,0);
  barrel.rotation.z=-.98;
  const muzzle=mesh(launcher,new T.TorusGeometry(.33,.065,10,24),copper,.95,1.46,0);
  muzzle.rotation.z=-.98;muzzle.rotation.y=Math.PI/2;
  const rack=group(launcher,-.42,.74,0);
  for(const z of [-.34,.34])box(rack,copper,0,.52,z,.68,.95,.07);
  const ammoMeshes=[0,1,2].map(i=>{
    const b=makeBasketballMesh(orange,seam);
    b.position.set(-.42,.98+i*.46,0);
    launcher.add(b);
    return b;
  });

  // Right side fixed hoop, backboard, net, and digital scoreboard
  const hoopRig=group(court,5.5,.34,0);
  box(hoopRig,slate,.42,2.2,0,.34,4.4,.42);
  box(hoopRig,.08>0?wood:wood,.15,3.85,0,.18,1.95,2.4);
  box(hoopRig,copper,.04,3.95,0,.04,.82,1.06);
  const rim=mesh(hoopRig,new T.TorusGeometry(.46,.055,10,28),copper,-.58,3.45,0);
  rim.rotation.x=Math.PI/2;
  const net=mesh(hoopRig,new T.CylinderGeometry(.42,.24,.62,14,1,true),netMat,-.58,3.12,0);
  netMat.side=T.DoubleSide;

  let scoreCtx=null,scoreTex=null,shownScore='';
  const boardMat=new T.MeshBasicMaterial({color:'#ffd57a'});
  if(typeof document!=='undefined'){
    const canvas=document.createElement('canvas');canvas.width=256;canvas.height=128;
    scoreCtx=canvas.getContext('2d');
    drawCourtScore(scoreCtx,'0/10',false);
    scoreTex=new T.CanvasTexture(canvas);scoreTex.colorSpace=T.SRGBColorSpace;
    boardMat.map=scoreTex;boardMat.needsUpdate=true;
  }
  box(hoopRig,slate,.18,5.45,0,.22,1.15,2.2);
  const screen=mesh(hoopRig,new T.PlaneGeometry(2.0,.96),boardMat,.05,5.45,0);
  screen.rotation.y=-Math.PI/2;

  const flightBalls=[0,1,2,3].map(()=>{
    const b=makeBasketballMesh(orange,seam);
    b.visible=false;court.add(b);return b;
  });
  const arcDots=Array.from({length:14},()=>{
    const d=mesh(court,new T.SphereGeometry(.055,8,6),arcMat,0,0,0);
    d.visible=false;return d;
  });

  function flightPos(t,shotV,outcome,out){
    const sx=-4.55,sy=1.82;
    if(outcome==='swish'){
      const ex=4.92,ey=3.79;
      if(t<=.82){
        const u=t/.82;
        const x=sx+(ex-sx)*u;
        const y=sy+(ey-sy)*u+Math.sin(u*Math.PI)*3.25;
        return out.set(x,y,0);
      }
      const d=(t-.82)/.18;
      return out.set(ex,ey-(ey-.88)*d*d,0);
    }
    if(outcome==='short'){
      const reach=clamp(shotV/3.6,.22,.92)*7.4;
      const x=sx+reach*t;
      const arch=Math.sin(t*Math.PI)*(1.2+reach*.28);
      const y=sy*(1-t)+.65*t+arch;
      return out.set(x,Math.max(.55,y),0);
    }
    // brick off backboard
    if(t<=.58){
      const u=t/.58;
      const x=sx+(5.28-sx)*u;
      const y=sy+(4.9-sy)*u+Math.sin(u*Math.PI)*2.9;
      return out.set(x,y,0);
    }
    const u=(t-.58)/.42;
    return out.set(5.28-u*2.4,4.9+Math.sin(u*Math.PI)*.9-u*u*3.6,u*2.2);
  }

  return (a)=>{
    const mc=a.mc||{};
    const ammo=mc.ammo??3;
    for(let i=0;i<3;i++)ammoMeshes[i].visible=i<ammo;
    const scoreTxt=(mc.streak||0)+'/10';
    if(scoreCtx&&shownScore!==scoreTxt){
      shownScore=scoreTxt;
      drawCourtScore(scoreCtx,scoreTxt,(mc.streak||0)>=10);
      scoreTex.needsUpdate=true;
    }

    const offset=((mc.beltOffset||0)%1+1)%1;
    const half=trackLen*.47;
    for(let i=0;i<cleatCount;i++){
      const p=((i/cleatCount+offset)%1);
      dummy.position.set(half-p*half*2,.11,0);
      dummy.updateMatrix();
      cleats.setMatrixAt(i,dummy.matrix);
    }
    cleats.instanceMatrix.needsUpdate=true;

    const active=mc.balls||[];
    for(let i=0;i<flightBalls.length;i++){
      const b=flightBalls[i],info=active[i];
      if(!info){b.visible=false;continue;}
      b.visible=true;
      if(info.phase==='flight'){
        flightPos(clamp(info.t,0,1),info.shotV,info.outcome,b.position);
      }else{
        const u=clamp(info.u,0,1);
        b.position.set(4.92-u*9.5,.92-(1-u)*.08,0);
      }
      b.rotation.z-=0.12;
    }

    const arc=mc.lastArc;
    for(let i=0;i<arcDots.length;i++){
      const d=arcDots[i];
      if(!arc){d.visible=false;continue;}
      d.visible=true;
      flightPos(.06+(i/(arcDots.length-1))*.88,arc.shotV,arc.outcome,d.position);
    }
  };
}

export function createActivityScene(lesson, scene) {
  const root=new T.Group();
  let update;
  if(lesson.machine)update=machineBench(root,lesson);
  else if(lesson.id==='light-meter')update=shadeBench(root);
  else if(lesson.id==='rgb-mix'||lesson.id==='rgb-fade')update=stageCurtain(root);
  else if(lesson.id==='mc-basketball'||lesson.id==='mc-basketball-raw')update=basketballCourt(root);
  else if(lesson.unit==='Observatory')update=observatoryRack(root);
  else return null;
  scene.add(root);
  return {update,shadeHandle:root.getObjectByName('shade-handle'), dispose(){
    root.removeFromParent();
    const materials=new Set();
    root.traverse(object=>{
      object.geometry?.dispose();
      if(object.material)materials.add(object.material);
      if(object.isInstancedMesh)object.dispose();
    });
    for(const material of materials){
      material.map?.dispose();
      material.emissiveMap?.dispose();
      material.dispose();
    }
  }};
}
