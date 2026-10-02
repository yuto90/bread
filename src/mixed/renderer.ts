// SPDX-License-Identifier: MIT
import { unoGeometry } from '../../parts/arduino-uno-r3/geometry.ts';
import { illustrationAttribution, illustrationMetadata } from '../attribution.ts';
import type {Resolved,Placement,Netlist} from '../model.ts';
import {upperHeader,lowerHeader,fromCad} from '../../parts/arduino-uno-r3/index.ts';
import {holes} from '../breadboard/index.ts';
import {mixedPins} from './parts.ts';
import {boardPoint,unoPoint,routeMixed} from './routing.ts';
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!));
const text=(x:number,y:number,s:string,size=16,color='#27433e',more='')=>`<text x="${x}" y="${y}" font-size="${size}" fill="${color}" ${more}>${esc(s)}</text>`;
export function renderMixed(c:Resolved,p:Placement,actual:Netlist):string{
 const wires=routeMixed(p,c),parts=c.parts.filter(x=>x.id!==c.uno).sort((a,b)=>a.type.localeCompare(b.type)||a.id.localeCompare(b.id));
 const out=[`<svg xmlns="http://www.w3.org/2000/svg" width="1720" height="1320" viewBox="0 0 1720 1320" role="img" aria-labelledby="title desc"><title id="title">${esc(c.title)}</title><desc id="desc">Connection-only mixed-parts wiring. Button released. Conditional formed button footprint. No alarm firmware or hardware validation.</desc><metadata id="bread-proof">${esc(JSON.stringify({physical:actual,placement:p,illustration:illustrationAttribution}))}</metadata>${illustrationMetadata()}<g font-family="Arial,Helvetica,sans-serif"><rect width="1720" height="1320" fill="#f5f7f6"/>`,text(45,45,'BREAD / MIXED-PARTS WIRING',13,'#56716a','letter-spacing="2"'),text(45,85,c.title,31,'#173b35','font-weight="700"'),text(45,115,'Pushbutton · 10kΩ trim potentiometer · bare 4-pin DHT22 · LED',18),text(1255,65,'8 STATIC NETS VERIFIED',17,'#236247','font-weight="700"')];
 const outline=unoGeometry.outline.map(([x,y],i)=>{const p=fromCad(x,y);return `${i?'L':'M'}${p.x},${p.y+80}`}).join(' ')+' Z';
 out.push(`<path data-route-body="${esc(c.uno)}" d="${outline}" fill="#087e89" stroke="#05616a" stroke-width="3"/>`,'<rect x="50" y="390" width="85" height="100" rx="5" fill="#a9babd" stroke="#627a7b"/><rect x="300" y="550" width="165" height="65" rx="4" fill="#253438"/>',text(270,465,'UNO R3',36,'white','font-weight="700"'),text(270,497,'TOP VIEW · USB LEFT',13,'#d7efeb'));
 for(const pin of [...upperHeader,...lowerHeader]){
  const pt=unoPoint(pin),top=upperHeader.includes(pin),active=p.jumpers.some(j=>j.pin===`${c.uno}.${pin}`);
  out.push(`<rect x="${pt.x-7}" y="${pt.y-9}" width="14" height="18" fill="#263537"/><rect id="uno-${pin}" x="${pt.x-3}" y="${pt.y-3}" width="6" height="6" fill="${active?'#f9dda0':'#121d20'}"/>`,text(pt.x,pt.y+(top?28:-18),pin,10,'white',`text-anchor="middle" transform="rotate(-60 ${pt.x} ${pt.y+(top?28:-18)})"`));
 }
 out.push('<rect x="725" y="220" width="425" height="815" rx="14" fill="#e1e7e3" stroke="#b5c6bd" stroke-width="2"/><rect x="745" y="240" width="385" height="775" rx="8" fill="#fbfcf8"/><rect x="908" y="255" width="28" height="740" rx="5" fill="#d4ddd7"/>');
 for(const h of holes){const pt=boardPoint(h);out.push(`<rect id="hole-${h}" x="${pt.x-3}" y="${pt.y-3}" width="6" height="6" rx="1" fill="#8b9990"><title>${h}</title></rect>`);}
 for(const col of 'ABCDEFGHIJ')out.push(text(boardPoint(col+'1').x,255,col,12,'#597568','text-anchor="middle"'));
 for(let row=1;row<=30;row++)out.push(text(767,boardPoint(`A${row}`).y+4,String(row),12,'#597568','text-anchor="end"'));
 // Symbols are raised/cutaway illustrations; the exact insertion rings and
 // guide carry pin identity. Conservative body envelopes are checked separately.
 parts.forEach((part,i)=>{
  const pts=mixedPins[part.type].map(pin=>({pin,...boardPoint(p.leads[`${part.id}.${pin}`])})),a=pts[0],last=pts.at(-1)!;
  if(part.type==='resistor'){
   const y=(a.y+last.y)/2;out.push(`<path d="M${a.x} ${a.y} V${last.y}" stroke="#8d9a9a" stroke-width="4"/><rect data-route-body="${esc(part.id)}" x="${a.x-10}" y="${y-28}" width="20" height="56" rx="7" fill="#e0c58a" stroke="#997f48"/>`);
   const colors=part.value==='220ohm'?['#c74035','#c74035','#8a5d39']:['#885c34','#222','#da9b2f'];colors.forEach((color,j)=>out.push(`<rect x="${a.x-10}" y="${y-17+j*12}" width="20" height="5" fill="${color}"/>`));out.push(text(a.x+15,y+5,String(i+1),14,'#654d28','font-weight="700"'));
  }else if(part.type==='led-5mm-red'){
   const y=last.y+55;out.push(`<path d="M${a.x} ${a.y} H${a.x-10} V${y} M${last.x} ${last.y} H${a.x+10} V${y}" fill="none" stroke="#879494" stroke-width="3"/><path data-route-body="${esc(part.id)}" d="M${a.x-18} ${y+23} V${y} A18 18 0 0 1 ${a.x+18} ${y} V${y+23}Z" fill="#e8484e" stroke="#97383a" stroke-width="2"/>`,text(a.x,y+13,String(i+1),15,'white','text-anchor="middle"'),text(a.x-27,a.y+12,'A',11,'#a33539'),text(a.x+16,last.y+12,'K',11,'#a33539'));
  }else if(part.type==='pushbutton-b3f1000-formed'){
   const b=pts[1],bottom=pts[2];out.push(`<rect data-route-body="${esc(part.id)}" x="${a.x+7}" y="${a.y-2}" width="${b.x-a.x-14}" height="${bottom.y-a.y+4}" rx="5" fill="#b5bbb6" stroke="#536762"/><circle cx="${(a.x+b.x)/2}" cy="${(a.y+bottom.y)/2}" r="18" fill="#303e39"/>`,text((a.x+b.x)/2,(a.y+bottom.y)/2+5,String(i+1),15,'white','text-anchor="middle"'));
  }else if(part.type==='potentiometer-3296w'){
   out.push(`<rect data-route-body="${esc(part.id)}" x="${a.x-23}" y="${a.y-20}" width="46" height="${last.y-a.y+40}" rx="5" fill="#3d72a4" stroke="#264c72"/><circle cx="${a.x}" cy="${a.y-5}" r="12" fill="#e2c35a"/><path d="M${a.x-8} ${a.y-5} H${a.x+8}" stroke="#765d20" stroke-width="3"/>`,text(a.x,last.y+16,String(i+1),15,'white','text-anchor="middle"'));
  }else{
   // Expose actual pin row with a raised front-face illustration to its left.
   out.push(`<rect data-route-body="${esc(part.id)}" x="${a.x-104}" y="${a.y-28}" width="88" height="130" rx="8" fill="#f6f4ed" stroke="#9aafa0" stroke-width="2"/>`);
   for(let k=0;k<9;k++)out.push(`<path d="M${a.x-91} ${a.y-12+k*11} H${a.x-30}" stroke="#b8c2b4" stroke-width="4"/>`);
   out.push(text(a.x-60,a.y+118,`${i+1} · DHT22`,14,'#4f6d59','text-anchor="middle"'));
  }
 });
 for(const [i,w] of wires.entries()){
  const path=w.points.map((pt,j)=>`${j?'L':'M'}${pt.x} ${pt.y}`).join(' ');
  out.push(`<g data-wire="${i+1}"><title>${esc(w.from)} → ${esc(w.to)}</title><path d="${path}" fill="none" stroke="#f5f7f6" stroke-width="8" stroke-linejoin="round"/><path d="${path}" fill="none" stroke="${w.color}" stroke-width="4" stroke-linejoin="round"/>`);
  for(const pt of [w.points[0],w.points.at(-1)!])out.push(`<circle cx="${pt.x}" cy="${pt.y}" r="5" fill="white" stroke="${w.color}" stroke-width="2"/>`);out.push('</g>');
 }
 for(const [pin,hole] of Object.entries(p.leads)){const pt=boardPoint(hole),nc=pin.endsWith('.3')&&c.parts.find(p=>p.id===pin.split('.')[0])?.type==='dht22-bare';out.push(`<circle data-lead="${esc(pin)}" data-hole="${hole}" cx="${pt.x}" cy="${pt.y}" r="5.5" fill="${nc?'#fce7c5':'white'}" stroke="${nc?'#b57b2b':'#a65d49'}" stroke-width="2.5"><title>${esc(pin)} → ${hole}${nc?' (NC)':''}</title></circle>`);}
 out.push('<rect x="1200" y="160" width="475" height="1030" rx="14" fill="white" stroke="#d6e0d8"/>',text(1225,198,'INSERTION GUIDE',18,'#416858','font-weight="700"'));
 parts.forEach((part,i)=>{
  const y=230+i*78,name=part.type==='resistor'?`resistor ${part.value}`:part.type==='potentiometer-3296w'?'3296W · 10kΩ trimmer':part.type==='pushbutton-b3f1000-formed'?'B3F · formed leads':part.type==='dht22-bare'?'bare 4-pin DHT22':'red LED';
  out.push(text(1225,y,`${i+1}. ${part.id}`,17,'#173b35','font-weight="700"'),text(1225,y+22,name,14),text(1225,y+44,mixedPins[part.type].map(pin=>`${pin}→${p.leads[`${part.id}.${pin}`]}`).join('  '),14,part.type==='dht22-bare'?'#9b6730':'#62746d'));
  if(part.type==='dht22-bare')out.push(text(1225,y+62,'1 VCC · 2 DATA · 3 NC (isolated) · 4 GND',12,'#9b6730'));
  if(part.type==='potentiometer-3296w')out.push(text(1225,y+62,'1 / 3 = outer terminals · 2 = wiper',12));
  if(part.type==='pushbutton-b3f1000-formed')out.push(text(1225,y+62,'Fixed pairs: A1–A2, B1–B2 · switch OPEN',12));
 });
 out.push(text(1225,800,'UNO JUMPERS',15,'#416858','font-weight="700"'));
 p.jumpers.forEach((j,i)=>out.push(text(1225,825+i*24,`${j.pin} → ${j.hole}`,15)));
 out.push(text(1225,995,'BREADBOARD JUMPERS',15,'#416858','font-weight="700"'));
 (p.links??[]).forEach((l,i)=>out.push(text(1225+(i%2)*218,1020+Math.floor(i/2)*29,`${l.fromHole} → ${l.toHole}`,15)));
 out.push(text(50,990,'Intended temperature-alarm wiring',24,'#173b35','font-weight="700"'),text(50,1022,'Sensor, threshold control, acknowledge button and indicator LED.',17),text(50,1052,'DHT pin 3 is NC. Button released: A1–A2 and B1–B2 only.',16),text(50,1080,'10kΩ DATA pull-up to 5V; 10kΩ button pull-down to ground.',16),text(50,1108,'Wire crossings are not junctions. Follow the insertion guide.',16),text(50,1143,'Button leads: assumed formed to 7.62 × 5.08mm; fit untested.',16,'#94692c'),text(50,1171,'Raised-body terminal exits can cross drawings; mechanical clearance remains unverified.',15,'#667e70'),'<rect x="45" y="1220" width="1630" height="62" rx="12" fill="#e4ede6"/>',text(65,1246,`${actual.length} static nets · ${c.parts.length} components · ${wires.length} jumpers · one fixed 300-hole board`,17,'#335848','font-weight="700"'),text(65,1270,'Wiring consistency only — no firmware, temperature threshold behavior, switching simulation or alarm validation.',15),text(45,1305,'Arduino Uno CAD-derived socket geometry · adapted illustration CC BY-SA 4.0 · component sources and assumptions in mixed-parts report',11,'#748479'),'</g></svg>');return out.join('\n')+'\n';
}
