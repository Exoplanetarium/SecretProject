import {existingLevels,LEVELS} from './circuit.js';
import {nets} from './activities.js';
import {newLessons} from './units.js';
import {mergeSandboxSlots,normalizeSandboxSlots} from './sandbox.js';
const levelIndexById=new Map(LEVELS.map((l,i)=>[l.id,i]));
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
const chapterGuides={
 'house-breaker':[
  step('Budget 0.42 A','The Reading lamp is already wired on its own branch drawing 0.30 A. That leaves 0.12 A for both stair lights together.','#challenge-target'),
  step('Wire stairs in series','Wire Landing, Stairs, and the resistor in one series loop across the battery so the same branch current passes through both lamps.','#viewport','hb-series'),
  step('Lower resistance and test','Select the resistor and tune it to 10 or 20 Ω so Landing and Stairs each reach 0.10 A under the 0.42 A limit.','#value-label','unit-goal')
 ],
 'capacitor-charge':[
  step('Storing energy','A capacitor acts like a fast rechargeable tank. Its voltage climbs until it matches the 6 V battery.','#goal-picture'),
  step('Close the loop and power on','Connect the free capacitor terminal to battery − and turn on power until the gauge passes 4 V.','#viewport','unit-goal')
 ],
 'rc-timing':[
  step('Resistance slows charging','Putting a resistor in series with the capacitor limits current so voltage climbs gradually.', '#goal-picture'),
  step('Build the RC loop','Wire battery, resistor, and capacitor in one loop.', '#viewport','wires-3'),
  step('Set 50 Ω and charge','Select the resistor, set it to at least 50 Ω, and power on to watch it pass 3 V slowly.', '#value-label','unit-goal')
 ],
 'capacitor-backup':[
  step('Two loops around a capacitor','The battery loop charges the capacitor through the switch. A parallel lamp loop drains it when the switch opens.','#goal-picture'),
  step('Wire lamp across capacitor','Connect both lamp terminals across the capacitor module.', '#viewport','cap-lamp-wired'),
  step('Charge then open switch','Close the switch and power on above 4 V, then open the switch and watch the capacitor keep the lamp glowing.', '#power','unit-goal')
 ],
 'capacity-compare':[
  step('Larger capacity stores more','Both circuits share identical 20 Ω lamps, but 0.22 F stores more than twice the charge of 0.10 F.', '#goal-picture'),
  step('Charge and release','Press Charge & release below to watch which lamp stays lit longer.', '#activity-controls','unit-goal')
 ],
 'timer-bell':[
  step('Voltage threshold trigger','The bell rings as soon as the capacitor across it reaches 3 V, regardless of which direction the bell is wired.', '#goal-picture'),
  step('Wire bell across capacitor','Connect both bell terminals across the capacitor module.', '#viewport','bell-across-cap'),
  step('Tune ohms to 3 seconds','Press Test to time the bell. If it rings early, raise resistor ohms; if late, lower ohms until you hit 2.7 to 3.3 s.', '#value-label','unit-goal')
 ],
 'led-forward':[
  step('One-way diode junction','An LED lights only when current enters Anode (A) and leaves Cathode (K).', '#goal-picture'),
  step('Connect Cathode to −','Wire K on the stage signal back to battery − and turn on power.', '#viewport','unit-goal')
 ],
 'led-current':[
  step('Protect with series ohms','The signal drops 2 V with 20 Ω inside. At 6 V, reaching 0.04 A needs 100 Ω total loop resistance.', '#goal-picture'),
  step('Set 80 Ω in series','Wire the resistor in series with the LED, tune it to 80 Ω, and turn on power.', '#value-label','unit-goal')
 ],
 'led-pair':[
  step('Opposite polarity pair','Wiring two LEDs in opposite directions makes current direction visible.', '#goal-picture'),
  step('Wire two opposed signals','Connect A of one LED and K of the other together across each battery terminal.', '#viewport','leds-opposite'),
  step('Flip battery polarity','Power on to light the first signal, then select the battery and click Reverse polarity.', '#reverse','unit-goal')
 ],
 'led-series':[
  step('Shared current loop','Wire both red footlights in one loop with the battery so the same current passes through both.', '#goal-picture','wires-3'),
  step('Cut one wire with pliers','Turn on power so both glow, then use the pliers tool to snip any wire.', '#pliers','unit-goal')
 ],
 'led-parallel':[
  step('Separate LED paths','Wire the second red footlight across the battery on its own parallel branch.', '#goal-picture','wires-4'),
  step('Snip one branch','Power on so both light, then snip one branch with pliers while the other stays lit.', '#pliers','unit-goal')
 ],
 'rgb-mix':[
  step('Shared − channel pin','R, G, and B share one common − pin on the stage fixture.', '#goal-picture'),
  step('Mix magenta cue','Connect R and B to battery + (with − wired to battery −) and power on.', '#viewport','unit-goal')
 ],
 'rgb-fade':[
  step('Different turn-on voltages','Blue emitters need more voltage than red, so blue drops out earlier as the capacitor drains.', '#goal-picture'),
  step('Release the charge','Press Release below and watch the color shift from magenta to red.', '#activity-controls','unit-goal')
 ],
 'cable-tester':[
  step('Opposite test pair','Wire the red and green LEDs across Test socket pins 1 and 2 in opposite directions.', '#viewport','leds-opposite'),
  step('Calibrate Known + and Known −','Turn on power and switch Socket between Known + and Known − so each LED lights once.', '#activity-controls','calibrated'),
  step('Test cables A, B, and C','Switch through Cable A, B, and C with power on and tag each as Forward, Reverse, or Dead.', '#activity-controls','unit-goal')
 ],
 'motor-run':[
  step('Spin the flywheel','Connect the free motor pin back to battery − and press power.', '#viewport','unit-goal')
 ],
 'motor-reverse':[
  step('Polarity sets direction','Wire both motor pins across the battery and power on.', '#viewport','motor-spinning'),
  step('Reverse polarity','Select the battery while running and click Reverse polarity to spin the other way.', '#reverse','unit-goal')
 ],
 'motor-speed':[
  step('Voltage controls rpm','Adding a 30 Ω resistor in series cuts motor voltage in half, slowing the flywheel from 180 rpm to 90 rpm.', '#goal-picture'),
  step('Wire 30 Ω in series','Connect the battery, 30 Ω resistor, and motor in one loop and power on.', '#viewport','unit-goal')
 ],
 'motor-control':[
  step('Speed and stop switch','Wire battery, switch, 30 Ω resistor, and motor in one loop. Close the switch at 90 rpm, then open it to stop.', '#viewport','unit-goal')
 ],
 'belt-drive':[
  step('Drive both ways','Turn on power to run the belt forward, then select the battery and click Reverse polarity.', '#reverse','unit-goal')
 ],
 'loaded-drive':[
  step('Gear torque vs direct speed','Power on with the direct drive first and notice the loaded incline stalls it.', '#power'),
  step('Move leads to Geared drive','Move the battery wires onto the Geared drive (+ and −).', '#viewport','gear-wired'),
  step('Carry the crate up','Keep power on until the crate reaches 100% at the top.', '#challenge-readings','unit-goal')
 ],
 'servo-gate':[
  step('Commanded gate position','With over 3 V on its controller pins, the servo holds whatever angle you dial.', '#goal-picture'),
  step('Test both chutes','Turn on power, select the servo, and sweep its Angle slider past +35° and −35°.', '#activity-controls','unit-goal')
 ],
 'dispatch':[
  step('Power drive and gate','You need both the Geared drive to climb the belt and the Servo controller to aim the chute gate.', '#goal-picture'),
  step('Wire Geared drive and Servo','Connect both the Geared drive and Servo controller across the battery.', '#viewport','gear-and-servo'),
  step('Aim gate and send crate','Power on, aim the servo dial to match the requested bin, and click Send crate.', '#activity-controls','unit-goal')
 ]
};
for(const [id,steps] of Object.entries({...observatoryGuides,...libraryGuides,...chapterGuides}))stepsById.set(id,steps);
export const LESSONS=LEVELS.map(l=>stepsById.get(l.id)??[step(l.title,l.goal,'#challenge-target','unit-goal')]);
function samePinPair(joined,a,b){
 if(!a||!b)return false;
 return (joined(a.id+':0',b.id+':0')&&joined(a.id+':1',b.id+':1'))||(joined(a.id+':0',b.id+':1')&&joined(a.id+':1',b.id+':0'));
}
export function stepSatisfied(when,{parts,wires,pending,powered,state,activity}){
 const has=kind=>parts.some(p=>p.kind===kind);
 const joined=nets(wires||[]);
 const amps=p=>Math.abs(state?.currents?.[p?.id]||0);
 switch(when){
 case 'unit-goal':return (powered||state.meterActive)&&state.unitGoal;
 case 'battery':return has('battery');case 'lamp':return has('lamp');case 'wire-start':return !!pending||wires.length>0;case 'wire':return wires.length>0;
 case 'wires-3':return wires.length>=3;case 'wires-4':return wires.length>=4;
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
 case 'hb-series':{
  const landing=parts.find(p=>p.role==='Landing'),stairs=parts.find(p=>p.role==='Stairs'),res=parts.find(p=>p.kind==='resistor');
  if(!landing||!stairs||!res)return false;
  return powered&&!state.short&&amps(res)>.04&&Math.abs(amps(landing)-amps(res))<.001&&Math.abs(amps(stairs)-amps(res))<.001;
 }
 case 'cap-lamp-wired':{
  const cap=parts.find(p=>p.kind==='capacitor'),lamp=parts.find(p=>p.kind==='lamp');
  return samePinPair(joined,cap,lamp);
 }
 case 'bell-across-cap':{
  const cap=parts.find(p=>p.kind==='capacitor'),bell=parts.find(p=>p.kind==='bell');
  return samePinPair(joined,cap,bell);
 }
 case 'leds-opposite':{
  const leds=parts.filter(p=>p.kind==='led'),src=parts.find(p=>p.kind==='jack')||parts.find(p=>p.kind==='battery');
  if(leds.length<2||!src)return false;
  return samePinPair(joined,src,leds[0])&&samePinPair(joined,src,leds[1])&&!joined(leds[0].id+':0',leds[1].id+':0');
 }
 case 'calibrated':return !!activity?.calibrated;
 case 'motor-spinning':return powered&&!state.short&&Math.abs(state.rpm||0)>20;
 case 'gear-wired':{
  const bat=parts.find(p=>p.kind==='battery'),gear=parts.find(p=>p.kind==='gear');
  return samePinPair(joined,bat,gear);
 }
 case 'gear-and-servo':{
  const bat=parts.find(p=>p.kind==='battery'),gear=parts.find(p=>p.kind==='gear'),servo=parts.find(p=>p.kind==='servo');
  return samePinPair(joined,bat,gear)&&samePinPair(joined,bat,servo);
 }
 default:return false;
 }
}
export function restoreProgress(raw,legacy,previous){
 let data=raw;
 if(!data&&previous){data={completed:Array.isArray(previous.completed)?previous.completed.filter(i=>Number.isInteger(i)&&i<9):[],boards:{...previous.boards}};if(data.boards[9]){data.boards[10]=data.boards[9];delete data.boards[9];}}
 if(!data&&legacy){const mapping=[0,1,5,2,3,4,10];data={completed:(legacy.completed||[]).map(i=>mapping[i]),boards:{}};for(const[k,v]of Object.entries(legacy.boards||{}))if(mapping[k]!==undefined)data.boards[mapping[k]]=v;}
 function current(key){
  if(data?.version===5)return levelIndexById.get(key);
  const i=Number(key);
  if(!Number.isInteger(i)||i<0)return;
  if(i===20)return levelIndexById.get('sandbox');
  if(i===16)return levelIndexById.get('motor-run');
  if(data?.version!==4&&i===10)return levelIndexById.get('sandbox');
  if(data?.version!==4&&i>10)return;
  return levelIndexById.get(existingLevels[i]?.id);
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
 const sandboxSlots=data?.sandboxSlots?normalizeSandboxSlots(data.sandboxSlots):null;
 const lastIdx=typeof data?.lastLevel==='string'?levelIndexById.get(data.lastLevel):undefined;
 const lastLevel=lastIdx!==undefined&&LEVELS[lastIdx]?.id!=='sandbox'?lastIdx:null;
 const unlockAll=Boolean(data?.unlockAll);
 const rawUpdatedAt=Number(data?.updatedAt);
 const updatedAt=Number.isFinite(rawUpdatedAt)&&rawUpdatedAt>0?Math.round(rawUpdatedAt):0;
 return {completed,boards,sandboxSlots,lastLevel,unlockAll,updatedAt};
}
export function encodeProgress(completed,boards,sandboxSlots=null,meta={}){
 const uniqueCompleted=[];
 for(const i of Array.isArray(completed)?completed:[]){
  if(LEVELS[i]&&LEVELS[i].id!=='sandbox'&&!uniqueCompleted.includes(i))uniqueCompleted.push(i);
 }
 const out={version:5,completed:uniqueCompleted.map(i=>LEVELS[i].id),
  boards:Object.fromEntries(Object.entries(boards||{}).filter(([i])=>LEVELS[i]).map(([i,board])=>[LEVELS[i].id,board]))};
 if(sandboxSlots)out.sandboxSlots=normalizeSandboxSlots(sandboxSlots);
 if(meta&&typeof meta==='object'){
  const resolvedLast=Number.isInteger(meta.lastLevel)&&LEVELS[meta.lastLevel]&&LEVELS[meta.lastLevel].id!=='sandbox'
   ?LEVELS[meta.lastLevel].id
   :(typeof meta.lastLevel==='string'&&levelIndexById.get(meta.lastLevel)!==undefined&&LEVELS[levelIndexById.get(meta.lastLevel)]?.id!=='sandbox'?meta.lastLevel:null);
  if(resolvedLast)out.lastLevel=resolvedLast;
  if(meta.unlockAll)out.unlockAll=true;
  const ts=Number(meta.updatedAt);
  if(Number.isFinite(ts)&&ts>0)out.updatedAt=Math.round(ts);
 }
 return out;
}
function boardScore(board){
 return (Array.isArray(board?.parts)?board.parts.length:0)+(Array.isArray(board?.wires)?board.wires.length:0);
}
export function mergeProgress(cloudRaw,localRaw){
 const c=restoreProgress(cloudRaw);
 const l=restoreProgress(localRaw);
 const completed=[...new Set([...c.completed,...l.completed])];
 const boards={};
 const allKeys=new Set([...Object.keys(c.boards),...Object.keys(l.boards)]);
 for(const k of allKeys){
  const cb=c.boards[k],lb=l.boards[k];
  if(!cb){boards[k]=lb;continue;}
  if(!lb){boards[k]=cb;continue;}
  const ca=Number(cb?.updatedAt)||0,la=Number(lb?.updatedAt)||0;
  if(la>ca)boards[k]=lb;
  else if(ca>la)boards[k]=cb;
  else boards[k]=boardScore(cb)>boardScore(lb)?cb:lb;
 }
 const sandboxSlots=c.sandboxSlots||l.sandboxSlots?mergeSandboxSlots(c.sandboxSlots,l.sandboxSlots):null;
 const lastLevel=l.updatedAt>=c.updatedAt?(l.lastLevel??c.lastLevel):(c.lastLevel??l.lastLevel);
 const unlockAll=l.updatedAt>c.updatedAt?l.unlockAll:(c.updatedAt>l.updatedAt?c.unlockAll:(c.unlockAll||l.unlockAll));
 const updatedAt=Math.max(c.updatedAt||0,l.updatedAt||0);
 return encodeProgress(completed,boards,sandboxSlots,{lastLevel,unlockAll,updatedAt});
}
function comparableProgressKey(raw){
 const r=restoreProgress(raw);
 const sortedCompleted=[...r.completed].map(i=>LEVELS[i]?.id).filter(Boolean).sort();
 const boardKeys=Object.keys(r.boards).map(i=>Number(i)).sort((a,b)=>a-b).map(i=>[LEVELS[i]?.id,r.boards[i]]);
 return JSON.stringify({
  completed:sortedCompleted,
  boards:boardKeys,
  sandboxSlots:r.sandboxSlots,
  lastLevel:r.lastLevel!==null?LEVELS[r.lastLevel]?.id??null:null,
  unlockAll:r.unlockAll
 });
}
export function needsCloudSync(mergedRaw,cloudRaw){
 if(!cloudRaw){
  const m=restoreProgress(mergedRaw);
  return m.completed.length>0||Object.keys(m.boards).length>0||m.lastLevel!==null||m.unlockAll||Boolean(m.sandboxSlots?.slots?.some(s=>s.parts?.length));
 }
 return comparableProgressKey(mergedRaw)!==comparableProgressKey(cloudRaw);
}
export const CAMPAIGN_UNITS=['Tutorial','Resistors','Capacitors','LEDs','Motors','Observatory'];
export function chapterGateLevel(unitName){
 const unitIdx=CAMPAIGN_UNITS.indexOf(unitName);
 if(unitIdx<=0)return null;
 const prevLessons=LEVELS.filter(l=>l.unit===CAMPAIGN_UNITS[unitIdx-1]);
 return prevLessons[prevLessons.length-1]||null;
}
export function levelLockReason(index,completed=[],signedIn=false,unlockAll=false){
 if(canAccessLevel(index,completed,signedIn,unlockAll))return null;
 const lesson=LEVELS[index];
 if(!lesson)return 'Locked';
 if(!signedIn)return 'Sign in to unlock';
 const gate=chapterGateLevel(lesson.unit);
 if(gate&&!completed.includes(LEVELS.indexOf(gate)))return `Complete ${gate.title} to unlock`;
 const unitLessons=LEVELS.filter(other=>other.unit===lesson.unit);
 const pos=unitLessons.indexOf(lesson);
 const prev=unitLessons.slice(0,pos).find(other=>!completed.includes(LEVELS.indexOf(other)));
 return prev?`Complete ${prev.title} to unlock`:'Locked';
}
export function canAccessLevel(index,completed,signedIn=false,unlockAll=false){
 const lesson=LEVELS[index];
 if(!lesson)return false;
 if(lesson.library||lesson.master||lesson.id==='sandbox')return true;
 if(signedIn&&unlockAll)return true;
 const unitLessons=LEVELS.filter(other=>other.unit===lesson.unit);
 const posInUnit=unitLessons.indexOf(lesson);
 if(!signedIn)return lesson.unit==='Tutorial'||posInUnit===0;
 if(completed.includes(index))return true;
 const gate=chapterGateLevel(lesson.unit);
 if(gate&&!completed.includes(LEVELS.indexOf(gate)))return false;
 const prerequisites=unitLessons.slice(0,posInUnit);
 return prerequisites.every(other=>completed.includes(LEVELS.indexOf(other)));
}
export function nextPlayLevel(completed,lastLevel=null,signedIn=false,unlockAll=false){
 if(Number.isInteger(lastLevel)&&LEVELS[lastLevel]&&LEVELS[lastLevel].id!=='sandbox'&&!completed.includes(lastLevel)&&canAccessLevel(lastLevel,completed,signedIn,unlockAll)){
  return lastLevel;
 }
 const next=LEVELS.findIndex((l,i)=>l.id!=='sandbox'&&!completed.includes(i)&&canAccessLevel(i,completed,signedIn,unlockAll));
 return next>=0?next:LEVELS.findIndex(l=>l.id==='sandbox');
}
