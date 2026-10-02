import type { Placement, Point, Resolved } from "../model.ts";
import { holePoint } from "../breadboard/index.ts";
import { unoPins } from "../../parts/arduino-uno-r3/index.ts";
import { mixedPins } from "./parts.ts";
import { diode } from '../../parts/diode-1n4148/index.ts';
import { capacitor } from '../../parts/capacitor-c315c104/index.ts';
const drawingUnitsPerMm=24/2.54;

export const boardPoint = (hole: string): Point => {
  const p = holePoint(hole);
  return { x: 790 + (p.x - 778) * 1.5, y: 270 + (p.y - 244) * 1.5 };
};
export const unoPoint = (pin: string): Point => ({
  ...unoPins[pin],
  y: unoPins[pin].y + 80,
});
export type Body = {
  id: string;
  terminalEscape?: boolean;
  left: number;
  right: number;
  top: number;
  bottom: number;
};
export type WireSpec = {
  from: string;
  to: string;
  a: Point;
  b: Point;
  color: string;
};
export type MixedWire = {
  from: string;
  to: string;
  color: string;
  points: Point[];
};
export const WIRE_BODY_CLEARANCE = 6;
// These are the visible raised/cutaway body bounds in renderer.ts, not physical
// assembly envelopes. Six SVG units reserve the wire halo plus a small gap.
export function routingBodies(c: Resolved, p: Placement): Body[] {
  const bodies = c.parts
    .filter((part) => part.id !== c.uno)
    .map((part) => {
      const points = mixedPins[part.type].map((pin) =>
        boardPoint(p.leads[`${part.id}.${pin}`]),
      );
      const a = points[0],
        last = points.at(-1)!;
      let box: Omit<Body, "id">;
      if (part.type === "resistor") {
        const y = (a.y + last.y) / 2;
        box = { left: a.x - 10, right: a.x + 10, top: y - 28, bottom: y + 28 };
      } else if (part.type === diode.type || part.type === capacitor.type) {
        const mid=(a.y+last.y)/2;
        const halfX=(part.type===diode.type?diode.bodyDiameterMm:capacitor.bodyThicknessMm)*drawingUnitsPerMm/2;
        const halfY=(part.type===diode.type?diode.bodyLengthMm:capacitor.bodyLengthMm)*drawingUnitsPerMm/2;
        // Outward 0.001-unit rounding encloses Chromium's float32 SVG bounds.
        // Keep the full six-unit clearance even at fractional package sizes.
        box={left:Math.floor((a.x-halfX)*1000)/1000,right:Math.ceil((a.x+halfX)*1000)/1000,
          top:Math.floor((mid-halfY)*1000)/1000,bottom:Math.ceil((mid+halfY)*1000)/1000};
      } else if (part.type === "led-5mm-red") {
        const y = last.y + 55;
        box = { left: a.x - 18, right: a.x + 18, top: y - 18, bottom: y + 23 };
      } else if (part.type === "pushbutton-b3f1000-formed") {
        box = {
          left: a.x + 7,
          right: points[1].x - 7,
          top: a.y - 2,
          bottom: points[2].y + 2,
        };
      } else if (part.type === "potentiometer-3296w") {
        box = {
          left: a.x - 23,
          right: a.x + 23,
          top: a.y - 20,
          bottom: last.y + 20,
        };
      } else {
        box = {
          left: a.x - 104,
          right: a.x - 16,
          top: a.y - 28,
          bottom: a.y + 102,
        };
      }
      return {
        id: part.id,
        terminalEscape: true,
        left: box.left - WIRE_BODY_CLEARANCE,
        right: box.right + WIRE_BODY_CLEARANCE,
        top: box.top - WIRE_BODY_CLEARANCE,
        bottom: box.bottom + WIRE_BODY_CLEARANCE,
      };
    });
  // Board/connector drawing bounds; source socket escape is vertical only.
  const leads = Object.entries(p.leads).map(([pin, hole]) => {
    const point = boardPoint(hole);
    return {
      id: `lead:${pin}`,
      left: point.x - 6,
      right: point.x + 6,
      top: point.y - 6,
      bottom: point.y + 6,
    };
  });
  return [
    {
      id: c.uno,
      terminalEscape: true,
      left: 44,
      right: 557,
      top: 304,
      bottom: 690,
    },
    ...bodies,
    ...leads,
  ].sort(
    (a, b) =>
      a.left - b.left ||
      a.top - b.top ||
      a.right - b.right ||
      a.bottom - b.bottom ||
      a.id.localeCompare(b.id),
  );
}
export function wireSpecs(p: Placement): WireSpec[] {
  return [
    ...p.jumpers.map((j, i) => {
      const pin = j.pin.split(".")[1];
      return {
        from: j.pin,
        to: j.hole,
        a: unoPoint(pin),
        b: boardPoint(j.hole),
        color:
          pin === "5V"
            ? "#d15147"
            : pin === "GND1"
              ? "#34424a"
              : ["#536bc3", "#a4609c", "#358878", "#c08b23"][i % 4],
      };
    }),
    ...(p.links ?? []).map((l) => ({
      from: l.fromHole,
      to: l.toHole,
      a: boardPoint(l.fromHole),
      b: boardPoint(l.toHole),
      color: "#627b75",
    })),
  ];
}
