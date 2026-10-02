import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,writeFileSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {compile,render} from '../src/index.ts';
import {parse} from '../src/parser/index.ts';
import {resolve} from '../src/semantic.ts';
import {verify,physicalNetlist} from '../src/placement/verify.ts';
import {renderSvg} from '../src/renderer/index.ts';
import {route,routeLinks} from '../src/routing/index.ts';
import {holePoint} from '../src/breadboard/index.ts';
import {unoPins} from '../parts/arduino-uno-r3/index.ts';
import {BreadError} from '../src/model.ts';
const source=readFileSync('examples/6-leds.bread','utf8');
const reject=(fn:()=>unknown,code:string)=>assert.throws(fn,(e:unknown)=>e instanceof BreadError&&e.code===code);

test('Six branches use two real banks, thirteen nets, forty-one distinct holes and one ground socket',()=>{
 const r=compile(source);assert.deepEqual(r.actual,r.expected);assert.equal(r.actual.length,13);
 assert.equal(r.actual.find(n=>n.includes('uno.GND1'))!.length,7);
 const p=r.placement,occupied=[...Object.values(p.leads),...p.jumpers.map(j=>j.hole),...p.links!.flatMap(l=>[l.fromHole,l.toHole])];
 assert.equal(occupied.length,41);assert.equal(new Set(occupied).size,41);
 assert.equal(p.jumpers.length+p.links!.length,12);assert.equal(p.jumpers.filter(j=>j.pin.endsWith('GND1')).length,1);
 assert.equal(new Set(p.jumpers.map(j=>j.pin)).size,7);
 assert.equal(p.leads['r4.1'],'F2');assert.equal(p.leads['led6.K'],'H25');
});
test('Four and five branches follow the same placement rule',()=>{
 for(const n of [4,5]){
 const input=source.split('\n').filter(l=>!Array.from({length:6-n},(_,i)=>n+i+1).some(i=>new RegExp(`\\b(r${i}|led${i})([.:]|\\b)`).test(l))).join('\n');
 const r=compile(input);assert.deepEqual(r.actual,r.expected);assert.equal(r.actual.length,2*n+1);assert.match(render(input),new RegExp(`${n} BRANCHES`));
 }
});
test('Six-branch route endpoints use actual sockets and holes',()=>{
 const p=compile(source).placement;
 for(const w of [...route(p),...routeLinks(p)]){
 assert.deepEqual(w.points[0],w.pin.startsWith('breadboard.')?holePoint(w.pin.split('.')[1]):unoPins[w.pin.split('.')[1]]);
 assert.deepEqual(w.points.at(-1),holePoint(w.hole));assert.ok(w.points.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));
 }
 assert.deepEqual(unoPins.D10,{x:326.032,y:247.78});assert.deepEqual(unoPins.D9,{x:343.812,y:247.78});assert.deepEqual(unoPins.D8,{x:361.592,y:247.78});
});
test('Six-branch output deterministic across calls and reordered input',()=>{
 const svg=render(source);for(let i=0;i<10;i++)assert.equal(render(source),svg);
 const lines=source.split('\n');assert.equal(render(lines.filter(l=>!l.includes('--')).join('\n')+'\n'+lines.filter(l=>l.includes('--')).reverse().join('\n')),svg);
 assert.equal((svg.match(/data-lead=/g)||[]).length,24);assert.equal((svg.match(/data-wire-pin=/g)||[]).length,12);
});
test('Three-LED reviewed SVG remains byte-identical',()=>assert.equal(render(readFileSync('examples/three-leds.bread','utf8')),readFileSync('output/three-leds.svg','utf8')));
for(const [name,mutate] of [
 ['wrong right-bank return',(p:any)=>{p.links[4].toHole='I24'}],
 ['missing cross-bank bridge',(p:any)=>{p.links.splice(2,1)}],
 ['occupied cross-bank endpoint',(p:any)=>{p.links[2].toHole='H7'}],
 ['duplicate Uno ground socket',(p:any)=>{p.jumpers[5].pin='uno.GND1'}],
 ['overlapping right-bank LED and resistor',(p:any)=>{p.leads['led4.A']='F6';p.leads['led4.K']='F7'}],
 ['wrong existing Uno socket',(p:any)=>{p.jumpers[5].pin='uno.D7'}],
] as const)test(`Six-branch corruption: ${name} blocks SVG`,()=>{
 const r=compile(source);mutate(r.placement);assert.throws(()=>verify(r.circuit,r.expected,r.placement),BreadError);assert.throws(()=>renderSvg(r.circuit,r.placement),BreadError);
});
test('Independent reconstruction detects wrong strip without logical-edge reuse',()=>{
 const r=compile(source);r.placement.jumpers[5].hole='J21';assert.notDeepEqual(physicalNetlist(r.circuit,r.placement),r.expected);
});
test('Seven is first unsupported capacity; ten resolves genuine GPIO topology then fails placement',()=>{
 for(const n of [7,10]){
 const input=readFileSync(`examples/${n}-leds.bread`,'utf8');assert.equal(resolve(parse(input)).branches!.length,n);
 reject(()=>compile(input),'E_PLACEMENT_CAPACITY');reject(()=>render(input),'E_PLACEMENT_CAPACITY');
 }
});
test('CLI ten-branch failure creates no SVG, preserves existing output; six is deterministic across processes',()=>{
 const dir=mkdtempSync(join(tmpdir(),'bread-scaling-'));
 try{
 const output=join(dir,'test.svg');const run=(n:number)=>spawnSync(process.execPath,['src/cli.ts','render',`examples/${n}-leds.bread`,'-o',output],{encoding:'utf8'});
 const bad=run(10);assert.equal(bad.status,1);assert.match(bad.stderr,/E_PLACEMENT_CAPACITY/);assert.equal(existsSync(output),false);
 writeFileSync(output,'preserve');assert.equal(run(10).status,1);assert.equal(readFileSync(output,'utf8'),'preserve');
 assert.equal(run(6).status,0);const first=readFileSync(output,'utf8');assert.equal(run(6).status,0);assert.equal(readFileSync(output,'utf8'),first);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('Six-branch wires have no collinear overlapping runs',()=>{
 const p=compile(source).placement,w=[...route(p),...routeLinks(p)];
 for(let i=0;i<w.length;i++)for(let j=i+1;j<w.length;j++)for(let a=1;a<w[i].points.length;a++)for(let b=1;b<w[j].points.length;b++){
 const [p,q]=[w[i].points[a-1],w[i].points[a]],[s,t]=[w[j].points[b-1],w[j].points[b]];
 const dx=Math.min(Math.max(p.x,q.x),Math.max(s.x,t.x))-Math.max(Math.min(p.x,q.x),Math.min(s.x,t.x));
 const dy=Math.min(Math.max(p.y,q.y),Math.max(s.y,t.y))-Math.max(Math.min(p.y,q.y),Math.min(s.y,t.y));
 assert.equal((dx>0&&dy===0)||(dy>0&&dx===0),false,`wires ${i}/${j} overlap`);
 }
});
