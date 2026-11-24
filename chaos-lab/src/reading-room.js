import * as THREE from 'three';

function material(color) {
  return new THREE.MeshStandardMaterial({color, roughness: .84});
}

function mesh(parent, geometry, surface, x, y, z) {
  const object = new THREE.Mesh(geometry, surface);
  object.position.set(x, y, z);
  parent.add(object);
  return object;
}

function block(parent, surface, x, y, z, width, height, depth) {
  return mesh(parent, new THREE.BoxGeometry(width, height, depth), surface, x, y, z);
}

function turned(parent, surface, x, y, z, profile) {
  return mesh(parent, new THREE.LatheGeometry(profile.map(([r,h]) => new THREE.Vector2(r,h)),40), surface, x,y,z);
}

export function makeReadingLamp(component, brass, walnut) {
  const parent=new THREE.Group();
  // The foot sits directly on the desk, behind the small electrical terminal strip.
  const scale=3.85;
  parent.scale.setScalar(scale);
  parent.position.set(0,-.275*scale,-1.55);
  component.add(parent);
  turned(parent, walnut, 0,.275,0, [[0,0],[.41,0],[.46,.06],[.43,.12],[.33,.16],[0,.16]]);
  turned(parent, brass, 0,.41,0, [[.32,0],[.32,.04],[.13,.09],[.065,.14],[.052,1.03],[.12,1.08],[.12,1.15]]);
  const linen = new THREE.MeshStandardMaterial({color:'#d3b890', emissive:'#ffc36c', emissiveIntensity:0, side:THREE.DoubleSide});
  const shadeGeometry = new THREE.CylinderGeometry(.33,.66,.64,80,1,true);
  const vertices = shadeGeometry.attributes.position;
  for (let i=0;i<vertices.count;i++) {
    const fold = (i % 81) % 2 ? .95 : 1;
    vertices.setXYZ(i, vertices.getX(i)*fold, vertices.getY(i), vertices.getZ(i)*fold);
  }
  shadeGeometry.computeVertexNormals();
  const shade = mesh(parent,shadeGeometry,linen,0,1.62,0);
  shade.castShadow=true;
  shade.userData.ownedMaterial=true;
  for (const [radius,height] of [[.65,1.3],[.328,1.94]]) {
    mesh(parent,new THREE.TorusGeometry(radius,.016,8,48),brass,0,height,0).rotation.x=Math.PI/2;
  }
  const bulb = mesh(parent,new THREE.SphereGeometry(.18,20,12),linen,0,1.42,0);
  bulb.scale.y=1.22;
  const light=new THREE.PointLight('#ffbd68',0,14,2);
  light.position.set(0,1.22,0);
  parent.add(light);
  return {bulb:shade,light};
}

function rail(parent, surface, from, to, radius) {
  const a=new THREE.Vector3(...from), b=new THREE.Vector3(...to);
  const direction=b.clone().sub(a);
  const shaft=mesh(parent,new THREE.CylinderGeometry(radius,radius,direction.length(),20),surface,0,0,0);
  shaft.position.addVectors(a,b).multiplyScalar(.5);
  shaft.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());
  return shaft;
}

// Each house fixture sits behind its own two binding posts. Its diffuser and
// light belong to that lamp so the three circuits can dim independently.
export function makeHouseLamp(component, role, brass, walnut) {
  const fixture=new THREE.Group();
  component.add(fixture);
  const finishes=[];
  function finish(color,options={}) {
    const m=new THREE.MeshStandardMaterial({color,roughness:.65,...options});
    finishes.push(m);
    return m;
  }
  fixture.userData.instrumentMaterials=finishes;
  const diffuser=finish('#785e45',{emissive:'#ffb653',emissiveIntensity:0});
  const light=new THREE.PointLight('#ffd098',0,7,2);
  fixture.add(light);
  let bulb,glass;

  if(role==='Reading'){
    // A green glass library lamp over an open book.
    glass=finish('#115749',{roughness:.24,metalness:.18,side:THREE.DoubleSide,emissive:'#149053',emissiveIntensity:0});
    const paper=finish('#f0dfb5'),cover=finish('#794136');
    turned(fixture,walnut,0,0,-2.65,[[0,0],[.85,0],[.88,.12],[.77,.21],[0,.21]]);
    turned(fixture,brass,0,.21,-2.65,[[.68,0],[.64,.12],[.23,.22],[.14,.4],[.12,2.55],[.23,2.64],[0,2.69]]);
    for(const side of [-1,1]){
      rail(fixture,brass,[0,2.72,-2.65],[side*1.43,2.72,-2.65],.085);
      rail(fixture,brass,[side*1.43,2.72,-2.65],[side*1.43,3.0,-1.90],.085);
    }
    const hood=mesh(fixture,new THREE.SphereGeometry(1,48,24,0,Math.PI*2,0,Math.PI*.54),glass,0,3.0,-1.90);
    hood.scale.set(1.56,.77,.87);
    hood.rotation.x=-.23;
    bulb=mesh(hood,new THREE.CircleGeometry(.986,48),diffuser,0,-.116,0);
    bulb.rotation.x=Math.PI/2;
    diffuser.side=THREE.DoubleSide;
    const lip=mesh(hood,new THREE.TorusGeometry(.993,.027,8,48),brass,0,-.12,0);
    lip.rotation.x=Math.PI/2;
    rail(fixture,brass,[1.03,2.88,-1.64],[1.03,2.12,-1.64],.024);
    mesh(fixture,new THREE.SphereGeometry(.082,12,8),brass,1.03,2.09,-1.64);
    const book=new THREE.Group();fixture.add(book);
    book.position.set(0,.21,-1.15);book.rotation.y=-.18;
    for(const side of [-1,1]){
      const page=new THREE.Group();book.add(page);page.rotation.z=side*.11;
      block(page,cover,side*.62,0,0,1.24,.065,1.19);
      block(page,paper,side*.60,.075,0,1.18,.10,1.09);
      for(let i=0;i<4;i++)block(page,walnut,side*.57,.132,-.32+i*.16,.78-(i===3?.26:0),.009,.020);
    }
    light.position.set(0,2.64,-1.58);
  }else{
    const landing=role==='Landing';
    const plaster=finish('#a5b5ab'),oak=finish('#b27e50');
    const bronze=finish('#554436',{metalness:.52}),iron=finish('#364245',{metalness:.4});
    // Tread nosings overhang the darker risers; the landing has a wall sconce,
    // while the lower flight has a recessed light shining from its middle riser.
    const heights=landing?[.38,.76,1.14]:[.46,.92,1.38,1.84];
    const depth=landing?.96:.78,front=-.47;
    for(const [i,height] of heights.entries()){
      const z=front-(i+.5)*depth;
      block(fixture,walnut,0,height/2,z,4.18,height,depth);
      block(fixture,oak,0,height,z+.045,4.28,.095,depth+.10);
    }
    if(landing){
      block(fixture,plaster,0,2.04,-3.65,4.30,4.08,.28);
      block(fixture,walnut,0,1.34,-3.45,4.30,.32,.16);
      block(fixture,oak,0,4.10,-3.65,4.40,.10,.36);
      block(fixture,bronze,0,2.74,-3.42,1.37,1.52,.19);
      bulb=block(fixture,diffuser,0,2.72,-3.22,1.12,1.20,.32);
      for(const x of [-.59,.59])block(fixture,bronze,x,2.74,-3.03,.085,1.37,.10);
      for(const y of [2.07,3.04,3.42])block(fixture,bronze,0,y,-3.04,1.25,.075,.10);
      block(fixture,bronze,0,3.48,-3.22,1.44,.14,.62);
      light.position.set(0,2.51,-2.77);
    }else{
      const face=front-2*depth;
      block(fixture,bronze,0,1.15,face+.026,2.07,.40,.08);
      bulb=block(fixture,diffuser,0,1.15,face+.080,1.79,.24,.05);
      block(fixture,bronze,0,1.33,face+.13,2.07,.07,.31);
      for(const i of [0,2,3]){
        const z=front-(i+.5)*depth;
        const y=heights[i];
        rail(fixture,iron,[-1.89,y,z],[-1.89,y+1.42,z],.057);
      }
      rail(fixture,brass,[-1.89,1.80,front-.25],[-1.89,3.40,front-2.96],.095);
      light.position.set(0,1.17,face+.25);
    }
  }
  fixture.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
  return {bulb,light,glass};
}

export function makeReadingRoom(walnut) {
  const room = new THREE.Scene();
  room.background=new THREE.Color('#cabda4');
  room.fog=new THREE.FogExp2('#e4cfaa',.008);
  room.add(new THREE.HemisphereLight('#fff4df','#bb977c',2));
  const daylight=new THREE.DirectionalLight('#fff0cd',2.1);
  daylight.position.set(-15,24,-10);
  room.add(daylight);
  const plaster=material('#96a59a'), trim=material('#ded0ab'), oak=material('#84654d');
  const panel=material('#697f72'), upholstery=material('#a15d47');
  const floor=material('#9c7959');
  block(room,floor,0,-10.6,0,180,.6,180);
  const rug=material('#657d7c'), stripe=material('#b3aba0');
  block(room,rug,-4,-10.25,-5,42,.12,34);
  for(const z of [-20.8,-20,10,10.8]) block(room,stripe,-4,-10.17,z,41.5,.035,.16);
  for (let i=0;i<4;i++) {
    const wall=new THREE.Group();
    wall.rotation.y=i*Math.PI/2;
    room.add(wall);
    block(wall,plaster,0,10,-34,69,42,1);
    block(wall,panel,0,-5.8,-33.4,68,9,.35);
    block(wall,trim,0,-1.2,-33.1,68,.38,.56);
    for(let x=-32;x<=32;x+=8) block(wall,panel,x,-5.8,-33.1,.3,9,.35);
  }
  // Tall sash window with a view of distant hills and a folded linen curtain.
  const windowGroup=new THREE.Group();
  windowGroup.position.set(-9,6,-32.6);
  room.add(windowGroup);
  const glass=new THREE.MeshBasicMaterial({color:'#bcd8d5'});
  block(windowGroup,trim,0,0,0,21,15,.45);
  block(windowGroup,glass,0,0,.26,20,14,.12);
  for(const x of [-6,-3,1,4,7]) {
    const hill=mesh(windowGroup,new THREE.SphereGeometry(1,20,12),material('#96b3a2'),x,-5.2,.38);
    hill.scale.set(2.85,1.4+.7*Math.cos(x),.18);
  }
  for(const x of [-10,-3.33,3.33,10]) block(windowGroup,trim,x,0,.64,.23,14.4,.3);
  block(windowGroup,trim,0,.4,.65,20.4,.25,.32);
  block(windowGroup,oak,0,-7.45,.65,22,.48,1.6);
  const cloth=material('#d4b895');
  for(const sign of [-1,1]) for(let i=0;i<6;i++){
    const fold=mesh(windowGroup,new THREE.CylinderGeometry(.6,.78,17,12),cloth,sign*(10+i*.64),-.45,.8);
    fold.scale.z=.55;
  }
  // Reading chair below the window, with a low bookcase beside it.
  const chair=new THREE.Group();room.add(chair);chair.position.set(-18,-10,-23);chair.rotation.y=.42;
  block(chair,oak,0,1.05,0,8,1.8,7);
  block(chair,upholstery,0,2.6,0,8,2,7);
  const back=block(chair,upholstery,0,5,-3.2,8.5,7,1.6);back.rotation.x=-.11;
  for(const x of [-4.1,4.1]) block(chair,upholstery,x,3.7,0,1.1,2.9,7.3);
  const bookColors=['#4a6666','#b58e52','#a2614d','#c5baa0','#677659'].map(material);
  for(const y of [-9.6,-5.4,-1.2,3]) block(room,walnut,13,y,-29,18,.45,4.4);
  for(const x of [4,22]) block(room,walnut,x,-3.3,-29,.45,13,4.5);
  for(let row=0;row<3;row++) for(let i=0;i<12;i++){
    const h=2.3+.95*(1+Math.sin(i*3+row))*.5;
    const book=block(room,bookColors[(i+2*row)%5],5.2+i*.93+row*.5,-9.35+4.2*row+h/2,-28.5,.68,h,2.5);
    if(i===11) book.rotation.z=-.13;
    for(const offset of [.25,h-.35]) block(book,trim,0,offset-h/2,1.26,.54,.055,.03);
  }
  // The desk apron and legs meet the underside of the playable tabletop.
  block(room,walnut,0,-1.6,0,27.6,2,21.6);
  for(const x of [-13,13]) for(const z of [-10,10]) block(room,walnut,x,-5.7,z,1,9.2,1);

  return softenRoom(room,walnut);
}

export function softenRoom(room,sharedMaterial){
  // Cache a slightly soft room view. Only the sharp workbench renders on idle frames.
  const target=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType});
  const softened=target.clone();
  const blurCamera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
  const blur=new THREE.ShaderMaterial({
    uniforms:{roomView:{value:target.texture}, pixel:{value:new THREE.Vector2()}},
    vertexShader:'varying vec2 at; void main(){at=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader:`uniform sampler2D roomView; uniform vec2 pixel; varying vec2 at;
      void main(){
        vec3 color=texture2D(roomView,at).rgb*.25;
        for(int x=-1;x<=1;x++) for(int y=-1;y<=1;y++){
          if(x!=0||y!=0) color+=texture2D(roomView,at+vec2(float(x),float(y))*pixel).rgb*(x==0||y==0?.125:.0625);
        }
        gl_FragColor=vec4(color,1.);
      }`
  });
  const blurScene=new THREE.Scene();
  const quad=mesh(blurScene,new THREE.PlaneGeometry(2,2),blur,0,0,0);
  const lastView=new THREE.Matrix4(), lastProjection=new THREE.Matrix4();
  const size=new THREE.Vector2();
  return {
    texture:softened.texture,
    draw(renderer,camera) {
      renderer.getSize(size);
      const width=Math.max(1,Math.round(size.x/2)), height=Math.max(1,Math.round(size.y/2));
      camera.updateMatrixWorld();
      if(target.width===width&&target.height===height&&lastView.equals(camera.matrixWorld)&&lastProjection.equals(camera.projectionMatrix)) return;
      target.setSize(width,height);
      softened.setSize(width,height);
      blur.uniforms.pixel.value.set(1.5/width,1.5/height);
      lastView.copy(camera.matrixWorld);
      lastProjection.copy(camera.projectionMatrix);
      renderer.setRenderTarget(target);
      renderer.render(room,camera);
      renderer.setRenderTarget(softened);
      renderer.render(blurScene,blurCamera);
      renderer.setRenderTarget(null);
    },
    dispose() {
      const materials=new Set();
      room.traverse(object=>{
        object.geometry?.dispose();
        if(object.material&&object.material!==sharedMaterial) materials.add(object.material);
      });
      materials.forEach(m=>m.dispose());
      target.dispose();
      softened.dispose();
      quad.geometry.dispose();
      blur.dispose();
    }
  };
}
