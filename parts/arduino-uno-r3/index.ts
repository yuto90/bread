// Top view, USB at left. Coordinates extracted from official UNO-TH_Rev3e.brd
// (A000066 CAD archive); pad transforms applied, mm scaled by 7 and Y flipped.
// Source attribution and extraction evidence: docs/hardware-sources.md.
import type { Point } from '../../src/model.ts';
export const board = { x: 70, y: 230, width: 480.06, height: 373.38 };
export const upperHeader = ['SCL', 'SDA', 'AREF', 'GND1', 'D13', 'D12', 'D11', 'D10', 'D9', 'D8', 'D7', 'D6', 'D5', 'D4', 'D3', 'D2', 'D1', 'D0'];
export const lowerHeader = ['NC', 'IOREF', 'RESET', '3V3', '5V', 'GND2', 'GND3', 'VIN', 'A0', 'A1', 'A2', 'A3', 'A4', 'A5'];
export function fromCad(x: number, y: number): Point {
  return { x: Number((board.x+x*7).toFixed(3)), y: Number((board.y+(53.34-y)*7).toFixed(3)) };
}
export const unoPins: Record<string, Point> = Object.fromEntries([
  ...upperHeader.map((pin, i) => [pin, fromCad(i < 10 ? 18.796+i*2.54 : 45.72+(i-10)*2.54, 50.8)]),
  ...lowerHeader.map((pin, i) => [pin, fromCad(i < 8 ? 27.94+i*2.54 : 50.8+(i-8)*2.54, 2.54)])
]);
export const canonicalPin = (pin: string): string => pin === 'GND' ? 'GND1' : pin;
