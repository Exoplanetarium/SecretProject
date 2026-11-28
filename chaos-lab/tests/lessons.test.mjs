import {test} from 'node:test';
import assert from 'node:assert/strict';
import {LEVELS,solveCircuit} from '../src/circuit.js';
import {units} from '../src/units.js';
import {LESSONS,CAMPAIGN_UNITS,chapterGateLevel,levelLockReason,canAccessLevel,nextPlayLevel,encodeProgress,mergeProgress,needsCloudSync,restoreProgress,stepSatisfied} from '../src/lessons.js';
import {WORKSHOP_TIPS} from '../src/loading-tips.js';
const b={id:'b',kind:'battery'},l={id:'l',kind:'lamp'},r={id:'r',kind:'resistor',resistance:30},t={id:'t',kind:'resistor',resistance:30};
const w=(a,b)=>({a,b});
test('Tutorial teaches five basics and ends with a challenge before Chapter 1',()=>{assert.equal(LEVELS.filter(l=>l.unit==='Tutorial').length,6);assert.ok(LEVELS.slice(0,6).every(l=>!l.parts.includes('resistor')));assert.equal(LEVELS[6].unit,'Resistors');assert.ok(LEVELS.slice(0,9).every((l,i)=>LESSONS[i].length>0));assert.equal(units[0].label,'Tutorial');assert.ok(units.slice(1,9).every((u,i)=>u.label.startsWith(`Chapter ${i+1}`)));assert.ok(units.every(u=>!u.label.startsWith('Unit ')));});
test('first resistor lesson requires increased resistance in the lamp path',()=>{const wires=[w('b:0','r:0'),w('r:1','l:0'),w('l:1','b:1')];assert.equal(LEVELS.find(l=>l.id==='resistance').check(solveCircuit([b,l,r],wires)),false);assert.ok(LEVELS.find(l=>l.id==='resistance').check(solveCircuit([b,l,{...r,resistance:50}],wires)));const bypass=solveCircuit([b,l,r],[w('b:0','l:0'),w('l:1','b:1'),w('b:0','r:0'),w('r:1','b:1')]);assert.equal(bypass.singleResistor,false);});
test('series resistor challenge rejects default 30+30 Ω and requires 0.060 A',()=>{const wires=[w('b:0','r:0'),w('r:1','t:0'),w('t:1','l:0'),w('l:1','b:1')];const def=solveCircuit([b,l,r,t],wires);assert.equal(LEVELS.find(l=>l.id==='series-resistors').check(def),false);const s40=solveCircuit([b,l,{...r,resistance:40},{...t,resistance:40}],wires);assert.ok(Math.abs(s40.current-.06)<.001);assert.ok(LEVELS.find(l=>l.id==='series-resistors').check(s40));const s3050=solveCircuit([b,l,r,{...t,resistance:50}],wires);assert.ok(LEVELS.find(l=>l.id==='series-resistors').check(s3050));assert.equal(LEVELS.find(l=>l.id==='parallel-resistors').check(s40),false);});
test('parallel resistors reject default 30||30 Ω and require 0.15 A',()=>{const wires=[w('b:0','r:0'),w('b:0','t:0'),w('r:1','l:0'),w('t:1','l:0'),w('l:1','b:1')];const def=solveCircuit([b,l,r,t],wires);assert.equal(LEVELS.find(l=>l.id==='parallel-resistors').check(def),false);const p40=solveCircuit([b,l,{...r,resistance:40},{...t,resistance:40}],wires);assert.ok(Math.abs(p40.current-.15)<.001);assert.ok(LEVELS.find(l=>l.id==='parallel-resistors').check(p40));const p3060=solveCircuit([b,l,r,{...t,resistance:60}],wires);assert.ok(LEVELS.find(l=>l.id==='parallel-resistors').check(p40));assert.equal(LEVELS.find(l=>l.id==='series-resistors').check(p40),false);});
test('old saves keep boards and completion after lesson reordering',()=>{const old={completed:[0,1,2,3,4,5],boards:{2:{parts:[r],wires:[]},6:{parts:[b],wires:[]}}};const saved=restoreProgress(null,old);assert.deepEqual(saved.completed,[0,1,6,2,3,4]);assert.equal(saved.boards[6].parts[0].id,'r');assert.equal(saved.boards[LEVELS.length-1].parts[0].id,'b');assert.deepEqual(restoreProgress({completed:[-1,99,0,0,'2']},null).completed,[0]);});
test('previous sandbox save moves past the new challenge without losing coordinates',()=>{const previous={completed:[0,1,2,3,4,5,6,7,8],boards:{9:{parts:[{...b,x:120,z:-95}],wires:[]}}};const migrated=restoreProgress(null,null,previous);assert.deepEqual(migrated.completed,[0,1,2,3,4,6,7,8,9]);assert.equal(migrated.boards[LEVELS.length-1].parts[0].x,120);assert.equal(migrated.boards[10],undefined);assert.ok(!migrated.completed.includes(10));});
test('resistor challenge needs two different branch currents at the same time',()=>{const lamp2={id:'l2',kind:'lamp'};const wires=[w('b:0','r:0'),w('r:1','l:0'),w('l:1','b:1'),w('b:0','t:0'),w('t:1','l2:0'),w('l2:1','b:1')];const correct=solveCircuit([b,l,lamp2,{...r,resistance:40},{...t,resistance:10}],wires);assert.ok(LEVELS.find(l=>l.id==='resistor-challenge').check(correct));assert.equal(LEVELS.find(l=>l.id==='resistor-challenge').check(solveCircuit([b,l,lamp2,r,t],wires)),false);assert.equal(LEVELS.find(l=>l.id==='resistor-challenge').check(solveCircuit([b,l,lamp2,{...r,resistance:40},{...t,resistance:10}],wires.slice(0,3))),false);assert.equal(LEVELS.find(l=>l.id==='resistor-challenge').check(solveCircuit([b,l,lamp2,{...r,resistance:40},{...t,resistance:10}],wires.slice(3))),false);assert.equal(LEVELS.find(l=>l.id==='resistor-challenge').check(solveCircuit([b,l,lamp2,{...r,resistance:40},{...t,resistance:10}],wires.slice(0,5))),false);});
test('nextPlayLevel respects guest caps, chapter gates, and unlock-all mode',()=>{
 const firstResistor=LEVELS.findIndex(l=>l.unit==='Resistors');
 const tutorialLast=firstResistor-1;
 assert.equal(nextPlayLevel([],null,false),0);
 assert.equal(nextPlayLevel([0,1,2],null,false),3);
 assert.equal(nextPlayLevel([0,1,2,3,4,5],null,false),firstResistor);
 assert.equal(nextPlayLevel([0,1,2,3,4,5,firstResistor],null,false),LEVELS.findIndex(l=>l.unit==='Capacitors'));
 assert.equal(nextPlayLevel([],null,true),0);
 assert.equal(nextPlayLevel([0,1,2,3,4],null,true),tutorialLast);
 assert.equal(nextPlayLevel([0,1,2,3,4,5],null,true),firstResistor);
 const capIdx=LEVELS.findIndex(l=>l.unit==='Capacitors');
 assert.equal(nextPlayLevel([],capIdx,true,false),0);
 assert.equal(nextPlayLevel([],capIdx,true,true),capIdx);
 const allDone=LEVELS.map((_,i)=>i).filter(i=>LEVELS[i].id!=='sandbox');
 assert.equal(nextPlayLevel(allDone,0,true),LEVELS.findIndex(l=>l.id==='sandbox'));
});
test('teaching waits for real actions and a powered result',()=>{const ctx={parts:[],wires:[],pending:null,powered:false,state:{lit:0}};assert.equal(stepSatisfied('battery',ctx),false);assert.ok(stepSatisfied('battery',{...ctx,parts:[b]}));assert.ok(stepSatisfied('wire-start',{...ctx,pending:'b:0'}));assert.equal(stepSatisfied('lit',{...ctx,state:{lit:1}}),false);assert.ok(stepSatisfied('lit',{...ctx,powered:true,state:{lit:1}}));assert.equal(stepSatisfied(undefined,ctx),false);});
test('guest progression unlocks Tutorial + first level of each chapter while signed-in users unlock chapters by beating the previous chapter boss (plus unlockAll)',()=>{
 // Guests: Tutorial (all) + pos 0 of each chapter unlocked; level 2+ of Chapters 1-5 locked behind sign-in
 for(const unit of CAMPAIGN_UNITS){
  const list=LEVELS.filter(l=>l.unit===unit);
  list.forEach((l,pos)=>{
   const idx=LEVELS.indexOf(l);
   const expectedGuest=unit==='Tutorial'||pos===0;
   assert.equal(canAccessLevel(idx,[],false),expectedGuest,`${l.id} guest initial`);
   assert.equal(canAccessLevel(idx,[LEVELS.indexOf(list[0])],false,true),expectedGuest,`${l.id} guest unlockAll ignored`);
   if(!expectedGuest)assert.equal(levelLockReason(idx,[],false),'Sign in to unlock');
  });
 }
 assert.equal(canAccessLevel(LEVELS.length-1,[],false),true);

 // Signed-in (unlockAll = false): Chapter 1..5 gated behind last level of previous chapter
 for(let c=1;c<CAMPAIGN_UNITS.length;c++){
  const prevUnit=CAMPAIGN_UNITS[c-1], curUnit=CAMPAIGN_UNITS[c];
  const gate=chapterGateLevel(curUnit);
  const prevLevels=LEVELS.filter(l=>l.unit===prevUnit);
  assert.equal(gate,prevLevels[prevLevels.length-1]);
  const curFirst=LEVELS.findIndex(l=>l.unit===curUnit);
  const gateIdx=LEVELS.indexOf(gate);
  assert.equal(canAccessLevel(curFirst,[],true,false),false);
  assert.equal(levelLockReason(curFirst,[],true,false),`Complete ${gate.title} to unlock`);
  assert.equal(canAccessLevel(curFirst,[gateIdx],true,false),true);
 }

 // Signed-in with unlockAll = true unlocks every level
 assert.ok(LEVELS.every((_,i)=>canAccessLevel(i,[],true,true)));
});
test('loading screen tips are non-empty and follow the writing rules',()=>{assert.ok(WORKSHOP_TIPS.length>=10);for(const tip of WORKSHOP_TIPS){assert.equal(typeof tip,'string');assert.ok(tip.trim().length>10);assert.ok(!tip.includes('—'));}});

test('Chapters 2-4 and Keep the lights on provide multi-step interactive teaching guides',()=>{
 for(const id of ['house-breaker','rc-timing','capacitor-backup','timer-bell','led-pair','cable-tester','loaded-drive','dispatch']){
  const idx=LEVELS.findIndex(l=>l.id===id);
  assert.ok(idx>=0,`missing ${id}`);
  assert.ok(LESSONS[idx].length>=2,`${id} should have multi-step guide`);
  for(const s of LESSONS[idx])assert.ok(!s.title.includes('—')&&!s.text.includes('—'),`em dash in ${id}`);
 }
});

test('encodeProgress/restoreProgress round-trip lastLevel, unlockAll, and updatedAt cleanly',()=>{
 const motorIdx=LEVELS.findIndex(l=>l.id==='motor-run');
 const resIdx=LEVELS.findIndex(l=>l.id==='resistance');
 const encoded=encodeProgress([0,resIdx],{[motorIdx]:{parts:[b],wires:[],updatedAt:2000}},null,{lastLevel:motorIdx,unlockAll:true,updatedAt:2500});
 assert.equal(encoded.lastLevel,'motor-run');
 assert.equal(encoded.unlockAll,true);
 assert.equal(encoded.updatedAt,2500);
 const restored=restoreProgress(encoded);
 assert.deepEqual(restored.completed,[0,resIdx]);
 assert.equal(restored.lastLevel,motorIdx);
 assert.equal(restored.unlockAll,true);
 assert.equal(restored.updatedAt,2500);

 // Old saves without metadata remain valid and match byte expectations
 const bare=encodeProgress([0],{0:{parts:[],wires:[]}});
 assert.equal('lastLevel' in bare,false);
 assert.equal('unlockAll' in bare,false);
 assert.equal('updatedAt' in bare,false);
});

test('mergeProgress keeps monotonic chapter progress across sign-in and stale cloud blobs',()=>{
 const resIdx=LEVELS.findIndex(l=>l.id==='resistance');
 const capIdx=LEVELS.findIndex(l=>l.id==='capacitor-charge');
 const ledIdx=LEVELS.findIndex(l=>l.id==='led-forward');
 const motorIdx=LEVELS.findIndex(l=>l.id==='motor-run');

 // Brother scenario: cloud stopped saving at Resistors, local reached Motors
 const staleCloud=encodeProgress([0,resIdx],{[resIdx]:{parts:[b,l,r],wires:[],updatedAt:1000}},null,{lastLevel:resIdx,updatedAt:1000});
 const newerLocal=encodeProgress([0,resIdx,capIdx,ledIdx,motorIdx],{[resIdx]:{parts:[b,l,r],wires:[],updatedAt:1000},[motorIdx]:{parts:[b],wires:[{a:'b:0',b:'b:1'}],updatedAt:5000}},null,{lastLevel:motorIdx,updatedAt:5000});

 const merged=mergeProgress(staleCloud,newerLocal);
 const restored=restoreProgress(merged);
 assert.deepEqual(restored.completed,[0,resIdx,capIdx,ledIdx,motorIdx]);
 assert.equal(restored.lastLevel,motorIdx);
 assert.equal(restored.boards[motorIdx].wires.length,1);
 assert.equal(needsCloudSync(merged,staleCloud),true);

 // Reverse order (cross-device union): cloud has LEDs, another tab only sends Capacitors -> neither is lost
 const deviceA=encodeProgress([0,resIdx,capIdx],{[capIdx]:{parts:[b],wires:[],updatedAt:3000}},null,{lastLevel:capIdx,updatedAt:3000});
 const deviceB=encodeProgress([0,resIdx,ledIdx],{[ledIdx]:{parts:[b,l],wires:[],updatedAt:4000}},null,{lastLevel:ledIdx,updatedAt:4000});
 const unionMerged=mergeProgress(deviceA,deviceB);
 const unionRestored=restoreProgress(unionMerged);
 assert.ok(unionRestored.completed.includes(capIdx));
 assert.ok(unionRestored.completed.includes(ledIdx));
 assert.equal(unionRestored.lastLevel,ledIdx);
});
