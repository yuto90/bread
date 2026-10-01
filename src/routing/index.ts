import { unoPins } from '../../parts/arduino-uno-r3/index.ts';
import { holePoint } from '../breadboard/index.ts';
import type { Placement, Point } from '../model.ts';
export type Wire = { pin: string; hole: string; color: string; points: Point[] };
export function route(physical: Placement): Wire[] {
  return physical.jumpers.map(j => {
    const pin = j.pin.split('.')[1], from = unoPins[pin], to = holePoint(j.hole);
    const ground = pin === 'GND1';
    // Ground wraps outside the Uno; signal uses the upper/right corridor.
    // This avoids both a crossing and a wire across the board's components.
    const points = ground
      ? [from, {x:from.x,y:142}, {x:25,y:142}, {x:25,y:740}, {x:650,y:740}, {x:650,y:to.y}, to]
      : [from, {x:from.x,y:177}, {x:690,y:177}, {x:690,y:to.y}, to];
    return { ...j, color: ground ? '#26313b' : '#d79a08', points };
  });
}
