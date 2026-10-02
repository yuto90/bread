import { fail } from '../model.ts';
import type { Circuit } from '../model.ts';

// Strip comments only outside quoted strings. No expressions or layout language.
function uncomment(line: string): string {
  let quoted = false, escaped = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (!quoted && c === '/' && line[i + 1] === '/') return line.slice(0, i).trim();
    if (c === '"' && !escaped) quoted = !quoted;
    escaped = c === '\\' && !escaped;
  }
  return line.trim();
}
export function parse(source: string): Circuit {
  const circuit: Circuit = { title: 'Arduino LED', parts: [], connections: [] };
  let header = false, title = false;
  for (const [index, raw] of source.replace(/^\uFEFF/, '').split(/\r?\n/).entries()) {
    const line = index + 1, text = uncomment(raw);
    if (!text) continue;
    if (!header) {
      if (text !== 'bread 0.1') fail('E_SYNTAX', 'First statement must be bread 0.1', line);
      header = true; continue;
    }
    let m: RegExpMatchArray | null;
    if ((m = text.match(/^title\s+("(?:[^"\\]|\\.)*")$/))) {
      if (title) fail('E_SYNTAX', 'Only one title is allowed', line);
      try { circuit.title = JSON.parse(m[1]); } catch { fail('E_SYNTAX', 'Invalid quoted title', line); }
      if (circuit.title.length > 64 || /[\x00-\x1f\x7f]/.test(circuit.title)) fail('E_SYNTAX', 'Title must be at most 64 printable characters', line);
      if (/[\uD800-\uDFFF\uFFFE\uFFFF]/u.test(circuit.title)) fail('E_SVG_TEXT', 'Title contains a character XML cannot represent', line);
      title = true;
    } else if ((m = text.match(/^part\s+([A-Za-z][A-Za-z0-9_]{0,23}):\s*([a-z][a-z0-9-]*)(?:\s+\[([^\]]*)\])?$/))) {
      let value: string | undefined;
      if (m[3] !== undefined) {
        const attribute = m[3].match(/^value=([A-Za-z0-9]+)$/);
        if (!attribute) fail('E_ATTRIBUTE', 'Only one [value=...] attribute is supported', line);
        value = attribute[1];
      }
      circuit.parts.push({ id: m[1], type: m[2], value, line });
    } else if ((m = text.match(/^([A-Za-z][A-Za-z0-9_]{0,23}\.[A-Za-z0-9]+)\s*--\s*([A-Za-z][A-Za-z0-9_]{0,23}\.[A-Za-z0-9]+)$/))) {
      circuit.connections.push({ from: m[1], to: m[2], line });
    } else fail('E_SYNTAX', 'Expected title, part, or pin -- pin; layout directives are not supported', line);
  }
  if (!header) fail('E_SYNTAX', 'Missing bread 0.1');
  return circuit;
}
