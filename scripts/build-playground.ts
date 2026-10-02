import { readdir, readFile, mkdir, writeFile, copyFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { stripTypeScriptTypes } from 'node:module';

const root = fileURLToPath(new URL('../', import.meta.url));
export async function buildPlayground(destination = join(root, 'dist/playground')): Promise<string> {
  const output = resolve(destination);
  // Transpile existing ESM modules with Node 24; no runtime dependencies or
  // bundled substitute for the core. Exclude the Node-only CLI entry point.
  for (const directory of ['src', 'parts', 'playground']) {
    const entries = await readdir(join(root, directory), { recursive: true, withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.ts')) continue;
      const input = join(entry.parentPath, entry.name);
      if (input === join(root, 'src/cli.ts')) continue;
      const relative = input.slice(root.length).replace(/\.ts$/, '.js');
      const target = join(output, relative);
      const code = stripTypeScriptTypes(await readFile(input, 'utf8'), { mode: 'strip' })
        .replace(/(\bfrom\s*['"]\.[^'"]+)\.ts(['"])/g, '$1.js$2');
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, code);
    }
  }
  for (const file of ['index.html', 'style.css', 'icon.svg']) {
    await copyFile(join(root, 'playground', file), join(output, file));
  }
  await mkdir(join(output, 'LICENSES'), { recursive: true });
  for (const file of ['LICENSE', 'LICENSES/README.md', 'LICENSES/CC-BY-SA-4.0.txt']) {
    await copyFile(join(root, file), join(output, file));
  }
  const samples = await Promise.all(['blink', 'three-leds', '6-leds', 'temperature-alarm'].map(async id => ({
    id, filename: `${id}.bread`, source: await readFile(join(root, 'examples', `${id}.bread`), 'utf8')
  })));
  await writeFile(join(output, 'samples.json'), JSON.stringify(samples, null, 2) + '\n');
  return output;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(`Built static Playground: ${await buildPlayground()}`);
}
