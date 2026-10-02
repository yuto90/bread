import { readFileSync } from 'node:fs';
import { compile } from '../src/index.ts';
import { BreadError } from '../src/model.ts';
import { parse } from '../src/parser/index.ts';
import { placeMixed } from '../src/mixed/placement.ts';
import { routeMixed } from '../src/mixed/routing.ts';
import { inspectRoutes } from '../src/mixed/routing-verify.ts';
import { routingBodies, wireSpecs } from '../src/mixed/routing-scene.ts';

const example = (name: string) => readFileSync(new URL(`../examples/${name}.bread`, import.meta.url), 'utf8');
const metrics = ['diode-led', 'diode-decoupling'].map(sample => {
  const r = compile(example(sample)), p = r.placement;
  const quality = inspectRoutes(routeMixed(p, r.circuit), wireSpecs(p), routingBodies(r.circuit, p));
  return {
    sample, parts: r.circuit.parts.length, pins: Object.keys(p.leads).length,
    nets: r.actual.length, unoJumpers: p.jumpers.length, links: (p.links ?? []).length,
    occupiedHoles: Object.keys(p.leads).length + p.jumpers.length + 2 * (p.links ?? []).length,
    crossings: quality.crossings, violations: quality.violations, placement: p,
  };
});

// Deliberately bypass the public semantic family (at most one capacitor).
// This observes the finite first-fit placer only, not supported circuit capacity.
const base = example('diode-decoupling'), resolved = compile(base).circuit;
let firstFailure: { bypassCount: number; code: string; message: string } | undefined;
for (let count = 1; count <= 30; count++) {
  let source = base;
  for (let i = 2; i <= count; i++) source += `\npart cap${i}: capacitor-c315c104 [value=100nF]\nuno.5V -- cap${i}.1\ncap${i}.2 -- uno.GND`;
  try {
    placeMixed({ ...resolved, ...parse(source.replaceAll('uno.GND', 'uno.GND1')) });
  } catch (error) {
    if (!(error instanceof BreadError) || error.code !== 'E_PLACEMENT_CAPACITY') throw error;
    firstFailure = { bypassCount: count, code: error.code, message: error.message };
    break;
  }
}
console.log(JSON.stringify({ metrics, unsupportedPlacementStressFirstFailure: firstFailure }, null, 2));
