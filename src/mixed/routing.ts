import type { Placement, Point, Resolved } from "../model.ts";
import { fail } from "../model.ts";
import { routingBodies, wireSpecs } from "./routing-scene.ts";
import type { Body, MixedWire, WireSpec } from "./routing-scene.ts";
import { verifyRoutes } from "./routing-verify.ts";
export { boardPoint, unoPoint } from "./routing-scene.ts";
export type { MixedWire } from "./routing-scene.ts";

const inside = (p: Point, b: Body) =>
  p.x >= b.left && p.x <= b.right && p.y >= b.top && p.y <= b.bottom;
const same = (a: Point, b: Point) => a.x === b.x && a.y === b.y;
const on = (p: Point, a: Point, b: Point) =>
  p.x >= Math.min(a.x, b.x) &&
  p.x <= Math.max(a.x, b.x) &&
  p.y >= Math.min(a.y, b.y) &&
  p.y <= Math.max(a.y, b.y);
function compact(points: Point[]): Point[] {
  const result: Point[] = [];
  for (const p of points) {
    if (result.length && same(result.at(-1)!, p)) continue;
    while (result.length > 1) {
      const a = result.at(-2)!,
        b = result.at(-1)!;
      if (
        (a.x === b.x && b.x === p.x && on(b, a, p)) ||
        (a.y === b.y && b.y === p.y && on(b, a, p))
      )
        result.pop();
      else break;
    }
    result.push(p);
  }
  return result;
}
function ports(p: Point, bodies: Body[], uno = false): Point[] {
  const containing = bodies.filter((b) => inside(p, b));
  const options = [
    { x: Math.min(p.x - 8, ...containing.map((b) => b.left - 2)), y: p.y },
    { x: Math.max(p.x + 8, ...containing.map((b) => b.right + 2)), y: p.y },
    { x: p.x, y: Math.min(p.y - 8, ...containing.map((b) => b.top - 2)) },
    { x: p.x, y: Math.max(p.y + 8, ...containing.map((b) => b.bottom + 2)) },
  ];
  return uno ? [options[p.y < 500 ? 2 : 3]] : options;
}
type Candidate = { points: Point[]; length: number; bends: number };
function candidates(
  spec: WireSpec,
  specs: WireSpec[],
  bodies: Body[],
): Candidate[] {
  const paths = new Map<string, Candidate>();
  const xs = [
    30,
    570,
    610,
    650,
    690,
    720,
    750,
    1160,
    1180,
    ...bodies.flatMap((b) => [b.left - 8, b.right + 8]),
  ];
  const ys = [
    145,
    175,
    205,
    1060,
    1120,
    1195,
    ...bodies.flatMap((b) => [b.top - 8, b.bottom + 8]),
  ];
  for (const a of ports(spec.a, bodies, spec.from.includes(".")))
    for (const b of ports(spec.b, bodies)) {
      const options: Point[][] = [
        [a, { x: a.x, y: b.y }, b],
        [a, { x: b.x, y: a.y }, b],
        ...xs.map((x) => [a, { x, y: a.y }, { x, y: b.y }, b]),
        ...ys.map((y) => [a, { x: a.x, y }, { x: b.x, y }, b]),
      ];
      for (const middle of options) {
        const points = compact([spec.a, ...middle, spec.b]);
        const key = JSON.stringify(points);
        if (paths.has(key)) continue;
        let valid = !points.some(
            (p, i) =>
              i > 1 &&
              ((p.x === points[i - 1].x && p.x === points[i - 2].x) ||
                (p.y === points[i - 1].y && p.y === points[i - 2].y)),
          ),
          length = 0;
        for (let i = 1; i < points.length && valid; i++) {
          const u = points[i - 1],
            v = points[i];
          length += Math.abs(u.x - v.x) + Math.abs(u.y - v.y);
          if (
            [u, v].some(
              (p) => p.x < 15 || p.x > 1185 || p.y < 135 || p.y > 1205,
            )
          )
            valid = false;
          if (
            specs.some(
              (other) =>
                other !== spec && [other.a, other.b].some((p) => on(p, u, v)),
            )
          )
            valid = false;
          for (const body of bodies) {
            if (
              Math.max(u.x, v.x) < body.left ||
              Math.min(u.x, v.x) > body.right ||
              Math.max(u.y, v.y) < body.top ||
              Math.min(u.y, v.y) > body.bottom
            )
              continue;
            if (
              !(
                body.terminalEscape &&
                ((i === 1 && inside(u, body) && !inside(v, body)) ||
                  (i === points.length - 1 &&
                    inside(v, body) &&
                    !inside(u, body)))
              )
            )
              valid = false;
          }
          for (let j = 1; j < i - 1; j++)
            if (intersect(u, v, points[j - 1], points[j]) !== 0) valid = false;
        }
        if (valid) paths.set(key, { points, length, bends: points.length - 2 });
      }
    }
  return [...paths.values()].sort(
    (a, b) => a.length - b.length || a.bends - b.bends,
  );
}
// 0 = disjoint, 1 = point crossing, 2 = collinear overlap.
function intersect(a: Point, b: Point, c: Point, d: Point): number {
  const dx =
    Math.min(Math.max(a.x, b.x), Math.max(c.x, d.x)) -
    Math.max(Math.min(a.x, b.x), Math.min(c.x, d.x));
  const dy =
    Math.min(Math.max(a.y, b.y), Math.max(c.y, d.y)) -
    Math.max(Math.min(a.y, b.y), Math.min(c.y, d.y));
  return dx < 0 || dy < 0 ? 0 : dx > 0 || dy > 0 ? 2 : 1;
}
function score(candidate: Candidate, others: Candidate[]): number {
  let crossings = 0;
  for (const other of others)
    for (let i = 1; i < candidate.points.length; i++)
      for (let j = 1; j < other.points.length; j++) {
        const a = candidate.points[i - 1],
          b = candidate.points[i],
          c = other.points[j - 1],
          d = other.points[j];
        if (
          a.x === b.x &&
          c.x === d.x &&
          Math.abs(a.x - c.x) < 6 &&
          Math.min(Math.max(a.y, b.y), Math.max(c.y, d.y)) >
            Math.max(Math.min(a.y, b.y), Math.min(c.y, d.y))
        )
          return Infinity;
        if (
          a.y === b.y &&
          c.y === d.y &&
          Math.abs(a.y - c.y) < 6 &&
          Math.min(Math.max(a.x, b.x), Math.max(c.x, d.x)) >
            Math.max(Math.min(a.x, b.x), Math.min(c.x, d.x))
        )
          return Infinity;
        const kind = intersect(a, b, c, d);
        if (kind === 2) return Infinity;
        crossings += kind;
      }
  return crossings * 10000 + candidate.bends * 10 + candidate.length * 0.01;
}
// Finite candidate graph, eight fixed orders and two rip-up/reroute passes.
// No input-specific route map, randomness, elapsed-time cutoff or unbounded loop.
export function routeMixed(p: Placement, c: Resolved): MixedWire[] {
  const specs = wireSpecs(p),
    bodies = routingBodies(c, p);
  if (specs.length > 24)
    fail("E_ROUTING_FAILED", "Mixed router supports at most 24 wires");
  const choices = specs.map((s) => candidates(s, specs, bodies));
  if (choices.some((cs) => !cs.length))
    fail("E_ROUTING_FAILED", "No body-clear terminal escape corridor");
  const indices = specs
      .map((_, i) => i)
      .sort(
        (i, j) =>
          specs[i].a.x - specs[j].a.x ||
          specs[i].a.y - specs[j].a.y ||
          specs[i].b.x - specs[j].b.x ||
          specs[i].b.y - specs[j].b.y,
      ),
    distance = (i: number) =>
      Math.abs(specs[i].a.x - specs[i].b.x) +
      Math.abs(specs[i].a.y - specs[i].b.y);
  const orders = [
    specs.map((_, i) => i),
    specs.map((_, i) => i).reverse(),
    indices,
    [...indices].reverse(),
    [...indices].sort(
      (a, b) =>
        distance(b) - distance(a) || indices.indexOf(a) - indices.indexOf(b),
    ),
    [...indices].sort(
      (a, b) =>
        distance(a) - distance(b) || indices.indexOf(a) - indices.indexOf(b),
    ),
  ];
  orders.push(
    [...indices].sort((a, b) => choices[a].length - choices[b].length || a - b),
    [...indices].sort((a, b) => choices[b].length - choices[a].length || a - b),
  );
  let best: MixedWire[] | undefined,
    bestScore = Infinity;
  for (const order of orders) {
    const selected = new Map<number, Candidate>();
    const choose = (i: number) => {
      let best: Candidate | undefined,
        value = Infinity;
      for (const candidate of choices[i]) {
        const next = score(candidate, [...selected.values()]);
        if (next < value) {
          best = candidate;
          value = next;
        }
      }
      return best;
    };
    for (const i of order) {
      const pick = choose(i);
      if (!pick) break;
      selected.set(i, pick);
    }
    if (selected.size !== specs.length) continue;
    for (let pass = 0; pass < 2; pass++)
      for (const i of order) {
        const previous = selected.get(i)!;
        selected.delete(i);
        selected.set(i, choose(i) ?? previous);
      }
    const wires = specs.map((s, i) => ({
      from: s.from,
      to: s.to,
      color: s.color,
      points: selected.get(i)!.points,
    }));
    const result = verifyRoutes(wires, specs, bodies),
      value =
        result.crossings * 10000 + result.bends * 10 + result.length * 0.01;
    if (value < bestScore) {
      best = wires;
      bestScore = value;
    }
  }
  if (!best)
    fail(
      "E_ROUTING_FAILED",
      "No non-overlapping route within the bounded mixed search",
    );
  return best;
}
