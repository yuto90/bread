import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { compile, render } from '../src/index.ts';
import { BreadError } from '../src/model.ts';
import { parse } from '../src/parser/index.ts';
import { placeMixed } from '../src/mixed/placement.ts';
import type { Placement } from '../src/model.ts';
import { physicalNetlist, verify } from '../src/placement/verify.ts';
import { renderSvg } from '../src/renderer/index.ts';
import { routeMixed } from '../src/mixed/routing.ts';
import { routingBodies, wireSpecs } from '../src/mixed/routing-scene.ts';
import { verifyRoutes } from '../src/mixed/routing-verify.ts';
const source = readFileSync('examples/diode-decoupling.bread','utf8');
const bare = readFileSync('examples/diode-led.bread','utf8');
const rejected = (input:string, code:string) => assert.throws(()=>compile(input), (e:unknown)=>e instanceof BreadError && e.code===code);
for (const [name,input,nets,pins] of [['diode-led',bare,4,6],['diode-decoupling',source,5,8]] as const) {
 test(`${name}: inserted physical terminals reconstruct exact distinct nets`,()=>{
  const r=compile(input);assert.deepEqual(r.actual,r.expected);assert.equal(r.actual.length,nets);assert.equal(Object.keys(r.placement.leads).length,pins);
  const net=(pin:string)=>r.actual.find(n=>n.includes(pin));
  assert.notEqual(net('diode.A'),net('diode.K'));
  if(name==='diode-decoupling') {assert.deepEqual(r.actual,[['bypass.1','uno.5V'],['bypass.2','led.K','uno.GND1'],['diode.A','limit.2'],['diode.K','led.A'],['limit.1','uno.D13']]);assert.notEqual(net('bypass.1'),net('bypass.2'));assert.equal(net('bypass.1'),net('uno.5V'));assert.equal(net('bypass.2'),net('uno.GND1'));}
  const occupied=[...Object.values(r.placement.leads),...r.placement.jumpers.map(j=>j.hole),...r.placement.links!.flatMap(l=>[l.fromHole,l.toHole])];
  assert.equal(new Set(occupied).size,occupied.length);
  const routes=routeMixed(r.placement,r.circuit);assert.deepEqual(verifyRoutes(routes,wireSpecs(r.placement),routingBodies(r.circuit,r.placement)).violations,[]);
  assert.equal(render(input),render(input));assert.match(render(input),/1N4148/);assert.doesNotMatch(render(input),/DHT22|Button released|temperature-alarm|8 STATIC NETS/);
 });
}
for(const [label,input,code] of [
 ['invalid diode terminal',source.replace('diode.A','diode.C'),'E_UNKNOWN_PIN'],
 ['invalid capacitor terminal',source.replace('bypass.1','bypass.POS'),'E_UNKNOWN_PIN'],
 ['reversed diode',source.replaceAll('diode.A','diode.TEMP').replaceAll('diode.K','diode.A').replaceAll('diode.TEMP','diode.K'),'E_DIODE_POLARITY'],
 ['reversed LED',source.replaceAll('led.A','led.TEMP').replaceAll('led.K','led.A').replaceAll('led.TEMP','led.K'),'E_LED_POLARITY'],
 ['wrong capacitance',source.replace('100nF]','10uF]'),'E_ATTRIBUTE'],
 ['missing capacitance',source.replace(' [value=100nF]',''),'E_ATTRIBUTE'],
 ['diode attributes',source.replace('part diode: diode-1n4148','part diode: diode-1n4148 [value=1N4148]'),'E_ATTRIBUTE'],
 ['wrong current limiting resistor',source.replace('220ohm','10kohm'),'E_ATTRIBUTE'],
 ['shorted power',source+'\nuno.5V -- uno.GND','E_POWER_NET'],
 ['capacitor on signal',source.replace('uno.5V -- bypass.1','uno.D13 -- bypass.1'),'E_CAPACITOR_NET'],
 ['omitted ground',source.replace('bypass.2 -- uno.GND',''),'E_CAPACITOR_NET'],
 ['component short',source+'\ndiode.A -- diode.K','E_COMPONENT_SHORT'],
 ['different ground socket',source.replaceAll('uno.GND','uno.GND2'),'E_UNSUPPORTED_CIRCUIT'],
 ['unsupported combination',source+'\npart other: dht22-bare','E_UNSUPPORTED_CIRCUIT'],
] as const) test(`Discrete validation rejects ${label}`,()=>rejected(input,code));
test('Invalid named terminal includes its original source line',()=>{
 const changed=source.replace('diode.A','diode.C'),line=changed.split('\n').findIndex(x=>x.includes('-- diode.C'))+1;
 assert.throws(()=>compile(changed),(e:unknown)=>e instanceof BreadError&&e.code==='E_UNKNOWN_PIN'&&e.line===line);
});
test('Non-polar capacitor terminal swap and resistor reversal preserve connectivity',()=>{
 const swapped=source.replaceAll('bypass.1','bypass.X').replaceAll('bypass.2','bypass.1').replaceAll('bypass.X','bypass.2').replaceAll('limit.1','limit.X').replaceAll('limit.2','limit.1').replaceAll('limit.X','limit.2');
 const r=compile(swapped);assert.deepEqual(r.actual,r.expected);
});
test('Renaming, ordering and D12 assignment remain connection-driven',()=>{
 const changed=source.replaceAll('diode','rectifier').replace('rectifier-1n4148','diode-1n4148').replaceAll('D13','D12');
 const lines=changed.split('\n'),reordered=lines.filter(l=>!l.startsWith('part ')&&!l.includes('--')).join('\n')+'\n'+lines.filter(l=>l.startsWith('part ')).reverse().join('\n')+'\n'+lines.filter(l=>l.includes('--')).reverse().join('\n');
 assert.equal(render(changed),render(reordered));assert.deepEqual(compile(changed).actual,compile(changed).expected);
});
for(const [label,mutate] of [
 ['diode polarity placement swapped',(p:Placement)=>{[p.leads['diode.A'],p.leads['diode.K']]=[p.leads['diode.K'],p.leads['diode.A']]}],
 ['capacitor pin missing',(p:Placement)=>{delete p.leads['bypass.2']}],
 ['capacitor terminals placed on same strip',(p:Placement)=>{p.leads['bypass.2']='B'+p.leads['bypass.1'].slice(1)}],
 ['body overlapping diode',(p:Placement)=>{p.leads['limit.1']=p.leads['diode.A'].replace(/^[A-J]/,'A');p.leads['limit.2']=p.leads['diode.K'].replace(/^[A-J]/,'A')}],
 ['removed distribution jumper',(p:Placement)=>{p.links!.pop()}],
 ['incorrect ground socket',(p:Placement)=>{p.jumpers.find(j=>j.pin==='uno.GND1')!.pin='uno.GND2'}],
] as const) test(`Independent physical validation blocks ${label}`,()=>{
 const r=compile(source);mutate(r.placement);assert.throws(()=>verify(r.circuit,r.expected,r.placement),BreadError);assert.throws(()=>renderSvg(r.circuit,r.placement),BreadError);
});
test('Physical reconstruction does not follow edited input edges',()=>{
 const r=compile(source),original=physicalNetlist(r.circuit,r.placement);r.circuit.connections=[];assert.deepEqual(physicalNetlist(r.circuit,r.placement),original);
});
test('Capacitor footprints exhaust the finite board in a placement stress corpus',()=>{
 let large=source;for(let i=2;i<=30;i++)large+=`\npart cap${i}: capacitor-c315c104 [value=100nF]\nuno.5V -- cap${i}.1\ncap${i}.2 -- uno.GND`;
 const stress={...compile(source).circuit,...parse(large.replaceAll('uno.GND','uno.GND1'))};
 assert.throws(()=>placeMixed(stress),(e:unknown)=>e instanceof BreadError&&e.code==='E_PLACEMENT_CAPACITY');
});

test('The product family rejects multiple capacitors before rendering a crowded guide',()=>{
 rejected(source+'\npart extra: capacitor-c315c104 [value=100nF]\nuno.5V -- extra.1\nextra.2 -- uno.GND','E_UNSUPPORTED_CIRCUIT');
});
