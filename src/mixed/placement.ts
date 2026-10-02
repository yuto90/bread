import {fail} from '../model.ts';
import type {Resolved,Placement} from '../model.ts';
import {logicalNetlist,UnionFind} from '../netlist/index.ts';
import {holes,holeGroup,holePoint} from '../breadboard/index.ts';
import {fixedPairs} from './parts.ts';
import {candidates,envelope,overlaps} from './geometry.ts';
export function placeMixed(c:Resolved):Placement{
 const nets=logicalNetlist(c),netOf=new Map(nets.flatMap((n,i)=>n.map(t=>[t,i] as const)));
 const parts=c.parts.filter(p=>p.id!==c.uno).sort((a,b)=>{
  const area=(p:typeof a)=>{const box=envelope(p,{leads:candidates(p)[0],jumpers:[]});return (box.right-box.left)*(box.bottom-box.top)};
  return area(b)-area(a)||a.type.localeCompare(b.type)||a.id.localeCompare(b.id);
 });
 const placed:typeof parts=[],p:Placement={leads:{},jumpers:[],links:[]};const stripNets=new Map<string,number>();
 // Deterministic first-fit over part footprints and the real board. No example
 // IDs, insertion holes or routes appear in the DSL or topology resolver.
 for(const part of parts){
  const candidate=candidates(part).find(leads=>{
   const box=envelope(part,{...p,leads});
   if(placed.some(other=>overlaps(box,envelope(other,p))))return false;
   const groups=new Map(stripNets);
   for(const [pin,hole] of Object.entries(leads)){
    if(Object.values(p.leads).includes(hole))return false;
    const group=holeGroup(hole),net=netOf.get(pin)!;
    if(groups.has(group)&&groups.get(group)!==net)return false;groups.set(group,net);
   }return true;
  });
  if(!candidate)fail('E_PLACEMENT_CAPACITY',`No free footprint for ${part.id} on the fixed 300-hole board`);
  Object.assign(p.leads,candidate);placed.push(part);for(const [pin,hole] of Object.entries(candidate))stripNets.set(holeGroup(hole),netOf.get(pin)!);
 }
 const occupied=new Set(Object.values(p.leads)),uf=new UnionFind();
 for(const h of holes)uf.union(h,holeGroup(h));
 for(const part of parts)for(const [a,b] of fixedPairs(part))uf.union(p.leads[`${part.id}.${a}`],p.leads[`${part.id}.${b}`]);
 const free=(groups:string[])=>holes.filter(h=>groups.includes(holeGroup(h))&&!occupied.has(h));
 for(const net of nets){
  const leadHoles=net.filter(t=>p.leads[t]).map(t=>p.leads[t]);
  const groups=[...new Set(leadHoles.map(holeGroup))].sort();
  // Connect distinct physical conductor clusters using shortest available
  // endpoint pairs; fixed button bridges already belong to one cluster.
  while(new Set(leadHoles.map(h=>uf.find(h))).size>1){
   const hs=free(groups),pairs=hs.flatMap((a,i)=>hs.slice(i+1).filter(b=>uf.find(a)!==uf.find(b)).map(b=>({a,b,d:Math.abs(holePoint(a).x-holePoint(b).x)+Math.abs(holePoint(a).y-holePoint(b).y)}))).sort((a,b)=>a.d-b.d||a.a.localeCompare(b.a)||a.b.localeCompare(b.b));
   if(!pairs.length)fail('E_PLACEMENT_CAPACITY','No free holes to distribute a net');
   const {a,b}=pairs[0];p.links!.push({fromHole:a,toHole:b});occupied.add(a);occupied.add(b);uf.union(a,b);
  }
  const board=net.filter(t=>t.startsWith(`${c.uno}.`));
  if(board.length>1)fail('E_UNSUPPORTED_CIRCUIT','Mixed net needs at most one Uno socket');
  if(board.length){const hole=free(groups)[0];if(!hole)fail('E_PLACEMENT_CAPACITY','No free hole for Uno jumper');occupied.add(hole);p.jumpers.push({pin:board[0],hole});}
 }
 return p;
}
