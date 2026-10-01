import type { Circuit, Netlist } from '../model.ts';

export class UnionFind {
  private parent = new Map<string, string>();
  find(x: string): string {
    if (!this.parent.has(x)) this.parent.set(x, x);
    const p = this.parent.get(x)!;
    if (p !== x) this.parent.set(x, this.find(p));
    return this.parent.get(x)!;
  }
  union(a: string, b: string): void { this.parent.set(this.find(a), this.find(b)); }
  groups(terminals: string[]): Netlist {
    const groups = new Map<string, string[]>();
    for (const t of [...new Set(terminals)].sort()) {
      const root = this.find(t);
      groups.set(root, [...(groups.get(root) ?? []), t]);
    }
    return [...groups.values()].sort((a, b) => a.join('|') < b.join('|') ? -1 : 1);
  }
}
export function terminals(circuit: Circuit): string[] {
  return [...new Set(circuit.connections.flatMap(c => [c.from, c.to]))].sort();
}
export function logicalNetlist(circuit: Circuit): Netlist {
  const uf = new UnionFind();
  for (const c of circuit.connections) uf.union(c.from, c.to);
  // Never union through a resistor or LED body.
  return uf.groups(terminals(circuit));
}
