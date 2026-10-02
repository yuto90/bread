import { compile } from '../src/index.ts';
import { renderSvg } from '../src/renderer/index.ts';
import { BreadError } from '../src/model.ts';

export const MAX_SOURCE_LENGTH = 32_768;

export type CompileRequest = { revision: number; source: string };
export type CompileResult = { revision: number } & (
  | { ok: true; svg: string; title: string; nets: number; parts: number; warnings: string[] }
  | { ok: false; code: string; message: string; line?: number }
);

// The browser is an adapter, not another parser or renderer. Both entry points
// below are the same checked pipeline used by the CLI.
export function compilePreview({ revision, source }: CompileRequest): CompileResult {
  if (source.length > MAX_SOURCE_LENGTH) {
    return { revision, ok: false, code: 'E_SOURCE_LIMIT', message: 'Keep Playground source under 32,768 characters. The CLI is available for larger files.' };
  }
  try {
    const { circuit, placement, actual } = compile(source);
    // JSON can represent lone surrogates/noncharacters that are illegal in XML.
    // Reject them at this SVG adapter boundary without changing the CLI core.
    if (/[\uD800-\uDFFF\uFFFE\uFFFF]/u.test(circuit.title)) {
      return { revision, ok: false, code: 'E_SVG_TEXT', message: 'The title contains a character SVG cannot display. Use printable text.' };
    }
    return { revision, ok: true, svg: renderSvg(circuit, placement), title: circuit.title,
      nets: actual.length, parts: circuit.parts.length, warnings: circuit.warnings };
  } catch (error) {
    if (error instanceof BreadError) {
      return { revision, ok: false, code: error.code, message: error.message, line: error.line };
    }
    return { revision, ok: false, code: 'E_PREVIEW', message: 'Preview could not be generated. Try a sample or reload the page.' };
  }
}

export function svgFilename(title: string): string {
  const stem = title.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 64).replace(/-$/, '');
  return `${stem || 'bread-wiring'}.svg`;
}

export function lineRange(source: string, line: number): [number, number] {
  const lines = source.split('\n');
  const index = Math.max(0, Math.min(Math.floor(line) - 1, lines.length - 1));
  const start = lines.slice(0, index).reduce((sum, value) => sum + value.length + 1, 0);
  return [start, start + lines[index].replace(/\r$/, '').length];
}
