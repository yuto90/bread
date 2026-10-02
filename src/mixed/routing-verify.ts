import { fail } from "../model.ts";
import type { Point } from "../model.ts";
import type { Body, MixedWire, WireSpec } from "./routing-scene.ts";

const same = (a: Point, b: Point) => a.x === b.x && a.y === b.y;
const inside = (p: Point, b: Body) =>
  p.x >= b.left && p.x <= b.right && p.y >= b.top && p.y <= b.bottom;
const covers = (p: Point, a: Point, b: Point) =>
  p.x >= Math.min(a.x, b.x) &&
  p.x <= Math.max(a.x, b.x) &&
  p.y >= Math.min(a.y, b.y) &&
  p.y <= Math.max(a.y, b.y);
// Independent post-routing inspection. It consumes actual segments and bodies;
// it does not trust planner scores, candidate validity flags or expected routes.
export function inspectRoutes(
  wires: MixedWire[],
  specs: WireSpec[],
  bodies: Body[],
) {
  const violations: string[] = [],
    crossings = new Set<string>(),
    escapes = new Set<string>();
  let length = 0,
    bends = 0;
  if (wires.length !== specs.length) violations.push("wire count differs");
  for (const [i, wire] of wires.entries()) {
    const spec = specs[i],
      points = wire.points;
    if (
      !spec ||
      wire.from !== spec.from ||
      wire.to !== spec.to ||
      points.length < 2 ||
      !same(points[0], spec.a) ||
      !same(points.at(-1)!, spec.b)
    )
      violations.push(`wire ${i}: endpoints differ`);
    if (
      spec?.from.includes(".") &&
      points.length > 1 &&
      (points[0].x !== points[1].x ||
        (points[0].y < 500
          ? points[1].y >= points[0].y
          : points[1].y <= points[0].y))
    )
      violations.push(`wire ${i}: invalid Uno escape`);
    bends += Math.max(0, points.length - 2);
    for (let j = 1; j < points.length; j++) {
      const a = points[j - 1],
        b = points[j];
      if (
        ![a.x, a.y, b.x, b.y].every(Number.isFinite) ||
        same(a, b) ||
        (a.x !== b.x && a.y !== b.y)
      )
        violations.push(`wire ${i}: invalid segment`);
      if (
        j > 1 &&
        ((a.x === b.x && a.x === points[j - 2].x) ||
          (a.y === b.y && a.y === points[j - 2].y))
      )
        violations.push(`wire ${i}: redundant or reversing segment`);
      length += Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
      if ([a, b].some((p) => p.x < 15 || p.x > 1185 || p.y < 135 || p.y > 1205))
        violations.push(`wire ${i}: outside routing canvas`);
      for (const body of bodies) {
        if (
          Math.max(a.x, b.x) < body.left ||
          Math.min(a.x, b.x) > body.right ||
          Math.max(a.y, b.y) < body.top ||
          Math.min(a.y, b.y) > body.bottom
        )
          continue;
        // A terminal already under a raised body may escape on its one straight
        // first/last segment. No internal turn, through-route or re-entry allowed.
        if (
          body.terminalEscape &&
          ((j === 1 && inside(a, body) && !inside(b, body)) ||
            (j === points.length - 1 && inside(b, body) && !inside(a, body)))
        )
          escapes.add(`${i}:${body.id}`);
        else violations.push(`wire ${i}: body ${body.id}`);
      }
      for (const [k, other] of specs.entries())
        if (k !== i && [other.a, other.b].some((p) => covers(p, a, b)))
          violations.push(`wire ${i}: foreign endpoint ${k}`);
      for (let k = 1; k < j - 1; k++) {
        const c = points[k - 1],
          d = points[k];
        if (
          Math.max(Math.min(a.x, b.x), Math.min(c.x, d.x)) <=
            Math.min(Math.max(a.x, b.x), Math.max(c.x, d.x)) &&
          Math.max(Math.min(a.y, b.y), Math.min(c.y, d.y)) <=
            Math.min(Math.max(a.y, b.y), Math.max(c.y, d.y))
        )
          violations.push(`wire ${i}: self intersection`);
      }
      for (let k = 0; k < i; k++)
        for (let n = 1; n < wires[k].points.length; n++) {
          const c = wires[k].points[n - 1],
            d = wires[k].points[n];
          if (
            a.x === b.x &&
            c.x === d.x &&
            Math.abs(a.x - c.x) < 6 &&
            Math.min(Math.max(a.y, b.y), Math.max(c.y, d.y)) >
              Math.max(Math.min(a.y, b.y), Math.min(c.y, d.y))
          )
            violations.push(`wire ${i}/${k}: parallel clearance`);
          if (
            a.y === b.y &&
            c.y === d.y &&
            Math.abs(a.y - c.y) < 6 &&
            Math.min(Math.max(a.x, b.x), Math.max(c.x, d.x)) >
              Math.max(Math.min(a.x, b.x), Math.min(c.x, d.x))
          )
            violations.push(`wire ${i}/${k}: parallel clearance`);
          const x0 = Math.max(Math.min(a.x, b.x), Math.min(c.x, d.x)),
            x1 = Math.min(Math.max(a.x, b.x), Math.max(c.x, d.x));
          const y0 = Math.max(Math.min(a.y, b.y), Math.min(c.y, d.y)),
            y1 = Math.min(Math.max(a.y, b.y), Math.max(c.y, d.y));
          if (x0 <= x1 && y0 <= y1) {
            if (x0 < x1 || y0 < y1)
              violations.push(`wire ${i}/${k}: collinear overlap`);
            else crossings.add(`${k}:${i}:${x0}:${y0}`);
          }
        }
    }
  }
  return {
    crossings: crossings.size,
    length: Math.round(length * 1000) / 1000,
    bends,
    terminalEscapes: escapes.size,
    violations: [...new Set(violations)],
  };
}
export function verifyRoutes(
  wires: MixedWire[],
  specs: WireSpec[],
  bodies: Body[],
) {
  const result = inspectRoutes(wires, specs, bodies);
  if (result.violations.length) fail("E_ROUTING_FAILED", result.violations[0]);
  return result;
}
