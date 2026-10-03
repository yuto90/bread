import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
import { buildPlayground } from './build-playground.ts';

const root = await buildPlayground();
// This preview supports the single global rule used by our Pages _headers file.
const headerLines = (await readFile(resolve(root, '_headers'), 'utf8')).trim().split('\n');
if (headerLines.shift() !== '/*') throw new Error('Expected one global Pages header rule');
const securityHeaders = Object.fromEntries(headerLines.map(line => {
  const separator = line.indexOf(':');
  if (!/^\s+/.test(line) || separator < 1) throw new Error('Unsupported Pages header rule');
  return [line.slice(0, separator).trim(), line.slice(separator + 1).trim()];
}));
const port = Number(process.env.PORT ?? 4173);
const mime: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json; charset=utf-8', '.bread': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8', '.txt': 'text/plain; charset=utf-8' };
const server = createServer(async (request, response) => {
  try {
    if (request.method !== 'GET' && request.method !== 'HEAD') { response.writeHead(405).end(); return; }
    const pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
    const path = resolve(root, `.${pathname.endsWith('/') ? pathname + 'index.html' : pathname}`);
    if (!path.startsWith(root + sep) || !(await stat(path)).isFile()) { response.writeHead(404).end('Not found'); return; }
    const bytes = await readFile(path);
    response.writeHead(200, { 'Content-Type': mime[extname(path)] ?? 'application/octet-stream',
      ...securityHeaders, 'Cache-Control': 'no-store' });
    response.end(request.method === 'HEAD' ? undefined : bytes);
  } catch { response.writeHead(404).end('Not found'); }
});
server.on('error', error => { console.error(error.message); process.exitCode = 1; });
server.listen(port, '127.0.0.1', () => { console.log(`Bread Playground: http://127.0.0.1:${port}`); });
