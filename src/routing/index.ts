import { unoPins } from '../../parts/arduino-uno-r3/index.ts';
import { holePoint } from '../breadboard/index.ts';
import type { Placement, Point } from '../model.ts';
export type Wire = { pin: string; hole: string; color: string; points: Point[] };
export function route(physical: Placement): Wire[] {
  const multi = physical.jumpers.length > 2, large = physical.jumpers.length > 4;
  return physical.jumpers.map((j,i) => {
    const pin = j.pin.split('.')[1], from = unoPins[pin], to = holePoint(j.hole);
    const ground = pin === 'GND1';
    // Ground wraps outside the Uno; signal uses the upper/right corridor.
    // This avoids both a crossing and a wire across the board's components.
    const points = ground
      ? [from, {x:from.x,y:142}, {x:25,y:142}, {x:25,y:740}, {x:650,y:740}, {x:650,y:to.y}, to]
      : i>=3 ? [from,{x:from.x,y:140+i*16},{x:1030+(i-3)*16,y:140+i*16},{x:1030+(i-3)*16,y:to.y},to]
      : multi ? [from,{x:from.x,y:(large?140+i*16:153+i*30)},{x:710-i*20,y:(large?140+i*16:153+i*30)},{x:710-i*20,y:to.y},to]
      : [from, {x:from.x,y:177}, {x:690,y:177}, {x:690,y:to.y}, to];
    return { ...j, color: ground ? '#26313b' : multi ? ['#d79a08','#238368','#536bc3','#a255a1','#c36c26','#277f9a'][i] : '#d79a08', points };
  });
}

export function routeLinks(physical: Placement): Wire[] {
  return (physical.links??[]).map((link,i)=>{
    const from=holePoint(link.fromHole),to=holePoint(link.toHole),lane=i<2 ? 866+i*16 : 978+(i-3)*16;
    if(i===2) return {pin:`breadboard.${link.fromHole}`,hole:link.toHole,color:'#26313b',points:[from,{x:850,y:from.y},{x:850,y:770},{x:1010,y:770},{x:1010,y:to.y},{x:to.x,y:to.y}]};
    return {pin:`breadboard.${link.fromHole}`,hole:link.toHole,color:'#26313b',
      points:i>=3 ? [from,{x:from.x,y:from.y+8},{x:lane,y:from.y+8},{x:lane,y:to.y-8},{x:to.x,y:to.y-8},to] : [from,{x:lane,y:from.y},{x:lane,y:to.y-8},{x:to.x,y:to.y-8},to]};
  });
}
