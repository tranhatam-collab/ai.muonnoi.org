import { build } from '../workers/revenueops/node_modules/esbuild/lib/main.js';
import { mkdir } from 'node:fs/promises';
await mkdir(new URL('../.local/',import.meta.url),{recursive:true});
await build({entryPoints:['workers/api/src/index.ts'],bundle:true,format:'esm',platform:'browser',target:'es2022',outfile:'.local/api-worker.mjs'});
await build({stdin:{contents:"export {handlePublishing} from './workers/api/src/api/publishing-api.ts';export {handlePosts} from './workers/api/src/api/posts-api.ts';export {handleFlowAutoPost,handleN8nAutoPost} from './workers/api/src/api/webhook-inbound-api.ts';export {requestObject} from './workers/api/src/lib/request-object.ts'",resolveDir:process.cwd(),sourcefile:'publishing-test-entry.ts'},bundle:true,format:'esm',platform:'node',target:'node24',outfile:'.local/publishing.mjs'});
console.log('Bundled existing API and new publishing handlers locally; no deploy or migration.');
