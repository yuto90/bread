import type { Placement, Resolved } from '../model.ts';
import { resistor } from '../../parts/resistor/index.ts';
import { led } from '../../parts/led-5mm-red/index.ts';

export function place(circuit: Resolved): Placement {
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
