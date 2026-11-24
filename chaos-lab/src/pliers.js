import {Raycaster,Vector2,Vector3} from 'three';

// Use a screen-space radius so a thin lead stays easy to pick at every zoom.
export function wireUnderPointer(event,canvas,camera,leads,components){
 const rect=canvas.getBoundingClientRect();
 const x=event.clientX-rect.left,y=event.clientY-rect.top;
 const radius=event.pointerType==='touch'?16:8;
 const previous=new Vector3(),next=new Vector3(),point=new Vector3();
 const ray=new Raycaster(),ndc=new Vector2();
 let best=null,nearest=radius*radius,nearestDepth=Infinity;
 function project(world,out){
  out.copy(world).project(camera);
  out.x=(out.x+1)*rect.width/2;
  out.y=(1-out.y)*rect.height/2;
 }
 for(const lead of leads){
  const points=lead.userData.pickPoints;
  project(points[0],previous);
  for(let i=1;i<points.length;i++){
   project(points[i],next);
   const dx=next.x-previous.x,dy=next.y-previous.y;
   const t=Math.max(0,Math.min(1,((x-previous.x)*dx+(y-previous.y)*dy)/(dx*dx+dy*dy||1)));
   const distance=(previous.x+t*dx-x)**2+(previous.y+t*dy-y)**2;
   if(distance<=nearest&&previous.z>=-1&&next.z<=1){
    point.lerpVectors(points[i-1],points[i],t);
    const depth=camera.position.distanceTo(point);
    if(distance<nearest||depth<nearestDepth){
     const screen=point.clone().project(camera);
     ray.setFromCamera(ndc.set(screen.x,screen.y),camera);
     ray.far=depth-.06;
     const hidden=ray.intersectObjects(components,true).some(hit=>hit.object.material?.visible&&hit.object.material.opacity!==0);
     if(!hidden){best=lead;nearest=distance;nearestDepth=depth;}
    }
   }
   previous.copy(next);
  }
 }
 return best;
}

export function pliersCursor(closed){
 const jaws=closed?'M7 4 12 10 15 12M6 5 9 12 14 15':'M9 2 13 9 15 12M3 7 8 13 14 15';
 const drawing='<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36" fill="none" stroke-linecap="round" stroke-linejoin="round">'+
  '<g stroke="#382c23" stroke-width="5"><path d="'+jaws+'"/><path d="m14 13 10 6 8 5m-18-11 4 12 3 8"/></g>'+
  '<path d="'+jaws+'" stroke="#cfccbb" stroke-width="2.6"/><path d="m15 13 9 6 8 5m-18-10 4 11 3 8" stroke="#a75c3d" stroke-width="3.4"/>'+
  '<circle cx="14.5" cy="13.5" r="2.8" fill="#af976a" stroke="#473829"/></svg>';
 return 'url("data:image/svg+xml,'+encodeURIComponent(drawing)+'") 6 5, crosshair';
}
