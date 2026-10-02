import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {compile,render} from '../src/index.ts';
import {BreadError} from '../src/model.ts';
import type {Placement} from '../src/model.ts';
import {physicalNetlist,verify} from '../src/placement/verify.ts';
import {renderSvg} from '../src/renderer/index.ts';
import {boardPoint,unoPoint,routeMixed} from '../src/mixed/routing.ts';
import {unoPins} from '../parts/arduino-uno-r3/index.ts';
const source=readFileSync('examples/temperature-alarm.bread','utf8');
const rejected=(input:string,code:string)=>assert.throws(()=>compile(input),(e:unknown)=>e instanceof BreadError&&e.code===code);
test('Mixed physical and logical nets agree, including fixed button pairs and isolated NC',()=>{
 const r=compile(source);assert.deepEqual(r.actual,r.expected);assert.equal(r.actual.length,8);
 const n=(pin:string)=>r.actual.find(n=>n.includes(pin));
 assert.deepEqual(n('temperature.3'),['temperature.3']);
 assert.equal(n('acknowledge.A1'),n('acknowledge.A2'));assert.equal(n('acknowledge.B1'),n('acknowledge.B2'));assert.notEqual(n('acknowledge.A1'),n('acknowledge.B1'));
 for(const [a,b] of [['threshold.1','threshold.2'],['threshold.2','threshold.3'],['pullup.1','pullup.2'],['pulldown.1','pulldown.2'],['limit.1','limit.2']])assert.notEqual(n(a),n(b));
 assert.equal(n('threshold.2'),n('uno.A0'));assert.equal(n('temperature.2'),n('pullup.2'));assert.equal(n('pullup.1'),n('uno.5V'));
 assert.equal(n('pulldown.1'),n('uno.D4'));assert.equal(n('pulldown.2'),n('uno.GND1'));
 const p=r.placement,holes=[...Object.values(p.leads),...p.jumpers.map(j=>j.hole),...p.links!.flatMap(l=>[l.fromHole,l.toHole])];
 assert.equal(holes.length,41);assert.equal(new Set(holes).size,41);assert.equal(p.jumpers.length,6);assert.equal(p.links!.length,8);
 assert.equal(new Set(p.jumpers.map(j=>j.pin)).size,6);assert.equal(p.jumpers.filter(j=>j.pin==='uno.GND1').length,1);
});
for(const [name,input,code] of [
 ['NC connection',source+'\ntemperature.3 -- uno.GND','E_NC_CONNECTED'],
 ['DHT pullup omitted',source.replace('temperature.2 -- pullup.2',''),'E_DHT_PULLUP'],
 ['DHT pullup to wrong rail',source.replace('uno.5V -- pullup.1','uno.GND -- pullup.1'),'E_DHT_PULLUP'],
 ['button pulldown omitted',source.replace('acknowledge.B1 -- pulldown.1',''),'E_BUTTON_PULLDOWN'],
 ['pot wiper used as power',source.replace('uno.5V -- threshold.1','uno.5V -- threshold.2'),'E_POWER_NET'],
 ['button permanently pressed',source+'\nacknowledge.A1 -- acknowledge.B1','E_UNSUPPORTED_CIRCUIT'],
 ['wrong ground socket',source.replaceAll('uno.GND','uno.GND2'),'E_POWER_NET'],
 ['wrong pot value',source.replace('[value=10kohm]','[value=220ohm]'),'E_ATTRIBUTE'],
 ['invented DHT pin',source.replace('temperature.2','temperature.DATA'),'E_UNKNOWN_PIN'],
 ['extra mixed part',source+'\npart extra: led-5mm-red','E_UNSUPPORTED_CIRCUIT'],
] as const)test(`Mixed semantic rejects ${name}`,()=>rejected(input,code));
for(const [name,mutate] of [
 ['NC wired physically',(p:Placement)=>p.links!.push({fromHole:'D5',toHole:'B6'})],
 ['wrong fixed-pair leg position',(p:Placement)=>{p.leads['acknowledge.A2']='F12'}],
 ['swapped DHT data/NC',(p:Placement)=>{[p.leads['temperature.2'],p.leads['temperature.3']]=[p.leads['temperature.3'],p.leads['temperature.2']]}],
 ['pot reversed pin positions',(p:Placement)=>{[p.leads['threshold.1'],p.leads['threshold.3']]=[p.leads['threshold.3'],p.leads['threshold.1']]}],
 ['missing unused button leg',(p:Placement)=>{delete p.leads['acknowledge.A2']}],
 ['same occupied hole',(p:Placement)=>{p.jumpers[0].hole=p.leads['temperature.1']}],
 ['wrong analog socket',(p:Placement)=>{p.jumpers.find(j=>j.pin==='uno.A0')!.pin='uno.A1'}],
 ['missing ground distribution',(p:Placement)=>{p.links!.splice(4,1)}],
 ['shorted ground and power',(p:Placement)=>{p.links!.push({fromHole:'C3',toHole:'C6'})}],
 ['overlapping footprint',(p:Placement)=>{p.leads['pullup.1']='D14';p.leads['pullup.2']='D18'}],
] as const)test(`Mixed physical corruption blocks renderer: ${name}`,()=>{
 const r=compile(source);mutate(r.placement);assert.throws(()=>verify(r.circuit,r.expected,r.placement),BreadError);assert.throws(()=>renderSvg(r.circuit,r.placement),BreadError);
});
test('Mixed reconstruction independent of expected logical edges',()=>{
 const r=compile(source);r.placement.jumpers.find(j=>j.pin==='uno.A0')!.hole='A17';assert.notDeepEqual(physicalNetlist(r.circuit,r.placement),r.expected);
});
test('Mixed determinism, reordered declarations and equivalent button leg aliases',()=>{
 const svg=render(source);assert.equal(render(source),svg);
 const lines=source.split('\n');const reordered=lines.filter(l=>!l.startsWith('part ')&&!l.includes('--')).join('\n')+'\n'+lines.filter(l=>l.startsWith('part ')).reverse().join('\n')+'\n'+lines.filter(l=>l.includes('--')).reverse().join('\n');
 assert.equal(render(reordered),svg);assert.equal(render(source.replaceAll('acknowledge.A1','acknowledge.A2').replaceAll('acknowledge.B1','acknowledge.B2')),svg);
});
test('Mixed renamed parts and reassigned digital pins derive actual geometry',()=>{
 const changed=source.replaceAll('temperature','sensor').replaceAll('D2','D3').replaceAll('D4','D5');const r=compile(changed);
 assert.deepEqual(r.actual,r.expected);assert.ok(r.placement.jumpers.some(j=>j.pin==='uno.D3'));assert.match(render(changed),/uno.D5/);
});
test('Official Uno power, analog and digital socket positions',()=>{
 assert.deepEqual(unoPins['5V'],{x:336.7,y:585.6});assert.deepEqual(unoPins.A0,{x:425.6,y:585.6});
 assert.deepEqual(unoPins.D2,{x:478.94,y:247.78});assert.deepEqual(unoPins.D4,{x:443.38,y:247.78});
});
test('Mixed routes have exact endpoints, no collinear overlap and no false endpoint junctions',()=>{
 const compiled=compile(source),wires=routeMixed(compiled.placement,compiled.circuit);
 for(const w of wires){assert.deepEqual(w.points[0],w.from.startsWith('uno.')?unoPoint(w.from.split('.')[1]):boardPoint(w.from));assert.deepEqual(w.points.at(-1),boardPoint(w.to));}
 for(let i=0;i<wires.length;i++)for(let j=i+1;j<wires.length;j++)for(let a=1;a<wires[i].points.length;a++)for(let b=1;b<wires[j].points.length;b++){
  const [p,q]=[wires[i].points[a-1],wires[i].points[a]],[s,t]=[wires[j].points[b-1],wires[j].points[b]];
  const dx=Math.min(Math.max(p.x,q.x),Math.max(s.x,t.x))-Math.max(Math.min(p.x,q.x),Math.min(s.x,t.x));const dy=Math.min(Math.max(p.y,q.y),Math.max(s.y,t.y))-Math.max(Math.min(p.y,q.y),Math.min(s.y,t.y));
  assert.equal(dx>=0&&dy>=0&&(dx>0||dy>0),false);
  const on=(p:any,a:any,b:any)=>p.x>=Math.min(a.x,b.x)&&p.x<=Math.max(a.x,b.x)&&p.y>=Math.min(a.y,b.y)&&p.y<=Math.max(a.y,b.y);
  for(const pt of [wires[i].points[0],wires[i].points.at(-1)!])assert.equal(on(pt,s,t),false);
  for(const pt of [wires[j].points[0],wires[j].points.at(-1)!])assert.equal(on(pt,p,q),false);
 }
});
test('All previously reviewed SVGs remain byte-identical',()=>{
 for(const [input,output] of [['blink','blink'],['three-leds','three-leds'],['6-leds','6-leds']])assert.equal(render(readFileSync(`examples/${input}.bread`,'utf8')),readFileSync(`output/${output}.svg`,'utf8'));
});
