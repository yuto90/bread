import type { Placement, Resolved } from '../model.ts';
import { branchesOf, fail } from '../model.ts';
import { resistor } from '../../parts/resistor/index.ts';
import { led } from '../../parts/led-5mm-red/index.ts';

export function place(circuit: Resolved): Placement {
  const branches = branchesOf(circuit);
  if (branches.length > 6) fail('E_PLACEMENT_CAPACITY', `${branches.length} branches exceed the 6-branch capacity of the supported footprint on the fixed 30-row, two-bank breadboard`);
  if (branches.length >= 3) {
    const leads: Record<string,string> = {}, jumpers: Placement['jumpers'] = [];
    branches.forEach((branch,i) => {
      const right = i >= 3, first = 2+(i%3)*9, middle = first+resistor.rowSpan, last = middle+led.rowSpan;
      leads[branch.resistorInput] = `${right?'F':'E'}${first}`; leads[branch.resistorOutput] = `${right?'F':'E'}${middle}`;
      leads[branch.ledInput] = `${right?'H':'C'}${middle}`; leads[branch.ledGround] = `${right?'H':'C'}${last}`;
      jumpers.push({pin:branch.signal,hole:`${right?'J':'A'}${first}`});
    });
    jumpers.push({pin:`${circuit.uno}.GND1`,hole:'A25'});
    const links = [{fromHole:'D7',toHole:'D16'},{fromHole:'E16',toHole:'D25'}];
    if (branches.length > 3) links.push({fromHole:'E25',toHole:'I7'});
    for(let i=4;i<branches.length;i++) links.push({fromHole:`J${7+(i-4)*9}`,toHole:`I${7+(i-3)*9}`});
    return {leads,jumpers,links};
  }
  // Deterministic topology-driven pattern, with realistic lead spans:
  // resistor 4 × 2.54mm, LED 1 × 2.54mm. IDs and polarity do not affect nets.
  const first = 10, middle = first + resistor.rowSpan, last = middle + led.rowSpan;
  return {
    leads: {
      [circuit.resistorInput]: `E${first}`, [circuit.resistorOutput]: `E${middle}`,
      [circuit.ledInput]: `C${middle}`, [circuit.ledGround]: `C${last}`
    },
    jumpers: [{ pin: circuit.signal, hole: `A${first}` }, { pin: `${circuit.uno}.GND1`, hole: `A${last}` }]
  };
}
