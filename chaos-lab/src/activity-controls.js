// Rebuild controls on lesson entry; keep focus and slider positions during simulation ticks.
export function activityControls(panel,lesson,activity,run){
 panel.replaceChildren();
 function button(text,action){
  const el=document.createElement('button');
  el.className='paper-button'; el.textContent=text; el.onclick=action;
  panel.append(el);return el;
 }
 function field(text,el){
  const label=document.createElement('label');
  label.append(text,el);panel.append(label);return el;
 }
 function slider(text,min,max,step,value,change){
  const el=document.createElement('input');
  Object.assign(el,{type:'range',min,max,step,value});
  el.oninput=()=>{change(Number(el.value));run();};field(text,el);
 }
 function menu(text,options){
  const el=document.createElement('select');
  for(const option of options)el.add(new Option(option,option));
  return field(text,el);
 }
 let refresh=()=>{};
 switch(lesson.id){
 case 'light-meter':
  slider('Shade position',-6,6,.1,activity.shadow,value=>activity.shadow=value);
  break;
 case 'servo-gate':
 case 'dispatch':
  slider('Gate angle',-45,45,5,activity.dial,value=>activity.dial=value);
  if(lesson.id==='dispatch'){
   button('Send crate',()=>run('send'));
   const bonus=button('Try sensor order',()=>run('bonus'));
   refresh=()=>{bonus.hidden=!activity.manualDelivered||activity.bonus;};
  }
  break;
 case 'capacity-compare':
 case 'rgb-fade':
  button('Charge and release',()=>run('release'));
  break;
 case 'timer-bell':
  button('Test timer',()=>run('test'));
  break;
 case 'cable-tester':{
  const socket=menu('Plug into socket',['Known +','Known −','Cable A','Cable B','Cable C']);
  socket.onchange=()=>{activity.socket=socket.value;activity.message='';run();};
  const tag=menu('Cable tag',['Choose a tag','Forward','Reverse','Dead']);
  tag.onchange=()=>{if(tag.selectedIndex>0)run('tag',tag.value);};
  refresh=powered=>{
   tag.disabled=!powered;
   tag.parentElement.hidden=!activity.calibrated||!socket.value.startsWith('Cable');
   tag.value=activity.tags[socket.value]??'Choose a tag';
  };
  break;
 }
 }
 panel.hidden=!panel.childElementCount;
 return refresh;
}
