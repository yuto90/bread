import type {Part,Placement} from '../model.ts';
import {holePoint} from '../breadboard/index.ts';
export type Box={left:number;right:number;top:number;bottom:number};
export const overlaps=(a:Box,b:Box)=>a.left<b.right&&b.left<a.right&&a.top<b.bottom&&b.top<a.bottom;
export function candidates(p:Part):Record<string,string>[] {
 const result:Record<string,string>[]=[];
 for(let row=2;row<=29;row++)for(const bank of [0,1]){
  const col=p.type==='resistor'||p.type==='dht22-bare'?(bank?'J':'E'):(bank?'H':'C');
  let pins:Record<string,string>;
  if(p.type==='pushbutton-b3f1000-formed') {if(bank)continue;pins={A1:`E${row}`,A2:`F${row}`,B1:`E${row+2}`,B2:`F${row+2}`};}
  else if(p.type==='dht22-bare')pins={'1':`${col}${row}`,'2':`${col}${row+1}`,'3':`${col}${row+2}`,'4':`${col}${row+3}`};
  else if(p.type==='potentiometer-3296w')pins={'1':`${col}${row}`,'2':`${col}${row+1}`,'3':`${col}${row+2}`};
  else if(p.type==='resistor')pins={'1':`${col}${row}`,'2':`${col}${row+4}`};
  else pins={A:`${col}${row}`,K:`${col}${row+1}`};
  if(Object.values(pins).some(h=>Number(h.slice(1))>30))continue;
  const leads=Object.fromEntries(Object.entries(pins).map(([pin,hole])=>[`${p.id}.${pin}`,hole]));
  const box=envelope(p,{leads,jumpers:[]});
  if(box.left>=744&&box.right<=990&&box.top>=213&&box.bottom<=747)result.push(leads);
 }
 return result;
}
export function envelope(p:Part,physical:Placement):Box{
 const points=Object.entries(physical.leads).filter(([pin])=>pin.startsWith(`${p.id}.`)).map(([,h])=>holePoint(h));
 const x=Math.min(...points.map(p=>p.x)),y=Math.min(...points.map(p=>p.y)),end=Math.max(...points.map(p=>p.y));
 if(p.type==='pushbutton-b3f1000-formed')return {left:x-4,right:x+52,top:y-6,bottom:end+6};
 // Conservative 27 x 13.5 mm case reservation from Adafruit's published
 // package dimensions; do not silently assume the smaller common case.
 if(p.type==='dht22-bare')return {left:x-86,right:x+4,top:y+24-86,bottom:y+24+86};
 if(p.type==='potentiometer-3296w')return {left:x-17,right:x+17,top:y-15,bottom:end+15};
 if(p.type==='resistor')return {left:x-9,right:x+9,top:y-4,bottom:end+4};
 return {left:x-18,right:x+18,top:y-4,bottom:end+70};
}
export function footprintMatches(p:Part,physical:Placement):boolean {
 const actual=Object.fromEntries(Object.entries(physical.leads).filter(([pin])=>pin.startsWith(`${p.id}.`)));
 return candidates(p).some(c=>Object.keys(c).length===Object.keys(actual).length&&Object.entries(c).every(([k,v])=>actual[k]===v));
}
