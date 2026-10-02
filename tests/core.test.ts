import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { compile, render } from '../src/index.ts';
import { BreadError } from '../src/model.ts';
import type { Placement } from '../src/model.ts';
import { parse } from '../src/parser/index.ts';
import { logicalNetlist } from '../src/netlist/index.ts';
import { physicalNetlist, verify } from '../src/placement/verify.ts';
import { renderSvg } from '../src/renderer/index.ts';
import { holeGroup, holePoint, holes } from '../src/breadboard/index.ts';
import { unoPins, upperHeader } from '../parts/arduino-uno-r3/index.ts';
import { route } from '../src/routing/index.ts';
const source = readFileSync(new URL('../examples/blink.bread', import.meta.url),'utf8');
const error = (fn: ()=>unknown, code: string) => assert.throws(fn, (e: unknown) => e instanceof BreadError && e.code === code);

test('AC01–07: connection-only canonical circuit has exact independent physical nets', () => {
  const r = compile(source);
  assert.deepEqual(r.expected, [['led.A','r1.2'],['led.K','uno.GND1'],['r1.1','uno.D13']]);
  assert.deepEqual(r.actual,r.expected);
  assert.deepEqual(r.placement.leads, {'r1.1':'E10','r1.2':'E14','led.A':'C14','led.K':'C15'});
  assert.deepEqual(r.placement.jumpers,[{pin:'uno.D13',hole:'A10'},{pin:'uno.GND1',hole:'A15'}]);
  assert.equal(new Set([...Object.values(r.placement.leads),...r.placement.jumpers.map(j=>j.hole)]).size,6);
  assert.match(render(source),/<svg/);
});
test('Net builder never joins through component internals', () => {
  assert.equal(logicalNetlist(parse(source)).length,3);
});
test('D12 pin change moves wire by one physical socket without changing ground', () => {
  const a = compile(source), b = compile(source.replace('D13','D12'));
  const ra=route(a.placement), rb=route(b.placement);
  assert.deepEqual(ra[0].points[0],{x:272.692,y:247.78});
  assert.deepEqual(rb[0].points[0],{x:290.472,y:247.78});
  assert.deepEqual(ra[1],rb[1]);
  assert.deepEqual(a.placement.leads,b.placement.leads);
  assert.match(render(source.replace('D13','D12')),/data-wire-pin="uno.D12"/);
});
test('Official header order and stable GND alias', () => {
  assert.deepEqual(upperHeader.slice(0,6),['SCL','SDA','AREF','GND1','D13','D12']);
  assert.deepEqual(unoPins.GND1,{x:254.912,y:247.78});
  assert.equal(render(source),render(source.replace('uno.GND','uno.GND1')));
  error(()=>compile(source.replace('uno.GND','uno.GND2')),'E_UNSUPPORTED_CIRCUIT');
});
test('Explicitly reversed LED preserved, warned, and verified', () => {
  const reversed=source.replace('led.A','led.TEMP').replace('led.K','led.A').replace('led.TEMP','led.K');
  const r=compile(reversed);
  assert.equal(r.placement.leads['led.K'],'C14');
  assert.equal(r.placement.leads['led.A'],'C15');
  assert.deepEqual(r.actual,[['led.A','uno.GND1'],['led.K','r1.2'],['r1.1','uno.D13']]);
  assert.match(render(reversed),/W_LED_POLARITY/);
});
test('Resistor terminal reversal and changed IDs follow connectivity', () => {
  const swapped=source.replaceAll('r1.1','r1.X').replaceAll('r1.2','r1.1').replaceAll('r1.X','r1.2')
    .replaceAll('uno.','controller.').replace('part uno:','part controller:').replaceAll('r1','limit').replaceAll('led:','lamp:').replaceAll('led.','lamp.');
  const r=compile(swapped);
  assert.equal(r.placement.leads['limit.2'],'E10');
  assert.equal(r.placement.leads['lamp.A'],'C14');
  assert.deepEqual(r.actual,r.expected);
});
for (const [name, input, code] of [
  ['unknown component type',source.replace('led-5mm-red','unicorn'),'E_UNKNOWN_COMPONENT'],
  ['unknown referenced component',source.replace('led.A','missing.A'),'E_UNKNOWN_COMPONENT'],
  ['unknown pin',source.replace('D13','D99'),'E_UNKNOWN_PIN'],
  ['duplicate ID',source+'\npart led: led-5mm-red','E_DUPLICATE_COMPONENT_ID'],
  ['wrong resistor value',source.replace('220ohm','330ohm'),'E_ATTRIBUTE'],
  ['attribute on board',source.replace('part uno: arduino-uno-r3','part uno: arduino-uno-r3 [value=220ohm]'),'E_ATTRIBUTE'],
  ['missing version',source.replace('bread 0.1',''),'E_SYNTAX'],
  ['wrong version',source.replace('bread 0.1','bread 0.2'),'E_SYNTAX'],
  ['arrow syntax',source.replace('--','->'),'E_SYNTAX'],
  ['unknown attribute',source.replace('value=220ohm','x=220'),'E_ATTRIBUTE'],
  ['duplicate connection',source+'\nuno.D13 -- r1.1','E_UNSUPPORTED_CIRCUIT'],
  ['component short',source+'\nr1.1 -- r1.2','E_COMPONENT_SHORT'],
  ['unsupported but real pin',source.replace('D13','D11'),'E_UNSUPPORTED_CIRCUIT'],
  ['missing part',source.replace('part led: led-5mm-red',''),'E_UNKNOWN_COMPONENT'],
  ['disconnected circuit',source.replace('r1.2 -- led.A',''),'E_UNSUPPORTED_CIRCUIT'],
] as const) test(name,()=>error(()=>compile(input),code));
for (const forbidden of ['x = 100','y = 200','rotation = 90','@E12','wire bend 100,200','place led right-of resistor','layout LR'])
  test(`Reject manual layout: ${forbidden}`,()=>error(()=>compile(source+'\n'+forbidden),'E_SYNTAX'));
test('Comments, CRLF, BOM, strings and escaped XML are handled safely',()=>{
  assert.equal(render(source),render('\uFEFF// comment\r\n'+source.replaceAll('\n','\r\n')+'\r\n// tail'));
  const title=source.replace('"Arduino LED"','"A < B & \\\"quoted\\\" // text"');
  assert.equal(parse(title).title,'A < B & "quoted" // text');
  assert.match(render(title),/A &lt; B &amp; &quot;quoted&quot; \/\/ text/);
  assert.doesNotMatch(render(title),/<script|<image|<foreignObject|https?:\/\/(?!www.w3.org)/);
});
test('Every strip has five holes, all 60 strips isolated, gap not connected',()=>{
  const groups=new Map<string,number>();
  for(const hole of holes) groups.set(holeGroup(hole),(groups.get(holeGroup(hole))??0)+1);
  assert.equal(holes.length,300); assert.equal(groups.size,60);
  assert.ok([...groups.values()].every(n=>n===5));
  assert.equal(holeGroup('A14'),holeGroup('E14'));
  assert.notEqual(holeGroup('E14'),holeGroup('F14'));
  assert.notEqual(holeGroup('A14'),holeGroup('A15'));
  assert.equal(holePoint('F14').x-holePoint('E14').x,48);
});
for(const [name, mutate, code] of [
  ['occupied hole',(p:Placement)=>{p.jumpers[0].hole='E10'},'E_PLACEMENT_FAILED'],
  ['invalid hole',(p:Placement)=>{p.leads['r1.1']='E31'},'E_PLACEMENT_FAILED'],
  ['shorted resistor',(p:Placement)=>{p.leads['r1.2']='D10'},'E_PLACEMENT_FAILED'],
  ['shorted LED',(p:Placement)=>{p.leads['led.K']='D14'},'E_PLACEMENT_FAILED'],
  ['overlapping component bodies',(p:Placement)=>{p.leads['led.A']='D14';p.leads['led.K']='D15'},'E_PLACEMENT_FAILED'],
  ['missing lead',(p:Placement)=>{delete p.leads['led.K']},'E_PLACEMENT_FAILED'],
  ['wrong lead span',(p:Placement)=>{p.leads['led.K']='C19'},'E_PLACEMENT_FAILED'],
  ['unknown socket',(p:Placement)=>{p.jumpers[0].pin='uno.D99'},'E_PLACEMENT_FAILED'],
  ['wrong existing socket',(p:Placement)=>{p.jumpers[0].pin='uno.D12'},'E_NETLIST_MISMATCH'],
  ['wrong ground socket',(p:Placement)=>{p.jumpers[1].pin='uno.GND2'},'E_NETLIST_MISMATCH'],
  ['wrong strip',(p:Placement)=>{p.jumpers[0].hole='A11'},'E_NETLIST_MISMATCH'],
  ['wrong side of gap',(p:Placement)=>{p.leads['led.A']='H14';p.leads['led.K']='H15'},'E_NETLIST_MISMATCH'],
] as const) test(`Fault injection: ${name} blocks SVG`,()=>{
  const r=compile(source); mutate(r.placement);
  error(()=>verify(r.circuit,r.expected,r.placement),code);
  error(()=>renderSvg(r.circuit,r.placement),code);
});
test('Reconstruction reflects changed physical placement independently',()=>{
  const r=compile(source); r.placement.jumpers[0].hole='A11';
  assert.notDeepEqual(physicalNetlist(r.circuit,r.placement),r.expected);
});
test('AC10: SVG byte-identical across repeated renders and statement order',()=>{
  const svg=render(source);
  for(let i=0;i<20;i++)assert.equal(render(source),svg);
  const lines=source.split('\n'), connections=lines.filter(l=>l.includes('--'));
  const reordered=lines.filter(l=>!l.includes('--')).join('\n')+'\n'+connections.reverse().map(l=>l.split(' -- ').reverse().join(' -- ')).join('\n');
  assert.equal(render(reordered),svg);
});
test('Both supported signal routes have exact endpoints and no wire crossings',()=>{
  for (const pin of ['D13','D12']) {
    const {placement}=compile(source.replace('D13',pin));
    const wires=route(placement);
    for (const wire of wires) {
      assert.deepEqual(wire.points[0],unoPins[wire.pin.split('.')[1]]);
      assert.deepEqual(wire.points.at(-1),holePoint(wire.hole));
    }
    for (let i=1;i<wires[0].points.length;i++) for(let j=1;j<wires[1].points.length;j++) {
      const [a,b]=[wires[0].points[i-1],wires[0].points[i]], [c,d]=[wires[1].points[j-1],wires[1].points[j]];
      const overlaps = Math.max(Math.min(a.x,b.x),Math.min(c.x,d.x)) <= Math.min(Math.max(a.x,b.x),Math.max(c.x,d.x)) &&
        Math.max(Math.min(a.y,b.y),Math.min(c.y,d.y)) <= Math.min(Math.max(a.y,b.y),Math.max(c.y,d.y));
      assert.equal(overlaps,false,`segments ${i}, ${j} intersect`);
    }
  }
});
