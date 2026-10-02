import { breadboard as b } from '../../parts/breadboard/index.ts';
import { fail } from '../model.ts';
import type { Point } from '../model.ts';
export function decodeHole(hole: string): { column: number; row: number } {
  const m = hole.match(/^([A-J])([1-9]|[12][0-9]|30)$/);
  if (!m) fail('E_PLACEMENT_FAILED', `Invalid breadboard hole ${hole}`);
  return { column: b.columns.indexOf(m[1]), row: Number(m[2]) };
}
export function holeGroup(hole: string): string {
  const h = decodeHole(hole);
  return `${h.column < 5 ? 'AE' : 'FJ'}:${h.row}`;
}
export function holePoint(hole: string): Point {
  const h = decodeHole(hole);
  return { x: b.holeX + h.column * b.pitch + (h.column >= 5 ? b.gap : 0), y: b.holeY + (h.row - 1) * b.pitch };
}
export const holes = Array.from({ length: b.rows }, (_, i) => [...b.columns].map(c => `${c}${i + 1}`)).flat();
