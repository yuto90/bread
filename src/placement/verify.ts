import { fail } from '../model.ts';
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
  const required = [`${circuit.resistor}.1`, `${circuit.resistor}.2`, `${circuit.led}.A`, `${circuit.led}.K`].sort();
  if (JSON.stringify(Object.keys(physical.leads).sort()) !== JSON.stringify(required))
    fail('E_PLACEMENT_FAILED', 'Missing or unexpected component leads');
  for (const [pin, hole] of Object.entries(physical.leads)) {
    occupy(hole); uf.union(`pin:${pin}`, `hole:${hole}`);
  }
  if (physical.jumpers.length !== 2) fail('E_PLACEMENT_FAILED', 'Expected two jumpers');
  const boardPins = new Set<string>();
  for (const j of physical.jumpers) {
    const [id, pin] = j.pin.split('.');
    if (id !== circuit.uno || !Object.hasOwn(unoPins, pin) || boardPins.has(j.pin))
      fail('E_PLACEMENT_FAILED', `Invalid or occupied Uno socket ${j.pin}`);
    boardPins.add(j.pin); occupy(j.hole);
    uf.union(`pin:${j.pin}`, `hole:${j.hole}`);
  }
  for (const [id, p1, p2, span] of [[circuit.resistor, '1', '2', 4], [circuit.led, 'A', 'K', 1]] as const) {
    const a = physical.leads[`${id}.${p1}`], b = physical.leads[`${id}.${p2}`];
    if (uf.find(`hole:${a}`) === uf.find(`hole:${b}`)) fail('E_PLACEMENT_FAILED', `${id} is shorted by breadboard conductors`);
    const x = holePoint(a), y = holePoint(b);
    if (x.x !== y.x || Math.abs(x.y - y.y) !== span * 16)
      fail('E_PLACEMENT_FAILED', `${id} lead spacing does not fit the supported footprint`);
  }
  // Conservative envelopes include the raised LED body and bent bare leads.
  // Prevent a hole-valid placement from making component bodies/leads overlap.
  const resistorPoints = ['1','2'].map(pin => holePoint(physical.leads[`${circuit.resistor}.${pin}`]));
  const ledPoints = ['A','K'].map(pin => holePoint(physical.leads[`${circuit.led}.${pin}`]));
  const rBox = {left:resistorPoints[0].x-9,right:resistorPoints[0].x+9,top:Math.min(...resistorPoints.map(p=>p.y))-4,bottom:Math.max(...resistorPoints.map(p=>p.y))+4};
  const lBox = {left:ledPoints[0].x-18,right:ledPoints[0].x+18,top:Math.min(...ledPoints.map(p=>p.y))-4,bottom:Math.max(...ledPoints.map(p=>p.y))+70};
  if (lBox.bottom > 747 || rBox.bottom > 747)
    fail('E_PLACEMENT_FAILED', 'Component footprint extends beyond breadboard');
  if (rBox.left<lBox.right && lBox.left<rBox.right && rBox.top<lBox.bottom && lBox.top<rBox.bottom)
    fail('E_PLACEMENT_FAILED', 'Component body/lead envelopes overlap');
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
