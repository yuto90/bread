import type {Resolved,Placement,Netlist} from '../model.ts';
import {fail} from '../model.ts';
import {UnionFind,terminals} from '../netlist/index.ts';
import {holes,holeGroup} from '../breadboard/index.ts';
import {unoPins} from '../../parts/arduino-uno-r3/index.ts';
import {mixedPins} from './parts.ts';
import {footprintMatches,envelope,overlaps} from './geometry.ts';
export function physicalMixed(c:Resolved,p:Placement):Netlist{
 const parts=c.parts.filter(x=>x.id!==c.uno),required=parts.flatMap(x=>mixedPins[x.type].map(pin=>`${x.id}.${pin}`)).sort();
 if(JSON.stringify(Object.keys(p.leads).sort())!==JSON.stringify(required))fail('E_PLACEMENT_FAILED','Missing or extra physical pins, including NC');
 const uf=new UnionFind(),occupied=new Set<string>(),board=new Set<string>();
 const occupy=(h:string)=>{holeGroup(h);if(occupied.has(h))fail('E_PLACEMENT_FAILED',`Occupied hole ${h}`);occupied.add(h)};
 for(const h of holes)uf.union(`hole:${h}`,`strip:${holeGroup(h)}`);
 for(const [pin,h] of Object.entries(p.leads)){occupy(h);uf.union(`pin:${pin}`,`hole:${h}`);}
 for(const j of p.jumpers){const [id,pin]=j.pin.split('.');if(id!==c.uno||!Object.hasOwn(unoPins,pin)||board.has(j.pin))fail('E_PLACEMENT_FAILED','Unknown or duplicate board socket');board.add(j.pin);occupy(j.hole);uf.union(`pin:${j.pin}`,`hole:${j.hole}`);}
 for(const l of p.links??[]){occupy(l.fromHole);occupy(l.toHole);uf.union(`hole:${l.fromHole}`,`hole:${l.toHole}`);}
 for(const part of parts){
  if(!footprintMatches(part,p))fail('E_PLACEMENT_FAILED',`Wrong footprint or pin order: ${part.id}`);
  // Component conductor facts, independently applied to actual inserted pins.
  // No expected net labels or input connection edges enter this reconstruction.
  if(part.type==='pushbutton-b3f1000-formed'){
   uf.union(`pin:${part.id}.A1`,`pin:${part.id}.A2`);uf.union(`pin:${part.id}.B1`,`pin:${part.id}.B2`);
  }
 }
 const boxes=parts.map(part=>envelope(part,p));
 for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++)if(overlaps(boxes[i],boxes[j]))fail('E_PLACEMENT_FAILED','Component envelopes overlap');
 const sensors=parts.filter(part=>part.type==='dht22-bare');
 for(const sensor of sensors){
  const ncHole=p.leads[`${sensor.id}.3`];
  if(p.jumpers.some(j=>holeGroup(j.hole)===holeGroup(ncHole))||(p.links??[]).some(l=>[l.fromHole,l.toHole].some(h=>holeGroup(h)===holeGroup(ncHole))))fail('E_NC_CONNECTED','NC strip has a jumper');
 }
 const all=[...terminals(c),...Object.keys(p.leads),...p.jumpers.map(j=>j.pin)];
 const actual=uf.groups(all.map(t=>`pin:${t}`));
 for(const sensor of sensors)if(actual.find(n=>n.includes(`pin:${sensor.id}.3`))!.length!==1)fail('E_NC_CONNECTED','NC is not isolated');
 return actual.map(n=>n.map(t=>t.slice(4)));
}
