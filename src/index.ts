import { parse } from './parser/index.ts';
import { resolve } from './semantic.ts';
import { logicalNetlist } from './netlist/index.ts';
import { place } from './placement/index.ts';
import { verify } from './placement/verify.ts';
import { renderSvg } from './renderer/index.ts';
export function compile(source: string) {
  const circuit = resolve(parse(source));
  const expected = logicalNetlist(circuit);
  const placement = place(circuit);
  const actual = verify(circuit, expected, placement);
  return { circuit, expected, placement, actual };
}
export function render(source: string): string {
  const result = compile(source);
  return renderSvg(result.circuit, result.placement);
}
