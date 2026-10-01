import { compilePreview } from './compiler.ts';
import type { CompileRequest } from './compiler.ts';

self.onmessage = (event: MessageEvent<CompileRequest>) => {
  self.postMessage(compilePreview(event.data));
};
