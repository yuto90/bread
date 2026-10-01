import { readFileSync, writeFileSync, mkdirSync, renameSync, rmSync } from 'node:fs';
import { dirname, resolve as pathResolve } from 'node:path';
import { compile } from './index.ts';
import { renderSvg } from './renderer/index.ts';
import { BreadError, fail } from './model.ts';

try {
  const args = process.argv.slice(2);
  const [command, input, option, output] = args;
  if (args.length === 1 && ['--help','-h'].includes(command)) {
    console.log('bread check <file.bread>\nbread render <file.bread> -o <output.svg>');
  } else {
    if (!input || !((command === 'check' && args.length === 2) || (command === 'render' && args.length === 4 && option === '-o')))
      fail('E_USAGE', 'Usage: bread check <file.bread> | bread render <file.bread> -o <output.svg>');
    if (command === 'render' && pathResolve(input) === pathResolve(output)) fail('E_USAGE', 'Output must not overwrite input');
    const result = compile(readFileSync(input, 'utf8'));
    for (const warning of result.circuit.warnings) console.error(`WARNING ${warning}`);
    if (command === 'render') {
      const svg = renderSvg(result.circuit, result.placement);
      // Finish validation and serialization before touching the requested output.
      mkdirSync(dirname(output), { recursive: true });
      const temp = `${output}.${process.pid}.tmp`;
      try { writeFileSync(temp, svg, { flag: 'wx' }); renameSync(temp, output); }
      finally { rmSync(temp, { force: true }); }
      console.log(`PASS ${output}: ${result.actual.length} verified nets, ${result.placement.jumpers.length} jumpers`);
    } else console.log(`PASS ${input}: syntax, logical nets, placement and physical nets verified`);
  }
} catch (error) {
  if (error instanceof BreadError) console.error(`ERROR ${error.code}${error.line ? ` line ${error.line}` : ''}: ${error.message}`);
  else console.error(`ERROR E_IO: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
