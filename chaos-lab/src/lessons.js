import {existingLevels,LEVELS} from './circuit.js';
import {newLessons} from './units.js';
const step=(title,text,target,when)=>({title,text,target,when});
const guidedSteps=[
 [step('Place a battery','Drag the battery from the parts tray onto the board. You can also click to place it.','[data-kind="battery"]','battery'),step('Add a lamp','Drag a lamp onto the board. Leave a little room between the parts.','[data-kind="lamp"]','lamp'),step('Circuit diagram','The long and short lines represent the battery. The circle with a cross represents the lamp. Lines show wires. You can place the parts anywhere on the board.','#goal-picture'),step('Start a wire','Click a gold terminal on either part. The loose wire will follow your pointer.','#viewport','wire-start'),step('Connect the other end','Click a terminal on the other part to attach the wire.','#viewport','wire'),step('Close the loop','Connect the two unused terminals. Current needs a complete path from the battery, through the lamp, and back.','#goal-picture','loop'),step('Turn on power','Press power. A complete loop lights the lamp. The moving dots show conventional current flow.','#power','lit')],
 [step('Open switch','The tilted line in the sketch is an open switch. It breaks the loop, so current cannot flow.','#goal-picture'),step('Build with a switch','Place a battery, lamp, and switch. Wire them in one loop, as the sketch shows.','[data-kind="switch"]','switch-loop'),step('Close the switch','Click the switch lever, or select the switch and use its switch button. This joins the path.','#viewport','closed'),step('Turn it on','Press power to test the closed loop.','#power','lit'),step('Open the switch','Click the switch to open it. The lamp goes dark because its path is broken.','#viewport','switch-open'),step('Close the switch again','Close the switch once more. This is how a switch controls a light.','#viewport','lit')],
 [step('Series lamps','Series means everything sits along one path. In the sketch, trace the line through both lamp symbols before returning to the battery.','#goal-picture'),step('Connect two lamps','Place a battery and two lamps. Connect battery → lamp → lamp → battery.','[data-kind="lamp"]','series-loop'),step('Turn on power','Power on. Both lamps carry the same current and share the battery voltage. Each is dimmer than a single lamp.','#power','lit')],
 [step('Parallel branches','Parallel means separate paths. The sketch splits at the top and joins again at the bottom. Each lamp has a path across the battery.','#goal-picture'),step('Build two branches','Connect each lamp to both battery terminals. A terminal can hold more than one wire.','#viewport','parallel-loop'),step('Turn on power','Power on. Each lamp gets the full battery voltage, so both shine brighter than the series pair.','#power','lit')],
 [step('Switch just one branch','Put a switch in only one of the parallel paths. The other path should stay complete. Follow the sketch to find which branch contains the switch.','#goal-picture'),step('Build and test','Wire a battery, two lamps, and a switch. Close the switch and power on so both lamps light.','[data-kind="switch"]','two-lit'),step('Open one branch','Open the switch. One lamp should go dark while the other stays on. The battery still has a complete path through that lamp.','#viewport','branch-control')],
 [step('Resistor symbol','A resistor limits current. Its zigzag symbol goes in the same path as the lamp. Resistance is measured in ohms (Ω).','#goal-picture'),step('Connect a resistor','Wire a battery, a table lamp, and a resistor in a single loop. Turn on power.','[data-kind="resistor"]','resistor-lit'),step('Increase resistance','Select the resistor and raise it to at least 50 Ω. Watch the current reading fall and the lamp dim.','#value-label','higher-resistance')],
 [step('Choose the current','For this model, I = V ÷ R. The battery is 6 V and the lamp already adds 20 Ω. To get 0.10 A, the whole loop needs 60 Ω.','#goal-picture'),step('Set the current','Connect a battery, lamp, and resistor in one loop. Select the resistor and find the value that makes the current 0.10 A.','#current','target-current')],
 [step('Resistors in series add','Resistors along one path add together: R_total = R1 + R2 + R_lamp. Use V = 6 V and the 20 Ω lamp to find what the two resistors must total.','#goal-picture'),step('Combine two resistors','Build one path through two resistors and one lamp. Adjust the resistors to reach 0.060 A.','#viewport','series-resistors')],
 [step('Parallel resistance','Two resistors in parallel lower combined resistance: 1/R_pair = 1/R1 + 1/R2 (two equal resistors act like R ÷ 2).','#goal-picture'),step('Connect parallel resistors','Build two resistor branches that join in series with the 20 Ω lamp. Choose resistor values to reach 0.15 A.','#viewport','parallel-resistors')],
 [step('Resistor challenge','Use one 6 V battery, two lamps, and two resistors. Build separate branches so one lamp carries 0.10 A and the other carries 0.20 A. Check the branch readings below.','#challenge-target')],
 ...newLessons.map(l=>[step(l.title,l.goal,'#viewport','unit-goal')]),
 []
];
const stepsById=new Map(existingLevels.map((l,i)=>[l.id,guidedSteps[i]]));
export const LESSONS=LEVELS.map(l=>stepsById.get(l.id)??[step(l.title,l.goal,'#challenge-target','unit-goal')]);
export function stepSatisfied(when,{parts,wires,pending,powered,state}){
 const has=kind=>parts.some(p=>p.kind===kind);
 switch(when){
 case 'unit-goal':return (powered||state.meterActive)&&state.unitGoal;
 case 'battery':return has('battery');case 'lamp':return has('lamp');case 'wire-start':return !!pending||wires.length>0;case 'wire':return wires.length>0;
 case 'loop':return state.lit>0&&!state.short;case 'lit':return powered&&state.lit>0;
 case 'switch-loop':return has('switch')&&has('lamp')&&has('battery')&&wires.length>=3;
 case 'closed':return parts.some(p=>p.kind==='switch'&&p.closed);
 case 'switch-open':return powered&&parts.some(p=>p.kind==='switch'&&!p.closed)&&state.lit===0;
 case 'series-loop':return state.series;case 'parallel-loop':return state.parallel;case 'two-lit':return powered&&state.lit===2;
 case 'branch-control':return powered&&state.branchControl&&state.lit===1;
 case 'resistor-lit':return powered&&state.singleResistor;case 'higher-resistance':return powered&&state.singleResistor&&parts.some(p=>p.kind==='resistor'&&p.resistance>=50);
 case 'target-current':return powered&&state.singleResistor&&Math.abs(state.current-.1)<.002;
 case 'series-resistors':return powered&&state.seriesResistors&&Math.abs(state.current-.06)<.002;
 case 'parallel-resistors':return powered&&state.parallelResistors&&Math.abs(state.current-.15)<.002;
 default:return false;
 }
}
export function restoreProgress(raw,legacy,previous){
 let data=raw;
 if(!data&&previous){data={completed:Array.isArray(previous.completed)?previous.completed.filter(i=>Number.isInteger(i)&&i<9):[],boards:{...previous.boards}};if(data.boards[9]){data.boards[10]=data.boards[9];delete data.boards[9];}}
 if(!data&&legacy){const mapping=[0,1,5,2,3,4,10];data={completed:(legacy.completed||[]).map(i=>mapping[i]),boards:{}};for(const[k,v]of Object.entries(legacy.boards||{}))if(mapping[k]!==undefined)data.boards[mapping[k]]=v;}
 const indices=new Map(LEVELS.map((l,i)=>[l.id,i]));
 function current(key){
  if(data?.version===5)return indices.get(key);
  const i=Number(key);
  if(!Number.isInteger(i)||i<0)return;
  if(i===20)return indices.get('sandbox');
  if(i===16)return indices.get('motor-run');
  if(data?.version!==4&&i===10)return indices.get('sandbox');
  if(data?.version!==4&&i>10)return;
  return indices.get(existingLevels[i]?.id);
 }
 const boards={};
 for(const [key,board] of Object.entries(data?.boards||{})){
  const i=current(key);
  if(i!==undefined)boards[i]=board;
 }
 const completed=[];
 for(const key of Array.isArray(data?.completed)?data.completed:[]){
  if(data.version!==5&&!Number.isInteger(key))continue;
  const i=current(key);
  if(i!==undefined&&LEVELS[i].id!=='sandbox'&&!completed.includes(i))completed.push(i);
 }
 return {completed,boards};
}
export function encodeProgress(completed,boards){
 return {version:5,completed:completed.map(i=>LEVELS[i].id),
  boards:Object.fromEntries(Object.entries(boards).map(([i,board])=>[LEVELS[i].id,board]))};
}
export function canAccessLevel(index,completed,signedIn=false){
 const lesson=LEVELS[index];
 if(!lesson)return false;
 if(signedIn||completed.includes(index)||lesson.id==='sandbox')return true;
 const unitLessons=LEVELS.filter(other=>other.unit===lesson.unit);
 const prerequisites=unitLessons.slice(0,unitLessons.indexOf(lesson));
 if(lesson.unit==='Resistors')prerequisites.push(...LEVELS.filter(other=>other.unit==='Unit 0'&&!other.challenge));
 return prerequisites.every(other=>completed.includes(LEVELS.indexOf(other)));
}
export function nextPlayLevel(completed,lastLevel=null,signedIn=false){
 if(Number.isInteger(lastLevel)&&LEVELS[lastLevel]&&LEVELS[lastLevel].id!=='sandbox'&&!completed.includes(lastLevel)&&canAccessLevel(lastLevel,completed,signedIn)){
  return lastLevel;
 }
 const next=LEVELS.findIndex((l,i)=>l.id!=='sandbox'&&!completed.includes(i)&&canAccessLevel(i,completed,signedIn));
 return next>=0?next:LEVELS.findIndex(l=>l.id==='sandbox');
}
