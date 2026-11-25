import {activities} from './activities.js';

export const units=[
 {name:'Tutorial',label:'Tutorial'}, {name:'Resistors',label:'Chapter 1 · Resistors'},
 {name:'Capacitors',label:'Chapter 2 · Capacitors',theme:'radio'},
 {name:'LEDs',label:'Chapter 3 · LEDs',theme:'theater'},
 {name:'Motors',label:'Chapter 4 · Motors',theme:'factory'},
 {name:'Observatory',label:'Chapter 5 · Observatory',theme:'observatory'},
 {name:'Library',label:'The Library'},
 {name:'Master',label:'Master Challenges',theme:'proving'},
 {name:'Workshop',label:'Workshop',theme:'greenhouse'}
];

const legacyLessons=[
 {id:'capacitor-charge',unit:'Capacitors',title:'Capacitor charging',parts:['battery','capacitor','resistor','switch','lamp'],diagram:'charge',target:'4 V',goal:'Connect the second lead and charge the capacitor to 4 V.',hint:'Join the two free terminals, then turn on power. Watch the voltage rise as the charging current falls.',ending:'A charged capacitor stores energy even after the charging current falls.',check:s=>s.capVoltage>=4},
 {id:'rc-timing',unit:'Capacitors',title:'RC charging time',parts:['battery','capacitor','resistor','switch','lamp'],diagram:'rc',target:'50 Ω or more · 3 V',goal:'Charge through at least 50 Ω until the capacitor passes 3 V.',hint:'Put the resistor in the charging path. Set it to 50 Ω before you turn on power.',ending:'More series resistance slows the charging current and stretches the charging time.',check:s=>s.slowCharge},
 {id:'capacitor-backup',unit:'Capacitors',title:'Backup light',parts:['battery','capacitor','resistor','switch','lamp'],diagram:'backup',target:'Lamp on with switch open',goal:'Charge the capacitor, then open the battery switch and keep the lamp glowing.',hint:'Wire the lamp across the capacitor. Close the switch, charge above 4 V, then open the switch.',ending:'The capacitor supplied the lamp while the battery branch was open.',check:s=>s.backupLight},
 {id:'led-forward',unit:'LEDs',title:'LED polarity',parts:['battery','led','resistor'],diagram:'led',target:'Light the signal',goal:'Light the stage signal with the anode facing battery +.',hint:'A is the anode. K is the cathode. Connect K to the battery’s negative terminal.',ending:'An LED conducts and emits light when it is forward biased.',check:s=>s.activeLEDs.length===1},
 {id:'led-current',unit:'LEDs',title:'LED current',parts:['battery','led','resistor'],diagram:'led-r',target:'0.04 A',goal:'Use a series resistor to set the signal current to 0.04 A.',hint:'The signal module has a 2 V LED and a built-in 20 Ω resistor. Add 80 Ω in series.',ending:'The series resistor limited the current through the LED and reduced its brightness.',check:s=>s.limitedLED},
 {id:'led-pair',unit:'LEDs',title:'Polarity indicator',parts:['battery','led','resistor'],diagram:'led-pair',target:'Light each signal in turn',goal:'Wire two opposite-facing signals across the supply. Reverse the battery to light each one.',hint:'Join A on one signal to K on the other at each end. Select the battery and press Reverse polarity.',ending:'Reversing the supply selected the other LED in the pair.',check:s=>s.bothSignals},
 {id:'motor-run',unit:'Motors',title:'DC motor',parts:['battery','motor','switch','resistor'],diagram:'motor',target:'Spin the flywheel',goal:'Connect the motor return lead and start the flywheel.',hint:'Connect the free motor terminal to battery −, then press power.',ending:'Current through the motor drives the flywheel.',check:s=>Math.abs(s.rpm)>150},
 {id:'motor-reverse',unit:'Motors',title:'Motor direction',parts:['battery','motor','switch','resistor'],diagram:'motor',target:'Run in both directions',goal:'Run the flywheel, then reverse the battery and watch it turn the other way.',hint:'Wire both motor terminals across the battery. While it runs, select the battery and press Reverse polarity.',ending:'Reversing the voltage across the motor reversed its direction.',check:s=>s.bothDirections},
 {id:'motor-speed',unit:'Motors',title:'Motor speed',parts:['battery','motor','switch','resistor'],diagram:'motor-r',target:'90 rpm',goal:'Use a series resistor to run the flywheel at 90 rpm.',hint:'The motor model reaches 180 rpm at 6 V. A 30 Ω series resistor leaves about 3 V across it.',ending:'The resistor reduced the motor voltage and slowed the flywheel.',check:s=>s.halfSpeed},
 {id:'motor-control',unit:'Motors',title:'Motor control panel',parts:['battery','motor','switch','resistor'],diagram:'motor-control',target:'90 rpm · switch stop',goal:'Run at 90 rpm with the switch closed. Then stop the motor with the switch.',hint:'Wire battery, switch, resistor, and motor in one loop. Set 30 Ω, close the switch, power on, then open it.',ending:'The resistor set the running speed. The switch opened the motor circuit.',check:s=>s.controlledStop}
];
export const newLessons=[...legacyLessons,...activities.filter(l=>!l.challenge)];

const layouts={
 charge:[['battery',-4,1],['capacitor',3,0]],
 rc:[['battery',-5,0],['resistor',0,3],['capacitor',4,-1]],
 backup:[['battery',-6,0],['switch',-2,3],['capacitor',2,0],['lamp',6,2]],
 led:[['battery',-4,0],['led',3,0]],
 'led-r':[['battery',-5,0],['resistor',0,3],['led',4,-1]],
 'led-pair':[['battery',-5,0],['led',2,-2],['led',3,3]],
 motor:[['battery',-4,2],['motor',3,0]],
 'motor-r':[['battery',-5,1],['resistor',0,3],['motor',4,-1]],
 'motor-control':[['battery',-6,-1],['switch',-3,3],['resistor',1,3],['motor',5,-1]]
};
export function starterBoard(level){
 if(level.layout){
  return {parts:level.layout.parts.map(p=>({...p})),wires:level.layout.wires.map(w=>({...w}))};
 }
 const layout=layouts[level.diagram];
 if(!layout)return null;
 const parts=layout.map(([kind,x,z],i)=>({id:'p'+(i+1),kind,x,z,closed:false,resistance:30}));
 let wires=[];
 if(['capacitor-charge','motor-run','led-forward'].includes(level.id))wires=[{a:'p1:0',b:'p2:0'}];
 if(level.id==='capacitor-backup')wires=[{a:'p1:0',b:'p2:0'},{a:'p2:1',b:'p3:0'},{a:'p3:1',b:'p1:1'}];
 return {parts,wires};
}

export function observeUnit(parts,wires,state,history,powered){
 const motors=parts.filter(p=>p.kind==='motor'), leds=parts.filter(p=>p.kind==='led');
 const amps=p=>state.currents[p.id]||0;
 const samePath=(a,b)=>Math.abs(amps(a))>.001&&Math.abs(Math.abs(amps(a))-Math.abs(amps(b)))<.0001;
 const resistors=parts.filter(p=>p.kind==='resistor');
 const caps=parts.filter(p=>p.kind==='capacitor');
 state.capVoltage=Math.max(0,...caps.map(p=>Math.abs(p.charge||0)));
 state.slowCharge=caps.some(c=>Math.abs(c.charge||0)>=3&&amps(c)*(c.charge||0)>0&&resistors.some(r=>r.resistance>=50&&samePath(r,c)));
 state.backupLight=false;
 state.activeLEDs=leds.filter(p=>amps(p)>.002);
 state.limitedLED=state.activeLEDs.some(p=>Math.abs(amps(p)-.04)<.001&&resistors.some(r=>samePath(r,p)));
 const motor=motors[0];
 state.rpm=motor?Math.round(amps(motor)*900):0;
 state.halfSpeed=!!motor&&Math.abs(state.rpm)===90&&resistors.some(r=>samePath(r,motor));
 state.bothDirections=false;state.bothSignals=false;state.controlledStop=false;
 if(!powered||state.short)return;
 for(const cap of caps){
  if(Math.abs(cap.charge||0)>=4)history.charged.add(cap.id);
  if(history.charged.has(cap.id)&&amps(cap)*(cap.charge||0)<-.01&&Math.abs(state.current)<.001&&state.lit&&parts.some(p=>p.kind==='switch'&&!p.closed))state.backupLight=true;
 }
 if(motor&&Math.abs(state.rpm)>5){
  const direction=Math.sign(state.rpm);
  if(history.directions.get(motor.id)===-direction)history.reversed.add(motor.id);
  history.directions.set(motor.id,direction);state.bothDirections=history.reversed.has(motor.id);
 }
 if(leds.length===2&&state.activeLEDs.length===1){
  const net=new Map();
  function root(n){while(net.has(n))n=net.get(n);return n;}
  for(const w of wires){const a=root(w.a),b=root(w.b);if(a!==b)net.set(a,b);}
  const [a,b]=leds;
  if(root(a.id+':0')===root(b.id+':1')&&root(a.id+':1')===root(b.id+':0')){
   const key=[a.id,b.id].sort().join('/');
   const on=state.activeLEDs[0].id;
   state.bothSignals=history.signals.has(key)&&history.signals.get(key)!==on;
   history.signals.set(key,on);
  }
 }
}
export function newHistory(){return {charged:new Set(),directions:new Map(),reversed:new Set(),signals:new Map()};}
