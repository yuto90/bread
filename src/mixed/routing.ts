import type {Placement,Point} from '../model.ts';
import {holePoint} from '../breadboard/index.ts';
import {unoPins} from '../../parts/arduino-uno-r3/index.ts';
import {fail} from '../model.ts';
export const boardPoint=(hole:string):Point=>{const p=holePoint(hole);return {x:790+(p.x-778)*1.5,y:270+(p.y-244)*1.5};};
export const unoPoint=(pin:string):Point=>({...unoPins[pin],y:unoPins[pin].y+80});
export type MixedWire={from:string;to:string;color:string;points:Point[]};
const on=(p:Point,a:Point,b:Point)=>p.x>=Math.min(a.x,b.x)&&p.x<=Math.max(a.x,b.x)&&p.y>=Math.min(a.y,b.y)&&p.y<=Math.max(a.y,b.y);
export function routeMixed(p:Placement):MixedWire[]{
 const specs=[...p.jumpers.map(j=>({from:j.pin,to:j.hole,a:unoPoint(j.pin.split('.')[1]),b:boardPoint(j.hole),uno:true})),...(p.links??[]).map(l=>({from:l.fromHole,to:l.toHole,a:boardPoint(l.fromHole),b:boardPoint(l.toHole),uno:false}))];
 const result:MixedWire[]=[];
 for(const [i,s] of specs.entries()){
  const choices: {points:Point[];score:number}[]=[];
  for(const offset of [-8,8,-12,12])for(const endOffset of [-8,8,-12,12])for(let k=0;k<36;k++){
   const lane=s.uno?570+(k%18)*9:(k<18?700-k*9:1160+(k-18)*9);
   const startY=s.uno?(s.a.y>500?740+i*20:150+i*17):s.a.y+offset;
   const endY=s.b.y+endOffset;
   const points=[s.a,{x:s.a.x,y:startY},{x:lane,y:startY},{x:lane,y:endY},{x:s.b.x,y:endY},s.b];
   let score=0,valid=true;
   for(let a=1;a<points.length;a++){
    const u=points[a-1],v=points[a];score+=Math.abs(u.x-v.x)+Math.abs(u.y-v.y);
    if(specs.some(other=>other!==s&&[other.a,other.b].some(pt=>on(pt,u,v))))valid=false;
    for(const wire of result)for(let b=1;b<wire.points.length;b++){
     const x=wire.points[b-1],y=wire.points[b];
     const dx=Math.min(Math.max(u.x,v.x),Math.max(x.x,y.x))-Math.max(Math.min(u.x,v.x),Math.min(x.x,y.x));
     const dy=Math.min(Math.max(u.y,v.y),Math.max(x.y,y.y))-Math.max(Math.min(u.y,v.y),Math.min(x.y,y.y));
     if(dx>=0&&dy>=0){if(dx>0||dy>0)valid=false;else score+=80;}
    }
   }
   if(valid)choices.push({points,score});
  }
  choices.sort((a,b)=>a.score-b.score);if(!choices.length)fail('E_ROUTING_FAILED',`No unambiguous wire corridor for ${s.from}`);
  const pin=s.from.split('.')[1],color=s.uno?(pin==='5V'?'#d15147':pin==='GND1'?'#34424a':['#536bc3','#a4609c','#358878','#c08b23'][i%4]):'#627b75';
  result.push({from:s.from,to:s.to,color,points:choices[0].points});
 }
 return result;
}
