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
};
export type Resolved = Circuit & {
  uno: string; resistor: string; led: string; signal: string;
  resistorInput: string; resistorOutput: string; ledInput: string; ledGround: string;
  warnings: string[];
};
