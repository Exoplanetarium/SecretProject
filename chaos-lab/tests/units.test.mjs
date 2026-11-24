import assert from 'node:assert/strict';
import {test} from 'node:test';
import {LEVELS,solveCircuit} from '../src/circuit.js';
import {newHistory,newLessons,observeUnit,starterBoard} from '../src/units.js';
import {encodeProgress,restoreProgress,LESSONS} from '../src/lessons.js';
const cell={id:'b',kind:'battery'};
const wire=(a,b)=>({a,b});
const loop=(...ids)=>ids.map((id,i)=>wire(id+':1',ids[(i+1)%ids.length]+':0'));
function sample(parts,wires,history=newHistory(),dt=0){
 const result=solveCircuit(parts,wires,dt);
 for(const p of parts)if(p.kind==='capacitor')p.charge=result.capacitorVoltages[p.id];
 observeUnit(parts,wires,result,history,true);return result;
}
test('capacitor charges gradually, a series resistor slows it, and stored energy lights an isolated lamp',()=>{
 const simulate=extra=>{
  const cap={id:'c',kind:'capacitor'},parts=[cell,cap];
  if(extra)parts.push({id:'r',kind:'resistor',resistance:50});
  const wires=loop(...parts.map(p=>p.id)),h=newHistory();
  let state;
  for(let i=0;i<60;i++)state=sample(parts,wires,h,.1);
  return {cap,state,h};
 };
 const fast=simulate(false),slow=simulate(true);
 assert.ok(fast.state.capVoltage>5.8);assert.ok(slow.state.capVoltage>3&&slow.state.capVoltage<4);
 assert.equal(slow.state.slowCharge,true);assert.equal(fast.state.slowCharge,false);
 const lamp={id:'l',kind:'lamp'},sw={id:'s',kind:'switch',closed:false};
 const dis=sample([cell,fast.cap,lamp,sw],[wire('c:0','l:0'),wire('c:1','l:1')],fast.h,.1);
 assert.ok(dis.backupLight&&dis.lit===1&&dis.capVoltage<fast.state.capVoltage);
});
test('opposite LED pair selects one light per polarity, the series resistor sets 40 mA',()=>{
 const a={id:'a',kind:'led'},b={id:'k',kind:'led'},h=newHistory();
 const wires=[wire('b:0','a:0'),wire('b:1','a:1'),wire('a:0','k:1'),wire('a:1','k:0')];
 const first=sample([cell,a,b],wires,h);assert.equal(first.activeLEDs[0].id,'a');assert.equal(first.bothSignals,false);
 const reverse=sample([{...cell,reversed:true},a,b],wires,h);assert.deepEqual(reverse.activeLEDs,[b]);assert.equal(reverse.bothSignals,true);
 const r={id:'r',kind:'resistor',resistance:80};
 assert.equal(sample([cell,r,a],[wire('b:0','r:0'),wire('r:1','a:0'),wire('a:1','b:1')]).limitedLED,true);
});
test('motor speed and direction follow voltage, open switch stops the motor',()=>{
 const m={id:'m',kind:'motor'},r={id:'r',kind:'resistor',resistance:30},s={id:'s',kind:'switch',closed:true},h=newHistory(),wires=loop('b','m');
 assert.equal(Math.abs(sample([cell,m],wires,h).rpm),180);
 const reversed=sample([{...cell,reversed:true},m],wires,h);assert.ok(reversed.bothDirections);
 const connected=loop('b','m','r','s');
 assert.ok(sample([cell,m,r,s],connected).halfSpeed);
 assert.equal(sample([cell,m,r,{...s,closed:false}],connected).rpm,0);
});
test('every new entry has a starter, instructions and a valid parts tray',()=>{
 for(const l of newLessons){const start=starterBoard(l);assert.ok(LESSONS[LEVELS.indexOf(l)].length);assert.ok(start.parts.every(p=>l.parts.includes(p.kind)));assert.equal(l.check({rpm:0,activeLEDs:[],capVoltage:0})||false,false);}
});
test('v3 free build survives migration and new progress survives subsequent loads',()=>{
 const free={parts:[{id:'p1',kind:'battery',x:100,z:-200}],wires:[]};
 const moved=restoreProgress({completed:[0,9],boards:{10:free}});
 assert.equal(moved.boards[10],undefined);assert.deepEqual(moved.boards[LEVELS.length-1],free);
 const next=restoreProgress({...moved,version:4,completed:[0,9,10,16],boards:{20:free,10:starterBoard(newLessons[0])}});
 assert.deepEqual(next.completed.map(i=>LEVELS[i].id),['loop','resistor-challenge','capacitor-charge','motor-run']);assert.equal(next.boards[LEVELS.findIndex(l=>l.id==='capacitor-charge')].parts[1].kind,'capacitor');assert.deepEqual(restoreProgress(encodeProgress(next.completed,next.boards)),next);assert.deepEqual(next.boards[LEVELS.length-1],free);
});
