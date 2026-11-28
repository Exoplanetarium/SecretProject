import {OBSERVATORY_DEVICE_NAMES,OBSERVATORY_PINS,relayActivities,observatoryActivities,measureObservatory} from './observatory.js';
import {transistorActivities,measureTransistors} from './transistors.js';
import {foundationActivities,measureFoundations} from './foundations.js';
import {comparatorActivities,measureComparators} from './comparators.js';
import {logicActivities,measureLogic} from './logic-unit.js';
import {libraryActivities,measureLibrary} from './library.js';
import {MASTER_DEVICE_NAMES,MASTER_PINS,masterActivities,measureMaster} from './master.js';
export const deviceNames={photo:'Photoresistor',rgb:'RGB light',bell:'Threshold bell',gear:'Geared drive',servo:'Servo + controller',jack:'Test socket',relay:'Sensor switch',diode:'Diode',spdt:'2-way switch',pot:'Potentiometer',fuse:'Glass fuse',meter:'Voltmeter',transistor:'NPN transistor',comparator:'Comparator',...OBSERVATORY_DEVICE_NAMES,...MASTER_DEVICE_NAMES};
export const pins={rgb:['R','G','B','−'],relay:['L1','L2','C','NO'],servo:['+','−'],gear:['+','−'],bell:['+','−'],jack:['1','2'],diode:['A','K'],spdt:['C','A','B'],pot:['1','W','2'],meter:['+','−'],transistor:['C','B','E'],comparator:['+','−','Q','0V'],...OBSERVATORY_PINS,...MASTER_PINS};
export const channelDrops=[2,3.15,3.25];
export const capacity=p=>[.01,.1,.22].includes(p.capacitance)?p.capacitance:.1;
export function photoOhms(x,shadow,z=0){return Math.round(600+9400*Math.exp(-((x-shadow)**2+z*z)/3));}
export function nets(wires){
 const parents=new Map();
 function root(x){while(parents.has(x))x=parents.get(x);return x;}
 for(const w of wires){const a=root(w.a),b=root(w.b);if(a!==b)parents.set(a,b);}
 return (a,b)=>root(a)===root(b);
}
export function sensorContacts(p,parts,connected,light){
 return parts.some(q=>q.kind==='photo'&&(light[q.id]??600)>5000&&[0,1].some(i=>connected(q.id+':0',p.id+':'+i)&&connected(q.id+':1',p.id+':'+(1-i))));
}
const device=(kind,x,z,settings={})=>({kind,x,z,...settings});
const battery=device('battery',-5,3), resistor=device('resistor',0,3), cap=device('capacitor',3,-1);
const led=(x,z,color='red')=>device('led',x,z,{color});
const fixture=(parts,connections=[])=>({parts:parts.map((p,i)=>({resistance:30,...p,id:'p'+(i+1)})),wires:connections.map(([a,b])=>({a:'p'+a,b:'p'+b}))});
const leads=(...pairs)=>pairs.map(pair=>pair.split('-').map(pin=>pin.replace('.',':')));
const twoLeds=[battery,led(1,-2),led(5,2)];
function activity(id,unit,title,goal,hint,layout,parts,extra={}){
 return {id,unit,title,goal,hint,parts,layout,diagram:id,activity:true,check:s=>s.activityPassed===true,ending:extra.ending||goal,...extra};
}
export const activities=[
 activity('house-breaker','Resistors','Keep the lights on','Keep the reading lamp bright and both stair lights at least 0.10 A each under the 0.42 A breaker limit. Use one resistor.','Reading already draws 0.30 A on its own branch, leaving only 0.12 A before the 0.42 A breaker trips. Think about where your one resistor belongs and what value keeps both stair lights at least 0.10 A.',fixture([battery,device('lamp',-6,-2,{role:'Reading'}),device('lamp',1,-2,{role:'Landing'}),device('lamp',7,-2,{role:'Stairs'}),device('resistor',0,3,{resistance:30})],leads('1.0-2.0','2.1-1.1')),['battery','lamp','resistor'],{challenge:true,target:'Reading ≥ 0.28 A · Stairs ≥ 0.10 A each · Total ≤ 0.42 A',ending:'Putting the two stair lights in series let one branch current power both under the 0.42 A breaker while the reading lamp stayed bright.'}),
 activity('capacity-compare','Capacitors','Capacitor size','Charge both capacitors to 6 V. Watch which lamp stays on longer.','Each isolated loop uses the same 20 Ω lamp. Select Charge and release and compare the gauges.',fixture([device('capacitor',-4,-1,{capacitance:.1,role:'0.10 F'}),device('lamp',-4,2),device('capacitor',4,-1,{capacitance:.22,role:'0.22 F'}),device('lamp',4,2)],leads('1.0-2.0','1.1-2.1','3.0-4.0','3.1-4.1')),['capacitor','lamp'],{ending:'At the same voltage the larger capacitor stored more charge and lit its lamp for longer.'}),
 activity('timer-bell','Capacitors','Three-second bell','Make the bell ring three seconds after Test. It senses 3 V across its terminals.','Charge the capacitor through a resistor. Put the bell across the capacitor module. Compare your times as you adjust resistance.',fixture([battery,resistor,cap,device('bell',7,2)],leads('1.0-2.0','2.1-3.0','3.1-1.1')),['battery','resistor','capacitor','bell'],{challenge:true,target:'2.7–3.3 seconds',ending:'The capacitor voltage crossed the bell threshold at the requested time.'}),
 activity('led-series','LEDs','Series footlights','Power both red footlights. Unplug one lead with the pliers and see what happens.','In one loop the same current passes through both LEDs.',fixture(twoLeds,leads('1.0-2.0','2.1-3.0','3.1-1.1')),['battery','led'],{ending:'Opening the shared current path put both footlights out.'}),
 activity('led-parallel','LEDs','Parallel footlights','Wire two parallel stage lights. Pull one lead and keep the show lit.','Each signal needs its own path across the supply. Both signals have built-in resistors.',fixture(twoLeds,leads('1.0-2.0','2.1-1.1')),['battery','led'],{ending:'The other branch kept carrying current when one light was unplugged.'}),
 activity('rgb-mix','LEDs','RGB stage cue','Wire a magenta cue on the curtain. Use the four terminals on the stage light.','Connect the common negative return. Red and blue together make magenta. Each channel includes a protective resistor.',fixture([battery,device('rgb',3,0)],leads('2.3-1.1')),['battery','rgb'],{ending:'Red and blue light mixed on the curtain.'}),
 activity('rgb-fade','LEDs','Fading color cue','Charge the capacitor and release it through the magenta light. Watch which color lingers.','The modeled blue emitter needs more voltage than red. Compare their branch currents as the capacitor runs down.',fixture([device('capacitor',-3,0,{capacitance:.01}),device('rgb',3,0)],leads('1.0-2.0','1.0-2.2','1.1-2.3')),['capacitor','rgb'],{ending:'The blue channel faded first as the supply voltage fell. The remaining cue was red.'}),
 activity('cable-tester','LEDs','Mystery cables','Build a tester with two opposite-facing signals. Calibrate both directions, then identify all three cables.','Remember how LEDs only light in one direction. Hook up both colored LEDs on the socket so Known + lights one, Known − lights the other, and a dead cable lights neither.',fixture([device('jack',-4,1),led(2,-2,'red'),led(5,2,'green')]),['jack','led'],{challenge:true,target:'Identify three cables',ending:'Your tester distinguished both polarities and an unpowered cable.'}),
 activity('belt-drive','Motors','DC belt drive','Run the empty belt forward, then reverse it. Watch the crate move both ways.','The motor is coupled to the belt. Apply power, select the battery, then reverse polarity.',fixture([battery,device('motor',4,2)],leads('1.0-2.0','2.1-1.1')),['battery','motor'],{machine:true,ending:'Changing motor polarity reversed the belt travel.'}),
 activity('loaded-drive','Motors','Geared drive','Try the direct drive on the loaded incline, then move the supply leads to the geared drive. Deliver the crate.','The direct drive stalls under this load. The reduction gearbox trades speed for turning force.',fixture([device('battery',-5,4),device('motor',1.5,4.5),device('gear',5.5,-2.5)],leads('1.0-2.0','2.1-1.1')),['battery','motor','gear'],{machine:true,ending:'The geared output delivered enough turning force to climb with the load.'}),
 activity('servo-gate','Motors','Servo sorting gate','Power the servo controller. Move its dial to aim the gate at each chute.','Connect + and −, then use the Gate angle dial. The controller supplies the servo position signal.',fixture([battery,device('servo',3,2)],leads('1.0-2.0','2.1-1.1')),['battery','servo'],{machine:true,ending:'The controller commanded an angle and the servo held the gate there.'}),
 activity('dispatch','Motors','Dispatch line','Deliver a loaded crate to the requested bin. Choose a drive and set the powered gate.','Wire the geared drive and servo controller across the battery. Aim the gate and send a crate. A second order can use the optical sensor to light an arrival signal.',fixture([device('battery',-5,4),device('motor',1,4.5),device('gear',5,-2.5),device('servo',8.5,2.5)],leads('1.0-2.0','2.1-1.1')),['battery','motor','gear','servo','switch','photo','relay','led'],{machine:true,challenge:true,target:'Deliver to the right bin',ending:'The drive carried the load and the servo routed it. Try the sensor order to signal the next arrival.'}),
 ...foundationActivities,
 ...relayActivities,
 ...transistorActivities,
 ...comparatorActivities,
 ...logicActivities,
 ...observatoryActivities,
 ...libraryActivities,
 ...masterActivities
];
const FOUNDATION_IDS=new Set(foundationActivities.map(l=>l.id));
export function freshActivity(){
 const cables=['Forward','Reverse','Dead'];
 for(let i=cables.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[cables[i],cables[j]]=[cables[j],cables[i]];}
 return {shadow:-4,socket:'Known +',cables,tags:{},cal:new Set(),seen:new Set(),seconds:0,previous:null,running:false,
 position:0,gate:0,dial:0,order:'right',bonus:false,litBefore:false,delivered:false,passed:false,message:'',obs:{}};
}
export function socketMode(a){return a.socket==='Known +'?'Forward':a.socket==='Known −'?'Reverse':a.cables[['Cable A','Cable B','Cable C'].indexOf(a.socket)];}
export function conditions(parts,a,id){
 const light={};
 for(const p of parts)if(p.kind==='photo')light[p.id]=id==='dispatch'?(a.position>=.73&&a.position<=.92?10000:600):id==='light-meter'?photoOhms(p.x,a.shadow,p.z):Math.round(10000-Math.max(0,Math.min(100,p.lux??100))/100*9400);
 return {light,socket:socketMode(a)};
}
export function measureActivity(lesson,parts,wires,s,a,on,dt){
 if(FOUNDATION_IDS.has(lesson.id))return measureFoundations(lesson,parts,wires,s,a,on,dt);
 if(lesson.unit==='Transistors')return measureTransistors(lesson,parts,wires,s,a,on,dt);
 if(lesson.unit==='Comparators')return measureComparators(lesson,parts,wires,s,a,on,dt);
 if(lesson.unit==='Logic')return measureLogic(lesson,parts,wires,s,a,on,dt);
 if(lesson.unit==='Observatory'||lesson.unit==='Relays')return measureObservatory(lesson,parts,wires,s,a,on,dt);
 if(lesson.library)return measureLibrary(lesson,parts,wires,s,a,on,dt);
 if(lesson.master)return measureMaster(lesson,parts,wires,s,a,on,dt);
 const id=lesson.id,kind=k=>parts.filter(p=>p.kind===k),amp=p=>on&&p?Math.abs(s.currents[p.id]||0):0;
 const voltage=p=>on&&p?(s.voltages[p.id+':0']||0)-(s.voltages[p.id+':1']||0):0;
 const leds=kind('led'),lit=leds.filter(p=>amp(p)>.002),caps=kind('capacitor'),lamps=kind('lamp');
 let reading='';
 if(id==='house-breaker'){
  const currents=['Reading','Landing','Stairs'].map(role=>amp(lamps.find(p=>p.role===role)));
  reading=a.tripped?'Breaker tripped · rewire and restore power':currents.map((v,i)=>['Reading','Landing','Stairs'][i]+' '+v.toFixed(2)+' A').join(' · ');
  if(on&&s.current<=.4201&&currents[0]>=.28&&currents.slice(1).every(v=>v>=.098)&&kind('resistor').length===1&&amp(kind('resistor')[0])>.04)a.passed=true;
 }else if(id==='capacity-compare'){
  reading=caps.map(p=>capacity(p).toFixed(2)+' F · '+Math.abs(p.charge||0).toFixed(2)+' V').join(' / ');
  if(a.running&&s.lit===2)a.seen.add('both');
  if(on&&a.running&&a.seen.has('both')&&amp(lamps[0])<.025&&amp(lamps[1])>.025){a.passed=true;a.running=false;}
 }else if(id==='timer-bell'){
  const bell=kind('bell')[0],v=Math.abs(voltage(bell));
  if(a.running&&on){
   const prev=a.lastVoltage??0;
   if(v>=3){
    a.seconds+=dt*Math.max(0,Math.min(1,(3-prev)/(v-prev||1)));a.running=false;a.rang=true;
    const joined=nets(wires);
    const acrossCap=caps.some(c=>
     (joined(c.id+':0',bell.id+':0')&&joined(c.id+':1',bell.id+':1'))||
     (joined(c.id+':0',bell.id+':1')&&joined(c.id+':1',bell.id+':0'))
    );
    a.passed=acrossCap&&kind('resistor').some(r=>amp(r)>.001)&&a.seconds>=2.7&&a.seconds<=3.3;
   }else a.seconds+=dt;
   a.lastVoltage=v;
  }
  reading=(a.rang?'Bell rang · ':'')+a.seconds.toFixed(2)+' s · bell '+v.toFixed(2)+' V'+(a.previous!=null?' · previous '+a.previous.toFixed(2)+' s':'');
 }else if(id==='led-series'||id==='led-parallel'){
  const parallel=id==='led-parallel';
  if(on&&lit.length===2&&leds.length===2&&lit.every(p=>parallel?voltage(p)>5.8:Math.abs(amp(p)-s.current)<.001)){a.seen.add('both');a.cut=false;}
  if(on&&a.seen.has('both')&&a.cut&&lit.length===(parallel?1:0))a.passed=true;
  reading=leds.map((p,i)=>'Light '+(i+1)+' · '+amp(p).toFixed(3)+' A').join(' / ');
 }else if(id==='rgb-mix'||id==='rgb-fade'){
  const rgb=kind('rgb')[0],channels=channelDrops.map((_,i)=>on&&rgb?s.currents[rgb.id+'/'+i]||0:0);
  reading=channels.map((v,i)=>'RGB'[i]+' '+(1000*v).toFixed(1)+' mA').join(' · ');
  if(channels[0]>.003&&channels[2]>.003&&channels[1]<.0001)a.seen.add('magenta');
  if(id==='rgb-mix')a.passed=a.seen.has('magenta');
  else if(a.running&&a.seen.has('magenta')&&channels[0]>.001&&channels[2]<.0002){a.passed=true;a.running=false;}
 }else if(id==='cable-tester'){
  const key=JSON.stringify([wires,leds.map(p=>p.id)]);
  if(key!==a.key){a.key=key;a.cal.clear();a.tags={};a.message='';a.passed=false;}
  if(on&&a.socket.startsWith('Known')&&lit.length===1&&leds.length===2){
   a[a.socket]=lit[0].id;a.cal.add(a.socket);
  }
  a.calibrated=a.cal.size===2&&a['Known +']!==a['Known −'];
  const signal=lit.map(p=>p.color==='green'?'Green':'Red').join(' + ');
  const observation=!on?'Power off':signal?signal+' on':'Both off';
  reading=observation+' · '+(a.message||(a.calibrated?'Calibrated':'Calibration '+a.cal.size+' / 2'));
 }else if(lesson.machine){
  const motor=kind('motor')[0],gear=kind('gear')[0],servo=kind('servo')[0];
  const direct=voltage(motor)/6, geared=voltage(gear)/6;
  const live=voltage(servo)>3; if(live)a.gate=a.dial;
  if(id==='servo-gate'){
   if(live&&Math.abs(a.gate)>=35)a.seen.add(Math.sign(a.gate));
   a.passed=a.seen.size>=2;reading=(live?'Gate ':'Controller off · ')+a.gate+'°';
  }else{
   const loaded=id!=='belt-drive';
   if(on&&loaded&&Math.abs(direct)>.4&&Math.abs(geared)<.15)a.seen.add('stall');
   a.speed=loaded?(Math.abs(geared)>.24?geared*.20:0):direct*.45;
   const before=a.position;
   if(a.running||id!=='dispatch')a.position=Math.max(0,Math.min(1,a.position+a.speed*dt));
   if(id==='belt-drive'&&a.position!==before)a.seen.add(Math.sign(a.position-before));
   if(id==='belt-drive')a.passed=a.seen.size===2;
   if(id==='loaded-drive'&&a.seen.has('stall')&&a.position>=.99)a.passed=true;
   if(id==='dispatch'&&a.running){
    const relay=kind('relay')[0],photo=kind('photo')[0];
    const signal=lit.length===1&&relay&&Math.abs(amp(relay)-amp(lit[0]))<.001;
    if(a.position<.65&&!lit.length&&photo&&relay)a.litBefore=true;
    if(a.position>=.73&&a.position<=.92&&a.litBefore&&signal)a.sawArrival=true;
    if(a.position>=1){a.running=false;const correct=live&&(a.order==='right'?a.gate>=30:a.gate<=-30);
     a.delivered=correct&&(!a.bonus||a.sawArrival);
     a.message=!correct?'Missed the requested bin':a.bonus&&!a.sawArrival?'Crate delivered · arrival light missed':'Delivered to '+a.order;
     if(a.delivered){a.passed=true;if(!a.bonus)a.manualDelivered=true;}
    }
   }
   reading=a.message||(loaded&&on&&Math.abs(direct)>.4&&!a.speed?'Direct drive stalled':(a.bonus?'Sensor order':'Belt')+' · '+Math.round(a.position*100)+'%'+(id==='dispatch'?' · bin '+a.order:''));
  }
 }
 s.activityPassed=a.passed;s.designReading=reading;return reading;
}
