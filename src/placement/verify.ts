import { branchesOf, fail } from '../model.ts';
import type { Netlist, Placement, Resolved } from '../model.ts';
import { holes, holeGroup, holePoint } from '../breadboard/index.ts';
import { UnionFind, terminals } from '../netlist/index.ts';
import { unoPins } from '../../parts/arduino-uno-r3/index.ts';

// Independent reconstruction: no expected net IDs or inferred connection edges
// enter this function. Only conductor groups, lead insertion, and jumper ends.
export function physicalNetlist(circuit: Resolved, physical: Placement): Netlist {
  const occupied = new Set<string>(), uf = new UnionFind();
  for (const hole of holes) uf.union(`hole:${hole}`, `strip:${holeGroup(hole)}`);
  const occupy = (hole: string) => {
    holeGroup(hole);
    if (occupied.has(hole)) fail('E_PLACEMENT_FAILED', `Two leads/jumpers occupy ${hole}`);
    occupied.add(hole);
  };
  const branches = branchesOf(circuit);
  if (branches.length > 6) fail('E_PLACEMENT_CAPACITY', 'Fixed-board footprint supports at most six branches');
  const required = branches.flatMap(b=>[`${b.resistor}.1`,`${b.resistor}.2`,`${b.led}.A`,`${b.led}.K`]).sort();
  if (JSON.stringify(Object.keys(physical.leads).sort()) !== JSON.stringify(required))
    fail('E_PLACEMENT_FAILED', 'Missing or unexpected component leads');
  for (const [pin, hole] of Object.entries(physical.leads)) {
    occupy(hole); uf.union(`pin:${pin}`, `hole:${hole}`);
  }
  if (physical.jumpers.length !== branches.length+1) fail('E_PLACEMENT_FAILED', 'Expected one signal jumper per branch and one shared ground jumper');
  const boardPins = new Set<string>();
  for (const j of physical.jumpers) {
    const [id, pin] = j.pin.split('.');
    if (id !== circuit.uno || !Object.hasOwn(unoPins, pin) || boardPins.has(j.pin))
      fail('E_PLACEMENT_FAILED', `Invalid or occupied Uno socket ${j.pin}`);
    boardPins.add(j.pin); occupy(j.hole);
    uf.union(`pin:${j.pin}`, `hole:${j.hole}`);
  }
  const links = physical.links ?? [];
  if (links.length !== branches.length-1) fail('E_PLACEMENT_FAILED', 'Missing or extra ground-distribution jumpers');
  for (const link of links) {
    occupy(link.fromHole); occupy(link.toHole);
    uf.union(`hole:${link.fromHole}`, `hole:${link.toHole}`);
  }
  for (const [id, p1, p2, span] of branches.flatMap(b=>[[b.resistor,'1','2',4],[b.led,'A','K',1]] as const)) {
    const a = physical.leads[`${id}.${p1}`], b = physical.leads[`${id}.${p2}`];
    if (uf.find(`hole:${a}`) === uf.find(`hole:${b}`)) fail('E_PLACEMENT_FAILED', `${id} is shorted by breadboard conductors`);
    const x = holePoint(a), y = holePoint(b);
    if (x.x !== y.x || Math.abs(x.y - y.y) !== span * 16)
      fail('E_PLACEMENT_FAILED', `${id} lead spacing does not fit the supported footprint`);
  }
  // Conservative envelopes include the raised LED body and bent bare leads.
  // Prevent a hole-valid placement from making component bodies/leads overlap.
  const boxes: {left:number;right:number;top:number;bottom:number}[] = [];
  for (const branch of branches) {
    const resistorPoints = ['1','2'].map(pin => holePoint(physical.leads[`${branch.resistor}.${pin}`]));
    const ledPoints = ['A','K'].map(pin => holePoint(physical.leads[`${branch.led}.${pin}`]));
    const rBox = {left:resistorPoints[0].x-9,right:resistorPoints[0].x+9,top:Math.min(...resistorPoints.map(p=>p.y))-4,bottom:Math.max(...resistorPoints.map(p=>p.y))+4};
    const lBox = {left:ledPoints[0].x-18,right:ledPoints[0].x+18,top:Math.min(...ledPoints.map(p=>p.y))-4,bottom:Math.max(...ledPoints.map(p=>p.y))+70};
    if ([lBox,rBox].some(box=>box.bottom>747 || box.top<213 || box.left<744 || box.right>990))
      fail('E_PLACEMENT_FAILED', 'Component footprint extends beyond breadboard');
    boxes.push(rBox,lBox);
  }
  for (let i=0;i<boxes.length;i++) for(let j=i+1;j<boxes.length;j++) {
    const a=boxes[i],b=boxes[j];
    if(a.left<b.right && b.left<a.right && a.top<b.bottom && b.top<a.bottom)
      fail('E_PLACEMENT_FAILED', 'Component body/lead envelopes overlap');
  }
  // Include unexpected physical board terminals too: otherwise a wrong socket
  // might disappear when projecting onto the expected terminal set.
  const all = [...terminals(circuit), ...Object.keys(physical.leads), ...physical.jumpers.map(j => j.pin)];
  return uf.groups(all.map(t => `pin:${t}`)).map(n => n.map(t => t.slice(4)));
}
export function verify(circuit: Resolved, expected: Netlist, physical: Placement): Netlist {
  const actual = physicalNetlist(circuit, physical);
  if (JSON.stringify(actual) !== JSON.stringify(expected))
    fail('E_NETLIST_MISMATCH', `Physical connectivity differs from input. Expected ${JSON.stringify(expected)}, actual ${JSON.stringify(actual)}`);
  return actual;
}
