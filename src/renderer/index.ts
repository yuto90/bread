import type { Placement, Resolved } from '../model.ts';
import { branchesOf } from '../model.ts';
import { breadboard as b } from '../../parts/breadboard/index.ts';
import { fromCad, upperHeader, lowerHeader, unoPins } from '../../parts/arduino-uno-r3/index.ts';
import { holes, holePoint, holeGroup } from '../breadboard/index.ts';
import { verify } from '../placement/verify.ts';
import { route, routeLinks } from '../routing/index.ts';
import { logicalNetlist } from '../netlist/index.ts';

const esc = (s: string) => s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!));
const text = (x: number, y: number, s: string, size = 15, fill = '#263b43', extra = '') =>
  `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" ${extra}>${esc(s)}</text>`;
const line = (x1: number,y1: number,x2: number,y2: number, color: string, width = 2, extra = '') =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${width}" ${extra}/>`;
const ring = (x: number, y: number, color: string, extra = '') => `<circle cx="${x}" cy="${y}" r="5" fill="white" stroke="${color}" stroke-width="2.5" ${extra}/>`;

export function renderSvg(c: Resolved, p: Placement): string {
  // Public renderer rechecks even if called without compile(). No unchecked
  // placement can be rendered by this API.
  const expected = logicalNetlist(c), actual = verify(c, expected, p);
  const branches = branchesOf(c), multi = branches.length === 3;
  const wires = [...route(p),...routeLinks(p)], signal = branches.map(b=>b.signal.split('.')[1]).join('/');
  const outline = [[0,53.34],[64.516,53.34],[66.04,51.816],[66.04,40.386],[68.58,37.846],[68.58,5.08],[66.04,2.54],[66.04,0],[0,0]].map(([x,y],i)=>{
    const pt=fromCad(x,y); return `${i?'L':'M'} ${pt.x} ${pt.y}`;
  }).join(' ')+' Z';
  const out: string[] = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="940" viewBox="0 0 1440 940" role="img" aria-labelledby="title description">',
    `<title id="title">${esc(c.title)}</title>`,
    `<desc id="description">Uno ${signal} ${multi ? 'each connects through its own 220 ohm resistor and red LED to shared GND1.' : 'connects through a 220 ohm resistor and red LED to GND1.'} Breadboard insertion locations and LED polarity are labeled. ${esc(c.warnings.join(' '))}</desc>`,
    `<metadata id="bread-proof">${esc(JSON.stringify({ version: '0.1.0', logical: expected, physical: actual, placement: p, license: 'CC BY-SA 4.0', attribution: 'Board geometry derived from Arduino UNO-TH Rev3e / A000066. Artwork simplified, scaled and annotated by Bread.' }))}</metadata>`,
    '<defs><linearGradient id="resistor" x2="1" y2="0"><stop stop-color="#b99359"/><stop offset=".5" stop-color="#efd7a2"/><stop offset="1" stop-color="#b99359"/></linearGradient><radialGradient id="led"><stop stop-color="#ff9291"/><stop offset=".65" stop-color="#ee494a"/><stop offset="1" stop-color="#a3222e"/></radialGradient></defs>',
    '<g font-family="Arial, Helvetica, sans-serif">',
    '<rect width="1440" height="940" fill="#f5f7f6"/>',
    text(50,48,'BREAD / CONNECTIONS TO WIRING',13,'#56716a','letter-spacing="2"'),
    text(50,88,c.title,30,'#173b35','font-weight="700"'),
    text(50,115,multi ? 'Uno R3 · 3 × 220Ω resistors · 3 × red LEDs · one shared ground' : 'Uno R3 · 220Ω resistor · 5mm red LED',16),
    '<rect x="1170" y="47" width="218" height="37" rx="18" fill="#d9eee3"/>',
    text(1279,71,'NETS VERIFIED',13,'#236247','text-anchor="middle" font-weight="700"'),
    `<path d="${outline}" fill="#087e89" stroke="#05616a" stroke-width="3"/>`,
    '<rect x="53" y="297" width="84" height="94" rx="5" fill="#becbd0" stroke="#657781" stroke-width="3"/><rect x="49" y="312" width="22" height="64" rx="2" fill="#5b6870"/>',
    text(96,415,'USB',12,'white','text-anchor="middle"'),
    '<rect x="58" y="493" width="73" height="57" rx="5" fill="#253339"/><ellipse cx="66" cy="521" rx="12" ry="22" fill="#121c20"/>',
    '<rect x="324" y="447" width="157" height="61" rx="4" fill="#202b31"/>',
    text(402,481,'ATmega328P',14,'#d5e0df','text-anchor="middle"'),
    '<rect x="180" y="363" width="49" height="48" rx="2" fill="#263239"/>',
    '<rect x="152" y="458" width="26" height="43" rx="10" fill="#b6c4c8"/>',
    '<circle cx="203" cy="495" r="14" fill="#bbc5c5" stroke="#334d56" stroke-width="4"/>',
    '<rect x="100" y="253" width="35" height="24" rx="3" fill="#bdc8c9"/><circle cx="117" cy="265" r="7" fill="#a22d39"/>',
    text(302,368,'UNO R3',34,'white','font-weight="700"'),
    text(302,393,'TOP VIEW · USB LEFT',12,'#c5eeee')
  ];
  for (const [x,y] of [[86,283],[514,279],[516,540],[94,579]]) out.push(`<circle cx="${x}" cy="${y}" r="10" fill="#d7e1d8"/><circle cx="${x}" cy="${y}" r="6" fill="#f5f7f6"/>`);
  for (const pin of [...upperHeader,...lowerHeader]) {
    const pt = unoPins[pin], top = upperHeader.includes(pin), active = branches.some(b=>b.signal.split('.')[1]===pin) || pin === 'GND1';
    out.push(`<rect x="${pt.x-8}" y="${pt.y-10}" width="16" height="20" fill="#202d32"/>`,
      `<rect id="uno-${pin}" x="${pt.x-3}" y="${pt.y-3}" width="6" height="6" fill="#0a1114" stroke="${active ? '#f8dd77' : '#6d7d83'}"/>`,
      text(pt.x, top ? pt.y+24 : pt.y-18, pin === 'GND1' || pin === 'GND2' || pin === 'GND3' ? 'GND' : pin, 9, '#efffff', `text-anchor="middle" transform="rotate(-60 ${pt.x} ${top?pt.y+24:pt.y-18})"`));
  }
  out.push(text(70,642,`${c.uno} · Arduino Uno R3`,20,'#173b35','font-weight="700"'),
    text(70,669,'GND / GND1 = socket between AREF and D13',14),
    text(70,692,'The physical socket stays fixed when the signal pin changes.',13,'#5b6d72'),
    `<rect x="${b.x}" y="${b.y}" width="274" height="566" rx="12" fill="#e1e5e3" stroke="#b7c3bf" stroke-width="2"/>`,
    '<rect x="744" y="213" width="246" height="534" rx="7" fill="#fbfbf6"/>',
    '<rect x="857" y="227" width="18" height="504" rx="4" fill="#d5dcd8" stroke="#b7c4be"/>');
  const usedGroups = [...new Set(Object.values(p.leads).map(holeGroup))];
  for (const group of usedGroups) {
    const [side,row] = group.split(':'), a = holePoint(`${side==='AE'?'A':'F'}${row}`), z = holePoint(`${side==='AE'?'E':'J'}${row}`);
    out.push(`<rect x="${a.x-7}" y="${a.y-6}" width="${z.x-a.x+14}" height="12" rx="6" fill="#bce4d9"/>`);
  }
  for (const hole of holes) {
    const pt = holePoint(hole);
    out.push(`<rect id="hole-${hole}" x="${pt.x-2.6}" y="${pt.y-2.6}" width="5.2" height="5.2" rx="1" fill="#7b8685"><title>${hole}</title></rect>`);
  }
  for (const col of b.columns) out.push(text(holePoint(`${col}1`).x,229,col,11,'#65736c','text-anchor="middle"'));
  for (let row=1;row<=30;row++) out.push(text(759,holePoint(`A${row}`).y+4,String(row),10,'#65736c','text-anchor="end"'));
  out.push(text(731,794,'Automatic breadboard placement',19,'#173b35','font-weight="700"'));
  for (const wire of wires) {
    const path = wire.points.map((pt,i)=>`${i?'L':'M'} ${pt.x} ${pt.y}`).join(' ');
    out.push(`<g data-wire-pin="${esc(wire.pin)}" data-wire-hole="${wire.hole}"><path d="${path}" fill="none" stroke="#f5f7f6" stroke-width="9" stroke-linejoin="round"/><path d="${path}" fill="none" stroke="${wire.color}" stroke-width="5" stroke-linejoin="round"/><title>${esc(wire.pin)} to ${wire.hole}</title></g>`);
    for (const pt of [wire.points[0], wire.points.at(-1)!]) out.push(ring(pt.x,pt.y,wire.color));
    if (!wire.pin.startsWith('breadboard.')) out.push(text(multi && wire.pin.endsWith('.GND1') ? 70 : wire.points[0].x+7,wire.points[1].y-9,`${wire.pin} → ${wire.hole}`,14,wire.color,'font-weight="700"'));
  }
  for (const branch of branches) {
  const r1 = holePoint(p.leads[branch.resistorInput]), r2 = holePoint(p.leads[branch.resistorOutput]);
  const ry = (r1.y+r2.y)/2;
  out.push(line(r1.x,r1.y,r2.x,r2.y,'#9ba6a6',4),
    `<rect x="${r1.x-8}" y="${ry-20}" width="16" height="40" rx="6" fill="url(#resistor)" stroke="#957340"/>`);
  for (const [dy,color] of [[-12,'#bf3030'],[-5,'#bf3030'],[3,'#84552a'],[13,'#c79c39']] as const)
    out.push(`<rect x="${r1.x-8}" y="${ry+dy}" width="16" height="3" fill="${color}"/>`);
  out.push(`<rect x="${r1.x+33}" y="${ry-12}" width="45" height="22" rx="4" fill="#fbfbf6"/>`,text(r1.x+37,ry+5,'220Ω',14,'#584227','font-weight="700"'));
  const ledPins = ['A','K'].map(pin => ({pin, hole:p.leads[`${branch.led}.${pin}`], ...holePoint(p.leads[`${branch.led}.${pin}`])}));
  const lx = ledPins[0].x, ly = Math.max(...ledPins.map(pt=>pt.y))+48;
  const leadOffset = multi ? 7 : 10;
  const upper = ledPins.reduce((a,pt)=>pt.y<a.y?pt:a), lower = ledPins.find(pt=>pt!==upper)!;
  out.push(`<path d="M ${upper.x} ${upper.y} H ${lx-leadOffset} V ${ly} M ${lower.x} ${lower.y} H ${lx+leadOffset} V ${ly}" fill="none" stroke="#99a4a5" stroke-width="3"/>`,
    `<path d="M ${lx-15} ${ly+20} V ${ly} A 15 15 0 0 1 ${lx+15} ${ly} V ${ly+20} Z" fill="url(#led)" stroke="#932a33" stroke-width="2"/>`,
    `<rect x="${lx-18}" y="${ly+17}" width="36" height="5" rx="2" fill="#b93642"/>`,
    line(upper.pin==='K'?lx-15:lx+15,ly+3,upper.pin==='K'?lx-15:lx+15,ly+16,'#512530',4),
    `<rect x="${multi?lx+85:lx-31}" y="${multi?ly-2:ly+34}" width="${multi?90:66}" height="19" rx="3" fill="#fbfbf6"/>`,
    text(multi?lx+88:lx-28,multi?ly+12:ly+48,`${branch.led} · RED`,13,'#9e2836','font-weight="700"'),
    text(lx-23,ly-22,upper.pin,12,'#9e2836','font-weight="700"'),
    text(lx+16,ly-22,lower.pin,12,'#9e2836','font-weight="700"'));
  }
  for (const [pin,hole] of Object.entries(p.leads)) {
    const pt = holePoint(hole);
    out.push(ring(pt.x,pt.y,branches.some(b=>pin.startsWith(`${b.led}.`))?'#c4464e':'#947640',`data-lead="${esc(pin)}" data-hole="${hole}"`));
  }
  if (multi) {
    out.push('<rect x="1040" y="200" width="350" height="590" rx="12" fill="white" stroke="#d7dfdb"/>',
      text(1064,235,'THREE BRANCHES / ONE GROUND',13,'#517366','font-weight="700"'));
    branches.forEach((branch,i)=>{
      const y=273+i*107, pin=branch.signal.split('.')[1];
      out.push(text(1064,y,`${pin} → ${branch.resistor} → ${branch.led}`,18,'#173b35','font-weight="700"'),
        text(1064,y+25,`${branch.signal} → ${p.jumpers[i].hole}`,14),
        text(1064,y+47,`${branch.resistor} 220Ω: 1 → ${p.leads[`${branch.resistor}.1`]} / 2 → ${p.leads[`${branch.resistor}.2`]}`,14),
        text(1064,y+69,`${branch.led}: A → ${p.leads[`${branch.led}.A`]} / K → ${p.leads[`${branch.led}.K`]}`,14,'#a12e39'));
    });
    out.push(line(1064,573,1363,573,'#dbe2df'),text(1064,601,'SHARED GROUND',14,'#173b35','font-weight="700"'),
      text(1064,628,`${c.uno}.GND1 → ${p.jumpers.at(-1)!.hole} (one wire)`,14),
      text(1064,653,(p.links??[]).map(l=>`${l.fromHole} → ${l.toHole}`).join('   /   '),14),
      text(1064,678,'Two jumpers join the LED return strips.',13),
      text(1064,713,'A = anode (long leg); K = flat side.',13,'#a12e39'),
      text(1064,738,'Mint = connected A–E holes in one row.',13),
      text(1064,762,'Other rows and center gap stay isolated.',13));
  } else {
  out.push('<rect x="1040" y="200" width="350" height="552" rx="12" fill="white" stroke="#d7dfdb"/>',
    text(1064,235,'INSERTION GUIDE',13,'#517366','letter-spacing="1.5" font-weight="700"'),
    text(1064,266,'1  Jumper wires',18,'#173b35','font-weight="700"'));
  p.jumpers.forEach((j,i)=>out.push(text(1064,296+i*25,`${j.pin} → ${j.hole}`,15)));
  out.push(text(1064,365,`2  ${c.resistor} · 220Ω resistor`,18,'#173b35','font-weight="700"'),
    text(1064,395,`Lead 1 → ${p.leads[`${c.resistor}.1`]}    Lead 2 → ${p.leads[`${c.resistor}.2`]}`,15),
    text(1064,436,`3  ${c.led} · red LED`,18,'#173b35','font-weight="700"'),
    text(1064,466,`A (anode, long leg) → ${p.leads[`${c.led}.A`]}`,15,'#a12e39'),
    text(1064,492,`K (cathode, flat side) → ${p.leads[`${c.led}.K`]}`,15,'#a12e39'),
    text(1064,523,'Leads gently bent; body shown raised.',12,'#657873'),
    line(1064,546,1363,546,'#dbe2df'),
    text(1064,574,'Inside the breadboard',17,'#173b35','font-weight="700"'),
    text(1064,603,'Mint bands show connected holes:',14),
    text(1064,628,'A–E share each numbered row.',14),
    text(1064,652,'F–J share each numbered row.',14),
    text(1064,681,'Rows and center gap are isolated.',14),
    text(1064,710,'No power rails in this fixed model.',13,'#657873'));
  }
  out.push(
    '<rect x="50" y="827" width="1340" height="75" rx="10" fill="#e9eeeb"/>',
    text(70,855,multi ? '7 verified nets · 3 independent signal branches · 1 shared ground · 6 jumper wires' : '3 electrical nets · 2 jumper wires · internal strip joins resistor to LED',16,'#294b40','font-weight="700"'),
    text(70,881,c.warnings.length ? c.warnings[0] : 'Polarity preserved · no manual coordinates or hole addresses in the input · standalone SVG',14,c.warnings.length?'#a12e39':'#50665c'),
    text(50,927,'Board geometry: Arduino UNO R3 (A000066), adapted. Illustrations: CC BY-SA 4.0 · Bread PoC 0.1',11,'#657873'),
    '</g></svg>');
  return out.join('\n')+'\n';
}
