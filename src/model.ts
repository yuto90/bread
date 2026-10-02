export class BreadError extends Error {
  code: string;
  line?: number;
  constructor(code: string, message: string, line?: number) {
    super(message); this.name = 'BreadError'; this.code = code; this.line = line;
  }
}
export function fail(code: string, message: string, line?: number): never {
  throw new BreadError(code, message, line);
}
export type Part = { id: string; type: string; value?: string; line: number };
export type Connection = { from: string; to: string; line: number };
export type Circuit = { title: string; parts: Part[]; connections: Connection[] };
export type Netlist = string[][];
export type Point = { x: number; y: number };
export type Placement = {
  leads: Record<string, string>;
  jumpers: { pin: string; hole: string }[];
  links?: { fromHole: string; toHole: string }[];
};
export type Branch = {
  resistor: string; led: string; signal: string;
  resistorInput: string; resistorOutput: string; ledInput: string; ledGround: string;
};
export type Resolved = Circuit & Branch & {
  uno: string;
  mixed?: boolean;
  branches?: Branch[];
  warnings: string[];
};
export const branchesOf = (c: Resolved): Branch[] => c.branches ?? [c];
