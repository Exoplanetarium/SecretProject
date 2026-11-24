import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {solveCircuit,LEVELS} from '../src/circuit.js';
import {activities} from '../src/activities.js';
import {starterBoard} from '../src/units.js';
import {createShortEffects} from '../src/short-effects.js';
const battery={id:'b',kind:'battery'},lamp={id:'l',kind:'lamp'},lamp2={id:'k',kind:'lamp'},sw={id:'s',kind:'switch',closed:false},resistor={id:'r',kind:'resistor',resistance:40};
const w=(a,b)=>({a,b}),loop=[w('b:0','l:0'),w('l:1','b:1')];
test('open circuit stays dark; closed circuit follows Ohm’s law',()=>{assert.equal(solveCircuit([battery,lamp],loop.slice(0,1)).lit,0);const s=solveCircuit([battery,lamp],loop);assert.equal(s.lit,1);assert.ok(Math.abs(s.current-.3)<.001);assert.ok(LEVELS.find(l=>l.id==='loop').check(s));});
test('switch opens and closes a conducting path',()=>{const wires=[w('b:0','s:0'),w('s:1','l:0'),w('l:1','b:1')];assert.equal(solveCircuit([battery,lamp,sw],wires).lit,0);const s=solveCircuit([battery,lamp,{...sw,closed:true}],wires);assert.equal(s.lit,1);assert.ok(LEVELS.find(l=>l.id==='switch').check(s));});
test('series resistor reduces current and satisfies resistor lesson',()=>{const s=solveCircuit([battery,lamp,resistor],[w('b:0','r:0'),w('r:1','l:0'),w('l:1','b:1')]);assert.ok(Math.abs(s.current-.1)<.001);assert.ok(LEVELS.find(l=>l.id==='ohms-law').check(s));});
test('two lamps in series split voltage and parallel lamps draw more current',()=>{const ps=[battery,lamp,lamp2],series=solveCircuit(ps,[w('b:0','l:0'),w('l:1','k:0'),w('k:1','b:1')]),parallel=solveCircuit(ps,[...loop,w('b:0','k:0'),w('k:1','b:1')]);assert.ok(LEVELS.find(l=>l.id==='series').check(series));assert.ok(LEVELS.find(l=>l.id==='parallel').check(parallel));assert.ok(Math.abs(series.current-.15)<.001);assert.ok(Math.abs(parallel.current-.6)<.001);});
test('direct battery short trips cutoff; disconnected islands stay dark',()=>{assert.ok(solveCircuit([battery,lamp],[w('b:0','b:1')]).short);assert.equal(solveCircuit([battery,lamp,lamp2],[w('l:0','k:0'),w('l:1','k:1')]).lit,0);});
test('parallel switch controls one branch independently',()=>{const wires=[...loop,w('b:0','s:0'),w('s:1','k:0'),w('k:1','b:1')];assert.equal(solveCircuit([battery,lamp,lamp2,sw],wires).lit,1);assert.equal(solveCircuit([battery,lamp,lamp2,{...sw,closed:true}],wires).lit,2);});

test('short circuit attribution distinguishes dead shorts, switch shorts, load bypasses, and overloads',()=>{
 const direct=solveCircuit([battery,lamp],[w('b:0','b:1')]);
 assert.equal(direct.short,true);
 assert.equal(direct.shortReason,'dead-short');
 assert.deepEqual(direct.shortWires,[0]);
 assert.deepEqual(direct.shortParts,['b']);

 const swWires=[w('b:0','s:0'),w('s:1','b:1')];
 const openSw=solveCircuit([battery,sw],swWires);
 assert.equal(openSw.short,false);
 assert.equal(openSw.shortReason,null);
 assert.deepEqual(openSw.shortWires,[]);
 const closedSw=solveCircuit([battery,{...sw,closed:true}],swWires);
 assert.equal(closedSw.short,true);
 assert.equal(closedSw.shortReason,'dead-short');
 assert.deepEqual(closedSw.shortWires,[0,1]);
 assert.ok(closedSw.shortParts.includes('b'));
 assert.ok(closedSw.shortParts.includes('s'));

 const bypass=solveCircuit([battery,lamp],[...loop,w('l:0','l:1')]);
 assert.equal(bypass.short,true);
 assert.equal(bypass.shortReason,'dead-short');
 assert.ok(!bypass.shortParts.includes('l'));
 assert.deepEqual(bypass.shortWires,[0,1,2]);

 const rail={id:'bus',kind:'rail'};
 const overloadParts=[battery,rail];
 const overloadWires=[w('b:0','bus:0')];
 for(let i=0;i<11;i++){
  const id='ol'+i;
  overloadParts.push({id,kind:'lamp'});
  overloadWires.push(w('bus:1',id+':0'),w(id+':1','b:1'));
 }
 const overload=solveCircuit(overloadParts,overloadWires);
 assert.equal(overload.short,true);
 assert.equal(overload.shortReason,'overload');
 assert.ok(overload.shortParts.includes('b'));
 assert.ok(overload.shortParts.includes('bus'));
 assert.ok(overload.shortWires.includes(0));
 assert.ok(!overload.shortParts.includes('ol0'));
});

test('logic output shorts and bus contention fault cleanly without false positives on safe loads or capacitors',()=>{
 const gHigh={id:'g1',kind:'gate',gateMode:'NOT',outputHigh:true};
 const gLow={id:'g2',kind:'gate',gateMode:'NAND',outputHigh:false};
 const outShort=solveCircuit([gHigh],[w('g1:2','g1:3')]);
 assert.equal(outShort.short,true);
 assert.equal(outShort.shortReason,'output-short');
 assert.deepEqual(outShort.shortWires,[0]);
 assert.deepEqual(outShort.shortParts,['g1']);

 const contention=solveCircuit([gHigh,gLow],[w('g1:2','g2:2'),w('g1:3','g2:3')]);
 assert.equal(contention.short,true);
 assert.equal(contention.shortReason,'output-short');
 assert.ok(contention.shortParts.includes('g1'));
 assert.ok(contention.shortParts.includes('g2'));
 assert.ok(contention.shortWires.includes(0));

 const validGateLoad=solveCircuit([gHigh,lamp],[w('g1:2','l:0'),w('l:1','g1:3')]);
 assert.equal(validGateLoad.short,false);
 assert.equal(validGateLoad.shortReason,null);

 const house=starterBoard(activities.find(l=>l.id==='house-breaker'));
 const houseState=solveCircuit(house.parts,house.wires);
 assert.equal(houseState.short,false);
 assert.equal(houseState.shortReason,null);

 const capShort=solveCircuit([{id:'c',kind:'capacitor',charge:6}],[w('c:0','c:1')]);
 assert.equal(capShort.short,false);
 assert.equal(capShort.shortReason,null);
});

test('short-effects handles smoke charing/recovery and explosive cleanup headlessly in Node',()=>{
 const scene=new THREE.Scene();
 const disposed=[];
 const disposeObj=o=>{disposed.push(o);o.removeFromParent();};
 const fx=createShortEffects(scene,disposeObj);

 const wireMat=new THREE.MeshStandardMaterial({color:0xa95e45});
 const wireMesh=new THREE.Mesh(new THREE.BoxGeometry(.1,.1,.1),wireMat);
 wireMesh.userData.baseColor=undefined;
 scene.add(wireMesh);

 fx.triggerSmoke({
  center:new THREE.Vector3(0,.5,0),
  points:[new THREE.Vector3(0,.5,0)],
  wireMeshes:[wireMesh],
  reason:'dead-short'
 });
 assert.equal(wireMat.color.getHex(),0x2c241e);
 assert.equal(wireMat.emissive.getHex(),0xff4f1a);
 fx.update(0.1);
 fx.stopSmoke([wireMesh]);
 assert.equal(wireMat.color.getHex(),0xa95e45);
 assert.equal(wireMat.emissive.getHex(),0);

 const blown=new THREE.Group();
 const neighbor=new THREE.Group();
 neighbor.position.set(2,.14,0);
 neighbor.rotation.y=Math.PI/2;
 scene.add(neighbor);

 fx.triggerExplosion({
  center:new THREE.Vector3(0,.5,0),
  points:[new THREE.Vector3(0,.5,0)],
  blownMeshes:[{mesh:blown,origin:new THREE.Vector3(0,.14,0)}],
  shockParts:[{mesh:neighbor,distance:2}],
  reason:'dead-short'
 });
 fx.update(0.1);
 assert.ok(blown.position.y>0.14);
 assert.ok(neighbor.position.y>0.14);
 const shake=new THREE.Vector3();
 assert.equal(fx.getCameraOffset(shake),true);

 for(let i=0;i<25;i++)fx.update(0.1);
 assert.ok(disposed.includes(blown));
 assert.equal(blown.parent,null);
 assert.equal(neighbor.position.y,0.14);
 assert.equal(neighbor.rotation.x,0);
 assert.equal(neighbor.rotation.z,0);
 assert.equal(neighbor.rotation.y,Math.PI/2);

 const extraBlown=new THREE.Group();
 fx.triggerExplosion({
  center:new THREE.Vector3(0,.5,0),
  points:[new THREE.Vector3(0,.5,0)],
  blownMeshes:[{mesh:extraBlown,origin:new THREE.Vector3(0,.14,0)}],
  shockParts:[{mesh:neighbor,distance:1}]
 });
 fx.update(0.05);
 fx.clear();
 assert.ok(disposed.includes(extraBlown));
 assert.equal(neighbor.position.y,0.14);

 fx.dispose();
 wireMesh.geometry.dispose();
 wireMat.dispose();
});
