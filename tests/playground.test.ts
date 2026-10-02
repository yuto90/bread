import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { render } from '../src/index.ts';
import { compilePreview, svgFilename, lineRange, MAX_SOURCE_LENGTH } from '../playground/compiler.ts';
import { buildPlayground } from '../scripts/build-playground.ts';

const example = (name: string) => readFileSync(new URL(`../examples/${name}.bread`, import.meta.url), 'utf8');
for (const [name, parts, nets, warnings] of [
  ['blink', 3, 3, 0], ['three-leds', 7, 7, 0], ['6-leds', 13, 13, 0],
  ['temperature-alarm', 8, 8, 1], ['diode-led', 4, 4, 1], ['diode-decoupling', 5, 5, 1], ['blink-d12', 3, 3, 0], ['blink-reversed', 3, 3, 1]
] as const) {
  test(`Playground ${name} uses the existing core and preserves exact SVG bytes`, () => {
    const source = example(name), result = compilePreview({ source, revision: 4 });
    assert.equal(result.revision, 4); assert.ok(result.ok);
    assert.equal(result.svg, render(source));
    assert.equal(result.parts, parts); assert.equal(result.nets, nets); assert.equal(result.warnings.length, warnings);
  });
}
for (const name of ['7-leds', '10-leds']) {
  test(`Playground ${name} returns capacity code without inventing a line`, () => {
    const result = compilePreview({ source: example(name), revision: 3 });
    assert.ok(!result.ok); assert.equal(result.code, 'E_PLACEMENT_CAPACITY'); assert.equal(result.line, undefined);
  });
}
test('Playground errors preserve parser/semantic codes and line numbers', () => {
  const syntax = compilePreview({ source: 'bread 0.1\nwrong', revision: 1 });
  assert.ok(!syntax.ok); assert.equal(syntax.code, 'E_SYNTAX'); assert.equal(syntax.line, 2);
  const pin = compilePreview({ source: example('blink').replace('uno.D13', 'uno.D99'), revision: 2 });
  assert.ok(!pin.ok); assert.equal(pin.code, 'E_UNKNOWN_PIN'); assert.equal(pin.line, 9);
});
test('Playground user text remains escaped within an isolated SVG image', () => {
  const source = example('blink').replace('Arduino LED', '<script>alert(1)</script> & "quoted"'.replaceAll('"', '\\"'));
  const result = compilePreview({ source, revision: 1 }); assert.ok(result.ok);
  assert.ok(!result.svg.includes('<script>')); assert.ok(result.svg.includes('&lt;script&gt;'));
});
test('Playground source bound is deterministic and leaves the core untouched', () => {
  const result = compilePreview({ source: ' '.repeat(MAX_SOURCE_LENGTH + 1), revision: 9 });
  assert.ok(!result.ok); assert.equal(result.code, 'E_SOURCE_LIMIT'); assert.equal(result.revision, 9);
});
test('Download names are safe, bounded, and have a useful fallback', () => {
  assert.equal(svgFilename('Arduino LED'), 'arduino-led.svg');
  assert.equal(svgFilename('../../<script> Éclair'), 'script-eclair.svg');
  assert.equal(svgFilename('配線'), 'bread-wiring.svg');
  assert.equal(svgFilename('a'.repeat(100)).length, 68);
});
test('Line jump handles LF, CRLF, empty and out-of-range lines', () => {
  assert.deepEqual(lineRange('one\ntwo\nthree', 2), [4, 7]);
  assert.deepEqual(lineRange('one\r\ntwo\r\n', 2), [5, 8]);
  assert.deepEqual(lineRange('', 20), [0, 0]);
  assert.deepEqual(lineRange('one\ntwo', 90), [4, 7]);
});
test('Static build contains actual samples, browser ESM core, and no Node-only CLI', async () => {
  const output = mkdtempSync(join(tmpdir(), 'bread-playground-'));
  try {
    await buildPlayground(output);
    const samples = JSON.parse(readFileSync(join(output, 'samples.json'), 'utf8'));
    assert.deepEqual(samples.map((sample: { id: string }) => sample.id), ['blink', 'three-leds', '6-leds', 'temperature-alarm', 'diode-led', 'diode-decoupling']);
    for (const sample of samples) assert.equal(sample.source, example(sample.id));
    const files = readdirSync(output, { recursive: true }).filter((path): path is string => typeof path === 'string');
    assert.ok(!files.includes('src/cli.js'));
    for (const file of files.filter(file => file.endsWith('.js'))) {
      const code = readFileSync(join(output, file), 'utf8');
      assert.doesNotMatch(code, /from\s*['"]node:/);
      assert.doesNotMatch(code, /from\s*['"][^'"]+\.ts['"]/);
    }
    const built = await import(pathToFileURL(join(output, 'playground/compiler.js')).href);
    for (const sample of samples) {
      assert.equal(built.compilePreview({ source: sample.source, revision: 1 }).svg, render(sample.source));
    }
    const html = readFileSync(join(output, 'index.html'), 'utf8');
    assert.match(html, /worker-src 'self'/); assert.match(html, /img-src 'self' blob:/);
  } finally { rmSync(output, { recursive: true, force: true }); }
});

test('SVG wrapper rejects XML-invalid title characters and accepts valid emoji', () => {
  for (const bad of ['\uffff', '\ufffe', '\ud800', '\udfff']) {
    const source = example('blink').replace('title "Arduino LED"', `title ${JSON.stringify('bad ' + bad + ' title')}`);
    const result = compilePreview({ source, revision: 1 });
    assert.ok(!result.ok); assert.equal(result.code, 'E_SVG_TEXT');
  }
  const good = compilePreview({ source: example('blink').replace('Arduino LED', 'Bread 🍞'), revision: 2 });
  assert.ok(good.ok); assert.match(good.svg, /Bread 🍞/);
});
