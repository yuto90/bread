import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {compile,render} from '../src/index.ts';
import {BreadError} from '../src/model.ts';
import type {Placement} from '../src/model.ts';
import {verify,physicalNetlist} from '../src/placement/verify.ts';
import {renderSvg} from '../src/renderer/index.ts';
import {route,routeLinks} from '../src/routing/index.ts';
import {holePoint} from '../src/breadboard/index.ts';
import {unoPins} from '../parts/arduino-uno-r3/index.ts';
const source=readFileSync(new URL('../examples/three-leds.bread',import.meta.url),'utf8');
const rejects=(f:()=>unknown,code:string)=>assert.throws(f,(e:unknown)=>e instanceof BreadError && e.code===code);

test('Three branches: seven nets with exactly one shared four-terminal ground',()=>{
  const r=compile(source);
  assert.deepEqual(r.actual,r.expected);
  assert.equal(r.actual.length,7);
  assert.deepEqual(r.actual.find(n=>n.includes('uno.GND1')),['led1.K','led2.K','led3.K','uno.GND1']);
  assert.equal(r.actual.filter(n=>n.length===2).length,6);
  assert.equal(r.placement.jumpers.length,4);
  assert.equal(r.placement.links?.length,2);
  assert.equal(r.placement.jumpers.filter(j=>j.pin==='uno.GND1').length,1);
  assert.equal(new Set(r.placement.jumpers.map(j=>j.pin)).size,4);
  const occupied=[...Object.values(r.placement.leads),...r.placement.jumpers.map(j=>j.hole),...r.placement.links!.flatMap(l=>[l.fromHole,l.toHole])];
  assert.equal(occupied.length,20);assert.equal(new Set(occupied).size,20);
});
test('D11/D12/D13 route starts use official CAD-derived distinct sockets',()=>{
  assert.deepEqual(unoPins.D11,{x:308.252,y:247.78});
  const r=compile(source),wires=route(r.placement);
  assert.deepEqual(wires.map(w=>w.points[0]),[unoPins.D13,unoPins.D12,unoPins.D11,unoPins.GND1]);
  for(const w of wires) assert.deepEqual(w.points.at(-1),holePoint(w.hole));
  for(const [i,w] of routeLinks(r.placement).entries()) {
    assert.deepEqual(w.points[0],holePoint(r.placement.links![i].fromHole));
    assert.deepEqual(w.points.at(-1),holePoint(r.placement.links![i].toHole));
  }
});
test('All six generated jumper routes avoid crossings and overlapping segments',()=>{
  const r=compile(source),wires=[...route(r.placement),...routeLinks(r.placement)];
  for(let k=0;k<wires.length;k++)for(let l=k+1;l<wires.length;l++)
    for(let i=1;i<wires[k].points.length;i++)for(let j=1;j<wires[l].points.length;j++){
      const [a,b]=[wires[k].points[i-1],wires[k].points[i]], [c,d]=[wires[l].points[j-1],wires[l].points[j]];
      const overlaps=Math.max(Math.min(a.x,b.x),Math.min(c.x,d.x))<=Math.min(Math.max(a.x,b.x),Math.max(c.x,d.x)) &&
        Math.max(Math.min(a.y,b.y),Math.min(c.y,d.y))<=Math.min(Math.max(a.y,b.y),Math.max(c.y,d.y));
      assert.equal(overlaps,false,`wires ${k}/${l}, segments ${i}/${j}`);
    }
});
test('Three-branch SVG renders all endpoints and all components',()=>{
  const svg=render(source);
  assert.equal((svg.match(/data-lead=/g)??[]).length,12);
  assert.equal((svg.match(/data-wire-pin=/g)??[]).length,6);
  for(const id of ['led1','led2','led3'])assert.match(svg,new RegExp(id+' · RED'));
  assert.match(svg,/7 verified nets/);assert.match(svg,/SHARED GROUND/);
});
test('Three branches stay deterministic under declaration and connection reordering',()=>{
  const expected=render(source);
  for(let i=0;i<10;i++)assert.equal(render(source),expected);
  const lines=source.split('\n').filter(l=>l&&!l.startsWith('//'));
  const reordered=[...lines.filter(l=>!l.startsWith('part ')&&!l.includes('--')),
    ...lines.filter(l=>l.startsWith('part ')).reverse(),
    ...lines.filter(l=>l.includes('--')).reverse().map(l=>l.split(' -- ').reverse().join(' -- '))].join('\n');
  assert.equal(render(reordered),expected);
});
test('Reversed LED in one branch keeps polarity and shared ground correct',()=>{
  const reversed=source.replace('led2.A','led2.TEMP').replace('led2.K','led2.A').replace('led2.TEMP','led2.K');
  const r=compile(reversed);
  assert.equal(r.placement.leads['led2.A'],'C16');assert.equal(r.placement.leads['led2.K'],'C15');
  assert.deepEqual(r.actual.find(n=>n.includes('uno.GND1')),['led1.K','led2.A','led3.K','uno.GND1']);
  assert.match(render(reversed),/W_LED_POLARITY: led2/);
});
test('Signal-to-component reassignment changes automatic branch order correctly',()=>{
  const swapped=source.replaceAll('D13','TEMP').replaceAll('D11','D13').replaceAll('TEMP','D11');
  const r=compile(swapped);assert.equal(r.placement.leads['r3.1'],'E2');assert.equal(r.placement.leads['r1.1'],'E20');
  assert.deepEqual(r.actual,r.expected);
});
for(const [name,mutate,code] of [
  ['missing ground bridge',(p:Placement)=>{p.links!.pop()},'E_PLACEMENT_FAILED'],
  ['wrong return strip',(p:Placement)=>{p.links![0].fromHole='D8'},'E_NETLIST_MISMATCH'],
  ['disconnected side of gap',(p:Placement)=>{p.links![1].toHole='F25'},'E_NETLIST_MISMATCH'],
  ['wrong LED terminal',(p:Placement)=>{p.links![1].toHole='D24'},'E_NETLIST_MISMATCH'],
  ['shorted third LED',(p:Placement)=>{p.links![1].fromHole='D24'},'E_PLACEMENT_FAILED'],
  ['reused ground bridge hole',(p:Placement)=>{p.links![1].fromHole='D16'},'E_PLACEMENT_FAILED'],
  ['bridge on occupied LED hole',(p:Placement)=>{p.links![0].fromHole='C7'},'E_PLACEMENT_FAILED'],
  ['duplicate Uno socket',(p:Placement)=>{p.jumpers[1].pin='uno.D13'},'E_PLACEMENT_FAILED'],
  ['misrouted signal socket',(p:Placement)=>{p.jumpers[2].pin='uno.D10'},'E_NETLIST_MISMATCH'],
  ['overlapping bodies',(p:Placement)=>{p.leads['led2.A']='D15';p.leads['led2.K']='D16';p.links![0].toHole='B16'},'E_PLACEMENT_FAILED'],
] as const)test(`Three-branch corruption rejects SVG: ${name}`,()=>{
  const r=compile(source);mutate(r.placement);
  rejects(()=>verify(r.circuit,r.expected,r.placement),code);
  rejects(()=>renderSvg(r.circuit,r.placement),code);
});
test('Shared ground reconstruction changes when a bridge moves, without logical changes',()=>{
  const r=compile(source);r.placement.links![0].fromHole='D8';
  assert.notDeepEqual(physicalNetlist(r.circuit,r.placement),r.expected);
});
test('Unsupported branch count and non-shared ground fail explicitly',()=>{
  const two=source.split('part r3:')[0]+source.slice(source.indexOf('// Each')).split('uno.D11')[0];
  rejects(()=>compile(two),'E_UNSUPPORTED_CIRCUIT');
  rejects(()=>compile(source.replace('led3.K -- uno.GND','led3.K -- uno.GND2')),'E_UNSUPPORTED_CIRCUIT');
  rejects(()=>compile(source.replace('uno.D11','uno.D10')),'E_UNSUPPORTED_CIRCUIT');
});
test('Original one-LED SVG bytes remain unchanged from reviewed commit',()=>{
  const single=readFileSync(new URL('../examples/blink.bread',import.meta.url),'utf8');
  assert.equal(createHash('sha256').update(render(single)).digest('hex'),'135d94378d17d393e5239b0c6547c45af9ae1b79404d0f93b2ba8d6f2f277d43');
});
test('Three-branch CLI check/render and separate-process determinism',()=>{
  const cli=new URL('../src/cli.ts',import.meta.url).pathname,input=new URL('../examples/three-leds.bread',import.meta.url).pathname;
  const run=(...args:string[])=>spawnSync(process.execPath,[cli,...args],{encoding:'utf8'});
  const dir=mkdtempSync(join(tmpdir(),'bread-three-'));
  try{
    assert.equal(run('check',input).status,0);
    for(const name of ['a.svg','b.svg']){const result=run('render',input,'-o',join(dir,name));assert.equal(result.status,0);assert.match(result.stdout,/7 verified nets, 6 jumpers/);}
    assert.equal(readFileSync(join(dir,'a.svg'),'utf8'),readFileSync(join(dir,'b.svg'),'utf8'));
  }finally{rmSync(dir,{recursive:true,force:true});}
});
