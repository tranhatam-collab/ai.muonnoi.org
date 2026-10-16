import { build } from '../workers/revenueops/node_modules/esbuild/lib/main.js';
import { mkdir } from 'node:fs/promises';

await mkdir(new URL('../.local/', import.meta.url), { recursive: true });
await build({
  stdin: {
    contents: "export { handlePaymentWebhook } from './workers/api/src/api/payment-api.ts'; export { handleEmailSend, handleEmailGetById } from './workers/api/src/api/email-api.ts';",
    resolveDir: process.cwd(),
    sourcefile: 'payment-email-security-test-entry.ts'
  },
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node24',
  outfile: '.local/payment-email-security.mjs'
});
