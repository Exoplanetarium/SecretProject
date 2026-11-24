import {activities} from './activities.js';

const lampFinal={id:'lamp-control-challenge',unit:'Unit 0',title:'Lamp control challenge',parts:['battery','lamp','switch'],target:'Two independent lamps',goal:'Build a panel with two lamps and two switches. Show that either lamp can go dark while the other stays on.',hint:'Start with both lamps lit. Think about which current path each switch should interrupt.',ending:'Each switch controls its own lamp branch.',diagram:'lamp-control-challenge',check:s=>s.designPassed===true};
export const finals=[
 lampFinal,
 ...activities.filter(l=>l.challenge).map(l=>({...l,diagram:l.id,check:s=>s.activityPassed===true||s.designPassed===true}))
].map(l=>({...l,challenge:true}));

export function newTrial(){return {switches:new Map(),polarities:new Map(),seconds:0,armed:false,passed:false};}

// A demonstration belongs to one build. Moving parts keeps the wiring intact.
export function assessFinal(id,parts,wires,s,trial,{powered,dt=0,switched,before}){
 const configuration=JSON.stringify([parts.map(p=>[p.id,p.kind,p.resistance]),wires.map(w=>[w.a,w.b])]);
 if(configuration!==trial.configuration||!powered||s.short){
  Object.assign(trial,newTrial(),{configuration});
 }
 const of=kind=>parts.filter(p=>p.kind===kind);
 const exact=(counts)=>parts.length===Object.values(counts).reduce((a,b)=>a+b,0)&&Object.entries(counts).every(([kind,n])=>of(kind).length===n);
 const valid=powered&&!s.short;
 const amp=(state,p)=>Math.abs(state.currents[p.id]||0);
 if(id==='lamp-control-challenge'){
  if(valid&&before&&!before.short&&switched&&exact({battery:1,switch:2,lamp:2})){
   const lamps=of('lamp');
   const changed=lamps.filter(p=>(amp(before,p)>.025)!==(amp(s,p)>.025));
   if(changed.length===1&&lamps.some(p=>amp(before,p)>.025&&amp(s,p)>.025)){
    trial.switches.set(switched.id,changed[0].id);
    trial.passed=trial.switches.size===2&&new Set(trial.switches.values()).size===2;
   }
  }
  s.designReading='Independent switches tested: '+trial.switches.size+' / 2';
 }else if(id==='backup-challenge'){
  const cap=of('capacitor')[0],lamp=of('lamp')[0],sw=of('switch')[0];
  const discharge=valid&&exact({battery:1,capacitor:1,lamp:1,switch:1})&&!sw.closed&&
   Math.abs(s.current)<.001&&s.lit===1&&s.currents[cap.id]*cap.charge<0&&Math.abs(amp(s,cap)-amp(s,lamp))<.001;
  if(!discharge){trial.armed=false;trial.seconds=0;}
  if(discharge&&switched===sw&&before&&!before.short&&before.current>.025&&amp(before,sw)>.025&&Math.abs(cap.charge)>=4){
   trial.armed=true;trial.seconds=0;
  }
  if(discharge&&trial.armed){trial.seconds=Math.min(3,trial.seconds+dt);if(trial.seconds>=3)trial.passed=true;}
  s.designReading='Backup light: '+trial.seconds.toFixed(1)+' / 3.0 s';
 }else if(id==='signal-challenge'){
  const lamps=of('led'),resistors=of('resistor'),battery=of('battery')[0];
  const on=lamps.filter(p=>amp(s,p)>.002);
  if(valid&&battery&&lamps.length===2&&resistors.length&&on.length===1&&Math.abs(amp(s,on[0])-.04)<.001&&Math.abs(s.current-.04)<.001&&resistors.some(r=>amp(s,r)>.001)){
   trial.polarities.set(!!battery.reversed,on[0].id);
   trial.passed=trial.polarities.size===2&&new Set(trial.polarities.values()).size===2;
  }
  s.designReading='LED current: '+(valid&&on.length===1?amp(s,on[0]).toFixed(3):'0.000')+' A · polarities tested: '+trial.polarities.size+' / 2';
 }else if(id==='speed-challenge'){
  if(valid&&switched&&before&&!before.short&&exact({battery:1,motor:1,resistor:1,switch:1})){
   const motor=of('motor')[0],r=of('resistor')[0];
   const slow=switched.closed?before:s,fast=switched.closed?s:before;
   const rpm=state=>Math.round((state.currents[motor.id]||0)*900);
   trial.passed=Math.abs(rpm(slow))===90&&Math.abs(rpm(fast))===180&&rpm(slow)*rpm(fast)>0&&amp(slow,r)>.09&&amp(fast,r)<.001;
  }
  s.designReading='Motor speed: '+Math.abs(valid?s.rpm:0)+' rpm';
 }
 s.designPassed=trial.passed;
}
