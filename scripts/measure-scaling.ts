import {readFileSync,writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {compile,render} from '../src/index.ts';
import {route,routeLinks} from '../src/routing/index.ts';
import {BreadError} from '../src/model.ts';
const results=[];
for(const [n,file] of [[3,'three-leds'],[6,'6-leds'],[10,'10-leds']] as const){
 const input=readFileSync(`examples/${file}.bread`,'utf8');
 try{
 const r=compile(input),wires=[...route(r.placement),...routeLinks(r.placement)];
 const crossings=new Set<string>(),overlaps=[];
 for(let i=0;i<wires.length;i++)for(let j=i+1;j<wires.length;j++)
 for(let a=1;a<wires[i].points.length;a++)for(let b=1;b<wires[j].points.length;b++){
 const [p,q]=[wires[i].points[a-1],wires[i].points[a]], [s,t]=[wires[j].points[b-1],wires[j].points[b]];
 const xmin=Math.max(Math.min(p.x,q.x),Math.min(s.x,t.x)),xmax=Math.min(Math.max(p.x,q.x),Math.max(s.x,t.x));
 const ymin=Math.max(Math.min(p.y,q.y),Math.min(s.y,t.y)),ymax=Math.min(Math.max(p.y,q.y),Math.max(s.y,t.y));
 if(xmin<=xmax&&ymin<=ymax){if(xmin<xmax||ymin<ymax)overlaps.push({i,j,a,b});else crossings.add(`${i}:${j}:${xmin}:${ymin}`);}
 }
 const timings=[];render(input);for(let i=0;i<100;i++){const start=performance.now();render(input);timings.push(performance.now()-start);}timings.sort((a,b)=>a-b);
 results.push({branches:n,components:r.circuit.parts.length,breadboards:1,holes:300,occupiedHoles:Object.keys(r.placement.leads).length+r.placement.jumpers.length+r.placement.links!.length*2,jumpers:wires.length,nets:r.actual.length,physicalEqualsLogical:JSON.stringify(r.actual)===JSON.stringify(r.expected),crossingPoints:crossings.size,crossings:[...crossings],collinearOverlaps:overlaps,renderMs:{samples:100,warmup:1,median:timings[50],p95:timings[95]},placement:r.placement});
 }catch(e){if(!(e instanceof BreadError))throw e;results.push({branches:n,components:1+n*2,breadboards:1,holes:300,status:'rejected',code:e.code,message:e.message,svgCreated:false});}
}
writeFileSync('docs/scaling-evidence.json',JSON.stringify({node:process.version,results},null,2)+'\n');
console.log(results.map(({placement,crossings,...r}:any)=>r));
