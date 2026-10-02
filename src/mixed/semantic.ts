import type {Circuit,Resolved} from '../model.ts';
import {fail} from '../model.ts';
import {mixedPins,isDiscrete} from './parts.ts';
import {resolveDiscrete} from './discrete.ts';
import {unoPins,canonicalPin} from '../../parts/arduino-uno-r3/index.ts';
import {logicalNetlist} from '../netlist/index.ts';
export function resolveMixed(ast:Circuit):Resolved {
 if(isDiscrete(ast))return resolveDiscrete(ast);
 const seen=new Set<string>();
 for(const p of ast.parts){
  if(seen.has(p.id))fail('E_DUPLICATE_COMPONENT_ID',p.id);seen.add(p.id);
  if(p.type!=='arduino-uno-r3'&&!mixedPins[p.type])fail('E_UNKNOWN_COMPONENT',p.type);
  const valid=p.type==='resistor'?['220ohm','10kohm'].includes(p.value??''):p.type==='potentiometer-3296w'?p.value==='10kohm':p.value===undefined;
  if(!valid)fail('E_ATTRIBUTE',`Unsupported value for ${p.type}`);
 }
 const one=(type:string)=>{const ps=ast.parts.filter(p=>p.type===type);if(ps.length!==1)fail('E_UNSUPPORTED_CIRCUIT',`Mixed family requires one ${type}`);return ps[0].id};
 const uno=one('arduino-uno-r3'),button=one('pushbutton-b3f1000-formed'),pot=one('potentiometer-3296w'),sensor=one('dht22-bare'),led=one('led-5mm-red');
 const rs=ast.parts.filter(p=>p.type==='resistor');
 if(ast.parts.length!==8||rs.length!==3||rs.filter(p=>p.value==='220ohm').length!==1||rs.filter(p=>p.value==='10kohm').length!==2)fail('E_UNSUPPORTED_CIRCUIT','Mixed family requires one 220ohm and two 10kohm resistors');
 const endpoint=(ref:string)=>{const [id,raw]=ref.split('.'),p=ast.parts.find(p=>p.id===id);if(!p)fail('E_UNKNOWN_COMPONENT',id);const pin=p.type==='arduino-uno-r3'?canonicalPin(raw):raw;
 if(!(p.type==='arduino-uno-r3'?Object.keys(unoPins):mixedPins[p.type]).includes(pin))fail('E_UNKNOWN_PIN',ref);
 if(p.type==='dht22-bare'&&pin==='3')fail('E_NC_CONNECTED','DHT22 pin 3 is NC and cannot be connected');return `${id}.${pin}`;};
 const c={...ast,connections:ast.connections.map(x=>({...x,from:endpoint(x.from),to:endpoint(x.to)}))};
 const nets=logicalNetlist(c), net=(pin:string)=>nets.find(n=>n.includes(pin))!;
 const same=(a:string,b:string)=>net(a)===net(b);
 const limit=rs.find(p=>p.value==='220ohm')!.id;
 const power=`${uno}.5V`,ground=`${uno}.GND1`;
 if(!net(power)||!net(ground)||same(power,ground))fail('E_POWER_NET','Distinct 5V and GND1 required');
 for(const pin of [`${pot}.1`,`${sensor}.1`,`${button}.A1`])if(!same(power,pin))fail('E_POWER_NET',`${pin} must connect to 5V`);
 for(const pin of [`${pot}.3`,`${sensor}.4`,`${led}.K`])if(!same(ground,pin))fail('E_POWER_NET',`${pin} must connect to GND1`);
 if(!same(`${uno}.A0`,`${pot}.2`))fail('E_UNSUPPORTED_CIRCUIT','Pot wiper 2 must connect to A0');
 const resistorAcross=(value:string,a:string,b:string)=>rs.find(r=>r.value===value&&((same(`${r.id}.1`,a)&&same(`${r.id}.2`,b))||(same(`${r.id}.2`,a)&&same(`${r.id}.1`,b))));
 const pull=resistorAcross('10kohm',power,`${sensor}.2`),down=resistorAcross('10kohm',ground,`${button}.B1`);
 if(!pull)fail('E_DHT_PULLUP','DHT DATA requires a separate 10kohm resistor to 5V');
 if(!down||pull.id===down.id)fail('E_BUTTON_PULLDOWN','Button B requires a separate 10kohm resistor to GND1');
 const digital=(pin:string)=>{const a=net(pin).filter(t=>new RegExp(`^${uno}\\.D(?:[2-9]|1[0-3])$`).test(t));if(a.length!==1)fail('E_UNSUPPORTED_CIRCUIT',`${pin} needs one distinct D2–D13 socket`);return a[0];};
 const sensorSignal=digital(`${sensor}.2`),buttonSignal=digital(`${button}.B1`);
 const ledEnd=['1','2'].find(pin=>same(`${limit}.${pin}`,`${led}.A`));if(!ledEnd)fail('E_UNSUPPORTED_CIRCUIT','LED A requires its series resistor');
 const resistorOutput=`${limit}.${ledEnd}`,resistorInput=`${limit}.${ledEnd==='1'?'2':'1'}`,signal=digital(resistorInput);
 if(new Set([signal,sensorSignal,buttonSignal]).size!==3)fail('E_UNSUPPORTED_CIRCUIT','Signals must use distinct sockets');
 // Exact terminal sets reject extra shorts/connections while allowing equivalent
 // connection trees, swapped resistor ends, IDs and statement ordering.
 const expected=[
 [power,`${pot}.1`,`${sensor}.1`,`${button}.A1`,`${button}.A2`,...net(power).filter(t=>t.startsWith(`${pull.id}.`))],
 [ground,`${pot}.3`,`${sensor}.4`,`${led}.K`,...net(ground).filter(t=>t.startsWith(`${down.id}.`))],
 [`${uno}.A0`,`${pot}.2`],[sensorSignal,`${sensor}.2`,...net(`${sensor}.2`).filter(t=>t.startsWith(`${pull.id}.`))],
 [buttonSignal,`${button}.B1`,`${button}.B2`,...net(`${button}.B1`).filter(t=>t.startsWith(`${down.id}.`))],
 [signal,resistorInput],[resistorOutput,`${led}.A`],[`${sensor}.3`]
 ].map(n=>n.sort()).sort((a,b)=>a.join('|')<b.join('|')?-1:1);
 if(JSON.stringify(nets)!==JSON.stringify(expected))fail('E_UNSUPPORTED_CIRCUIT','Unexpected short or connection in the mixed family');
 return {...c,uno,mixed:true,resistor:limit,led,signal,resistorInput,resistorOutput,ledInput:`${led}.A`,ledGround:`${led}.K`,warnings:['W_BUTTON_FOOTPRINT: B3F-1000 leads assumed formed to 7.62 × 5.08mm; mechanical fit untested.']};
}
