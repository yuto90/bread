import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildPlayground } from './build-playground.ts';

const root = await mkdtemp(join(tmpdir(), 'bread-reproducible-'));
try {
  const first = await buildPlayground(join(root, 'first'));
  const second = await buildPlayground(join(root, 'second'));
  const files = async (dir: string) => (await readdir(dir, { recursive: true, withFileTypes: true }))
    .filter(entry => entry.isFile()).map(entry => join(entry.parentPath, entry.name).slice(dir.length + 1)).sort();
  const paths = await files(first);
  assert.ok(paths.length > 0);
  assert.deepEqual(paths, await files(second));
  for (const path of paths) assert.deepEqual(await readFile(join(first, path)), await readFile(join(second, path)), path);
  console.log(`PASS: ${paths.length} static build files are byte-identical across two clean builds`);
} finally {
  await rm(root, { recursive: true, force: true });
}
