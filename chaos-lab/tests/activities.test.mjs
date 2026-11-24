import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {activities,conditions,freshActivity,measureActivity} from '../src/activities.js';
import {solveCircuit} from '../src/circuit.js';
import {createActivityScene} from '../src/activity-scenes.js';
import {starterBoard} from '../src/units.js';

function bench(id){
 const lesson=activities.find(l=>l.id===id);
 const {parts,wires}=starterBoard(lesson),activity=freshActivity();
 function wire(from,to){wires.push({a:'p'+from,b:'p'+to});}
 function tick(dt=0,powered=true){
  const env=conditions(parts,activity,id);
  const s=solveCircuit(parts,wires,powered?dt:0,env);
  for(const p of parts)if(p.kind==='capacitor'&&powered)p.charge=s.capacitorVoltages[p.id]??0;
  measureActivity(lesson,parts,wires,s,activity,powered,dt);
  return s;
 }
 return {parts,wires,activity,wire,tick};
}

test('photoresistor standalone meter level is removed from Unit 1',()=>{
 assert.equal(activities.some(l=>l.id==='light-meter'),false);
});

test('house breaker starts overloaded and default resistance fails until stair lights are wired in series at <= 20 Ω',()=>{
 const b=bench('house-breaker');
 assert.equal(b.parts[4].resistance,60);
 assert.ok(b.tick().current>.42);
 // Rewiring Landing and Stairs in series with starter 60 Ω or default 30 Ω is still too dim (< 0.10 A).
 b.wires.length=0;
 b.wire('1:0','2:0');b.wire('2:1','1:1');
 b.wire('1:0','5:0');b.wire('5:1','3:0');b.wire('3:1','4:0');b.wire('4:1','1:1');
 assert.equal(b.tick().activityPassed,false);
 b.parts[4].resistance=30;
 assert.equal(b.tick().activityPassed,false);
 b.parts[4].resistance=20;
 const pass=b.tick();
 assert.ok(Math.abs(pass.current-.4)<.001);
 assert.equal(pass.activityPassed,true);
});

test('larger capacitor keeps its lamp lit longer and the timer measures the bell input',()=>{
 const b=bench('capacity-compare');
 for(const p of b.parts)if(p.kind==='capacitor')p.charge=6;
 b.activity.running=true;
 for(let i=0;i<220;i++)b.tick(.05);
 assert.equal(b.activity.passed,true);
 const timer=bench('timer-bell');
 timer.wire('3:0','4:0');timer.wire('3:1','4:1');
 timer.parts[1].resistance=50;timer.activity.running=true;
 timer.tick();
 for(let i=0;i<80;i++)timer.tick(.05);
 assert.ok(timer.activity.rang&&timer.activity.passed,timer.activity.seconds);
});

test('opening a lit series or parallel circuit produces different footlight results',()=>{
 for(const parallel of [false,true]){
  const b=bench(parallel?'led-parallel':'led-series');
  if(parallel){b.wire('1:0','3:0');b.wire('3:1','1:1');}
  assert.equal(b.tick().activityPassed,false);
  b.wires.pop();b.activity.cut=true;
  const after=b.tick();
  assert.equal(after.activityPassed,true);
  assert.equal(b.parts.filter(p=>after.currents[p.id]>.002).length,parallel?1:0);
 }
});

test('RGB uses three independent protected emitters and blue fades before red',()=>{
 const b=bench('rgb-mix');
 b.wire('1:0','2:0');
 assert.equal(b.tick().activityPassed,false);
 b.wire('1:0','2:2');
 const mix=b.tick();
 assert.ok(mix.activityPassed&&mix.currents['p2/0']>.003&&mix.currents['p2/2']>.003);
 assert.equal(mix.currents['p2/1'],0);
 const fade=bench('rgb-fade');
 fade.parts[0].charge=6;fade.activity.running=true;
 for(let i=0;i<150;i++)fade.tick(.05);
 assert.equal(fade.activity.passed,true);
});

test('socket drives opposite LEDs during calibration and both stay dark on a dead cable',()=>{
 const b=bench('cable-tester');
 b.wire('1:0','2:0');b.wire('2:1','1:1');
 b.wire('1:1','3:0');b.wire('3:1','1:0');
 assert.ok(b.tick().currents.p2>.1);
 b.activity.socket='Known −';assert.ok(b.tick().currents.p3>.1);
 assert.ok(b.activity.calibrated);
 b.activity.socket='Cable A';b.activity.cables[0]='Dead';
 assert.equal(b.tick().current,0);
 b.wires.pop();b.tick();assert.equal(b.activity.calibrated,false);
});

test('drive lessons require travel, a loaded stall and a powered servo',()=>{
 const belt=bench('belt-drive');
 belt.tick(.1);belt.parts[0].reversed=true;belt.tick(.1);
 assert.ok(belt.activity.passed);
 const loaded=bench('loaded-drive');
 loaded.tick(.1);assert.equal(loaded.activity.position,0);
 loaded.wires.length=0;loaded.wire('1:0','3:0');loaded.wire('3:1','1:1');
 for(let i=0;i<52;i++)loaded.tick(.1);
 assert.ok(loaded.activity.passed);
 const servo=bench('servo-gate');
 servo.activity.dial=45;servo.tick(0,false);assert.equal(servo.activity.gate,0);
 servo.tick();servo.activity.dial=-45;assert.ok(servo.tick().activityPassed);
});

test('dispatch supports the manual order and an optically switched arrival light',()=>{
 const b=bench('dispatch');b.wires.length=0;
 for(const i of [3,4]){b.wire('1:0',i+':0');b.wire(i+':1','1:1');}
 b.activity.dial=45;b.activity.running=true;
 for(let i=0;i<55;i++)b.tick(.1);
 assert.ok(b.activity.manualDelivered);
 for(const [id,kind] of [['p5','photo'],['p6','relay'],['p7','led']])b.parts.push({id,kind,x:0});
 b.wire('5:0','6:0');b.wire('5:1','6:1');b.wire('1:0','6:2');
 b.wire('6:3','7:0');b.wire('7:1','1:1');
 Object.assign(b.activity,{position:0,dial:-45,order:'left',bonus:true,running:true,delivered:false});
 assert.equal(b.tick().currents.p7,0);
 for(let i=0;i<55;i++)b.tick(.1);
 assert.ok(b.activity.sawArrival&&b.activity.delivered);
});

test('machine drivetrain connects to motors, tracks moved or removed parts, and disposes cleanly',()=>{
 for(const id of ['belt-drive','loaded-drive','dispatch','servo-gate']){
  const lesson=activities.find(l=>l.id===id);
  const {parts}=starterBoard(lesson);
  const scene=new THREE.Scene();
  const fixture=createActivityScene(lesson,scene);
  assert.ok(fixture&&scene.children.length===1);
  const activity=freshActivity();
  activity.speed=id==='servo-gate'?0:.2;
  const voltages=Object.fromEntries(parts.flatMap(p=>[[p.id+':0',6],[p.id+':1',0]]));
  fixture.update(activity,parts,{voltages,currents:{}},true);
  const motor=parts.find(p=>p.kind==='motor');
  if(motor){motor.x=-9;motor.z=4;fixture.update(activity,parts,{voltages,currents:{}},true);}
  fixture.update(activity,[],{voltages:{},currents:{}},false);
  scene.traverse(obj=>{
   for(const value of [...obj.position.toArray(),...obj.quaternion.toArray()]){
    assert.ok(Number.isFinite(value),`non-finite transform in ${id}`);
   }
  });
  fixture.dispose();
  assert.equal(scene.children.length,0);
 }
});
