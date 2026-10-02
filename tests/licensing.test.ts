import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { render } from '../src/index.ts';
import { illustrationAttribution } from '../src/attribution.ts';

// Pre-license-metadata baseline from d5b14e6; graphics/placement must not change.
const baseline = {
  "blink": "2e6684cd6ad7e83657c461ed6c317dc7189ae8bea34e0ad950e94f0c099e066e",
  "blink-d12": "881d64b80b8f95f7c9fbee96beae26b9427c7af110ce910227bd0b2f13ae46e5",
  "blink-reversed": "cb6cca5df9c730ea60d654255d559f0b2b8b5fd0229e868a2000dc7899302804",
  "three-leds": "c0effa48d05ab72ee2e3d36253fdcf6e9a2c4e715f4279c3e81ed4286006e4db",
  "6-leds": "ed5969d291efd69bffaf7ae1cb8e4e6bee889ce454e8138fff0f00d921edb7d2",
  "temperature-alarm": "fe8a28434c634b9cb9f44d0966c0fcee27c6e29e8d726db853a6804df5db9507"
};
for (const [name, hash] of Object.entries(baseline)) {
  test(`License metadata is self-contained for ${name}`, () => {
    const svg = render(readFileSync(new URL(`../examples/${name}.bread`, import.meta.url), 'utf8'));
    assert.match(svg, /id="bread-illustration-license"/);
    assert.ok(svg.includes(`cc:license rdf:resource="${illustrationAttribution.licenseUrl}"`));
    assert.ok(svg.includes(`dc:source rdf:resource="${illustrationAttribution.sourceUrl}"`));
    assert.ok(svg.includes(illustrationAttribution.modifications));
    assert.ok(svg.includes(illustrationAttribution.sourceSha256));
    const drawing = svg.replace(/<metadata\b[^>]*>[\s\S]*?<\/metadata>\n?/g, '');
    // Mixed routing intentionally changes graphics in the routing milestone.
    if (name !== 'temperature-alarm') assert.equal(createHash('sha256').update(drawing).digest('hex'), hash);
  });
}
for (const name of ['diode-led', 'diode-decoupling']) {
  test(`New component export retains self-contained artwork attribution for ${name}`, () => {
    const svg = render(readFileSync(new URL(`../examples/${name}.bread`, import.meta.url), 'utf8'));
    assert.match(svg, /id="bread-illustration-license"/);
    assert.ok(svg.includes('https://creativecommons.org/licenses/by-sa/4.0/'));
    assert.ok(svg.includes(illustrationAttribution.sourceUrl));
    assert.ok(svg.includes(illustrationAttribution.sourceSha256));
    assert.ok(svg.includes(illustrationAttribution.modifications));
  });
}
