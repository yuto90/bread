import type { Circuit, Resolved } from '../model.ts';
import { fail } from '../model.ts';
import { mixedPins } from './parts.ts';
import { canonicalPin, unoPins } from '../../parts/arduino-uno-r3/index.ts';
import { logicalNetlist } from '../netlist/index.ts';

// A bounded series LED/diode family, optionally with one non-polar 100nF bypass.
// Neither semiconductor nor capacitor internals are ideal conductor unions.
export function resolveDiscrete(ast: Circuit): Resolved {
  const seen = new Set<string>();
  const types = ['arduino-uno-r3', 'resistor', 'led-5mm-red', 'diode-1n4148', 'capacitor-c315c104'];
  for (const p of ast.parts) {
    if (seen.has(p.id)) fail('E_DUPLICATE_COMPONENT_ID', p.id, p.line);
    seen.add(p.id);
    if (p.type !== 'arduino-uno-r3' && !mixedPins[p.type]) fail('E_UNKNOWN_COMPONENT', p.type, p.line);
    if (!types.includes(p.type)) fail('E_UNSUPPORTED_CIRCUIT', 'Discrete and temperature-alarm families cannot be combined', p.line);
    const valid = p.type === 'resistor' ? p.value === '220ohm'
      : p.type === 'capacitor-c315c104' ? p.value === '100nF' : p.value === undefined;
    if (!valid) fail('E_ATTRIBUTE', `Unsupported value for ${p.type}`, p.line);
  }
  const one = (type: string) => {
    const matches = ast.parts.filter(p => p.type === type);
    if (matches.length !== 1) fail('E_UNSUPPORTED_CIRCUIT', `Discrete family requires one ${type}`);
    return matches[0].id;
  };
  const uno = one('arduino-uno-r3'), resistor = one('resistor'), led = one('led-5mm-red'), diode = one('diode-1n4148');
  const caps = ast.parts.filter(p => p.type === 'capacitor-c315c104');
  if (caps.length > 1) fail('E_UNSUPPORTED_CIRCUIT', 'Discrete family supports at most one 100nF bypass capacitor');
  const endpoint = (ref: string, line: number) => {
    const [id, raw] = ref.split('.'), part = ast.parts.find(p => p.id === id);
    if (!part) fail('E_UNKNOWN_COMPONENT', id, line);
    const pin = part.type === 'arduino-uno-r3' ? canonicalPin(raw) : raw;
    if (!(part.type === 'arduino-uno-r3' ? Object.keys(unoPins) : mixedPins[part.type]).includes(pin))
      fail('E_UNKNOWN_PIN', `${part.type} has no pin ${raw}`, line);
    return `${id}.${pin}`;
  };
  const c = { ...ast, connections: ast.connections.map(x => ({ ...x, from: endpoint(x.from,x.line), to: endpoint(x.to,x.line) })) };
  const nets = logicalNetlist(c), net = (pin: string) => nets.find(n => n.includes(pin));
  const same = (a: string, b: string) => !!net(a) && net(a) === net(b);
  const ground = `${uno}.GND1`, power = `${uno}.5V`;
  if (same(power, ground)) fail('E_POWER_NET', '5V and GND1 must remain distinct');
  for (const p of c.parts.filter(p => p.id !== uno)) {
    const pins = mixedPins[p.type];
    if (same(`${p.id}.${pins[0]}`, `${p.id}.${pins[1]}`)) fail('E_COMPONENT_SHORT', `${p.id} terminals share one net`);
  }
  const signal = [`${uno}.D12`, `${uno}.D13`].find(pin => ['1','2'].some(end => same(pin,`${resistor}.${end}`)));
  if (!signal) fail('E_UNSUPPORTED_CIRCUIT', 'One D12/D13 socket must connect through the 220ohm series resistor');
  const resistorInput = `${resistor}.${same(signal,`${resistor}.1`) ? '1' : '2'}`;
  const resistorOutput = `${resistor}.${resistorInput.endsWith('.1') ? '2' : '1'}`;
  if (same(resistorOutput,`${diode}.K`) && same(`${diode}.A`,`${led}.A`))
    fail('E_DIODE_POLARITY', '1N4148 A must face the resistor; black-band K must face LED A');
  if (same(`${diode}.K`,`${led}.K`) && same(`${led}.A`,ground))
    fail('E_LED_POLARITY', 'LED A must face 1N4148 K; LED K must face GND1');
  if (!same(resistorOutput,`${diode}.A`) || !same(`${diode}.K`,`${led}.A`) || !same(`${led}.K`,ground))
    fail('E_UNSUPPORTED_CIRCUIT', 'Expected D12/D13 → 220ohm → 1N4148 A/K → LED A/K → GND1');
  for (const cap of caps) {
    if (!((same(`${cap.id}.1`,power) && same(`${cap.id}.2`,ground)) || (same(`${cap.id}.2`,power) && same(`${cap.id}.1`,ground))))
      fail('E_CAPACITOR_NET', `${cap.id} is a non-polar 100nF bypass between 5V and GND1`);
  }
  const expected = [[signal,resistorInput],[resistorOutput,`${diode}.A`],[`${diode}.K`,`${led}.A`],
    [ground,`${led}.K`,...caps.map(p=>`${p.id}.${same(`${p.id}.1`,ground)?'1':'2'}`)],
    ...(caps.length ? [[power,...caps.map(p=>`${p.id}.${same(`${p.id}.1`,power)?'1':'2'}`)]] : [])]
    .map(n=>n.sort()).sort((a,b)=>a.join('|')<b.join('|')?-1:1);
  if (JSON.stringify(nets) !== JSON.stringify(expected)) fail('E_UNSUPPORTED_CIRCUIT', 'Unexpected socket, short or connection in discrete family');
  return {...c,uno,resistor,led,signal,resistorInput,resistorOutput,ledInput:`${led}.A`,ledGround:`${led}.K`,mixed:true,discrete:true,
    warnings:['W_DIODE_FOOTPRINT: 1N4148 axial leads modeled formed to 10.16mm; physical assembly untested.']};
}
