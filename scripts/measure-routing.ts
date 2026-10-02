import { readFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import { compile } from "../src/index.ts";
import { routeMixed } from "../src/mixed/routing.ts";
import { routingBodies, wireSpecs } from "../src/mixed/routing-scene.ts";
import { verifyRoutes } from "../src/mixed/routing-verify.ts";
import { routingCorpus } from "./routing-corpus.ts";
const baseline = JSON.parse(
  readFileSync(
    new URL("../tests/fixtures/mixed-routing-baseline.json", import.meta.url),
    "utf8",
  ),
);
const cases = routingCorpus().map((item) => {
  const r = compile(item.source),
    before = baseline.cases.find((x: { id: string }) => x.id === item.id);
  routeMixed(r.placement, r.circuit); // warmup
  const timings: number[] = [];
  let wires = routeMixed(r.placement, r.circuit);
  for (let i = 0; i < 5; i++) {
    const start = performance.now();
    wires = routeMixed(r.placement, r.circuit);
    timings.push(performance.now() - start);
  }
  timings.sort((a, b) => a - b);
  return {
    id: item.id,
    beforeCrossings: before.crossings,
    ...verifyRoutes(
      wires,
      wireSpecs(r.placement),
      routingBodies(r.circuit, r.placement),
    ),
    routeMs: {
      samples: 5,
      median: Math.round(timings[2] * 100) / 100,
      max: Math.round(timings[4] * 100) / 100,
    },
    physicalMatchesLogical:
      JSON.stringify(r.actual) === JSON.stringify(r.expected),
  };
});
console.log(
  JSON.stringify(
    {
      node: process.version,
      baselineCommit: baseline.commit,
      note: "Timing is observational, not a CI wall-clock threshold. Terminal escapes include six Uno sockets and seven exits beneath the raised sensor illustration; no assembly-clearance claim.",
      cases,
    },
    null,
    2,
  ),
);
