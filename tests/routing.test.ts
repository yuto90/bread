import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { compile } from "../src/index.ts";
import { BreadError } from "../src/model.ts";
import { routeMixed } from "../src/mixed/routing.ts";
import { inspectRoutes, verifyRoutes } from "../src/mixed/routing-verify.ts";
import { routingBodies, wireSpecs } from "../src/mixed/routing-scene.ts";
import type { Body, MixedWire, WireSpec } from "../src/mixed/routing-scene.ts";
import { route, routeLinks } from "../src/routing/index.ts";
import { routingCorpus } from "../scripts/routing-corpus.ts";
const baseline = JSON.parse(
  readFileSync(
    new URL("./fixtures/mixed-routing-baseline.json", import.meta.url),
    "utf8",
  ),
);
for (const item of routingCorpus()) {
  test(`Bounded routing: ${item.id} preserves placement and improves crossing count`, () => {
    const r = compile(item.source),
      before = baseline.cases.find((x: { id: string }) => x.id === item.id);
    const placement = JSON.stringify(r.placement);
    assert.equal(
      createHash("sha256").update(placement).digest("hex"),
      before.placementSha256,
    );
    assert.deepEqual(r.actual, r.expected);
    const wires = routeMixed(r.placement, r.circuit);
    assert.deepEqual(routeMixed(r.placement, r.circuit), wires);
    const result = verifyRoutes(
      wires,
      wireSpecs(r.placement),
      routingBodies(r.circuit, r.placement),
    );
    assert.ok(
      result.crossings < before.crossings,
      `${result.crossings} >= ${before.crossings}`,
    );
    if (item.id === "canonical") assert.ok(result.crossings < 27);
    assert.equal(JSON.stringify(r.placement), placement);
    assert.deepEqual(result.violations, []);
  });
}
test("Six-LED routing stays at 17 crossings and unchanged physical connectivity", () => {
  const r = compile(
    readFileSync(new URL("../examples/6-leds.bread", import.meta.url), "utf8"),
  );
  const wires = [...route(r.placement), ...routeLinks(r.placement)].map(
    (w) => ({ from: w.pin, to: w.hole, color: w.color, points: w.points }),
  );
  const specs = wires.map((w) => ({
    from: w.from,
    to: w.to,
    a: w.points[0],
    b: w.points.at(-1)!,
    color: w.color,
  }));
  // Only crossing metric applies here; six-LED uses a different drawing space.
  assert.equal(inspectRoutes(wires, specs, []).crossings, 17);
  assert.deepEqual(r.actual, r.expected);
});
const spec: WireSpec = {
  from: "A1",
  to: "A2",
  a: { x: 100, y: 200 },
  b: { x: 300, y: 200 },
  color: "black",
};
const wire = (points: MixedWire["points"]): MixedWire => ({
  from: spec.from,
  to: spec.to,
  color: "black",
  points,
});
const body: Body = {
  id: "body",
  terminalEscape: true,
  left: 170,
  right: 230,
  top: 180,
  bottom: 220,
};
const invalid = (w: MixedWire[], s: WireSpec[], b: Body[]) =>
  assert.throws(
    () => verifyRoutes(w, s, b),
    (e: unknown) => e instanceof BreadError && e.code === "E_ROUTING_FAILED",
  );
test("Independent verifier rejects through-body routes, wrong endpoints, diagonal and reversing segments", () => {
  invalid([wire([spec.a, spec.b])], [spec], [body]);
  invalid([wire([{ x: 90, y: 200 }, spec.b])], [spec], []);
  invalid([wire([spec.a, { x: 200, y: 210 }, spec.b])], [spec], []);
  invalid(
    [wire([spec.a, { x: 250, y: 200 }, { x: 150, y: 200 }, spec.b])],
    [spec],
    [],
  );
});
test("Only one straight terminal escape is permitted; internal turns and re-entry fail", () => {
  const s = { ...spec, a: { x: 200, y: 200 } },
    good = { ...wire([]), points: [s.a, { x: 300, y: 200 }] };
  assert.equal(verifyRoutes([good], [s], [body]).terminalEscapes, 1);
  invalid(
    [
      {
        ...good,
        points: [
          s.a,
          { x: 210, y: 200 },
          { x: 210, y: 150 },
          { x: 300, y: 150 },
          s.b,
        ],
      },
    ],
    [s],
    [body],
  );
  invalid(
    [
      {
        ...good,
        points: [
          s.a,
          { x: 200, y: 150 },
          { x: 250, y: 150 },
          { x: 250, y: 200 },
          { x: 220, y: 200 },
          { x: 220, y: 230 },
          { x: 300, y: 230 },
          s.b,
        ],
      },
    ],
    [s],
    [body],
  );
  invalid([good], [s], [{ ...body, terminalEscape: false }]);
});
test("Independent verifier rejects collinear overlap, foreign endpoints and insufficient parallel spacing", () => {
  const other: WireSpec = {
    from: "B1",
    to: "B2",
    a: { x: 150, y: 200 },
    b: { x: 250, y: 200 },
    color: "red",
  };
  invalid(
    [wire([spec.a, spec.b]), { ...other, points: [other.a, other.b] }],
    [spec, other],
    [],
  );
  const close = { ...other, a: { x: 150, y: 204 }, b: { x: 250, y: 204 } };
  invalid(
    [wire([spec.a, spec.b]), { ...close, points: [close.a, close.b] }],
    [spec, close],
    [],
  );
});
test("Router rejects an impossible scene and excessive wire budget with an explicit error", () => {
  const r = compile(routingCorpus()[0].source);
  const tooMany = structuredClone(r.placement);
  tooMany.links = Array.from({ length: 25 }, () => ({
    fromHole: "A1",
    toHole: "A2",
  }));
  assert.throws(
    () => routeMixed(tooMany, r.circuit),
    (e: unknown) => e instanceof BreadError && e.code === "E_ROUTING_FAILED",
  );
  const blocked = structuredClone(r.placement);
  // Two distinct wires demanding the same socket cannot avoid foreign endpoints.
  blocked.jumpers[1].pin = blocked.jumpers[0].pin;
  assert.throws(
    () => routeMixed(blocked, r.circuit),
    (e: unknown) => e instanceof BreadError && e.code === "E_ROUTING_FAILED",
  );
});
