import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { JSDOM } from 'jsdom';
import { buildPlayground } from '../scripts/build-playground.ts';
import { compilePreview } from '../playground/compiler.ts';

// Unit-level DOM checks. jsdom does not render pixels, implement worker threads,
// apply CSP, or perform real browser downloads. Browser QA is still required.
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const example = name => readFileSync(new URL(`../examples/${name}.bread`, import.meta.url), 'utf8');

test('Playground DOM: samples, stale-result guard, errors, warnings, download, zoom and recovery', async () => {
  const output = mkdtempSync(join(tmpdir(), 'bread-dom-'));
  const originals = new Map();
  const setGlobal = (name, value) => { originals.set(name, Object.getOwnPropertyDescriptor(globalThis, name)); Object.defineProperty(globalThis, name, { configurable: true, writable: true, value }); };
  let dom;
  try {
    await buildPlayground(output);
    dom = new JSDOM(readFileSync(join(output, 'index.html'), 'utf8'), { url: 'http://localhost/', pretendToBeVisual: true });
    const { window } = dom;
    const { document } = window;
    const requests = [];
    let worker, resize;
    class FakeWorker {
      constructor() { worker = this; }
      postMessage(request) { requests.push(request); }
      terminate() { this.terminated = true; }
      complete(request) { this.onmessage({ data: compilePreview(request) }); }
    }
    const blobs = new Map();
    let clickedDownload;
    class MockURL extends URL {
      static createObjectURL(blob) { const url = `blob:dom-test-${blobs.size + 1}`; blobs.set(url, blob); return url; }
      static revokeObjectURL() {}
    }
    const viewport = document.getElementById('preview-viewport');
    Object.defineProperty(viewport, 'clientWidth', { configurable: true, value: 800 });
    Object.defineProperty(viewport, 'clientHeight', { configurable: true, value: 510 });
    viewport.scrollTo = () => {};
    window.HTMLAnchorElement.prototype.click = function () { clickedDownload = { href: this.href, name: this.download }; };
    let imageMode = 'load';
    const imageCandidates = [];
    setGlobal('Image', class { set src(value) { this.value = value; imageCandidates.push(this); if (imageMode === 'load') this.onload(); } });
    setGlobal('window', window); setGlobal('document', document); setGlobal('Worker', FakeWorker);
    setGlobal('URL', MockURL); setGlobal('getComputedStyle', () => ({ paddingLeft: '26px' }));
    setGlobal('ResizeObserver', class { constructor(callback) { resize = callback; } observe() {} });
    const nativeTimeout = globalThis.setTimeout;
    setGlobal('setTimeout', (callback, ms) => { const timer = nativeTimeout(callback, ms); if (ms === 10_000) timer.unref(); return timer; });
    setGlobal('fetch', async () => ({ ok: true, json: async () => JSON.parse(readFileSync(join(output, 'samples.json'), 'utf8')) }));
    await import(pathToFileURL(join(output, 'playground/app.js')).href);
    await wait(20);
    const source = document.getElementById('source');
    const download = document.getElementById('download');
    const status = document.getElementById('preview-status');
    const image = document.getElementById('wiring-image');
    const sample = id => document.querySelector(`[data-sample="${id}"]`);
    const edit = value => { source.value = value; source.dispatchEvent(new window.Event('input')); };
    assert.equal(source.disabled, false); assert.equal(source.value, example('blink'));
    assert.equal(download.disabled, true);
    worker.complete(requests.at(-1));
    assert.equal(status.dataset.state, 'valid'); assert.equal(download.disabled, false);
    assert.match(document.getElementById('circuit-stats').textContent, /3 parts · 3 static nets/);
    const currentBlob = blobs.get(image.src); assert.ok(currentBlob);
    assert.equal(await currentBlob.text(), compilePreview(requests.at(-1)).svg);
    download.click();
    assert.equal(clickedDownload.name, 'arduino-led.svg');
    assert.equal(await blobs.get(clickedDownload.href).text(), await currentBlob.text());
    for (const id of ['three-leds', '6-leds', 'temperature-alarm']) {
      sample(id).click(); await wait(10); worker.complete(requests.at(-1));
      assert.equal(source.value, example(id)); assert.equal(sample(id).getAttribute('aria-pressed'), 'true');
      assert.equal(status.dataset.state, 'valid');
    }
    assert.match(document.getElementById('warnings').textContent, /W_BUTTON_FOOTPRINT/);
    assert.equal(document.getElementById('warnings').hidden, false);
    // Image decoding is a separate, revision-safe gate. Keep old pixels on failure.
    const priorImage = image.src;
    imageMode = 'pending';
    edit(example('blink')); await wait(200); worker.complete(requests.at(-1));
    const staleImage = imageCandidates.at(-1);
    assert.equal(download.disabled, true); assert.equal(image.src, priorImage);
    edit(example('three-leds')); await wait(200); worker.complete(requests.at(-1));
    staleImage.onload();
    assert.equal(image.src, priorImage); assert.equal(status.dataset.state, 'pending');
    imageCandidates.at(-1).onerror();
    assert.equal(document.getElementById('error-code').textContent, 'E_PREVIEW_IMAGE');
    assert.equal(image.src, priorImage); assert.equal(download.disabled, true);
    imageMode = 'load';
    sample('temperature-alarm').click(); await wait(10); worker.complete(requests.at(-1));
    assert.equal(status.dataset.state, 'valid');
    // A worker result received after another edit cannot re-enable download.
    edit(example('blink')); await wait(200); const olderRequest = requests.at(-1);
    edit('bread 0.1\nwrong');
    worker.complete(olderRequest);
    assert.equal(download.disabled, true); assert.equal(status.dataset.state, 'pending');
    await wait(200); worker.complete(requests.at(-1));
    assert.equal(status.dataset.state, 'error'); assert.match(status.textContent, /Showing last valid preview/);
    assert.equal(document.getElementById('error-code').textContent, 'E_SYNTAX');
    assert.equal(source.getAttribute('aria-invalid'), 'true'); assert.equal(download.disabled, true);
    assert.equal(document.getElementById('warnings').hidden, true);
    document.getElementById('error-line').click();
    assert.equal(source.selectionStart, 10); assert.equal(source.selectionEnd, 15);
    assert.equal(document.activeElement, source);
    edit(example('10-leds')); await wait(200); worker.complete(requests.at(-1));
    assert.equal(document.getElementById('error-code').textContent, 'E_PLACEMENT_CAPACITY');
    assert.equal(document.getElementById('error-line').hidden, true);
    edit(example('blink-reversed')); await wait(200); worker.complete(requests.at(-1));
    assert.equal(status.dataset.state, 'valid'); assert.equal(source.getAttribute('aria-invalid'), null);
    assert.match(document.getElementById('warnings').textContent, /W_LED_POLARITY/);
    assert.equal(download.disabled, false);
    const before = parseInt(document.getElementById('zoom-level').textContent);
    document.getElementById('zoom-in').click();
    assert.ok(parseInt(document.getElementById('zoom-level').textContent) > before);
    document.getElementById('zoom-out').click();
    assert.equal(parseInt(document.getElementById('zoom-level').textContent), before);
    document.getElementById('zoom-fit').click();
    Object.defineProperty(viewport, 'clientWidth', { configurable: true, value: 350 }); resize();
    assert.ok(parseInt(document.getElementById('zoom-level').textContent) < before);
    // Repeated sample changes remain a single editor/preview, with latest winning.
    sample('blink').click(); sample('temperature-alarm').click(); sample('three-leds').click();
    await wait(10); worker.complete(requests.at(-1));
    assert.equal(source.value, example('three-leds')); assert.equal(document.querySelectorAll('#wiring-image').length, 1);
    assert.match(document.getElementById('circuit-stats').textContent, /7 parts · 7 static nets/);
    worker.onerror();
    assert.equal(worker.terminated, true); assert.equal(source.disabled, true);
    assert.equal(download.disabled, true); assert.equal(document.getElementById('error-code').textContent, 'E_PREVIEW');
    assert.ok([...document.querySelectorAll('[data-sample]')].every(button => button.disabled));
    window.dispatchEvent(new window.Event('pagehide'));
  } finally {
    dom?.window.close();
    for (const [name, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor); else delete globalThis[name];
    }
    rmSync(output, { recursive: true, force: true });
  }
});
