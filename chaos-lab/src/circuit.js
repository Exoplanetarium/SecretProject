import {finals} from './challenges.js';
import {newLessons,units} from './units.js';
import {pins, channelDrops, capacity, nets, sensorContacts} from './activities.js';
import {FREE_BUILD_PARTS} from './observatory.js';
export const existingLevels=[
 {id:'loop',title:'Complete circuit',unit:'Unit 0',diagram:0,parts:['battery','lamp'],goal:'Light one lamp.',hint:'Use two wires: battery + to lamp, then lamp to battery −.',check:s=>s.lit>=1},
 {id:'switch',title:'Switch',unit:'Unit 0',diagram:1,parts:['battery','lamp','switch'],goal:'Open and close a switch to control a lamp.',hint:'Put the switch in the same loop as the lamp.',check:s=>s.lit>=1&&s.switchUsed},
 {id:'series',title:'Series lamps',unit:'Unit 0',diagram:3,parts:['battery','lamp','switch'],goal:'Light two lamps in one series loop.',hint:'Battery + → lamp → lamp → battery −.',check:s=>s.lit===2&&s.series},
 {id:'parallel',title:'Parallel lamps',unit:'Unit 0',diagram:4,parts:['battery','lamp','switch'],goal:'Light two lamps in parallel.',hint:'Connect each lamp across + and − independently.',check:s=>s.lit===2&&s.parallel},
 {id:'branches',title:'Branch switch',unit:'Unit 0',diagram:5,parts:['battery','lamp','switch'],goal:'Open one branch while the other lamp stays on.',hint:'Put a switch in only one of two parallel branches.',check:s=>s.branchControl&&s.lit===1},
 {id:'resistance',title:'Resistance',unit:'Resistors',diagram:2,parts:['battery','lamp','switch','resistor'],goal:'Dim one lamp with a resistor set to 50 Ω or more.',hint:'Put one resistor and one lamp in series. Select the resistor to change its value.',check:s=>s.singleResistor&&s.current<=6/70+.001},
 {id:'ohms-law',title:'Ohm’s law',unit:'Resistors',diagram:2,target:'0.10 A',parts:['battery','lamp','switch','resistor'],goal:'Reach 0.10 A with one lamp and one resistor.',hint:'6 ÷ 0.10 = 60 Ω total. The lamp already contributes 20 Ω.',check:s=>s.singleResistor&&Math.abs(s.current-.1)<.002},
 {id:'series-resistors',title:'Series resistors',unit:'Resistors',diagram:7,target:'0.075 A',parts:['battery','lamp','switch','resistor'],goal:'Reach 0.075 A using two resistors in series with one lamp.',hint:'Two 30 Ω resistors plus the 20 Ω lamp make 80 Ω.',check:s=>s.seriesResistors&&Math.abs(s.current-.075)<.002},
 {id:'parallel-resistors',title:'Parallel resistors',unit:'Resistors',diagram:8,target:'≈ 0.17 A',parts:['battery','lamp','switch','resistor'],goal:'Put two 30 Ω resistors in parallel, then in series with one lamp.',hint:'Battery + → two parallel 30 Ω branches → lamp → battery −.',check:s=>s.parallelResistors&&Math.abs(s.current-6/35)<.003},
 {id:'resistor-challenge',title:'Resistor challenge',unit:'Resistors',diagram:9,target:'0.10 A and 0.20 A',parts:['battery','lamp','switch','resistor'],goal:'Build two lamp branches carrying 0.10 A and 0.20 A, using two resistors.',hint:'Each lamp adds 20 Ω. Use I = V ÷ R for each branch.',check:s=>s.resistorChallenge},
 ...newLessons,
 {id:'sandbox',title:'Free build',unit:'Workshop',diagram:6,parts:FREE_BUILD_PARTS,goal:'Build your own circuit.',hint:'Try changing one part at a time.',check:()=>false}
];
export const LEVELS=units.flatMap(({name})=>[
 ...existingLevels.filter(l=>l.unit===name),
 ...finals.filter(l=>l.unit===name)
]);
const RELAY_DELAY=0.08,GATE_DELAY=0.04;
function evalGate(mode,a,b){
 switch(mode){
 case 'NOR':return !(a||b);
 case 'AND':return a&&b;
 case 'OR':return a||b;
 case 'XOR':return a!==b;
 case 'NOT':return !a;
 default:return !(a&&b);
 }
}
export function applyStep(parts,state){
 let changed=false;
 for(const p of parts){
  if(p.kind==='capacitor'&&state.capacitorVoltages&&p.id in state.capacitorVoltages){
   p.charge=state.capacitorVoltages[p.id];
  }else if(p.kind==='coil'&&state.nextRelays?.[p.id]){
   const next=state.nextRelays[p.id];
   if(!!p.energized!==next.energized)changed=true;
   p.energized=next.energized;p.relayTimer=next.relayTimer;
  }else if(p.kind==='gate'&&state.nextGates?.[p.id]){
   const next=state.nextGates[p.id];
   if(!!p.outputHigh!==next.outputHigh)changed=true;
   p.outputHigh=next.outputHigh;p.gateTimer=next.gateTimer;
  }else if(p.kind==='latch'&&state.nextLatches?.[p.id]){
   const next=state.nextLatches[p.id];
   if((p.bit?1:0)!==next.bit)changed=true;
   p.bit=next.bit;p.prevClk=next.prevClk;
  }else if(p.kind==='clock'&&state.nextClocks?.[p.id]){
   const next=state.nextClocks[p.id];
   if(!!p.high!==next.high)changed=true;
   p.phase=next.phase;p.high=next.high;
  }
 }
 return changed;
}
// Backward Euler companion for a 0.10 F capacitor module with 12 Ω series resistance.
export function solveCircuit(parts,wires,dt=0,{light={},socket='Dead'}={}){
 const battery=parts.find(p=>p.kind==='battery')??(socket!=='Dead'&&parts.find(p=>p.kind==='jack'));
 const empty={currents:{},voltages:{},lit:0,current:0,power:0,short:false,switchUsed:false,resistorUsed:false,series:false,parallel:false,branchControl:false,singleResistor:false,seriesResistors:false,parallelResistors:false,resistorChallenge:false,lampCurrents:[],capacitorVoltages:{},nextRelays:{},nextGates:{},nextLatches:{},nextClocks:{},displayValues:{},hasPendingTransition:false};
 const activeSource=battery||parts.some(p=>(p.kind==='capacitor'&&p.charge)||['clock','gate','latch'].includes(p.kind));
 if(!activeSource||!parts.length)return empty;
 const nodes=parts.flatMap(p=>Array.from({length:pins[p.kind]?.length??2},(_,i)=>p.id+':'+i)),index=new Set(nodes);
 const reversed=battery?.kind==='jack'?socket==='Reverse':battery?.reversed;
 const positive=battery?.id+':'+(reversed?'1':'0'),negative=battery?.id+':'+(reversed?'0':'1'),full=battery?.voltage||6;
 const refPart=parts.find(p=>p.kind==='clock')??parts.find(p=>p.kind==='gate')??parts.find(p=>p.kind==='latch')??parts.find(p=>p.kind==='display');
 const refNode=refPart?refPart.id+':'+(refPart.kind==='clock'?1:refPart.kind==='display'?4:3):nodes[0];
 const fixed=battery?new Map([[positive,full],[negative,0]]):new Map([[refNode,0]]);
 const unknown=nodes.filter(n=>!fixed.has(n)),ui=new Map(unknown.map((n,i)=>[n,i])),n=unknown.length;
 const edges=wires.filter(w=>index.has(w.a)&&index.has(w.b)).map(w=>({...w,r:.01,offset:0}));
 const connected=nets(wires),relayContacts={};
 for(const p of parts){
  if(p.kind==='rgb'){
   channelDrops.forEach((offset,i)=>edges.push({a:p.id+':'+i,b:p.id+':3',r:150,offset,id:p.id+'/'+i,led:true,on:true}));
   continue;
  }
  if(p.kind==='relay'){
   relayContacts[p.id]=sensorContacts(p,parts,connected,light);
   if(relayContacts[p.id])edges.push({a:p.id+':2',b:p.id+':3',r:.01,offset:0,id:p.id});
   continue;
  }
  if(p.kind==='rail'){
   edges.push({a:p.id+':0',b:p.id+':1',r:.01,offset:0},{a:p.id+':1',b:p.id+':2',r:.01,offset:0},{a:p.id+':2',b:p.id+':3',r:.01,offset:0});
   continue;
  }
  if(p.kind==='coil'){
   edges.push({a:p.id+':0',b:p.id+':1',r:120,offset:0,id:p.id});
   edges.push({a:p.id+':2',b:p.id+':'+(p.energized?4:3),r:.01,offset:0,id:p.id+'/c'});
   continue;
  }
  if(p.kind==='gate'){
   edges.push({a:p.id+':0',b:p.id+':3',r:1e6,offset:0},{a:p.id+':1',b:p.id+':3',r:1e6,offset:0});
   edges.push({a:p.id+':2',b:p.id+':3',r:5,offset:p.outputHigh?6:0,id:p.id});
   continue;
  }
  if(p.kind==='latch'){
   edges.push({a:p.id+':0',b:p.id+':3',r:1e6,offset:0},{a:p.id+':1',b:p.id+':3',r:1e6,offset:0});
   edges.push({a:p.id+':2',b:p.id+':3',r:5,offset:p.bit?6:0,id:p.id});
   continue;
  }
  if(p.kind==='clock'){
   edges.push({a:p.id+':0',b:p.id+':1',r:5,offset:p.high?6:0,id:p.id});
   continue;
  }
  if(p.kind==='display'){
   for(let i=0;i<4;i++)edges.push({a:p.id+':'+i,b:p.id+':4',r:1e6,offset:0,id:p.id+'/'+i});
   continue;
  }
  if(p.kind==='battery'||p.kind==='jack'||(p.kind==='switch'||p.kind==='button')&&!p.closed)continue;
  const r={switch:.01,button:.01,lamp:20,resistor:p.resistance||30,motor:30,capacitor:12+dt/capacity(p),led:20,photo:light[p.id]??600,bell:1e7,gear:30,servo:60}[p.kind];
  if(r)edges.push({a:p.id+':0',b:p.id+':1',r,offset:p.kind==='capacitor'?p.charge||0:p.kind==='led'?2:0,id:p.id,led:p.kind==='led',on:true});
 }
 // Partition unknown nodes into independent connected components so large digital builds stay linear-time.
 const adj=Array.from({length:n},()=>[]);
 for(const e of edges){
  const ia=ui.get(e.a),ib=ui.get(e.b);
  if(ia!==undefined&&ib!==undefined&&ia!==ib){adj[ia].push(ib);adj[ib].push(ia);}
 }
 const compOf=new Int32Array(n).fill(-1),components=[];
 for(let start=0;start<n;start++){
  if(compOf[start]>=0)continue;
  const compNodes=[start],id=components.length;
  compOf[start]=id;
  for(let head=0;head<compNodes.length;head++){
   for(const nb of adj[compNodes[head]])if(compOf[nb]<0){compOf[nb]=id;compNodes.push(nb);}
  }
  components.push({nodes:compNodes,edges:[]});
 }
 for(const e of edges){
  const ia=ui.get(e.a),ib=ui.get(e.b);
  const c=ia!==undefined?compOf[ia]:ib!==undefined?compOf[ib]:-1;
  if(c>=0)components[c].edges.push(e);
 }
 const voltages=Object.fromEntries(fixed),localIdx=new Int32Array(n).fill(-1);
 for(const comp of components){
  const compNodes=comp.nodes,compEdges=comp.edges,m=compNodes.length;
  for(let i=0;i<m;i++)localIdx[compNodes[i]]=i;
  const maxPass=compEdges.some(e=>e.led)?2*compEdges.length+2:0;
  for(let pass=0;pass<=maxPass;pass++){
   const a=Array.from({length:m},(_,i)=>{const row=Array(m+1).fill(0);row[i]=1e-9;return row;});
   for(const e of compEdges)for(const [u,v,sign] of [[e.a,e.b,1],[e.b,e.a,-1]]){
    const gu=ui.get(u);if(gu===undefined)continue;
    const i=localIdx[gu],g=e.on===false?1e-10:1/e.r,gv=ui.get(v);
    a[i][i]+=g;if(gv!==undefined)a[i][localIdx[gv]]-=g;else a[i][m]+=g*fixed.get(v);
    if(e.on!==false)a[i][m]+=sign*g*e.offset;
   }
   for(let k=0;k<m;k++){let pivot=k;for(let i=k+1;i<m;i++)if(Math.abs(a[i][k])>Math.abs(a[pivot][k]))pivot=i;[a[k],a[pivot]]=[a[pivot],a[k]];const d=a[k][k];if(Math.abs(d)<1e-15)continue;for(let j=k;j<=m;j++)a[k][j]/=d;for(let i=0;i<m;i++){if(i===k)continue;const f=a[i][k];for(let j=k;j<=m;j++)a[i][j]-=f*a[k][j];}}
   for(let i=0;i<m;i++)voltages[unknown[compNodes[i]]]=a[i][m];
   let changed=false;
   for(const e of compEdges)if(e.led){const on=voltages[e.a]-voltages[e.b]>e.offset+1e-8;if(on!==e.on){e.on=on;changed=true;}}
   if(!changed)break;
  }
  for(let i=0;i<m;i++)localIdx[compNodes[i]]=-1;
 }
 const currents={},capacitorVoltages={},nextRelays={},nextGates={},nextLatches={},nextClocks={},displayValues={};
 let current=0,hasPendingTransition=false;
 for(const e of edges){
  const amps=e.on===false?0:(voltages[e.a]-voltages[e.b]-e.offset)/e.r;
  if(e.id)currents[e.id]=amps;
  if(e.a===positive)current+=amps;if(e.b===positive)current-=amps;
 }
 const short=Math.abs(current)>3,lamps=parts.filter(p=>p.kind==='lamp'),lit=short?[]:lamps.filter(p=>Math.abs(currents[p.id]||0)>.025);
 for(const p of parts){
  if(p.kind==='capacitor')capacitorVoltages[p.id]=(p.charge||0)+(short?0:dt*currents[p.id]/capacity(p));
  else if(p.kind==='coil'){
   const vCoil=Math.abs((voltages[p.id+':0']||0)-(voltages[p.id+':1']||0));
   const was=!!p.energized,want=was?vCoil>1.8:vCoil>=3;
   if(!short&&want!==was){
    const timer=(p.relayTimer||0)+dt;
    if(timer>=RELAY_DELAY)nextRelays[p.id]={energized:want,relayTimer:0};
    else nextRelays[p.id]={energized:was,relayTimer:timer};
    hasPendingTransition=true;
   }else nextRelays[p.id]={energized:was,relayTimer:0};
  }else if(p.kind==='gate'){
   const vRef=voltages[p.id+':3']||0;
   const inA=(voltages[p.id+':0']||0)-vRef>=3,inB=(voltages[p.id+':1']||0)-vRef>=3;
   const was=!!p.outputHigh,want=evalGate(p.gateMode||'NAND',inA,inB);
   if(!short&&want!==was){
    const timer=(p.gateTimer||0)+dt;
    if(timer>=GATE_DELAY)nextGates[p.id]={outputHigh:want,gateTimer:0};
    else nextGates[p.id]={outputHigh:was,gateTimer:timer};
    hasPendingTransition=true;
   }else nextGates[p.id]={outputHigh:was,gateTimer:0};
  }else if(p.kind==='latch'){
   const vRef=voltages[p.id+':3']||0;
   const dHigh=(voltages[p.id+':0']||0)-vRef>=3,clkHigh=(voltages[p.id+':1']||0)-vRef>=3;
   const rising=!short&&p.prevClk===false&&clkHigh;
   const bit=rising?(dHigh?1:0):(p.bit?1:0);
   nextLatches[p.id]={bit,prevClk:short?p.prevClk:clkHigh};
   if(rising&&bit!==(p.bit?1:0))hasPendingTransition=true;
  }else if(p.kind==='clock'){
   const hz=[.5,1,2,4].includes(p.clockHz)?p.clockHz:1,period=1/hz;
   const phase=!short&&dt>0?((p.phase||0)+dt)%period:(p.phase||0);
   nextClocks[p.id]={phase,high:phase>=period/2};
   hasPendingTransition=true;
  }else if(p.kind==='display'){
   const vRef=voltages[p.id+':4']||0;
   let val=0;for(let i=0;i<4;i++)if((voltages[p.id+':'+i]||0)-vRef>=3)val|=1<<i;
   displayValues[p.id]=val;
  }
 }
 const activeResistors=parts.filter(p=>p.kind==='resistor'&&Math.abs(currents[p.id]||0)>.025),sameCurrent=p=>Math.abs(Math.abs(currents[p.id]||0)-current)<.0001;const singleResistor=lamps.length===1&&lit.length===1&&activeResistors.length===1&&sameCurrent(lamps[0])&&activeResistors.every(sameCurrent),seriesResistors=lamps.length===1&&lit.length===1&&activeResistors.length===2&&sameCurrent(lamps[0])&&activeResistors.every(sameCurrent);const parallelResistors=lamps.length===1&&lit.length===1&&activeResistors.length===2&&sameCurrent(lamps[0])&&Math.abs(activeResistors.reduce((a,p)=>a+Math.abs(currents[p.id]),0)-current)<.0001&&Math.abs(Math.abs(voltages[activeResistors[0]?.id+':0']-voltages[activeResistors[0]?.id+':1'])-Math.abs(voltages[activeResistors[1]?.id+':0']-voltages[activeResistors[1]?.id+':1']))<.01;
 const lampCurrents=lamps.map(p=>Math.abs(currents[p.id]||0)).sort((a,b)=>a-b),resistorCurrents=activeResistors.map(p=>Math.abs(currents[p.id]||0)).sort((a,b)=>a-b);const resistorChallenge=!short&&lamps.length===2&&lit.length===2&&activeResistors.length===2&&Math.abs(lampCurrents[0]-.1)<.002&&Math.abs(lampCurrents[1]-.2)<.002&&Math.abs(resistorCurrents[0]-.1)<.002&&Math.abs(resistorCurrents[1]-.2)<.002&&Math.abs(current-.3)<.003;
 return {...empty,voltages,currents,relayContacts,capacitorVoltages,nextRelays,nextGates,nextLatches,nextClocks,displayValues,hasPendingTransition,current,singleResistor,seriesResistors,parallelResistors,resistorChallenge,lampCurrents,power:current*full,short,lit:lit.length,switchUsed:parts.some(p=>p.kind==='switch'&&Math.abs(currents[p.id]||0)>.025),resistorUsed:parts.some(p=>p.kind==='resistor'&&Math.abs(currents[p.id]||0)>.025),series:lit.length===2&&lit.every(p=>Math.abs(voltages[p.id+':0']-voltages[p.id+':1'])<full*.65),parallel:lit.length===2&&lit.every(p=>Math.abs(voltages[p.id+':0']-voltages[p.id+':1'])>full*.9)};
}
