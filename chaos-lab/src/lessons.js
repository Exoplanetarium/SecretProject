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
const observatoryGuides={
 'relay-inverter':[
  step('Electromagnetic switch','A coil relay is two circuits in one box. Current through A and B pulls C away from NC and onto NO. Click ? on any part card to inspect its terminals.','[data-kind="coil"]'),
  step('Wire the inverter','Connect the battery and switch to coil A and B, then route the lamp through C and NC. Power on and flip the switch to invert the light.','#viewport')
 ],
 'relay-nand':[
  step('Series coil control','If two switches sit in series feeding coil A and B, the coil only pulls when both switches are closed. Use ? on Coil relay if you want a refresher.','[data-kind="coil"]'),
  step('Test all 4 input states','Route the lamp through C and NC so it stays lit until both A and B are closed. Flip A and B through all four pairs.','#viewport')
 ],
 'relay-clock':[
  step('Self-interrupting relay','Feeding coil A through its own NC contact turns power off as soon as the coil pulls in, then back on when it drops.','#goal-picture'),
  step('Wire the buzzer loop','Connect battery + to C, NC to coil A, and coil B to battery −. Put the lamp across A and B, and optionally wire the capacitor in parallel for a slower beat.','#viewport')
 ],
 'relay-latch':[
  step('Self-holding loop','A momentary push button opens when released. Connecting C and NO in parallel with the Set button keeps coil A energized after release.','[data-kind="button"]'),
  step('Latch and clear','Close Reset, press Set so NO holds the coil, then open Reset to clear the stored bit.','#viewport')
 ],
 'half-adder':[
  step('Multi-pin logic gates','Every logic gate needs its − pin joined to battery − via the bus bar. Select a placed gate to pick XOR, AND, OR, NOR, NAND, or NOT.','[data-kind="gate"]'),
  step('Wire Sum and Carry','Send switches A and B into both gates: XOR drives Sum and AND drives Carry. Test all four combinations.','#viewport')
 ],
 'mainframe-boot':[
  step('Two-bit ripple counter','Each memory cell copies D to Q when CK rises from 0 V to 6 V. Feeding Q back through a NOT gate makes a cell toggle on every pulse.','[data-kind="latch"]'),
  step('Chain two bits to readout','Clock Bit 1 from the pulse clock and clock Bit 2 from Bit 1 NOT output. Connect Q1 and Q2 to readout pins 1 and 2 to count 0, 1, 2, 3.','#viewport')
 ]
};
const libraryGuides={
 'lib-button':[step('Momentary contact','A push button conducts only while held down. Click ? on the Push button card to see its diagram and terminals.','[data-kind="button"]'),step('Wire and press','Wire battery, push button, and lamp in one loop, power on, then click the button and release it.','#viewport')],
 'lib-spdt':[step('Two-way path','A 2-way switch connects common C to either A or B. Click ? on its card to check the terminal order.','[data-kind="spdt"]'),step('Switch between lamps','Feed battery + into C, wire A and B to two lamps, then click the lever to toggle between them.','#viewport')],
 'lib-rail':[step('Shared bus bar','All four terminals on a bus bar connect internally. Use it when many branches share + or −.','[data-kind="rail"]'),step('Power three lamps','Feed battery + into the bus bar and wire all three lamps from it back to −.','#viewport')],
 'lib-fuse':[step('Overload protection','A glass fuse breaks the loop if current stays above its 0.35 A rating.','[data-kind="fuse"]'),step('Test safe then overload','Power Lamp 1 safely through the fuse, then add Lamp 2 in parallel and close the switch to blow the fuse.','#viewport')],
 'lib-diode':[step('One-way valve','Current flows through a diode only from Anode (A) to Cathode (K).','[data-kind="diode"]'),step('Check both polarities','Wire battery + to A and lamp to K, power on, then select the battery and click Reverse polarity.','#viewport')],
 'lib-pot':[step('Adjustable track','A potentiometer is a 100 Ω track between 1 and 2 with a movable wiper W.','[data-kind="pot"]'),step('Sweep brightness','Wire 1 and W in series with the lamp, power on, select the potentiometer, and turn its Dial slider from dim to bright.','#viewport')],
 'lib-meter':[step('Parallel probe','A voltmeter measures voltage across its + and − leads without drawing current.','[data-kind="meter"]'),step('Measure 6 V and 3 V','Power on, touch + and − across the battery for 6.0 V, then move both wires across one series lamp for 3.0 V.','#viewport')],
 'lib-rgb':[step('Three color channels','Each color pin (R, G, B) drives an LED sharing the common − return.','[data-kind="rgb"]'),step('Mix yellow','Wire both R and G to battery + (with − wired to battery −) to light yellow.','#viewport')],
 'lib-bell':[step('Voltage threshold','The threshold bell rings when at least 3 V appears across + and −.','[data-kind="bell"]'),step('Ring the gong','Wire battery, switch, and bell in one loop, power on, and close the switch.','#viewport')],
 'lib-gear':[step('High-torque drive','The geared drive reduces speed for higher turning force.','[data-kind="gear"]'),step('Drive both ways','Wire + and − to the battery, run forward, then reverse battery polarity.','#viewport')],
 'lib-servo':[step('Powered angle hold','The servo holds its horn at the dialed angle whenever its terminals receive over 3 V.','[data-kind="servo"]'),step('Sweep the horn','Wire + and − to the battery, select the servo, and move Angle past +30° and −30°.','#viewport')],
 'lib-photo':[step('Light-sensitive resistor','Resistance falls to 600 Ω in bright light and climbs to 10,000 Ω in the dark.','[data-kind="photo"]'),step('Fade the LED','Wire the photoresistor in series with the LED, then select the photoresistor and lower Light.','#viewport')],
 'lib-relay':[step('Darkness trigger','The sensor switch monitors a photoresistor on L1 and L2 and closes C to NO when resistance passes 5,000 Ω.','[data-kind="relay"]'),step('Trigger the lamp','Connect the photoresistor to L1 and L2, wire the lamp through C and NO, then dim Light on the photoresistor.','#viewport')],
 'lib-transistor':[step('Electronic switch','Small current into Base (B) toward Emitter (E) switches larger current from Collector (C) to Emitter (E).','[data-kind="transistor"]'),step('Switch the load','Wire E to −, the lamp between + and C, and the switch + 100 Ω resistor to B, then flip the switch.','#viewport')],
 'lib-coil':[step('Double-throw relay','Energizing coil A and B moves common C from NC to NO.','[data-kind="coil"]'),step('Swap NC and NO lamps','Power A and B through the switch, feed C from battery +, and wire one lamp to NC and one to NO.','#viewport')],
 'lib-gate':[step('Logic output stage','Connect − to battery − so the gate can read inputs A and B and drive output Q.','[data-kind="gate"]'),step('Test the AND gate','Wire switches A and B into A and B and Q into the lamp, then toggle both switches closed.','#viewport')],
 'lib-clock':[step('Built-in pulse source','The pulse clock alternates between 6 V and 0 V across + and − on its own.','[data-kind="clock"]'),step('Blink the lamp','Wire clock + and − to the lamp and turn on power for three pulses.','#viewport')],
 'lib-latch':[step('Store one bit','The memory cell copies D to Q when CK rises from low to high.','[data-kind="latch"]'),step('Capture and hold','Wire Data to D, Clock to CK, Q to the lamp, and − to ground. Close Data, press Clock, then open Data.','#viewport')],
 'lib-display':[step('Binary readout','Inputs 1, 2, 4, and 8 add together when wired high (≥ 3 V).','[data-kind="display"]'),step('Show 5 and 10','Wire the four switches to 1, 2, 4, and 8, then close 1 + 4 for 5 and 2 + 8 for 10.','#viewport')]
};
for(const [id,steps] of Object.entries({...observatoryGuides,...libraryGuides}))stepsById.set(id,steps);
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
 if(signedIn||lesson.library||lesson.master||completed.includes(index)||lesson.id==='sandbox')return true;
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
