// SPDX-License-Identifier: MIT
// Geometry data is separately licensed in geometry.ts (CC-BY-SA-4.0).
import { unoGeometry } from './geometry.ts';
import type { Point } from '../../src/model.ts';
export const board = { x: 70, y: 230, width: unoGeometry.width * 7, height: unoGeometry.height * 7 };
export const upperHeader = ['SCL', 'SDA', 'AREF', 'GND1', 'D13', 'D12', 'D11', 'D10', 'D9', 'D8', 'D7', 'D6', 'D5', 'D4', 'D3', 'D2', 'D1', 'D0'];
export const lowerHeader = ['NC', 'IOREF', 'RESET', '3V3', '5V', 'GND2', 'GND3', 'VIN', 'A0', 'A1', 'A2', 'A3', 'A4', 'A5'];
export function fromCad(x: number, y: number): Point {
  return { x: Number((board.x+x*7).toFixed(3)), y: Number((board.y+(unoGeometry.height-y)*7).toFixed(3)) };
}
export const unoPins: Record<string, Point> = Object.fromEntries([
  ...upperHeader.map((pin, i) => [pin, fromCad(i < 10 ? unoGeometry.upperStart+i*unoGeometry.pitch : unoGeometry.upperAfterGap+(i-10)*unoGeometry.pitch, unoGeometry.upperY)]),
  ...lowerHeader.map((pin, i) => [pin, fromCad(i < 8 ? unoGeometry.lowerStart+i*unoGeometry.pitch : unoGeometry.lowerAfterGap+(i-8)*unoGeometry.pitch, unoGeometry.lowerY)])
]);
export const canonicalPin = (pin: string): string => pin === 'GND' ? 'GND1' : pin;
