import { fail } from './model.ts';
import type { Branch, Circuit, Resolved } from './model.ts';
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
  if (ast.parts.length !== 3) return resolveThree(circuit);
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

// Explicit bounded extension requested after the original one-LED PoC review.
// No general graph-layout promise: exactly three series branches, one ground.
function resolveThree(c: Circuit): Resolved {
  const ids = (type: string) => c.parts.filter(p => p.type === type).map(p => p.id);
  const boards = ids('arduino-uno-r3'), resistors = ids('resistor'), leds = ids('led-5mm-red');
  if (boards.length !== 1 || resistors.length !== 3 || leds.length !== 3)
    fail('E_UNSUPPORTED_CIRCUIT', 'Supported families: one LED, or exactly three resistor/LED branches on one Uno');
  const uno = boards[0], nets = logicalNetlist(c);
  if (nets.some(n => [...resistors,...leds].some(id => n.filter(t => t.startsWith(`${id}.`)).length > 1)))
    fail('E_COMPONENT_SHORT', 'A resistor or LED has both terminals on one net');
  const ground = nets.find(n => n.includes(`${uno}.GND1`));
  if (c.connections.length !== 9 || nets.length !== 7 || !ground || ground.length !== 4 || nets.filter(n=>n.length===2).length !== 6)
    fail('E_UNSUPPORTED_CIRCUIT', 'Three branches require six two-terminal nets and one four-terminal shared ground');
  const branches: Branch[] = [];
  for (const pin of ['D13','D12','D11']) {
    const signal = `${uno}.${pin}`, signalNet = nets.find(n=>n.includes(signal));
    const resistorInput = signalNet?.find(t=>resistors.includes(t.split('.')[0]));
    if (!resistorInput || signalNet!.length !== 2) fail('E_UNSUPPORTED_CIRCUIT', `Expected ${signal} connected to its own resistor`);
    const resistor = resistorInput.split('.')[0];
    const resistorOutput = `${resistor}.${resistorInput.endsWith('.1')?'2':'1'}`;
    const middle = nets.find(n=>n.includes(resistorOutput));
    const ledInput = middle?.find(t=>leds.includes(t.split('.')[0]));
    if (!ledInput || middle!.length !== 2) fail('E_UNSUPPORTED_CIRCUIT', 'Each resistor must connect to its own LED');
    const led = ledInput.split('.')[0], ledGround = `${led}.${ledInput.endsWith('.A')?'K':'A'}`;
    if (!ground.includes(ledGround)) fail('E_UNSUPPORTED_CIRCUIT', 'All three LED return terminals must share GND/GND1');
    branches.push({signal,resistor,resistorInput,resistorOutput,led,ledInput,ledGround});
  }
  if (new Set(branches.map(b=>b.resistor)).size !== 3 || new Set(branches.map(b=>b.led)).size !== 3)
    fail('E_UNSUPPORTED_CIRCUIT', 'Branches must use distinct resistors and LEDs');
  return {...c,uno,...branches[0],branches,warnings:branches.filter(b=>b.ledInput.endsWith('.K')).map(b=>`W_LED_POLARITY: ${b.led} reversed as explicitly requested; input preserved.`)};
}
