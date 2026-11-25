import {test} from 'node:test';
import assert from 'node:assert/strict';
import {LEVELS,solveCircuit} from '../src/circuit.js';
import {finals,newTrial,assessFinal} from '../src/challenges.js';
import {starterBoard} from '../src/units.js';

const wire=(a,b)=>({a,b});
function bench(id,kinds,wires){
 const parts=kinds.map(([id,kind,value])=>({id,kind,resistance:value||30,closed:kind==='switch'})),trial=newTrial();
 const part=id=>parts.find(p=>p.id===id);
 function run(dt=0,event={}){
  const s=solveCircuit(parts,wires,dt);
  for(const p of parts)if(p.kind==='capacitor')p.charge=s.capacitorVoltages[p.id];
  const motor=parts.find(p=>p.kind==='motor');s.rpm=motor?Math.round(s.currents[motor.id]*900):0;
  assessFinal(id,parts,wires,s,trial,{powered:true,dt,...event});return s;
 }
 function flip(id){const before=solveCircuit(parts,wires),switched=part(id);switched.closed=!switched.closed;return run(0,{switched,before});}
 return {part,run,flip,trial,wires};
}
test('each teaching unit has one final challenge; activity finals use their fixture bench',()=>{
 for(const unit of new Set(LEVELS.filter(l=>l.id!=='sandbox'&&!l.library&&!l.master).map(l=>l.unit))){
  const levels=LEVELS.filter(l=>l.unit===unit);assert.ok(levels.at(-1).challenge);assert.equal(levels.filter(l=>l.challenge).length,1);
 }
 assert.ok(LEVELS.every(l=>typeof l.check==='function'));
 for(const l of finals){const board=starterBoard(l);if(l.activity)assert.ok(board?.parts.length);else assert.equal(board,null);}
});
test('lamp challenge needs two different switches controlling two different lamps',()=>{
 const b=bench('lamp-control-challenge',[['b','battery'],['l','lamp'],['k','lamp'],['s','switch'],['t','switch']],
 [wire('b:0','s:0'),wire('s:1','l:0'),wire('l:1','b:1'),wire('b:0','t:0'),wire('t:1','k:0'),wire('k:1','b:1')]);
 assert.equal(b.flip('s').designPassed,false);assert.equal(b.flip('s').designPassed,false);assert.equal(b.flip('t').designPassed,true);
 b.wires.pop();assert.equal(b.run().designPassed,false);
});
test('backup challenge needs a real supply switch transition and three continuous seconds of discharge',()=>{
 const b=bench('backup-challenge',[['b','battery'],['s','switch'],['c','capacitor'],['l','lamp']],
 [wire('b:0','s:0'),wire('s:1','c:0'),wire('c:1','b:1'),wire('c:0','l:0'),wire('c:1','l:1')]);
 for(let i=0;i<50;i++)b.run(.1);
 assert.ok(b.part('c').charge>4);assert.equal(b.flip('s').designPassed,false);
 for(let i=0;i<29;i++)assert.equal(b.run(.1).designPassed,false);
 assert.equal(b.run(.1).designPassed,true);
 b.flip('s');b.wires.splice(0,1);b.part('s').closed=false;
 for(let i=0;i<31;i++)assert.equal(b.run(.1).designPassed,false);
});
test('LED challenge rejects a single polarity, wrong current and changing the build between trials',()=>{
 const b=bench('signal-challenge',[['b','battery'],['r','resistor',80],['l','led'],['k','led']],
 [wire('b:0','r:0'),wire('r:1','l:0'),wire('b:1','l:1'),wire('l:0','k:1'),wire('l:1','k:0')]);
 assert.equal(b.run().designPassed,false);b.part('b').reversed=true;assert.equal(b.run().designPassed,true);
 b.part('r').resistance=30;assert.equal(b.run().designPassed,false);
 b.part('r').resistance=80;assert.equal(b.run().designPassed,false);
});
test('motor challenge accepts one switch between running speeds and rejects an ordinary stop switch',()=>{
 const b=bench('speed-challenge',[['b','battery'],['r','resistor',30],['m','motor'],['s','switch']],
 [wire('b:0','r:0'),wire('r:1','m:0'),wire('m:1','b:1'),wire('r:0','s:0'),wire('r:1','s:1')]);
 assert.equal(b.run().designPassed,false);assert.equal(b.flip('s').designPassed,true);
 const stop=bench('speed-challenge',[['b','battery'],['r','resistor',30],['m','motor'],['s','switch']],
 [wire('b:0','r:0'),wire('r:1','m:0'),wire('m:1','s:0'),wire('s:1','b:1')]);assert.equal(stop.flip('s').designPassed,false);
});
