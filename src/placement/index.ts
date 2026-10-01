import type { Placement, Resolved } from '../model.ts';
import { branchesOf } from '../model.ts';
import { resistor } from '../../parts/resistor/index.ts';
import { led } from '../../parts/led-5mm-red/index.ts';

export function place(circuit: Resolved): Placement {
  const branches = branchesOf(circuit);
  if (branches.length === 3) {
    const leads: Record<string,string> = {}, jumpers: Placement['jumpers'] = [];
    branches.forEach((branch,i) => {
      const first = 2+i*9, middle = first+resistor.rowSpan, last = middle+led.rowSpan;
      leads[branch.resistorInput] = `E${first}`; leads[branch.resistorOutput] = `E${middle}`;
      leads[branch.ledInput] = `C${middle}`; leads[branch.ledGround] = `C${last}`;
      jumpers.push({pin:branch.signal,hole:`A${first}`});
    });
    jumpers.push({pin:`${circuit.uno}.GND1`,hole:'A25'});
    return {leads,jumpers,links:[{fromHole:'D7',toHole:'D16'},{fromHole:'E16',toHole:'D25'}]};
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
