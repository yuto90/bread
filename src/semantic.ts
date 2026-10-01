import { fail } from './model.ts';
import type { Circuit, Resolved } from './model.ts';
import { canonicalPin, unoPins } from '../parts/arduino-uno-r3/index.ts';
import { logicalNetlist } from './netlist/index.ts';

export function resolve(ast: Circuit): Resolved {
  const parts = new Map<string, string>();
  const pins: Record<string, string[]> = {
    'arduino-uno-r3': Object.keys(unoPins), resistor: ['1', '2'], 'led-5mm-red': ['A', 'K']
  };
  for (const p of ast.parts) {
    if (parts.has(p.id)) fail('E_DUPLICATE_COMPONENT_ID', `Duplicate component ${p.id}`, p.line);
    if (!Object.hasOwn(pins, p.type)) fail('E_UNKNOWN_COMPONENT', `Unknown component ${p.type}`, p.line);
    if (p.type === 'resistor' ? p.value !== '220ohm' : p.value !== undefined)
      fail('E_ATTRIBUTE', 'This PoC requires resistor [value=220ohm]; other parts have no attributes', p.line);
    parts.set(p.id, p.type);
  }
  const endpoint = (ref: string, line: number): string => {
    const [id, rawPin] = ref.split('.');
    const type = parts.get(id);
    if (!type) fail('E_UNKNOWN_COMPONENT', `Unknown component ${id}`, line);
    const pin = type === 'arduino-uno-r3' ? canonicalPin(rawPin) : rawPin;
    if (!pins[type].includes(pin)) fail('E_UNKNOWN_PIN', `${type} has no pin ${rawPin}`, line);
    return `${id}.${pin}`;
  };
  const circuit: Circuit = { ...ast, connections: ast.connections.map(c => ({
    ...c, from: endpoint(c.from, c.line), to: endpoint(c.to, c.line)
  })) };
  for (const type of Object.keys(pins)) {
    if (ast.parts.filter(p => p.type === type).length !== 1)
      fail('E_UNSUPPORTED_CIRCUIT', 'Requires exactly one Uno R3, one 220ohm resistor, and one red LED');
  }
  const id = (type: string) => ast.parts.find(p => p.type === type)!.id;
  const uno = id('arduino-uno-r3'), resistor = id('resistor'), led = id('led-5mm-red');
  const expected = logicalNetlist(circuit);
  if (expected.some(n => [resistor, led].some(p => n.filter(t => t.startsWith(`${p}.`)).length > 1)))
    fail('E_COMPONENT_SHORT', 'A resistor or LED has both terminals on the same net');
  // The PoC deliberately accepts only a series chain. Reject unsupported
  // topologies before applying a pattern-specific physical placement rule.
  if (circuit.connections.length !== 3 || expected.length !== 3 || expected.some(n => n.length !== 2))
    fail('E_UNSUPPORTED_CIRCUIT', 'Expected three distinct two-terminal nets in a series LED circuit');
  const signalNet = expected.find(n => n.some(t => t === `${uno}.D13` || t === `${uno}.D12`));
  const groundNet = expected.find(n => n.includes(`${uno}.GND1`));
  const signal = signalNet?.find(t => t.startsWith(`${uno}.`));
  const resistorInput = signalNet?.find(t => t.startsWith(`${resistor}.`));
  const ledGround = groundNet?.find(t => t.startsWith(`${led}.`));
  if (!signal || !resistorInput || !ledGround)
    fail('E_UNSUPPORTED_CIRCUIT', 'Expected Uno D12/D13 → resistor → LED → Uno GND/GND1');
  const resistorOutput = `${resistor}.${resistorInput.endsWith('.1') ? '2' : '1'}`;
  const ledInput = `${led}.${ledGround.endsWith('.K') ? 'A' : 'K'}`;
  if (!expected.some(n => n.includes(resistorOutput) && n.includes(ledInput)))
    fail('E_UNSUPPORTED_CIRCUIT', 'Resistor and LED must form a series chain');
  return { ...circuit, uno, resistor, led, signal, resistorInput, resistorOutput, ledInput, ledGround,
    warnings: ledInput.endsWith('.K') ? ['W_LED_POLARITY: LED reversed as explicitly requested; input preserved.'] : [] };
}
