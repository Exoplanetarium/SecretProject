const paths={
 play:'<path d="m9 5 11 7-11 7Z" fill="currentColor" stroke="none"/>',
 levels:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
 power:'<path d="M12 3v9m-6-7a9 9 0 1 0 12 0"/>',
 undo:'<path d="m8 4-5 5 5 5M3 9h10a7 7 0 0 1 0 14"/>',
 reset:'<path d="M4 10a8 8 0 1 1 1 8M4 3v7h7"/>',
 camera:'<circle cx="12" cy="12" r="7"/><path d="M12 1v6m0 10v6M1 12h6m10 0h6"/>',
 help:'<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 1 1 5 2c-2 1-2 2-2 3m0 3h.01"/>',
 close:'<path d="m6 6 12 12M6 18 18 6"/>',
 trash:'<path d="M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7"/>',
 save:'<path d="M4 3h14l3 3v15H3V3Zm3 0v7h10V3M7 21v-7h10v7"/>',
 sound:'<path d="M4 9h4l5-5v16l-5-5H4Zm13-3a9 9 0 0 1 0 12m-1-9a4 4 0 0 1 0 6"/>',
 mute:'<path d="M4 9h4l5-5v16l-5-5H4Zm13 0 5 6m0-6-5 6"/>',
 check:'<path d="m5 12 5 5L20 7"/>',
 lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
 bulb:'<path d="M9 18h6m-6 3h6M8 14a6 6 0 1 1 8 0l-1 2H9Z"/>',
 wire:'<circle cx="4" cy="17" r="2"/><circle cx="20" cy="7" r="2"/><path d="M6 17c8 0 0-10 12-10"/>',
 hand:'<path d="M8 12V5a2 2 0 0 1 4 0v7-3a2 2 0 0 1 4 0v4-2a2 2 0 0 1 4 0v5c0 4-3 6-6 6h-2c-2 0-3-1-4-3L3 13a2 2 0 0 1 3-2l2 2"/>',
 next:'<path d="m8 5 8 7-8 7"/>',
 battery:'<rect x="3" y="6" width="17" height="12" rx="2"/><path d="M20 10h2v4h-2M6 10v4m-2-2h4m6 0h3"/>',
 lamp:'<path d="M8 15a7 7 0 1 1 8 0l-1 3H9ZM9 21h6M2 3l2 2m16-2-2 2M12 0v2"/>',
 switch:'<circle cx="4" cy="16" r="2"/><circle cx="20" cy="16" r="2"/><path d="m6 15 12-9M2 21h20"/>',
 resistor:'<path d="M1 12h4l2-6 4 12 4-12 2 6h6"/>',
 sandbox:'<path d="M3 8h18v13H3ZM7 8V4h4v4m3 0V2h4v6M7 14h10"/>'
};
export function icon(name){return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||paths.bulb}</svg>`;}
export function diagram(index){
 if(index===9)return `<svg class="circuit-diagram challenge-diagram" viewBox="0 0 200 112" role="img" aria-label="Two lamps with target currents of 0.10 A and 0.20 A"><circle cx="50" cy="40" r="17"/><path d="m40 30 20 20m-20 0 20-20"/><circle cx="150" cy="40" r="17"/><path d="m140 30 20 20m-20 0 20-20"/><text x="50" y="85" text-anchor="middle">0.10 A</text><text x="150" y="85" text-anchor="middle">0.20 A</text></svg>`;
 const battery='<path d="M24 20h76M24 20v28m-14 0h28m-21 14h14m-7 0v30h76"/><text x="40" y="46">+</text>';
 const bulb=(x,y,dim=false)=>`<g class="diagram-lamp ${dim?'dim':''}"><circle cx="${x}" cy="${y}" r="13"/><path d="m${x-7} ${y-7} 14 14m-14 0 14-14"/><g class="rays"><path d="M${x} ${y-22}v-4m0 52v-4m-22-22h-4m52 0h-4m-38-16-3-3m35 35 3 3m-35 0-3 3m35-35 3-3"/></g></g>`;
 let detail='';
 if(index===7)detail=`<path d="M100 20h60v23m0 26v23h-60"/>${bulb(160,56,true)}<path class="paper-cut" d="M48 20h34m25 0h35"/><path d="m48 20 5-7 6 14 6-14 6 14 6-14 5 7m25 0 5-7 6 14 6-14 6 14 6-14 6 7"/>`;
 if(index===8)detail='<path d="M100 20h60m-60 0v10m60-10v10M100 58h60v9m0 22v3h-60M100 56v2m60-2v2"/><path d="m100 30-6 4 12 5-12 5 12 5-12 5 6 2m60-26-6 4 12 5-12 5 12 5-12 5 6 2"/><circle class="diagram-lamp" cx="160" cy="78" r="11"/><path d="m154 72 12 12m-12 0 12-12"/>';
 if(index===7||index===8)return `<svg class="circuit-diagram" viewBox="0 0 200 112" role="img" aria-label="${index===7?'Two series resistors and a lamp':'Parallel resistor pair in series with a lamp'}">${battery}${detail}</svg>`;
 if(index<3){detail=`<path d="M100 20h60v23m0 26v23h-60"/>${bulb(160,56,index===2)}`;if(index===1)detail+='<path class="paper-cut" d="M61 20h27"/><path d="m60 20 28-13"/><circle cx="60" cy="20" r="2"/><circle cx="90" cy="20" r="2"/>';if(index===2)detail+='<path class="paper-cut" d="M60 20h34"/><path d="m60 20 5-7 6 14 6-14 6 14 6-14 5 7"/>';}
 else if(index===3)detail=`<path d="M100 20h60v7m0 26v6m0 26v7h-60"/>${bulb(160,40,true)}${bulb(160,72,true)}`;
 else detail=`<path d="M100 20h65m-60 0v23m0 26v23m60-72v23m0 26v23H100"/>${bulb(105,56)}${bulb(165,56,index===5)}${index===5?'<path class="paper-cut" d="M130 20h25"/><path d="m130 20 25-12"/>':''}`;
 if(index===6)return `<svg class="circuit-diagram" viewBox="0 0 200 112" role="img" aria-label="Free build"><path d="M30 76h140M50 76V48h35v28m20 0V30h35v46M60 48V32h15v16m39-18V18h17v12"/><circle cx="166" cy="27" r="13"/><path d="M166 9V2m0 43v-5m18-13h7m-43 0h-7"/></svg>`;
 return `<svg class="circuit-diagram" viewBox="0 0 200 112" role="img" aria-label="${['Lamp on','Switch and lamp','Resistor and lamp','Two series lamps','Two parallel lamps','Switch one branch'][index]}">${battery}${detail}</svg>`;
}
